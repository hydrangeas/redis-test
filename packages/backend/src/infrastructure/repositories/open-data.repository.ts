import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

import { injectable, inject } from 'tsyringe';

import { OpenDataResource } from '@/domain/data/entities/open-data-resource.entity';
import { IOpenDataRepository } from '@/domain/data/interfaces/open-data-repository.interface';
import { DataPath } from '@/domain/data/value-objects/data-path';
import { FileSize } from '@/domain/data/value-objects/file-size';
import { MimeType } from '@/domain/data/value-objects/mime-type';
import { ResourceId } from '@/domain/data/value-objects/resource-id';
import { ResourceMetadata } from '@/domain/data/value-objects/resource-metadata';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';

import { DI_TOKENS } from '../di/tokens';

import type { Logger } from 'pino';


interface CacheEntry {
  resource: OpenDataResource;
  content: unknown;
  cachedAt: Date;
}

@injectable()
export class OpenDataRepository implements IOpenDataRepository {
  private cacheStore: Map<string, CacheEntry> = new Map();
  private readonly cacheExpirationMs = 300000; // 5分

  constructor(
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
    @inject(DI_TOKENS.DataDirectory)
    private readonly dataDirectory: string,
  ) {}

  /**
   * パスからデータリソースを検索
   */
  async findByPath(dataPath: DataPath): Promise<Result<OpenDataResource>> {
    try {
      const filePath = this.getFilePath(dataPath);

      try {
        const stats = await fs.stat(filePath);

        if (!stats.isFile()) {
          return Result.fail(
            new DomainError(
              'RESOURCE_NOT_FILE',
              `Resource at ${dataPath.value} is not a file`,
              ErrorType.NOT_FOUND,
            ),
          );
        }

        const mimeTypeResult = this.detectMimeType(dataPath.value);
        if (mimeTypeResult.isFailure) {
          return Result.fail(mimeTypeResult.getError());
        }

        const resourceId = this.generateResourceId(dataPath.value);

        try {
          new FileSize(stats.size); // Validate file size
        } catch (error) {
          return Result.fail(
            new DomainError(
              'INVALID_FILE_SIZE',
              error instanceof Error ? error.message : 'Invalid file size',
              ErrorType.VALIDATION,
            ),
          );
        }

        const metadataResult = ResourceMetadata.create({
          size: stats.size,
          lastModified: stats.mtime,
          etag: await this.generateETag(filePath),
          contentType: mimeTypeResult.getValue().value,
        });

        if (metadataResult.isFailure) {
          return Result.fail(metadataResult.getError());
        }

        const resource = new OpenDataResource(
          resourceId,
          dataPath,
          metadataResult.getValue(),
          stats.birthtime,
          new Date(),
        );

        this.logger.info({ path: dataPath.value, id: resourceId.value }, 'Resource found by path');

        return Result.ok(resource);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return Result.fail(
            new DomainError(
              'RESOURCE_NOT_FOUND',
              `Resource not found at path: ${dataPath.value}`,
              ErrorType.NOT_FOUND,
            ),
          );
        }
        throw error;
      }
    } catch (error) {
      this.logger.error({ error, path: dataPath.value }, 'Failed to find resource by path');

      return Result.fail(
        new DomainError('REPOSITORY_ERROR', 'Failed to find resource', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * IDからデータリソースを検索
   */
  findById(id: ResourceId): Result<OpenDataResource> {
    try {
      // IDからパスを逆引き（簡易実装）
      // 実際の実装では、IDとパスのマッピングを別途管理する必要がある
      const cachedEntry = Array.from(this.cacheStore.values()).find((entry) =>
        entry.resource.id.equals(id),
      );

      if (cachedEntry) {
        return Result.ok(cachedEntry.resource);
      }

      return Result.fail(
        new DomainError(
          'RESOURCE_NOT_FOUND',
          `Resource not found with id: ${id.value}`,
          ErrorType.NOT_FOUND,
        ),
      );
    } catch (error) {
      this.logger.error({ error, id: id.value }, 'Failed to find resource by id');

      return Result.fail(
        new DomainError('REPOSITORY_ERROR', 'Failed to find resource', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * データリソースのコンテンツを取得
   */
  async getContent(resource: OpenDataResource): Promise<Result<unknown>> {
    try {
      const filePath = this.getFilePath(resource.path);

      // キャッシュチェック
      const cachedContent = this.getCachedContent(resource.path);
      if (cachedContent) {
        this.logger.debug({ path: resource.path.value }, 'Returning cached content');
        return Result.ok(cachedContent);
      }

      const content = await fs.readFile(filePath, 'utf-8');

      // JSONファイルの場合はパース
      if (resource.metadata.contentType === 'application/json') {
        try {
          const jsonContent = JSON.parse(content) as unknown;
          this.cache(resource, jsonContent);
          return Result.ok(jsonContent);
        } catch (parseError) {
          return Result.fail(
            new DomainError(
              'INVALID_JSON_CONTENT',
              'Failed to parse JSON content',
              ErrorType.VALIDATION,
              { error: parseError instanceof Error ? parseError.message : 'Parse error' },
            ),
          );
        }
      }

      this.cache(resource, content);
      return Result.ok(content);
    } catch (error) {
      this.logger.error({ error, path: resource.path.value }, 'Failed to get resource content');

      return Result.fail(
        new DomainError(
          'CONTENT_READ_ERROR',
          'Failed to read resource content',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' },
        ),
      );
    }
  }

  /**
   * ディレクトリ内のリソースをリスト
   */
  async listByDirectory(directoryPath: string): Promise<Result<OpenDataResource[]>> {
    try {
      const fullPath = path.join(this.dataDirectory, directoryPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      const resources: OpenDataResource[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const relativePath = path.join(directoryPath, entry.name);
          const dataPathResult = DataPath.create(relativePath);

          if (dataPathResult.isFailure) {
            continue; // Skip invalid paths
          }

          const resourceResult = await this.findByPath(dataPathResult.getValue());
          if (resourceResult.isSuccess) {
            resources.push(resourceResult.getValue());
          }
        }
      }

      this.logger.info(
        { directory: directoryPath, count: resources.length },
        'Listed directory resources',
      );

      return Result.ok(resources);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return Result.fail(
          new DomainError(
            'DIRECTORY_NOT_FOUND',
            `Directory not found: ${directoryPath}`,
            ErrorType.NOT_FOUND,
          ),
        );
      }

      this.logger.error({ error, directory: directoryPath }, 'Failed to list directory');

      return Result.fail(
        new DomainError('DIRECTORY_LIST_ERROR', 'Failed to list directory', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * リソースの存在確認
   */
  async exists(dataPath: DataPath): Promise<boolean> {
    try {
      const filePath = this.getFilePath(dataPath);
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * リソースのメタデータを更新
   */
  updateMetadata(resource: OpenDataResource): Result<void> {
    try {
      // ファイルシステムベースの実装では、メタデータは自動的に更新される
      // この実装では、キャッシュの更新のみ行う
      const cacheKey = this.getCacheKey(resource.path);
      const cachedEntry = this.cacheStore.get(cacheKey);

      if (cachedEntry) {
        cachedEntry.resource = resource;
        this.logger.debug({ path: resource.path.value }, 'Updated cached resource metadata');
      }

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error({ error, path: resource.path.value }, 'Failed to update metadata');

      return Result.fail(
        new DomainError('METADATA_UPDATE_ERROR', 'Failed to update metadata', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * キャッシュされたリソースを取得
   */
  getCached(dataPath: DataPath): OpenDataResource | null {
    const cacheKey = this.getCacheKey(dataPath);
    const cached = this.cacheStore.get(cacheKey);

    if (!cached) {
      return null;
    }

    // キャッシュ有効期限チェック
    const now = new Date();
    const expirationTime = new Date(cached.cachedAt.getTime() + this.cacheExpirationMs);

    if (now > expirationTime) {
      this.cacheStore.delete(cacheKey);
      return null;
    }

    return cached.resource;
  }

  /**
   * リソースをキャッシュに保存
   */
  cache(resource: OpenDataResource, content: unknown): void {
    const cacheKey = this.getCacheKey(resource.path);

    this.cacheStore.set(cacheKey, {
      resource,
      content,
      cachedAt: new Date(),
    });

    this.logger.debug({ path: resource.path.value }, 'Cached resource');

    // キャッシュサイズ制限（100エントリ）
    if (this.cacheStore.size > 100) {
      const oldestKey = Array.from(this.cacheStore.entries()).sort(
        (a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime(),
      )[0][0];
      this.cacheStore.delete(oldestKey);
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(dataPath?: DataPath): void {
    if (dataPath) {
      const cacheKey = this.getCacheKey(dataPath);
      this.cacheStore.delete(cacheKey);
      this.logger.debug({ path: dataPath.value }, 'Cleared cache for path');
    } else {
      this.cacheStore.clear();
      this.logger.info('Cleared all cache');
    }
  }

  /**
   * プライベートメソッド
   */
  private getFilePath(dataPath: DataPath): string {
    return path.join(this.dataDirectory, dataPath.value);
  }

  private getCacheKey(dataPath: DataPath): string {
    return dataPath.value;
  }

  private getCachedContent(dataPath: DataPath): unknown {
    const cacheKey = this.getCacheKey(dataPath);
    const cached = this.cacheStore.get(cacheKey);

    if (!cached) {
      return null;
    }

    // キャッシュ有効期限チェック
    const now = new Date();
    const expirationTime = new Date(cached.cachedAt.getTime() + this.cacheExpirationMs);

    if (now > expirationTime) {
      this.cacheStore.delete(cacheKey);
      return null;
    }

    return cached.content;
  }

  private detectMimeType(filePath: string): Result<MimeType> {
    try {
      const extension = path.extname(filePath).toLowerCase();

      const mimeMap: Record<string, string> = {
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.csv': 'text/csv',
        '.txt': 'text/plain',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
        '.pdf': 'application/pdf',
      };

      const mimeTypeString = mimeMap[extension] || 'application/octet-stream';
      const mimeType = new MimeType(mimeTypeString);
      return Result.ok(mimeType);
    } catch (error) {
      return Result.fail(
        new DomainError('INVALID_MIME_TYPE', 'Failed to detect MIME type', ErrorType.VALIDATION, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  private generateResourceId(filePath: string): ResourceId {
    // パスベースの一意なIDを生成
    return ResourceId.fromPath(filePath);
  }

  private async generateETag(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const hash = createHash('md5').update(`${stats.size}-${stats.mtime.getTime()}`).digest('hex');
      return `"${hash}"`;
    } catch {
      return `"${Date.now()}"`;
    }
  }
}
