# Deployment and Optimization Guide

## 1. Model File Management

### CDN Configuration
Configure your CDN to cache the neural network models efficiently:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/models/neuralNets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ];
  }
};
```

### Model Compression
Compress your neural network models for faster loading:

```bash
# Install compression tools
npm install -g gzip-cli brotli-cli

# Compress models
gzip -9 -k public/models/neuralNets/NN_FOOT_23.json
brotli -q 11 -k public/models/neuralNets/NN_FOOT_23.json
```

Update your WebAR Rocks engine to handle compressed models:

```typescript
// Add to webarrocks-enhanced.ts
private async loadCompressedModel(modelPath: string): Promise<any> {
  // Try Brotli first (best compression)
  try {
    const brotliResponse = await fetch(modelPath + '.br');
    if (brotliResponse.ok) {
      const brotliData = await brotliResponse.arrayBuffer();
      const decompressed = await this.decompressBrotli(brotliData);
      return JSON.parse(decompressed);
    }
  } catch (error) {
    console.log('Brotli decompression failed, trying gzip...');
  }

  // Fallback to gzip
  try {
    const gzipResponse = await fetch(modelPath + '.gz');
    if (gzipResponse.ok) {
      const gzipData = await gzipResponse.arrayBuffer();
      const decompressed = await this.decompressGzip(gzipData);
      return JSON.parse(decompressed);
    }
  } catch (error) {
    console.log('Gzip decompression failed, trying uncompressed...');
  }

  // Fallback to uncompressed
  const response = await fetch(modelPath);
  return response.json();
}
```

## 2. Progressive Loading Strategy

### Model Preloading
Implement intelligent model preloading:

```typescript
// src/lib/models/model-preloader.ts
export class ModelPreloader {
  private cache: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  async preloadModels(modelTypes: string[]): Promise<void> {
    const loadPromises = modelTypes.map(type => this.preloadModel(type));
    await Promise.all(loadPromises);
  }

  private async preloadModel(modelType: string): Promise<any> {
    if (this.cache.has(modelType)) {
      return this.cache.get(modelType);
    }

    if (this.loadingPromises.has(modelType)) {
      return this.loadingPromises.get(modelType);
    }

    const loadPromise = this.loadModel(modelType);
    this.loadingPromises.set(modelType, loadPromise);

    try {
      const model = await loadPromise;
      this.cache.set(modelType, model);
      return model;
    } finally {
      this.loadingPromises.delete(modelType);
    }
  }

  private async loadModel(modelType: string): Promise<any> {
    const modelPath = this.getModelPath(modelType);
    return this.loadCompressedModel(modelPath);
  }

