import { injectable } from 'tsyringe';
import { OpenDataResource } from '../entities/open-data-resource.entity';
import { ResourceId } from '../value-objects/resource-id';
import { DataPath } from '../value-objects/data-path';
import { ResourceMetadata } from '../value-objects/resource-metadata';
import { MimeType } from '../value-objects/mime-type';
import { FileSize } from '../value-objects/file-size';
import { Result } from '@/domain/shared/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';

export interface FileSystemMetadata {
  size: number;
  mimeType: string;
  lastModified: Date;
  etag?: string;
}

/**
 * OpenDataResourceのファクトリクラス
 * ファイルシステムの情報からドメインオブジェクトを生成
 */
@injectable()
export class OpenDataResourceFactory {
  /**
   * ファイルシステムの情報から新規リソースを作成
   */
  createFromFileSystem(
    pathString: string,
    fsMetadata: FileSystemMetadata,
  ): Result<OpenDataResource> {
    try {
      // DataPathの作成
      const pathResult = DataPath.create(pathString);
      if (pathResult.isFailure) {
        return Result.fail(pathResult.getError());
      }
      const dataPath = pathResult.getValue();

      // MimeTypeの作成
      const mimeTypeResult = MimeType.create(fsMetadata.mimeType);
      if (mimeTypeResult.isFailure) {
        return Result.fail(mimeTypeResult.getError());
      }
      const mimeType = mimeTypeResult.getValue();

      // FileSizeの作成
      const fileSizeResult = FileSize.create(fsMetadata.size);
      if (fileSizeResult.isFailure) {
        return Result.fail(fileSizeResult.getError());
      }
      const fileSize = fileSizeResult.getValue();

      // ResourceMetadataの作成（FileMetadataではなく直接ResourceMetadataを作成）

      const resourceMetadata = new ResourceMetadata({
        size: fileSize.value,
        lastModified: fsMetadata.lastModified,
        etag: fsMetadata.etag || this.generateEtag(fsMetadata),
        contentType: mimeType.value,
      });

      // ResourceIdをパスから生成
      const resourceId = ResourceId.fromPath(pathString);

      // OpenDataResourceエンティティの作成
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        resourceMetadata,
        new Date(),
      );

      return Result.ok(resource);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'RESOURCE_CREATION_ERROR',
          'Failed to create OpenDataResource',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' },
        ),
      );
    }
  }

  /**
   * 永続化データから再構築
   */
  reconstruct(data: {
    path: string;
    title: string;
    description: string;
    size: number;
    mimeType: string;
    lastModified: Date;
    etag: string;
    createdAt: Date;
    accessedAt: Date;
  }): Result<OpenDataResource> {
    try {
      // DataPathの作成
      const pathResult = DataPath.create(data.path);
      if (pathResult.isFailure) {
        return Result.fail(pathResult.getError());
      }
      const dataPath = pathResult.getValue();

      // ResourceMetadataの作成
      const resourceMetadata = new ResourceMetadata({
        size: data.size,
        lastModified: data.lastModified,
        etag: data.etag,
        contentType: data.mimeType,
      });

      // ResourceIdをパスから生成
      const resourceId = ResourceId.fromPath(data.path);

      // OpenDataResourceエンティティの作成
      const resource = new OpenDataResource(
        resourceId,
        dataPath,
        resourceMetadata,
        data.createdAt,
        data.accessedAt,
      );

      return Result.ok(resource);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'RESOURCE_RECONSTRUCTION_ERROR',
          'Failed to reconstruct OpenDataResource',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' },
        ),
      );
    }
  }

  /**
   * 複数のファイルシステム情報からリソースを一括作成
   */
  createManyFromFileSystem(
    files: Array<{ path: string; metadata: FileSystemMetadata }>,
  ): Result<OpenDataResource[]> {
    const resources: OpenDataResource[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = this.createFromFileSystem(file.path, file.metadata);
      if (result.isSuccess) {
        resources.push(result.getValue());
      } else {
        errors.push(`${file.path}: ${result.getError().message}`);
      }
    }

    if (errors.length > 0) {
      return Result.fail(
        new DomainError(
          'BATCH_CREATION_ERROR',
          `Failed to create ${errors.length} resources`,
          ErrorType.INTERNAL,
          { errors },
        ),
      );
    }

    return Result.ok(resources);
  }

  /**
   * ETagを生成
   */
  private generateEtag(metadata: FileSystemMetadata): string {
    // 簡易的なETag生成（実際の実装ではより堅牢な方法を使用）
    const data = `${metadata.size}-${metadata.lastModified.getTime()}`;
    return `"${Buffer.from(data).toString('base64')}"`;
  }
}
