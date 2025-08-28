/**
 * Advanced PowerBI Performance Optimization Service
 * Implements caching, preloading, and resource management
 */

import { Report } from 'powerbi-client';

interface ReportCache {
  reportId: string;
  embedUrl: string;
  accessToken: string;
  lastAccessed: Date;
  preloadedData?: any;
  bookmarks?: any[];
  metadata?: any;
}

interface PerformanceConfig {
  enablePreloading: boolean;
  cacheSize: number;
  preloadDelay: number;
  enableResourceOptimization: boolean;
  maxConcurrentReports: number;
  enableLazyBookmarks: boolean;
}

export class PowerBIPerformanceOptimizer {
  private static instance: PowerBIPerformanceOptimizer;
  private reportCache = new Map<string, ReportCache>();
  private preloadQueue: string[] = [];
  private intersectionObserver?: IntersectionObserver;
  
  private config: PerformanceConfig = {
    enablePreloading: true,
    cacheSize: 10,
    preloadDelay: 2000,
    enableResourceOptimization: true,
    maxConcurrentReports: 3,
    enableLazyBookmarks: true
  };

  private constructor() {
    this.initializeIntersectionObserver();
    this.startCacheCleanup();
  }

  static getInstance(): PowerBIPerformanceOptimizer {
    if (!PowerBIPerformanceOptimizer.instance) {
      PowerBIPerformanceOptimizer.instance = new PowerBIPerformanceOptimizer();
    }
    return PowerBIPerformanceOptimizer.instance;
  }

  /**
   * Initialize intersection observer for lazy loading
   */
  private initializeIntersectionObserver() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const reportId = entry.target.getAttribute('data-report-id');
              if (reportId) {
                this.preloadReport(reportId);
              }
            }
          });
        },
        { rootMargin: '100px' } // Start loading 100px before viewport
      );
    }
  }

  /**
   * Cache report metadata and configuration
   */
  cacheReport(reportId: string, embedUrl: string, accessToken: string, metadata?: any) {
    // Implement LRU cache eviction
    if (this.reportCache.size >= this.config.cacheSize) {
      const oldestKey = Array.from(this.reportCache.entries())
        .sort(([,a], [,b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime())[0][0];
      this.reportCache.delete(oldestKey);
    }

    this.reportCache.set(reportId, {
      reportId,
      embedUrl,
      accessToken,
      lastAccessed: new Date(),
      metadata
    });

    console.log(`📦 Cached report ${reportId} (${this.reportCache.size}/${this.config.cacheSize})`);
  }

  /**
   * Get cached report data
   */
  getCachedReport(reportId: string): ReportCache | null {
    const cached = this.reportCache.get(reportId);
    if (cached) {
      cached.lastAccessed = new Date();
      return cached;
    }
    return null;
  }

  /**
   * Preload report data
   */
  async preloadReport(reportId: string) {
    if (this.preloadQueue.includes(reportId)) return;
    
    this.preloadQueue.push(reportId);
    
    setTimeout(async () => {
      const cached = this.getCachedReport(reportId);
      if (cached && this.config.enablePreloading) {
        try {
          // Preload bookmarks and metadata
          console.log(`🔄 Preloading data for report ${reportId}...`);
          
          // This would be implemented based on your specific needs
          // For example, prefetch bookmark data, report metadata, etc.
          
        } catch (error) {
          console.warn(`⚠️ Preload failed for ${reportId}:`, error);
        }
      }
      
      // Remove from queue
      const index = this.preloadQueue.indexOf(reportId);
      if (index > -1) {
        this.preloadQueue.splice(index, 1);
      }
    }, this.config.preloadDelay);
  }

  /**
   * Observe element for lazy loading
   */
  observeElement(element: HTMLElement, reportId: string) {
    if (this.intersectionObserver) {
      element.setAttribute('data-report-id', reportId);
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Stop observing element
   */
  unobserveElement(element: HTMLElement) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Get optimized embed configuration
   */
  getOptimizedConfig(reportId: string, baseConfig: any) {
    const cached = this.getCachedReport(reportId);
    
    return {
      ...baseConfig,
      settings: {
        ...baseConfig.settings,
        // Performance optimizations
        layoutType: 1, // Use optimized layout
        customLayout: {
          displayOption: 1, // Fit to page
          pageSize: {
            type: 0 // Automatic sizing
          }
        },
        // Reduce network calls
        filterPaneEnabled: false,
        navContentPaneEnabled: false,
        // Cache settings
        ...(cached?.metadata && { metadata: cached.metadata })
      }
    };
  }

  /**
   * Resource bundling for multiple reports
   */
  bundleReportRequests(reports: Array<{reportId: string, embedUrl: string, accessToken: string}>) {
    // Group reports by workspace/domain for batch processing
    const grouped = reports.reduce((acc, report) => {
      const domain = new URL(report.embedUrl).hostname;
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(report);
      return acc;
    }, {} as {[key: string]: typeof reports});

    return grouped;
  }

  /**
   * Cleanup old cache entries
   */
  private startCacheCleanup() {
    setInterval(() => {
      const now = new Date();
      const expiredEntries = Array.from(this.reportCache.entries())
        .filter(([, cache]) => {
          const hoursSinceAccess = (now.getTime() - cache.lastAccessed.getTime()) / (1000 * 60 * 60);
          return hoursSinceAccess > 2; // Remove entries older than 2 hours
        });

      expiredEntries.forEach(([reportId]) => {
        this.reportCache.delete(reportId);
        console.log(`🗑️ Cleaned up cache for report ${reportId}`);
      });
    }, 30 * 60 * 1000); // Run every 30 minutes
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      cacheSize: this.reportCache.size,
      maxCacheSize: this.config.cacheSize,
      preloadQueueSize: this.preloadQueue.length,
      cachedReports: Array.from(this.reportCache.keys())
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Performance config updated:', this.config);
  }
}

export const powerBIOptimizer = PowerBIPerformanceOptimizer.getInstance();
