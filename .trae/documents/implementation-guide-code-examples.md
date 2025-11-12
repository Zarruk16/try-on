# Implementation Guide: Code Examples and Step-by-Step Integration

## 1. Quick Start: Neural Network Integration

### Step 1: Copy Neural Network Models
First, copy the pretrained models from the demo project:

```bash
# Create the models directory
mkdir -p public/models/neuralNets
mkdir -p public/models/web-ar-rocks

# Copy the best performing models
cp d:\programs\js\chrono-stride-ar\.vendor\ar-demo\angular-ar\src\neuralNets\NN_FOOT_23.json public/models/neuralNets/
cp d:\programs\js\chrono-stride-ar\.vendor\ar-demo\angular-ar\src\neuralNets\NN_BAREFOOT_3.json public/models/neuralNets/

# Copy the WebAR Rocks library
cp d:\programs\js\chrono-stride-ar\.vendor\ar-demo\angular-ar\src\assets\web-ar-rocks-custom\dist\WebARRocksHand.js public/models/web-ar-rocks/
```

### Step 2: Enhanced WebAR Rocks Engine
Replace your current `webarrocks.ts` with this enhanced version:

```typescript
// src/lib/foot-detection/engines/webarrocks-enhanced.ts
import { FootDetectorEngine, PoseResult, Keypoint, EstimateOptions } from '../types';

interface WebARRocksEnhancedOptions {
  modelType?: 'foot' | 'barefoot';
  threshold?: number;
  maxHandsDetected?: number;
  enableMobileOptimization?: boolean;
}

export function createEnhancedWebARRocksEngine(options: WebARRocksEnhancedOptions = {}): FootDetectorEngine {
  const {
    modelType = 'foot',
    threshold = 0.75,
    maxHandsDetected = 2,
    enableMobileOptimization = true
  } = options;

  let isInitialized = false;
  let webARRocks: any = null;
  let currentModel: string = '';

  // Select the appropriate model based on type
  const selectModel = (): string => {
    switch (modelType) {
      case 'barefoot':
        return '/models/neuralNets/NN_BAREFOOT_3.json';
      case 'foot':
      default:
        return '/models/neuralNets/NN_FOOT_23.json';
    }
  };

  return {
    name: `WebAR Rocks ${modelType} Detection`,
    type: 'webarrocks',
    
    async initialize(): Promise<void> {
      if (isInitialized) return;

      return new Promise<void>((resolve, reject) => {
        // Load WebAR Rocks script
        const script = document.createElement('script');
        script.src = '/models/web-ar-rocks/WebARRocksHand.js';
        script.onload = () => {
          webARRocks = (window as any).WEBARROCKSHAND;
          isInitialized = true;
          console.log('WebAR Rocks Enhanced loaded successfully');
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load WebAR Rocks Enhanced'));
        };
        document.head.appendChild(script);
      });
    },

    async estimate(video: HTMLVideoElement, options: EstimateOptions = {}): Promise<PoseResult> {
      if (!isInitialized || !webARRocks) {
        throw new Error('WebAR Rocks not initialized');
      }

      const modelPath = selectModel();
      
      // Configure with specialized foot detection settings
      const config = {
        NNsPaths: [modelPath],
        maxHandsDetected,
        threshold,
        scanSettings: {
          // Multi-detection settings for better foot tracking
          multiDetectionSearchSlotsRate: 0.5,
          multiDetectionMaxOverlap: 0.3,
          multiDetectionOverlapScaleXY: [0.5, 1],
          multiDetectionEqualizeSearchSlotScale: true,
          multiDetectionForceSearchOnOtherSide: true,
          multiDetectionForceChirality: 1,
          disableIsRightHandNNEval: true,
          
          // Translation and scaling factors optimized for feet
          overlapFactors: [1.0, 1.0, 1.0],
          translationScalingFactors: [0.3, 0.3, 1],
          nScaleLevels: 2,
          scale0Factor: 0.5
        },
        stabilizationSettings: {
          NNSwitchMask: {
            isRightHand: false,
            isFlipped: false
          }
        },
        landmarksStabilizerSpec: {
          minCutOff: 0.001,
          beta: 3
        },
        
        // Mobile optimization
        ...(enableMobileOptimization && {
          isCleanGLStateAtEachIteration: true,
          animateProcessOrder: ['update_video', 'detect', 'render']
        })
      };

      try {
        // Initialize WebAR Rocks with the configuration
        await this.initializeWebARRocks(video, config);
        
        // Get detection results
        const detection = await this.getDetectionResults();
        
        // Convert to standard PoseResult format
        return this.convertToPoseResult(detection);
      } catch (error) {
        console.error('WebAR Rocks detection error:', error);
        throw error;
      }
    },

    private async initializeWebARRocks(video: HTMLVideoElement, config: any): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        const initCallback = (error: any) => {
          if (error) {
            reject(new Error(`WebAR Rocks initialization failed: ${error}`));
          } else {
            resolve();
          }
        };

        // Initialize with video element and configuration
        webARRocks.init({
          video: video,
          callback: initCallback,
          ...config
        });
      });
    },

    private async getDetectionResults(): Promise<any> {
      return new Promise<any>((resolve) => {
        const detectCallback = (detectedHands: any) => {
          resolve(detectedHands);
        };

        webARRocks.detect(detectCallback);
      });
    },

    private convertToPoseResult(detection: any): PoseResult {
      if (!detection || detection.length === 0) {
        return [];
      }

      // Convert WebAR Rocks format to standard PoseResult
      const keypoints: Keypoint[] = [];
      
      // Extract foot keypoints (ankle, heel, toes)
      const footLandmarks = [
        'ankleBack', 'ankleOut', 'ankleIn', 'ankleFront',
        'heelBackOut', 'heelBackIn',
        'pinkyToeBaseTop', 'middleToeBaseTop', 'bigToeBaseTop'
      ];

      detection.forEach((hand: any, handIndex: number) => {
        if (hand.landmarks && hand.landmarks.length > 0) {
          hand.landmarks.forEach((landmark: any, index: number) => {
            if (index < footLandmarks.length) {
              keypoints.push({
                name: `${footLandmarks[index]}_${handIndex}`,
                x: landmark.x,
                y: landmark.y,
                score: hand.confidence || 0.9
              });
            }
          });
        }
      });

      return keypoints;
    },

    dispose(): void {
      if (webARRocks) {
        webARRocks.destroy();
        webARRocks = null;
        isInitialized = false;
      }
    }
  };
}
```

