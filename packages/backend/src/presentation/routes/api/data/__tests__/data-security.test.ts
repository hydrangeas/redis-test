import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';

describe('Data Routes Security Tests', () => {
  let fastify: any;

  beforeEach(async () => {
    fastify = Fastify();
    
    // Mock dependencies
    const mockDataRetrievalUseCase = {
      retrieveData: vi.fn().mockResolvedValue(
        Result.ok({
          content: { test: 'data' },
          checksum: 'test-checksum',
          lastModified: new Date(),
        })
      ),
    };

    const mockRateLimitUseCase = {
      checkAndRecordUsage: vi.fn().mockResolvedValue(
        Result.ok({
          allowed: true,
          limit: 60,
          remaining: 59,
          resetAt: new Date(Date.now() + 60000),
        })
      ),
    };

    const mockSecureFileAccess = {
      validateAndSanitizePath: vi.fn(),
      checkAccess: vi.fn(),
    };

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Set up DI container
    container.register(DI_TOKENS.DataRetrievalUseCase, { useValue: mockDataRetrievalUseCase });
    container.register(DI_TOKENS.RateLimitUseCase, { useValue: mockRateLimitUseCase });
    container.register(DI_TOKENS.SecureFileAccessService, { useValue: mockSecureFileAccess });
    container.register(DI_TOKENS.Logger, { useValue: mockLogger });

    // Mock authentication
    fastify.decorate('authenticate', async (request: any, reply: any) => {
      request.user = {
        userId: { value: 'test-user' },
        tier: { level: 'tier1' },
      };
    });

    // Mock rate limit check
    fastify.decorate('checkRateLimit', async (request: any, reply: any) => {
      // Pass through
    });

    // Register routes
    await fastify.register(require('../index').default, { prefix: '/api/data' });
  });

  describe('Path Traversal Protection', () => {
    it('should block path traversal attempts', async () => {
      const attacks = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'secure/../../../etc/passwd',
        'secure/./../../etc/passwd',
      ];

      const mockSecureFileAccess = container.resolve(DI_TOKENS.SecureFileAccessService) as any;

      for (const attack of attacks) {
        mockSecureFileAccess.validateAndSanitizePath.mockResolvedValue(
          Result.fail(
            new DomainError(
              'PATH_TRAVERSAL',
              'Path traversal detected',
              'SECURITY'
            )
          )
        );

        const response = await fastify.inject({
          method: 'GET',
          url: `/api/data/${attack}`,
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toMatchObject({
          type: expect.stringContaining('PATH_TRAVERSAL'),
          status: 403,
        });
      }
    });
  });

  describe('File Type Validation', () => {
    it('should reject non-JSON files', async () => {
      const invalidFiles = [
        'script.sh',
        'executable.exe',
        'document.pdf',
        'archive.zip',
      ];

      const mockSecureFileAccess = container.resolve(DI_TOKENS.SecureFileAccessService) as any;

      for (const file of invalidFiles) {
        mockSecureFileAccess.validateAndSanitizePath.mockResolvedValue(
          Result.fail(
            new DomainError(
              'INVALID_FILE_TYPE',
              'File type not allowed',
              'SECURITY'
            )
          )
        );

        const response = await fastify.inject({
          method: 'GET',
          url: `/api/data/secure/${file}`,
          headers: {
            authorization: 'Bearer test-token',
          },
        });

        expect(response.statusCode).toBe(403);
        expect(response.json()).toMatchObject({
          type: expect.stringContaining('INVALID_FILE_TYPE'),
          status: 403,
        });
      }
    });
  });

  describe('Access Control', () => {
    it('should enforce access control for secure paths', async () => {
      const mockSecureFileAccess = container.resolve(DI_TOKENS.SecureFileAccessService) as any;
      
      mockSecureFileAccess.validateAndSanitizePath.mockResolvedValue(
        Result.ok('secure/data.json')
      );
      
      mockSecureFileAccess.checkAccess.mockResolvedValue(
        Result.fail(
          new DomainError(
            'ACCESS_DENIED',
            'Access to this resource is denied',
            'FORBIDDEN'
          )
        )
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/data/secure/data.json',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({
        type: expect.stringContaining('ACCESS_DENIED'),
        status: 403,
      });
    });
  });

  describe('Security Headers', () => {
    it('should set appropriate security headers', async () => {
      const mockSecureFileAccess = container.resolve(DI_TOKENS.SecureFileAccessService) as any;
      
      mockSecureFileAccess.validateAndSanitizePath.mockResolvedValue(
        Result.ok('secure/data.json')
      );
      
      mockSecureFileAccess.checkAccess.mockResolvedValue(
        Result.ok(undefined)
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/data/secure/data.json',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      // Check that security headers are set by middleware
      expect(response.headers).toMatchObject({
        'cache-control': expect.stringContaining('max-age=3600'),
      });
    });
  });

  describe('Valid Requests', () => {
    it('should allow valid requests with proper sanitization', async () => {
      const mockSecureFileAccess = container.resolve(DI_TOKENS.SecureFileAccessService) as any;
      const mockDataRetrievalUseCase = container.resolve(DI_TOKENS.DataRetrievalUseCase) as any;
      
      mockSecureFileAccess.validateAndSanitizePath.mockResolvedValue(
        Result.ok('secure/population/2024.json')
      );
      
      mockSecureFileAccess.checkAccess.mockResolvedValue(
        Result.ok(undefined)
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/data/secure/population/2024.json',
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ test: 'data' });
      expect(mockDataRetrievalUseCase.retrieveData).toHaveBeenCalledWith(
        'secure/population/2024.json',
        expect.any(Object)
      );
    });
  });
});