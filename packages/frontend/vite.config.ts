import { defineConfig, loadEnv, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

/// <reference types="vitest" />
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";
  const isAnalyze = mode === "analyze";
  
  return {
    plugins: [
      react({
        fastRefresh: !isProduction,
        babel: {
          plugins: [
            ["@babel/plugin-proposal-decorators", { legacy: true }],
          ],
        },
      }),
      // ベンダーチャンクの自動分割
      splitVendorChunkPlugin(),
      // Gzip圧縮
      isProduction && viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        deleteOriginFile: false,
      }),
      // Brotli圧縮
      isProduction && viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        deleteOriginFile: false,
      }),
      // ビルドサイズの可視化
      (isAnalyze || process.env.ANALYZE === 'true') && visualizer({
        filename: "./dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
    ].filter(Boolean),
    
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@components": resolve(__dirname, "./src/components"),
        "@hooks": resolve(__dirname, "./src/hooks"),
        "@services": resolve(__dirname, "./src/services"),
        "@utils": resolve(__dirname, "./src/utils"),
        "@assets": resolve(__dirname, "./src/assets"),
        "@types": resolve(__dirname, "./src/types"),
        "@shared": resolve(__dirname, "../shared/src"),
      },
    },
    
    server: {
      port: 3000,
      host: true,
      open: true,
      cors: true,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on("error", (err, req, res) => {
              console.log("proxy error", err);
            });
            proxy.on("proxyReq", (proxyReq, req, res) => {
              console.log("Sending Request:", req.method, req.url);
            });
            proxy.on("proxyRes", (proxyRes, req, res) => {
              console.log("Received Response:", proxyRes.statusCode);
            });
          },
        },
        "/api-docs": {
          target: env.VITE_API_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
        "/openapi.json": {
          target: env.VITE_API_URL || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
    
    build: {
      target: "es2015",
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: isProduction ? false : 'inline',
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        },
        format: {
          comments: false,
        },
      } : undefined,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // node_modules内のパッケージを分析
            if (id.includes('node_modules')) {
              // React関連
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              // Supabase関連
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // UIライブラリ
              if (id.includes('@headlessui') || id.includes('class-variance-authority') || id.includes('clsx')) {
                return 'ui-vendor';
              }
              // その他のユーティリティ
              return 'vendor';
            }
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split(".");
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : '';
            return `js/[name]-[hash].js`;
          },
          entryFileNames: "js/[name]-[hash].js",
        },
        // Tree shakingの最適化
        treeshake: {
          moduleSideEffects: 'no-external',
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
      // ビルドパフォーマンスの最適化
      reportCompressedSize: !isProduction,
      chunkSizeWarningLimit: 1000,
      // CSSコード分割
      cssCodeSplit: true,
      // アセットのインライン化の閾値
      assetsInlineLimit: 4096,
    },
    
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@supabase/supabase-js",
        "@supabase/auth-ui-react",
        "@supabase/auth-ui-shared",
        "@headlessui/react",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
      exclude: ["@vite/client", "@vite/env"],
      // 事前バンドルの強制
      force: true,
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      // 本番環境でReact DevToolsを無効化
      ...(isProduction && {
        'process.env.NODE_ENV': '"production"',
      }),
    },
    
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/__mocks__/**',
          'src/main.tsx',
          'dist/',
        ],
      },
    },
  };
});