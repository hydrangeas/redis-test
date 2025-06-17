import 'reflect-metadata';

import * as dotenv from 'dotenv';
import { container } from 'tsyringe';

import { setupDI } from '@/infrastructure/di/container';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { DatabaseSeeder } from '@/infrastructure/seeders/database-seeder';

import type { Logger } from 'pino';

// Load environment variables
dotenv.config();

async function runSeeder(): Promise<void> {
  try {
    // DI設定
    await setupDI();

    const logger = container.resolve<Logger>(DI_TOKENS.Logger);
    const seeder = container.resolve(DatabaseSeeder);

    logger.info('Starting database seeding process...');

    // 環境チェック
    if (process.env.NODE_ENV === 'production') {
      logger.error('Cannot run seeder in production environment!');
      process.exit(1);
    }

    // シーディング実行
    await seeder.seed();

    logger.info('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

async function resetDatabase(): Promise<void> {
  try {
    // DI設定
    await setupDI();

    const logger = container.resolve<Logger>(DI_TOKENS.Logger);
    logger.info('Starting database reset process...');

    // 環境チェック
    if (process.env.NODE_ENV === 'production') {
      logger.error('Cannot reset database in production environment!');
      process.exit(1);
    }

    // Supabaseのリセット処理
    logger.info('Resetting database tables...');

    // Note: 実際のリセットは Supabase CLIのdb resetコマンドを使用することを推奨
    logger.info('Please run "supabase db reset" to reset the database schema');
    logger.info('Then run "npm run db:seed" to populate with test data');

    process.exit(0);
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  }
}

// コマンドライン引数の処理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'seed':
    void runSeeder();
    break;
  case 'reset':
    void resetDatabase();
    break;
  default:
    console.log('Usage: npm run db:seed [seed|reset]');
    console.log('  seed  - Populate database with test data');
    console.log('  reset - Reset database (requires manual schema reset)');
    process.exit(1);
}
