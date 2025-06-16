/**
 * レスポンス情報値オブジェクト
 * APIレスポンスの詳細情報を保持
 */
export class ResponseInfo {
  private readonly _statusCode: number;
  private readonly _responseTime: number;
  private readonly _size: number;
  private readonly _headers: Record<string, string>;

  constructor(params: {
    statusCode: number;
    responseTime: number;
    size: number;
    headers: Record<string, string>;
  }) {
    // ステータスコードの検証
    if (params.statusCode < 100 || params.statusCode > 599) {
      throw new Error('Invalid status code');
    }

    // レスポンスタイムの検証
    if (params.responseTime < 0) {
      throw new Error('Response time cannot be negative');
    }

    // サイズの検証
    if (params.size < 0) {
      throw new Error('Response size cannot be negative');
    }

    this._statusCode = params.statusCode;
    this._responseTime = params.responseTime;
    this._size = params.size;
    this._headers = { ...params.headers };

    Object.freeze(this);
  }

  /**
   * HTTPステータスコード
   */
  get statusCode(): number {
    return this._statusCode;
  }

  /**
   * レスポンスタイム（ミリ秒）
   */
  get responseTime(): number {
    return this._responseTime;
  }

  /**
   * レスポンスサイズ（バイト）
   */
  get size(): number {
    return this._size;
  }

  /**
   * レスポンスヘッダー
   */
  get headers(): Record<string, string> {
    return { ...this._headers };
  }

  /**
   * ステータスコードのカテゴリを取得
   */
  getStatusCategory(): string {
    const code = this._statusCode;
    if (code >= 100 && code < 200) return 'informational';
    if (code >= 200 && code < 300) return 'success';
    if (code >= 300 && code < 400) return 'redirect';
    if (code >= 400 && code < 500) return 'client_error';
    if (code >= 500 && code < 600) return 'server_error';
    return 'unknown';
  }

  /**
   * レスポンスタイムのカテゴリを取得
   */
  getPerformanceCategory(): string {
    const time = this._responseTime;
    if (time < 100) return 'excellent';
    if (time < 300) return 'good';
    if (time < 1000) return 'fair';
    if (time < 3000) return 'poor';
    return 'critical';
  }

  /**
   * レスポンスサイズをヒューマンリーダブルな形式で取得
   */
  getHumanReadableSize(): string {
    const size = this._size;
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
   * 特定のヘッダー値を取得
   * @param name ヘッダー名
   */
  getHeader(name: string): string | undefined {
    return this._headers[name.toLowerCase()];
  }

  /**
   * キャッシュヘッダーの解析
   */
  getCacheInfo(): {
    cacheControl?: string;
    etag?: string;
    lastModified?: string;
    expires?: string;
  } {
    return {
      cacheControl: this.getHeader('cache-control'),
      etag: this.getHeader('etag'),
      lastModified: this.getHeader('last-modified'),
      expires: this.getHeader('expires'),
    };
  }

  /**
   * レート制限ヘッダーの解析
   */
  getRateLimitInfo(): {
    limit?: number;
    remaining?: number;
    reset?: Date;
  } {
    const limit = this.getHeader('x-ratelimit-limit');
    const remaining = this.getHeader('x-ratelimit-remaining');
    const reset = this.getHeader('x-ratelimit-reset');

    return {
      limit: limit ? parseInt(limit) : undefined,
      remaining: remaining ? parseInt(remaining) : undefined,
      reset: reset ? new Date(parseInt(reset) * 1000) : undefined,
    };
  }

  /**
   * メトリクス用のオブジェクトを生成
   */
  toMetrics(): Record<string, any> {
    return {
      statusCode: this._statusCode,
      statusCategory: this.getStatusCategory(),
      responseTime: this._responseTime,
      performanceCategory: this.getPerformanceCategory(),
      size: this._size,
      sizeHuman: this.getHumanReadableSize(),
      hasCache: !!this.getHeader('cache-control'),
      hasRateLimit: !!this.getHeader('x-ratelimit-limit'),
    };
  }
}
