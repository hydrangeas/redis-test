import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../../../infrastructure/di';
import { toProblemDetails, mapValidationError } from '../error-mapper';
import { DomainError, ErrorType } from '../../../domain/errors/domain-error';
import { 
  AuthenticationException, 
  RateLimitException,
  ValidationException 
} from '../../../domain/errors/exceptions';
import type { EnvConfig } from '../../../infrastructure/config';

describe('Error Mapper', () => {
  const mockConfig: EnvConfig = {
    NODE_ENV: 'development',
    PORT: 8080,
    HOST: '0.0.0.0',
    LOG_LEVEL: 'info',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    JWT_SECRET: 'test-secret-at-least-32-characters-long',
    API_BASE_URL: 'https://api.example.com',
    FRONTEND_URL: 'http://localhost:3000',
    RATE_LIMIT_TIER1: 60,
    RATE_LIMIT_TIER2: 120,
    RATE_LIMIT_TIER3: 300,
    RATE_LIMIT_WINDOW: 60,
  };

  beforeEach(() => {
    container.reset();
    container.register<EnvConfig>(DI_TOKENS.EnvConfig, {
      useValue: mockConfig,
    });
  });

  describe('toProblemDetails', () => {
    describe('DomainException handling', () => {
      it('should map AuthenticationException', () => {
        const error = new AuthenticationException('google', 'Invalid token');
        const result = toProblemDetails(error, '/api/login');

        expect(result).toEqual({
          type: 'https://api.example.com/errors/auth-failed',
          title: 'Authentication failed: Invalid token',
          status: 401,
          detail: 'Authentication failed: Invalid token',
          instance: '/api/login',
        });
      });

      it('should map RateLimitException with extended properties', () => {
        const resetTime = new Date('2025-01-14T12:00:00Z');
        const error = new RateLimitException(100, resetTime, 3600);
        const result = toProblemDetails(error, '/api/data');

        expect(result).toEqual({
          type: 'https://api.example.com/errors/rate-limit-exceeded',
          title: 'Too many requests',
          status: 429,
          detail: 'Too many requests',
          instance: '/api/data',
          retryAfter: 3600,
          limit: 100,
          resetTime: '2025-01-14T12:00:00.000Z',
        });
      });

      it('should map ValidationException with errors array', () => {
        const error = new ValidationException(
          'email',
          'invalid@',
          ['Must be valid email', 'Must contain domain']
        );
        const result = toProblemDetails(error, '/api/users');

        expect(result).toEqual({
          type: 'https://api.example.com/errors/validation-failed',
          title: "Validation failed for field 'email'",
          status: 400,
          detail: "Validation failed for field 'email'",
          instance: '/api/users',
          errors: [{
            field: 'email',
            constraints: ['Must be valid email', 'Must contain domain'],
          }],
        });
      });
    });

    describe('DomainError handling', () => {
      it('should map validation error', () => {
        const error = DomainError.validation(
          'INVALID_INPUT',
          'Invalid input provided',
          { field: 'name' }
        );
        const result = toProblemDetails(error, '/api/resource');

        expect(result).toEqual({
          type: 'https://api.example.com/errors/invalid-input',
          title: 'Invalid input provided',
          status: 400,
          detail: '{"field":"name"}',
          instance: '/api/resource',
        });
      });

      it('should map business rule error', () => {
        const error = DomainError.businessRule(
          'INSUFFICIENT_FUNDS',
          'Insufficient funds for transaction'
        );
        const result = toProblemDetails(error);

        expect(result).toEqual({
          type: 'https://api.example.com/errors/insufficient-funds',
          title: 'Insufficient funds for transaction',
          status: 422,
          detail: 'Insufficient funds for transaction',
        });
      });

      it('should map all error types to correct status codes', () => {
        const testCases = [
          { type: ErrorType.VALIDATION, status: 400 },
          { type: ErrorType.BUSINESS_RULE, status: 422 },
          { type: ErrorType.NOT_FOUND, status: 404 },
          { type: ErrorType.UNAUTHORIZED, status: 401 },
          { type: ErrorType.FORBIDDEN, status: 403 },
          { type: ErrorType.RATE_LIMIT, status: 429 },
          { type: ErrorType.EXTERNAL_SERVICE, status: 503 },
          { type: ErrorType.INTERNAL, status: 500 },
        ];

        testCases.forEach(({ type, status }) => {
          const error = new DomainError('TEST', 'Test error', type);
          const result = toProblemDetails(error);
          expect(result.status).toBe(status);
        });
      });
    });

    describe('Generic Error handling', () => {
      it('should map generic error in development', () => {
        const error = new Error('Something went wrong');
        const result = toProblemDetails(error, '/api/test');

        expect(result).toEqual({
          type: 'https://api.example.com/errors/internal-server-error',
          title: 'Internal Server Error',
          status: 500,
          detail: 'Something went wrong',
          instance: '/api/test',
        });
      });

      it('should hide error details in production', () => {
        container.reset();
        container.register<EnvConfig>(DI_TOKENS.EnvConfig, {
          useValue: { ...mockConfig, NODE_ENV: 'production' },
        });

        const error = new Error('Sensitive error details');
        const result = toProblemDetails(error);

        expect(result.detail).toBe('An unexpected error occurred');
        expect(result.detail).not.toContain('Sensitive');
      });
    });
  });

  describe('mapValidationError', () => {
    it('should map Fastify validation errors', () => {
      const validation = [
        {
          instancePath: '/email',
          message: 'must match format "email"',
          params: { format: 'email' },
        },
        {
          dataPath: '.password',
          message: 'must be at least 8 characters',
          params: { minLength: 8 },
        },
      ];

      const result = mapValidationError(validation, '/api/register');

      expect(result).toEqual({
        type: 'https://api.example.com/errors/validation-error',
        title: 'Validation Error',
        status: 400,
        detail: 'Request validation failed',
        instance: '/api/register',
        errors: [
          {
            field: '/email',
            message: 'must match format "email"',
            params: { format: 'email' },
          },
          {
            field: '.password',
            message: 'must be at least 8 characters',
            params: { minLength: 8 },
          },
        ],
      });
    });
  });
});