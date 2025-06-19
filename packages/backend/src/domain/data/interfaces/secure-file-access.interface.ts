import type { Result } from '@/domain/errors/result';

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
    context: SecurityContext,
  ): Promise<Result<string>>;

  /**
   * Checks if the user has access to the file
   */
  checkAccess(filePath: string, context: SecurityContext): Promise<Result<void>>;
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
  details: Record<string, unknown>;
}
