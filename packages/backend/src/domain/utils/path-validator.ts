import { PathTraversalException } from '../errors/exceptions';
import path from 'path';

/**
 * パストラバーサル攻撃を防ぐためのパス検証ユーティリティ
 */
export class PathValidator {
  /**
   * パスが安全かどうかを検証し、サニタイズされたパスを返す
   * @param inputPath 検証するパス
   * @param basePath ベースディレクトリ（オプション）
   * @returns サニタイズされたパス
   * @throws PathTraversalException 危険なパスの場合
   */
  static validateAndSanitize(inputPath: string, basePath?: string): string {
    // null/undefined/空文字のチェック
    if (!inputPath || typeof inputPath !== 'string') {
      throw new PathTraversalException('', '');
    }

    // 危険な文字列パターンのチェック
    const dangerousPatterns = [
      /\.\./g, // ディレクトリトラバーサル
      /^\/+/, // 絶対パス
      /^~\//, // ホームディレクトリ
      /\0/g, // nullバイト
      /[\x00-\x1f]/g, // 制御文字
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i, // Windows予約名
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(inputPath)) {
        throw new PathTraversalException(inputPath, this.sanitizePath(inputPath));
      }
    }

    // パスの正規化
    const normalizedPath = path.normalize(inputPath);

    // ベースパスが指定されている場合、相対パスチェック
    if (basePath) {
      const resolvedPath = path.resolve(basePath, normalizedPath);
      const resolvedBase = path.resolve(basePath);

      // resolvedPathがresolvedBaseから始まるかチェック
      if (!resolvedPath.startsWith(resolvedBase)) {
        throw new PathTraversalException(inputPath, normalizedPath);
      }
    }

    // 追加の検証: 隠しファイル・ディレクトリへのアクセスを防ぐ
    const segments = normalizedPath.split(path.sep);
    for (const segment of segments) {
      if (segment.startsWith('.') && segment !== '.') {
        throw new PathTraversalException(inputPath, normalizedPath);
      }
    }

    return normalizedPath;
  }

  /**
   * パスをサニタイズする
   * @param inputPath 入力パス
   * @returns サニタイズされたパス
   */
  private static sanitizePath(inputPath: string): string {
    return inputPath
      .replace(/\.\./g, '') // ディレクトリトラバーサル除去
      .replace(/^\/+/, '') // 先頭のスラッシュ除去
      .replace(/^~\//, '') // ホームディレクトリ参照除去
      .replace(/\0/g, '') // nullバイト除去
      .replace(/[\x00-\x1f]/g, '') // 制御文字除去
      .replace(/\/+/g, '/') // 連続スラッシュを単一に
      .trim();
  }

  /**
   * ファイル拡張子が許可されているかチェック
   * @param filePath ファイルパス
   * @param allowedExtensions 許可された拡張子のリスト
   * @returns 許可されている場合true
   */
  static isAllowedExtension(filePath: string, allowedExtensions: string[]): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * JSONファイルパスとして有効かチェック
   * @param filePath ファイルパス
   * @returns 有効な場合true
   */
  static isValidJsonPath(filePath: string): boolean {
    return this.isAllowedExtension(filePath, ['.json']);
  }
}
