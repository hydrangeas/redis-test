import 'reflect-metadata';
import { container } from 'tsyringe';

import { setupDI } from '@/infrastructure/di/container';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { buildServer } from '@/presentation/server';

import type { Logger } from 'pino';

/**
 * アプリケーションのエントリーポイント
 */
async function start(): Promise<void> {
  try {
    // 環境変数の検証
    validateEnvironment();

    // DI設定
    setupDI();

    const logger = container.resolve<Logger>(DI_TOKENS.Logger);

    logger.info(
      {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
      },
      'Starting application',
    );

    // サーバー構築
    const server = await buildServer();

    // サーバー起動
    const port = parseInt(process.env.PORT || '8000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    logger.info(
      {
        port,
        host,
        environment: process.env.NODE_ENV,
        apiDocs: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/api-docs`,
      },
      'Server started successfully',
    );

    // Graceful shutdown
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info({ signal }, 'Shutdown signal received');

      try {
        // 新規リクエストの受付を停止
        await server.close();

        // 進行中のリクエストの完了を待つ
        logger.info('Waiting for ongoing requests to complete');

        // クリーンアップ処理
        // TODO: データベース接続のクローズ、キャッシュのフラッシュなど

        logger.info('Server closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    // シグナルハンドラーの登録
    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

    // 未処理のエラーハンドリング
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(
        {
          reason,
          promise,
        },
        'Unhandled rejection',
      );
    });

    process.on('uncaughtException', (error) => {
      logger.fatal(
        {
          error,
        },
        'Uncaught exception',
      );
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * 必要な環境変数の検証
 */
function validateEnvironment(): void {
  const required = ['NODE_ENV', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // 環境変数の値の検証
  if (!['development', 'test', 'production'].includes(process.env.NODE_ENV!)) {
    throw new Error('NODE_ENV must be one of: development, test, production');
  }

  // URLの形式チェック
  try {
    new URL(process.env.SUPABASE_URL!);
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL');
  }
}

// アプリケーション起動
void start();
