import { FilePath } from './file-path';
import { FileSize } from './file-size';
import { MimeType } from './mime-type';
import { ValidationError } from '../../errors/validation-error';

/**
 * ファイルメタデータを表すバリューオブジェクト
 * ファイルの属性情報を保持
 */
export class FileMetadata {
  /**
   * @param path - ファイルパス
   * @param size - ファイルサイズ
   * @param mimeType - MIMEタイプ
   * @param lastModified - 最終更新日時
   * @param etag - ETag（オプション）
   */
  constructor(
    public readonly path: FilePath,
    public readonly size: FileSize,
    public readonly mimeType: MimeType,
    public readonly lastModified: Date,
    public readonly etag?: string,
  ) {
    if (!path) {
      throw new ValidationError('File path is required');
    }
    if (!size) {
      throw new ValidationError('File size is required');
    }
    if (!mimeType) {
      throw new ValidationError('MIME type is required');
    }
    if (!lastModified) {
      throw new ValidationError('Last modified date is required');
    }
    if (!(lastModified instanceof Date) || isNaN(lastModified.getTime())) {
      throw new ValidationError('Invalid last modified date');
    }

    // ETagの検証（存在する場合）
    if (etag !== undefined && etag !== null) {
      if (typeof etag !== 'string' || etag.trim().length === 0) {
        throw new ValidationError('ETag must be a non-empty string');
      }
    }

    Object.freeze(this);
  }

  /**
   * ファイル名を取得
   */
  getFileName(): string {
    return this.path.getFileName();
  }

  /**
   * 拡張子を取得
   */
  getExtension(): string {
    return this.path.getExtension();
  }

  /**
   * ファイルが指定された日時より新しいかチェック
   */
  isNewerThan(date: Date): boolean {
    return this.lastModified > date;
  }

  /**
   * ファイルが指定された日時より古いかチェック
   */
  isOlderThan(date: Date): boolean {
    return this.lastModified < date;
  }

  /**
   * ファイルサイズが指定サイズ以下かチェック
   */
  isSizeWithinLimit(maxSize: FileSize): boolean {
    return this.size.isLessThanOrEqualTo(maxSize);
  }

  /**
   * MIMEタイプがテキストかチェック
   */
  isText(): boolean {
    return this.mimeType.isText();
  }

  /**
   * MIMEタイプが画像かチェック
   */
  isImage(): boolean {
    return this.mimeType.isImage();
  }

  /**
   * 等価性の比較（パスとETagで判定）
   */
  equals(other: FileMetadata): boolean {
    if (!this.path.equals(other.path)) {
      return false;
    }
    
    // ETagがある場合はETagで比較
    if (this.etag && other.etag) {
      return this.etag === other.etag;
    }
    
    // ETagがない場合はサイズと更新日時で比較
    return this.size.equals(other.size) &&
           this.lastModified.getTime() === other.lastModified.getTime();
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `${this.getFileName()} (${this.size.toString()}, ${this.mimeType.toString()})`;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): {
    path: string;
    size: number;
    mimeType: string;
    lastModified: string;
    etag?: string;
  } {
    return {
      path: this.path.toJSON(),
      size: this.size.toJSON(),
      mimeType: this.mimeType.toJSON(),
      lastModified: this.lastModified.toISOString(),
      etag: this.etag,
    };
  }

  /**
   * JSONからの復元
   */
  static fromJSON(json: {
    path: string;
    size: number;
    mimeType: string;
    lastModified: string;
    etag?: string;
  }): FileMetadata {
    return new FileMetadata(
      FilePath.fromJSON(json.path),
      FileSize.fromJSON(json.size),
      MimeType.fromJSON(json.mimeType),
      new Date(json.lastModified),
      json.etag,
    );
  }
}