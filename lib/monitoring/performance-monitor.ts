// Performance monitoring and analytics for foot detection
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    detectionTime: [],
    accuracy: [],
    frameRate: [],
    memoryUsage: [],
    modelLoadTimes: [],
    errorRate: []
  };
  
  private sessionData: SessionData = {
    startTime: Date.now(),
    totalFrames: 0,
    totalDetections: 0,
    errors: 0,
    modelSwitches: 0
  };
  
  private analytics: AnalyticsData = {
    userInteractions: [],
    deviceInfo: this.getDeviceInfo(),
    modelPerformance: new Map(),
    accuracyTrends: []
  };
  
  private isMonitoring = false;
  private sampleInterval: number | null = null;
  private callbacks: MonitoringCallbacks = {};

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Set up performance observers
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObservers();
    }
    
    // Set up memory monitoring
    if ('memory' in performance) {
      this.setupMemoryMonitoring();
    }
  }

  private setupPerformanceObservers(): void {
    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordLongTask(entry as any);
      }
    });
    
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    
    // Monitor frame drops
    const frameObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.name.includes('frame')) {
          this.recordFrameTiming(entry as any);
        }
      }
    });
    
    frameObserver.observe({ entryTypes: ['measure'] });
  }

  private setupMemoryMonitoring(): void {
    const memoryInfo = (performance as any).memory;
    
    if (memoryInfo) {
      this.sampleInterval = window.setInterval(() => {
        this.recordMemoryUsage({
          usedJSHeapSize: memoryInfo.usedJSHeapSize,
          totalJSHeapSize: memoryInfo.totalJSHeapSize,
          jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }, 1000);
    }
  }

  // Start performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.sessionData.startTime = Date.now();
    
    if (this.callbacks.onMonitoringStart) {
      this.callbacks.onMonitoringStart();
    }
    
    console.log('[PerformanceMonitor] Monitoring started');
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
    
    if (this.callbacks.onMonitoringStop) {
      this.callbacks.onMonitoringStop(this.generateReport());
    }
    
    console.log('[PerformanceMonitor] Monitoring stopped');
  }

  // Record detection performance
  recordDetection(detectionData: DetectionData): void {
    if (!this.isMonitoring) return;
    
    this.sessionData.totalDetections++;
    
    // Record detection time
    if (detectionData.detectionTime) {
      this.metrics.detectionTime.push(detectionData.detectionTime);
      this.trimMetrics('detectionTime', 1000);
    }
    
    // Record accuracy
    if (detectionData.accuracy !== undefined) {
      this.metrics.accuracy.push(detectionData.accuracy);
      this.trimMetrics('accuracy', 1000);
    }
    
    // Record frame rate
    if (detectionData.frameRate) {
      this.metrics.frameRate.push(detectionData.frameRate);
      this.trimMetrics('frameRate', 1000);
    }
    
    // Record model information
    if (detectionData.modelName) {
      this.recordModelPerformance(detectionData.modelName, detectionData);
    }
    
    // Check for performance issues
    this.checkPerformanceIssues(detectionData);
    
    if (this.callbacks.onDetection) {
      this.callbacks.onDetection(detectionData);
    }
  }

  // Record model loading performance
  recordModelLoad(modelName: string, loadTime: number, success: boolean): void {
    this.metrics.modelLoadTimes.push({
      modelName,
      loadTime,
      success,
      timestamp: Date.now()
    });
    
    this.trimMetrics('modelLoadTimes', 100);
    
    if (!success) {
      this.recordError('model_load_failed', { modelName, loadTime });
    }
  }

  // Record model switching
  recordModelSwitch(fromModel: string, toModel: string, reason: string): void {
    this.sessionData.modelSwitches++;
    
    // Track model switch as a user interaction and update performance snapshot
    this.analytics.userInteractions.push({ type: 'model_switch', data: { fromModel, toModel, reason }, timestamp: Date.now() });
    
    if (this.callbacks.onModelSwitch) {
      this.callbacks.onModelSwitch({ fromModel, toModel, reason });
    }
  }

  // Record user interaction
  recordUserInteraction(interaction: UserInteraction): void {
    this.analytics.userInteractions.push({
      ...interaction,
      timestamp: Date.now()
    });
    
    // Trim interactions to prevent memory bloat
    if (this.analytics.userInteractions.length > 1000) {
      this.analytics.userInteractions = this.analytics.userInteractions.slice(-500);
    }
  }

  // Record error
  recordError(errorType: string, details: any): void {
    this.sessionData.errors++;
    
    this.metrics.errorRate.push({
      type: errorType,
      details,
      timestamp: Date.now()
    });
    
    this.trimMetrics('errorRate', 500);
    
    if (this.callbacks.onError) {
      this.callbacks.onError(errorType, details);
    }
  }

  private recordLongTask(entry: any): void {
    if (entry.duration > 50) { // Tasks longer than 50ms
      this.recordError('long_task', {
        duration: entry.duration,
        startTime: entry.startTime
      });
    }
  }

  private recordFrameTiming(entry: any): void {
    const targetFrameTime = 1000 / 30; // 30 FPS target
    
    if (entry.duration > targetFrameTime) {
      this.recordError('frame_drop', {
        actualTime: entry.duration,
        targetTime: targetFrameTime
      });
    }
  }

  private recordMemoryUsage(memoryData: MemoryUsage): void {
    this.metrics.memoryUsage.push({
      ...memoryData,
      timestamp: Date.now()
    });
    
    this.trimMetrics('memoryUsage', 500);
    
    // Check for memory issues
    const usagePercentage = memoryData.usedJSHeapSize / memoryData.jsHeapSizeLimit;
    if (usagePercentage > 0.9) {
      this.recordError('high_memory_usage', {
        usagePercentage,
        used: memoryData.usedJSHeapSize,
        limit: memoryData.jsHeapSizeLimit
      });
    }
  }

  private recordModelPerformance(modelName: string, detectionData: DetectionData): void {
    if (!this.analytics.modelPerformance.has(modelName)) {
      this.analytics.modelPerformance.set(modelName, {
        totalDetections: 0,
        avgDetectionTime: 0,
        avgAccuracy: 0,
        lastUpdate: Date.now()
      });
    }
    
    const stats = this.analytics.modelPerformance.get(modelName)!;
    stats.totalDetections++;
    
    if (detectionData.detectionTime) {
      stats.avgDetectionTime = this.updateAverage(
        stats.avgDetectionTime,
        detectionData.detectionTime,
        stats.totalDetections
      );
    }
    
    if (detectionData.accuracy !== undefined) {
      stats.avgAccuracy = this.updateAverage(
        stats.avgAccuracy,
        detectionData.accuracy,
        stats.totalDetections
      );
    }
    
    stats.lastUpdate = Date.now();
  }

  private updateAverage(currentAvg: number, newValue: number, count: number): number {
    return (currentAvg * (count - 1) + newValue) / count;
  }

  private checkPerformanceIssues(detectionData: DetectionData): void {
    // Check for slow detection
    if (detectionData.detectionTime && detectionData.detectionTime > 100) {
      this.recordError('slow_detection', {
        detectionTime: detectionData.detectionTime,
        threshold: 100
      });
    }
    
    // Check for low accuracy
    if (detectionData.accuracy !== undefined && detectionData.accuracy < 0.5) {
      this.recordError('low_accuracy', {
        accuracy: detectionData.accuracy,
        threshold: 0.5
      });
    }
    
    // Check for low frame rate
    if (detectionData.frameRate && detectionData.frameRate < 15) {
      this.recordError('low_frame_rate', {
        frameRate: detectionData.frameRate,
        threshold: 15
      });
    }
  }

  private trimMetrics(metricName: keyof PerformanceMetrics, maxSize: number): void {
    const metric = this.metrics[metricName] as any[];
    if (metric.length > maxSize) {
      this.metrics[metricName] = metric.slice(-maxSize) as any;
    }
  }

  private getCurrentPerformance(): PerformanceSnapshot {
    return {
      avgDetectionTime: this.getAverage('detectionTime'),
      avgAccuracy: this.getAverage('accuracy'),
      avgFrameRate: this.getAverage('frameRate'),
      currentMemoryUsage: this.getLatestMemoryUsage(),
      errorRate: this.getErrorRate()
    };
  }

  private getAverage(metricName: keyof PerformanceMetrics): number {
    const metric = this.metrics[metricName] as number[];
    if (metric.length === 0) return 0;
    
    const sum = metric.reduce((a, b) => a + b, 0);
    return sum / metric.length;
  }

  private getLatestMemoryUsage(): number {
    const memoryData = this.metrics.memoryUsage;
    if (memoryData.length === 0) return 0;
    
    const latest = memoryData[memoryData.length - 1];
    return latest.usedJSHeapSize;
  }

  private getErrorRate(): number {
    const totalOperations = this.sessionData.totalDetections + this.sessionData.modelSwitches;
    return totalOperations > 0 ? this.sessionData.errors / totalOperations : 0;
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      memory: (performance as any).memory,
      cores: (navigator as any).hardwareConcurrency
    };
  }

  // Generate performance report
  generateReport(): PerformanceReport {
    const sessionDuration = Date.now() - this.sessionData.startTime;
    
    return {
      sessionData: { ...this.sessionData, duration: sessionDuration },
      metrics: {
        avgDetectionTime: this.getAverage('detectionTime'),
        avgAccuracy: this.getAverage('accuracy'),
        avgFrameRate: this.getAverage('frameRate'),
        avgMemoryUsage: this.getAverage('memoryUsage'),
        modelLoadTimes: this.metrics.modelLoadTimes,
        errorRate: this.getErrorRate()
      },
      analytics: {
        modelPerformance: Object.fromEntries(this.analytics.modelPerformance),
        deviceInfo: this.analytics.deviceInfo,
        userInteractions: this.analytics.userInteractions.slice(-100) // Last 100 interactions
      },
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const avgDetectionTime = this.getAverage('detectionTime');
    const avgAccuracy = this.getAverage('accuracy');
    const avgFrameRate = this.getAverage('frameRate');
    const errorRate = this.getErrorRate();
    
    if (avgDetectionTime > 50) {
      recommendations.push('Consider optimizing detection algorithm for better performance');
    }
    
    if (avgAccuracy < 0.7) {
      recommendations.push('Model accuracy is low - consider retraining or switching models');
    }
    
    if (avgFrameRate < 20) {
      recommendations.push('Frame rate is low - consider reducing processing complexity');
    }
    
    if (errorRate > 0.1) {
      recommendations.push('High error rate detected - investigate error sources');
    }
    
    if (this.sessionData.modelSwitches > 10) {
      recommendations.push('Frequent model switching - consider model stability improvements');
    }
    
    return recommendations;
  }

  // Export data for analysis
  exportData(): MonitoringExport {
    return {
      timestamp: Date.now(),
      sessionData: this.sessionData,
      metrics: this.metrics,
      analytics: this.analytics,
      report: this.generateReport()
    };
  }

  // Set callbacks
  setCallbacks(callbacks: MonitoringCallbacks): void {
    this.callbacks = callbacks;
  }

  // Get current status
  getStatus(): MonitoringStatus {
    return {
      isMonitoring: this.isMonitoring,
      sessionDuration: Date.now() - this.sessionData.startTime,
      totalDetections: this.sessionData.totalDetections,
      errorRate: this.getErrorRate(),
      avgDetectionTime: this.getAverage('detectionTime'),
      avgAccuracy: this.getAverage('accuracy')
    };
  }
}

