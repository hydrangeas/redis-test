import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileStorageService } from '../file-storage.service';
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from 'pino';
import { createReadStream } from 'fs';

vi.mock('fs/promises');
vi.mock('fs', () => ({
  createReadStream: vi.fn(),
  constants: {
    F_OK: 0,
    R_OK: 4,
  },
}));
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}));

vi.mock('lru-cache', () => {
  const store = new Map();
  return {
    LRUCache: vi.fn().mockImplementation(() => ({
      get: vi.fn((key) => store.get(key)),
      set: vi.fn((key, value) => store.set(key, value)),
      delete: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    })),
  };
});

describe('FileStorageService', () => {
  let service: FileStorageService;
  let mockLogger: Logger;
  const testDataDir = '/test/data';

  beforeEach(() => {
    container.clearInstances();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Logger;

    container.register(DI_TOKENS.Logger, { useValue: mockLogger });
    container.register(DI_TOKENS.DataDirectory, { useValue: testDataDir });

    service = container.resolve(FileStorageService);
  });

  afterEach(async () => {
    await service.cleanup();
    vi.clearAllMocks();
  });

  describe('readFile', () => {
    it('should read and parse JSON file successfully', async () => {
      const testData = { key: 'value', numbers: [1, 2, 3] };
      const filePath = 'test/data.json';
      const absolutePath = path.join(testDataDir, filePath);

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(testData));
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => true,
        size: 100,
        mtime: new Date('2024-01-01'),
      } as fs.Stats);

      const result = await service.readFile(filePath);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(testData);
      expect(fs.readFile).toHaveBeenCalledWith(absolutePath, 'utf-8');
    });

    it('should return from cache on second read', async () => {
      const testData = { cached: true };
      const filePath = 'cached.json';

      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(testData));
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => true,
        size: 50,
        mtime: new Date(),
      } as fs.Stats);

      // First read
      await service.readFile(filePath);

      // Second read should use cache
      const result = await service.readFile(filePath);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual(testData);
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only called once
      expect(mockLogger.debug).toHaveBeenCalledWith({ path: filePath }, 'File served from cache');
    });

    it('should fail for empty path', async () => {
      const result = await service.readFile('');

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_PATH');
      expect(result.getError().message).toBe('File path cannot be empty');
    });

    it('should prevent path traversal attacks', async () => {
      const maliciousPath = '../../../etc/passwd';

      const result = await service.readFile(maliciousPath);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('PATH_TRAVERSAL');
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should fail for invalid JSON', async () => {
      const filePath = 'invalid.json';
      const absolutePath = path.join(testDataDir, filePath);

      vi.mocked(fs.readFile).mockResolvedValueOnce('{ invalid json }');
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => true,
        size: 20,
        mtime: new Date(),
      } as fs.Stats);

      const result = await service.readFile(filePath);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('INVALID_JSON');
    });

    it('should fail when file not found', async () => {
      const filePath = 'missing.json';

      vi.mocked(fs.readFile).mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      const result = await service.readFile(filePath);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const filePath = 'data.json';
      const stats = {
        isFile: () => true,
        size: 1024,
        mtime: new Date('2024-01-01'),
      };

      vi.mocked(fs.stat).mockResolvedValueOnce(stats as fs.Stats);

      const result = await service.getFileMetadata(filePath);

      expect(result.isSuccess).toBe(true);
      const metadata = result.getValue();
      expect(metadata.path).toBe(filePath);
      expect(metadata.size).toBe(1024);
      expect(metadata.mtime).toEqual(stats.mtime);
      expect(metadata.etag).toMatch(/^"[a-f0-9]{32}"$/);
      expect(metadata.contentType).toBe('application/json');
    });

    it('should fail for non-file paths', async () => {
      const dirPath = 'directory';

      vi.mocked(fs.stat).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
      } as fs.Stats);

      const result = await service.getFileMetadata(dirPath);

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('NOT_A_FILE');
    });
  });

  describe('streamFile', () => {
    it('should create readable stream', async () => {
      const filePath = 'large.json';
      const mockStream = { pipe: vi.fn() };

      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(createReadStream).mockReturnValueOnce(mockStream as unknown as ReturnType<typeof createReadStream>);

      const result = await service.streamFile(filePath);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBe(mockStream);
      expect(createReadStream).toHaveBeenCalledWith(path.join(testDataDir, filePath), {
        start: undefined,
        end: undefined,
        highWaterMark: 64 * 1024,
      });
    });

    it('should support byte range', async () => {
      const filePath = 'partial.json';
      const mockStream = { pipe: vi.fn() };

      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(createReadStream).mockReturnValueOnce(mockStream as unknown as ReturnType<typeof createReadStream>);

      const result = await service.streamFile(filePath, { start: 100, end: 200 });

      expect(result.isSuccess).toBe(true);
      expect(createReadStream).toHaveBeenCalledWith(path.join(testDataDir, filePath), {
        start: 100,
        end: 200,
        highWaterMark: 64 * 1024,
      });
    });
  });

  describe('listFiles', () => {
    it('should list JSON files recursively', async () => {
      const directory = 'secure';

      vi.mocked(fs.stat).mockResolvedValueOnce({
        isDirectory: () => true,
      } as fs.Stats);

      vi.mocked(fs.readdir)
        .mockResolvedValueOnce([
          { name: 'file1.json', isFile: () => true, isDirectory: () => false },
          { name: 'subdir', isFile: () => false, isDirectory: () => true },
          { name: 'file.txt', isFile: () => true, isDirectory: () => false },
        ] as fs.Dirent[])
        .mockResolvedValueOnce([
          { name: 'file2.json', isFile: () => true, isDirectory: () => false },
        ] as fs.Dirent[]);

      const result = await service.listFiles(directory);

      expect(result.isSuccess).toBe(true);
      const files = result.getValue();
      expect(files).toHaveLength(2);
      expect(files).toContain('secure/file1.json');
      expect(files).toContain('secure/subdir/file2.json');
      expect(files).not.toContain('secure/file.txt'); // Non-JSON filtered out
    });

    it('should fail for non-directory paths', async () => {
      vi.mocked(fs.stat).mockResolvedValueOnce({
        isDirectory: () => false,
        isFile: () => true,
      } as fs.Stats);

      const result = await service.listFiles('file.json');

      expect(result.isFailure).toBe(true);
      expect(result.getError().code).toBe('NOT_A_DIRECTORY');
    });
  });

  describe('exists', () => {
    it('should return true when file exists', async () => {
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);

      const exists = await service.exists('existing.json');

      expect(exists).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

      const exists = await service.exists('missing.json');

      expect(exists).toBe(false);
    });

    it('should return false for invalid paths', async () => {
      const exists = await service.exists('../../../etc/passwd');

      expect(exists).toBe(false);
    });
  });

  describe('path validation', () => {
    it('should reject paths with dangerous characters', async () => {
      const dangerousPaths = [
        'file<script>.json',
        'file>redirect.json',
        'file:protocol.json',
        'file"quote.json',
        'file|pipe.json',
        'file?query.json',
        'file*wildcard.json',
        'file\x00null.json',
      ];

      for (const path of dangerousPaths) {
        const result = await service.readFile(path);
        expect(result.isFailure).toBe(true);
        expect(result.getError().code).toBe('INVALID_CHARACTERS');
      }
    });
  });
});
