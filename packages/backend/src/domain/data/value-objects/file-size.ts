import { ValidationError } from '../../errors/validation-error';

/**
 * ファイルサイズを表すバリューオブジェクト
 * バイト単位でサイズを保持
 */
export class FileSize {
  /**
   * サイズ単位の定数
   */
  static readonly BYTE = 1;
  static readonly KILOBYTE = 1024;
  static readonly MEGABYTE = 1024 * 1024;
  static readonly GIGABYTE = 1024 * 1024 * 1024;

  /**
   * @param bytes - ファイルサイズ（バイト単位）
   */
  constructor(public readonly bytes: number) {
    if (!Number.isInteger(bytes)) {
      throw new ValidationError('File size must be an integer', {
        bytes,
      });
    }

    if (bytes < 0) {
      throw new ValidationError('File size cannot be negative', {
        bytes,
      });
    }

    // 最大サイズ制限（10GB）
    const maxSize = 10 * FileSize.GIGABYTE;
    if (bytes > maxSize) {
      throw new ValidationError('File size exceeds maximum allowed size', {
        bytes,
        maxSize,
      });
    }

    Object.freeze(this);
  }

  /**
   * キロバイト単位で取得
   */
  toKiloBytes(): number {
    return this.bytes / FileSize.KILOBYTE;
  }

  /**
   * メガバイト単位で取得
   */
  toMegaBytes(): number {
    return this.bytes / FileSize.MEGABYTE;
  }

  /**
   * ギガバイト単位で取得
   */
  toGigaBytes(): number {
    return this.bytes / FileSize.GIGABYTE;
  }

  /**
   * 人間が読みやすい形式で文字列化
   */
  toHumanReadable(): string {
    if (this.bytes < FileSize.KILOBYTE) {
      return `${this.bytes} B`;
    } else if (this.bytes < FileSize.MEGABYTE) {
      return `${(this.bytes / FileSize.KILOBYTE).toFixed(2)} KB`;
    } else if (this.bytes < FileSize.GIGABYTE) {
      return `${(this.bytes / FileSize.MEGABYTE).toFixed(2)} MB`;
    } else {
      return `${(this.bytes / FileSize.GIGABYTE).toFixed(2)} GB`;
    }
  }

  /**
   * 指定されたサイズより大きいかチェック
   */
  isGreaterThan(other: FileSize): boolean {
    return this.bytes > other.bytes;
  }

  /**
   * 指定されたサイズより小さいかチェック
   */
  isLessThan(other: FileSize): boolean {
    return this.bytes < other.bytes;
  }

  /**
   * 指定されたサイズ以下かチェック
   */
  isLessThanOrEqualTo(other: FileSize): boolean {
    return this.bytes <= other.bytes;
  }

  /**
   * 等価性の比較
   */
  equals(other: FileSize): boolean {
    return this.bytes === other.bytes;
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return this.toHumanReadable();
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): number {
    return this.bytes;
  }

  /**
   * JSONからの復元
   */
  static fromJSON(bytes: number): FileSize {
    return new FileSize(bytes);
  }

  /**
   * 一般的なサイズ制限のファクトリメソッド
   */
  static megaBytes(mb: number): FileSize {
    return new FileSize(mb * FileSize.MEGABYTE);
  }

  static kiloBytes(kb: number): FileSize {
    return new FileSize(kb * FileSize.KILOBYTE);
  }

  static gigaBytes(gb: number): FileSize {
    return new FileSize(gb * FileSize.GIGABYTE);
  }
}