  private getModelPath(modelType: string): string {
    switch (modelType) {
      case 'foot':
        return '/models/neuralNets/NN_FOOT_23.json';
      case 'barefoot':
        return '/models/neuralNets/NN_BAREFOOT_3.json';
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }
  }
}
```

### Service Worker Integration
Add service worker for offline model caching:

```javascript
// public/sw.js
const MODEL_CACHE_NAME = 'ar-models-v1';
const MODEL_URLS = [
  '/models/neuralNets/NN_FOOT_23.json',
  '/models/neuralNets/NN_FOOT_23.json.br',
  '/models/neuralNets/NN_BAREFOOT_3.json',
  '/models/neuralNets/NN_BAREFOOT_3.json.br',
  '/models/web-ar-rocks/WebARRocksHand.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(MODEL_CACHE_NAME).then((cache) => {
      return cache.addAll(MODEL_URLS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/models/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          // Cache the response for future use
          const responseClone = response.clone();
          caches.open(MODEL_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
  }
});
```

## 3. Performance Monitoring

### Real-time Performance Metrics
Implement comprehensive performance monitoring:

```typescript
// src/lib/monitoring/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    inferenceTime: [],
    frameRate: [],
    memoryUsage: [],
    accuracy: [],
    modelLoadTime: 0
  };

  private listeners: Map<string, (metrics: any) => void> = new Map();

  recordInferenceTime(time: number): void {
    this.metrics.inferenceTime.push(time);
    this.trimMetrics('inferenceTime', 100);
    this.notifyListeners('inferenceTime', this.getAverage('inferenceTime'));
  }

  recordFrameRate(rate: number): void {
    this.metrics.frameRate.push(rate);
    this.trimMetrics('frameRate', 50);
    this.notifyListeners('frameRate', this.getAverage('frameRate'));
  }

  recordMemoryUsage(usage: number): void {
    this.metrics.memoryUsage.push(usage);
    this.trimMetrics('memoryUsage', 50);
    this.notifyListeners('memoryUsage', this.getAverage('memoryUsage'));
  }

  recordAccuracy(accuracy: number): void {
    this.metrics.accuracy.push(accuracy);
    this.trimMetrics('accuracy', 100);
    this.notifyListeners('accuracy', this.getAverage('accuracy'));
  }

  recordModelLoadTime(time: number): void {
    this.metrics.modelLoadTime = time;
    this.notifyListeners('modelLoadTime', time);
  }

  getPerformanceReport(): PerformanceReport {
    return {
      averageInferenceTime: this.getAverage('inferenceTime'),
      averageFrameRate: this.getAverage('frameRate'),
      averageMemoryUsage: this.getAverage('memoryUsage'),
      averageAccuracy: this.getAverage('accuracy'),
      modelLoadTime: this.metrics.modelLoadTime,
      deviceInfo: this.getDeviceInfo(),
      timestamp: Date.now()
    };
  }

  private getAverage(metric: keyof PerformanceMetrics): number {
    const values = this.metrics[metric];
    if (Array.isArray(values) && values.length > 0) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
    return 0;
  }

  private trimMetrics(metric: keyof PerformanceMetrics, maxSize: number): void {
    const values = this.metrics[metric];
    if (Array.isArray(values) && values.length > maxSize) {
      values.splice(0, values.length - maxSize);
    }
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`
    };
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach((callback) => {
      callback({ event, data });
    });
  }

  onPerformanceUpdate(callback: (metrics: any) => void): void {
    const id = Math.random().toString(36);
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }
}
```

### Analytics Integration
Send performance data to your analytics service:

```typescript
// src/lib/monitoring/analytics.ts
export class AnalyticsReporter {
  constructor(
    private performanceMonitor: PerformanceMonitor,
    private analyticsKey: string
  ) {
    this.setupReporting();
  }

  private setupReporting(): void {
    // Report every 30 seconds
    setInterval(() => {
      this.reportPerformance();
    }, 30000);

    // Report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportPerformance();
    });
  }

  private async reportPerformance(): Promise<void> {
    const report = this.performanceMonitor.getPerformanceReport();
    
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Analytics-Key': this.analyticsKey
        },
        body: JSON.stringify(report)
      });
    } catch (error) {
      console.warn('Failed to report performance metrics:', error);
    }
  }

  reportError(error: Error, context: any): void {
    fetch('/api/analytics/error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Analytics-Key': this.analyticsKey
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        context,
        timestamp: Date.now()
      })
    }).catch(console.warn);
  }
}
```

## 4. A/B Testing Framework

### Model Comparison Testing
Set up A/B testing for different models:

```typescript
// src/lib/testing/ab-testing.ts
export class ABTestingFramework {
  private currentVariant: string;
  private testResults: Map<string, TestResult> = new Map();

  constructor(
    private testId: string,
    private variants: string[]
  ) {
    this.currentVariant = this.assignVariant();
  }

  private assignVariant(): string {
    const random = Math.random();
    const index = Math.floor(random * this.variants.length);
    return this.variants[index];
  }

  getCurrentVariant(): string {
    return this.currentVariant;
  }

  recordEvent(event: string, data: any): void {
    const key = `${this.currentVariant}_${event}`;
    const existing = this.testResults.get(key) || {
      variant: this.currentVariant,
      event,
      count: 0,
      data: []
    };

    existing.count++;
    existing.data.push(data);
    this.testResults.set(key, existing);
  }

  getTestResults(): ABTestResults {
    const results: { [variant: string]: VariantResults } = {};

    this.variants.forEach(variant => {
      results[variant] = {
        totalEvents: 0,
        events: {}
      };

      this.testResults.forEach((result, key) => {
        if (result.variant === variant) {
          results[variant].totalEvents += result.count;
          results[variant].events[result.event] = {
            count: result.count,
            average: this.calculateAverage(result.data)
          };
        }
      });
    });

    return {
      testId: this.testId,
      results,
      winner: this.determineWinner(results),
      timestamp: Date.now()
    };
  }

  private calculateAverage(data: any[]): number {
    if (data.length === 0) return 0;
    const numericData = data.filter(d => typeof d === 'number');
    return numericData.reduce((a, b) => a + b, 0) / numericData.length;
  }

  private determineWinner(results: { [variant: string]: VariantResults }): string | null {
    // Simple winner determination based on accuracy
    let bestVariant = null;
    let bestAccuracy = 0;

    Object.entries(results).forEach(([variant, data]) => {
      const accuracy = data.events['detection_accuracy']?.average || 0;
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestVariant = variant;
      }
    });

    return bestVariant;
  }
}
```

## 5. Production Deployment Checklist

### Pre-deployment Testing
- [ ] Test all model variants on different devices
- [ ] Verify fallback mechanisms work correctly
- [ ] Check memory usage on low-end devices
- [ ] Validate offline functionality
- [ ] Test A/B testing framework
- [ ] Verify analytics reporting
- [ ] Check error handling and recovery

### Performance Optimization
- [ ] Enable model compression (gzip/brotli)
- [ ] Configure CDN caching headers
- [ ] Implement service worker caching
- [ ] Set up progressive loading
- [ ] Optimize mobile detection settings
- [ ] Configure performance monitoring

### Security Considerations
- [ ] Validate model file integrity
- [ ] Implement CORS headers for models
- [ ] Secure analytics endpoints
- [ ] Sanitize user input in training API
- [ ] Implement rate limiting for API calls

### Monitoring Setup
- [ ] Configure error tracking (Sentry)
- [ ] Set up performance monitoring
- [ ] Create alerts for model loading failures
- [ ] Monitor memory usage trends
- [ ] Track model accuracy over time

### Documentation
- [ ] Update API documentation
- [ ] Create user guides for different models
- [ ] Document troubleshooting steps
- [ ] Create performance benchmarks
- [ ] Document deployment procedures

## 6. Post-deployment Optimization

### Continuous Performance Monitoring
Monitor these key metrics after deployment:

1. **Model Loading Performance**
   - Average load time < 3 seconds
   - 95th percentile < 5 seconds
   - Cache hit rate > 90%

2. **Detection Accuracy**
   - Overall accuracy > 85%
   - Mobile accuracy > 80%
   - Low-light performance > 75%

3. **Resource Usage**
   - Memory usage < 200MB on mobile
   - CPU usage < 50% during detection
   - Battery impact < 5% per minute

### Model Updates and Rollback
Implement safe model update procedures:

```typescript
// src/lib/models/model-updater.ts
export class ModelUpdater {
  async updateModel(modelType: string, newVersion: string): Promise<void> {
    // Validate new model
    const validation = await this.validateModel(newVersion);
    if (!validation.isValid) {
      throw new Error(`Model validation failed: ${validation.error}`);
    }

    // Gradual rollout (10% of users first)
    await this.gradualRollout(modelType, newVersion, 0.1);
    
    // Monitor performance for 24 hours
    const performance = await this.monitorPerformance(24 * 60 * 60 * 1000);
    
    if (performance.isAcceptable) {
      // Full rollout
      await this.completeRollout(modelType, newVersion);
    } else {
      // Rollback
      await this.rollback(modelType);
      throw new Error('Model performance degraded, rolled back');
    }
  }

  private async validateModel(version: string): Promise<ValidationResult> {
    // Implement validation logic
    return { isValid: true };
  }

  private async gradualRollout(modelType: string, version: string, percentage: number): Promise<void> {
    // Implement gradual rollout logic
  }

  private async monitorPerformance(duration: number): Promise<PerformanceReport> {
    // Implement monitoring logic
    return { isAcceptable: true };
  }

  private async completeRollout(modelType: string, version: string): Promise<void> {
    // Implement complete rollout logic
  }

  private async rollback(modelType: string): Promise<void> {
    // Implement rollback logic
  }
}
```

This comprehensive deployment and optimization guide ensures your neural network integration is production-ready, performant, and maintainable. The combination of model optimization, performance monitoring, and safe deployment practices will provide a robust foundation for your AR foot detection system.