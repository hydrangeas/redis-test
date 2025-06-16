import { ValidationError } from '../../errors/validation-error';

/**
 * ファイルパスを表すバリューオブジェクト
 * セキュアなファイルパスの検証と正規化
 */
export class FilePath {
  /**
   * パストラバーサル攻撃パターンの検出用正規表現
   */
  private static readonly DANGEROUS_PATTERNS = /(\.\.[\/\\]|\.\.%2[fF]|\.\.%5[cC])/;

  /**
   * 許可される文字のパターン
   * 英数字、ハイフン、アンダースコア、スラッシュ、ドット
   */
  private static readonly VALID_PATH_PATTERN = /^[a-zA-Z0-9\-_\/\.]+$/;

  /**
   * @param value - ファイルパス
   */
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('File path cannot be empty');
    }

    // パスの正規化
    let normalizedPath = value.trim();

    // バックスラッシュをスラッシュに変換（Windows対応）
    normalizedPath = normalizedPath.replace(/\\/g, '/');

    // 連続するスラッシュを単一に正規化
    normalizedPath = normalizedPath.replace(/\/+/g, '/');

    // 先頭のスラッシュを削除（相対パスに統一）
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }

    // 末尾のスラッシュを削除
    if (normalizedPath.endsWith('/') && normalizedPath.length > 1) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    // 危険なパターンのチェック
    if (FilePath.DANGEROUS_PATTERNS.test(normalizedPath)) {
      throw new ValidationError('File path contains dangerous patterns', {
        value,
        pattern: 'path traversal',
      });
    }

    // 許可される文字のチェック
    if (!FilePath.VALID_PATH_PATTERN.test(normalizedPath)) {
      throw new ValidationError('File path contains invalid characters', {
        value,
        pattern: 'alphanumeric, hyphen, underscore, slash, dot',
      });
    }

    // パスの最大長チェック
    if (normalizedPath.length > 255) {
      throw new ValidationError('File path is too long', {
        value,
        maxLength: 255,
        actualLength: normalizedPath.length,
      });
    }

    this.value = normalizedPath;
    Object.freeze(this);
  }

  /**
   * ディレクトリパスを取得
   */
  getDirectory(): string {
    const lastSlash = this.value.lastIndexOf('/');
    return lastSlash === -1 ? '' : this.value.substring(0, lastSlash);
  }

  /**
   * ファイル名を取得
   */
  getFileName(): string {
    const lastSlash = this.value.lastIndexOf('/');
    return lastSlash === -1 ? this.value : this.value.substring(lastSlash + 1);
  }

  /**
   * 拡張子を取得（ドットを含む）
   */
  getExtension(): string {
    const fileName = this.getFileName();
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 || lastDot === 0 ? '' : fileName.substring(lastDot);
  }

  /**
   * 拡張子なしのファイル名を取得
   */
  getFileNameWithoutExtension(): string {
    const fileName = this.getFileName();
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 || lastDot === 0 ? fileName : fileName.substring(0, lastDot);
  }

  /**
   * 指定された基準パスとの結合
   */
  join(basePath: FilePath): FilePath {
    return new FilePath(`${basePath.value}/${this.value}`);
  }

  /**
   * 等価性の比較
   */
  equals(other: FilePath): boolean {
    return this.value === other.value;
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return this.value;
  }

  /**
   * JSONシリアライズ用
   */
  toJSON(): string {
    return this.value;
  }

  /**
   * JSONからの復元
   */
  static fromJSON(value: string): FilePath {
    return new FilePath(value);
  }
}
