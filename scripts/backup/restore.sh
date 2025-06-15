#!/bin/bash
# Restore Script for Open Data API

set -euo pipefail

# 設定読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup-env.sh" 2>/dev/null || true

# デフォルト値
: ${BACKUP_S3_BUCKET:?'BACKUP_S3_BUCKET environment variable is required'}
: ${AWS_REGION:='ap-northeast-1'}

# 使用方法の表示
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]
Options:
    -d, --date YYYYMMDD-HHMMSS    Backup date to restore
    -t, --type TYPE                Backup type (daily/weekly/monthly)
    -c, --component COMPONENT      Component to restore (database/configs/data/logs/all)
    -y, --yes                      Skip confirmation
    -h, --help                     Show this help message

Examples:
    # Restore database from daily backup
    $0 -d 20240315-020000 -t daily -c database

    # Restore all components without confirmation
    $0 -d 20240315-020000 -t weekly -c all -y
EOF
    exit 1
}

# パラメータ解析
BACKUP_DATE=""
BACKUP_TYPE="daily"
COMPONENT="all"
SKIP_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--date) BACKUP_DATE="$2"; shift 2 ;;
        -t|--type) BACKUP_TYPE="$2"; shift 2 ;;
        -c|--component) COMPONENT="$2"; shift 2 ;;
        -y|--yes) SKIP_CONFIRM=true; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

# 最新のバックアップを取得
if [ -z "$BACKUP_DATE" ] || [ "$BACKUP_DATE" = "latest" ]; then
    echo "Finding latest backup..."
    BACKUP_DATE=$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_TYPE}/" --region "${AWS_REGION}" | \
        grep PRE | awk '{print $2}' | sed 's/\///' | sort -r | head -1)
    
    if [ -z "$BACKUP_DATE" ]; then
        echo "Error: No backups found for type ${BACKUP_TYPE}"
        exit 1
    fi
    echo "Latest backup found: ${BACKUP_DATE}"
fi

# リストア確認
if [ "$SKIP_CONFIRM" = false ]; then
    echo "========================================="
    echo "WARNING: This will restore data from backup"
    echo "Backup Date: ${BACKUP_DATE}"
    echo "Backup Type: ${BACKUP_TYPE}"
    echo "Component: ${COMPONENT}"
    echo "========================================="
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi
fi

# リストアディレクトリの準備
RESTORE_DIR="/tmp/restore/${BACKUP_DATE}"
mkdir -p "${RESTORE_DIR}"

echo "[$(date)] Starting restore process..."

# S3からバックアップをダウンロード
download_backup() {
    echo "[$(date)] Downloading backup from S3..."
    
    aws s3 sync "s3://${BACKUP_S3_BUCKET}/${BACKUP_TYPE}/${BACKUP_DATE}/" "${RESTORE_DIR}/" \
        --region "${AWS_REGION}"
    
    # メタデータの確認
    if [ -f "${RESTORE_DIR}/metadata.json" ]; then
        echo "[$(date)] Backup metadata:"
        cat "${RESTORE_DIR}/metadata.json" | jq .
    fi
}

# チェックサム検証
verify_checksums() {
    echo "[$(date)] Verifying checksums..."
    
    cd "${RESTORE_DIR}"
    for checksum_file in *.sha256; do
        if [ -f "$checksum_file" ]; then
            sha256sum -c "$checksum_file" || {
                echo "ERROR: Checksum verification failed for $checksum_file"
                exit 1
            }
        fi
    done
    cd - > /dev/null
}

# データベースのリストア
restore_database() {
    echo "[$(date)] Restoring database..."
    
    local db_backup=$(ls "${RESTORE_DIR}"/database-*.sql.gz 2>/dev/null | head -1)
    
    if [ -z "$db_backup" ]; then
        echo "WARNING: No database backup found"
        return 1
    fi
    
    # データベース接続情報の確認
    if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
        echo "WARNING: Database credentials not configured"
        echo "Please set SUPABASE_DB_* environment variables"
        return 1
    fi
    
    # 既存データのバックアップ（安全のため）
    echo "[$(date)] Creating safety backup of current database..."
    SAFETY_BACKUP="/tmp/safety-backup-$(date +%Y%m%d-%H%M%S).sql.gz"
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
        -h "${SUPABASE_DB_HOST}" \
        -p "${SUPABASE_DB_PORT:-5432}" \
        -U "${SUPABASE_DB_USER}" \
        -d "${SUPABASE_DB_NAME}" \
        | gzip > "${SAFETY_BACKUP}" || true
    
    echo "Safety backup created: ${SAFETY_BACKUP}"
    
    # リストア実行
    echo "[$(date)] Executing database restore..."
    gunzip -c "$db_backup" | \
        PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql \
            -h "${SUPABASE_DB_HOST}" \
            -p "${SUPABASE_DB_PORT:-5432}" \
            -U "${SUPABASE_DB_USER}" \
            -d "${SUPABASE_DB_NAME}" \
            -v ON_ERROR_STOP=1
    
    echo "[$(date)] Database restore completed"
}

