import { describe, it, expect } from 'vitest';
import { Result } from '../result';
import { DomainError, ErrorType } from '../../errors/domain-error';

describe('Result', () => {
  describe('basic operations', () => {
    it('should create successful result', () => {
      const result = Result.ok('value');
      
      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.getValue()).toBe('value');
    });

    it('should create failed result with string error', () => {
      const result = Result.fail<string>('error message');
      
      expect(result.isSuccess).toBe(false);
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('error message');
    });

    it('should create failed result with Error object', () => {
      const error = new Error('error message');
      const result = Result.fail<string>(error);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBe(error);
    });

    it('should create failed result with DomainError', () => {
      const error = DomainError.validation('CODE', 'message', { field: 'test' });
      const result = Result.fail<string>(error);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBe(error);
    });

    it('should throw when accessing value of failed result', () => {
      const result = Result.fail<string>('error');
      
      expect(() => result.getValue()).toThrow("Can't get the value of an error result");
    });

    it('should throw when accessing error of successful result', () => {
      const result = Result.ok('value');
      
      expect(() => result.getError()).toThrow("Can't get the error of a success result");
    });
  });

  describe('map operations', () => {
    it('should map successful result value', () => {
      const result = Result.ok(5);
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isSuccess).toBe(true);
      expect(mapped.getValue()).toBe(10);
    });

    it('should not map failed result value', () => {
      const result = Result.fail<number>('error');
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isFailure).toBe(true);
      expect(mapped.getError().message).toBe('error');
    });

    it('should map error of failed result', () => {
      const result = Result.fail<number>(new Error('original'));
      const mapped = result.mapError(err => new Error(`wrapped: ${err.message}`));
      
      expect(mapped.isFailure).toBe(true);
      expect(mapped.getError().message).toBe('wrapped: original');
    });

    it('should not map error of successful result', () => {
      const result = Result.ok(5);
      const mapped = result.mapError(err => new Error('should not happen'));
      
      expect(mapped.isSuccess).toBe(true);
      expect(mapped.getValue()).toBe(5);
    });
  });

  describe('flatMap operations', () => {
    it('should chain successful results', () => {
      const result = Result.ok(5);
      const chained = result.flatMap(x => Result.ok(x * 2));
      
      expect(chained.isSuccess).toBe(true);
      expect(chained.getValue()).toBe(10);
    });

    it('should not chain if first result is failed', () => {
      const result = Result.fail<number>('error');
      const chained = result.flatMap(x => Result.ok(x * 2));
      
      expect(chained.isFailure).toBe(true);
      expect(chained.getError().message).toBe('error');
    });

    it('should propagate failure from chained operation', () => {
      const result = Result.ok(5);
      const chained = result.flatMap(x => Result.fail<number>('chained error'));
      
      expect(chained.isFailure).toBe(true);
      expect(chained.getError().message).toBe('chained error');
    });
  });

  describe('side effects', () => {
    it('should execute tap on successful result', () => {
      let sideEffect = 0;
      const result = Result.ok(5);
      
      const tapped = result.tap(x => { sideEffect = x; });
      
      expect(sideEffect).toBe(5);
      expect(tapped).toBe(result); // returns same instance
    });

    it('should not execute tap on failed result', () => {
      let sideEffect = 0;
      const result = Result.fail<number>('error');
      
      const tapped = result.tap(x => { sideEffect = x; });
      
      expect(sideEffect).toBe(0);
      expect(tapped).toBe(result);
    });

    it('should execute tapError on failed result', () => {
      let errorMessage = '';
      const result = Result.fail<number>('error');
      
      const tapped = result.tapError(err => { errorMessage = err.message; });
      
      expect(errorMessage).toBe('error');
      expect(tapped).toBe(result);
    });

    it('should not execute tapError on successful result', () => {
      let errorMessage = '';
      const result = Result.ok(5);
      
      const tapped = result.tapError(err => { errorMessage = err.message; });
      
      expect(errorMessage).toBe('');
      expect(tapped).toBe(result);
    });
  });

  describe('default value', () => {
    it('should return value for successful result', () => {
      const result = Result.ok(5);
      expect(result.getValueOrDefault(10)).toBe(5);
    });

    it('should return default for failed result', () => {
      const result = Result.fail<number>('error');
      expect(result.getValueOrDefault(10)).toBe(10);
    });
  });

  describe('promise conversion', () => {
    it('should convert successful result to resolved promise', async () => {
      const result = Result.ok(5);
      const value = await result.toPromise();
      expect(value).toBe(5);
    });

    it('should convert failed result to rejected promise', async () => {
      const result = Result.fail<number>('error');
      await expect(result.toPromise()).rejects.toThrow('error');
    });
  });

  describe('static helpers', () => {
    it('should combine all successful results', () => {
      const results = [
        Result.ok(1),
        Result.ok(2),
        Result.ok(3),
      ];
      
      const combined = Result.combine(results);
      expect(combined.isSuccess).toBe(true);
    });

    it('should fail combination if any result fails', () => {
      const results = [
        Result.ok(1),
        Result.fail('error'),
        Result.ok(3),
      ];
      
      const combined = Result.combine(results);
      expect(combined.isFailure).toBe(true);
    });

    it('should create result from promise', async () => {
      const promise = Promise.resolve(5);
      const result = await Result.fromPromise(promise);
      
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(5);
    });

    it('should create failed result from rejected promise', async () => {
      const promise = Promise.reject(new Error('async error'));
      const result = await Result.fromPromise(promise);
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('async error');
    });

    it('should wrap function execution', () => {
      const result = Result.try(() => 5);
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(5);
    });

    it('should catch function errors', () => {
      const result = Result.try(() => {
        throw new Error('sync error');
      });
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('sync error');
    });

    it('should wrap async function execution', async () => {
      const result = await Result.tryAsync(async () => 5);
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(5);
    });

    it('should catch async function errors', async () => {
      const result = await Result.tryAsync(async () => {
        throw new Error('async error');
      });
      
      expect(result.isFailure).toBe(true);
      expect(result.getError().message).toBe('async error');
    });
  });
});