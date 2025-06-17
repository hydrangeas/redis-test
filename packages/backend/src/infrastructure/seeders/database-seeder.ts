import { createHash } from 'crypto';

import { faker } from '@faker-js/faker/locale/ja';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { DI_TOKENS } from '@/infrastructure/di/tokens';



@injectable()
export class DatabaseSeeder {
  constructor(
    @inject(DI_TOKENS.SupabaseClient)
    private readonly supabase: SupabaseClient,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async seed(): Promise<void> {
    this.logger.info('Starting database seeding...');

    try {
      // 既存データのクリーンアップ（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        await this.cleanup();
      }

      // シーディング実行
      await this.seedUsers();
      await this.seedApiKeys();
      await this.seedRateLimitLogs();
      await this.seedAuthLogs();
      await this.seedApiLogs();

      this.logger.info('Database seeding completed successfully');
    } catch (error) {
      this.logger.error({ error }, 'Database seeding failed');
      throw error;
    }
  }

  private async cleanup(): Promise<void> {
    this.logger.info('Cleaning up existing data...');

    // 順序を考慮してテーブルをクリーンアップ
    const tables = [
      'api_logs',
      'auth_logs',
      'rate_limit_logs',
      // api_keys は削除しない（テスト用のキーを保持）
    ];

    for (const table of tables) {
      const { error } = await this.supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // 全削除

      if (error) {
        this.logger.error({ error, table }, `Failed to clean ${table}`);
      }
    }

    // テストユーザーの削除（email が example.com で終わるもののみ）
    const { data: users } = await this.supabase.auth.admin.listUsers();
    if (users?.users) {
      const testUsers = users.users.filter((user) => user.email?.endsWith('@example.com'));
      for (const user of testUsers) {
        const { error } = await this.supabase.auth.admin.deleteUser(user.id);
        if (error) {
          this.logger.error({ error, userId: user.id }, 'Failed to delete test user');
        }
      }
    }
  }

  private async seedUsers(): Promise<void> {
    this.logger.info('Seeding users...');

    const users = [
      {
        email: 'tier1@example.com',
        password: 'password123',
        user_metadata: { name: 'Tier1 User' },
        app_metadata: { tier: 'tier1' },
      },
      {
        email: 'tier2@example.com',
        password: 'password123',
        user_metadata: { name: 'Tier2 User' },
        app_metadata: { tier: 'tier2' },
      },
      {
        email: 'tier3@example.com',
        password: 'password123',
        user_metadata: { name: 'Tier3 User' },
        app_metadata: { tier: 'tier3' },
      },
      // 追加のランダムユーザー
      ...Array.from({ length: 5 }, () => ({
        email: faker.internet.email({ provider: 'example.com' }),
        password: 'password123',
        user_metadata: { name: faker.person.fullName() },
        app_metadata: { tier: faker.helpers.arrayElement(['tier1', 'tier2', 'tier3']) },
      })),
    ];

    for (const userData of users) {
      // Supabase Admin APIを使用してユーザーを作成
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: userData.user_metadata,
        app_metadata: userData.app_metadata,
      });

