import { describe, it, expect } from 'vitest';
import { ResourceMetadata } from '../resource-metadata';

describe('ResourceMetadata', () => {
  describe('constructor', () => {
    it('should create valid metadata with all parameters', () => {
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: new Date('2025-01-23T10:00:00Z'),
        etag: '"abc123"',
        contentType: 'application/json',
      });

      expect(metadata.size).toBe(1024);
      expect(metadata.lastModified).toEqual(new Date('2025-01-23T10:00:00Z'));
      expect(metadata.etag).toBe('"abc123"');
      expect(metadata.contentType).toBe('application/json');
    });

    it('should use default content type if not provided', () => {
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(),
        etag: '"test"',
      });

      expect(metadata.contentType).toBe('application/json');
    });

    it('should throw error for negative size', () => {
      expect(() => {
        new ResourceMetadata({
          size: -1,
          lastModified: new Date(),
          etag: '"test"',
        });
      }).toThrow('Size cannot be negative');
    });
  });

  describe('create', () => {
    it('should create metadata from valid parameters', () => {
      const result = ResourceMetadata.create({
        size: 2048,
        lastModified: new Date('2025-01-23T10:00:00Z'),
        etag: '"xyz789"',
        contentType: 'text/csv',
      });

      expect(result.isSuccess).toBe(true);
      const metadata = result.getValue();
      expect(metadata.size).toBe(2048);
      expect(metadata.contentType).toBe('text/csv');
    });

    it('should generate etag if not provided', () => {
      const result = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date('2025-01-23T10:00:00Z'),
      });

      expect(result.isSuccess).toBe(true);
      const metadata = result.getValue();
      expect(metadata.etag).toMatch(/^"[a-f0-9]+"$/);
    });

    it('should add quotes to etag if missing', () => {
      const result = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date(),
        etag: 'abc123',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().etag).toBe('"abc123"');
    });

    it('should parse string dates', () => {
      const result = ResourceMetadata.create({
        size: 1024,
        lastModified: '2025-01-23T10:00:00Z',
        etag: '"test"',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().lastModified).toEqual(new Date('2025-01-23T10:00:00Z'));
    });

    it('should fail for invalid date strings', () => {
      const result = ResourceMetadata.create({
        size: 1024,
        lastModified: 'invalid-date',
        etag: '"test"',
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_DATE');
    });

    it('should fail for null size', () => {
      const result = ResourceMetadata.create({
        size: null as any,
        lastModified: new Date(),
        etag: '"test"',
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_SIZE');
    });

    it('should fail for negative size', () => {
      const result = ResourceMetadata.create({
        size: -100,
        lastModified: new Date(),
        etag: '"test"',
      });

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_SIZE');
    });
  });

  describe('getLastModifiedString', () => {
    it('should return UTC string format', () => {
      const date = new Date('2025-01-23T10:00:00Z');
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: date,
        etag: '"test"',
      });

      expect(metadata.getLastModifiedString()).toBe('Thu, 23 Jan 2025 10:00:00 GMT');
    });
  });

  describe('calculateAge', () => {
    it('should calculate age in seconds', () => {
      const lastModified = new Date('2025-01-23T10:00:00Z');
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified,
        etag: '"test"',
      });

      const now = new Date('2025-01-23T10:05:30Z');
      expect(metadata.calculateAge(now)).toBe(330); // 5 minutes 30 seconds
    });

    it('should use current time if not provided', () => {
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(Date.now() - 60000), // 1 minute ago
        etag: '"test"',
      });

      const age = metadata.calculateAge();
      expect(age).toBeGreaterThanOrEqual(59);
      expect(age).toBeLessThanOrEqual(61);
    });
  });

  describe('isStale', () => {
    it('should return true if older than threshold', () => {
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(Date.now() - 3600000), // 1 hour ago
        etag: '"test"',
      });

      expect(metadata.isStale(1800)).toBe(true); // 30 minutes threshold
    });

    it('should return false if within threshold', () => {
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(Date.now() - 60000), // 1 minute ago
        etag: '"test"',
      });

      expect(metadata.isStale(300)).toBe(false); // 5 minutes threshold
    });
  });

  describe('equals', () => {
    it('should return true for equal metadata', () => {
      const date = new Date('2025-01-23T10:00:00Z');
      const metadata1 = new ResourceMetadata({
        size: 1024,
        lastModified: date,
        etag: '"abc123"',
        contentType: 'application/json',
      });

      const metadata2 = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(date),
        etag: '"abc123"',
        contentType: 'application/json',
      });

      expect(metadata1.equals(metadata2)).toBe(true);
    });

    it('should return false for different size', () => {
      const date = new Date();
      const metadata1 = new ResourceMetadata({
        size: 1024,
        lastModified: date,
        etag: '"test"',
      });

      const metadata2 = new ResourceMetadata({
        size: 2048,
        lastModified: date,
        etag: '"test"',
      });

      expect(metadata1.equals(metadata2)).toBe(false);
    });

    it('should return false for different dates', () => {
      const metadata1 = new ResourceMetadata({
        size: 1024,
        lastModified: new Date('2025-01-23T10:00:00Z'),
        etag: '"test"',
      });

      const metadata2 = new ResourceMetadata({
        size: 1024,
        lastModified: new Date('2025-01-23T11:00:00Z'),
        etag: '"test"',
      });

      expect(metadata1.equals(metadata2)).toBe(false);
    });

    it('should handle null comparison', () => {
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(),
        etag: '"test"',
      });

      expect(metadata.equals(null as any)).toBe(false);
    });
  });

  describe('update', () => {
    it('should create new metadata with updated values', () => {
      const original = new ResourceMetadata({
        size: 1024,
        lastModified: new Date('2025-01-23T10:00:00Z'),
        etag: '"abc123"',
        contentType: 'application/json',
      });

      const updated = original.update({
        size: 2048,
        etag: '"xyz789"',
      });

      // Original unchanged
      expect(original.size).toBe(1024);
      expect(original.etag).toBe('"abc123"');

      // Updated values
      expect(updated.size).toBe(2048);
      expect(updated.etag).toBe('"xyz789"');

      // Unchanged values preserved
      expect(updated.lastModified).toEqual(original.lastModified);
      expect(updated.contentType).toBe(original.contentType);
    });

    it('should handle empty update', () => {
      const original = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(),
        etag: '"test"',
      });

      const updated = original.update({});

      expect(updated.equals(original)).toBe(true);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const metadata = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(),
        etag: '"test"',
      });

      expect(() => {
        (metadata as any).size = 2048;
      }).toThrow();

      expect(() => {
        (metadata as any)._size = 2048;
      }).toThrow();
    });
  });
});
