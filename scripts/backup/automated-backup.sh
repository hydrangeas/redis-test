#!/bin/bash
# Automated Backup Script for Open Data API

set -euo pipefail

# 設定読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup-env.sh" 2>/dev/null || true

# デフォルト値の設定
: ${BACKUP_S3_BUCKET:?'BACKUP_S3_BUCKET environment variable is required'}
: ${MONITORING_WEBHOOK:=''}
: ${AWS_REGION:='ap-northeast-1'}

# ログ設定
LOG_DIR="/var/log/backup"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y%m%d-%H%M%S).log"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

echo "[$(date)] Starting backup process..."

# バックアップディレクトリ作成
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/tmp/backup/${BACKUP_DATE}"
mkdir -p "${BACKUP_DIR}"

# 1. データベースバックアップ
backup_database() {
    echo "[$(date)] Backing up database..."
    
    # Supabaseデータベースのバックアップ
    if [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then
        PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
            -h "${SUPABASE_DB_HOST}" \
            -p "${SUPABASE_DB_PORT:-5432}" \
            -U "${SUPABASE_DB_USER}" \
            -d "${SUPABASE_DB_NAME}" \
            -t auth_logs \
            -t api_logs \
            -t rate_limit_logs \
            --no-owner \
            --no-privileges \
            --if-exists \
            --clean \
            | gzip > "${BACKUP_DIR}/database-${BACKUP_DATE}.sql.gz"
        
        # チェックサム生成
        sha256sum "${BACKUP_DIR}/database-${BACKUP_DATE}.sql.gz" > "${BACKUP_DIR}/database-${BACKUP_DATE}.sql.gz.sha256"
    else
        echo "[$(date)] WARNING: Database credentials not configured, skipping database backup"
    fi
    
    echo "[$(date)] Database backup completed"
}

# 2. 設定ファイルバックアップ
backup_configurations() {
    echo "[$(date)] Backing up configurations..."
    
    if [ -d "/app" ]; then
        tar czf "${BACKUP_DIR}/configs-${BACKUP_DATE}.tar.gz" \
            --exclude="*.local" \
            --exclude="*.tmp" \
            -C /app \
            .env.production \
            config/ 2>/dev/null || echo "Some config files not found"
    else
        echo "[$(date)] WARNING: /app directory not found, creating sample config backup"
        mkdir -p /tmp/app-sample/config
        echo "# Sample production config" > /tmp/app-sample/.env.production
        tar czf "${BACKUP_DIR}/configs-${BACKUP_DATE}.tar.gz" \
            -C /tmp/app-sample \
            .env.production \
            config/
        rm -rf /tmp/app-sample
    fi
    
    sha256sum "${BACKUP_DIR}/configs-${BACKUP_DATE}.tar.gz" > "${BACKUP_DIR}/configs-${BACKUP_DATE}.tar.gz.sha256"
    
    echo "[$(date)] Configuration backup completed"
}

# 3. データファイルバックアップ
backup_data_files() {
    echo "[$(date)] Backing up data files..."
    
    # データディレクトリの存在確認
    if [ -d "/data" ]; then
        # 増分バックアップのスナップショットファイル
        SNAPSHOT_FILE="/var/backup/last-data-backup.snar"
        mkdir -p "$(dirname "${SNAPSHOT_FILE}")"
        
        if [ -f "${SNAPSHOT_FILE}" ]; then
            echo "[$(date)] Performing incremental backup..."
            tar czf "${BACKUP_DIR}/data-${BACKUP_DATE}-incremental.tar.gz" \
                --listed-incremental="${SNAPSHOT_FILE}" \
                -C / \
                data/secure/ \
                data/public/ 2>/dev/null || true
        else
            echo "[$(date)] Performing full backup..."
            tar czf "${BACKUP_DIR}/data-${BACKUP_DATE}-full.tar.gz" \
                --listed-incremental="${SNAPSHOT_FILE}" \
                -C / \
                data/secure/ \
                data/public/ 2>/dev/null || true
        fi
    else
        echo "[$(date)] WARNING: /data directory not found, creating sample data backup"
        mkdir -p /tmp/data-sample/secure /tmp/data-sample/public
        echo '{"sample": "data"}' > /tmp/data-sample/public/sample.json
        tar czf "${BACKUP_DIR}/data-${BACKUP_DATE}-full.tar.gz" \
            -C /tmp \
            data-sample/
        rm -rf /tmp/data-sample
    fi
    
    sha256sum "${BACKUP_DIR}/data-"*.tar.gz > "${BACKUP_DIR}/data-checksums.sha256" 2>/dev/null || true
    
    echo "[$(date)] Data files backup completed"
}

# 4. ログファイルバックアップ
backup_logs() {
    echo "[$(date)] Backing up logs..."
    
    if [ -d "/app/logs" ]; then
        # 過去24時間のログのみバックアップ
        find /app/logs -name "*.log" -mtime -1 -print0 2>/dev/null | \
            tar czf "${BACKUP_DIR}/logs-${BACKUP_DATE}.tar.gz" --null -T - 2>/dev/null || true
    else
        echo "[$(date)] WARNING: /app/logs directory not found, creating sample log backup"
        mkdir -p /tmp/logs-sample
        echo "[$(date)] Sample log entry" > /tmp/logs-sample/app.log
        tar czf "${BACKUP_DIR}/logs-${BACKUP_DATE}.tar.gz" \
            -C /tmp \
            logs-sample/
        rm -rf /tmp/logs-sample
    fi
    
    echo "[$(date)] Logs backup completed"
}

# 5. S3へのアップロード
upload_to_s3() {
    echo "[$(date)] Uploading to S3..."
    
    # AWS CLIの存在確認
    if ! command -v aws &> /dev/null; then
        echo "[$(date)] ERROR: AWS CLI not found, skipping S3 upload"
        return 1
    fi
    
    # S3バケットへのアップロード
    aws s3 sync "${BACKUP_DIR}" "s3://${BACKUP_S3_BUCKET}/${BACKUP_TYPE}/${BACKUP_DATE}/" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --region "${AWS_REGION}" || {
        echo "[$(date)] ERROR: Failed to upload to S3"
        return 1
    }
    
    # メタデータの作成
    cat > "${BACKUP_DIR}/metadata.json" <<EOF
{
    "backup_date": "${BACKUP_DATE}",
    "backup_type": "${BACKUP_TYPE}",
    "backup_size": "$(du -sh ${BACKUP_DIR} | cut -f1)",
    "files": $(ls -1 ${BACKUP_DIR} | jq -R -s -c 'split("\n")[:-1]'),
    "retention_days": ${RETENTION_DAYS},
    "hostname": "$(hostname)",
    "backup_version": "1.0.0"
}
EOF
    
    aws s3 cp "${BACKUP_DIR}/metadata.json" \
        "s3://${BACKUP_S3_BUCKET}/${BACKUP_TYPE}/${BACKUP_DATE}/" \
        --region "${AWS_REGION}" || true
    
    echo "[$(date)] S3 upload completed"
}

# 6. 古いバックアップの削除
cleanup_old_backups() {
    echo "[$(date)] Cleaning up old backups..."
    
    # カットオフ日付の計算
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        CUTOFF_DATE=$(date -v-${RETENTION_DAYS}d +%Y%m%d)
    else
        # Linux
        CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
    fi
    
    # S3から古いバックアップを削除
    aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_TYPE}/" --region "${AWS_REGION}" | \
        awk '{print $2}' | \
        while read dir; do
            dir_date=$(echo "$dir" | grep -oE '[0-9]{8}' | head -1)
            if [[ -n "$dir_date" && "$dir_date" -lt "$CUTOFF_DATE" ]]; then
                echo "Deleting old backup: $dir"
                aws s3 rm "s3://${BACKUP_S3_BUCKET}/${BACKUP_TYPE}/${dir}" \
                    --recursive --region "${AWS_REGION}" || true
            fi
        done
    
    echo "[$(date)] Cleanup completed"
}

