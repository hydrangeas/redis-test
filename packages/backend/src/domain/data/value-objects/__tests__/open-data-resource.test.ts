import { describe, it, expect, beforeEach } from 'vitest';
import { OpenDataResource } from '../open-data-resource';
import { DataPath } from '../data-path';
import { ResourceMetadata } from '../resource-metadata';
import { ValidationError } from '@/domain/errors/validation-error';

describe('OpenDataResource', () => {
  let validPath: DataPath;
  let validMetadata: ResourceMetadata;
  let validDate: Date;

  beforeEach(() => {
    validPath = DataPath.create('/data/secure/319985/r5.json').getValue();
    validMetadata = ResourceMetadata.create({
      size: 1024 * 10, // 10KB
      lastModified: new Date('2025-01-23T10:00:00Z'),
      etag: '"abc123"',
      contentType: 'application/json',
    }).getValue();
    validDate = new Date('2025-01-23T10:00:00Z');
  });

  describe('create', () => {
    it('should create a valid OpenDataResource', () => {
      const result = OpenDataResource.create(validPath, validMetadata, validDate);

      expect(result.isSuccess).toBe(true);
      const resource = result.getValue();
      expect(resource.path).toBe(validPath);
      expect(resource.metadata).toBe(validMetadata);
      expect(resource.createdAt).toEqual(validDate);
      expect(resource.accessedAt).toEqual(validDate);
    });

    it('should use current date as default for createdAt', () => {
      const beforeTime = new Date();
      const result = OpenDataResource.create(validPath, validMetadata);
      const afterTime = new Date();

      expect(result.isSuccess).toBe(true);
      const resource = result.getValue();
      expect(resource.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(resource.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should set accessedAt to createdAt by default', () => {
      const result = OpenDataResource.create(validPath, validMetadata, validDate);

      expect(result.isSuccess).toBe(true);
      const resource = result.getValue();
      expect(resource.accessedAt).toEqual(resource.createdAt);
    });

    it('should accept custom accessedAt', () => {
      const accessedAt = new Date('2025-01-23T11:00:00Z');
      const result = OpenDataResource.create(validPath, validMetadata, validDate, accessedAt);

      expect(result.isSuccess).toBe(true);
      const resource = result.getValue();
      expect(resource.accessedAt).toEqual(accessedAt);
    });

    it('should fail when path is missing', () => {
      const result = OpenDataResource.create(null as any, validMetadata);

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(ValidationError);
      expect(result.getError().message).toBe('Path is required');
    });

    it('should fail when metadata is missing', () => {
      const result = OpenDataResource.create(validPath, null as any);

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(ValidationError);
      expect(result.getError().message).toBe('Metadata is required');
    });

    it('should fail when createdAt is missing', () => {
      const result = OpenDataResource.create(validPath, validMetadata, null as any);

      expect(result.isFailure).toBe(true);
      expect(result.getError()).toBeInstanceOf(ValidationError);
      expect(result.getError().message).toBe('CreatedAt is required');
    });
  });

  describe('createNew', () => {
    it('should create new resource with current timestamp', () => {
      const beforeTime = new Date();
      const result = OpenDataResource.createNew(validPath, validMetadata);
      const afterTime = new Date();

      expect(result.isSuccess).toBe(true);
      const resource = result.getValue();
      expect(resource.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(resource.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(resource.accessedAt).toEqual(resource.createdAt);
    });
  });

  describe('getCacheKey', () => {
    it('should generate cache key from path and etag', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const cacheKey = resource.getCacheKey();

      expect(cacheKey).toBe('/data/secure/319985/r5.json:abc123');
    });

    it('should strip quotes from etag', () => {
      const metadataWithQuotedEtag = ResourceMetadata.create({
        size: 1024,
        lastModified: new Date(),
        etag: '"xyz789"',
        contentType: 'application/json',
      }).getValue();

      const resource = OpenDataResource.create(validPath, metadataWithQuotedEtag).getValue();
      const cacheKey = resource.getCacheKey();

      expect(cacheKey).toBe('/data/secure/319985/r5.json:xyz789');
    });
  });

  describe('isCacheValid', () => {
    it('should return true when cache is still valid', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const now = new Date('2025-01-23T10:04:00Z'); // 4 minutes later
      const cacheDurationSeconds = 300; // 5 minutes

      expect(resource.isCacheValid(now, cacheDurationSeconds)).toBe(true);
    });

    it('should return false when cache is expired', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const now = new Date('2025-01-23T10:06:00Z'); // 6 minutes later
      const cacheDurationSeconds = 300; // 5 minutes

      expect(resource.isCacheValid(now, cacheDurationSeconds)).toBe(false);
    });

    it('should handle edge case at exact expiration time', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const now = new Date('2025-01-23T10:05:00Z'); // Exactly 5 minutes later
      const cacheDurationSeconds = 300; // 5 minutes

      expect(resource.isCacheValid(now, cacheDurationSeconds)).toBe(false);
    });
  });

  describe('matchesEtag', () => {
    it('should match exact etag', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();

      expect(resource.matchesEtag('"abc123"')).toBe(true);
    });

    it('should not match different etag', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();

      expect(resource.matchesEtag('"xyz789"')).toBe(false);
    });
  });

  describe('isModifiedSince', () => {
    it('should return true when modified after given date', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const since = new Date('2025-01-23T09:00:00Z'); // 1 hour before

      expect(resource.isModifiedSince(since)).toBe(true);
    });

    it('should return false when not modified since given date', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const since = new Date('2025-01-23T11:00:00Z'); // 1 hour after

      expect(resource.isModifiedSince(since)).toBe(false);
    });

    it('should return false when modified at exact same time', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const since = new Date('2025-01-23T10:00:00Z'); // Same time

      expect(resource.isModifiedSince(since)).toBe(false);
    });
  });

  describe('canAccessByTier', () => {
    it('should always return true for any tier', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();

      expect(resource.canAccessByTier('tier1')).toBe(true);
      expect(resource.canAccessByTier('tier2')).toBe(true);
      expect(resource.canAccessByTier('tier3')).toBe(true);
      expect(resource.canAccessByTier('admin')).toBe(true);
    });
  });

  describe('getHumanReadableSize', () => {
    it('should format bytes correctly', () => {
      const metadata1 = ResourceMetadata.create({
        size: 512,
        lastModified: new Date(),
        etag: '"test"',
        contentType: 'application/json',
      }).getValue();
      const resource1 = OpenDataResource.create(validPath, metadata1).getValue();
      expect(resource1.getHumanReadableSize()).toBe('512.00 B');
    });

    it('should format kilobytes correctly', () => {
      const metadata2 = ResourceMetadata.create({
        size: 1024 * 10.5,
        lastModified: new Date(),
        etag: '"test"',
        contentType: 'application/json',
      }).getValue();
      const resource2 = OpenDataResource.create(validPath, metadata2).getValue();
      expect(resource2.getHumanReadableSize()).toBe('10.50 KB');
    });

    it('should format megabytes correctly', () => {
      const metadata3 = ResourceMetadata.create({
        size: 1024 * 1024 * 2.25,
        lastModified: new Date(),
        etag: '"test"',
        contentType: 'application/json',
      }).getValue();
      const resource3 = OpenDataResource.create(validPath, metadata3).getValue();
      expect(resource3.getHumanReadableSize()).toBe('2.25 MB');
    });

    it('should format gigabytes correctly', () => {
      const metadata4 = ResourceMetadata.create({
        size: 1024 * 1024 * 1024 * 1.5,
        lastModified: new Date(),
        etag: '"test"',
        contentType: 'application/json',
      }).getValue();
      const resource4 = OpenDataResource.create(validPath, metadata4).getValue();
      expect(resource4.getHumanReadableSize()).toBe('1.50 GB');
    });
  });

  describe('withAccessRecorded', () => {
    it('should create new instance with updated accessedAt', () => {
      const resource = OpenDataResource.create(validPath, validMetadata, validDate).getValue();
      const newAccessTime = new Date('2025-01-23T12:00:00Z');

      const updated = resource.withAccessRecorded(newAccessTime);

      expect(updated).not.toBe(resource); // Different instance
      expect(updated.accessedAt).toEqual(newAccessTime);
      expect(updated.createdAt).toEqual(resource.createdAt); // Unchanged
      expect(updated.path).toBe(resource.path); // Same reference
      expect(updated.metadata).toBe(resource.metadata); // Same reference
    });

    it('should use current time by default', () => {
      const resource = OpenDataResource.create(validPath, validMetadata, validDate).getValue();
      const beforeTime = new Date();

      const updated = resource.withAccessRecorded();

      const afterTime = new Date();
      expect(updated.accessedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(updated.accessedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('withUpdatedMetadata', () => {
    it('should create new instance with updated metadata', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const newMetadata = ResourceMetadata.create({
        size: 2048,
        lastModified: new Date('2025-01-23T11:00:00Z'),
        etag: '"def456"',
        contentType: 'application/json',
      }).getValue();

      const updated = resource.withUpdatedMetadata(newMetadata);

      expect(updated).not.toBe(resource); // Different instance
      expect(updated.metadata).toBe(newMetadata);
      expect(updated.path).toBe(resource.path); // Same reference
      expect(updated.createdAt).toEqual(resource.createdAt); // Unchanged
      expect(updated.accessedAt).toEqual(resource.accessedAt); // Unchanged
    });
  });

  describe('toString', () => {
    it('should return formatted string representation', () => {
      const resource = OpenDataResource.create(validPath, validMetadata).getValue();
      const str = resource.toString();

      expect(str).toBe('/data/secure/319985/r5.json (10.00 KB)');
    });
  });
});