// Types
interface PerformanceMetrics {
  detectionTime: number[];
  accuracy: number[];
  frameRate: number[];
  memoryUsage: MemoryUsage[];
  modelLoadTimes: ModelLoadTime[];
  errorRate: ErrorRecord[];
}

interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface ModelLoadTime {
  modelName: string;
  loadTime: number;
  success: boolean;
  timestamp: number;
}

interface ErrorRecord {
  type: string;
  details: any;
  timestamp: number;
}

interface SessionData {
  startTime: number;
  totalFrames: number;
  totalDetections: number;
  errors: number;
  modelSwitches: number;
}

interface AnalyticsData {
  userInteractions: UserInteraction[];
  deviceInfo: DeviceInfo;
  modelPerformance: Map<string, ModelPerformanceStats>;
  accuracyTrends: AccuracyTrend[];
}

interface ModelPerformanceStats {
  totalDetections: number;
  avgDetectionTime: number;
  avgAccuracy: number;
  lastUpdate: number;
}

interface AccuracyTrend {
  timestamp: number;
  accuracy: number;
  modelName: string;
}

interface UserInteraction {
  type: string;
  data: any;
  timestamp: number;
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  memory?: any;
  cores?: number;
}

interface DetectionData {
  detectionTime?: number;
  accuracy?: number;
  frameRate?: number;
  modelName?: string;
  confidence?: number;
}

