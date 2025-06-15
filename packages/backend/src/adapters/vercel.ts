import type { FastifyInstance } from 'fastify';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export class VercelAdapter {
  constructor(private app: FastifyInstance) {}

  async handleRequest(req: VercelRequest, res: VercelResponse) {
    // Vercelのリクエストオブジェクトを変換
    const url = `https://${req.headers.host}${req.url}`;
    const headers: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    // Fastifyリクエストとして処理
    const response = await this.app.inject({
      method: req.method as any,
      url,
      headers,
      payload: req.body,
    });

    // レスポンスの返却
    res.status(response.statusCode);
    
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value as string);
    }
    
    res.send(response.body);
  }

  // キャッシュ戦略
  getCacheHeaders(path: string): Record<string, string> {
    // 静的データのキャッシュ
    if (path.startsWith('/secure/') && path.endsWith('.json')) {
      return {
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'CDN-Cache-Control': 'max-age=3600',
      };
    }

    // 認証エンドポイントはキャッシュしない
    if (path.startsWith('/auth/')) {
      return {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      };
    }

    // デフォルト
    return {
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    };
  }
}