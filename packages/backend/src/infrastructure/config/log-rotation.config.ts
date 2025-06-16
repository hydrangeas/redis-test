import { injectable, inject } from 'tsyringe';
import { DI_TOKENS } from '../di/tokens';
import { Logger } from 'pino';
import { IAPILogRepository } from '@/domain/log/interfaces/api-log-repository.interface';
import { IAuthLogRepository } from '@/domain/log/interfaces/auth-log-repository.interface';
import { IRateLimitLogRepository } from '@/domain/log/interfaces/rate-limit-log-repository.interface';

/**
 * í°íüÆü·çó-š
 */
export interface LogRotationConfig {
  // í°İ“åp	
  retentionDays: {
    apiLogs: number;
    authLogs: number;
    rateLimitLogs: number;
  };
  // íüÆü·çóŸL“”	
  rotationIntervalMinutes: number;
  // ĞÃÁµ¤º
  batchSize: number;
}

/**
 * ÇÕ©ëÈní°íüÆü·çó-š
 */
export const defaultLogRotationConfig: LogRotationConfig = {
  retentionDays: {
    apiLogs: 30,      // APIí°o30å“İ
    authLogs: 90,     // <í°o90å“İ»­åêÆ£ãû(	
    rateLimitLogs: 7, // ìüÈ6Pí°o7å“İ
  },
  rotationIntervalMinutes: 60 * 24, // 1åThkŸL
  batchSize: 1000,
};

/**
 * í°íüÆü·çóµüÓ¹
 */
@injectable()
export class LogRotationService {
  private rotationTimer?: NodeJS.Timeout;

  constructor(
    @inject(DI_TOKENS.APILogRepository)
    private readonly apiLogRepository: IAPILogRepository,
    @inject(DI_TOKENS.AuthLogRepository)
    private readonly authLogRepository: IAuthLogRepository,
    @inject(DI_TOKENS.RateLimitLogRepository)
    private readonly rateLimitLogRepository: IRateLimitLogRepository,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
    private readonly config: LogRotationConfig = defaultLogRotationConfig
  ) {}

  /**
   * í°íüÆü·çó’‹Ë
   */
  start(): void {
    if (this.rotationTimer) {
      return; // Ygk‹ËUŒfD‹
    }

    // ŞŸL
    this.rotate().catch(error => {
      this.logger.error({ error }, 'Initial log rotation failed');
    });

    // šŸL’-š
    this.rotationTimer = setInterval(() => {
      this.rotate().catch(error => {
        this.logger.error({ error }, 'Scheduled log rotation failed');
      });
    }, this.config.rotationIntervalMinutes * 60 * 1000);

    this.logger.info({
      config: this.config,
    }, 'Log rotation service started');
  }

  /**
   * í°íüÆü·çó’\b
   */
  stop(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = undefined;
      this.logger.info('Log rotation service stopped');
    }
  }

  /**
   * í°íüÆü·çó’ŸL
   */
  async rotate(): Promise<void> {
    this.logger.info('Starting log rotation');

    try {
      // APIí°níüÆü·çó
      const apiLogCutoffDate = new Date();
      apiLogCutoffDate.setDate(apiLogCutoffDate.getDate() - this.config.retentionDays.apiLogs);
      
      const apiLogResult = await this.apiLogRepository.deleteOldLogs(apiLogCutoffDate);
      if (apiLogResult.isSuccess) {
        this.logger.info({
          deletedCount: apiLogResult.getValue(),
          cutoffDate: apiLogCutoffDate.toISOString(),
        }, 'API logs rotated');
      } else {
        this.logger.error({
          error: apiLogResult.getError(),
        }, 'Failed to rotate API logs');
      }

      // <í°níüÆü·çó
      const authLogCutoffDate = new Date();
      authLogCutoffDate.setDate(authLogCutoffDate.getDate() - this.config.retentionDays.authLogs);
      
      const authLogResult = await this.authLogRepository.deleteOldLogs(authLogCutoffDate);
      if (authLogResult.isSuccess) {
        this.logger.info({
          deletedCount: authLogResult.getValue(),
          cutoffDate: authLogCutoffDate.toISOString(),
        }, 'Auth logs rotated');
      } else {
        this.logger.error({
          error: authLogResult.getError(),
        }, 'Failed to rotate auth logs');
      }

      // ìüÈ6Pí°níüÆü·çó
      const rateLimitLogCutoffDate = new Date();
      rateLimitLogCutoffDate.setDate(
        rateLimitLogCutoffDate.getDate() - this.config.retentionDays.rateLimitLogs
      );
      
      const rateLimitLogResult = await this.rateLimitLogRepository.deleteOlderThan(
        rateLimitLogCutoffDate
      );
      if (rateLimitLogResult.isSuccess) {
        this.logger.info({
          cutoffDate: rateLimitLogCutoffDate.toISOString(),
        }, 'Rate limit logs rotated');
      } else {
        this.logger.error({
          error: rateLimitLogResult.getError(),
        }, 'Failed to rotate rate limit logs');
      }

      this.logger.info('Log rotation completed');
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error during log rotation');
      throw error;
    }
  }
}

/**
 * PM2(ní°íüÆü·çó-š
 * PM2’(Y‹4oecosystem.config.jsgån-š’(
 */
export const pm2LogRotateConfig = {
  max_size: '100M',          // Õ¡¤ëµ¤ºn
P
  retain: '30',              // İY‹Õ¡¤ëp
  compress: true,            // äDí°’'.
  dateFormat: 'YYYY-MM-DD', // Õ¡¤ënåØÕ©üŞÃÈ
  workerInterval: '30',      // ïü«üLÁ§Ã¯Y‹“”Ò	
  rotateInterval: '0 0 * * *', // Îå0BkíüÆü·çó
  rotateModule: true,        // PM2nâ¸åüëí°‚íüÆü·çó
};