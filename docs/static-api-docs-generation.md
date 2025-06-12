# APIドキュメントの静的生成ガイド

## 概要

本プロジェクトでは、APIドキュメントをビルド時に静的に生成し、実行時のドキュメント管理を不要にしています。これにより、パフォーマンスの向上とアーキテクチャの簡素化を実現しています。

## 技術スタック

- **@fastify/swagger**: OpenAPI仕様書の生成
- **@scalar/api-reference**: インタラクティブなAPIドキュメントUI
- **TypeScript**: 型安全な実装
- **Vercel**: 静的ファイルのホスティング

## 実装詳細

### 1. OpenAPI仕様書の生成

#### スクリプト構成
```typescript
// scripts/generate-openapi.ts
import fastify from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fs from 'fs/promises'
import path from 'path'
import yaml from 'js-yaml'

async function generateOpenAPISpec() {
  const app = fastify({ logger: false })

  // Swaggerプラグインを登録
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'オープンデータ提供API',
        version: '1.0.0',
        description: '奈良県のオープンデータをJSON形式で提供するAPI',
        contact: {
          name: 'API Support',
          email: 'support@example.com'
        }
      },
      servers: [
        {
          url: 'https://api.example.com',
          description: 'Production server'
        },
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Supabase Authで発行されたJWTトークン'
          }
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              type: { type: 'string', format: 'uri' },
              title: { type: 'string' },
              status: { type: 'integer' },
              detail: { type: 'string' },
              instance: { type: 'string', format: 'uri' }
            },
            required: ['type', 'title', 'status']
          }
        }
      },
      security: [{ bearerAuth: [] }],
      tags: [
        {
          name: 'data',
          description: 'オープンデータアクセス'
        },
        {
          name: 'auth',
          description: '認証関連'
        }
      ]
    }
  })

  // すべてのルートを読み込み
  await app.register(import('../src/routes/index.js'))
  
  // Fastifyを初期化
  await app.ready()

  // OpenAPI仕様書を取得
  const spec = app.swagger()

  // distディレクトリを作成
  await fs.mkdir('dist', { recursive: true })

  // JSON形式で保存
  await fs.writeFile(
    path.join('dist', 'openapi.json'),
    JSON.stringify(spec, null, 2)
  )

  // YAML形式でも保存（人間が読みやすい）
  await fs.writeFile(
    path.join('dist', 'openapi.yaml'),
    yaml.dump(spec)
  )

  console.log('✅ OpenAPI仕様書を生成しました')
  console.log('  - dist/openapi.json')
  console.log('  - dist/openapi.yaml')
  
  process.exit(0)
}

generateOpenAPISpec().catch(err => {
  console.error('❌ エラー:', err)
  process.exit(1)
})
```

#### ルート定義でのスキーマ設定
```typescript
// src/routes/data.ts
export default async function dataRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Params: { path: string }
  }>('/secure/*', {
    schema: {
      description: 'オープンデータファイルの取得',
      tags: ['data'],
      params: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'データファイルのパス (例: 319985/r5.json)'
          }
        },
        required: ['path']
      },
      headers: {
        type: 'object',
        properties: {
          authorization: {
            type: 'string',
            pattern: '^Bearer .+$',
            description: 'Bearer形式のJWTトークン'
          }
        },
        required: ['authorization']
      },
      response: {
        200: {
          description: 'JSONデータ',
          type: 'object',
          additionalProperties: true
        },
        401: {
          description: '認証エラー',
          $ref: '#/components/schemas/Error'
        },
        404: {
          description: 'データが見つかりません',
          $ref: '#/components/schemas/Error'
        },
        429: {
          description: 'レート制限超過',
          type: 'object',
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'integer' },
            detail: { type: 'string' },
            instance: { type: 'string' },
            retryAfter: { type: 'integer', description: '再試行可能になるまでの秒数' }
          }
        }
      }
    },
    preHandler: [
      fastify.authenticate,
      fastify.rateLimit
    ]
  }, async (request, reply) => {
    // ハンドラ実装
  })
}
```

