import { Guard } from '@/domain/shared/guard';
import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';

/**
 * リソースメタデータ値オブジェクト
 * ファイルのメタ情報を保持
 */
export class ResourceMetadata {
  private readonly _size: number;
  private readonly _lastModified: Date;
  private readonly _etag: string;
  private readonly _contentType: string;

  constructor(params: { size: number; lastModified: Date; etag: string; contentType?: string }) {
    // サイズの検証
    if (params.size < 0) {
      throw new Error('Size cannot be negative');
    }

    this._size = params.size;
    this._lastModified = params.lastModified;
    this._etag = params.etag;
    this._contentType = params.contentType || 'application/json';

    Object.freeze(this);
  }

  /**
   * ファイルサイズ（バイト）
   */
  get size(): number {
    return this._size;
  }

  /**
   * 最終更新日時
   */
  get lastModified(): Date {
    return this._lastModified;
  }

  /**
   * ETag（エンティティタグ）
   */
  get etag(): string {
    return this._etag;
  }

  /**
   * コンテンツタイプ
   */
  get contentType(): string {
    return this._contentType;
  }

  /**
   * メタデータを作成
   * @param params パラメータオブジェクト
   */
  static create(params: {
    size: number;
    lastModified: Date | string;
    etag?: string;
    contentType?: string;
  }): Result<ResourceMetadata, DomainError> {
    // サイズの検証
    const sizeGuard = Guard.againstNullOrUndefined(params.size, 'size');
    if (!sizeGuard.succeeded) {
      return Result.fail(new DomainError('INVALID_SIZE', 'Size is required', 'VALIDATION'));
    }

    if (params.size < 0) {
      return Result.fail(new DomainError('INVALID_SIZE', 'Size cannot be negative', 'VALIDATION'));
    }

    // 最終更新日時の検証と変換
    let lastModified: Date;
    if (typeof params.lastModified === 'string') {
      lastModified = new Date(params.lastModified);
      if (isNaN(lastModified.getTime())) {
        return Result.fail(
          new DomainError('INVALID_DATE', 'Invalid last modified date', 'VALIDATION'),
        );
      }
    } else {
      lastModified = params.lastModified;
    }

    // ETagの生成または検証
    let etag = params.etag;
    if (!etag) {
      // ETagが提供されていない場合は生成
      etag = this.generateETag(params.size, lastModified);
    } else {
      // ETagフォーマットの検証（ダブルクォートで囲まれているべき）
      if (!etag.startsWith('"') || !etag.endsWith('"')) {
        etag = `"${etag}"`;
      }
    }

    try {
      const metadata = new ResourceMetadata({
        size: params.size,
        lastModified,
        etag,
        contentType: params.contentType,
      });
      return Result.ok(metadata);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'METADATA_CREATION_ERROR',
          error instanceof Error ? error.message : 'Failed to create metadata',
          'VALIDATION',
        ),
      );
    }
  }

  /**
   * ETagを生成
   * @param size ファイルサイズ
   * @param lastModified 最終更新日時
   */
  private static generateETag(size: number, lastModified: Date): string {
    // シンプルなETag生成（サイズとmtimeのハッシュ）
    const content = `${size}-${lastModified.getTime()}`;
    // 簡易的なハッシュ関数（実際のプロダクションではcryptoモジュールを使用）
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `"${Math.abs(hash).toString(16)}"`;
  }

  /**
   * Last-Modifiedヘッダー用の文字列を取得
   */
  getLastModifiedString(): string {
    return this._lastModified.toUTCString();
  }

  /**
   * キャッシュコントロール用の最大年齢を計算（秒）
   * @param now 現在時刻
   */
  calculateAge(now: Date = new Date()): number {
    return Math.floor((now.getTime() - this._lastModified.getTime()) / 1000);
  }

  /**
   * メタデータが古いかチェック
   * @param thresholdSeconds 閾値（秒）
   */
  isStale(thresholdSeconds: number): boolean {
    const age = this.calculateAge();
    return age > thresholdSeconds;
  }

  /**
   * 等価性の比較
   * @param other 比較対象
   */
  equals(other: ResourceMetadata): boolean {
    if (!other) return false;
    return (
      this._size === other._size &&
      this._lastModified.getTime() === other._lastModified.getTime() &&
      this._etag === other._etag &&
      this._contentType === other._contentType
    );
  }

  /**
   * 新しいメタデータで更新（イミュータブル）
   * @param updates 更新内容
   */
  update(
    updates: Partial<{
      size: number;
      lastModified: Date;
      etag: string;
      contentType: string;
    }>,
  ): ResourceMetadata {
    return new ResourceMetadata({
      size: updates.size ?? this._size,
      lastModified: updates.lastModified ?? this._lastModified,
      etag: updates.etag ?? this._etag,
      contentType: updates.contentType ?? this._contentType,
    });
  }
}
