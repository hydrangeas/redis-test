import { ValueObject } from '@/domain/shared/value-object';
import { DataPath } from './data-path';
import { ResourceMetadata } from './resource-metadata';
import { ValidationError } from '@/domain/errors/validation-error';
import { Result } from '@/domain/errors/result';

export interface OpenDataResourceProps {
  path: DataPath;
  metadata: ResourceMetadata;
  createdAt: Date;
  accessedAt: Date;
}

/**
 * オープンデータリソースを表現するバリューオブジェクト
 * ファイルシステム上のJSONデータリソースの情報を保持
 * イミュータブルで、状態変更時は新しいインスタンスを返す
 */
export class OpenDataResource extends ValueObject<OpenDataResourceProps> {
  get path(): DataPath {
    return this.props.path;
  }

  get metadata(): ResourceMetadata {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get accessedAt(): Date {
    return this.props.accessedAt;
  }

  /**
   * キャッシュキーを生成
   * パスとETAgを組み合わせて一意のキーを作成
   */
  getCacheKey(): string {
    return `${this.props.path.value}:${this.props.metadata.etag.replace(/"/g, '')}`;
  }

  /**
   * キャッシュが有効かチェック
   * @param now 現在時刻
   * @param cacheDurationSeconds キャッシュ有効期間（秒）
   */
  isCacheValid(now: Date, cacheDurationSeconds: number): boolean {
    const elapsedSeconds = (now.getTime() - this.props.metadata.lastModified.getTime()) / 1000;
    return elapsedSeconds < cacheDurationSeconds;
  }

  /**
   * 条件付きリクエストのETagマッチング
   * @param etag クライアントが送信したETag
   */
  matchesEtag(etag: string): boolean {
    return this.props.metadata.etag === etag;
  }

  /**
   * 条件付きリクエストのLast-Modifiedチェック
   * @param since クライアントが送信したIf-Modified-Since日時
   */
  isModifiedSince(since: Date): boolean {
    return this.props.metadata.lastModified > since;
  }

  /**
   * アクセス権限のチェック（将来の拡張用）
   * @param userTier ユーザーのティア
   */
  canAccessByTier(userTier: string): boolean {
    // 現在はすべての認証済みユーザーがアクセス可能
    // 将来的にリソースレベルのアクセス制御を実装する場合はここに追加
    return true;
  }

  /**
   * リソースのサイズをヒューマンリーダブルな形式で取得
   */
  getHumanReadableSize(): string {
    const size = this.props.metadata.size;
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let displaySize = size;

    while (displaySize >= 1024 && unitIndex < units.length - 1) {
      displaySize /= 1024;
      unitIndex++;
    }

    return `${displaySize.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * アクセスを記録した新しいインスタンスを返す
   */
  withAccessRecorded(accessedAt: Date = new Date()): OpenDataResource {
    return new OpenDataResource({
      ...this.props,
      accessedAt,
    });
  }

  /**
   * メタデータを更新した新しいインスタンスを返す
   */
  withUpdatedMetadata(metadata: ResourceMetadata): OpenDataResource {
    return new OpenDataResource({
      ...this.props,
      metadata,
    });
  }

  /**
   * ファクトリメソッド
   */
  static create(
    path: DataPath,
    metadata: ResourceMetadata,
    createdAt: Date = new Date(),
    accessedAt?: Date,
  ): Result<OpenDataResource> {
    if (!path) {
      return Result.fail(new ValidationError('Path is required'));
    }

    if (!metadata) {
      return Result.fail(new ValidationError('Metadata is required'));
    }

    if (!createdAt) {
      return Result.fail(new ValidationError('CreatedAt is required'));
    }

    const props: OpenDataResourceProps = {
      path,
      metadata,
      createdAt,
      accessedAt: accessedAt || createdAt,
    };

    return Result.ok(new OpenDataResource(props));
  }

  /**
   * 新規作成用のファクトリメソッド
   */
  static createNew(path: DataPath, metadata: ResourceMetadata): Result<OpenDataResource> {
    const now = new Date();
    return OpenDataResource.create(path, metadata, now, now);
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `${this.props.path.value} (${this.getHumanReadableSize()})`;
  }
}
