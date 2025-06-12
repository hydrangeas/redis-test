# Supabase データ TTL（Time To Live）実装ガイド

Supabase でデータの有効期限（TTL）を実装する方法について、以下の5つのアプローチを詳しく説明します。

## 1. pg_cron 拡張機能の利用

### 利用可能性
Supabase の Hosted Platform は `pg_cron` 拡張機能をサポートしています。これは PostgreSQL 内で動作する cron ベースのジョブスケジューラで、定期的なメンテナンスタスクに最適です。

### 有効化方法
```sql
-- ダッシュボードの Database ページで Extensions を選択し、pg_cron を有効化
-- または SQL で直接有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 実装例

#### 基本的な定期削除
```sql
-- 毎週土曜日の午前3:30（GMT）に1週間以上前のイベントを削除
SELECT cron.schedule (
    'saturday-cleanup',
    '30 3 * * 6',
    $$ DELETE FROM events WHERE event_time < NOW() - INTERVAL '1 week' $$
);

-- 毎日午前2時に30日以上前のログを削除
SELECT cron.schedule(
    'daily-log-cleanup',
    '0 2 * * *',
    $$ DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days' $$
);

-- 1時間ごとに期限切れセッションを削除
SELECT cron.schedule(
    'hourly-session-cleanup',
    '0 * * * *',
    $$ DELETE FROM user_sessions WHERE expires_at < NOW() $$
);
```

#### ジョブの管理
```sql
-- 登録されているジョブを確認
SELECT * FROM cron.job;

-- ジョブを削除
SELECT cron.unschedule('daily-log-cleanup');
```

### pg_net との組み合わせ
`pg_net` 拡張機能を使用すると、HTTP レスポンスのデータに TTL を設定できます：

```sql
-- pg_net.ttl パラメータを設定（デフォルト: 6時間）
ALTER DATABASE postgres SET pg_net.ttl = '24 hours';
```

## 2. Row Level Security (RLS) による期限切れデータの自動フィルタリング

### 基本的な実装

#### 有効期限付きテーブルの作成
```sql
-- 有効期限を持つコンテンツテーブル
CREATE TABLE time_limited_content (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    user_id UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS を有効化
ALTER TABLE time_limited_content ENABLE ROW LEVEL SECURITY;

-- 期限切れでないコンテンツのみを表示するポリシー
CREATE POLICY "show_only_non_expired_content"
ON time_limited_content
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    AND expires_at > NOW()
);
```

#### サブスクリプションベースのアクセス制御
```sql
-- プレミアムコンテンツテーブル
CREATE TABLE premium_content (
    id BIGSERIAL PRIMARY KEY,
    title TEXT,
    content TEXT
);

-- サブスクリプションテーブル
CREATE TABLE subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- RLS を有効化
ALTER TABLE premium_content ENABLE ROW LEVEL SECURITY;

-- 有効なサブスクリプションを持つユーザーのみアクセス可能
CREATE POLICY "access_during_valid_subscription" 
ON premium_content 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 
        FROM subscriptions 
        WHERE subscriptions.user_id = auth.uid() 
        AND subscriptions.expires_at > NOW()
    )
);
```

### パフォーマンス最適化

```sql
-- タイムスタンプカラムにインデックスを作成
CREATE INDEX idx_expires_at ON time_limited_content(expires_at);
CREATE INDEX idx_user_expires ON time_limited_content(user_id, expires_at);

-- NOW() の評価を最適化するポリシー
CREATE POLICY "optimized_expiration_check"
ON time_limited_content
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    AND expires_at > (SELECT NOW())
);
```

## 3. PostgreSQL トリガーとパーティショニングによる自動削除

### トリガーベースの削除（小規模テーブル向け）

```sql
-- 古いレコードを削除するトリガー関数
CREATE OR REPLACE FUNCTION delete_old_rows() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$ 
DECLARE 
    row_count INT; 
BEGIN 
    -- 2日以上前のレコードを削除
    DELETE FROM rate_limiter 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '2 days'; 
    
    IF found THEN 
        GET DIAGNOSTICS row_count = ROW_COUNT; 
        RAISE NOTICE 'Deleted % row(s) from rate_limiter', row_count; 
    END IF; 
    
    RETURN NULL; 
END; 
$$;

-- INSERT 時にトリガーを実行
CREATE TRIGGER delete_old_rows_trigger 
AFTER INSERT ON rate_limiter 
EXECUTE FUNCTION delete_old_rows();
```

### パーティショニングによる効率的な削除（大規模テーブル向け）

```sql
-- パーティションテーブルの作成
CREATE TABLE logs (
    id SERIAL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data JSONB
) PARTITION BY RANGE (created_at);

-- 月次パーティションの作成
CREATE TABLE logs_2024_01 PARTITION OF logs 
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
    
