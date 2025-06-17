import * as crypto from 'crypto';
import { constants as fsConstants , createReadStream } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

import { watch, FSWatcher } from 'chokidar';
import { LRUCache } from 'lru-cache';
import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { IFileStorage, FileMetadata } from '@/domain/data/interfaces/file-storage.interface';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';
import { DI_TOKENS } from '@/infrastructure/di/tokens';



interface CacheEntry {
  content: unknown;
  metadata: FileMetadata;
  compressed?: Buffer;
}

@injectable()
export class FileStorageService implements IFileStorage {
  private readonly dataDirectory: string;
  private readonly cache: LRUCache<string, CacheEntry>;
  private watcher?: FSWatcher;

  constructor(
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
    @inject(DI_TOKENS.DataDirectory)
    dataDirectory: string,
  ) {
    this.dataDirectory = path.resolve(dataDirectory);

    // LRU cache configuration
    this.cache = new LRUCache<string, CacheEntry>({
      max: 100, // Maximum 100 files
      maxSize: 100 * 1024 * 1024, // Maximum 100MB
      sizeCalculation: (entry) => {
        return JSON.stringify(entry.content).length + (entry.compressed?.length || 0);
      },
      ttl: 1000 * 60 * 60, // 1 hour
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    this.initializeWatcher();
  }

  async readFile(filePath: string): Promise<Result<unknown>> {
    try {
      // Path validation
      const validationResult = await this.validatePath(filePath);
      if (validationResult.isFailure) {
        return Result.fail(validationResult.getError());
      }

      const absolutePath = path.join(this.dataDirectory, filePath);

      // Cache check
      const cached = this.cache.get(absolutePath);
      if (cached) {
        this.logger.debug({ path: filePath }, 'File served from cache');
        return Result.ok(cached.content);
      }

      // Read file from disk
      const fileResult = await this.readFileFromDisk(absolutePath);
      if (fileResult.isFailure) {
        return Result.fail(fileResult.getError());
      }

      const { content, metadata } = fileResult.getValue();

      // Save to cache
      this.cache.set(absolutePath, {
        content,
        metadata,
      });

      return Result.ok(content);
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: filePath,
        },
        'Failed to read file',
      );

      return Result.fail(new DomainError('FILE_READ_ERROR', 'Failed to read file', ErrorType.INTERNAL));
    }
  }

  async getFileMetadata(filePath: string): Promise<Result<FileMetadata>> {
    try {
      const validationResult = await this.validatePath(filePath);
      if (validationResult.isFailure) {
        return Result.fail(validationResult.getError());
      }

      const absolutePath = path.join(this.dataDirectory, filePath);

      // Get metadata from cache
      const cached = this.cache.get(absolutePath);
      if (cached) {
        return Result.ok(cached.metadata);
      }

      // Get file stats
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        return Result.fail(
          new DomainError('NOT_A_FILE', 'Path does not point to a file', ErrorType.NOT_FOUND),
        );
      }

      const metadata: FileMetadata = {
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
        etag: await this.generateETag(absolutePath, stats),
        contentType: this.detectContentType(filePath),
      };

      return Result.ok(metadata);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return Result.fail(
          new DomainError('FILE_NOT_FOUND', `File not found: ${filePath}`, ErrorType.NOT_FOUND),
        );
      }

