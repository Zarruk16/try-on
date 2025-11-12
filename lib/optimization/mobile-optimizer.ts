// Mobile optimization for foot detection
export class MobileOptimizer {
  private isMobile: boolean;
  private optimizationLevel: number;
  private deviceCapabilities: DeviceCapabilities;

  constructor() {
    this.isMobile = this.detectMobile();
    this.deviceCapabilities = this.getDeviceCapabilities();
    this.optimizationLevel = this.determineOptimizationLevel();
  }

  private detectMobile(): boolean {
    const userAgent = navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return mobileRegex.test(userAgent) || window.innerWidth < 768;
  }

  private getDeviceCapabilities(): DeviceCapabilities {
    return {
      memory: (navigator as any).deviceMemory || 4,
      cores: (navigator as any).hardwareConcurrency || 2,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio || 1,
      webgl2: this.checkWebGL2Support()
    };
  }

  private checkWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return gl !== null;
    } catch {
      return false;
    }
  }

  private determineOptimizationLevel(): number {
    if (!this.isMobile) return 0;
    
    const { memory, cores, devicePixelRatio } = this.deviceCapabilities;
    
    // High optimization for low-end devices
    if (memory < 4 || cores < 4 || devicePixelRatio > 2) return 2;
    
    // Medium optimization for mid-range devices
    if (memory < 8 || cores < 8) return 1;
    
    // Low optimization for high-end devices
    return 0;
  }

  optimizeDetectionConfig(config: any): any {
    if (this.optimizationLevel === 0) return config;

    const optimized = { ...config };

    if (this.optimizationLevel >= 1) {
      // Medium optimization
      optimized.scanSettings = {
        ...optimized.scanSettings,
        nScaleLevels: 1,
        scale0Factor: 0.7,
        threshold: Math.min(optimized.threshold + 0.05, 0.9),
        nDetectsPerLoop: 1
      };
      
      optimized.maxHandsDetected = Math.min(optimized.maxHandsDetected, 2);
    }

    if (this.optimizationLevel >= 2) {
      // High optimization for low-end devices
      optimized.maxHandsDetected = 1;
      optimized.scanSettings = {
        ...optimized.scanSettings,
        multiDetectionSearchSlotsRate: 0.3,
        multiDetectionMaxOverlap: 0.2
      };
      
      optimized.landmarksStabilizerSpec = {
        ...optimized.landmarksStabilizerSpec,
        minCutOff: 0.01,
        beta: 5
      };
      
      // Reduce canvas resolution
      optimized.canvasWidth = 320;
      optimized.canvasHeight = 240;
    }

    return optimized;
  }

  optimizeRendering(renderer: any): void {
    if (this.optimizationLevel >= 1) {
      // Reduce pixel ratio for better performance
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }

    if (this.optimizationLevel >= 2) {
      // Disable expensive rendering features
      renderer.shadowMap.enabled = false;
      renderer.antialias = false;
      renderer.setSize(640, 480); // Lower resolution
    }
  }

  optimizeTextureSize(originalSize: number): number {
    if (this.optimizationLevel >= 2) {
      return Math.min(originalSize, 512);
    }
    return originalSize;
  }

  shouldUseWebGL2(): boolean {
    return this.deviceCapabilities.webgl2 && this.optimizationLevel < 2;
  }

  getRecommendedFrameRate(): number {
    switch (this.optimizationLevel) {
      case 2: return 15; // Low-end devices
      case 1: return 24; // Mid-range devices
      default: return 30; // High-end devices
    }
  }

  isMobileDevice(): boolean {
    return this.isMobile;
  }

  getOptimizationLevel(): number {
    return this.optimizationLevel;
  }

  getDeviceCapabilitiesPublic(): DeviceCapabilities {
    return this.deviceCapabilities;
  }
}

interface DeviceCapabilities {
  memory: number;
  cores: number;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  webgl2: boolean;
}