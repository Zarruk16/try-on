// Comprehensive neural network integration example
import React, { useEffect, useRef, useState } from 'react';
import { createFootDetectionManager } from '../detection/manager';
import { PerformanceMonitor } from '../monitoring/performance-monitor';
import { TrainingPipeline } from '../training/training-pipeline';
import { DeploymentOptimizer, defaultDeploymentConfig } from '../deployment/deployment-optimizer';
import { MobileOptimizer } from '../optimization/mobile-optimizer';

interface IntegrationOptions {
  enableMobileOptimization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableTrainingPipeline?: boolean;
  enableDeploymentOptimization?: boolean;
  preferredEngine?: 'enhanced-webarrocks' | 'mediapipe-tasks' | 'auto';
}

export class NeuralNetworkIntegration {
  private detectionManager: any;
  private performanceMonitor: PerformanceMonitor;
  private trainingPipeline: TrainingPipeline | null = null;
  private deploymentOptimizer: DeploymentOptimizer;
  private mobileOptimizer: MobileOptimizer;
  private options: IntegrationOptions;
  private isInitialized = false;

  constructor(options: IntegrationOptions = {}) {
    this.options = {
      enableMobileOptimization: true,
      enablePerformanceMonitoring: true,
      enableTrainingPipeline: false,
      enableDeploymentOptimization: true,
      preferredEngine: 'enhanced-webarrocks',
      ...options
    };

    // Initialize components
    this.performanceMonitor = new PerformanceMonitor();
    this.mobileOptimizer = new MobileOptimizer();
    this.deploymentOptimizer = new DeploymentOptimizer(defaultDeploymentConfig);
  }

  // Initialize the complete integration
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[NeuralNetworkIntegration] Initializing...');

    try {
      // Initialize detection manager with enhanced configuration
      this.detectionManager = await createFootDetectionManager({
        preset: 'full',
        engineType: this.options.preferredEngine,
        enableMobileOptimization: this.options.enableMobileOptimization,
        enableModelSwitching: true
      });
      await this.detectionManager.initialize();

      // Initialize training pipeline if enabled
      if (this.options.enableTrainingPipeline) {
        this.trainingPipeline = new TrainingPipeline({
          architecture: 'convnet',
          inputSize: 224,
          outputSize: 9, // 9 keypoints for foot detection
          learningRate: 0.001,
          hiddenLayers: [128, 64, 32]
        });
      }

      // Start performance monitoring
      if (this.options.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Initialize deployment optimization
      if (this.options.enableDeploymentOptimization) {
        await this.setupDeploymentOptimization();
      }

      this.isInitialized = true;
      console.log('[NeuralNetworkIntegration] Initialization complete');

    } catch (error) {
      console.error('[NeuralNetworkIntegration] Initialization failed:', error);
      throw error;
    }
  }

  // Set up performance monitoring
  private setupPerformanceMonitoring(): void {
    this.performanceMonitor.setCallbacks({
      onMonitoringStart: () => {
        console.log('[PerformanceMonitor] Monitoring started');
      },
      onDetection: (data) => {
        // Log detection performance
        if ((data.detectionTime || 0) > 50) {
          console.warn(`[PerformanceMonitor] Slow detection: ${data.detectionTime}ms`);
        }
      },
      onModelSwitch: (data) => {
        console.log(`[PerformanceMonitor] Model switch: ${data.fromModel} -> ${data.toModel} (${data.reason})`);
      },
      onError: (type, details) => {
        console.error(`[PerformanceMonitor] Error: ${type}`, details);
      }
    });

    this.performanceMonitor.startMonitoring();
  }