      return Result.fail(
        new DomainError('METADATA_READ_ERROR', 'Failed to read file metadata', ErrorType.INTERNAL),
      );
    }
  }

  async streamFile(
    filePath: string,
    options?: { start?: number; end?: number },
  ): Promise<Result<NodeJS.ReadableStream>> {
    try {
      const validationResult = await this.validatePath(filePath);
      if (validationResult.isFailure) {
        return Result.fail(validationResult.getError());
      }

      const absolutePath = path.join(this.dataDirectory, filePath);

      // Check file exists and is readable
      await fs.access(absolutePath, fsConstants.R_OK);

      // Create stream
      const stream = createReadStream(absolutePath, {
        start: options?.start,
        end: options?.end,
        highWaterMark: 64 * 1024, // 64KB chunks
      });

      return Result.ok(stream);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return Result.fail(new DomainError('FILE_NOT_FOUND', 'File not found', ErrorType.NOT_FOUND));
      }

      return Result.fail(
        new DomainError('STREAM_ERROR', 'Failed to create file stream', ErrorType.INTERNAL),
      );
    }
  }

  async listFiles(directory: string): Promise<Result<string[]>> {
    try {
      const validationResult = await this.validatePath(directory);
      if (validationResult.isFailure) {
        return Result.fail(validationResult.getError());
      }

      const absolutePath = path.join(this.dataDirectory, directory);

      // Check if directory exists
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        return Result.fail(
          new DomainError('NOT_A_DIRECTORY', 'Path does not point to a directory', ErrorType.NOT_FOUND),
        );
      }

      // Read directory recursively
      const files = await this.readDirectoryRecursive(absolutePath, directory);

      // Filter only JSON files
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      return Result.ok(jsonFiles);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return Result.fail(
          new DomainError('DIRECTORY_NOT_FOUND', `Directory not found: ${directory}`, ErrorType.NOT_FOUND),
        );
      }

      return Result.fail(
        new DomainError('DIRECTORY_READ_ERROR', 'Failed to read directory', ErrorType.INTERNAL),
      );
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const validationResult = await this.validatePath(filePath);
      if (validationResult.isFailure) {
        return false;
      }

      const absolutePath = path.join(this.dataDirectory, filePath);
      await fs.access(absolutePath, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
    this.cache.clear();
  }

  private async validatePath(filePath: string): Promise<Result<void>> {
    // Basic validation
    if (!filePath || filePath.trim().length === 0) {
      return Result.fail(
        new DomainError('INVALID_PATH', 'File path cannot be empty', ErrorType.VALIDATION),
      );
    }

    // Prevent path traversal attacks
    const normalizedPath = path.normalize(filePath);
    const absolutePath = path.resolve(this.dataDirectory, normalizedPath);

    if (!absolutePath.startsWith(this.dataDirectory)) {
      this.logger.warn(
        {
          requestedPath: filePath,
          normalizedPath,
          absolutePath,
          dataDirectory: this.dataDirectory,
        },
        'Path traversal attempt detected',
      );

      return Result.fail(new DomainError('PATH_TRAVERSAL', 'Invalid file path', ErrorType.FORBIDDEN));
    }

    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f\x80-\x9f]/;
    if (dangerousChars.test(filePath)) {
      return Result.fail(
        new DomainError('INVALID_CHARACTERS', 'Path contains invalid characters', ErrorType.VALIDATION),
      );
    }

    return Result.ok(undefined);
  }

  private async readFileFromDisk(
    absolutePath: string,
  ): Promise<Result<{ content: unknown; metadata: FileMetadata }>> {
    try {
      const [content, stats] = await Promise.all([
        fs.readFile(absolutePath, 'utf-8'),
        fs.stat(absolutePath),
      ]);

      // Parse JSON
      let jsonData: unknown;
      try {
        jsonData = JSON.parse(content);
      } catch (error) {
        return Result.fail(
          new DomainError('INVALID_JSON', 'File contains invalid JSON', ErrorType.INTERNAL),
        );
      }

      const metadata: FileMetadata = {
        path: path.relative(this.dataDirectory, absolutePath),
        size: stats.size,
        mtime: stats.mtime,
        etag: await this.generateETag(absolutePath, stats),
        contentType: 'application/json',
      };

      return Result.ok({ content: jsonData, metadata });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return Result.fail(new DomainError('FILE_NOT_FOUND', 'File not found', ErrorType.NOT_FOUND));
      }

      throw error;
    }
  }

  private async readDirectoryRecursive(
    absolutePath: string,
    relativePath: string,
  ): Promise<string[]> {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(absolutePath, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively read subdirectories
        const subFiles = await this.readDirectoryRecursive(fullPath, relPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Normalize path separators for consistency
        files.push(relPath.replace(/\\/g, '/'));
      }
    }

    return files;
  }

  private async generateETag(filePath: string, stats: Awaited<ReturnType<typeof fs.stat>>): Promise<string> {
    const hash = crypto.createHash('md5');
    hash.update(`${filePath}-${stats.size}-${stats.mtime.getTime()}`);
    return `"${hash.digest('hex')}"`;
  }

  private detectContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  private initializeWatcher(): void {
    if (process.env.NODE_ENV === 'production') {
      // Disable file watching in production
      return;
    }

    this.watcher = watch(this.dataDirectory, {
      ignored: /^\./,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('change', (filePath) => {
        const absolutePath = path.resolve(filePath);
        this.cache.delete(absolutePath);
        this.logger.debug({ path: filePath }, 'File changed, cache invalidated');
      })
      .on('unlink', (filePath) => {
        const absolutePath = path.resolve(filePath);
        this.cache.delete(absolutePath);
        this.logger.debug({ path: filePath }, 'File deleted, cache invalidated');
      })
      .on('error', (error) => {
        this.logger.error({ error }, 'File watcher error');
      });
  }
}
