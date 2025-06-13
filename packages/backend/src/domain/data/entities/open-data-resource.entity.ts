import { Entity } from '@/domain/shared/entity';
import { ResourceId } from '../value-objects/resource-id';
import { DataPath } from '../value-objects/data-path';
import { ResourceMetadata } from '../value-objects/resource-metadata';

/**
 * オープンデータリソースエンティティ
 * ファイルシステム上のJSONデータリソースを表現する
 */
export class OpenDataResource extends Entity<ResourceId> {
  private _path: DataPath;
  private _metadata: ResourceMetadata;
  private _createdAt: Date;
  private _accessedAt: Date;

  constructor(
    id: ResourceId,
    path: DataPath,
    metadata: ResourceMetadata,
    createdAt: Date,
    accessedAt?: Date
  ) {
    super(id);
    this._path = path;
    this._metadata = metadata;
    this._createdAt = createdAt;
    this._accessedAt = accessedAt || createdAt;
  }

  /**
   * データパス
   */
  get path(): DataPath {
    return this._path;
  }

  /**
   * リソースメタデータ
   */
  get metadata(): ResourceMetadata {
    return this._metadata;
  }

  /**
   * 作成日時
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * 最終アクセス日時
   */
  get accessedAt(): Date {
    return this._accessedAt;
  }

  /**
   * アクセスを記録
   */
  recordAccess(): void {
    this._accessedAt = new Date();
  }

  /**
   * キャッシュキーを生成
   * パスとETAgを組み合わせて一意のキーを作成
   */
  getCacheKey(): string {
    return `${this._path.value}:${this._metadata.etag.replace(/"/g, '')}`;
  }

  /**
   * キャッシュが有効かチェック
   * @param now 現在時刻
   * @param cacheDurationSeconds キャッシュ有効期間（秒）
   */
  isCacheValid(now: Date, cacheDurationSeconds: number): boolean {
    const elapsedSeconds = (now.getTime() - this._metadata.lastModified.getTime()) / 1000;
    return elapsedSeconds < cacheDurationSeconds;
  }

  /**
   * 条件付きリクエストのETagマッチング
   * @param etag クライアントが送信したETag
   */
  matchesEtag(etag: string): boolean {
    return this._metadata.etag === etag;
  }

  /**
   * 条件付きリクエストのLast-Modifiedチェック
   * @param since クライアントが送信したIf-Modified-Since日時
   */
  isModifiedSince(since: Date): boolean {
    return this._metadata.lastModified > since;
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
    const size = this._metadata.size;
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
   * リソースの属性を更新（メタデータの変更時）
   * @param metadata 新しいメタデータ
   */
  updateMetadata(metadata: ResourceMetadata): void {
    this._metadata = metadata;
  }
}