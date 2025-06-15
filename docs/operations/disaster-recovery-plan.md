# 災害復旧計画（Disaster Recovery Plan）

## 1. 目的と範囲

本計画は、Open Data APIシステムにおける災害や重大な障害発生時の復旧手順を定義し、ビジネス継続性を確保することを目的とします。

### 対象システム
- Open Data API (Fastify/TypeScript)
- Supabase (認証・データベース)
- Vercel (ホスティング)
- 静的データファイル

### 対象災害・障害
- システム障害（ハードウェア/ソフトウェア）
- データ損失・破損
- セキュリティインシデント
- 自然災害
- 人的ミス

## 2. 復旧目標

| 指標 | 目標値 | 説明 |
|------|--------|------|
| **RTO** (Recovery Time Objective) | 4時間 | システム復旧までの目標時間 |
| **RPO** (Recovery Point Objective) | 24時間 | 許容可能なデータ損失期間 |
| **MTTR** (Mean Time To Recovery) | 2時間 | 平均復旧時間 |

## 3. 役割と責任

### 災害対策チーム

| 役割 | 責任 | 連絡先 |
|------|------|--------|
| インシデント管理者 | 全体統括、意思決定 | incident-manager@example.com |
| 技術リード | 技術的対応の指揮 | tech-lead@example.com |
| インフラ担当 | インフラ復旧作業 | infra-team@example.com |
| コミュニケーション担当 | ステークホルダー連絡 | comm-team@example.com |

### エスカレーションパス

1. **L1**: オンコールエンジニア（初期対応）
2. **L2**: 技術リード（技術判断）
3. **L3**: CTO/経営層（ビジネス判断）

## 4. 災害シナリオと対応手順

### シナリオ1: データベース完全障害

**症状**: 
- Supabaseデータベースへの接続が完全に失敗
- データの読み書きが不可能

**重要度**: Critical

**対応手順**:

1. **初期対応（0-15分）**
   ```bash
   # 状態確認
   curl -f https://api.supabase.com/v1/status || echo "Supabase is down"
   
   # アプリケーションを読み取り専用モードに切り替え
   vercel env pull
   vercel env add READ_ONLY_MODE true
   vercel --prod
   ```

2. **バックアップからのリストア（15-60分）**
   ```bash
   # 最新のデータベースバックアップを確認
   ./scripts/backup/list-backups.sh
   
   # データベースのリストア
   ./scripts/backup/restore.sh -d latest -t daily -c database -y
   ```

3. **検証と復旧（60-120分）**
   ```bash
   # データ整合性チェック
   npm run db:verify
   
   # アプリケーション再起動
   vercel env rm READ_ONLY_MODE
   vercel --prod
   ```

### シナリオ2: アプリケーション全面障害

**症状**: 
- APIが完全に応答しない
- Vercelでのデプロイが失敗

**重要度**: Critical

**対応手順**:

1. **緊急ロールバック（0-10分）**
   ```bash
   # 前のバージョンにロールバック
   vercel rollback
   
   # または特定のデプロイメントに戻す
   vercel alias set [deployment-url] [production-domain]
   ```

2. **原因調査（10-30分）**
   ```bash
   # エラーログの確認
   vercel logs --since 1h --error
   
   # ビルドログの確認
   vercel inspect [deployment-id]
   ```

3. **修正デプロイ（30-60分）**
   ```bash
   # ローカルでの動作確認
   npm run build
   npm run test
   
   # 修正版のデプロイ
   git push origin hotfix/emergency-fix
   vercel --prod
   ```

### シナリオ3: データ破損・消失

**症状**: 
- 特定のデータが読み取れない
- データの不整合が発生

**重要度**: High

**対応手順**:

1. **影響範囲の特定（0-30分）**
   ```bash
   # 破損データの特定
   ./scripts/data/verify-integrity.sh
   
   # 影響を受けるユーザーの特定
   npm run users:affected
   ```

2. **部分リストア（30-90分）**
   ```bash
   # 特定期間のデータをリストア
   ./scripts/backup/restore.sh -d 20240315-020000 -t daily -c data
   
   # 差分データの適用
   npm run data:merge-incremental
   ```

3. **データ修復（90-180分）**
   ```bash
   # データ整合性の修復
   npm run data:repair
   
   # 影響を受けたユーザーへの通知
   npm run notify:affected-users
   ```

### シナリオ4: セキュリティインシデント

**症状**: 
- 不正アクセスの検知
- データ漏洩の可能性

**重要度**: Critical

**対応手順**:

1. **即時対応（0-5分）**
   ```bash
   # すべてのアクセストークンを無効化
   npm run security:revoke-all-tokens
   
   # 一時的なアクセス制限
   vercel env add MAINTENANCE_MODE true
   vercel --prod
   ```

