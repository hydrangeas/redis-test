import { defineConfig } from 'vite';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  build: {
    target: 'node18',
    ssr: true,
    rollupOptions: {
      input: 'src/index.ts',
      output: {
        format: 'esm',
        entryFileNames: 'app.js',
      },
      external: [
        // Vercel Edge Runtimeで提供される依存関係
        '@vercel/node',
        'node:crypto',
        'node:stream',
        'node:buffer',
      ],
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
      },
    },
  },
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs(),
  ],
});
