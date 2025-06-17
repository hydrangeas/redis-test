import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { coerce } from 'semver';

export interface VersioningOptions {
  // デフォルトバージョン
  defaultVersion: string;
  // サポートされているバージョン
  supportedVersions: string[];
  // 非推奨バージョン
  deprecatedVersions?: string[];
  // バージョン抽出方法
  versionExtractor?: (request: FastifyRequest) => string | null;
  // バージョンが見つからない場合のフォールバック
  enableFallback?: boolean;
}

const versioningPlugin: FastifyPluginAsync<VersioningOptions> = async (fastify, options) => {
  const {
    defaultVersion,
    supportedVersions,
    deprecatedVersions = [],
    enableFallback = true,
  } = options;

  /**
   * デフォルトのバージョン抽出関数
   */
  const defaultVersionExtractor = (request: FastifyRequest): string | null => {
    // 1. URLパスからバージョンを抽出
    const pathMatch = request.url.match(/^\/api\/v(\d+(?:\.\d+)?)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // 2. ヘッダーからバージョンを抽出
    const acceptVersion = request.headers['accept-version'] || request.headers['x-api-version'];
    if (acceptVersion) {
      return acceptVersion as string;
    }

    // 3. クエリパラメータからバージョンを抽出
    const queryVersion = (request.query as any)?.version;
    if (queryVersion) {
      return queryVersion;
    }

    return null;
  };

  const versionExtractor = options.versionExtractor || defaultVersionExtractor;

  /**
   * バージョンの検証
   */
  const validateVersion = (version: string): boolean => {
    // 厳密にサポートされているバージョンのみを許可
    return supportedVersions.includes(version);
  };

  /**
   * 最も近いバージョンを見つける
   */
  const findClosestVersion = (requestedVersion: string): string | null => {
    if (!enableFallback) return null;

    const requested = coerce(requestedVersion);
    if (!requested) return defaultVersion;

    // サポートされているバージョンを降順でソート
    const sorted = [...supportedVersions].sort((a, b) => {
      const verA = coerce(a);
      const verB = coerce(b);
      if (!verA || !verB) return 0;
      return verB.compare(verA);
    });

    // 要求されたバージョン以下で最も高いバージョンを返す
    for (const ver of sorted) {
      const coercedVer = coerce(ver);
      if (coercedVer && coercedVer.compare(requested) <= 0) {
        return ver;
      }
    }

    return defaultVersion;
  };

  // リクエストフックでバージョンを設定
  fastify.addHook('preHandler', async (request, reply) => {
    const extractedVersion = versionExtractor(request) || defaultVersion;

    // バージョンの検証
    if (!validateVersion(extractedVersion)) {
      const fallbackVersion = findClosestVersion(extractedVersion);

      if (!fallbackVersion) {
        return reply.code(400).send({
          type: `${process.env.API_URL}/errors/unsupported_version`,
          title: 'Unsupported API version',
          status: 400,
          detail: `Version ${extractedVersion} is not supported`,
          instance: request.url,
          supportedVersions,
        });
      }

      // フォールバックバージョンを使用
      request.apiVersion = fallbackVersion;
      reply.header('X-API-Version-Requested', extractedVersion);
      reply.header('X-API-Version-Served', fallbackVersion);

      // 非推奨バージョンの警告（フォールバックバージョンが非推奨の場合）
      if (deprecatedVersions.includes(fallbackVersion)) {
        reply.header(
          'X-API-Deprecation-Warning',
          `Version ${fallbackVersion} is deprecated and will be removed in future releases`,
        );
        reply.header('X-API-Deprecation-Date', '2025-12-31');
        reply.header('X-API-Deprecation-Info', 'https://api.example.com/deprecation');
      }

      request.log.info(
        {
          requested: extractedVersion,
          served: fallbackVersion,
        },
        'API version fallback',
      );
    } else {
      request.apiVersion = extractedVersion;
      reply.header('X-API-Version', extractedVersion);

      // 非推奨バージョンの警告
      if (deprecatedVersions.includes(extractedVersion)) {
        reply.header(
          'X-API-Deprecation-Warning',
          `Version ${extractedVersion} is deprecated and will be removed in future releases`,
        );
        reply.header('X-API-Deprecation-Date', '2025-12-31');
        reply.header('X-API-Deprecation-Info', 'https://api.example.com/deprecation');

        request.log.warn(
          {
            version: extractedVersion,
            userId: request.user?.userId?.value,
          },
          'Deprecated API version used',
        );
      }
    }
  });

  // バージョン別ルート登録ヘルパー
  fastify.decorate('routeVersion', function (version: string | string[], handler: any) {
    return async function (request: FastifyRequest, reply: any) {
      const versions = Array.isArray(version) ? version : [version];

      if (versions.includes(request.apiVersion!)) {
        return handler(request, reply);
      }

      // バージョンが一致しない場合
      return reply.code(404).send({
        type: `${process.env.API_URL}/errors/not_found`,
        title: 'Endpoint not found',
        status: 404,
        detail: `This endpoint is not available in version ${request.apiVersion}`,
        instance: request.url,
        availableVersions: versions,
      });
    };
  });

  // APIバージョン情報エンドポイント
  fastify.get('/api/versions', async (request, _reply) => {
    return {
      current: defaultVersion,
      supported: supportedVersions,
      deprecated: deprecatedVersions,
      requested: request.apiVersion,
    };
  });
};

// TypeScript定義の拡張
declare module 'fastify' {
  interface FastifyRequest {
    apiVersion?: string;
  }

  interface FastifyInstance {
    routeVersion: (version: string | string[], handler: any) => any;
  }
}

export default fp(versioningPlugin, {
  fastify: '4.x',
  name: 'versioning-plugin',
});
