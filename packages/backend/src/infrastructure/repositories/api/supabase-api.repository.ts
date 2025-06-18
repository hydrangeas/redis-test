import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import { injectable, inject } from 'tsyringe';

import { APIAggregate } from '@/domain/api/aggregates/api.aggregate';
import { APIEndpoint } from '@/domain/api/entities/api-endpoint.entity';
import { IAPIRepository } from '@/domain/api/interfaces/api-repository.interface';
import { EndpointId } from '@/domain/api/value-objects/endpoint-id';
import { EndpointPath } from '@/domain/api/value-objects/endpoint-path';
import { EndpointType } from '@/domain/api/value-objects/endpoint-type';
import { HttpMethod } from '@/domain/api/value-objects/http-method';
import { RateLimit } from '@/domain/auth/value-objects/rate-limit';
import { TierLevel } from '@/domain/auth/value-objects/tier-level';
import { DomainError } from '@/domain/errors/domain-error';
import { Result } from '@/domain/errors/result';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

interface EndpointRecord {
  id: string;
  path: string;
  method: string;
  type: string;
  description: string;
  requires_auth: boolean;
  rate_limit_override?: {
    max_requests: number;
    window_seconds: number;
  };
  created_at: string;
  updated_at: string;
}

interface RateLimitRecord {
  tier_level: string;
  max_requests: number;
  window_seconds: number;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase APIリポジトリ実装
 * API集約の永続化をSupabaseで実装
 */
@injectable()
export class SupabaseAPIRepository implements IAPIRepository {
  constructor(
    @inject(DI_TOKENS.SupabaseClient)
    private readonly supabase: SupabaseClient,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async save(aggregate: APIAggregate): Promise<Result<void>> {
    try {
      // トランザクション内で保存
      const { error: txError } = await this.supabase.rpc('begin_transaction');
      if (txError) {
        this.logger.error({ error: txError }, 'Failed to begin transaction');
        return Result.fail(
          DomainError.internal('TRANSACTION_FAILED', 'Failed to begin transaction'),
        );
      }

      // 既存のエンドポイントを削除
      const { error: deleteError } = await this.supabase
        .from('api_endpoints')
        .delete()
        .neq('id', '');

      if (deleteError) {
        await this.supabase.rpc('rollback_transaction');
        this.logger.error({ error: deleteError }, 'Failed to delete existing endpoints');
        return Result.fail(
          DomainError.internal('DELETE_FAILED', 'Failed to delete existing endpoints'),
        );
      }

      // エンドポイントを保存
      const endpointRecords: EndpointRecord[] = [];
      for (const [_, endpoint] of aggregate.endpoints) {
        const record: EndpointRecord = {
          id: endpoint.id.value,
          path: endpoint.path.value,
          method: endpoint.method,
          type: endpoint.type.value,
          description: endpoint.description || '',
          requires_auth: !endpoint.isPublic, // Public endpoints don't require auth
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Note: rate_limit_override is not currently supported in the domain model
        // If needed, this should be added to the APIEndpoint entity

        endpointRecords.push(record);
      }

      if (endpointRecords.length > 0) {
        const { error: insertError } = await this.supabase
          .from('api_endpoints')
          .insert(endpointRecords);

        if (insertError) {
          await this.supabase.rpc('rollback_transaction');
          this.logger.error({ error: insertError }, 'Failed to insert endpoints');
          return Result.fail(DomainError.internal('INSERT_FAILED', 'Failed to insert endpoints'));
        }
      }

      // デフォルトレート制限を保存
      const rateLimitRecords: RateLimitRecord[] = [];
      for (const [tierLevel, rateLimit] of aggregate.defaultRateLimits) {
        rateLimitRecords.push({
          tier_level: tierLevel,
          max_requests: rateLimit.maxRequests,
          window_seconds: rateLimit.windowSeconds,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // 既存のレート制限を削除
      const { error: deleteRateLimitError } = await this.supabase
        .from('default_rate_limits')
        .delete()
        .neq('tier_level', '');

      if (deleteRateLimitError) {
        await this.supabase.rpc('rollback_transaction');
        this.logger.error({ error: deleteRateLimitError }, 'Failed to delete rate limits');
        return Result.fail(DomainError.internal('DELETE_FAILED', 'Failed to delete rate limits'));
      }

      if (rateLimitRecords.length > 0) {
        const { error: insertRateLimitError } = await this.supabase
          .from('default_rate_limits')
          .insert(rateLimitRecords);

        if (insertRateLimitError) {
          await this.supabase.rpc('rollback_transaction');
          this.logger.error({ error: insertRateLimitError }, 'Failed to insert rate limits');
          return Result.fail(
            DomainError.internal('INSERT_FAILED', 'Failed to insert rate limits'),
          );
        }
      }

      // コミット
      const { error: commitError } = await this.supabase.rpc('commit_transaction');
      if (commitError) {
        await this.supabase.rpc('rollback_transaction');
        this.logger.error({ error: commitError }, 'Failed to commit transaction');
        return Result.fail(DomainError.internal('COMMIT_FAILED', 'Failed to commit transaction'));
      }

      this.logger.info(
        { endpointCount: endpointRecords.length },
        'API aggregate saved successfully',
      );

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error saving API aggregate');
      return Result.fail(
        DomainError.internal(
          'SAVE_FAILED',
          'Failed to save API aggregate',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async getAggregate(): Promise<Result<APIAggregate>> {
    try {
      // デフォルトレート制限を取得
      const { data: rateLimits, error: rateLimitError } = await this.supabase
        .from('default_rate_limits')
        .select('*') as { data: RateLimitRecord[] | null; error: Error | null };

      if (rateLimitError) {
        this.logger.error({ error: rateLimitError }, 'Failed to fetch rate limits');
        return Result.fail(DomainError.internal('FETCH_FAILED', 'Failed to fetch rate limits'));
      }

      const defaultRateLimits = new Map<string, RateLimit>();
      for (const record of rateLimits || []) {
        const rateLimitResult = RateLimit.create(record.max_requests, record.window_seconds);
        if (rateLimitResult.isSuccess) {
          defaultRateLimits.set(record.tier_level, rateLimitResult.getValue());
        }
      }

      // API集約を作成
      const aggregateResult = APIAggregate.create({
        defaultRateLimits: defaultRateLimits as Map<TierLevel, RateLimit>,
      });
      if (aggregateResult.isFailure) {
        const error = aggregateResult.getError();
        if (error instanceof DomainError) {
          return Result.fail(error);
        } else {
          return Result.fail(
            DomainError.internal('AGGREGATE_CREATE_FAILED', error.message || 'Failed to create aggregate')
          );
        }
      }

      const aggregate = aggregateResult.getValue();

      // エンドポイントを取得
      const { data: endpoints, error: endpointError } = await this.supabase
        .from('api_endpoints')
        .select('*')
        .order('created_at', { ascending: true }) as { data: EndpointRecord[] | null; error: Error | null };

      if (endpointError) {
        this.logger.error({ error: endpointError }, 'Failed to fetch endpoints');
        return Result.fail(DomainError.internal('FETCH_FAILED', 'Failed to fetch endpoints'));
      }

      // エンドポイントを集約に追加
      for (const record of endpoints || []) {
        const pathResult = EndpointPath.create(record.path);
        const typeResult = EndpointType.create(record.type as 'public' | 'protected');

        if (pathResult.isSuccess && typeResult.isSuccess) {
          // Note: rate_limit_override from database is not currently used
          // If needed in the future, it should be added to the APIEndpoint entity
          
          const endpointResult = APIEndpoint.create({
            path: record.path, // The create method expects a string
            method: record.method as HttpMethod,
            type: typeResult.getValue(),
            description: record.description,
            isActive: true,
          });

          if (endpointResult.isSuccess) {
            aggregate.addEndpoint(endpointResult.getValue());
          }
        }
      }

      return Result.ok(aggregate);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error fetching API aggregate');
      return Result.fail(
        DomainError.internal(
          'FETCH_FAILED',
          'Failed to fetch API aggregate',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async findByEndpointId(
    endpointId: EndpointId,
  ): Promise<Result<APIAggregate | null>> {
    try {
      const { data, error } = await this.supabase
        .from('api_endpoints')
        .select('id')
        .eq('id', endpointId.value)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return Result.ok(null);
        }
        this.logger.error({ error }, 'Failed to find endpoint');
        return Result.fail(DomainError.internal('FIND_FAILED', 'Failed to find endpoint'));
      }

      if (!data) {
        return Result.ok(null);
      }

      // 集約全体を返す
      return this.getAggregate();
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding endpoint');
      return Result.fail(
        DomainError.internal(
          'FIND_FAILED',
          'Failed to find endpoint',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async findByPathAndMethod(
    path: EndpointPath,
    method: HttpMethod,
  ): Promise<Result<APIAggregate | null>> {
    try {
      const { data, error } = await this.supabase
        .from('api_endpoints')
        .select('id')
        .eq('path', path.value)
        .eq('method', method)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return Result.ok(null);
        }
        this.logger.error({ error }, 'Failed to find endpoint by path and method');
        return Result.fail(DomainError.internal('FIND_FAILED', 'Failed to find endpoint'));
      }

      if (!data) {
        return Result.ok(null);
      }

      // 集約全体を返す
      return this.getAggregate();
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error finding endpoint');
      return Result.fail(
        DomainError.internal(
          'FIND_FAILED',
          'Failed to find endpoint',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }

  async exists(): Promise<Result<boolean>> {
    try {
      const { count, error } = await this.supabase
        .from('api_endpoints')
        .select('*', { count: 'exact', head: true });

      if (error) {
        this.logger.error({ error }, 'Failed to check if aggregate exists');
        return Result.fail(DomainError.internal('CHECK_FAILED', 'Failed to check existence'));
      }

      return Result.ok((count ?? 0) > 0);
    } catch (error) {
      this.logger.error({ error }, 'Unexpected error checking existence');
      return Result.fail(
        DomainError.internal(
          'CHECK_FAILED',
          'Failed to check existence',
          error instanceof Error ? error : undefined,
        ),
      );
    }
  }
}
