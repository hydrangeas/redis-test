import { describe, it, expect } from 'vitest';
import { Result } from '../result';
import { DomainError, ErrorType } from '../domain-error';

describe('Result', () => {
  describe('ok', () => {
    it('should create successful result', () => {
      const result = Result.ok('success');

      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.getValue()).toBe('success');
    });

    it('should create successful result with complex object', () => {
      const data = { id: 1, name: 'Test' };
      const result = Result.ok(data);

      expect(result.getValue()).toEqual(data);
    });
  });

  describe('fail', () => {
    it('should create failed result', () => {
      const error = DomainError.validation('TEST_ERROR', 'Test error');
      const result = Result.fail<string>(error);

      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBe(error);
    });
  });

  describe('combine', () => {
    it('should return ok when all results are successful', () => {
      const results = [Result.ok('a'), Result.ok('b'), Result.ok('c')];

      const combined = Result.combine(results);
      expect(combined.isSuccess).toBe(true);
    });

    it('should return first failure when any result fails', () => {
      const error = DomainError.validation('ERROR', 'Error message');
      const results = [Result.ok('a'), Result.fail(error), Result.ok('c')];

      const combined = Result.combine(results);
      expect(combined.isFailure).toBe(true);
      expect(combined.getError()).toBe(error);
    });
  });

  describe('getValue', () => {
    it('should throw when getting value from failed result', () => {
      const error = DomainError.validation('ERROR', 'Error');
      const result = Result.fail<string>(error);

      expect(() => result.getValue()).toThrow('Cannot get value from failed result');
    });
  });

  describe('getError', () => {
    it('should throw when getting error from successful result', () => {
      const result = Result.ok('success');

      expect(() => result.getError()).toThrow('Cannot get error from successful result');
    });
  });

  describe('map', () => {
    it('should transform successful result', () => {
      const result = Result.ok(5);
      const mapped = result.map((n) => n * 2);

      expect(mapped.isSuccess).toBe(true);
      expect(mapped.getValue()).toBe(10);
    });

    it('should pass through failed result', () => {
      const error = DomainError.validation('ERROR', 'Error');
      const result = Result.fail<number>(error);
      const mapped = result.map((n) => n * 2);

      expect(mapped.isFailure).toBe(true);
      expect(mapped.getError()).toBe(error);
    });
  });

  describe('flatMap', () => {
    it('should chain successful results', () => {
      const result = Result.ok(5);
      const flatMapped = result.flatMap((n) => Result.ok(n * 2));

      expect(flatMapped.isSuccess).toBe(true);
      expect(flatMapped.getValue()).toBe(10);
    });

    it('should handle failure in chain', () => {
      const error = DomainError.validation('ERROR', 'Error');
      const result = Result.ok(5);
      const flatMapped = result.flatMap((n) => Result.fail<number>(error));

      expect(flatMapped.isFailure).toBe(true);
      expect(flatMapped.getError()).toBe(error);
    });

    it('should not execute function on failed result', () => {
      const error = DomainError.validation('ERROR', 'Error');
      const result = Result.fail<number>(error);
      let called = false;

      const flatMapped = result.flatMap((n) => {
        called = true;
        return Result.ok(n * 2);
      });

      expect(called).toBe(false);
      expect(flatMapped.isFailure).toBe(true);
    });
  });

  describe('mapError', () => {
    it('should transform error in failed result', () => {
      const originalError = DomainError.validation('ORIGINAL', 'Original error');
      const newError = DomainError.businessRule('TRANSFORMED', 'Transformed error');

      const result = Result.fail<string>(originalError);
      const mapped = result.mapError(() => newError);

      expect(mapped.isFailure).toBe(true);
      expect(mapped.getError()).toBe(newError);
    });

    it('should not affect successful result', () => {
      const result = Result.ok('success');
      const mapped = result.mapError(() => DomainError.internal('ERROR', 'Should not be called'));

      expect(mapped.isSuccess).toBe(true);
      expect(mapped.getValue()).toBe('success');
    });
  });

  describe('getOrElse', () => {
    it('should return value for successful result', () => {
      const result = Result.ok('success');
      expect(result.getOrElse('default')).toBe('success');
    });

    it('should return default for failed result', () => {
      const error = DomainError.validation('ERROR', 'Error');
      const result = Result.fail<string>(error);
      expect(result.getOrElse('default')).toBe('default');
    });
  });

  describe('getOrElseThrow', () => {
    it('should return value for successful result', () => {
      const result = Result.ok('success');
      expect(result.getOrElseThrow(() => new Error('Should not throw'))).toBe('success');
    });

    it('should throw custom error for failed result', () => {
      const domainError = DomainError.validation('ERROR', 'Domain error');
      const result = Result.fail<string>(domainError);

      expect(() => result.getOrElseThrow((err) => new Error(`Custom: ${err.message}`))).toThrow(
        'Custom: Domain error',
      );
    });
  });
});
