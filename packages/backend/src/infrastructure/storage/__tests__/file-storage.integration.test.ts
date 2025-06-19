import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStorageService } from '../file-storage.service';
import { container } from 'tsyringe';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from 'pino';

describe('FileStorageService Integration', () => {
  let service: FileStorageService;
  let testDataDir: string;
  let mockLogger: Logger;

  beforeEach(async () => {
    container.clearInstances();

    // Create a temporary test directory
    testDataDir = path.join(process.cwd(), 'test-data-' + Date.now());
    await fs.mkdir(testDataDir, { recursive: true });

    mockLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    } as unknown as Logger;

    container.register(DI_TOKENS.Logger, { useValue: mockLogger });
    container.register(DI_TOKENS.DataDirectory, { useValue: testDataDir });

    service = new FileStorageService(mockLogger, testDataDir);
  });

  afterEach(async () => {
    await service.cleanup();
    // Clean up test directory
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  it('should read a JSON file from the file system', async () => {
    // Create test file
    const testData = { test: true, value: 42 };
    const testFile = 'test.json';
    await fs.writeFile(path.join(testDataDir, testFile), JSON.stringify(testData));

    const result = await service.readFile(testFile);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(testData);
  });

  it('should cache files and serve from cache', async () => {
    const testData = { cached: true };
    const testFile = 'cached.json';
    await fs.writeFile(path.join(testDataDir, testFile), JSON.stringify(testData));

    // First read
    await service.readFile(testFile);

    // Delete the file
    await fs.unlink(path.join(testDataDir, testFile));

    // Should still work from cache
    const result = await service.readFile(testFile);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual(testData);
  });

  it('should list files in directory recursively', async () => {
    // Create nested directory structure
    await fs.mkdir(path.join(testDataDir, 'dir1'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'dir1/subdir'), { recursive: true });

    await fs.writeFile(path.join(testDataDir, 'file1.json'), '{}');
    await fs.writeFile(path.join(testDataDir, 'dir1/file2.json'), '{}');
    await fs.writeFile(path.join(testDataDir, 'dir1/subdir/file3.json'), '{}');
    await fs.writeFile(path.join(testDataDir, 'dir1/file.txt'), 'text'); // Should be filtered

    const result = await service.listFiles('.');

    expect(result.isSuccess).toBe(true);
    const files = result.getValue();
    expect(files).toHaveLength(3);
    expect(files).toContain('file1.json');
    expect(files).toContain('dir1/file2.json');
    expect(files).toContain('dir1/subdir/file3.json');
  });

  it('should prevent path traversal attacks', async () => {
    const result = await service.readFile('../../../etc/passwd');

    expect(result.isFailure).toBe(true);
    expect(result.getError().code).toBe('PATH_TRAVERSAL');
  });

  it('should detect file existence', async () => {
    const testFile = 'exists.json';

    expect(await service.exists(testFile)).toBe(false);

    await fs.writeFile(path.join(testDataDir, testFile), JSON.stringify({ exists: true }));

    expect(await service.exists(testFile)).toBe(true);
  });
});
