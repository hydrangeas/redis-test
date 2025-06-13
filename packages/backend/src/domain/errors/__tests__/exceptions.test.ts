import { describe, it, expect } from 'vitest';
import {
  DomainException,
  AuthenticationException,
  AuthorizationException,
  RateLimitException,
  ValidationException,
  ResourceNotFoundException,
  BusinessRuleViolationException,
  ExternalServiceException,
  PathTraversalException,
} from '../exceptions';

describe('Domain Exceptions', () => {
  describe('DomainException', () => {
    class TestException extends DomainException {
      constructor() {
        super('TEST_ERROR', 'Test error message', 500);
      }
    }

    it('should create exception with correct properties', () => {
      const exception = new TestException();

      expect(exception.code).toBe('TEST_ERROR');
      expect(exception.message).toBe('Test error message');
      expect(exception.statusCode).toBe(500);
      expect(exception.name).toBe('TestException');
      expect(exception).toBeInstanceOf(Error);
      expect(exception.stack).toBeDefined();
    });
  });

  describe('AuthenticationException', () => {
    it('should create authentication exception', () => {
      const exception = new AuthenticationException('google', 'Invalid token');

      expect(exception.code).toBe('AUTH_FAILED');
      expect(exception.message).toBe('Authentication failed: Invalid token');
      expect(exception.statusCode).toBe(401);
      expect(exception.provider).toBe('google');
      expect(exception.reason).toBe('Invalid token');
    });
  });

  describe('AuthorizationException', () => {
    it('should create authorization exception', () => {
      const exception = new AuthorizationException('document', 'delete', 'user-123');

      expect(exception.code).toBe('FORBIDDEN');
      expect(exception.message).toBe('Access denied: Cannot delete document');
      expect(exception.statusCode).toBe(403);
      expect(exception.resource).toBe('document');
      expect(exception.action).toBe('delete');
      expect(exception.userId).toBe('user-123');
    });
  });

  describe('RateLimitException', () => {
    it('should create rate limit exception', () => {
      const resetTime = new Date('2025-01-14T12:00:00Z');
      const exception = new RateLimitException(100, resetTime, 3600);

      expect(exception.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(exception.message).toBe('Too many requests');
      expect(exception.statusCode).toBe(429);
      expect(exception.limit).toBe(100);
      expect(exception.resetTime).toBe(resetTime);
      expect(exception.retryAfter).toBe(3600);
    });
  });

  describe('ValidationException', () => {
    it('should create validation exception', () => {
      const exception = new ValidationException(
        'email',
        'invalid@',
        ['Must be a valid email', 'Must contain domain']
      );

      expect(exception.code).toBe('VALIDATION_FAILED');
      expect(exception.message).toBe("Validation failed for field 'email'");
      expect(exception.statusCode).toBe(400);
      expect(exception.field).toBe('email');
      expect(exception.value).toBe('invalid@');
      expect(exception.constraints).toEqual(['Must be a valid email', 'Must contain domain']);
    });
  });

  describe('ResourceNotFoundException', () => {
    it('should create resource not found exception', () => {
      const exception = new ResourceNotFoundException('User', 'user-123');

      expect(exception.code).toBe('RESOURCE_NOT_FOUND');
      expect(exception.message).toBe("User with id 'user-123' not found");
      expect(exception.statusCode).toBe(404);
      expect(exception.resourceType).toBe('User');
      expect(exception.resourceId).toBe('user-123');
    });
  });

  describe('BusinessRuleViolationException', () => {
    it('should create business rule violation exception', () => {
      const context = { balance: 100, withdrawal: 150 };
      const exception = new BusinessRuleViolationException(
        'Withdrawal amount cannot exceed balance',
        context
      );

      expect(exception.code).toBe('BUSINESS_RULE_VIOLATION');
      expect(exception.message).toBe('Business rule violation: Withdrawal amount cannot exceed balance');
      expect(exception.statusCode).toBe(422);
      expect(exception.rule).toBe('Withdrawal amount cannot exceed balance');
      expect(exception.context).toEqual(context);
    });
  });

  describe('ExternalServiceException', () => {
    it('should create external service exception', () => {
      const originalError = new Error('Connection timeout');
      const exception = new ExternalServiceException(
        'PaymentGateway',
        'process payment',
        originalError
      );

      expect(exception.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(exception.message).toBe('External service error: PaymentGateway failed during process payment');
      expect(exception.statusCode).toBe(503);
      expect(exception.service).toBe('PaymentGateway');
      expect(exception.operation).toBe('process payment');
      expect(exception.originalError).toBe(originalError);
    });
  });

  describe('PathTraversalException', () => {
    it('should create path traversal exception', () => {
      const exception = new PathTraversalException(
        '../../etc/passwd',
        'etc/passwd'
      );

      expect(exception.code).toBe('PATH_TRAVERSAL_DETECTED');
      expect(exception.message).toBe('Invalid path detected: potential security threat');
      expect(exception.statusCode).toBe(400);
      expect(exception.attemptedPath).toBe('../../etc/passwd');
      expect(exception.sanitizedPath).toBe('etc/passwd');
    });
  });
});