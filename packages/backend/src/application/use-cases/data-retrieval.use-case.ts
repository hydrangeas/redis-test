import { injectable } from 'tsyringe';
import {
  InjectDataAccessService,
  InjectRateLimitService,
  InjectLogger,
} from '../../infrastructure/di/decorators.js';
import type { IDataAccessService } from '../../domain/services/data-access.service.js';
import type { IRateLimitService } from '../../domain/services/rate-limit.service.js';
import type { Logger } from 'pino';

export interface DataRetrievalRequest {
  userId: string;
  tier: string;
  path: string;
  endpoint: string;
}

export interface DataRetrievalResponse {
  success: boolean;
  data?: any;
  error?: string;
  rateLimitExceeded?: boolean;
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;
}

@injectable()
export class DataRetrievalUseCase {
  constructor(
    @InjectDataAccessService() private readonly dataService: IDataAccessService,
    @InjectRateLimitService() private readonly rateLimitService: IRateLimitService,
    @InjectLogger() private readonly logger: Logger,
  ) {}

  async execute(request: DataRetrievalRequest): Promise<DataRetrievalResponse> {
    try {
      const { userId, tier, path, endpoint } = request;

      // Check rate limit
      const rateLimitResult = await this.rateLimitService.checkRateLimit(userId, tier, endpoint);
      
      if (!rateLimitResult.allowed) {
        this.logger.info({ userId, tier, endpoint }, 'Rate limit exceeded');
        return {
          success: false,
          error: 'Rate limit exceeded',
          rateLimitExceeded: true,
          rateLimitRemaining: 0,
          rateLimitResetAt: rateLimitResult.resetAt,
        };
      }

      // Increment request count
      await this.rateLimitService.incrementRequestCount(userId, endpoint);

      // Get data
      const dataResult = await this.dataService.getOpenData(path);
      
      if (!dataResult.found) {
        return {
          success: false,
          error: dataResult.error || 'Data not found',
          rateLimitRemaining: rateLimitResult.remaining - 1,
          rateLimitResetAt: rateLimitResult.resetAt,
        };
      }

      this.logger.info({ userId, path }, 'Data retrieved successfully');

      return {
        success: true,
        data: dataResult.data,
        rateLimitRemaining: rateLimitResult.remaining - 1,
        rateLimitResetAt: rateLimitResult.resetAt,
      };
    } catch (error) {
      this.logger.error({ error, request }, 'Data retrieval use case failed');
      return {
        success: false,
        error: 'Failed to retrieve data',
      };
    }
  }
}