### Step 3: Update Detection Manager
Enhance your detection manager to use the new engine:

```typescript
// src/lib/foot-detection/manager-enhanced.ts
import { createEnhancedWebARRocksEngine } from './engines/webarrocks-enhanced';
import { createMediaPipeEngine } from './engines/mediapipe';
import { FootDetectionManager, DetectionManagerOptions } from './types';

export async function createEnhancedDetectionManager(
  options: DetectionManagerOptions = {}
): Promise<FootDetectionManager> {
  const {
    preferredEngine = 'webarrocks',
    useSpecializedModels = true,
    modelType = 'foot',
    enableFallback = true
  } = options;

  try {
    if (preferredEngine === 'webarrocks' && useSpecializedModels) {
      // Try specialized WebAR Rocks engine first
      const engine = createEnhancedWebARRocksEngine({
        modelType,
        threshold: 0.75,
        maxHandsDetected: 2,
        enableMobileOptimization: true
      });

      await engine.initialize();

      return {
        engine,
        engineType: 'webarrocks',
        isFallback: false,
        modelType
      };
    }
  } catch (error) {
    console.warn('Enhanced WebAR Rocks failed, falling back to standard engine:', error);
    
    if (enableFallback) {
      // Fallback to MediaPipe
      const engine = await createMediaPipeEngine();
      return {
        engine,
        engineType: 'mediapipe',
        isFallback: true,
        modelType: 'generic'
      };
    }
    
    throw error;
  }

  // Default to MediaPipe if WebAR Rocks not preferred
  const engine = await createMediaPipeEngine();
  return {
    engine,
    engineType: 'mediapipe',
    isFallback: false,
    modelType: 'generic'
  };
}
```

### Step 4: Update Your AR Components
Update your AR components to use the enhanced detection:

```typescript
// src/components/ar-foot-detection-enhanced.tsx
import { createEnhancedDetectionManager } from '@/lib/foot-detection/manager-enhanced';

export default function EnhancedFootDetection() {
  const [detectionManager, setDetectionManager] = useState<FootDetectionManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modelType, setModelType] = useState<'foot' | 'barefoot'>('foot');

  useEffect(() => {
    async function initializeDetection() {
      try {
        setIsLoading(true);
        
        const manager = await createEnhancedDetectionManager({
          preferredEngine: 'webarrocks',
          useSpecializedModels: true,
          modelType,
          enableFallback: true
        });
        
        setDetectionManager(manager);
        console.log(`Initialized ${manager.engineType} with ${manager.modelType} model`);
      } catch (error) {
        console.error('Failed to initialize detection:', error);
      } finally {
        setIsLoading(false);
      }
    }

    initializeDetection();
  }, [modelType]);

  const handleModelSwitch = (newType: 'foot' | 'barefoot') => {
    setModelType(newType);
  };

  if (isLoading) {
    return <div>Loading enhanced foot detection...</div>;
  }

  return (
    <div>
      <div className="model-selector">
        <button 
          onClick={() => handleModelSwitch('foot')}
          className={modelType === 'foot' ? 'active' : ''}
        >
          Shoes On
        </button>
        <button 
          onClick={() => handleModelSwitch('barefoot')}
          className={modelType === 'barefoot' ? 'active' : ''}
        >
          Barefoot
        </button>
      </div>
      
      {detectionManager && (
        <FootTracker
          detectionManager={detectionManager}
          onDetection={(result) => {
            console.log('Enhanced detection result:', result);
          }}
        />
      )}
    </div>
  );
}
```

