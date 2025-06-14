import { injectable } from 'tsyringe';
import { InjectAppConfig } from '../di/decorators.js';
import type { AppConfig } from './types.js';

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface SecurityHeadersConfig {
  contentSecurityPolicy: {
    directives: Record<string, string[]>;
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  frameOptions: 'DENY' | 'SAMEORIGIN';
  contentTypeOptions: boolean;
  xssProtection: boolean;
  referrerPolicy: string;
  permissionsPolicy: Record<string, string[]>;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  tiers: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  skipFailedRequests: boolean;
  skipSuccessfulRequests: boolean;
}

export interface SecurityConfig {
  cors: CorsConfig;
  headers: SecurityHeadersConfig;
  rateLimit: RateLimitConfig;
}

@injectable()
export class SecurityConfigService {
  private readonly config: SecurityConfig;

  constructor(@InjectAppConfig() appConfig: AppConfig) {
    const isDevelopment = appConfig.environment === 'development';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    this.config = {
      cors: {
        allowedOrigins: this.getAllowedOrigins(isDevelopment, frontendUrl),
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Request-ID',
          'X-API-Key',
          'X-Client-Version',
        ],
        exposedHeaders: [
          'X-Request-ID',
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
          'X-RateLimit-Reset',
          'X-API-Version',
        ],
        credentials: true,
        maxAge: 86400, // 24 hours
      },
      headers: {
        contentSecurityPolicy: {
          directives: this.getCSPDirectives(isDevelopment),
        },
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
        frameOptions: 'DENY',
        contentTypeOptions: true,
        xssProtection: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: {
          camera: ['none'],
          microphone: ['none'],
          geolocation: ['none'],
          payment: ['none'],
        },
      },
      rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // Default limit
        tiers: {
          tier1: parseInt(process.env.RATE_LIMIT_TIER1 || '60', 10),
          tier2: parseInt(process.env.RATE_LIMIT_TIER2 || '120', 10),
          tier3: parseInt(process.env.RATE_LIMIT_TIER3 || '300', 10),
        },
        skipFailedRequests: false,
        skipSuccessfulRequests: false,
      },
    };
  }

  private getAllowedOrigins(isDevelopment: boolean, frontendUrl: string): string[] {
    const origins = [frontendUrl];

    if (isDevelopment) {
      origins.push(
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      );
    }

    // Add custom origins from environment variable
    const customOrigins = process.env.CORS_ALLOWED_ORIGINS;
    if (customOrigins) {
      origins.push(...customOrigins.split(',').map((origin) => origin.trim()));
    }

    return [...new Set(origins)].filter(Boolean);
  }

  private getCSPDirectives(isDevelopment: boolean): Record<string, string[]> {
    const baseDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.SUPABASE_URL || ''],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    };

    if (isDevelopment) {
      // Relax CSP for development (Scalar API docs, hot reload, etc.)
      baseDirectives.scriptSrc.push("'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net');
      baseDirectives.styleSrc.push("'unsafe-inline'", 'https://fonts.googleapis.com');
      baseDirectives.fontSrc.push('https://fonts.gstatic.com');
      baseDirectives.connectSrc.push('ws://localhost:*', 'wss://localhost:*');
    }

    return baseDirectives;
  }

  getConfig(): SecurityConfig {
    return this.config;
  }

  getCorsConfig(): CorsConfig {
    return this.config.cors;
  }

  getSecurityHeadersConfig(): SecurityHeadersConfig {
    return this.config.headers;
  }

  getRateLimitConfig(): RateLimitConfig {
    return this.config.rateLimit;
  }

  isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return true; // Same-origin requests
    return this.config.cors.allowedOrigins.includes(origin);
  }
}