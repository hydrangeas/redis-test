# Authentication Infrastructure

このディレクトリは、認証関連のインフラストラクチャ層の実装を含んでいます。

## コンポーネント

### SupabaseAuthAdapter

Supabase Authとの統合を担当するアダプター層の実装です。

#### 主な機能

- **JWTトークンの検証**: Supabase Admin APIを使用してトークンの有効性を確認
- **リフレッシュトークンの処理**: 期限切れのアクセストークンを新しいものに更新
- **セッション管理**: ユーザーのサインアウトとセッションの無効化

#### 使用方法

```typescript
import { container } from 'tsyringe';
import { IAuthAdapter } from './interfaces/auth-adapter.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

const authAdapter = container.resolve<IAuthAdapter>(DI_TOKENS.AuthAdapter);

// トークンの検証
const payload = await authAdapter.verifyToken(token);
if (payload) {
  console.log('User ID:', payload.sub);
  console.log('User Tier:', payload.app_metadata.tier);
}

// リフレッシュトークンで新しいセッションを取得
const session = await authAdapter.refreshAccessToken(refreshToken);
if (session) {
  console.log('New access token:', session.access_token);
}

// ユーザーのサインアウト
await authAdapter.signOut(userId);
```

### インターフェース

#### IAuthAdapter

認証アダプターのインターフェースです。以下のメソッドを定義しています：

- `verifyToken(token: string): Promise<TokenPayload | null>`
- `refreshAccessToken(refreshToken: string): Promise<Session | null>`
- `signOut(userId: string): Promise<void>`

#### Session

セッション情報を表す型です：

```typescript
interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    app_metadata: Record<string, any>;
    user_metadata: Record<string, any>;
  };
}
```

## 環境変数

以下の環境変数が必要です：

- `PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURL
- `PUBLIC_SUPABASE_ANON_KEY`: Supabaseの匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabaseのサービスロールキー（管理者権限）

## テスト

### モックアダプター

テスト用のモック実装（`MockSupabaseAuthAdapter`）が提供されています：

```typescript
const mockAdapter = new MockSupabaseAuthAdapter();

// テストデータの設定
mockAdapter.setMockToken('test-token', {
  sub: 'user-123',
  email: 'test@example.com',
  app_metadata: { tier: 'tier1' },
  // ...
});

mockAdapter.setMockSession('refresh-token', {
  access_token: 'new-token',
  refresh_token: 'new-refresh-token',
  // ...
});

// テストでの使用
const payload = await mockAdapter.verifyToken('test-token');
```

### テストの実行

```bash
npm test -- src/infrastructure/auth
```

## セキュリティ考慮事項

1. **サービスロールキーの保護**: `SUPABASE_SERVICE_ROLE_KEY`は管理者権限を持つため、環境変数として安全に管理してください
2. **トークンの検証**: 全てのトークンはSupabase Admin APIを通じて検証され、改ざんを防ぎます
3. **セッション管理**: セッションは永続化されず、メモリ内でのみ管理されます
4. **ログの取り扱い**: トークンの一部のみをログに記録し、完全なトークンは記録しません

## 依存関係

- `@supabase/supabase-js`: Supabase JavaScript クライアント
- `jwt-decode`: JWTトークンのデコード用
- `tsyringe`: 依存性注入
- `pino`: ロギング
