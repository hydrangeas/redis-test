import { describe, it, expect } from 'vitest';
import { UserId } from '../user-id';
import { ValidationError } from '../../../errors/exceptions';

describe('UserId', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';
  const validUuidUpperCase = '550E8400-E29B-41D4-A716-446655440000';

  describe('constructor', () => {
    it('should create valid UserId', () => {
      const userId = new UserId(validUuid);
      expect(userId.value).toBe(validUuid);
    });

    it('should normalize UUID to lowercase', () => {
      const userId = new UserId(validUuidUpperCase);
      expect(userId.value).toBe(validUuid);
    });

    it('should trim whitespace', () => {
      const userId = new UserId(`  ${validUuid}  `);
      expect(userId.value).toBe(validUuid);
    });

    it('should be immutable', () => {
      const userId = new UserId(validUuid);
      expect(() => {
        (userId as any).value = 'new-value';
      }).toThrow();
    });

    it('should throw error for empty string', () => {
      expect(() => new UserId('')).toThrow(ValidationError);
      expect(() => new UserId('   ')).toThrow(ValidationError);
    });

    it('should throw error for invalid UUID format', () => {
      expect(() => new UserId('invalid-uuid')).toThrow(ValidationError);
      expect(() => new UserId('550e8400-e29b-41d4-a716')).toThrow(ValidationError);
      expect(() => new UserId('550e8400-e29b-41d4-a716-446655440000-extra')).toThrow(ValidationError);
      expect(() => new UserId('550e8400-e29b-41d4-a716-44665544000g')).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    it('should return true for equal UserIds', () => {
      const userId1 = new UserId(validUuid);
      const userId2 = new UserId(validUuid);
      expect(userId1.equals(userId2)).toBe(true);
    });

    it('should return true for equal UserIds with different case', () => {
      const userId1 = new UserId(validUuid);
      const userId2 = new UserId(validUuidUpperCase);
      expect(userId1.equals(userId2)).toBe(true);
    });

    it('should return false for different UserIds', () => {
      const userId1 = new UserId(validUuid);
      const userId2 = new UserId('650e8400-e29b-41d4-a716-446655440000');
      expect(userId1.equals(userId2)).toBe(false);
    });
  });

  describe('hashCode', () => {
    it('should generate consistent hash code', () => {
      const userId = new UserId(validUuid);
      const hash1 = userId.hashCode();
      const hash2 = userId.hashCode();
      expect(hash1).toBe(hash2);
    });

    it('should generate same hash for equal UserIds', () => {
      const userId1 = new UserId(validUuid);
      const userId2 = new UserId(validUuid);
      expect(userId1.hashCode()).toBe(userId2.hashCode());
    });

    it('should generate different hash for different UserIds', () => {
      const userId1 = new UserId(validUuid);
      const userId2 = new UserId('650e8400-e29b-41d4-a716-446655440000');
      expect(userId1.hashCode()).not.toBe(userId2.hashCode());
    });
  });

  describe('toString', () => {
    it('should return the UUID value', () => {
      const userId = new UserId(validUuid);
      expect(userId.toString()).toBe(validUuid);
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const userId = new UserId(validUuid);
      expect(userId.toJSON()).toBe(validUuid);
      expect(JSON.stringify(userId)).toBe(`"${validUuid}"`);
    });

    it('should deserialize from JSON', () => {
      const userId = UserId.fromJSON(validUuid);
      expect(userId.value).toBe(validUuid);
    });

    it('should maintain equality through serialization', () => {
      const original = new UserId(validUuid);
      const json = original.toJSON();
      const restored = UserId.fromJSON(json);
      expect(original.equals(restored)).toBe(true);
    });
  });

  describe('generate', () => {
    it('should generate valid UUID', () => {
      const userId = UserId.generate();
      expect(UserId.isValid(userId.value)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const userId1 = UserId.generate();
      const userId2 = UserId.generate();
      expect(userId1.equals(userId2)).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true for valid UUIDs', () => {
      expect(UserId.isValid(validUuid)).toBe(true);
      expect(UserId.isValid(validUuidUpperCase)).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(UserId.isValid('')).toBe(false);
      expect(UserId.isValid('invalid-uuid')).toBe(false);
      expect(UserId.isValid('not-a-uuid')).toBe(false);
    });
  });
});