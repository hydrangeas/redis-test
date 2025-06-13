import { describe, it, expect, beforeEach } from 'vitest';
import { DataAggregate } from '../data.aggregate';
import { OpenDataResource } from '../../entities/open-data-resource.entity';
import { ResourceId } from '../../value-objects/resource-id';
import { DataPath } from '../../value-objects/data-path';
import { ResourceMetadata } from '../../value-objects/resource-metadata';

// Helper function to create DataPath
const createDataPath = (path: string): DataPath => {
  const result = DataPath.create(path);
  if (result.isFailure) throw new Error(`Failed to create path: ${path}`);
  return result.getValue();
};

describe('DataAggregate', () => {
  let aggregate: DataAggregate;
  let testResource: OpenDataResource;

  beforeEach(() => {
    const aggregateResult = DataAggregate.create();
    aggregate = aggregateResult.getValue();

    const metadata = new ResourceMetadata({
      size: 1024,
      contentType: 'application/json',
      etag: '"abc123"',
      lastModified: new Date('2025-01-01'),
    });

    testResource = new OpenDataResource(
      ResourceId.generate(),
      createDataPath('/test/data.json'),
      metadata,
      new Date()
    );
  });

  describe('create', () => {
    it('should create DataAggregate with default settings', () => {
      const result = DataAggregate.create();

      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue();
      expect(aggregate.resources.size).toBe(0);
      expect(aggregate.cacheSettings.defaultCacheDurationSeconds).toBe(3600);
      expect(aggregate.cacheSettings.maxCachedResources).toBe(1000);
    });

    it('should create DataAggregate with custom settings', () => {
      const customSettings = {
        cacheSettings: {
          defaultCacheDurationSeconds: 7200,
          maxCachedResources: 500,
        },
      };

      const result = DataAggregate.create(customSettings);

      expect(result.isSuccess).toBe(true);
      const aggregate = result.getValue();
      expect(aggregate.cacheSettings.defaultCacheDurationSeconds).toBe(7200);
      expect(aggregate.cacheSettings.maxCachedResources).toBe(500);
    });
  });

  describe('addResource', () => {
    it('should add resource successfully', () => {
      const result = aggregate.addResource(testResource);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.resources.size).toBe(1);
      expect(aggregate.resources.get(testResource.id.value)).toBe(testResource);
    });

    it('should fail to add duplicate resource', () => {
      aggregate.addResource(testResource);
      const result = aggregate.addResource(testResource);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('RESOURCE_ALREADY_EXISTS');
    });

    it('should fail to add resource with duplicate path', () => {
      aggregate.addResource(testResource);

      const duplicateResource = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/test/data.json'),
        testResource.metadata,
        new Date()
      );

      const result = aggregate.addResource(duplicateResource);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('DUPLICATE_RESOURCE_PATH');
    });

    it('should remove oldest resource when cache limit is reached', () => {
      // Create aggregate with small cache limit
      const smallCacheAggregate = DataAggregate.create({
        cacheSettings: {
          defaultCacheDurationSeconds: 3600,
          maxCachedResources: 2,
        },
      }).getValue();

      const resource1 = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/test/data1.json'),
        testResource.metadata,
        new Date('2025-01-01')
      );

      const resource2 = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/test/data2.json'),
        testResource.metadata,
        new Date('2025-01-02')
      );

      const resource3 = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/test/data3.json'),
        testResource.metadata,
        new Date('2025-01-03')
      );

      smallCacheAggregate.addResource(resource1);
      smallCacheAggregate.addResource(resource2);
      
      expect(smallCacheAggregate.resources.size).toBe(2);
      
      smallCacheAggregate.addResource(resource3);
      
      expect(smallCacheAggregate.resources.size).toBe(2);
      expect(smallCacheAggregate.resources.has(resource1.id.value)).toBe(false);
      expect(smallCacheAggregate.resources.has(resource3.id.value)).toBe(true);
    });
  });

  describe('removeResource', () => {
    it('should remove resource successfully', () => {
      aggregate.addResource(testResource);
      const result = aggregate.removeResource(testResource.id);

      expect(result.isSuccess).toBe(true);
      expect(aggregate.resources.size).toBe(0);
    });

    it('should fail to remove non-existent resource', () => {
      const nonExistentId = ResourceId.generate();
      const result = aggregate.removeResource(nonExistentId);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('getResource', () => {
    it('should get resource successfully', () => {
      aggregate.addResource(testResource);
      const result = aggregate.getResource(testResource.id);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(testResource);
    });

    it('should fail to get non-existent resource', () => {
      const nonExistentId = ResourceId.generate();
      const result = aggregate.getResource(nonExistentId);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('findResourceByPath', () => {
    it('should find resource by path', () => {
      aggregate.addResource(testResource);
      const result = aggregate.findResourceByPath(createDataPath('/test/data.json'));

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(testResource);
    });

    it('should fail to find non-existent resource', () => {
      const result = aggregate.findResourceByPath(createDataPath('/nonexistent/data.json'));

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('processDataAccess', () => {
    beforeEach(() => {
      aggregate.addResource(testResource);
    });

    it('should process data access successfully', async () => {
      const result = await aggregate.processDataAccess(
        'user-123',
        createDataPath('/test/data.json'),
        'TIER1'
      );

      expect(result.isSuccess).toBe(true);
      const accessResult = result.getValue();
      expect(accessResult.resource).toBe(testResource);
      expect(accessResult.cacheKey).toBeDefined();

      // Should emit DataAccessRequested event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('DataAccessRequested');
    });

    it('should fail for non-existent resource', async () => {
      const result = await aggregate.processDataAccess(
        'user-123',
        createDataPath('/nonexistent/data.json'),
        'TIER1'
      );

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('RESOURCE_NOT_FOUND');

      // Should emit DataResourceNotFound event
      expect(aggregate.domainEvents.length).toBe(1);
      expect(aggregate.domainEvents[0].getEventName()).toBe('DataResourceNotFound');
    });

    it('should record access on resource', async () => {
      const beforeAccess = testResource.accessedAt;
      
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      
      await aggregate.processDataAccess(
        'user-123',
        createDataPath('/test/data.json'),
        'TIER1'
      );

      expect(testResource.accessedAt.getTime()).toBeGreaterThan(beforeAccess.getTime());
    });
  });

  describe('processConditionalRequest', () => {
    beforeEach(() => {
      aggregate.addResource(testResource);
    });

    it('should return false for matching etag', () => {
      const result = aggregate.processConditionalRequest(
        createDataPath('/test/data.json'),
        '"abc123"'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().shouldSendResource).toBe(false);
    });

    it('should return true for non-matching etag', () => {
      const result = aggregate.processConditionalRequest(
        createDataPath('/test/data.json'),
        '"different-etag"'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().shouldSendResource).toBe(true);
    });

    it('should return false for unmodified resource', () => {
      const result = aggregate.processConditionalRequest(
        createDataPath('/test/data.json'),
        undefined,
        new Date('2025-01-02')
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().shouldSendResource).toBe(false);
    });

    it('should return true for modified resource', () => {
      const result = aggregate.processConditionalRequest(
        createDataPath('/test/data.json'),
        undefined,
        new Date('2024-12-31')
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().shouldSendResource).toBe(true);
    });
  });

  describe('cleanupCache', () => {
    it('should cleanup old resources', async () => {
      const oldResource = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/old/data.json'),
        testResource.metadata,
        new Date('2025-01-01')
      );

      const newResource = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/new/data.json'),
        testResource.metadata,
        new Date()
      );

      aggregate.addResource(oldResource);
      aggregate.addResource(newResource);

      // Access new resource to update accessedAt
      newResource.recordAccess();

      const result = aggregate.cleanupCache(0); // 0 seconds retention

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(1);
      expect(aggregate.resources.size).toBe(1);
      expect(aggregate.resources.has(newResource.id.value)).toBe(true);
    });
  });

  describe('getResourceStatistics', () => {
    it('should calculate resource statistics', () => {
      const resource1 = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/test/data1.json'),
        new ResourceMetadata({
          size: 1024,
          contentType: 'application/json',
          etag: '"etag1"',
          lastModified: new Date(),
        }),
        new Date()
      );

      const resource2 = new OpenDataResource(
        ResourceId.generate(),
        createDataPath('/test/data2.json'),
        new ResourceMetadata({
          size: 2048,
          contentType: 'application/json',
          etag: '"etag2"',
          lastModified: new Date(),
        }),
        new Date()
      );

      aggregate.addResource(resource1);
      aggregate.addResource(resource2);

      const stats = aggregate.getResourceStatistics();

      expect(stats.totalResources).toBe(2);
      expect(stats.totalSize).toBe(3072);
      expect(stats.averageSize).toBe(1536);
      expect(stats.mimeTypeDistribution.get('application/json')).toBe(2);
    });

    it('should handle empty resources', () => {
      const stats = aggregate.getResourceStatistics();

      expect(stats.totalResources).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
      expect(stats.mimeTypeDistribution.size).toBe(0);
    });
  });

  describe('updateResourceMetadata', () => {
    it('should update resource metadata', () => {
      aggregate.addResource(testResource);
      
      const newMetadata = new ResourceMetadata({
        size: 2048,
        contentType: 'application/json',
        etag: '"new-etag"',
        lastModified: new Date(),
      });

      const result = aggregate.updateResourceMetadata(testResource.id, newMetadata);

      expect(result.isSuccess).toBe(true);
      expect(testResource.metadata).toBe(newMetadata);
    });

    it('should fail for non-existent resource', () => {
      const nonExistentId = ResourceId.generate();
      const newMetadata = new ResourceMetadata({
        size: 2048,
        contentType: 'application/json',
        etag: '"new-etag"',
        lastModified: new Date(),
      });

      const result = aggregate.updateResourceMetadata(nonExistentId, newMetadata);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute aggregate from existing data', () => {
      const resources = new Map([
        [testResource.id.value, testResource],
      ]);
      const cacheSettings = {
        defaultCacheDurationSeconds: 7200,
        maxCachedResources: 500,
      };

      const aggregate = DataAggregate.reconstitute(
        { resources, cacheSettings },
        'aggregate-id'
      );

      expect(aggregate.resources).toBe(resources);
      expect(aggregate.cacheSettings).toBe(cacheSettings);
    });
  });
});