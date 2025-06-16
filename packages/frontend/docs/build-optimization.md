# フロントエンドビルド最適化ガイド

## 概要

このドキュメントでは、フロントエンドアプリケーションのビルド最適化について説明します。

## 最適化手法

### 1. コード分割（Code Splitting）

Viteの設定で自動的にベンダーチャンクを分割しています：

- `react-vendor`: React関連ライブラリ
- `supabase-vendor`: Supabase関連ライブラリ
- `ui-vendor`: UIコンポーネントライブラリ
- `vendor`: その他の依存関係

### 2. 遅延ローディング（Lazy Loading）

ページコンポーネントは動的インポートを使用して遅延ロードされます：

```typescript
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
```

### 3. 圧縮

本番ビルドでは以下の圧縮が適用されます：

- Gzip圧縮（.gz）
- Brotli圧縮（.br）

### 4. Tree Shaking

未使用のコードは自動的に削除されます：

- ESモジュールの静的解析による不要コードの除去
- 副作用のないモジュールの最適化

### 5. アセット最適化

- 画像は4KB以下の場合インライン化
- フォントとアセットは専用ディレクトリに整理
- CSSコード分割による並列ロード

## パフォーマンス監視

### Web Vitals

以下のメトリクスを自動的に測定：

- **LCP (Largest Contentful Paint)**: 最大コンテンツの描画時間
- **CLS (Cumulative Layout Shift)**: 累積レイアウトシフト
- **FCP (First Contentful Paint)**: 初回コンテンツ描画
- **TTFB (Time to First Byte)**: 最初のバイトまでの時間
- **INP (Interaction to Next Paint)**: 次の描画までのインタラクション時間

### プリロード戦略

1. **リンクホバー時のプリロード**: ユーザーがリンクにホバーした際に遷移先をプリロード
2. **DNSプリフェッチ**: 外部ドメインのDNS解決を事前に実行
3. **リソースヒント**: 重要なリソースにプリロードヒントを追加

## ビルドコマンド

### 開発環境

```bash
npm run dev
```

### 本番ビルド

```bash
npm run build:production
```

### ステージング環境ビルド

```bash
npm run build:staging
```

### バンドルサイズ分析

```bash
npm run build:analyze
```

分析結果は `dist/stats.html` に出力されます。

### ビルドサイズ確認

```bash
npm run size
```

## 環境別設定

### 環境変数ファイル

- `.env`: デフォルト環境変数
- `.env.development`: 開発環境
- `.env.staging`: ステージング環境
- `.env.production`: 本番環境

### ビルド最適化の設定

本番環境では以下が有効化されます：

- ソースマップの無効化
- コンソールログの削除
- デバッガーステートメントの削除
- Terser圧縮の最大化

## 最適化の効果

### 初期バンドルサイズ目標

- 初期バンドル: < 200KB（圧縮後）
- 各ルートチャンク: < 100KB

### パフォーマンス目標

- LCP: < 2.5秒
- CLS: < 0.1
- INP: < 200ms

## トラブルシューティング

### ビルドサイズが大きい場合

1. `npm run build:analyze` でバンドル分析を実行
2. 大きな依存関係を確認
3. 動的インポートの追加を検討

### パフォーマンスが悪い場合

1. Web Vitalsメトリクスを確認
2. Chrome DevToolsのPerformanceタブで分析
3. 画像やフォントの最適化を検討

## 継続的な改善

1. 定期的にバンドルサイズを監視
2. 新しい依存関係追加時は影響を確認
3. パフォーマンスメトリクスの定期的なレビュー
