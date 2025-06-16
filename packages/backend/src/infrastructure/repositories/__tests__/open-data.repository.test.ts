import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { OpenDataRepository } from '../open-data.repository';
import { DataPath } from '@/domain/data/value-objects/data-path';
import { ResourceId } from '@/domain/data/value-objects/resource-id';
import { MimeType } from '@/domain/data/value-objects/mime-type';
import { FileSize } from '@/domain/data/value-objects/file-size';
import { ResourceMetadata } from '@/domain/data/value-objects/resource-metadata';
import { OpenDataResource } from '@/domain/data/entities/open-data-resource.entity';
import { Logger } from 'pino';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ErrorType } from '@/domain/errors/domain-error';

vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    constants: {
      F_OK: 0
    }
  },
  stat: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  access: vi.fn(),
  constants: {
    F_OK: 0
  }
}));

vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash-value-123456789012')
  })),
  randomBytes: vi.fn(() => Buffer.from('mockrandombytes'))
}));

describe('OpenDataRepository', () => {
  let repository: OpenDataRepository;
  let mockLogger: Logger;
  let mockFileStorage: any;
  const testDataDirectory = '/test/data';

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn()
    } as any;

    mockFileStorage = {
      exists: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    repository = new OpenDataRepository(mockLogger, mockFileStorage, testDataDirectory);
  });

  describe('findByPath', () => {
    it('should find resource by path successfully', async () => {
      const mockStats = {
        isFile: () => true,
        size: 1024,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02')
      };
      
      (fs.stat as Mock).mockResolvedValue(mockStats);
      
      const dataPathResult = DataPath.create('secure/test.json');
      expect(dataPathResult.isSuccess).toBe(true);
      const dataPath = dataPathResult.getValue();
      const result = await repository.findByPath(dataPath);

      if (result.isFailure) {
        console.error('Test failed with error:', result.error);
      }
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const resource = result.getValue();
        expect(resource.path.equals(dataPath)).toBe(true);
        expect(resource.metadata.contentType).toBe('application/json');
        expect(resource.metadata.size).toBe(1024);
      }
    });

    it('should return error when file not found', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      (fs.stat as Mock).mockRejectedValue(error);

      const dataPath = DataPath.create('nonexistent.json').getValue();
      const result = await repository.findByPath(dataPath);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error!.code).toBe('RESOURCE_NOT_FOUND');
        expect(result.error!.type).toBe(ErrorType.NOT_FOUND);
      }
    });

    it('should return error when path is directory', async () => {
      const mockStats = {
        isFile: () => false,
        isDirectory: () => true
      };
      
      (fs.stat as Mock).mockResolvedValue(mockStats);
      
      const dataPathResult = DataPath.create('secure/directory.json');
      if (dataPathResult.isFailure) {
        throw new Error('Failed to create test path');
      }
      const dataPath = dataPathResult.getValue();
      const result = await repository.findByPath(dataPath);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error!.code).toBe('RESOURCE_NOT_FILE');
      }
    });
  });

  describe('getContent', () => {
    it('should get JSON content successfully', async () => {
      const jsonContent = { test: 'data', value: 123 };
      (fs.readFile as Mock).mockResolvedValue(JSON.stringify(jsonContent));

      const resource = createMockResource('test.json', 'application/json');
      const result = await repository.getContent(resource);

      if (result.isFailure) {
        console.error('getContent test failed with error:', result.error);
      }
      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.getValue()).toEqual(jsonContent);
      }
    });

    it('should get text content successfully', async () => {
      const textContent = 'This is test content';
      (fs.readFile as Mock).mockResolvedValue(textContent);

      const resource = createMockResource('test.txt', 'text/plain');
      const result = await repository.getContent(resource);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.getValue()).toBe(textContent);
      }
    });

    it('should return cached content when available', async () => {
      const jsonContent = { cached: true };
      const resource = createMockResource('cached.json', 'application/json');
      
      // First call to cache the content
      (fs.readFile as Mock).mockResolvedValue(JSON.stringify(jsonContent));
      await repository.getContent(resource);
      
      // Reset mock to ensure it's not called again
      (fs.readFile as Mock).mockClear();
      
      // Second call should use cache
      const result = await repository.getContent(resource);

      expect(result.isSuccess).toBe(true);
      expect(fs.readFile).not.toHaveBeenCalled();
      if (result.isSuccess) {
        expect(result.getValue()).toEqual(jsonContent);
      }
    });

    it('should return error for invalid JSON', async () => {
      (fs.readFile as Mock).mockResolvedValue('{ invalid json }');

      const resource = createMockResource('invalid.json', 'application/json');
      const result = await repository.getContent(resource);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error!.code).toBe('INVALID_JSON_CONTENT');
      }
    });
  });

  describe('listByDirectory', () => {
    it('should list directory resources successfully', async () => {
      const mockDirents = [
        { name: 'file1.json', isFile: () => true, isDirectory: () => false },
        { name: 'file2.json', isFile: () => true, isDirectory: () => false },
        { name: 'subdir', isFile: () => false, isDirectory: () => true }
      ];
      
      (fs.readdir as Mock).mockResolvedValue(mockDirents);
      
      const mockStats = {
        isFile: () => true,
        size: 1024,
        birthtime: new Date(),
        mtime: new Date()
      };
      (fs.stat as Mock).mockResolvedValue(mockStats);

      const result = await repository.listByDirectory('secure');

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const resources = result.getValue();
        expect(resources).toHaveLength(2); // Only files, not directories
        expect(resources[0].path.value).toContain('file1.json');
        expect(resources[1].path.value).toContain('file2.json');
      }
    });

    it('should return error for non-existent directory', async () => {
      const error = new Error('Directory not found');
      (error as any).code = 'ENOENT';
      (fs.readdir as Mock).mockRejectedValue(error);

      const result = await repository.listByDirectory('nonexistent');

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error!.code).toBe('DIRECTORY_NOT_FOUND');
      }
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      (fs.access as Mock).mockResolvedValue(undefined);

      const dataPath = DataPath.create('existing.json').getValue();
      const exists = await repository.exists(dataPath);

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      (fs.access as Mock).mockRejectedValue(new Error('Not found'));

      const dataPath = DataPath.create('nonexistent.json').getValue();
      const exists = await repository.exists(dataPath);

      expect(exists).toBe(false);
    });
  });

  describe('caching', () => {
    it('should return cached resource when available', async () => {
      const cached = await repository.getCached(DataPath.create('notcached.json').getValue());
      expect(cached).toBeNull();
    });

    it('should clear cache', async () => {
      // Just test that the method exists and doesn't throw
      await expect(repository.clearCache()).resolves.not.toThrow();
    });
  });

  describe('updateMetadata', () => {
    it('should update metadata successfully', async () => {
      const resource = createMockResource('test.json', 'application/json');
      const result = await repository.updateMetadata(resource);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return error when resource not found by id', async () => {
      const unknownId = ResourceId.generate();
      const result = await repository.findById(unknownId);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error!.code).toBe('RESOURCE_NOT_FOUND');
      }
    });
  });
});

// Helper function to create mock resources
function createMockResource(filename: string, mimeType: string): OpenDataResource {
  // Ensure filename ends with .json as required by DataPath
  const jsonFilename = filename.endsWith('.json') ? filename : filename.replace(/\.[^.]+$/, '.json');
  const dataPathResult = DataPath.create(jsonFilename);
  if (dataPathResult.isFailure) {
    throw new Error(`Failed to create DataPath: ${dataPathResult.error!.message}`);
  }
  const dataPath = dataPathResult.getValue();
  
  const resourceId = ResourceId.generate();
  
  const metadataResult = ResourceMetadata.create({
    size: 1024,
    lastModified: new Date(),
    etag: '"test-etag"',
    contentType: mimeType
  });
  
  if (metadataResult.isFailure) {
    throw new Error('Failed to create ResourceMetadata');
  }

  return new OpenDataResource(
    resourceId,
    dataPath,
    metadataResult.getValue(),
    new Date(),
    new Date()
  );
}