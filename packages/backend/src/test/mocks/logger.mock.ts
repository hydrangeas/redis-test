import { vi } from 'vitest';

import type { Logger } from 'pino';

/**
 * テスト用のモックロガーを作成
 */
export function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    level: 'silent',
    silent: vi.fn(),
    child: vi.fn().mockReturnThis(),
    bindings: vi.fn().mockReturnValue({}),
    flush: vi.fn(),
    isLevelEnabled: vi.fn().mockReturnValue(false),
  } as unknown as Logger;
}
