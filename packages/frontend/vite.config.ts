import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  
  return {
    plugins: [
      react({
        fastRefresh: true,
        babel: {
          plugins: [
            ["@babel/plugin-proposal-decorators", { legacy: true }],
          ],
        },
      }),
      // ビルドサイズの可視化（開発時のみ）
      mode === "development" && visualizer({
        filename: "./dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
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
      },
    },
    
    build: {
      target: "es2015",
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: mode === "development",
      minify: mode === "production" ? "esbuild" : false,
      rollupOptions: {
        output: {
          manualChunks: {
            // ベンダーチャンクの分割
            vendor: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js", "@supabase/auth-ui-react"],
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split(".");
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: "js/[name]-[hash].js",
          entryFileNames: "js/[name]-[hash].js",
        },
      },
      // ビルドパフォーマンスの最適化
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
    },
    
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@supabase/supabase-js",
        "@supabase/auth-ui-react",
      ],
      exclude: ["@vite/client", "@vite/env"],
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});