import { injectable } from 'tsyringe';

import { Result } from '@/domain/shared/result';

import { AuthenticatedUser } from '../../auth/value-objects/authenticated-user';
import { DomainError, ErrorType } from '../../errors/domain-error';
import { DataPath } from '../value-objects/data-path';

export interface DataAccessValidationResult {
  allowed: boolean;
  sanitizedPath: string;
  reason?: string;
}

export interface IDataAccessService {
  /**
   * Validates if a user can access a data resource
   */
  validateAccess(user: AuthenticatedUser, path: DataPath): Result<DataAccessValidationResult>;

  /**
   * Checks if a path is safe (no path traversal)
   */
  isPathSafe(path: DataPath): boolean;

  /**
   * Sanitizes a data path for safe access
   */
  sanitizePath(path: DataPath): Result<string>;
}

@injectable()
export class DataAccessService implements IDataAccessService {
  validateAccess(user: AuthenticatedUser, path: DataPath): Result<DataAccessValidationResult> {
    try {
      if (!user) {
        return Result.fail(DomainError.validation('USER_REQUIRED', 'User is required'));
      }

      if (!path) {
        return Result.fail(DomainError.validation('PATH_REQUIRED', 'Path is required'));
      }

      // Check if path is safe
      if (!this.isPathSafe(path)) {
        return Result.ok({
          allowed: false,
          sanitizedPath: '',
          reason: 'Path contains unsafe characters or patterns',
        });
      }

      // Sanitize the path
      const sanitizeResult = this.sanitizePath(path);
      if (sanitizeResult.isFailure) {
        return Result.fail(sanitizeResult.getError());
      }

      const sanitizedPath = sanitizeResult.getValue();

      // Check if user has appropriate tier for data access
      // For now, all authenticated users can access data
      // This can be extended based on business rules
      const result: DataAccessValidationResult = {
        allowed: true,
        sanitizedPath,
      };

      return Result.ok(result);
    } catch (error) {
      return Result.fail(
        new DomainError(
          'ACCESS_VALIDATION_ERROR',
          'Failed to validate data access',
          ErrorType.INTERNAL,
          { error: error instanceof Error ? error.message : 'Unknown error' },
        ),
      );
    }
  }

  isPathSafe(path: DataPath): boolean {
    const pathValue = path.value;

    // Check for path traversal patterns
    const dangerousPatterns = [
      '..', // Parent directory
      '~', // Home directory
      '//', // Double slashes
      '\\', // Backslashes
      '%2e%2e', // URL encoded ..
      '%252e%252e', // Double URL encoded ..
      '..%2f', // Encoded ../
      '%2e%2e/', // Encoded ../
      '..\\', // Windows parent directory
      '.%2e', // Encoded .
      '%00', // Null byte
      '\x00', // Null byte
      '\0', // Null byte
    ];

    const lowerPath = pathValue.toLowerCase();

    for (const pattern of dangerousPatterns) {
      if (lowerPath.includes(pattern)) {
        return false;
      }
    }

    // Check for absolute paths
    if (pathValue.startsWith('/') && !pathValue.startsWith('/secure/')) {
      return false;
    }

    // Check for special file names
    const dangerousFiles = [
      '.env',
      '.git',
      '.ssh',
      'package.json',
      'tsconfig.json',
      'docker-compose',
      'Dockerfile',
    ];

    for (const file of dangerousFiles) {
      if (lowerPath.includes(file)) {
        return false;
      }
    }

    return true;
  }

  sanitizePath(path: DataPath): Result<string> {
    try {
      if (!this.isPathSafe(path)) {
        return Result.fail(
          new DomainError(
            'UNSAFE_PATH',
            'Path contains unsafe characters or patterns',
            ErrorType.VALIDATION,
            { path: path.value },
          ),
        );
      }

      let sanitized = path.value;

      // Remove any leading slashes except for /secure/
      if (sanitized.startsWith('/') && !sanitized.startsWith('/secure/')) {
        sanitized = sanitized.substring(1);
      }

      // Ensure path starts with /secure/ if it doesn't already
      if (!sanitized.startsWith('/secure/')) {
        sanitized = `/secure/${sanitized}`;
      }

      // Remove any query parameters or fragments
      sanitized = sanitized.split('?')[0].split('#')[0];

      // Normalize multiple slashes to single slashes
      sanitized = sanitized.replace(/\/+/g, '/');

      // Remove trailing slashes
      if (sanitized.endsWith('/') && sanitized !== '/') {
        sanitized = sanitized.slice(0, -1);
      }

      // Ensure .json extension
      if (!sanitized.endsWith('.json')) {
        sanitized += '.json';
      }

      return Result.ok(sanitized);
    } catch (error) {
      return Result.fail(
        new DomainError('PATH_SANITIZATION_ERROR', 'Failed to sanitize path', ErrorType.INTERNAL, {
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
