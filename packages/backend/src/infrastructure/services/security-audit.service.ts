import { SupabaseClient } from '@supabase/supabase-js';
import { injectable, inject } from 'tsyringe';

import {
  ISecurityAuditService,
  SecurityEvent,
} from '@/domain/data/interfaces/secure-file-access.interface';
import { DI_TOKENS } from '@/infrastructure/di/tokens';

import type { Logger } from 'pino';

@injectable()
export class SecurityAuditService implements ISecurityAuditService {
  constructor(
    @inject(DI_TOKENS.SupabaseClient)
    private readonly supabase: SupabaseClient,
    @inject(DI_TOKENS.Logger)
    private readonly logger: Logger,
  ) {}

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to database for persistence
      const { error } = await this.supabase.from('security_audit_logs').insert({
        event_type: event.type,
        user_id: event.userId !== 'anonymous' ? event.userId : null,
        user_tier: event.userTier,
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        details: event.details,
        created_at: event.timestamp.toISOString(),
      });

      if (error) {
        this.logger.error({ error, event }, 'Failed to log security event to database');
      }

      // Also log to application logs
      const logData = {
        ...event,
        timestamp: event.timestamp.toISOString(),
      };

      if (
        event.type.includes('DENIED') ||
        event.type.includes('ATTEMPT') ||
        event.type.includes('EXCEEDED')
      ) {
        this.logger.warn({ securityEvent: logData }, 'Security warning');
      } else {
        this.logger.info({ securityEvent: logData }, 'Security audit');
      }
    } catch (error) {
      this.logger.error({ error, event }, 'Failed to log security event');
    }
  }
}