      if (error) {
        // ユーザーが既に存在する場合はスキップ
        if (error.message.includes('already been registered')) {
          this.logger.info({ email: userData.email }, 'User already exists, skipping');
        } else {
          this.logger.error({ error, email: userData.email }, 'Failed to create user');
        }
      } else {
        this.logger.info({ userId: data.user?.id, email: userData.email }, 'User created');
      }
    }
  }

  private async seedApiKeys(): Promise<void> {
    this.logger.info('Seeding API keys...');

    // ユーザーを取得
    const { data: users } = await this.supabase.auth.admin.listUsers();
    if (!users?.users) return;

    const testUsers = users.users.filter((user) => user.email?.endsWith('@example.com'));

    for (const user of testUsers) {
      // 既存のAPIキーを確認
      const { data: existingKeys } = await this.supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id);

      if (existingKeys && existingKeys.length > 0) {
        this.logger.info({ userId: user.id, email: user.email }, 'API key already exists');
        continue;
      }

      const apiKey = this.generateApiKey();

      const { error } = await this.supabase.from('api_keys').insert({
        user_id: user.id,
        key_hash: await this.hashApiKey(apiKey),
        key_prefix: apiKey.substring(0, 8),
        last_used_at: faker.date.recent({ days: 7 }),
        created_at: faker.date.past({ years: 1 }),
      });

      if (!error) {
        this.logger.info(
          {
            userId: user.id,
            email: user.email,
            apiKey, // 開発環境のみログ出力
          },
          'API key created',
        );
      } else {
        this.logger.error({ error, userId: user.id }, 'Failed to create API key');
      }
    }
  }

  private async seedRateLimitLogs(): Promise<void> {
    this.logger.info('Seeding rate limit logs...');

    const { data: users } = await this.supabase.auth.admin.listUsers();
    if (!users?.users) return;

    const testUsers = users.users.filter((user) => user.email?.endsWith('@example.com'));
    const endpoints = ['/secure/population/2024.json', '/secure/statistics/budget.json'];
    const now = new Date();

    for (const user of testUsers) {
      // 過去1時間のレート制限ログを生成
      for (let i = 0; i < 60; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 1000);
        const requestCount = faker.number.int({ min: 0, max: 10 });

        if (requestCount > 0) {
          const { error } = await this.supabase.from('rate_limit_logs').insert({
            user_id: user.id,
            endpoint: faker.helpers.arrayElement(endpoints),
            window_start: timestamp.toISOString(),
            request_count: requestCount,
          });

          if (error) {
            this.logger.error({ error }, 'Failed to create rate limit log');
          }
        }
      }
    }
  }

  private async seedAuthLogs(): Promise<void> {
    this.logger.info('Seeding auth logs...');

    const { data: users } = await this.supabase.auth.admin.listUsers();
    if (!users?.users) return;

    const testUsers = users.users.filter((user) => user.email?.endsWith('@example.com'));
    const events = ['login_success', 'logout', 'token_refresh', 'login_failed'];
    const providers = ['email', 'google', 'github'];

    for (const user of testUsers) {
      // 過去30日間の認証ログを生成
      const logCount = faker.number.int({ min: 10, max: 50 });

      for (let i = 0; i < logCount; i++) {
        const event = faker.helpers.arrayElement(events);
        const isSuccess = !event.includes('failed');

        const { error } = await this.supabase.from('auth_logs').insert({
          user_id: isSuccess ? user.id : null,
          event,
          provider: faker.helpers.arrayElement(providers),
          ip_address: faker.internet.ipv4(),
          user_agent: faker.internet.userAgent(),
          result: isSuccess ? 'success' : 'failed',
          error_message: !isSuccess ? 'Invalid credentials' : null,
          created_at: faker.date.recent({ days: 30 }).toISOString(),
        });

        if (error) {
          this.logger.error({ error }, 'Failed to create auth log');
        }
      }
    }
  }

  private async seedApiLogs(): Promise<void> {
    this.logger.info('Seeding API logs...');

    const { data: users } = await this.supabase.auth.admin.listUsers();
    if (!users?.users) return;

    const testUsers = users.users.filter((user) => user.email?.endsWith('@example.com'));
    const endpoints = [
      '/secure/population/2024.json',
      '/secure/budget/2024.json',
      '/secure/tourism/spots.json',
      '/secure/weather/current.json',
    ];

    const statusCodes = [200, 200, 200, 200, 404, 429]; // 成功が多め

    for (const user of testUsers) {
      // 過去7日間のAPIログを生成
      const logCount = faker.number.int({ min: 50, max: 200 });

      for (let i = 0; i < logCount; i++) {
        const statusCode = faker.helpers.arrayElement(statusCodes);
        const endpoint = faker.helpers.arrayElement(endpoints);
        const responseTime = faker.number.int({ min: 10, max: 500 });

        const { error } = await this.supabase.from('api_logs').insert({
          user_id: user.id,
          method: 'GET',
          endpoint,
          status_code: statusCode,
          response_time: responseTime,
          response_size: statusCode === 200 ? faker.number.int({ min: 100, max: 10000 }) : 0,
          ip_address: faker.internet.ipv4(),
          user_agent: faker.internet.userAgent(),
          error_message: statusCode !== 200 ? this.getErrorMessage(statusCode) : null,
          created_at: faker.date.recent({ days: 7 }).toISOString(),
        });

        if (error) {
          this.logger.error({ error }, 'Failed to create API log');
        }
      }
    }
  }

  private generateApiKey(): string {
    const prefix = 'nara_';
    const randomPart = faker.string.alphanumeric(32);
    return `${prefix}${randomPart}`;
  }

  private async hashApiKey(apiKey: string): Promise<string> {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  private getErrorMessage(statusCode: number): string {
    const errorMessages: Record<number, string> = {
      404: 'Resource not found',
      429: 'Rate limit exceeded',
      500: 'Internal server error',
    };
    return errorMessages[statusCode] || 'Unknown error';
  }
}
