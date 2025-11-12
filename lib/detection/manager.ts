import type { FootDetectorEngine, AccuracyPreset } from './types';
import { MobileOptimizer } from '../optimization/mobile-optimizer';
import { createTfPosenetEngine } from './engines/tf-posenet';

export interface CreateManagerOptions {
  preset: AccuracyPreset;
  preferWebARRocks?: boolean;
  engineType?: 'tf' | 'auto';
  enableMobileOptimization?: boolean;
  enableModelSwitching?: boolean;
}

export interface FootDetectionManager {
  initialize(): Promise<void>;
  estimate(video: HTMLVideoElement, options?: any): Promise<any>;
  switchEngine(): Promise<void>;
  getCurrentEngine(): string;
  getCurrentModel(): string;
  getPerformanceMetrics(): any;
  getMobileOptimizationStatus(): any;
  dispose(): Promise<void> | void;
  readonly engine: FootDetectorEngine | null;
}

export async function createFootDetectionManager(opts: CreateManagerOptions): Promise<FootDetectionManager> {
  const { preset, preferWebARRocks = false, engineType = 'tf', enableMobileOptimization = true, enableModelSwitching = true } = opts;
  
  let engine: FootDetectorEngine | null = null;
  // Flags are deprecated; use getCurrentEngine() for identification
  let mobileOptimizer: MobileOptimizer | null = null;
  let currentModelType: 'foot' | 'barefoot' = 'foot';
  let performanceMetrics = {
    detectionTime: [] as number[],
    accuracy: [] as number[],
    frameRate: [] as number[]
  };

  // Initialize mobile optimizer if enabled
  if (enableMobileOptimization) {
    mobileOptimizer = new MobileOptimizer();
  }

  // Determine model type based on detection results
  const determineOptimalModel = (results: any[]): 'foot' | 'barefoot' => {
    if (!enableModelSwitching) return currentModelType;
    const avgConfidence = results.reduce((sum, result) => sum + (result.confidence || 0), 0) / results.length;
    if (currentModelType === 'foot' && avgConfidence < 0.5) return 'barefoot';
    if (currentModelType === 'barefoot' && avgConfidence > 0.8) return 'foot';
    return currentModelType;
  };

  // Get threshold based on accuracy preset
  const getThresholdForAccuracy = (accuracy: AccuracyPreset): number => {
    switch (accuracy) {
      case 'heavy': return 0.9;
      case 'full': return 0.85;
      case 'lite': return 0.65;
      default: return 0.75;
    }
  };

  // Select the appropriate engine based on options and device capabilities
  const selectEngine = async (): Promise<FootDetectorEngine> => {
    return createTfPosenetEngine();
  };

  let currentEngine: FootDetectorEngine | null = null;
  let isInitialized = false;

  const manager: FootDetectionManager = {
    async initialize(): Promise<void> {
      if (isInitialized) return;
      currentEngine = await selectEngine();
      if (currentEngine.initialize) {
        await currentEngine.initialize();
      }
      isInitialized = true;
    },

    async estimate(video: HTMLVideoElement, options: any = {}): Promise<any> {
      if (!isInitialized || !currentEngine) {
        throw new Error('Detection manager not initialized');
      }
      const startTime = performance.now();
      try {
        const results = await currentEngine.estimate(video, options);
        const detectionTime = performance.now() - startTime;
        performanceMetrics.detectionTime.push(detectionTime);
        if (enableModelSwitching && results) {
          const newModelType = determineOptimalModel(Array.isArray(results) ? results : [results]);
          if (newModelType !== currentModelType) {
            console.log(`Switching from ${currentModelType} to ${newModelType} model`);
            currentModelType = newModelType;
            await this.switchEngine();
          }
        }
        return results;
      } catch (error) {
        console.error('Detection error:', error);
        throw error;
      }
    },

    async switchEngine(): Promise<void> {
      if (currentEngine) {
        currentEngine.dispose();
        currentEngine = null;
      }
      currentEngine = await selectEngine();
      if (currentEngine.initialize) {
        await currentEngine.initialize();
      }
    },

    getCurrentEngine(): string {
      return currentEngine?.name || 'none';
    },

    getCurrentModel(): string {
      return currentModelType;
    },

    getPerformanceMetrics() {
      return { ...performanceMetrics };
    },

    getMobileOptimizationStatus() {
      return {
        enabled: enableMobileOptimization,
        isMobile: mobileOptimizer?.isMobileDevice() || false,
        optimizationLevel: mobileOptimizer?.getOptimizationLevel() || 0,
        deviceCapabilities: mobileOptimizer?.getDeviceCapabilitiesPublic()
      };
    },

    async dispose(): Promise<void> {
      try { await Promise.resolve(currentEngine?.dispose()); } catch {}
      currentEngine = null;
      isInitialized = false;
    },

    get engine() {
      return currentEngine;
    }
  };

  return manager;
}