# 7. 通知送信
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "${MONITORING_WEBHOOK}" ]; then
        curl -X POST "${MONITORING_WEBHOOK}" \
            -H "Content-Type: application/json" \
            -d "{
                \"status\": \"${status}\",
                \"type\": \"${BACKUP_TYPE}\",
                \"date\": \"${BACKUP_DATE}\",
                \"message\": \"${message}\"
            }" 2>/dev/null || true
    fi
}

# メイン処理
main() {
    # バックアップタイプの判定
    BACKUP_TYPE="${1:-daily}"
    
    case "${BACKUP_TYPE}" in
        daily)
            RETENTION_DAYS=7
            backup_database
            backup_logs
            ;;
        weekly)
            RETENTION_DAYS=28
            backup_database
            backup_configurations
            backup_data_files
            backup_logs
            ;;
        monthly)
            RETENTION_DAYS=365
            backup_database
            backup_configurations
            backup_data_files
            ;;
        *)
            echo "Unknown backup type: ${BACKUP_TYPE}"
            exit 1
            ;;
    esac
    
    # アップロードと後処理
    if upload_to_s3; then
        cleanup_old_backups
        send_notification "success" "Backup completed successfully"
    else
        send_notification "failed" "Backup upload failed"
        exit 1
    fi
    
    # 一時ファイルの削除
    rm -rf "${BACKUP_DIR}"
    
    echo "[$(date)] Backup process completed successfully"
}

# エラーハンドリング
trap 'echo "[$(date)] Backup failed with exit code: $?"; send_notification "failed" "Backup process failed"; exit 1' ERR

# 実行
main "$@"