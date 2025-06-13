import { describe, it, expect } from 'vitest';
import { DomainError, ErrorType } from '../domain-error';

describe('DomainError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test error message',
        ErrorType.VALIDATION,
        { field: 'email' }
      );

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test error message');
      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create error without details', () => {
      const error = new DomainError(
        'TEST_ERROR',
        'Test error message',
        ErrorType.BUSINESS_RULE
      );

      expect(error.details).toBeUndefined();
    });
  });

  describe('factory methods', () => {
    it('should create validation error', () => {
      const error = DomainError.validation(
        'INVALID_EMAIL',
        'Invalid email format',
        { field: 'email', value: 'invalid' }
      );

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.code).toBe('INVALID_EMAIL');
    });

    it('should create business rule error', () => {
      const error = DomainError.businessRule(
        'INSUFFICIENT_BALANCE',
        'Insufficient balance for transaction'
      );

      expect(error.type).toBe(ErrorType.BUSINESS_RULE);
    });

    it('should create not found error', () => {
      const error = DomainError.notFound(
        'USER_NOT_FOUND',
        'User not found'
      );

      expect(error.type).toBe(ErrorType.NOT_FOUND);
    });

    it('should create unauthorized error', () => {
      const error = DomainError.unauthorized(
        'INVALID_CREDENTIALS',
        'Invalid username or password'
      );

      expect(error.type).toBe(ErrorType.UNAUTHORIZED);
    });

    it('should create forbidden error', () => {
      const error = DomainError.forbidden(
        'ACCESS_DENIED',
        'Access denied to resource'
      );

      expect(error.type).toBe(ErrorType.FORBIDDEN);
    });

    it('should create rate limit error', () => {
      const error = DomainError.rateLimit(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests',
        { limit: 100, resetTime: new Date() }
      );

      expect(error.type).toBe(ErrorType.RATE_LIMIT);
    });

    it('should create external service error', () => {
      const error = DomainError.externalService(
        'PAYMENT_GATEWAY_ERROR',
        'Payment gateway unavailable'
      );

      expect(error.type).toBe(ErrorType.EXTERNAL_SERVICE);
    });

    it('should create internal error', () => {
      const error = DomainError.internal(
        'UNEXPECTED_ERROR',
        'An unexpected error occurred'
      );

      expect(error.type).toBe(ErrorType.INTERNAL);
    });
  });
});