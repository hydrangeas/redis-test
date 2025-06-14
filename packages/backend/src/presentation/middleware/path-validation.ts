import type { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { DI_TOKENS } from '../../infrastructure/di/tokens.js';
import type { Logger } from 'pino';

/**
 * Path validation middleware to prevent path traversal attacks
 */
export async function validatePath(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const logger = container.resolve<Logger>(DI_TOKENS.Logger);
  const path = request.url;

  // Check for path traversal patterns
  const dangerousPatterns = [
    /\.\./g, // Parent directory traversal
    /\.\.%2F/gi, // URL encoded traversal
    /\.\.%5C/gi, // URL encoded backslash
    /%2e%2e/gi, // Double URL encoded dots
    /\x00/g, // Null bytes
    /\/\//g, // Double slashes
    /\\/g, // Backslashes
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(path)) {
      logger.warn({
        path,
        pattern: pattern.toString(),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      }, 'Path traversal attempt detected');

      reply.code(400).send({
        type: 'https://example.com/errors/invalid-path',
        title: 'Invalid Path',
        status: 400,
        detail: 'The requested path contains invalid characters',
        instance: path,
      });
      return;
    }
  }

  // Validate path segments
  const segments = path.split('/').filter(Boolean);
  for (const segment of segments) {
    // Check for hidden files (except .well-known)
    if (segment.startsWith('.') && segment !== '.well-known') {
      logger.warn({
        path,
        segment,
        ip: request.ip,
      }, 'Hidden file access attempt');

      reply.code(403).send({
        type: 'https://example.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'Access to hidden files is not allowed',
        instance: path,
      });
      return;
    }

    // Check for special characters that might be problematic
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(segment) && !segment.includes(':')) {
      // Allow colons for URL parameters like /secure/:path
      if (!request.url.includes('/api/') || segment.length > 255) {
        logger.warn({
          path,
          segment,
          ip: request.ip,
        }, 'Invalid path segment');

        reply.code(400).send({
          type: 'https://example.com/errors/invalid-path',
          title: 'Invalid Path',
          status: 400,
          detail: 'Path contains invalid characters',
          instance: path,
        });
        return;
      }
    }
  }

  // Check total path length
  if (path.length > 2048) {
    logger.warn({
      pathLength: path.length,
      ip: request.ip,
    }, 'Path too long');

    reply.code(414).send({
      type: 'https://example.com/errors/uri-too-long',
      title: 'URI Too Long',
      status: 414,
      detail: 'The requested URI is too long',
      instance: path,
    });
    return;
  }
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  // Remove null bytes
  let sanitized = input.replace(/\x00/g, '');

  // HTML encode dangerous characters
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  sanitized = sanitized.replace(/[&<>"'\/]/g, (char) => htmlEntities[char] || char);

  // Remove or encode other potentially dangerous characters
  sanitized = sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[^\x20-\x7E]/g, ''); // Remove non-printable characters

  return sanitized.trim();
}

/**
 * Validate and sanitize JSON input
 */
export function sanitizeJson<T extends Record<string, any>>(
  input: T,
  maxDepth: number = 10,
): T {
  function sanitizeValue(value: any, depth: number): any {
    if (depth > maxDepth) {
      throw new Error('Maximum object depth exceeded');
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return sanitizeInput(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item, depth + 1));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        // Sanitize keys as well
        const sanitizedKey = sanitizeInput(key);
        if (sanitizedKey.length > 0 && sanitizedKey.length <= 255) {
          sanitized[sanitizedKey] = sanitizeValue(val, depth + 1);
        }
      }
      return sanitized;
    }

    return value;
  }

  return sanitizeValue(input, 0) as T;
}