import { DomainException } from './exceptions';

/**
 * パストラバーサル攻撃を検出した際の例外
 */
export class PathTraversalException extends DomainException {
  constructor(path: string, details?: string) {
    super('PATH_TRAVERSAL_DETECTED', `Path traversal attack detected: ${path}`, 400);

    // セキュリティ上の理由から、詳細なパス情報はログに記録するが、
    // クライアントには返さない
    if (details) {
      this.details = { attemptedPath: path, details };
    }
  }
}