# 設定ファイルのリストア
restore_configs() {
    echo "[$(date)] Restoring configurations..."
    
    local config_backup=$(ls "${RESTORE_DIR}"/configs-*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$config_backup" ]; then
        echo "WARNING: No configuration backup found"
        return 1
    fi
    
    # バックアップディレクトリの作成
    if [ -d "/app" ]; then
        # 既存設定のバックアップ
        echo "[$(date)] Backing up current configurations..."
        tar czf "/tmp/configs-backup-$(date +%Y%m%d-%H%M%S).tar.gz" \
            -C /app \
            .env.production \
            config/ 2>/dev/null || true
        
        # リストア実行
        tar xzf "$config_backup" -C /app/
    else
        echo "WARNING: /app directory not found"
        echo "Extracting to /tmp/restored-configs for manual restoration"
        mkdir -p /tmp/restored-configs
        tar xzf "$config_backup" -C /tmp/restored-configs/
        echo "Configs extracted to: /tmp/restored-configs/"
    fi
    
    echo "[$(date)] Configuration restore completed"
}

# データファイルのリストア
restore_data() {
    echo "[$(date)] Restoring data files..."
    
    local data_backup=$(ls "${RESTORE_DIR}"/data-*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$data_backup" ]; then
        echo "WARNING: No data backup found"
        return 1
    fi
    
    # リストア先の確認
    if [ -d "/data" ]; then
        # 既存データのバックアップ
        echo "[$(date)] Backing up current data..."
        tar czf "/tmp/data-backup-$(date +%Y%m%d-%H%M%S).tar.gz" \
            -C / \
            data/ 2>/dev/null || true
        
        # リストア実行
        tar xzf "$data_backup" -C /
    else
        echo "WARNING: /data directory not found"
        echo "Extracting to /tmp/restored-data for manual restoration"
        mkdir -p /tmp/restored-data
        tar xzf "$data_backup" -C /tmp/restored-data/
        echo "Data extracted to: /tmp/restored-data/"
    fi
    
    echo "[$(date)] Data restore completed"
}

# ログファイルのリストア
restore_logs() {
    echo "[$(date)] Restoring logs..."
    
    local logs_backup=$(ls "${RESTORE_DIR}"/logs-*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$logs_backup" ]; then
        echo "WARNING: No logs backup found"
        return 1
    fi
    
    # リストア先の準備
    if [ -d "/app/logs" ]; then
        tar xzf "$logs_backup" -C /app/logs/
    else
        echo "WARNING: /app/logs directory not found"
        echo "Extracting to /tmp/restored-logs for manual restoration"
        mkdir -p /tmp/restored-logs
        tar xzf "$logs_backup" -C /tmp/restored-logs/
        echo "Logs extracted to: /tmp/restored-logs/"
    fi
    
    echo "[$(date)] Logs restore completed"
}

# メイン処理
main() {
    # バックアップのダウンロード
    download_backup
    
    # チェックサム検証
    verify_checksums
    
    # コンポーネント別リストア
    case "${COMPONENT}" in
        database)
            restore_database
            ;;
        configs)
            restore_configs
            ;;
        data)
            restore_data
            ;;
        logs)
            restore_logs
            ;;
        all)
            # すべてのコンポーネントをリストア
            echo "[$(date)] Restoring all components..."
            restore_database || echo "Database restore skipped/failed"
            restore_configs || echo "Configs restore skipped/failed"
            restore_data || echo "Data restore skipped/failed"
            restore_logs || echo "Logs restore skipped/failed"
            ;;
        *)
            echo "Unknown component: ${COMPONENT}"
            exit 1
            ;;
    esac
    
    # クリーンアップ
    rm -rf "${RESTORE_DIR}"
    
    echo "[$(date)] Restore process completed"
    echo "========================================="
    echo "IMPORTANT: Please verify the restored data"
    echo "and restart the application if necessary"
    echo "========================================="
}

# エラーハンドリング
trap 'echo "[$(date)] Restore failed with exit code: $?"; exit 1' ERR

# 実行
main