  // Set up deployment optimization
  private async setupDeploymentOptimization(): Promise<void> {
    // Preload critical assets
    const criticalAssets = [
      '/models/neuralNets/NN_FOOT_23.json',
      '/models/neuralNets/NN_BAREFOOT_3.json',
      '/models/web-ar-rocks/WebARRocksHand.js'
    ];

    await this.deploymentOptimizer.preloadCriticalAssets(criticalAssets);

    // Register service worker (guard for SSR)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[DeploymentOptimizer] Service Worker registered');
      } catch (error) {
        console.warn('[DeploymentOptimizer] Service Worker registration failed:', error);
      }
    }
  }

  // Process video frame for foot detection
  async processVideoFrame(video: HTMLVideoElement): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('NeuralNetworkIntegration not initialized');
    }

    const startTime = performance.now();

    try {
      // Apply mobile optimization if enabled
      let processedVideo = video;
      if (this.options.enableMobileOptimization && this.mobileOptimizer.isMobileDevice()) {
        processedVideo = this.optimizeVideoForMobile(video);
      }

      // Perform detection
      const results = await this.detectionManager.estimate(processedVideo);

      // Record performance metrics
      if (this.options.enablePerformanceMonitoring) {
        const detectionTime = performance.now() - startTime;
        
        this.performanceMonitor.recordDetection({
          detectionTime,
          accuracy: this.calculateAccuracy(results),
          frameRate: this.calculateFrameRate(),
          modelName: this.detectionManager.getCurrentEngine(),
          confidence: this.calculateAverageConfidence(results)
        });
      }

      return results;

    } catch (error) {
      this.performanceMonitor.recordError('detection_failed', {
        error: (error as Error)?.message || String(error),
        timestamp: Date.now()
      });
      
      throw error;
    }
  }

  // Optimize video for mobile devices
  private optimizeVideoForMobile(video: HTMLVideoElement): HTMLVideoElement {
    const level = this.mobileOptimizer.getOptimizationLevel();
    
    if (level >= 2) {
      // High optimization: reduce video resolution
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Create optimized video element
        const optimizedVideo = document.createElement('video');
        optimizedVideo.width = canvas.width;
        optimizedVideo.height = canvas.height;
        
        // Copy video properties
        optimizedVideo.autoplay = video.autoplay;
        optimizedVideo.muted = video.muted;
        optimizedVideo.loop = video.loop;
        
        return optimizedVideo;
      }
    }
    
    return video;
  }

  // Calculate detection accuracy (simplified)
  private calculateAccuracy(results: any): number {
    if (!results || !Array.isArray(results)) return 0;
    
    // Calculate based on number of detected keypoints and confidence
    const totalKeypoints = results.reduce((sum, result) => {
      return sum + (result.keypoints?.length || 0);
    }, 0);
    
    return Math.min(totalKeypoints / 18, 1.0); // Max 18 keypoints (2 feet × 9)
  }

  // Calculate average confidence
  private calculateAverageConfidence(results: any): number {
    if (!results || !Array.isArray(results)) return 0;
    
    const confidences = results.map(result => result.confidence || 0.5);
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  // Calculate frame rate
  private calculateFrameRate(): number {
    // This would be calculated based on actual frame timing
    return 30; // Placeholder
  }

  // Train custom model
  async trainCustomModel(trainingData: any[]): Promise<any> {
    if (!this.trainingPipeline) {
      throw new Error('Training pipeline not enabled');
    }

    console.log('[NeuralNetworkIntegration] Starting custom model training...');

    try {
      // Load training data
      // Persist trainingData to a temporary JSON blob URL for loader to consume
      const blob = new Blob([JSON.stringify(trainingData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      try {
        await this.trainingPipeline.loadTrainingData([
          { type: 'json', path: url }
        ]);
      } finally {
        URL.revokeObjectURL(url);
      }

      // Set up training callbacks
      this.trainingPipeline.setCallbacks({
        onEpochEnd: (epoch, loss) => {
          console.log(`[Training] Epoch ${epoch + 1}, Loss: ${loss.toFixed(4)}`);
        },
        onTrainingEnd: (result) => {
          console.log('[Training] Training completed:', result);
        }
      });

      // Start training
      const result = await this.trainingPipeline.train({
        epochs: 100,
        batchSize: 32,
        earlyStopping: {
          minLoss: 0.01
        }
      });

      if (result.success) {
        // Export trained model
        const exportedModel = await this.trainingPipeline.exportModel();
        
        console.log('[NeuralNetworkIntegration] Custom model training completed successfully');
        return exportedModel;
      } else {
        throw new Error(`Training failed: ${result.error}`);
      }

    } catch (error) {
      console.error('[NeuralNetworkIntegration] Training failed:', error);
      throw error;
    }
  }

  // Get performance report
  getPerformanceReport(): any {
    if (!this.options.enablePerformanceMonitoring) {
      return { error: 'Performance monitoring not enabled' };
    }

    return this.performanceMonitor.generateReport();
  }

  // Get current status
  getStatus(): IntegrationStatus {
    return {
      isInitialized: this.isInitialized,
      currentEngine: this.detectionManager?.getCurrentEngine() || 'none',
      currentModel: this.detectionManager?.getCurrentModel() || 'none',
      mobileOptimization: this.detectionManager?.getMobileOptimizationStatus() || {},
      performanceMetrics: this.performanceMonitor.getStatus(),
      deploymentStatus: this.getDeploymentStatus()
    };
  }

  private getDeploymentStatus(): DeploymentStatus {
    const report = this.deploymentOptimizer.generateReport();
    
    return {
      cacheHitRate: report.cacheStats.hitRate,
      totalCachedAssets: report.cacheStats.totalAssets,
      compressionEnabled: this.deploymentOptimizer.getConfig().compression.gzip || 
                         this.deploymentOptimizer.getConfig().compression.brotli,
      cdnEnabled: this.deploymentOptimizer.getConfig().cdn.enabled
    };
  }

  // Record user interaction
  recordUserInteraction(interaction: any): void {
    if (this.options.enablePerformanceMonitoring) {
      this.performanceMonitor.recordUserInteraction(interaction);
    }
  }

  // Dispose resources
  dispose(): void {
    if (this.performanceMonitor) {
      this.performanceMonitor.stopMonitoring();
    }
    
    if (this.detectionManager) {
      this.detectionManager.dispose();
    }
    
    this.isInitialized = false;
    console.log('[NeuralNetworkIntegration] Disposed');
  }
}

// Integration status interface
interface IntegrationStatus {
  isInitialized: boolean;
  currentEngine: string;
  currentModel: string;
  mobileOptimization: any;
  performanceMetrics: any;
  deploymentStatus: DeploymentStatus;
}

interface DeploymentStatus {
  cacheHitRate: number;
  totalCachedAssets: number;
  compressionEnabled: boolean;
  cdnEnabled: boolean;
}

// Usage example component
export function NeuralNetworkIntegrationExample() {
  const [integration, setIntegration] = useState<NeuralNetworkIntegration | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Initialize integration
    const initIntegration = async () => {
      const neuralIntegration = new NeuralNetworkIntegration({
        enableMobileOptimization: true,
        enablePerformanceMonitoring: true,
        enableTrainingPipeline: false,
        enableDeploymentOptimization: true,
        preferredEngine: 'enhanced-webarrocks'
      });

      await neuralIntegration.initialize();
      setIntegration(neuralIntegration);
      
      // Update status periodically
      const statusInterval = setInterval(() => {
        setStatus(neuralIntegration.getStatus());
      }, 1000);

      return () => {
        clearInterval(statusInterval);
        neuralIntegration.dispose();
      };
    };

    initIntegration();
  }, []);

  const processFrame = async () => {
    if (!integration || !videoRef.current) return;

    setIsProcessing(true);
    
    try {
      const results = await integration.processVideoFrame(videoRef.current);
      console.log('Detection results:', results);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPerformanceReport = () => {
    if (!integration) return null;
    
    const report = integration.getPerformanceReport();
    console.log('Performance Report:', report);
    return report;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Neural Network Integration Demo</h2>
      
      {/* Status Display */}
      {status && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">System Status</h3>
          <div className="text-sm space-y-1">
            <p>Engine: {status.currentEngine}</p>
            <p>Model: {status.currentModel}</p>
            <p>Mobile Optimized: {status.mobileOptimization.isMobile ? 'Yes' : 'No'}</p>
            <p>Performance: {status.performanceMetrics.avgDetectionTime?.toFixed(2)}ms avg</p>
          </div>
        </div>
      )}

      {/* Video Input */}
      <div className="mb-6">
        <video
          ref={videoRef}
          className="w-full max-w-md mx-auto"
          controls
          muted
          loop
        />
      </div>

      {/* Controls */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={processFrame}
          disabled={isProcessing || !integration}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Process Frame'}
        </button>
        
        <button
          onClick={getPerformanceReport}
          disabled={!integration}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Get Performance Report
        </button>
      </div>

      {/* Performance Metrics */}
      {status?.performanceMetrics && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Performance Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Avg Detection Time</p>
              <p className="font-mono">{status.performanceMetrics.avgDetectionTime?.toFixed(2)}ms</p>
            </div>
            <div>
              <p className="text-gray-600">Total Detections</p>
              <p className="font-mono">{status.performanceMetrics.totalDetections}</p>
            </div>
            <div>
              <p className="text-gray-600">Error Rate</p>
              <p className="font-mono">{(status.performanceMetrics.errorRate * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-600">Session Duration</p>
              <p className="font-mono">{(status.performanceMetrics.sessionDuration / 1000).toFixed(1)}s</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}