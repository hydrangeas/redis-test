#!/usr/bin/env tsx
// Backup Health Check Script

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createLogger } from '../../packages/backend/src/logging/logger.js';

const logger = createLogger('backup-monitor');

interface BackupStatus {
  type: string;
  lastBackup: Date | null;
  isHealthy: boolean;
  message: string;
  size?: string;
  fileCount?: number;
}

interface BackupMetadata {
  backup_date: string;
  backup_type: string;
  backup_size: string;
  files: string[];
  retention_days: number;
  hostname: string;
  backup_version: string;
}

const CONFIG = {
  bucket: process.env.BACKUP_S3_BUCKET || '',
  region: process.env.AWS_REGION || 'ap-northeast-1',
  backupTypes: ['daily', 'weekly', 'monthly'] as const,
  expectedIntervals: {
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  toleranceMultiplier: 1.5, // Allow 50% delay before marking unhealthy
};

export async function checkBackupHealth(): Promise<BackupStatus[]> {
  if (!CONFIG.bucket) {
    throw new Error('BACKUP_S3_BUCKET environment variable is required');
  }

  const s3Client = new S3Client({ region: CONFIG.region });
  const results: BackupStatus[] = [];

  for (const type of CONFIG.backupTypes) {
    try {
      // List all backups for this type
      const command = new ListObjectsV2Command({
        Bucket: CONFIG.bucket,
        Prefix: `${type}/`,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      const backups = response.Contents || [];

      // Find the latest backup by looking for metadata files
      const metadataFiles = backups
        .filter((obj) => obj.Key?.endsWith('metadata.json'))
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0));

      if (metadataFiles.length === 0) {
        results.push({
          type,
          lastBackup: null,
          isHealthy: false,
          message: 'No backup found',
        });
        continue;
      }

      const latestMetadataFile = metadataFiles[0];
      const lastModified = latestMetadataFile.LastModified!;

      // Get metadata details
      let metadata: BackupMetadata | null = null;
      try {
        const getCommand = new GetObjectCommand({
          Bucket: CONFIG.bucket,
          Key: latestMetadataFile.Key!,
        });
        const metadataResponse = await s3Client.send(getCommand);
        const metadataContent = await metadataResponse.Body?.transformToString();
        if (metadataContent) {
          metadata = JSON.parse(metadataContent);
        }
      } catch (error) {
        logger.warn(`Failed to read metadata for ${type}`, error);
      }

      // Check if backup is healthy based on expected interval
      const timeSinceLastBackup = Date.now() - lastModified.getTime();
      const expectedInterval = CONFIG.expectedIntervals[type];
      const isHealthy = timeSinceLastBackup <= expectedInterval * CONFIG.toleranceMultiplier;

      // Format time since last backup
      const hours = Math.floor(timeSinceLastBackup / (60 * 60 * 1000));
      const days = Math.floor(hours / 24);
      const timeAgo = days > 0 ? `${days} days` : `${hours} hours`;

      results.push({
        type,
        lastBackup: lastModified,
        isHealthy,
        message: isHealthy
          ? `Backup is up to date (${timeAgo} ago)`
          : `Last backup is ${timeAgo} old (expected within ${expectedInterval / (24 * 60 * 60 * 1000)} days)`,
        size: metadata?.backup_size,
        fileCount: metadata?.files.length,
      });
    } catch (error: any) {
      logger.error(`Failed to check ${type} backup health`, error);
      results.push({
        type,
        lastBackup: null,
        isHealthy: false,
        message: `Error: ${error.message}`,
      });
    }
  }

  return results;
}

// Export metrics for monitoring
export function backupStatusToMetrics(statuses: BackupStatus[]): Record<string, number> {
  const metrics: Record<string, number> = {};

  for (const status of statuses) {
    // Health status (1 = healthy, 0 = unhealthy)
    metrics[`backup_health_${status.type}`] = status.isHealthy ? 1 : 0;

    // Time since last backup in hours
    if (status.lastBackup) {
      const hoursSinceBackup = (Date.now() - status.lastBackup.getTime()) / (60 * 60 * 1000);
      metrics[`backup_age_hours_${status.type}`] = Math.round(hoursSinceBackup);
    }

    // File count if available
    if (status.fileCount) {
      metrics[`backup_file_count_${status.type}`] = status.fileCount;
    }
  }

  return metrics;
}

// CLI interface
async function main() {
  console.log('Backup Health Check');
  console.log('==================\n');

  try {
    const results = await checkBackupHealth();

    // Display results
    let allHealthy = true;
    for (const result of results) {
      const status = result.isHealthy ? '✓' : '✗';
      const color = result.isHealthy ? '\x1b[32m' : '\x1b[31m'; // Green or Red
      const reset = '\x1b[0m';

      console.log(`${color}${status}${reset} ${result.type.padEnd(10)} - ${result.message}`);

      if (result.size) {
        console.log(`  Size: ${result.size}, Files: ${result.fileCount}`);
      }
      if (result.lastBackup) {
        console.log(`  Last backup: ${result.lastBackup.toISOString()}`);
      }
      console.log();

      if (!result.isHealthy) {
        allHealthy = false;
      }
    }

    // Generate metrics
    const metrics = backupStatusToMetrics(results);
    console.log('Metrics:');
    console.log(JSON.stringify(metrics, null, 2));

    // Exit with appropriate code
    process.exit(allHealthy ? 0 : 1);
  } catch (error) {
    console.error('Backup health check failed:', error);
    process.exit(2);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
