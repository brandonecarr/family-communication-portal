// Performance monitoring utilities

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  status: "success" | "error";
}

const metrics: PerformanceMetric[] = [];

export function recordMetric(
  name: string,
  duration: number,
  status: "success" | "error" = "success"
) {
  metrics.push({
    name,
    duration,
    timestamp: Date.now(),
    status,
  });

  // Keep only last 1000 metrics
  if (metrics.length > 1000) {
    metrics.shift();
  }
}

export function getMetrics() {
  return metrics;
}

export function getAverageResponseTime() {
  if (metrics.length === 0) return 0;
  const total = metrics.reduce((sum, m) => sum + m.duration, 0);
  return Math.round(total / metrics.length);
}

export function getErrorRate() {
  if (metrics.length === 0) return 0;
  const errors = metrics.filter((m) => m.status === "error").length;
  return ((errors / metrics.length) * 100).toFixed(2);
}

export function getMetricsByName(name: string) {
  return metrics.filter((m) => m.name === name);
}

// Performance monitoring middleware
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return (async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      recordMetric(name, duration, "success");
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      recordMetric(name, duration, "error");
      throw error;
    }
  }) as T;
}

// Cache utilities for optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

export function setCache<T>(key: string, data: T, ttlSeconds: number = 300) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds * 1000,
  });
}

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > entry.ttl;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// Batch operation utilities
export async function batchOperations<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(operation));
    results.push(...batchResults);
  }

  return results;
}
