import { ValidationError } from '../../errors/validation-error';

/**
 * APIパスを表すバリューオブジェクト
 * 正規化されたパスを保持
 */
export class ApiPath {
  /**
   * パストラバーサル攻撃パターンの検出用正規表現
   */
  private static readonly DANGEROUS_PATTERNS = /(\.\.[\\/]|\.\.%2[fF]|\.\.%5[cC])/;

  /**
   * 許可される文字のパターン
   * 英数字、ハイフン、アンダースコア、スラッシュ、ドット
   */
  private static readonly VALID_PATH_PATTERN = /^[a-zA-Z0-9\-_/.]+$/;

  /**
   * @param value - APIパス
   */
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('API path cannot be empty');
    }

    // パスの正規化
    let normalizedPath = value.trim();

    // 連続するスラッシュを単一に正規化（最初に実行）
    normalizedPath = normalizedPath.replace(/\/+/g, '/');

    // スラッシュで始まらない場合は追加
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }

    // 末尾のスラッシュを削除（ルートパス以外）
    if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    // 危険なパターンのチェック
    if (ApiPath.DANGEROUS_PATTERNS.test(normalizedPath)) {
      throw new ValidationError('API path contains dangerous patterns', {
        value,
        pattern: 'path traversal',
      });
    }

    // 許可される文字のチェック
    if (!ApiPath.VALID_PATH_PATTERN.test(normalizedPath)) {
      throw new ValidationError('API path contains invalid characters', {
        value,
        pattern: 'alphanumeric, hyphen, underscore, slash, dot',
      });
    }

    // パスの最大長チェック
    if (normalizedPath.length > 255) {
      throw new ValidationError('API path is too long', {
        value,
        maxLength: 255,
        actualLength: normalizedPath.length,
      });
    }

    this.value = normalizedPath;
    Object.freeze(this);
  }

  /**
   * パスセグメントを取得
   */
  getSegments(): string[] {
    return this.value.split('/').filter((segment) => segment.length > 0);
  }

  /**
   * パスがパターンにマッチするかチェック
   * @param pattern - ワイルドカード（*）を含むパターン
   */
  matches(pattern: string): boolean {
    // パターンを正規表現に変換
    const regexPattern = pattern
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')) // 各部分の特殊文字をエスケープ
      .join('[^/]+'); // * を単一セグメントマッチに置換

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(this.value);
  }

  /**
   * パスが指定されたプレフィックスで始まるかチェック
   */
  startsWith(prefix: string): boolean {
    return this.value.startsWith(prefix);
  }

  /**
   * 等価性の比較
   */
  equals(other: ApiPath): boolean {
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
  static fromJSON(value: string): ApiPath {
    return new ApiPath(value);
  }
}