2. **調査と封じ込め（5-60分）**
   ```bash
   # アクセスログの分析
   npm run logs:analyze-security
   
   # 影響範囲の特定
   npm run security:impact-assessment
   ```

3. **復旧と強化（60-240分）**
   ```bash
   # セキュリティパッチの適用
   npm update
   npm audit fix
   
   # 新しい認証キーの生成
   npm run security:rotate-keys
   
   # システム再開
   vercel env rm MAINTENANCE_MODE
   vercel --prod
   ```

## 5. 復旧手順チェックリスト

### Phase 1: 検知と評価（0-30分）

- [ ] インシデントの検知と確認
- [ ] 災害対策チームの招集
- [ ] 影響範囲の初期評価
- [ ] ステークホルダーへの初期連絡
- [ ] 復旧戦略の決定

### Phase 2: 緊急対応（30分-1時間）

- [ ] システムの安全な停止（必要な場合）
- [ ] データの保全措置
- [ ] 一時的な代替手段の実施
- [ ] ユーザーへの緊急通知

### Phase 3: 復旧作業（1-3時間）

- [ ] バックアップからのリストア開始
- [ ] システムコンポーネントの復旧
- [ ] データ整合性の確認
- [ ] 基本機能のテスト

### Phase 4: 検証と再開（3-4時間）

- [ ] 全機能の動作確認
- [ ] パフォーマンステスト
- [ ] セキュリティチェック
- [ ] 段階的なサービス再開

### Phase 5: 事後対応（復旧後）

- [ ] インシデントレポートの作成
- [ ] 根本原因の分析
- [ ] 再発防止策の策定
- [ ] 災害復旧計画の見直し

## 6. コミュニケーション計画

### 内部連絡

```yaml
通知テンプレート:
  件名: "[INCIDENT] {severity} - {description}"
  本文: |
    発生時刻: {timestamp}
    影響: {impact}
    現在の状況: {status}
    次のアクション: {next_action}
    推定復旧時間: {eta}
```

### 外部連絡（ユーザー向け）

```yaml
ステータスページ更新:
  - 5分以内: 初期通知
  - 30分ごと: 進捗更新
  - 復旧時: 完了通知
  
通知チャネル:
  - Webサイトバナー
  - ステータスページ
  - メール（重大障害時）
  - SNS（オプション）
```

## 7. テストとメンテナンス

### 定期テスト計画

| テスト種別 | 頻度 | 内容 |
|------------|------|------|
| バックアップ検証 | 週次 | バックアップファイルの整合性確認 |
| 部分リストアテスト | 月次 | 単一コンポーネントのリストア |
| フルリストアテスト | 四半期 | 全システムのリストア |
| 災害復旧訓練 | 年次 | 完全なDRシナリオの実施 |

### テスト実施手順

1. **テスト環境の準備**
   ```bash
   # DR環境の構築
   npm run dr:setup-test-env
   ```

2. **シナリオの実行**
   ```bash
   # 特定シナリオのテスト
   npm run dr:test --scenario=database-failure
   ```

3. **結果の評価**
   - RTO/RPO達成状況
   - 手順の有効性
   - 改善点の特定

## 8. 重要な連絡先とリソース

### システムアクセス情報

| システム | URL/アクセス方法 | 備考 |
|----------|-----------------|------|
| Vercel Dashboard | https://vercel.com/dashboard | 要2FA |
| Supabase Console | https://app.supabase.com | 要SSO |
| AWS Console | https://console.aws.amazon.com | 要MFA |
| 監視ダッシュボード | https://monitoring.example.com | VPN必須 |

### ベンダーサポート

| ベンダー | サポート窓口 | 契約レベル |
|----------|-------------|------------|
| Vercel | support@vercel.com | Enterprise |
| Supabase | support@supabase.io | Pro |
| AWS | AWS Support Center | Business |

## 9. 付録

### A. コマンドリファレンス

```bash
# システム状態確認
npm run health:check

# 緊急停止
npm run emergency:stop

# データ検証
npm run data:verify

# ログ分析
npm run logs:analyze --since="1 hour ago"

# バックアップ状態
npm run backup:status
```

### B. トラブルシューティングガイド

| 症状 | 可能性のある原因 | 対処法 |
|------|-----------------|--------|
| DB接続エラー | ネットワーク、認証、容量 | 接続設定確認、認証更新 |
| API 503エラー | 過負荷、デプロイ失敗 | スケーリング、ロールバック |
| データ不整合 | 同期エラー、破損 | 整合性チェック、リストア |

### C. 更新履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2024-03-15 | 1.0.0 | 初版作成 |

---

**重要**: この計画は定期的に見直し、実際のインシデントやテスト結果に基づいて更新してください。