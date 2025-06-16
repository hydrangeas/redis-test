import { describe, it, expect } from 'vitest';
import { AuthResult, AuthResultHelper } from '../auth-result';

describe('AuthResult', () => {
  describe('enum values', () => {
    it('should have correct enum values', () => {
      expect(AuthResult.SUCCESS).toBe('SUCCESS');
      expect(AuthResult.FAILED).toBe('FAILED');
      expect(AuthResult.EXPIRED).toBe('EXPIRED');
      expect(AuthResult.BLOCKED).toBe('BLOCKED');
    });
  });
});

describe('AuthResultHelper', () => {
  describe('fromString', () => {
    it('should convert valid strings to AuthResult', () => {
      expect(AuthResultHelper.fromString('SUCCESS')).toBe(AuthResult.SUCCESS);
      expect(AuthResultHelper.fromString('FAILED')).toBe(AuthResult.FAILED);
      expect(AuthResultHelper.fromString('EXPIRED')).toBe(AuthResult.EXPIRED);
      expect(AuthResultHelper.fromString('BLOCKED')).toBe(AuthResult.BLOCKED);
    });

    it('should handle case-insensitive input', () => {
      expect(AuthResultHelper.fromString('success')).toBe(AuthResult.SUCCESS);
      expect(AuthResultHelper.fromString('Failed')).toBe(AuthResult.FAILED);
      expect(AuthResultHelper.fromString('ExPiReD')).toBe(AuthResult.EXPIRED);
      expect(AuthResultHelper.fromString('blocked')).toBe(AuthResult.BLOCKED);
    });

    it('should return undefined for invalid strings', () => {
      expect(AuthResultHelper.fromString('INVALID')).toBeUndefined();
      expect(AuthResultHelper.fromString('')).toBeUndefined();
      expect(AuthResultHelper.fromString('UNKNOWN')).toBeUndefined();
    });
  });

  describe('isSuccess', () => {
    it('should identify success result', () => {
      expect(AuthResultHelper.isSuccess(AuthResult.SUCCESS)).toBe(true);
      expect(AuthResultHelper.isSuccess(AuthResult.FAILED)).toBe(false);
      expect(AuthResultHelper.isSuccess(AuthResult.EXPIRED)).toBe(false);
      expect(AuthResultHelper.isSuccess(AuthResult.BLOCKED)).toBe(false);
    });
  });

  describe('isFailure', () => {
    it('should identify failure results', () => {
      expect(AuthResultHelper.isFailure(AuthResult.SUCCESS)).toBe(false);
      expect(AuthResultHelper.isFailure(AuthResult.FAILED)).toBe(true);
      expect(AuthResultHelper.isFailure(AuthResult.EXPIRED)).toBe(true);
      expect(AuthResultHelper.isFailure(AuthResult.BLOCKED)).toBe(true);
    });
  });
});
