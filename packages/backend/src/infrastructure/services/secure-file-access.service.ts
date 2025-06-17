import { injectable, inject } from 'tsyringe';
import {
  ISecureFileAccess,
  SecurityContext,
  ISecurityAuditService,
} from '@/domain/data/interfaces/secure-file-access.interface';
import { Result } from '@/domain/errors/result';
import { DomainError, ErrorType } from '@/domain/errors/domain-error';
import { DI_TOKENS } from '@/infrastructure/di/tokens';
import * as path from 'path';
import * as fs from 'fs/promises';

interface FileAccessPolicy {
  allowedExtensions: string[];
  maxFileSize: number;
  allowedPaths: RegExp[];
  deniedPaths: RegExp[];
}

@injectable()
export class SecureFileAccessService implements ISecureFileAccess {
  private readonly dataDirectory: string;
  private readonly policy: FileAccessPolicy;
  private readonly accessAttempts = new Map<string, number>();

  constructor(
    @inject(DI_TOKENS.DataDirectory)
    dataDirectory: string,
    @inject(DI_TOKENS.SecurityAuditService)
    private readonly auditService: ISecurityAuditService,
  ) {
    this.dataDirectory = path.resolve(dataDirectory);

    this.policy = {
      allowedExtensions: ['.json'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedPaths: [/^secure\//, /^public\//],
      deniedPaths: [
        /\.\./, // Parent directory access
        /^\/etc\//, // System files
        /^\/proc\//, // Process information
        /\.git\//, // Git directory
        /node_modules\//, // Node modules
        /\.(sh|exe|bat)$/, // Executable files
      ],
    };
  }

  async validateAndSanitizePath(
    requestedPath: string,
    context: SecurityContext,
  ): Promise<Result<string>> {
    try {
      // Basic validation
      if (!requestedPath || typeof requestedPath !== 'string') {
        await this.logSecurityEvent('INVALID_PATH_FORMAT', context, { requestedPath });
        return Result.fail(new DomainError('INVALID_PATH', 'Invalid path format', ErrorType.VALIDATION));
      }

      // Path normalization and sanitization
      const sanitized = this.sanitizePath(requestedPath);

      // Security checks
      const securityCheck = await this.performSecurityChecks(sanitized, context);
      if (securityCheck.isFailure) {
        return Result.fail(securityCheck.getError());
      }

      // File existence check
      const absolutePath = path.join(this.dataDirectory, sanitized);
      const exists = await this.checkFileExists(absolutePath);
      if (!exists) {
        return Result.fail(
          new DomainError('FILE_NOT_FOUND', 'Requested file does not exist', ErrorType.NOT_FOUND),
        );
      }

      return Result.ok(sanitized);
    } catch (error) {
      await this.logSecurityEvent('PATH_VALIDATION_ERROR', context, {
        requestedPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return Result.fail(
        new DomainError('SECURITY_ERROR', 'Security validation failed', ErrorType.FORBIDDEN),
      );
    }
  }

  async checkAccess(
    filePath: string,
    context: SecurityContext,
  ): Promise<Result<void>> {
    try {
      // Rate limit check
      const rateLimitCheck = this.checkRateLimit(context.ipAddress);
      if (!rateLimitCheck) {
        await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', context, { filePath });
        return Result.fail(
          new DomainError('TOO_MANY_ATTEMPTS', 'Too many access attempts', ErrorType.FORBIDDEN),
        );
      }

      // Access permission check
      const hasAccess = await this.checkAccessPermission(filePath, context);
      if (!hasAccess) {
        await this.logSecurityEvent('ACCESS_DENIED', context, { filePath });
        return Result.fail(
          new DomainError('ACCESS_DENIED', 'Access to this resource is denied', ErrorType.FORBIDDEN),
        );
      }

      // Log successful access
      await this.logSecurityEvent('ACCESS_GRANTED', context, { filePath });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DomainError('ACCESS_CHECK_ERROR', 'Failed to check access permissions', ErrorType.INTERNAL),
      );
    }
  }

  private sanitizePath(inputPath: string): string {
    // Remove dangerous characters
    let sanitized = inputPath
      .trim()
      .replace(/[<>:"|?*\x00-\x1f\x80-\x9f]/g, '') // Control chars and dangerous chars
      .replace(/\\/g, '/') // Normalize backslashes to forward slashes
      .replace(/\/+/g, '/') // Replace multiple slashes with single
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+$/, ''); // Remove trailing slashes

    // Validate path segments
    const segments = sanitized.split('/');
    const validSegments = segments.filter((segment) => {
      return segment.length > 0 && segment !== '.' && segment !== '..' && !segment.startsWith('.');
    });

    return validSegments.join('/');
  }

  private async performSecurityChecks(
    sanitizedPath: string,
    context: SecurityContext,
  ): Promise<Result<void>> {
    // Check denied path patterns
    for (const deniedPattern of this.policy.deniedPaths) {
      if (deniedPattern.test(sanitizedPath)) {
        await this.logSecurityEvent('DENIED_PATH_PATTERN', context, {
          path: sanitizedPath,
          pattern: deniedPattern.toString(),
        });
        return Result.fail(
          new DomainError('FORBIDDEN_PATH', 'Access to this path is forbidden', ErrorType.FORBIDDEN),
        );
      }
    }

    // Check allowed path patterns
    const isAllowed = this.policy.allowedPaths.some((pattern) => pattern.test(sanitizedPath));

    if (!isAllowed) {
      await this.logSecurityEvent('UNALLOWED_PATH_PATTERN', context, {
        path: sanitizedPath,
      });
      return Result.fail(
        new DomainError('UNAUTHORIZED_PATH', 'Path is not in allowed list', ErrorType.FORBIDDEN),
      );
    }

    // Extension check
    const ext = path.extname(sanitizedPath).toLowerCase();
    if (!this.policy.allowedExtensions.includes(ext)) {
      await this.logSecurityEvent('INVALID_FILE_TYPE', context, {
        path: sanitizedPath,
        extension: ext,
      });
      return Result.fail(new DomainError('INVALID_FILE_TYPE', 'File type not allowed', ErrorType.FORBIDDEN));
    }

    // Path traversal final check
    const absolutePath = path.resolve(this.dataDirectory, sanitizedPath);
    if (!absolutePath.startsWith(this.dataDirectory)) {
      await this.logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', context, {
        requestedPath: sanitizedPath,
        resolvedPath: absolutePath,
        dataDirectory: this.dataDirectory,
      });
      return Result.fail(new DomainError('PATH_TRAVERSAL', 'Path traversal detected', ErrorType.FORBIDDEN));
    }

    return Result.ok(undefined);
  }

  private async checkFileExists(absolutePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(absolutePath);
      return stats.isFile() && stats.size <= this.policy.maxFileSize;
    } catch {
      return false;
    }
  }

  private async checkAccessPermission(
    filePath: string,
    context: SecurityContext,
  ): Promise<boolean> {
    // Public files are accessible to everyone
    if (filePath.startsWith('public/')) {
      return true;
    }

    // Secure files require authentication
    if (filePath.startsWith('secure/')) {
      return !!context.userId && context.userId !== 'anonymous';
    }

    // Deny all other paths
    return false;
  }

  private checkRateLimit(ipAddress: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const maxAttempts = 100;

    // Clean up old entries
    for (const [key, timestamp] of this.accessAttempts.entries()) {
      if (timestamp < windowStart) {
        this.accessAttempts.delete(key);
      }
    }

    const attempts = Array.from(this.accessAttempts.entries()).filter(([key]) =>
      key.startsWith(ipAddress),
    ).length;

    if (attempts >= maxAttempts) {
      return false;
    }

    this.accessAttempts.set(`${ipAddress}:${now}`, now);
    return true;
  }

  private async logSecurityEvent(
    eventType: string,
    context: SecurityContext,
    details: Record<string, any>,
  ): Promise<void> {
    const event = {
      type: eventType,
      timestamp: new Date(),
      userId: context.userId,
      userTier: context.userTier,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details,
    };

    // Log via audit service
    await this.auditService.logSecurityEvent(event);
  }
}
