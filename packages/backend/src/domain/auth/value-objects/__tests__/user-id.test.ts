import { describe, it, expect } from 'vitest';
import { UserId } from '../user-id';
import { DomainError } from '@/domain/errors/domain-error';

describe('UserId', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validUuidUpperCase = '550E8400-E29B-41D4-A716-446655440000';
  const validUuidV4 = '550e8400-e29b-41d4-a716-446655440000';

  describe('create (Result pattern)', () => {
    it('should create valid UserId with Result.ok', () => {
      const result = UserId.create(validUuid);

      expect(result.isSuccess).toBe(true);
      expect(result.isFailure).toBe(false);
      expect(result.getValue().value).toBe(validUuid);
    });

    it('should normalize UUID to lowercase', () => {
      const result = UserId.create(validUuidUpperCase);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(validUuid);
    });

    it('should trim whitespace', () => {
      const result = UserId.create(`  ${validUuid}  `);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(validUuid);
    });

    it('should return Result.fail for null or undefined', () => {
      const resultNull = UserId.create(null as any);
      const resultUndefined = UserId.create(undefined as any);

      expect(resultNull.isFailure).toBe(true);
      expect(resultUndefined.isFailure).toBe(true);

      expect(resultNull.getError().code).toBe('INVALID_USER_ID');
      expect(resultUndefined.getError().code).toBe('INVALID_USER_ID');
    });

    it('should return Result.fail for empty string', () => {
      const result1 = UserId.create('');
      const result2 = UserId.create('   ');

      expect(result1.isFailure).toBe(true);
      expect(result2.isFailure).toBe(true);

      expect(result1.getError().code).toBe('INVALID_USER_ID');
      expect(result1.getError().message).toBe('User ID cannot be empty');
    });

    it('should return Result.fail for invalid UUID format', () => {
      const invalidUuids = [
        'invalid-uuid',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // too long
        '550e8400-e29b-41d4-a716-44665544000g', // invalid character
        '550e8400-e29b-91d4-a716-446655440000', // invalid version (9)
        '550e8400-e29b-41d4-f716-446655440000', // invalid variant (f)
      ];

      for (const invalidUuid of invalidUuids) {
        const result = UserId.create(invalidUuid);

        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_USER_ID_FORMAT');
        expect(result.getError().details?.providedValue).toBe(invalidUuid);
      }
    });

    it('should accept valid UUID v4 formats', () => {
      const validUuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-51d4-a716-446655440000', // v5
        '550e8400-e29b-41d4-8716-446655440000', // variant 8
        '550e8400-e29b-41d4-9716-446655440000', // variant 9
        '550e8400-e29b-41d4-a716-446655440000', // variant a
        '550e8400-e29b-41d4-b716-446655440000', // variant b
      ];

      for (const uuid of validUuids) {
        const result = UserId.create(uuid);
        expect(result.isSuccess).toBe(true);
      }
    });
  });

  describe('fromString (exception pattern)', () => {
    it('should create valid UserId', () => {
      const userId = UserId.fromString(validUuid);
      expect(userId.value).toBe(validUuid);
    });

    it('should throw error for invalid UUID', () => {
      expect(() => UserId.fromString('invalid-uuid')).toThrow(Error);
      expect(() => UserId.fromString('')).toThrow(Error);
    });
  });

  describe('generate', () => {
    it('should generate valid UserId', () => {
      const userId = UserId.generate();

      expect(userId).toBeDefined();
      expect(userId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should generate unique UserIds', () => {
      const userId1 = UserId.generate();
      const userId2 = UserId.generate();

      expect(userId1.value).not.toBe(userId2.value);
    });
  });

  describe('isValid', () => {
    it('should return true for valid UUID', () => {
      expect(UserId.isValid(validUuid)).toBe(true);
      expect(UserId.isValid(validUuidUpperCase)).toBe(true);
    });

    it('should return false for invalid UUID', () => {
      expect(UserId.isValid('invalid-uuid')).toBe(false);
      expect(UserId.isValid('')).toBe(false);
      expect(UserId.isValid('   ')).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for equal UserIds', () => {
      const userId1 = UserId.fromString(validUuid);
      const userId2 = UserId.fromString(validUuid);

      expect(userId1.equals(userId2)).toBe(true);
    });

    it('should return true for UserIds with different case', () => {
      const userId1 = UserId.fromString(validUuid);
      const userId2 = UserId.fromString(validUuidUpperCase);

      expect(userId1.equals(userId2)).toBe(true);
    });

    it('should return false for different UserIds', () => {
      const userId1 = UserId.fromString(validUuid);
      const userId2 = UserId.generate();

      expect(userId1.equals(userId2)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      const userId = UserId.fromString(validUuid);

      expect(userId.equals(null as any)).toBe(false);
      expect(userId.equals(undefined as any)).toBe(false);
    });
  });

  describe('hashCode', () => {
    it('should return consistent hash for same value', () => {
      const userId1 = UserId.fromString(validUuid);
      const userId2 = UserId.fromString(validUuid);

      expect(userId1.hashCode()).toBe(userId2.hashCode());
    });

    it('should return different hash for different values', () => {
      const userId1 = UserId.fromString(validUuid);
      const userId2 = UserId.generate();

      expect(userId1.hashCode()).not.toBe(userId2.hashCode());
    });

    it('should return positive hash values', () => {
      const userId = UserId.fromString(validUuid);

      expect(userId.hashCode()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const userId = UserId.fromString(validUuid);

      expect(userId.toString()).toBe(validUuid);
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const userId = UserId.fromString(validUuid);

      expect(userId.toJSON()).toBe(validUuid);
    });
  });

  describe('fromJSON', () => {
    it('should create UserId from JSON', () => {
      const userId = UserId.fromJSON(validUuid);

      expect(userId.value).toBe(validUuid);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => UserId.fromJSON('invalid-uuid')).toThrow(Error);
    });
  });

  describe('brand type safety', () => {
    it('should prevent primitive type confusion at compile time', () => {
      const userIdResult = UserId.create(validUuid);
      const userId = userIdResult.getValue();

      // The following would cause TypeScript compile errors:
      // const wrongUsage: string = userId; // Error: Type 'UserId' is not assignable to type 'string'
      // const wrongComparison = userId === validUuid; // Error: Operator '===' cannot be applied

      // Correct usage:
      const idString: string = userId.value;
      expect(idString).toBe(validUuid);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const userId = UserId.fromString(validUuid);

      expect(() => {
        (userId as any)._value = 'new-value';
      }).toThrow();

      expect(() => {
        (userId as any).value = 'new-value';
      }).toThrow();
    });
  });
});
