import { describe, it, expect, beforeEach } from 'vitest';
import { OpenDataResource } from '../open-data-resource.entity';
import { ResourceId } from '../../value-objects/resource-id';
import { DataPath } from '../../value-objects/data-path';
import { ResourceMetadata } from '../../value-objects/resource-metadata';

describe('OpenDataResource', () => {
  let resourceId: ResourceId;
  let dataPath: DataPath;
  let metadata: ResourceMetadata;
  let resource: OpenDataResource;

  beforeEach(() => {
    resourceId = ResourceId.generate();
    const pathResult = DataPath.create('secure/319985/r5.json');
    if (pathResult.isFailure) {
      throw new Error('Failed to create DataPath');
    }
    dataPath = pathResult.getValue();

    metadata = new ResourceMetadata({
      size: 1024 * 10, // 10KB
      lastModified: new Date('2025-01-23T10:00:00Z'),
      etag: '"abc123"',
      contentType: 'application/json',
    });

    resource = new OpenDataResource(
      resourceId,
      dataPath,
      metadata,
      new Date('2025-01-23T09:00:00Z'),
    );
  });

  describe('constructor', () => {
    it('should create a valid OpenDataResource', () => {
      expect(resource).toBeDefined();
      expect(resource.id).toBe(resourceId);
      expect(resource.path).toBe(dataPath);
      expect(resource.metadata).toBe(metadata);
      expect(resource.createdAt).toEqual(new Date('2025-01-23T09:00:00Z'));
      expect(resource.accessedAt).toEqual(new Date('2025-01-23T09:00:00Z'));
    });

    it('should set accessedAt to createdAt if not provided', () => {
      const newResource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date('2025-01-23T09:00:00Z'),
      );
      expect(newResource.accessedAt).toEqual(newResource.createdAt);
    });

    it('should accept custom accessedAt', () => {
      const accessedAt = new Date('2025-01-23T11:00:00Z');
      const newResource = new OpenDataResource(
        resourceId,
        dataPath,
        metadata,
        new Date('2025-01-23T09:00:00Z'),
        accessedAt,
      );
      expect(newResource.accessedAt).toEqual(accessedAt);
    });
  });

  describe('recordAccess', () => {
    it('should update accessedAt timestamp', () => {
      const beforeAccess = resource.accessedAt;
      const now = new Date();

      resource.recordAccess();

      expect(resource.accessedAt.getTime()).toBeGreaterThanOrEqual(now.getTime());
      expect(resource.accessedAt).not.toEqual(beforeAccess);
    });
  });

  describe('getCacheKey', () => {
    it('should generate cache key from path and etag', () => {
      const cacheKey = resource.getCacheKey();
      expect(cacheKey).toBe('secure/319985/r5.json:abc123');
    });

    it('should handle etag with quotes', () => {
      const metadataWithQuotes = new ResourceMetadata({
        size: 1024,
        lastModified: new Date(),
        etag: '"xyz789"',
      });
      const resourceWithQuotes = new OpenDataResource(
        resourceId,
        dataPath,
        metadataWithQuotes,
        new Date(),
      );

      const cacheKey = resourceWithQuotes.getCacheKey();
      expect(cacheKey).toBe('secure/319985/r5.json:xyz789');
    });
  });

  describe('isCacheValid', () => {
    it('should return true if cache is within duration', () => {
      const now = new Date('2025-01-23T10:05:00Z');
      const cacheDurationSeconds = 600; // 10 minutes

      expect(resource.isCacheValid(now, cacheDurationSeconds)).toBe(true);
    });

    it('should return false if cache is expired', () => {
      const now = new Date('2025-01-23T10:11:00Z');
      const cacheDurationSeconds = 600; // 10 minutes

      expect(resource.isCacheValid(now, cacheDurationSeconds)).toBe(false);
    });

    it('should handle exact expiration boundary', () => {
      const now = new Date('2025-01-23T10:10:00Z');
      const cacheDurationSeconds = 600; // 10 minutes

      expect(resource.isCacheValid(now, cacheDurationSeconds)).toBe(false);
    });
  });

  describe('matchesEtag', () => {
    it('should return true for matching etag', () => {
      expect(resource.matchesEtag('"abc123"')).toBe(true);
    });

    it('should return false for non-matching etag', () => {
      expect(resource.matchesEtag('"xyz789"')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(resource.matchesEtag('"ABC123"')).toBe(false);
    });
  });

  describe('isModifiedSince', () => {
    it('should return true if modified after given date', () => {
      const since = new Date('2025-01-23T09:00:00Z');
      expect(resource.isModifiedSince(since)).toBe(true);
    });

    it('should return false if not modified after given date', () => {
      const since = new Date('2025-01-23T11:00:00Z');
      expect(resource.isModifiedSince(since)).toBe(false);
    });

    it('should return false if modified at exact same time', () => {
      const since = new Date('2025-01-23T10:00:00Z');
      expect(resource.isModifiedSince(since)).toBe(false);
    });
  });

  describe('canAccessByTier', () => {
    it('should allow access for any tier (current implementation)', () => {
      expect(resource.canAccessByTier('tier1')).toBe(true);
      expect(resource.canAccessByTier('tier2')).toBe(true);
      expect(resource.canAccessByTier('tier3')).toBe(true);
      expect(resource.canAccessByTier('admin')).toBe(true);
    });
  });

  describe('getHumanReadableSize', () => {
    it('should format bytes correctly', () => {
      const smallResource = new OpenDataResource(
        resourceId,
        dataPath,
        new ResourceMetadata({ size: 512, lastModified: new Date(), etag: '"test"' }),
        new Date(),
      );
      expect(smallResource.getHumanReadableSize()).toBe('512.00 B');
    });

    it('should format kilobytes correctly', () => {
      expect(resource.getHumanReadableSize()).toBe('10.00 KB');
    });

    it('should format megabytes correctly', () => {
      const largeResource = new OpenDataResource(
        resourceId,
        dataPath,
        new ResourceMetadata({ size: 1024 * 1024 * 5.5, lastModified: new Date(), etag: '"test"' }),
        new Date(),
      );
      expect(largeResource.getHumanReadableSize()).toBe('5.50 MB');
    });

    it('should format gigabytes correctly', () => {
      const hugeResource = new OpenDataResource(
        resourceId,
        dataPath,
        new ResourceMetadata({
          size: 1024 * 1024 * 1024 * 2.3,
          lastModified: new Date(),
          etag: '"test"',
        }),
        new Date(),
      );
      expect(hugeResource.getHumanReadableSize()).toBe('2.30 GB');
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata', () => {
      const newMetadata = new ResourceMetadata({
        size: 2048,
        lastModified: new Date('2025-01-23T12:00:00Z'),
        etag: '"def456"',
        contentType: 'application/json',
      });

      resource.updateMetadata(newMetadata);

      expect(resource.metadata).toBe(newMetadata);
      expect(resource.metadata.size).toBe(2048);
      expect(resource.metadata.etag).toBe('"def456"');
    });
  });

  describe('entity properties', () => {
    it('should be an entity with proper id', () => {
      expect(resource.id).toBe(resourceId);
      expect(resource.equals(resource)).toBe(true);

      const anotherResource = new OpenDataResource(
        ResourceId.generate(),
        dataPath,
        metadata,
        new Date(),
      );
      expect(resource.equals(anotherResource)).toBe(false);
    });
  });
});