interface PerformanceSnapshot {
  avgDetectionTime: number;
  avgAccuracy: number;
  avgFrameRate: number;
  currentMemoryUsage: number;
  errorRate: number;
}

interface MonitoringCallbacks {
  onMonitoringStart?: () => void;
  onMonitoringStop?: (report: PerformanceReport) => void;
  onDetection?: (data: DetectionData) => void;
  onModelSwitch?: (data: ModelSwitchData) => void;
  onError?: (type: string, details: any) => void;
}

interface ModelSwitchData {
  fromModel: string;
  toModel: string;
  reason: string;
}

interface PerformanceReport {
  sessionData: SessionData & { duration: number };
  metrics: {
    avgDetectionTime: number;
    avgAccuracy: number;
    avgFrameRate: number;
    avgMemoryUsage: number;
    modelLoadTimes: ModelLoadTime[];
    errorRate: number;
  };
  analytics: {
    modelPerformance: Record<string, ModelPerformanceStats>;
    deviceInfo: DeviceInfo;
    userInteractions: UserInteraction[];
  };
  recommendations: string[];
}

interface MonitoringExport {
  timestamp: number;
  sessionData: SessionData;
  metrics: PerformanceMetrics;
  analytics: AnalyticsData;
  report: PerformanceReport;
}

interface MonitoringStatus {
  isMonitoring: boolean;
  sessionDuration: number;
  totalDetections: number;
  errorRate: number;
  avgDetectionTime: number;
  avgAccuracy: number;
}