## 2. Mobile Optimization Implementation

### Step 1: Create Mobile Optimizer
```typescript
// src/lib/optimization/mobile-optimizer.ts
export class MobileOptimizer {
  private isMobile: boolean;
  private optimizationLevel: number;

  constructor() {
    this.isMobile = this.detectMobile();
    this.optimizationLevel = this.determineOptimizationLevel();
  }

  private detectMobile(): boolean {
    const userAgent = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent) || window.innerWidth < 768;
  }

  private determineOptimizationLevel(): number {
    if (!this.isMobile) return 0;
    
    // Check device capabilities
    const memory = (navigator as any).deviceMemory || 4;
    const cores = (navigator as any).hardwareConcurrency || 2;
    
    if (memory < 4 || cores < 4) return 2; // High optimization
    if (memory < 8 || cores < 8) return 1; // Medium optimization
    return 0; // Low optimization
  }

  optimizeDetectionConfig(config: any): any {
    if (this.optimizationLevel === 0) return config;

    const optimized = { ...config };

    if (this.optimizationLevel >= 1) {
      // Medium optimization
      optimized.scanSettings.nScaleLevels = 1;
      optimized.scanSettings.scale0Factor = 0.7;
      optimized.threshold = Math.min(optimized.threshold + 0.05, 0.9);
    }

    if (this.optimizationLevel >= 2) {
      // High optimization
      optimized.maxHandsDetected = 1;
      optimized.scanSettings.multiDetectionSearchSlotsRate = 0.3;
      optimized.landmarksStabilizerSpec.minCutOff = 0.01;
      optimized.landmarksStabilizerSpec.beta = 5;
    }

    return optimized;
  }

  optimizeRendering(renderer: any): void {
    if (this.optimizationLevel >= 1) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }

    if (this.optimizationLevel >= 2) {
      renderer.shadowMap.enabled = false;
      renderer.antialias = false;
    }
  }
}
```

### Step 2: Update WebAR Rocks Engine with Mobile Optimization
```typescript
// Add to the enhanced WebAR Rocks engine
export function createEnhancedWebARRocksEngine(options: WebARRocksEnhancedOptions = {}): FootDetectorEngine {
  const mobileOptimizer = new MobileOptimizer();
  
  return {
    // ... existing code ...
    
    async estimate(video: HTMLVideoElement, options: EstimateOptions = {}): Promise<PoseResult> {
      let config = {
        // ... base config ...
      };
      
      // Apply mobile optimization
      config = mobileOptimizer.optimizeDetectionConfig(config);
      
      // ... rest of the estimation logic ...
    }
  };
}
```

## 3. Custom Training Pipeline Setup

### Step 1: Create Training Configuration
```typescript
// src/lib/training/config.ts
export const TRAINING_CONFIGS = {
  foot: {
    modelType: 'foot' as const,
    epochs: 100,
    learningRate: 0.001,
    batchSize: 32,
    validationSplit: 0.2,
    inputSize: [224, 224, 3],
    keypointCount: 9,
    architecture: {
      layers: [
        { type: 'conv2d', filters: 32, kernelSize: 3, activation: 'relu' },
        { type: 'maxPooling2d', poolSize: [2, 2] },
        { type: 'conv2d', filters: 64, kernelSize: 3, activation: 'relu' },
        { type: 'maxPooling2d', poolSize: [2, 2] },
        { type: 'conv2d', filters: 128, kernelSize: 3, activation: 'relu' },
        { type: 'flatten' },
        { type: 'dense', units: 256, activation: 'relu' },
        { type: 'dropout', rate: 0.5 },
        { type: 'dense', units: 27, activation: 'sigmoid' } // 9 keypoints * 3
      ]
    }
  },
  
  barefoot: {
    modelType: 'barefoot' as const,
    epochs: 80,
    learningRate: 0.0005,
    batchSize: 24,
    validationSplit: 0.15,
    inputSize: [224, 224, 3],
    keypointCount: 9,
    architecture: {
      layers: [
        { type: 'conv2d', filters: 24, kernelSize: 3, activation: 'relu' },
        { type: 'maxPooling2d', poolSize: [2, 2] },
        { type: 'conv2d', filters: 48, kernelSize: 3, activation: 'relu' },
        { type: 'maxPooling2d', poolSize: [2, 2] },
        { type: 'conv2d', filters: 96, kernelSize: 3, activation: 'relu' },
        { type: 'flatten' },
        { type: 'dense', units: 192, activation: 'relu' },
        { type: 'dropout', rate: 0.4 },
        { type: 'dense', units: 27, activation: 'sigmoid' }
      ]
    }
  }
};
```

