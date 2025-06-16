import { injectable, inject } from 'tsyringe';
import { IEventBus } from '@/domain/interfaces/event-bus.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';

/**
 * トランザクション管理クラス
 * ビジネスロジックの実行とイベントディスパッチを統合
 */
@injectable()
export class TransactionManager {
  constructor(
    @inject(DI_TOKENS.SupabaseClient)
    private readonly supabase: SupabaseClient,
    @inject(DI_TOKENS.EventBus)
    private readonly eventBus: IEventBus,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  /**
   * トランザクション内で処理を実行
   * 成功時はイベントをディスパッチ、失敗時はロールバックとイベントクリア
   */
  async executeInTransaction<T>(work: () => Promise<T>): Promise<T> {
    try {
      // Note: Supabaseは現在トランザクションAPIを提供していないため、
      // 実際の実装では楽観的ロックやサガパターンを検討する必要がある

      this.logger.debug('Starting transaction');

      // ビジネスロジック実行
      const result = await work();

      // イベントディスパッチ（トランザクション成功後）
      await this.eventBus.dispatchPendingEvents();

      this.logger.debug('Transaction completed successfully');

      return result;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Transaction failed, clearing pending events',
      );

      // 保留中のイベントをクリア
      this.eventBus.clearPendingEvents();

      throw error;
    }
  }

  /**
   * 単純な操作用のヘルパーメソッド
   * トランザクション管理なしでイベントディスパッチのみ行う
   */
  async executeWithEventDispatch<T>(work: () => Promise<T>): Promise<T> {
    const result = await work();
    await this.eventBus.dispatchPendingEvents();
    return result;
  }
}
