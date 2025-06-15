import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['test/e2e/**/*.e2e.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000, // 30 seconds for E2E tests
    hookTimeout: 60000, // 60 seconds for setup/teardown
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run E2E tests sequentially to avoid port conflicts
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/e2e',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.ts',
        '**/*.e2e.test.ts',
        'test/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});