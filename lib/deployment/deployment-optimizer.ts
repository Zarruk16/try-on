// Deployment optimization configuration
export interface DeploymentConfig {
  cdn: CDNConfig;
  compression: CompressionConfig;
  caching: CachingConfig;
  optimization: OptimizationConfig;
}

export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'vercel' | 'custom';
  domains: string[];
  cacheHeaders: Record<string, string>;
}

export interface CompressionConfig {
  gzip: boolean;
  brotli: boolean;
  threshold: number;
  mimeTypes: string[];
}

export interface CachingConfig {
  staticAssets: number;
  apiResponses: number;
  modelFiles: number;
  images: number;
  strategies: CachingStrategy[];
}

export interface OptimizationConfig {
  minification: boolean;
  treeShaking: boolean;
  codeSplitting: boolean;
  lazyLoading: boolean;
  preloadCritical: boolean;
}

export interface CachingStrategy {
  type: 'memory' | 'disk' | 'service-worker';
  priority: 'high' | 'medium' | 'low';
  maxSize: number;
  ttl: number;
}

export class DeploymentOptimizer {
  private config: DeploymentConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private serviceWorker: ServiceWorker | null = null;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.initializeServiceWorker();
  }

  // Expose a readonly view of current configuration
  getConfig(): DeploymentConfig {
    return this.config;
  }

  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.serviceWorker = registration.active;
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  // Optimize asset loading
  async optimizeAssetLoading(assets: Asset[]): Promise<OptimizedAsset[]> {
    const optimizedAssets: OptimizedAsset[] = [];
    
    for (const asset of assets) {
      const optimized = await this.optimizeAsset(asset);
      optimizedAssets.push(optimized);
    }
    
    return optimizedAssets;
  }

  private async optimizeAsset(asset: Asset): Promise<OptimizedAsset> {
    const optimizations: string[] = [];
    let url = asset.url;
    let size = asset.size;
    
    // Apply CDN optimization
    if (this.config.cdn.enabled) {
      url = this.getCDNUrl(asset.url);
      optimizations.push('cdn');
    }
    
    // Apply compression
    if (this.shouldCompress(asset)) {
      url = this.getCompressedUrl(asset.url);
      size = Math.floor(size * 0.3); // Estimate 70% compression
      optimizations.push('compression');
    }
    
    // Apply caching
    const cacheStrategy = this.getCacheStrategy(asset);
    optimizations.push(`cache-${cacheStrategy.type}`);
    
    return {
      ...asset,
      url,
      size,
      optimizations,
      cacheStrategy
    };
  }

  private getCDNUrl(url: string): string {
    if (this.config.cdn.provider === 'cloudflare') {
      return `https://cdn.example.com${url}`;
    }
    
    if (this.config.cdn.domains.length > 0) {
      const domain = this.config.cdn.domains[0];
      return `https://${domain}${url}`;
    }
    
    return url;
  }

  private shouldCompress(asset: Asset): boolean {
    if (asset.size < this.config.compression.threshold) {
      return false;
    }
    
    return this.config.compression.mimeTypes.includes(asset.mimeType);
  }

  private getCompressedUrl(url: string): string {
    if (this.config.compression.brotli && this.supportsBrotli()) {
      return `${url}.br`;
    }
    
    if (this.config.compression.gzip) {
      return `${url}.gz`;
    }
    
    return url;
  }

  private supportsBrotli(): boolean {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/', true);
      xhr.setRequestHeader('Accept-Encoding', 'br');
      xhr.send();
      const headers = xhr.getAllResponseHeaders() || '';
      return headers.toLowerCase().includes('content-encoding: br');
    } catch {
      return false;
    }
  }

  private getCacheStrategy(asset: Asset): CachingStrategy {
    // Model files
    if (asset.url.includes('/models/')) {
      return {
        type: 'service-worker',
        priority: 'high',
        maxSize: 50 * 1024 * 1024, // 50MB
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      };
    }
    
    // Neural network models
    if (asset.url.includes('/neuralNets/')) {
      return {
        type: 'service-worker',
        priority: 'high',
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      };
    }
    
    // Images
    if (asset.mimeType.startsWith('image/')) {
      return {
        type: 'memory',
        priority: 'medium',
        maxSize: 10 * 1024 * 1024, // 10MB
        ttl: 60 * 60 * 1000 // 1 hour
      };
    }
    
    // JavaScript/CSS
    if (asset.mimeType.includes('javascript') || asset.mimeType.includes('css')) {
      return {
        type: 'disk',
        priority: 'high',
        maxSize: 5 * 1024 * 1024, // 5MB
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      };
    }
    
    // Default strategy
    return {
      type: 'memory',
      priority: 'low',
      maxSize: 1024 * 1024, // 1MB
      ttl: 30 * 60 * 1000 // 30 minutes
    };
  }

  // Preload critical assets
  async preloadCriticalAssets(assets: string[]): Promise<void> {
    const preloadPromises = assets.map(async (assetUrl) => {
      try {
        const optimizedUrl = await this.getOptimizedUrl(assetUrl);
        await this.preloadAsset(optimizedUrl);
      } catch (error) {
        console.warn(`Failed to preload ${assetUrl}:`, error);
      }
    });
    
    await Promise.all(preloadPromises);
  }

  private async getOptimizedUrl(url: string): Promise<string> {
    const asset: Asset = {
      url,
      size: 0,
      mimeType: this.getMimeType(url),
      type: this.getAssetType(url)
    };
    
    const optimized = await this.optimizeAsset(asset);
    return optimized.url;
  }

  private async preloadAsset(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = this.getPreloadType(url);
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload ${url}`));
      
      document.head.appendChild(link);
    });
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'js': 'application/javascript',
      'json': 'application/json',
      'css': 'text/css',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp'
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  private getAssetType(url: string): AssetType {
    if (url.includes('/models/')) return 'model';
    if (url.includes('/neuralNets/')) return 'neural-network';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.endsWith('.js')) return 'script';
    if (url.endsWith('.css')) return 'stylesheet';
    if (url.endsWith('.json')) return 'data';
    
    return 'other';
  }

  private getPreloadType(url: string): string {
    const assetType = this.getAssetType(url);
    
    const preloadTypes: Record<AssetType, string> = {
      'script': 'script',
      'stylesheet': 'style',
      'image': 'image',
      'model': 'fetch',
      'neural-network': 'fetch',
      'data': 'fetch',
      'other': 'fetch'
    };
    
    return preloadTypes[assetType];
  }

  // Implement caching strategies
  async getCachedAsset(url: string): Promise<Response | null> {
    const cacheKey = this.getCacheKey(url);
    
    // Check memory cache first
    const memoryEntry = this.cache.get(cacheKey);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.response.clone();
    }
    
    // Check Service Worker cache
    if (this.serviceWorker && 'caches' in window) {
      try {
        const cache = await caches.open('foot-detection-assets');
        const response = await cache.match(url);
        
        if (response) {
          // Update memory cache
          this.cache.set(cacheKey, {
            response: response.clone(),
            timestamp: Date.now(),
            ttl: this.config.caching.staticAssets * 1000
          });
          
          return response.clone();
        }
      } catch (error) {
        console.warn('Service Worker cache access failed:', error);
      }
    }
    
    return null;
  }

  async cacheAsset(url: string, response: Response): Promise<void> {
    const cacheKey = this.getCacheKey(url);
    const strategy = this.getCacheStrategy({ url, size: 0, mimeType: '', type: 'other' });
    
    // Cache in memory
    if (strategy.type === 'memory') {
      this.cache.set(cacheKey, {
        response: response.clone(),
        timestamp: Date.now(),
        ttl: strategy.ttl
      });
    }
    
    // Cache in Service Worker
    if (strategy.type === 'service-worker' && 'caches' in window) {
      try {
        const cache = await caches.open('foot-detection-assets');
        await cache.put(url, response.clone());
      } catch (error) {
        console.warn('Service Worker caching failed:', error);
      }
    }
  }

  private getCacheKey(url: string): string {
    return url.split('?')[0]; // Remove query parameters
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // Generate optimization report
  generateReport(): OptimizationReport {
    const totalAssets = this.cache.size;
    const memoryUsage = this.getMemoryUsage();
    
    return {
      config: this.config,
      cacheStats: {
        totalAssets,
        memoryUsage,
        hitRate: this.calculateHitRate()
      },
      recommendations: this.generateRecommendations(),
      performanceMetrics: this.getPerformanceMetrics()
    };
  }

  private getMemoryUsage(): number {
    let totalSize = 0;
    
    this.cache.forEach(entry => {
      // Estimate response size (simplified)
      totalSize += 1024; // 1KB placeholder
    });
    
    return totalSize;
  }

  private calculateHitRate(): number {
    // Simplified hit rate calculation
    return this.cache.size > 0 ? 0.8 : 0;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.config.cdn.enabled) {
      recommendations.push('Consider enabling CDN for better global performance');
    }
    
    if (!this.config.compression.gzip && !this.config.compression.brotli) {
      recommendations.push('Enable compression to reduce asset sizes');
    }
    
    if (!this.serviceWorker) {
      recommendations.push('Implement Service Worker for better offline support');
    }
    
    return recommendations;
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    return {
      avgLoadTime: 100, // Placeholder
      cacheHitRate: this.calculateHitRate(),
      compressionRatio: 0.7, // Placeholder
      cdnUsage: this.config.cdn.enabled ? 1 : 0
    };
  }
}

// Types
interface Asset {
  url: string;
  size: number;
  mimeType: string;
  type: AssetType;
}

interface OptimizedAsset extends Asset {
  optimizations: string[];
  cacheStrategy: CachingStrategy;
}

interface CacheEntry {
  response: Response;
  timestamp: number;
  ttl: number;
}

type AssetType = 'script' | 'stylesheet' | 'image' | 'model' | 'neural-network' | 'data' | 'other';

interface OptimizationReport {
  config: DeploymentConfig;
  cacheStats: {
    totalAssets: number;
    memoryUsage: number;
    hitRate: number;
  };
  recommendations: string[];
  performanceMetrics: PerformanceMetrics;
}

interface PerformanceMetrics {
  avgLoadTime: number;
  cacheHitRate: number;
  compressionRatio: number;
  cdnUsage: number;
}

// Default configuration
export const defaultDeploymentConfig: DeploymentConfig = {
  cdn: {
    enabled: true,
    provider: 'cloudflare',
    domains: ['cdn.chrono-stride.com'],
    cacheHeaders: {
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*'
    }
  },
  compression: {
    gzip: true,
    brotli: true,
    threshold: 1024, // 1KB
    mimeTypes: [
      'application/javascript',
      'application/json',
      'text/css',
      'text/html',
      'image/svg+xml'
    ]
  },
  caching: {
    staticAssets: 31536000, // 1 year
    apiResponses: 300, // 5 minutes
    modelFiles: 604800, // 7 days
    images: 86400, // 1 day
    strategies: [
      {
        type: 'service-worker',
        priority: 'high',
        maxSize: 100 * 1024 * 1024, // 100MB
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      {
        type: 'memory',
        priority: 'medium',
        maxSize: 10 * 1024 * 1024, // 10MB
        ttl: 60 * 60 * 1000 // 1 hour
      }
    ]
  },
  optimization: {
    minification: true,
    treeShaking: true,
    codeSplitting: true,
    lazyLoading: true,
    preloadCritical: true
  }
};