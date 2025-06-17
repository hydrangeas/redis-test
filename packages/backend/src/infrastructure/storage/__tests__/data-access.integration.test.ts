import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileStorageService } from '../file-storage.service';
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import * as path from 'path';
import { Logger } from 'pino';

// Mock LRUCache for integration tests
vi.mock('lru-cache', () => {
  const store = new Map();
  return {
    LRUCache: vi.fn().mockImplementation(() => ({
      get: vi.fn((key) => store.get(key)),
      set: vi.fn((key, value) => store.set(key, value)),
      delete: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
      has: vi.fn((key) => store.has(key)),
    })),
  };
});

describe('Data Access Integration with FileStorageService', () => {
  let service: FileStorageService;
  let dataDir: string;
  let mockLogger: Logger;

  beforeEach(() => {
    container.clearInstances();

    // Use the actual data directory
    dataDir = path.join(process.cwd(), 'data');

    mockLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    } as unknown as Logger;

    container.register(DI_TOKENS.Logger, { useValue: mockLogger });
    container.register(DI_TOKENS.DataDirectory, { useValue: dataDir });

    service = new FileStorageService(mockLogger, dataDir);
  });

  it('should read population data for 2024', async () => {
    const result = await service.readFile('secure/population/2024.json');

    expect(result.isSuccess).toBe(true);
    const data = result.getValue();

    expect(data).toHaveProperty('year', '2024');
    expect(data).toHaveProperty('prefecture', '奈良県');
    expect(data).toHaveProperty('totalPopulation', 1324473);
    expect(data).toHaveProperty('metadata');
    expect(data.metadata).toHaveProperty('source', '奈良県統計課');
  });

  it('should read budget data', async () => {
    const result = await service.readFile('secure/budget/2024/general.json');

    expect(result.isSuccess).toBe(true);
    const data = result.getValue();

    expect(data).toHaveProperty('fiscalYear', '2024');
    expect(data).toHaveProperty('totalBudget', 548932000000);
    expect(data).toHaveProperty('majorCategories');
    expect(Array.isArray(data.majorCategories)).toBe(true);
  });

  it('should list files in population directory', async () => {
    const result = await service.listFiles('secure/population');

    expect(result.isSuccess).toBe(true);
    const files = result.getValue();

    expect(files).toContain('secure/population/2024.json');
    expect(files).toContain('secure/population/2023.json');
    expect(files).toContain('secure/population/metadata.json');
  });

  it('should return file metadata', async () => {
    const result = await service.getFileMetadata('secure/statistics/education.json');

    expect(result.isSuccess).toBe(true);
    const metadata = result.getValue();

    expect(metadata).toHaveProperty('path', 'secure/statistics/education.json');
    expect(metadata).toHaveProperty('size');
    expect(metadata).toHaveProperty('mtime');
    expect(metadata).toHaveProperty('etag');
    expect(metadata).toHaveProperty('contentType', 'application/json');
  });

  it('should fail for non-existent files', async () => {
    const result = await service.readFile('secure/non-existent.json');

    expect(result.isFailure).toBe(true);
    expect(result.getError().code).toBe('FILE_NOT_FOUND');
  });

  it('should prevent path traversal', async () => {
    const result = await service.readFile('../package.json');

    expect(result.isFailure).toBe(true);
    expect(result.getError().code).toBe('PATH_TRAVERSAL');
  });

  it('should read and validate index.json', async () => {
    const result = await service.readFile('index.json');

    expect(result.isSuccess).toBe(true);
    const index = result.getValue();

    expect(index).toHaveProperty('version', '1.0.0');
    expect(index.categories).toHaveProperty('population');
    expect(index.categories.population).toHaveProperty('requiresAuth', true);
  });
});
