#!/bin/bash
# List available backups

set -euo pipefail

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/backup-env.sh" 2>/dev/null || true

# Default values
: ${BACKUP_S3_BUCKET:?'BACKUP_S3_BUCKET environment variable is required'}
: ${AWS_REGION:='ap-northeast-1'}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Available Backups in S3 Bucket: ${BACKUP_S3_BUCKET}"
echo "============================================="

# Function to format file size
format_size() {
    local size=$1
    if [ $size -ge 1073741824 ]; then
        echo "$(echo "scale=2; $size/1073741824" | bc)G"
    elif [ $size -ge 1048576 ]; then
        echo "$(echo "scale=2; $size/1048576" | bc)M"
    elif [ $size -ge 1024 ]; then
        echo "$(echo "scale=2; $size/1024" | bc)K"
    else
        echo "${size}B"
    fi
}

# List backups for each type
for backup_type in daily weekly monthly; do
    echo -e "\n${YELLOW}${backup_type^^} BACKUPS:${NC}"
    echo "-------------------"
    
    # Get list of backup directories
    backup_dirs=$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/${backup_type}/" --region "${AWS_REGION}" 2>/dev/null | grep PRE | awk '{print $2}' | sed 's/\///' | sort -r)
    
    if [ -z "$backup_dirs" ]; then
        echo -e "${RED}No backups found${NC}"
        continue
    fi
    
    # Display each backup
    count=0
    for dir in $backup_dirs; do
        count=$((count + 1))
        if [ $count -gt 10 ]; then
            echo "... and $(($(echo "$backup_dirs" | wc -l) - 10)) more"
            break
        fi
        
        # Get backup details
        metadata_file="s3://${BACKUP_S3_BUCKET}/${backup_type}/${dir}/metadata.json"
        
        # Try to get metadata
        if metadata=$(aws s3 cp "$metadata_file" - --region "${AWS_REGION}" 2>/dev/null); then
            backup_size=$(echo "$metadata" | jq -r '.backup_size' 2>/dev/null || echo "Unknown")
            file_count=$(echo "$metadata" | jq -r '.files | length' 2>/dev/null || echo "Unknown")
            hostname=$(echo "$metadata" | jq -r '.hostname' 2>/dev/null || echo "Unknown")
            
            echo -e "${GREEN}✓${NC} ${dir} - Size: ${backup_size}, Files: ${file_count}, Host: ${hostname}"
        else
            # If no metadata, just show directory
            echo -e "${YELLOW}?${NC} ${dir} - No metadata available"
        fi
    done
done

echo -e "\n============================================="
echo "To restore a backup, use:"
echo "  ./scripts/backup/restore.sh -d BACKUP_DATE -t TYPE -c COMPONENT"
echo ""
echo "Example:"
echo "  ./scripts/backup/restore.sh -d $(aws s3 ls "s3://${BACKUP_S3_BUCKET}/daily/" --region "${AWS_REGION}" 2>/dev/null | grep PRE | awk '{print $2}' | sed 's/\///' | sort -r | head -1) -t daily -c database"