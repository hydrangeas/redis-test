import { describe, it, expect } from 'vitest';
import { ResourceId } from '../resource-id';

describe('ResourceId', () => {
  describe('generate', () => {
    it('should generate a unique resource ID', () => {
      const id1 = ResourceId.generate();
      const id2 = ResourceId.generate();

      expect(id1.value).toMatch(/^resource_[a-f0-9]{32}$/);
      expect(id2.value).toMatch(/^resource_[a-f0-9]{32}$/);
      expect(id1.value).not.toBe(id2.value);
    });

    it('should generate consistent format', () => {
      const ids = Array.from({ length: 10 }, () => ResourceId.generate());

      ids.forEach((id) => {
        expect(id.value).toMatch(/^resource_[a-f0-9]{32}$/);
      });
    });
  });

  describe('fromPath', () => {
    it('should generate deterministic ID from path', () => {
      const path = 'secure/319985/r5.json';
      const id1 = ResourceId.fromPath(path);
      const id2 = ResourceId.fromPath(path);

      expect(id1.value).toBe(id2.value);
      expect(id1.value).toMatch(/^resource_[a-f0-9]{32}$/);
    });

    it('should generate different IDs for different paths', () => {
      const id1 = ResourceId.fromPath('secure/319985/r5.json');
      const id2 = ResourceId.fromPath('secure/319985/r6.json');

      expect(id1.value).not.toBe(id2.value);
    });

    it('should handle paths with special characters', () => {
      const id = ResourceId.fromPath('data/2024-01-01/file with spaces.json');
      expect(id.value).toMatch(/^resource_[a-f0-9]{32}$/);
    });
  });

  describe('create', () => {
    it('should create ResourceId from valid string', () => {
      const validId = 'resource_a1b2c3d4e5f678901234567890123456';
      const result = ResourceId.create(validId);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().value).toBe(validId);
    });

    it('should fail for null or undefined', () => {
      const nullResult = ResourceId.create(null as any);
      const undefinedResult = ResourceId.create(undefined as any);

      expect(nullResult.isFailure).toBe(true);
      expect(nullResult.getError().code).toBe('INVALID_RESOURCE_ID');
      expect(undefinedResult.isFailure).toBe(true);
    });

    it('should fail for invalid format', () => {
      const invalidFormats = [
        'invalid_format',
        'resource_',
        'resource_12345',
        'resource_GHIJKLMNOP12345678901234567890', // uppercase letters
        'res_a1b2c3d4e5f678901234567890123456', // wrong prefix
        'resource_a1b2c3d4e5f6789012345678901234567', // too long (33 hex chars)
      ];

      invalidFormats.forEach((invalid) => {
        const result = ResourceId.create(invalid);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_RESOURCE_ID_FORMAT');
      });
    });

    it('should only accept lowercase hex characters', () => {
      const uppercase = 'resource_A1B2C3D4E5F678901234567890123456';
      const result = ResourceId.create(uppercase);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_RESOURCE_ID_FORMAT');
    });
  });

  describe('equals', () => {
    it('should return true for same IDs', () => {
      const id1 = ResourceId.generate();
      const id2Result = ResourceId.create(id1.value);

      if (id2Result.isFailure) {
        throw new Error('Failed to create ResourceId');
      }
      const id2 = id2Result.getValue();

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const id1 = ResourceId.generate();
      const id2 = ResourceId.generate();

      expect(id1.equals(id2)).toBe(false);
    });

    it('should handle null comparison', () => {
      const id = ResourceId.generate();
      expect(id.equals(null as any)).toBe(false);
    });
  });

  describe('toString and toJSON', () => {
    it('should return string representation', () => {
      const id = ResourceId.generate();
      expect(id.toString()).toBe(id.value);
    });

    it('should serialize to JSON correctly', () => {
      const id = ResourceId.generate();
      const json = JSON.stringify({ id });
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(id.value);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const id = ResourceId.generate();
      const value = id.value;

      // Try to modify (should not work due to Object.freeze)
      expect(() => {
        (id as any).value = 'modified';
      }).toThrow();

      expect(id.value).toBe(value);
    });
  });
});
