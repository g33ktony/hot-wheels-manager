/**
 * Dashboard Caching Service
 * 
 * Caches expensive aggregation queries with a configurable TTL (Time To Live)
 * Automatically invalidates cache when inventory, sales, or deliveries change
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired cache entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache value with optional TTL override
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all dashboard-related caches
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Invalidate dashboard metrics specifically
   */
  invalidateDashboardMetrics(): void {
    this.invalidate('dashboard-metrics');
    this.invalidate('dashboard-daily-metrics');
    this.invalidate('dashboard-monthly-metrics');
  }

  /**
   * Invalidate inventory-related caches
   */
  invalidateInventory(): void {
    this.invalidateDashboardMetrics();
    this.invalidate('inventory-stats');
    this.invalidate('inventory-value');
  }

  /**
   * Invalidate sales-related caches
   */
  invalidateSales(): void {
    this.invalidateDashboardMetrics();
    this.invalidate('sales-stats');
    this.invalidate('daily-sales');
  }

  /**
   * Invalidate delivery-related caches
   */
  invalidateDeliveries(): void {
    this.invalidateDashboardMetrics();
    this.invalidate('delivery-stats');
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics (for debugging)
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Destroy the cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const dashboardCache = new DashboardCache();

// Cache key constants
export const CACHE_KEYS = {
  DASHBOARD_METRICS: 'dashboard-metrics',
  DASHBOARD_DAILY: 'dashboard-daily-metrics',
  DASHBOARD_MONTHLY: 'dashboard-monthly-metrics',
  INVENTORY_STATS: 'inventory-stats',
  INVENTORY_VALUE: 'inventory-value',
  SALES_STATS: 'sales-stats',
  DAILY_SALES: 'daily-sales',
  DELIVERY_STATS: 'delivery-stats'
} as const;

export default dashboardCache;
