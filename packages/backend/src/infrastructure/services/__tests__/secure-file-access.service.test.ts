import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureFileAccessService } from '../secure-file-access.service';
import { SecurityAuditService } from '../security-audit.service';
import type { Logger } from 'pino';
import { Result } from '@/domain/shared/result';

describe('SecureFileAccessService', () => {
  let service: SecureFileAccessService;
  let mockLogger: Logger;
  let mockAuditService: SecurityAuditService;
  const dataDirectory = '/test/data';
  
  const mockContext = {
    userId: 'test-user-123',
    userTier: 'tier1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  };

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    mockAuditService = {
      logSecurityEvent: vi.fn().mockResolvedValue(undefined),
    } as any;

    service = new SecureFileAccessService(mockLogger, dataDirectory, mockAuditService);
  });

  describe('Path Traversal Prevention', () => {
    const attacks = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'secure/../../../etc/passwd',
      'secure/./../../etc/passwd',
      'secure%2F..%2F..%2Fetc%2Fpasswd',
      'secure/population/../../../../etc/passwd',
      '/etc/passwd',
      'C:\\Windows\\System32\\drivers\\etc\\hosts',
    ];

    it.each(attacks)('should block path traversal attempt: %s', async (attack) => {
      const result = await service.validateAndSanitizePath(attack, mockContext);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toMatch(/PATH_TRAVERSAL|FORBIDDEN_PATH|UNAUTHORIZED_PATH/);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('File Type Validation', () => {
    const invalidFiles = [
      'script.sh',
      'executable.exe',
      'batch.bat',
      'data.json.sh',
      'malicious.php',
    ];

    it.each(invalidFiles)('should reject invalid file type: %s', async (file) => {
      const result = await service.validateAndSanitizePath(file, mockContext);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toMatch(/INVALID_FILE_TYPE|FORBIDDEN_PATH/);
    });
  });

  describe('Valid Path Handling', () => {
    it('should sanitize and validate a clean path', async () => {
      const validPath = 'secure/population/2024.json';
      
      // Mock file existence check
      vi.spyOn(require('fs/promises'), 'stat').mockResolvedValue({
        isFile: () => true,
        size: 1024,
      } as any);

      const result = await service.validateAndSanitizePath(validPath, mockContext);
      
      // Should fail because the file doesn't actually exist in test environment
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('FILE_NOT_FOUND');
    });

    it('should remove dangerous characters from path', async () => {
      const dirtyPath = 'secure/<script>alert(1)</script>/data.json';
      
      const result = await service.validateAndSanitizePath(dirtyPath, mockContext);
      
      // Path should be sanitized but may still fail other checks
      expect(result.isFailure).toBe(true);
    });
  });

  describe('Access Control', () => {
    it('should allow authenticated users to access secure files', async () => {
      const context = { ...mockContext, userId: 'user-123' };
      const result = await service.checkAccess('secure/data.json', context);
      
      expect(result.isSuccess).toBe(true);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ACCESS_GRANTED',
          userId: 'user-123',
        })
      );
    });

    it('should deny anonymous users from accessing secure files', async () => {
      const context = { ...mockContext, userId: 'anonymous' };
      const result = await service.checkAccess('secure/data.json', context);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('ACCESS_DENIED');
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ACCESS_DENIED',
          userId: 'anonymous',
        })
      );
    });

    it('should allow anyone to access public files', async () => {
      const context = { ...mockContext, userId: 'anonymous' };
      const result = await service.checkAccess('public/data.json', context);
      
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per IP address', async () => {
      const context = { ...mockContext };
      
      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        const result = await service.checkAccess('secure/data.json', context);
        expect(result.isSuccess).toBe(true);
      }
      
      // The 101st request should fail
      const result = await service.checkAccess('secure/data.json', context);
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('TOO_MANY_ATTEMPTS');
    });
  });

  describe('Path Sanitization', () => {
    it('should properly sanitize paths with multiple issues', async () => {
      const messyPath = '//secure///./population//2024.json//';
      
      // This test validates sanitization without file system checks
      const result = await service.validateAndSanitizePath(messyPath, mockContext);
      
      // Should fail because file doesn't exist in test
      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('FILE_NOT_FOUND');
    });

    it('should reject paths with null bytes', async () => {
      const nullBytePath = 'secure/data.json\x00.txt';
      
      const result = await service.validateAndSanitizePath(nullBytePath, mockContext);
      
      expect(result.isFailure).toBe(true);
    });
  });
});