### 2. Scalar UIの静的HTML生成

#### HTMLテンプレート
```html
<!-- templates/api-docs.html -->
<!doctype html>
<html lang="ja">
  <head>
    <title>オープンデータ提供API - APIドキュメント</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="奈良県のオープンデータを提供するAPIのドキュメント" />
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="scalar-api-reference"></div>
    
    <!-- Scalar CDNから最新版をロード -->
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    
    <script>
      // OpenAPI仕様書プレースホルダー
      const spec = OPENAPI_SPEC_PLACEHOLDER;
      
      // Scalar APIリファレンスを初期化
      Scalar.createApiReference('#scalar-api-reference', {
        spec: spec,
        proxyUrl: 'https://proxy.scalar.com',
        theme: 'purple',
        darkMode: true,
        hideModels: false,
        searchHotKey: 'k',
        // カスタマイズオプション
        customCss: `
          .scalar-api-reference {
            --scalar-color-1: #5c2d91;
            --scalar-font: -apple-system, BlinkMacSystemFont, sans-serif;
          }
        `
      })
    </script>
  </body>
</html>
```

#### ビルドスクリプト
```typescript
// scripts/build-docs.ts
import fs from 'fs/promises'
import path from 'path'

async function buildStaticDocs() {
  try {
    // OpenAPI仕様書を読み込む
    const specPath = path.join(process.cwd(), 'dist', 'openapi.json')
    const spec = JSON.parse(
      await fs.readFile(specPath, 'utf-8')
    )

    // HTMLテンプレートを読み込む
    const templatePath = path.join(process.cwd(), 'templates', 'api-docs.html')
    let html = await fs.readFile(templatePath, 'utf-8')

    // OpenAPI仕様書を埋め込む
    html = html.replace(
      'OPENAPI_SPEC_PLACEHOLDER',
      JSON.stringify(spec)
    )

    // 静的HTMLを保存
    const outputPath = path.join(process.cwd(), 'dist', 'api-docs.html')
    await fs.writeFile(outputPath, html)

    // ファイルサイズを確認
    const stats = await fs.stat(outputPath)
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2)

    console.log('✅ 静的APIドキュメントを生成しました')
    console.log(`  - dist/api-docs.html (${sizeInMB} MB)`)
  } catch (error) {
    console.error('❌ エラー:', error)
    process.exit(1)
  }
}

buildStaticDocs()
```

### 3. 開発環境での動的ドキュメント

開発時は動的にドキュメントを提供することも可能です：

```typescript
// src/plugins/documentation.ts
import { FastifyPluginAsync } from 'fastify'
import scalarApiReference from '@scalar/fastify-api-reference'

const documentationPlugin: FastifyPluginAsync = async (fastify) => {
  // 開発環境でのみ有効化
  if (process.env.NODE_ENV === 'development') {
    await fastify.register(scalarApiReference, {
      routePrefix: '/reference',
      configuration: {
        spec: {
          url: '/documentation/json'
        }
      }
    })
  }
}

export default documentationPlugin
```

### 4. CI/CDパイプライン

#### GitHub Actions
```yaml
# .github/workflows/build-docs.yml
name: Build API Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/routes/**'
      - 'src/schemas/**'
      - 'scripts/generate-openapi.ts'
      - 'scripts/build-docs.ts'
  pull_request:
    branches: [main]

jobs:
  build-docs:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate OpenAPI spec
        run: npm run build:openapi
        
      - name: Build static documentation
        run: npm run build:docs
        
      - name: Validate OpenAPI spec
        run: |
          npx @apidevtools/swagger-cli validate dist/openapi.json
          
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: api-documentation
          path: |
            dist/openapi.json
            dist/openapi.yaml
            dist/api-docs.html
          retention-days: 30
          
      - name: Comment PR with doc changes
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const spec = JSON.parse(fs.readFileSync('dist/openapi.json', 'utf8'));
            const endpoints = Object.keys(spec.paths).length;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📚 APIドキュメントが更新されました\n\n- エンドポイント数: ${endpoints}\n- OpenAPI version: ${spec.openapi}`
            })
