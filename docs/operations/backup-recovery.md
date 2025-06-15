# バックアップとリカバリー手順書

## 概要

本ドキュメントは、Open Data APIシステムのバックアップとリカバリー手順を定義します。システムの重要データを保護し、障害発生時の迅速な復旧を可能にするための包括的なガイドラインです。

## 目次

1. [バックアップ対象](#バックアップ対象)
2. [バックアップスケジュール](#バックアップスケジュール)
3. [バックアップ手順](#バックアップ手順)
4. [リストア手順](#リストア手順)
5. [災害復旧計画](#災害復旧計画)
6. [監視とテスト](#監視とテスト)

## バックアップ対象

### 1. データベース（Supabase）
- **対象テーブル**
  - `auth_logs` - 認証ログ
  - `api_logs` - APIアクセスログ
  - `rate_limit_logs` - レート制限ログ
- **バックアップ方法**: pg_dump
- **圧縮形式**: gzip

### 2. アプリケーション設定
- **対象ファイル**
  - `.env.production` - 本番環境設定
  - `config/` ディレクトリ - アプリケーション設定
- **除外対象**
  - `*.local` - ローカル設定ファイル
  - `*.tmp` - 一時ファイル

### 3. 静的データファイル
- **対象ディレクトリ**
  - `/data/secure/` - セキュアなデータファイル
  - `/data/public/` - 公開データファイル
- **バックアップ方法**: 増分バックアップ（tar）
- **圧縮形式**: tar.gz

### 4. アプリケーションログ
- **対象ディレクトリ**
  - `/app/logs/` - アプリケーションログ
- **保持期間**: 30日分
- **圧縮形式**: gzip

## バックアップスケジュール

| タイプ | 実行時刻 | 対象 | 保持期間 |
|--------|----------|------|----------|
| 日次 | 毎日 02:00 | データベース、ログ | 7日間 |
| 週次 | 日曜 03:00 | 全データ | 4週間 |
| 月次 | 月初 04:00 | データベース、設定、データファイル | 12ヶ月 |

## バックアップ手順

### 自動バックアップ

自動バックアップはcronジョブとして設定されています：

```bash
# crontab設定
0 2 * * * /app/scripts/backup/automated-backup.sh daily
0 3 * * 0 /app/scripts/backup/automated-backup.sh weekly
0 4 1 * * /app/scripts/backup/automated-backup.sh monthly
```

### 手動バックアップ

緊急時や特定のタイミングでバックアップが必要な場合：

```bash
# 日次バックアップの実行
./scripts/backup/automated-backup.sh daily

# 全データの完全バックアップ
./scripts/backup/automated-backup.sh monthly
```

### バックアップの確認

バックアップが正常に完了したことを確認：

```bash
# S3バケットの確認
aws s3 ls s3://your-backup-bucket/daily/

# 最新のバックアップメタデータ確認
aws s3 cp s3://your-backup-bucket/daily/latest/metadata.json - | jq .
```

## リストア手順

### 1. リストア前の準備

```bash
# リストア可能なバックアップの確認
./scripts/backup/list-backups.sh

# システムの停止（必要に応じて）
systemctl stop opendata-api
```

### 2. データベースのリストア

```bash
# 特定日付のデータベースをリストア
./scripts/backup/restore.sh -d 20240315-020000 -t daily -c database

# 確認プロンプトをスキップして実行
./scripts/backup/restore.sh -d 20240315-020000 -t daily -c database -y
```

### 3. 設定ファイルのリストア

```bash
# 設定ファイルのリストア
./scripts/backup/restore.sh -d 20240315-020000 -t weekly -c configs

# リストア後の確認
ls -la /app/.env.production
ls -la /app/config/
```

### 4. データファイルのリストア

```bash
# データファイルのリストア（増分バックアップ対応）
./scripts/backup/restore.sh -d 20240315-020000 -t weekly -c data

# データ整合性の確認
find /data -type f -name "*.json" | wc -l
```

### 5. 全データのリストア

```bash
# すべてのコンポーネントを一括リストア
./scripts/backup/restore.sh -d 20240315-020000 -t weekly -c all
```

## 災害復旧計画

### 復旧目標

- **RTO (Recovery Time Objective)**: 4時間以内
- **RPO (Recovery Point Objective)**: 24時間以内

### 災害シナリオ別対応

#### シナリオ1: データベース障害

**症状**: Supabaseデータベースへの接続エラー

**対応手順**:
1. Supabaseステータスページで障害情報を確認
2. 読み取り専用モードへの切り替え
   ```bash
   # アプリケーションを読み取り専用モードに設定
   export READ_ONLY_MODE=true
   systemctl restart opendata-api
   ```
3. 最新のバックアップからリストア
   ```bash
   ./scripts/backup/restore.sh -d latest -t daily -c database -y
   ```
4. データ整合性の確認とテスト

#### シナリオ2: アプリケーション障害

**症状**: APIサービスが応答しない

**対応手順**:
1. Vercelダッシュボードで状態確認
2. 前のデプロイメントへロールバック
   ```bash
   vercel rollback
   ```
3. ログ分析で原因特定
   ```bash
   vercel logs --since 1h
   ```
4. 修正版のデプロイ

#### シナリオ3: データ損失

**症状**: ファイルやデータの消失

**対応手順**:
1. 損失範囲の特定
   ```bash
   # 差分確認
   ./scripts/backup/compare-with-backup.sh
   ```
2. 該当データのリストア
3. 差分データの手動復旧
4. データ検証

### 復旧フェーズ

#### Phase 1: 初期対応（0-30分）
- [ ] インシデント検知と確認
- [ ] 影響範囲の評価
- [ ] ステークホルダーへの通知
- [ ] 一時的な対策実施

#### Phase 2: 復旧作業（30分-3時間）
- [ ] 復旧計画の決定
- [ ] バックアップからのリストア
- [ ] システム再起動と検証
- [ ] 基本機能の確認

#### Phase 3: 完全復旧（3-4時間）
- [ ] 全機能の動作確認
- [ ] パフォーマンステスト
- [ ] ユーザーへの復旧通知
- [ ] インシデントレポート作成

## 監視とテスト

### バックアップ監視

```bash
# バックアップ健全性チェック
npm run backup:health-check

# 出力例：
# daily: ✓ - Backup is up to date
# weekly: ✓ - Backup is up to date
# monthly: ✗ - Last backup is 35 days old
```

### 定期テスト

#### 四半期ごとのリストアテスト

1. テスト環境の準備
2. バックアップからの完全リストア
3. データ整合性の確認
4. アプリケーション動作確認
5. テスト結果の記録

#### 年次災害復旧訓練

1. 本番環境相当の環境準備
2. 災害シナリオの実行
3. 復旧手順の実施
4. RTO/RPO達成の確認
5. 改善点の洗い出し

### チェックリスト

#### 日次チェック
- [ ] 自動バックアップの成功確認
- [ ] バックアップサイズの確認
- [ ] エラーログの確認

#### 週次チェック
- [ ] バックアップファイルの整合性確認
- [ ] ストレージ使用量の確認
- [ ] 古いバックアップの削除確認

#### 月次チェック
- [ ] リストアテストの実施
- [ ] バックアップ手順書の見直し
- [ ] 災害復旧計画の更新

## トラブルシューティング

### よくある問題と対処法

#### バックアップが失敗する
```bash
# ログ確認
tail -f /var/log/backup/backup-*.log

# 一般的な原因：
# - ディスク容量不足
# - S3権限エラー
# - データベース接続エラー
```

#### リストアが失敗する
```bash
# チェックサムエラーの場合
sha256sum -c backup.sha256

# 権限エラーの場合
sudo chown -R app:app /app/
```

#### バックアップが遅い
```bash
# 並列処理の調整
export BACKUP_PARALLEL_JOBS=4

# 圧縮レベルの調整
export GZIP_LEVEL=6
```

## 連絡先

### 緊急連絡先

- **インシデント管理者**: incident-manager@example.com
- **技術リード**: tech-lead@example.com
- **インフラチーム**: infra-team@example.com

### エスカレーションパス

1. L1: オンコールエンジニア
2. L2: 技術リード
3. L3: CTO/インフラマネージャー

## 付録

### A. 環境変数

```bash
# バックアップ設定
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_GCS_BUCKET=your-gcs-backup-bucket
AWS_REGION=ap-northeast-1

# データベース接続
SUPABASE_DB_HOST=db.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password

# 監視
MONITORING_WEBHOOK=https://your-monitoring-system/webhook
```

### B. 必要なツール

- AWS CLI v2
- PostgreSQL クライアント (pg_dump, psql)
- tar, gzip
- jq
- sha256sum

### C. 参考リンク

- [Supabase バックアップガイド](https://supabase.com/docs/guides/platform/backups)
- [AWS S3 ライフサイクルポリシー](https://docs.aws.amazon.com/s3/lifecycle)
- [災害復旧のベストプラクティス](https://aws.amazon.com/disaster-recovery/)

---

最終更新日: 2024年3月15日
バージョン: 1.0.0