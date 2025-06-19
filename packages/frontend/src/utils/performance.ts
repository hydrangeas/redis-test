/**
 * パフォーマンス監視ユーティリティ
 * Web Vitalsの測定とレポート
 */

import type { Metric } from "web-vitals";

// メトリクスの型定義
export interface PerformanceMetrics {
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  TTFB?: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
}

// メトリクスを収集するストレージ
const metricsStorage: PerformanceMetrics = {};

// メトリクスのレポート先URL（必要に応じて設定）
const METRICS_ENDPOINT = import.meta.env.VITE_METRICS_ENDPOINT;

// コンソールにメトリクスを出力（開発環境のみ）
const logMetric = (metric: Metric) => {
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  }
};

// メトリクスをサーバーに送信
const sendMetrics = async (metrics: PerformanceMetrics) => {
  if (!METRICS_ENDPOINT) {
    return;
  }

  try {
    await fetch(METRICS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metrics,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Failed to send metrics:", error);
  }
};

// Web Vitalsの測定
export const measureWebVitals = async () => {
  if (!("PerformanceObserver" in window)) {
    console.warn("PerformanceObserver is not supported");
    return;
  }

  try {
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import("web-vitals");

    // 各メトリクスの測定
    onCLS((metric) => {
      metricsStorage.CLS = metric.value;
      logMetric(metric);
    });

    onFCP((metric) => {
      metricsStorage.FCP = metric.value;
      logMetric(metric);
    });

    onLCP((metric) => {
      metricsStorage.LCP = metric.value;
      logMetric(metric);
    });

    onTTFB((metric) => {
      metricsStorage.TTFB = metric.value;
      logMetric(metric);
    });

    onINP((metric) => {
      metricsStorage.INP = metric.value;
      logMetric(metric);
    });

    // ページ離脱時にメトリクスを送信
    if (METRICS_ENDPOINT) {
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          sendMetrics(metricsStorage);
        }
      });
    }
  } catch (error) {
    console.error("Failed to load web-vitals:", error);
  }
};

// カスタムパフォーマンスマーカー
export const mark = (name: string) => {
  if ("performance" in window && "mark" in window.performance) {
    performance.mark(name);
  }
};

// カスタムパフォーマンス測定
export const measure = (name: string, startMark: string, endMark?: string) => {
  if ("performance" in window && "measure" in window.performance) {
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      // 測定結果を取得
      const entries = performance.getEntriesByName(name, "measure");
      const lastEntry = entries[entries.length - 1];

      if (lastEntry && import.meta.env.DEV) {
        console.log(
          `[Performance] ${name}: ${lastEntry.duration.toFixed(2)}ms`
        );
      }

      return lastEntry?.duration;
    } catch (error) {
      console.error(`Failed to measure ${name}:`, error);
    }
  }
};

// リソースタイミングの分析
export const analyzeResourceTimings = () => {
  if (!("performance" in window) || !("getEntriesByType" in performance)) {
    return;
  }

  const resources = performance.getEntriesByType(
    "resource"
  ) as PerformanceResourceTiming[];

  // リソースタイプ別に分類
  const resourcesByType = resources.reduce(
    (acc, resource) => {
      const type = getResourceType(resource.name);
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize,
        cached: resource.transferSize === 0,
      });
      return acc;
    },
    {} as Record<string, Array<{ name: string; duration: number; size: number; cached: boolean }>>
  );

  if (import.meta.env.DEV) {
    console.log("[Performance] Resource Timings:", resourcesByType);
  }

  return resourcesByType;
};

// リソースタイプを判定
const getResourceType = (url: string): string => {
  const extension = url.split(".").pop()?.toLowerCase() || "";

  if (["js", "mjs", "jsx", "ts", "tsx"].includes(extension)) {
    return "script";
  }
  if (["css", "scss", "sass", "less"].includes(extension)) {
    return "style";
  }
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"].includes(extension)) {
    return "image";
  }
  if (["woff", "woff2", "ttf", "otf", "eot"].includes(extension)) {
    return "font";
  }
  if (url.includes("/api/")) {
    return "api";
  }

  return "other";
};

// メモリ使用量の監視（Chrome限定）
export const monitorMemoryUsage = () => {
  if (!("memory" in performance)) {
    return;
  }

  const memory = (performance as Performance & { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const usage = {
    usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + " MB",
    totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + " MB",
    jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + " MB",
    percentUsed:
      ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2) + "%",
  };

  if (import.meta.env.DEV) {
    console.log("[Performance] Memory Usage:", usage);
  }

  return usage;
};

// パフォーマンスレポートの生成
export const generatePerformanceReport = () => {
  const report = {
    webVitals: metricsStorage,
    resources: analyzeResourceTimings(),
    memory: monitorMemoryUsage(),
    navigation: getNavigationTiming(),
  };

  if (import.meta.env.DEV) {
    console.log("[Performance] Full Report:", report);
  }

  return report;
};

// ナビゲーションタイミングの取得
const getNavigationTiming = () => {
  if (!("performance" in window) || !("timing" in performance)) {
    return null;
  }

  const timing = performance.timing;
  const navigationStart = timing.navigationStart;

  return {
    dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
    tcpConnection: timing.connectEnd - timing.connectStart,
    request: timing.responseStart - timing.requestStart,
    response: timing.responseEnd - timing.responseStart,
    domProcessing: timing.domComplete - timing.domLoading,
    domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
    loadComplete: timing.loadEventEnd - navigationStart,
  };
};

// パフォーマンス最適化の提案
export const getOptimizationSuggestions = (): string[] => {
  const suggestions: string[] = [];
  const metrics = metricsStorage;

  // LCP（Largest Contentful Paint）が遅い場合
  if (metrics.LCP && metrics.LCP > 2500) {
    suggestions.push(
      "LCPが2.5秒を超えています。画像の最適化やサーバーレスポンスの改善を検討してください。"
    );
  }

  // CLS（Cumulative Layout Shift）が高い場合
  if (metrics.CLS && metrics.CLS > 0.1) {
    suggestions.push(
      "CLSが0.1を超えています。画像やiframeのサイズを明示的に指定してください。"
    );
  }

  // INP（Interaction to Next Paint）が長い場合
  if (metrics.INP && metrics.INP > 200) {
    suggestions.push(
      "INPが200msを超えています。JavaScriptの実行を最適化してください。"
    );
  }

  return suggestions;
};