```

### 5. Vercelデプロイメント設定

#### vercel.json
```json
{
  "functions": {
    "api/index.js": {
      "maxDuration": 10
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/api-docs",
      "dest": "/dist/api-docs.html",
      "headers": {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate"
      }
    },
    {
      "src": "/openapi.json",
      "dest": "/dist/openapi.json",
      "headers": {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate"
      }
    },
    {
      "src": "/",
      "dest": "/dist/api-docs.html"
    }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci"
}
```

#### package.json
```json
{
  "name": "open-data-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build:openapi": "tsx scripts/generate-openapi.ts",
    "build:docs": "tsx scripts/build-docs.ts",
    "build": "npm run build:openapi && npm run build:docs",
    "start": "node dist/api/index.js",
    "test": "vitest",
    "lint": "eslint src",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@fastify/cors": "^8.5.0",
    "@fastify/helmet": "^11.1.1",
    "@fastify/jwt": "^8.0.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.14.0",
    "@supabase/supabase-js": "^2.39.0",
    "fastify": "^4.25.0"
  },
  "devDependencies": {
    "@scalar/fastify-api-reference": "^1.25.0",
    "@types/node": "^20.10.0",
    "js-yaml": "^4.1.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.1.0"
  }
}
```

## ベストプラクティス

### 1. スキーマの共通化
```typescript
// src/schemas/common.ts
export const errorSchema = {
  type: 'object',
  properties: {
    type: { type: 'string' },
    title: { type: 'string' },
    status: { type: 'integer' },
    detail: { type: 'string' },
    instance: { type: 'string' }
  }
}

export const paginationSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    total: { type: 'integer' },
    hasNext: { type: 'boolean' }
  }
}
```

### 2. 型安全性の確保
```typescript
// src/types/api.ts
import { Static } from '@sinclair/typebox'
import { Type } from '@sinclair/typebox'

export const DataParamsSchema = Type.Object({
  path: Type.String({ description: 'データファイルのパス' })
})

export type DataParams = Static<typeof DataParamsSchema>

// ルートで使用
fastify.get<{ Params: DataParams }>('/secure/*', {
  schema: {
    params: DataParamsSchema
  }
}, handler)
```

### 3. ドキュメントの最適化
- 大きなOpenAPI仕様書は圧縮する
- CDNを活用してScalar UIアセットを配信
- 本番環境では静的HTMLのみを配信

### 4. バージョニング
```typescript
// APIバージョンをURLに含める
const spec = {
  openapi: '3.0.0',
  info: {
    version: process.env.API_VERSION || '1.0.0'
  },
  servers: [
    {
      url: 'https://api.example.com/v1',
      description: 'Production API v1'
    }
  ]
}
```

## トラブルシューティング

### 問題: ビルド時にルートが見つからない
```bash
# 解決策: 動的インポートのパスを確認
await app.register(import('../src/routes/index.js'))
```

### 問題: Scalar UIが表示されない
```javascript
// 解決策: Content Security Policyを調整
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
})
```

### 問題: OpenAPI仕様書が大きすぎる
```typescript
// 解決策: 不要な例を削除、共通スキーマを参照
const compactSpec = {
  ...spec,
  paths: Object.entries(spec.paths).reduce((acc, [path, methods]) => {
    acc[path] = Object.entries(methods).reduce((methodAcc, [method, operation]) => {
      // 例を削除
      delete operation.examples
      methodAcc[method] = operation
      return methodAcc
    }, {})
    return acc
  }, {})
}
```

## まとめ

静的APIドキュメント生成により：
- **パフォーマンス向上**: CDNでの高速配信
- **セキュリティ向上**: 実行時のドキュメント生成処理が不要
- **運用の簡素化**: データベースやドメインモデルが不要
- **バージョン管理**: Gitでドキュメントの変更履歴を追跡

この方式は、Vercelのようなエッジコンピューティング環境に最適化されており、スケーラブルで保守しやすいAPIドキュメントソリューションを提供します。