CREATE TABLE logs_2024_02 PARTITION OF logs 
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 古いパーティションの削除（pg_cron で自動化可能）
SELECT cron.schedule(
    'drop_old_partitions',
    '0 1 1 * *', -- 毎月1日の午前1時
    $$
    DO $$
    DECLARE
        partition_name TEXT;
    BEGIN
        -- 3ヶ月以上前のパーティションを削除
        FOR partition_name IN 
            SELECT tablename 
            FROM pg_tables 
            WHERE tablename LIKE 'logs_%' 
            AND tablename < 'logs_' || TO_CHAR(NOW() - INTERVAL '3 months', 'YYYY_MM')
        LOOP
            EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
            RAISE NOTICE 'Dropped partition: %', partition_name;
        END LOOP;
    END $$;
    $$
);
```

## 4. Supabase Edge Functions による定期クリーンアップ

### Edge Function の作成

```typescript
// functions/data-cleanup/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // 30日以上前のログを削除
    const { data: deletedLogs, error: logsError } = await supabaseClient
      .from('logs')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .select()

    // 期限切れセッションを削除
    const { data: deletedSessions, error: sessionsError } = await supabaseClient
      .from('user_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select()

    // 一時ファイルをクリーンアップ
    const { data: deletedFiles, error: filesError } = await supabaseClient
      .storage
      .from('temp-files')
      .list()
      .then(async ({ data: files }) => {
        const oldFiles = files?.filter(file => {
          const uploadTime = new Date(file.created_at)
          return uploadTime < new Date(Date.now() - 24 * 60 * 60 * 1000)
        }) || []
        
        if (oldFiles.length > 0) {
          const filePaths = oldFiles.map(f => f.name)
          return await supabaseClient.storage
            .from('temp-files')
            .remove(filePaths)
        }
        return { data: [] }
      })

    // 統計情報を記録
    const stats = {
      logs_deleted: deletedLogs?.length || 0,
      sessions_deleted: deletedSessions?.length || 0,
      files_deleted: deletedFiles?.data?.length || 0,
      timestamp: new Date().toISOString()
    }

    await supabaseClient
      .from('cleanup_history')
      .insert(stats)

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats,
        message: 'Data cleanup completed successfully'
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
```

### Edge Function のスケジューリング

```sql
-- 認証情報を Vault に保存
SELECT vault.create_secret('https://your-project.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_ANON_KEY', 'anon_key');

-- 毎日午前2時にクリーンアップを実行
SELECT cron.schedule(
  'daily-edge-cleanup',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:= (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/data-cleanup',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body:=jsonb_build_object(
      'timestamp', NOW()::text,
      'cleanup_type', 'daily'
    )
  ) AS request_id;
  $$
);
```

## 5. レート制限のような時間ベースのデータ管理のベストプラクティス

### Upstash Redis との統合

レート制限には、Upstash Redis を使用することで、サーバーレス環境に最適化された実装が可能です：

```typescript
// Edge Function でのレート制限実装
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Redis } from 'https://deno.land/x/upstash_redis@v1.22.1/mod.ts'

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
})

serve(async (req) => {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return new Response('User ID required', { status: 400 })
  }

  const key = `rate_limit:${userId}:${Math.floor(Date.now() / 60000)}`
  const current = await redis.incr(key)
  
  // TTL を設定（1分）
  if (current === 1) {
    await redis.expire(key, 60)
  }

  const limit = 60 // 1分あたり60リクエスト
  
  if (current > limit) {
    return new Response('Rate limit exceeded', { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Math.ceil(Date.now() / 60000) * 60000).toISOString()
      }
    })
  }

  // 通常の処理を続行
  return new Response('OK', {
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': (limit - current).toString()
    }
  })
})
```

### PostgreSQL ベースのレート制限

Redis を使わない場合の PostgreSQL 実装：

```sql
-- レート制限テーブル
CREATE TABLE rate_limits (
    user_id UUID,
    window_start TIMESTAMP WITH TIME ZONE,
    request_count INT DEFAULT 1,
    PRIMARY KEY (user_id, window_start)
);

-- 古いエントリを自動削除するインデックス
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- レート制限チェック関数
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_limit INT DEFAULT 60,
    p_window_minutes INT DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
    v_window_start TIMESTAMP WITH TIME ZONE;
    v_count INT;
BEGIN
    v_window_start := DATE_TRUNC('minute', NOW());
    
    -- 現在のウィンドウでのリクエスト数を取得または作成
    INSERT INTO rate_limits (user_id, window_start, request_count)
    VALUES (p_user_id, v_window_start, 1)
    ON CONFLICT (user_id, window_start)
    DO UPDATE SET request_count = rate_limits.request_count + 1
    RETURNING request_count INTO v_count;
    
    -- 古いエントリを削除（非同期で実行されるよう pg_cron でスケジュール）
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 hour';
    
    RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql;

-- pg_cron で定期的にクリーンアップ
SELECT cron.schedule(
    'cleanup-rate-limits',
    '*/5 * * * *', -- 5分ごと
    $$ DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour' $$
);
```

## まとめとベストプラクティス

### 1. 適切な手法の選択

- **小規模・単純な削除**: pg_cron で直接 DELETE
- **大規模データ**: パーティショニング + パーティション削除
- **リアルタイムフィルタリング**: RLS ポリシー
- **複雑なロジック**: Edge Functions
- **高頻度アクセス**: Redis (Upstash) との統合

### 2. パフォーマンス考慮事項

- 削除操作は負荷の低い時間帯に実行
- 適切なインデックスを作成
- VACUUM を定期的に実行
- 大量削除時はバッチ処理を検討

### 3. モニタリング

- cleanup_history テーブルで履歴を記録
- Supabase ダッシュボードでジョブログを確認
- アラートを設定して異常を検知

### 4. セキュリティ

- Vault を使用して認証情報を安全に保存
- 最小権限の原則に従う
- 削除操作のロギングと監査

これらの手法を組み合わせることで、Supabase で効果的な TTL 実装が可能になります。