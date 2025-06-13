import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/errors/domain-error';
import * as path from 'path';

/**
 * データパス値オブジェクト
 * APIパスとファイルシステムパスのマッピングを管理
 */
export class DataPath {
  private static readonly DANGEROUS_CHARS = /[<>:"|?*\x00-\x1f\x80-\x9f]/;
  private static readonly MAX_SEGMENT_LENGTH = 255;
  private static readonly MAX_PATH_LENGTH = 1024;

  private constructor(
    public readonly value: string,
    public readonly segments: string[]
  ) {
    Object.freeze(this);
  }

  /**
   * パス文字列からDataPathを作成
   * @param pathString パス文字列
   */
  static create(pathString: string): Result<DataPath, DomainError> {
    // 基本的な検証
    if (!pathString || pathString.trim().length === 0) {
      return Result.fail(
        new DomainError(
          'INVALID_PATH',
          'Path cannot be empty',
          'VALIDATION'
        )
      );
    }

    // .jsonで終わることを確認
    if (!pathString.endsWith('.json')) {
      return Result.fail(
        new DomainError(
          'INVALID_PATH_FORMAT',
          'Path must end with .json',
          'VALIDATION'
        )
      );
    }

    // パス長の検証
    if (pathString.length > this.MAX_PATH_LENGTH) {
      return Result.fail(
        new DomainError(
          'PATH_TOO_LONG',
          `Path exceeds maximum length of ${this.MAX_PATH_LENGTH} characters`,
          'VALIDATION'
        )
      );
    }

    // パストラバーサル攻撃の防止
    const normalizedPath = path.normalize(pathString);
    if (normalizedPath.includes('..') || normalizedPath.includes('./')) {
      return Result.fail(
        new DomainError(
          'INVALID_PATH',
          'Path traversal detected',
          'SECURITY'
        )
      );
    }

    // 危険な文字のチェック
    if (this.DANGEROUS_CHARS.test(pathString)) {
      return Result.fail(
        new DomainError(
          'INVALID_PATH_CHARACTERS',
          'Path contains invalid characters',
          'VALIDATION'
        )
      );
    }

    // パスセグメントの検証
    const segments = pathString.split('/').filter(s => s.length > 0);
    if (segments.length === 0) {
      return Result.fail(
        new DomainError(
          'INVALID_PATH',
          'Path must have at least one segment',
          'VALIDATION'
        )
      );
    }

    // 各セグメントの長さチェック
    for (const segment of segments) {
      if (segment.length > this.MAX_SEGMENT_LENGTH) {
        return Result.fail(
          new DomainError(
            'PATH_SEGMENT_TOO_LONG',
            `Path segment "${segment}" exceeds maximum length of ${this.MAX_SEGMENT_LENGTH} characters`,
            'VALIDATION'
          )
        );
      }

      // セグメントが有効な文字のみを含むかチェック
      if (this.DANGEROUS_CHARS.test(segment)) {
        return Result.fail(
          new DomainError(
            'INVALID_SEGMENT_CHARACTERS',
            `Path segment "${segment}" contains invalid characters`,
            'VALIDATION'
          )
        );
      }
    }

    return Result.ok(new DataPath(normalizedPath, segments));
  }

  /**
   * ファイルシステムパスに変換
   * @param baseDir ベースディレクトリ
   */
  toFileSystemPath(baseDir: string): string {
    return path.join(baseDir, ...this.segments);
  }

  /**
   * ディレクトリパスを取得
   */
  get directory(): string {
    if (this.segments.length <= 1) {
      return '/';
    }
    return '/' + this.segments.slice(0, -1).join('/');
  }

  /**
   * ファイル名を取得
   */
  get filename(): string {
    return this.segments[this.segments.length - 1];
  }

  /**
   * 拡張子を取得
   */
  get extension(): string {
    const filename = this.filename;
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * パスの深さを取得
   */
  get depth(): number {
    return this.segments.length;
  }

  /**
   * 親パスが指定されたパスと一致するかチェック
   * @param parentPath 親パス
   */
  isUnder(parentPath: string): boolean {
    return this.value.startsWith(parentPath);
  }

  /**
   * 等価性の比較
   * @param other 比較対象
   */
  equals(other: DataPath): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  /**
   * 文字列表現を返す
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
}