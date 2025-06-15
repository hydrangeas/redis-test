import { faker } from '@faker-js/faker/locale/ja';

export interface AuthLog {
  id: string;
  user_id: string | null;
  event: string;
  provider: string;
  ip_address: string;
  user_agent: string;
  result: 'success' | 'failed';
  error_message: string | null;
  created_at: Date;
}

export interface ApiLog {
  id: string;
  user_id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time: number;
  response_size: number;
  ip_address: string;
  user_agent: string;
  error_message: string | null;
  created_at: Date;
}

export interface RateLimitLog {
  id: string;
  user_id: string;
  endpoint: string;
  window_start: Date;
  request_count: number;
  created_at: Date;
}

export class LogFactory {
  static createAuthLog(overrides?: Partial<AuthLog>): AuthLog {
    const isSuccess = faker.datatype.boolean();
    const event = faker.helpers.arrayElement([
      'login_success',
      'login_failed',
      'logout',
      'token_refresh',
      'password_reset',
    ]);

    return {
      id: faker.string.uuid(),
      user_id: isSuccess ? faker.string.uuid() : null,
      event,
      provider: faker.helpers.arrayElement(['email', 'google', 'github']),
      ip_address: faker.internet.ipv4(),
      user_agent: faker.internet.userAgent(),
      result: isSuccess ? 'success' : 'failed',
      error_message: isSuccess ? null : faker.helpers.arrayElement([
        'Invalid credentials',
        'Account locked',
        'Email not verified',
        'Invalid token',
      ]),
      created_at: faker.date.recent({ days: 30 }),
      ...overrides,
    };
  }

  static createApiLog(userId: string, overrides?: Partial<ApiLog>): ApiLog {
    const defaultStatusCode = faker.helpers.arrayElement([200, 200, 200, 200, 404, 429, 500]);
    const statusCode = overrides?.status_code ?? defaultStatusCode;
    const isSuccess = statusCode === 200;

    return {
      id: faker.string.uuid(),
      user_id: userId,
      method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
      endpoint: faker.helpers.arrayElement([
        '/secure/population/2024.json',
        '/secure/budget/2024.json',
        '/secure/tourism/spots.json',
        '/secure/weather/current.json',
        '/secure/statistics/demographics.json',
      ]),
      status_code: statusCode,
      response_time: faker.number.int({ min: 10, max: 500 }),
      response_size: isSuccess ? faker.number.int({ min: 100, max: 10000 }) : 0,
      ip_address: faker.internet.ipv4(),
      user_agent: faker.internet.userAgent(),
      error_message: isSuccess ? null : this.getErrorMessage(statusCode),
      created_at: faker.date.recent({ days: 7 }),
      ...overrides,
    };
  }

  static createRateLimitLog(userId: string, overrides?: Partial<RateLimitLog>): RateLimitLog {
    const windowStart = faker.date.recent({ days: 1 });
    
    return {
      id: faker.string.uuid(),
      user_id: userId,
      endpoint: faker.helpers.arrayElement([
        '/secure/population/2024.json',
        '/secure/budget/2024.json',
        '/secure/tourism/spots.json',
      ]),
      window_start: windowStart,
      request_count: faker.number.int({ min: 1, max: 100 }),
      created_at: windowStart,
      ...overrides,
    };
  }

  static createManyAuthLogs(count: number, overrides?: Partial<AuthLog>): AuthLog[] {
    return Array.from({ length: count }, () => this.createAuthLog(overrides));
  }

  static createManyApiLogs(userId: string, count: number, overrides?: Partial<ApiLog>): ApiLog[] {
    return Array.from({ length: count }, () => this.createApiLog(userId, overrides));
  }

  static createManyRateLimitLogs(userId: string, count: number, overrides?: Partial<RateLimitLog>): RateLimitLog[] {
    return Array.from({ length: count }, () => this.createRateLimitLog(userId, overrides));
  }

  private static getErrorMessage(statusCode: number): string {
    const errorMessages: Record<number, string> = {
      404: 'Resource not found',
      429: 'Rate limit exceeded',
      500: 'Internal server error',
    };
    return errorMessages[statusCode] || 'Unknown error';
  }
}