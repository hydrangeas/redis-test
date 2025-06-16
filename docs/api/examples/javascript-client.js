/**
 * Open Data API Client Example - JavaScript
 *
 * このサンプルコードは、Open Data APIの基本的な使用方法を示しています。
 */

// 設定
const API_BASE_URL = 'https://api.example.com/api/v1';
const ACCESS_TOKEN = 'your-access-token';
const REFRESH_TOKEN = 'your-refresh-token';

/**
 * APIクライアントクラス
 */
class OpenDataAPIClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || API_BASE_URL;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.rateLimit = {
      limit: null,
      remaining: null,
      reset: null,
    };
  }

  /**
   * HTTPリクエストを送信
   */
  async request(path, options = {}) {
    const url = `${this.baseURL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // レート制限情報を更新
      this.updateRateLimit(response);

      // 成功レスポンス
      if (response.ok) {
        if (response.status === 204) {
          return null; // No Content
        }
        return await response.json();
      }

      // エラーレスポンス
      const error = await response.json();
      const apiError = new Error(error.detail || error.title);
      apiError.status = response.status;
      apiError.type = error.type;
      apiError.errors = error.errors;

      // レート制限エラーの場合、retry-afterを追加
      if (response.status === 429) {
        apiError.retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      }

      throw apiError;
    } catch (error) {
      // ネットワークエラー等
      if (!error.status) {
        error.message = `Network error: ${error.message}`;
      }
      throw error;
    }
  }

  /**
   * レート制限情報を更新
   */
  updateRateLimit(response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit) this.rateLimit.limit = parseInt(limit);
    if (remaining) this.rateLimit.remaining = parseInt(remaining);
    if (reset) this.rateLimit.reset = new Date(parseInt(reset) * 1000);
  }

  /**
   * トークンをリフレッシュ
   */
  async refreshAccessToken() {
    const response = await this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: this.refreshToken,
      }),
    });

    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token;

    return response;
  }

  /**
   * データを取得
   */
  async getData(path, options = {}) {
    return await this.request(`/data/${path}`, {
      method: 'GET',
      headers: options.headers,
    });
  }

  /**
   * 条件付きでデータを取得
   */
  async getDataIfModified(path, etag) {
    const headers = {};
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    try {
      const response = await this.getData(path, { headers });
      return {
        modified: true,
        data: response.data,
        etag: response.metadata.etag,
      };
    } catch (error) {
      if (error.status === 304) {
        return {
          modified: false,
          data: null,
          etag: etag,
        };
      }
      throw error;
    }
  }

  /**
   * ログアウト
   */
  async logout() {
    await this.request('/auth/logout', {
      method: 'POST',
    });
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * ヘルスチェック
   */
  async checkHealth() {
    // ヘルスチェックは認証不要なので、一時的にトークンを外す
    const token = this.accessToken;
    this.accessToken = null;

    try {
      const response = await this.request('/health', {
        method: 'GET',
      });
      return response;
    } finally {
      this.accessToken = token;
    }
  }
}

/**
 * 使用例
 */
async function main() {
  // クライアントの初期化
  const client = new OpenDataAPIClient({
    accessToken: ACCESS_TOKEN,
    refreshToken: REFRESH_TOKEN,
  });

  try {
    // 1. 基本的なデータ取得
    console.log('=== データ取得 ===');
    const data = await client.getData('secure/319985/r5.json');
    console.log('Data:', data.data);
    console.log('Metadata:', data.metadata);
    console.log('Rate Limit:', client.rateLimit);

    // 2. 条件付きリクエスト（キャッシュ利用）
    console.log('\n=== 条件付きリクエスト ===');
    const etag = data.metadata.etag;
    const cached = await client.getDataIfModified('secure/319985/r5.json', etag);
    console.log('Modified:', cached.modified);

    // 3. エラーハンドリング
    console.log('\n=== エラーハンドリング ===');
    try {
      await client.getData('secure/nonexistent.json');
    } catch (error) {
      console.log('Error:', error.message);
      console.log('Status:', error.status);
      console.log('Type:', error.type);
    }

    // 4. レート制限の確認
    console.log('\n=== レート制限情報 ===');
    console.log(`残りリクエスト: ${client.rateLimit.remaining}/${client.rateLimit.limit}`);
    console.log(`リセット時刻: ${client.rateLimit.reset}`);

    // 5. トークンリフレッシュ
    console.log('\n=== トークンリフレッシュ ===');
    const newTokens = await client.refreshAccessToken();
    console.log('New access token received');
    console.log('Expires in:', newTokens.expires_in, 'seconds');

    // 6. ヘルスチェック
    console.log('\n=== ヘルスチェック ===');
    const health = await client.checkHealth();
    console.log('API Status:', health.status);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 高度な使用例：自動リトライとレート制限対応
async function fetchWithAutoRetry(client, path, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.getData(path);
    } catch (error) {
      // レート制限エラー
      if (error.status === 429) {
        const waitTime = error.retryAfter || 60;
        console.log(`Rate limited. Waiting ${waitTime} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        continue;
      }

      // 401エラー（認証エラー）の場合、トークンをリフレッシュ
      if (error.status === 401 && i < maxRetries - 1) {
        console.log('Token expired. Refreshing...');
        await client.refreshAccessToken();
        continue;
      }

      // その他のエラーは即座に投げる
      throw error;
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}

// バッチデータ取得の例
async function fetchMultipleData(client, paths) {
  // レート制限を考慮した並行処理
  const batchSize = 5; // 同時リクエスト数
  const results = [];

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const promises = batch.map((path) =>
      client.getData(path).catch((error) => ({
        path,
        error: error.message,
      })),
    );

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // レート制限に余裕を持たせる
    if (client.rateLimit.remaining < 10 && i + batchSize < paths.length) {
      console.log('Rate limit low. Waiting...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  return results;
}

// Node.js環境で実行する場合
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OpenDataAPIClient };
}

// ブラウザ環境で実行する場合
if (typeof window !== 'undefined') {
  window.OpenDataAPIClient = OpenDataAPIClient;
}
