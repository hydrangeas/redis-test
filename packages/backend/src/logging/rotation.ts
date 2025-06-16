import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ログディレクトリの作成
const logsDir = join(__dirname, '../../../../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

export function createRotatingLogger() {
  // アプリケーションログのローテーション設定
  const appLogStream = createStream('app.log', {
    interval: '1d', // 日次ローテーション
    maxFiles: 30, // 30日分保持
    maxSize: '100M', // 100MBでローテーション
    compress: 'gzip', // 圧縮
    path: logsDir,
  });

  // エラーログのローテーション設定
  const errorLogStream = createStream('error.log', {
    interval: '1d', // 日次ローテーション
    maxFiles: 90, // 90日分保持
    compress: 'gzip',
    path: logsDir,
  });

  // ログレベルのフィルタリング
  const streams = [
    // すべてのログをファイルに出力
    {
      level: 'debug' as const,
      stream: appLogStream,
    },
    // エラーログのみを専用ファイルに出力
    {
      level: 'error' as const,
      stream: errorLogStream,
    },
    // コンソールにも出力（開発環境）
    {
      level: 'info' as const,
      stream: process.stdout,
    },
  ];

  return pino(
    {
      level: 'debug',
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream(streams),
  );
}

// ログファイルのクリーンアップ関数
export async function cleanupOldLogs(daysToKeep: number = 30) {
  const { readdir, stat, unlink } = await import('fs').then((m) => m.promises);
  const files = await readdir(logsDir);
  const now = Date.now();
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

  for (const file of files) {
    const filePath = join(logsDir, file);
    const stats = await stat(filePath);

    if (now - stats.mtime.getTime() > maxAge) {
      await unlink(filePath);
      console.log(`Deleted old log file: ${file}`);
    }
  }
}
