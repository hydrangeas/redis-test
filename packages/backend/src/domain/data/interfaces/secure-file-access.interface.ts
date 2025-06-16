import { Result } from '@/domain/shared/result';
import { DomainError } from '@/domain/shared/errors/domain-error';

export interface SecurityContext {
  userId: string;
  userTier: string;
  ipAddress: string;
  userAgent: string;
}

export interface ISecureFileAccess {
  /**
   * Validates and sanitizes a file path for security
   */
  validateAndSanitizePath(
    requestedPath: string,
    context: SecurityContext
  ): Promise<Result<string, DomainError>>;

  /**
   * Checks if the user has access to the file
   */
  checkAccess(
    filePath: string,
    context: SecurityContext
  ): Promise<Result<void, DomainError>>;
}

export interface ISecurityAuditService {
  /**
   * Logs security events for auditing
   */
  logSecurityEvent(event: SecurityEvent): Promise<void>;
}

export interface SecurityEvent {
  type: string;
  timestamp: Date;
  userId: string;
  userTier: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
}