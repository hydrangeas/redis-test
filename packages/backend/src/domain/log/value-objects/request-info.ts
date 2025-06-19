/**
 * リクエスト情報値オブジェクト
 * APIリクエストの詳細情報を保持
 */
export class RequestInfo {
  private readonly _ipAddress: string;
  private readonly _userAgent: string;
  private readonly _headers: Record<string, string>;
  private readonly _body: unknown;
  private readonly _queryParams?: Record<string, string>;

  constructor(params: {
    ipAddress: string;
    userAgent: string;
    headers: Record<string, string>;
    body: unknown;
    queryParams?: Record<string, string>;
  }) {
    this._ipAddress = params.ipAddress;
    this._userAgent = params.userAgent;
    this._headers = { ...params.headers };
    this._body = params.body;
    this._queryParams = params.queryParams ? { ...params.queryParams } : undefined;

    Object.freeze(this);
  }

  /**
   * IPアドレス
   */
  get ipAddress(): string {
    return this._ipAddress;
  }

  /**
   * ユーザーエージェント
   */
  get userAgent(): string {
    return this._userAgent;
  }

  /**
   * リクエストヘッダー
   */
  get headers(): Record<string, string> {
    return { ...this._headers };
  }

  /**
   * リクエストボディ
   */
  get body(): unknown {
    return this._body;
  }

  /**
   * クエリパラメータ
   */
  get queryParams(): Record<string, string> | undefined {
    return this._queryParams ? { ...this._queryParams } : undefined;
  }

  /**
   * 特定のヘッダー値を取得
   * @param name ヘッダー名
   */
  getHeader(name: string): string | undefined {
    return this._headers[name.toLowerCase()];
  }

  /**
   * ブラウザ情報を解析
   */
  getBrowserInfo(): {
    name: string;
    version?: string;
    platform?: string;
  } {
    // 簡易的なUserAgent解析
    const ua = this._userAgent.toLowerCase();

    let name = 'Unknown';
    let version: string | undefined;
    let platform: string | undefined;

    // ブラウザ検出
    if (ua.includes('chrome')) {
      name = 'Chrome';
      const match = ua.match(/chrome\/(\d+)/);
      if (match) version = match[1];
    } else if (ua.includes('firefox')) {
      name = 'Firefox';
      const match = ua.match(/firefox\/(\d+)/);
      if (match) version = match[1];
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      name = 'Safari';
      const match = ua.match(/version\/(\d+)/);
      if (match) version = match[1];
    } else if (ua.includes('edge')) {
      name = 'Edge';
      const match = ua.match(/edge\/(\d+)/);
      if (match) version = match[1];
    }

    // プラットフォーム検出
    if (ua.includes('windows')) {
      platform = 'Windows';
    } else if (ua.includes('mac')) {
      platform = 'macOS';
    } else if (ua.includes('linux')) {
      platform = 'Linux';
    } else if (ua.includes('android')) {
      platform = 'Android';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
      platform = 'iOS';
    }

    return { name, version, platform };
  }

  /**
   * IPアドレスが内部ネットワークからのものか判定
   */
  isInternalIP(): boolean {
    const ip = this._ipAddress;

    // ローカルホスト
    if (ip === '127.0.0.1' || ip === '::1') return true;

    // プライベートIPアドレス範囲
    const parts = ip.split('.');
    if (parts.length === 4) {
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);

      // 10.0.0.0/8
      if (first === 10) return true;

      // 172.16.0.0/12
      if (first === 172 && second >= 16 && second <= 31) return true;

      // 192.168.0.0/16
      if (first === 192 && second === 168) return true;
    }

    return false;
  }

  /**
   * センシティブな情報をマスクしたオブジェクトを返す
   */
  toSafeObject(): Record<string, unknown> {
    const safeHeaders = { ...this._headers };

    // 認証情報をマスク
    if (safeHeaders.authorization) {
      safeHeaders.authorization = 'Bearer ***';
    }

    // APIキーをマスク
    if (safeHeaders['x-api-key']) {
      safeHeaders['x-api-key'] = '***';
    }

    return {
      ipAddress: this._ipAddress,
      userAgent: this._userAgent,
      headers: safeHeaders,
      browserInfo: this.getBrowserInfo(),
      isInternal: this.isInternalIP(),
    };
  }
}
