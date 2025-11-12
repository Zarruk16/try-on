import type { FootDetectorEngine, PoseResult, Keypoint, EstimateOptions } from '../types';
import { MobileOptimizer } from '../../optimization/mobile-optimizer';

// Minimal API shape for the specific WebAR.rocks build used here
interface WebARRocksEnhancedAPI {
  init(spec: {
    video: HTMLVideoElement;
    canvasId: string;
    callback: (error?: string | false) => void;
    // The SDK tolerates unknown fields; we pass detection config in spread
    [k: string]: any;
  }): void;
  detect(callback: (detected: any) => void): void;
  destroy(): void | Promise<void>;
}

interface WebARRocksEnhancedOptions {
  modelType?: 'foot' | 'barefoot';
  threshold?: number;
  maxHandsDetected?: number;
  enableMobileOptimization?: boolean;
  scanSettings?: Record<string, any>;
  stabilizationSettings?: Record<string, any>;
}

// Enhanced WebAR Rocks engine with specialized foot detection
export function createEnhancedWebARRocksEngine(options: WebARRocksEnhancedOptions = {}): FootDetectorEngine {
  const {
    modelType = 'foot',
    threshold = 0.75,
    maxHandsDetected = 2,
    enableMobileOptimization = true,
    scanSettings = {},
    stabilizationSettings = {}
  } = options;

  let isInitialized = false;
  let webARRocks: any = null;
  let currentModel: string = '';
  let canvas: HTMLCanvasElement | null = null;
  const mobileOptimizer: MobileOptimizer | null = options.enableMobileOptimization ? new MobileOptimizer() : null;

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

  // Create offscreen canvas for WebAR Rocks
  const createCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    canvas.id = 'webarrocks-enhanced-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = '-10000px';
    canvas.style.top = '0';
    document.body.appendChild(canvas);
    return canvas;
  };

  // Helper: initialize WebAR.rocks with provided config
  const initializeWebARRocks = async (video: HTMLVideoElement, config: any): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (!canvas) {
        canvas = createCanvas();
      }

      const initCallback = (error?: string | false) => {
        if (error) {
          reject(new Error(`WebAR Rocks initialization failed: ${error}`));
        } else {
          resolve();
        }
      };

      // Initialize with video element and configuration
      webARRocks!.init({
        video: video,
        canvasId: canvas.id,
        callback: initCallback,
        ...config
      });
    });
  };

  // Helper: run one detection pass and resolve results
  const getDetectionResults = async (): Promise<any> => {
    return new Promise<any>((resolve) => {
      const detectCallback = (detectedHands: any) => {
        resolve(detectedHands);
      };

      webARRocks!.detect(detectCallback);
    });
  };

  // Helper: convert SDK detection to PoseResult
  const convertToPoseResult = (detection: any): PoseResult[] | null => {
    if (!detection || detection.length === 0) {
      return null;
    }

    const results: PoseResult[] = [];
    const footLandmarks = [
      'ankleBack', 'ankleOut', 'ankleIn', 'ankleFront',
      'heelBackOut', 'heelBackIn',
      'pinkyToeBaseTop', 'middleToeBaseTop', 'bigToeBaseTop'
    ];

    detection.forEach((hand: any, handIndex: number) => {
      if (hand.landmarks && hand.landmarks.length > 0) {
        const keypoints: Keypoint[] = [];

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

        results.push({ keypoints });
      }
    });

    return results.length > 0 ? results : null;
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
          webARRocks = (window as any).WEBARROCKSHAND || null;
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

    async estimate(source: HTMLVideoElement | HTMLCanvasElement, options: EstimateOptions = {}): Promise<PoseResult[] | null> {
      if (!isInitialized || !webARRocks) {
        throw new Error('WebAR Rocks not initialized');
      }
      const video = source as HTMLVideoElement;
      if (!video || video.tagName !== 'VIDEO') {
        return null;
      }
      const modelPath = selectModel();
      
          // Configure with specialized foot detection settings
      let config = {
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
          scale0Factor: 0.5,
          
          // Mobile optimization settings
          ...(enableMobileOptimization && {
            nDetectsPerLoop: 1,
            thresholdSignal: 0.2
          }),
          
          ...scanSettings
        },
        stabilizationSettings: {
          NNSwitchMask: {
            isRightHand: false,
            isFlipped: false
          },
          translationSmoothing: 0.85,
          rotationSmoothing: 0.85,
          ...stabilizationSettings
        },
        landmarksStabilizerSpec: {
          minCutOff: 0.001,
          beta: 3
        },
        
        // Mobile optimization
        ...(enableMobileOptimization && mobileOptimizer && {
          isCleanGLStateAtEachIteration: true,
          animateProcessOrder: ['update_video', 'detect', 'render']
        })
      };

      // Apply mobile optimization if enabled
      if (enableMobileOptimization && mobileOptimizer) {
        config = mobileOptimizer.optimizeDetectionConfig(config);
      }

      try {
        // Initialize WebAR Rocks with the configuration
        await initializeWebARRocks(video, config);
        
        // Get detection results
        const detection = await getDetectionResults();
        
        // Convert to standard PoseResult format
        return convertToPoseResult(detection);
      } catch (error) {
        console.error('WebAR Rocks detection error:', error);
        throw error;
      }
    },

    dispose(): void {
      if (webARRocks) {
        try { webARRocks.destroy(); } catch {}
        webARRocks = null;
        isInitialized = false;
      }
      
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
        canvas = null;
      }
    }
  };
}