### Step 2: Create Training API Route
```typescript
// src/app/api/models/train/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TRAINING_CONFIGS } from '@/lib/training/config';

export async function POST(request: NextRequest) {
  try {
    const { modelType, datasetId, customConfig } = await request.json();
    
    const config = TRAINING_CONFIGS[modelType];
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid model type' },
        { status: 400 }
      );
    }

    // Start training job
    const jobId = await startTrainingJob({
      ...config,
      ...customConfig,
      datasetId
    });

    return NextResponse.json({
      jobId,
      status: 'queued',
      progress: 0,
      config: { ...config, ...customConfig }
    });
  } catch (error) {
    console.error('Training API error:', error);
    return NextResponse.json(
      { error: 'Failed to start training' },
      { status: 500 }
    );
  }
}

async function startTrainingJob(config: any): Promise<string> {
  // Implement training job logic
  const jobId = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Queue training job (implement with your preferred job queue)
  console.log(`Starting training job ${jobId} with config:`, config);
  
  return jobId;
}
```

## 4. Testing and Validation

### Step 1: Create Test Component
```typescript
// src/components/test-neural-networks.tsx
export function TestNeuralNetworks() {
  const [results, setResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runComparisonTest = async () => {
    setIsTesting(true);
    const testResults = [];

    // Test MediaPipe
    const mediaPipeManager = await createEnhancedDetectionManager({
      preferredEngine: 'mediapipe',
      useSpecializedModels: false
    });
    
    // Test WebAR Rocks with foot model
    const webARRocksFootManager = await createEnhancedDetectionManager({
      preferredEngine: 'webarrocks',
      useSpecializedModels: true,
      modelType: 'foot'
    });

    // Test WebAR Rocks with barefoot model
    const webARRocksBarefootManager = await createEnhancedDetectionManager({
      preferredEngine: 'webarrocks',
      useSpecializedModels: true,
      modelType: 'barefoot'
    });

    // Run tests and collect results
    // ... implement testing logic ...

    setResults(testResults);
    setIsTesting(false);
  };

  return (
    <div className="test-container">
      <button onClick={runComparisonTest} disabled={isTesting}>
        {isTesting ? 'Testing...' : 'Run Neural Network Comparison'}
      </button>
      
      <div className="results">
        {results.map((result, index) => (
          <div key={index} className="result-item">
            <h3>{result.engine} - {result.modelType}</h3>
            <p>Accuracy: {result.accuracy}</p>
            <p>Processing Time: {result.processingTime}ms</p>
            <p>Confidence: {result.averageConfidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: Performance Monitoring Hook
```typescript
// src/hooks/use-detection-performance.ts
export function useDetectionPerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    inferenceTime: 0,
    frameRate: 0,
    memoryUsage: 0,
    accuracy: 0
  });

  const startMonitoring = (engine: FootDetectorEngine) => {
    const startTime = performance.now();
    let frameCount = 0;
    let totalConfidence = 0;
    let detectionCount = 0;

    const monitor = setInterval(() => {
      const currentTime = performance.now();
      const inferenceTime = currentTime - startTime;
      
      // Calculate frame rate
      frameCount++;
      const frameRate = frameCount / (inferenceTime / 1000);

      // Get memory usage (if available)
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;

      setMetrics({
        inferenceTime,
        frameRate,
        memoryUsage,
        accuracy: totalConfidence / Math.max(detectionCount, 1)
      });
    }, 1000);

    return () => clearInterval(monitor);
  };

  return { metrics, startMonitoring };
}
```

## 5. Deployment Checklist

### Pre-deployment
- [ ] Copy all neural network models to `public/models/neuralNets/`
- [ ] Copy WebAR Rocks library to `public/models/web-ar-rocks/`
- [ ] Test enhanced detection on mobile devices
- [ ] Verify model loading times
- [ ] Check memory usage on low-end devices
- [ ] Validate fallback mechanisms

### Production Deployment
- [ ] Enable CDN for model files
- [ ] Implement model caching strategies
- [ ] Add performance monitoring
- [ ] Set up error tracking
- [ ] Configure analytics for model usage

### Post-deployment
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Track model accuracy in production
- [ ] Optimize based on real usage data

This implementation guide provides everything you need to integrate the pretrained neural networks, set up custom training, and optimize for mobile devices. The enhanced WebAR Rocks integration will significantly improve your foot detection accuracy compared to the basic MediaPipe implementation.