# Neural Network Integration Guide

This guide demonstrates how to use the comprehensive neural network integration system for foot detection in the Chrono Stride AR application.

## Quick Start

### Basic Integration

```typescript
import { NeuralNetworkIntegration } from '../lib/integration/neural-network-integration';

// Initialize the integration with default settings
const integration = new NeuralNetworkIntegration({
  enableMobileOptimization: true,
  enablePerformanceMonitoring: true,
  enableDeploymentOptimization: true,
  preferredEngine: 'enhanced-webarrocks'
});

// Initialize the system
await integration.initialize();

// Process a video frame
const results = await integration.processVideoFrame(videoElement);
console.log('Foot detection results:', results);
```

### Advanced Configuration

```typescript
const integration = new NeuralNetworkIntegration({
  enableMobileOptimization: true,
  enablePerformanceMonitoring: true,
  enableTrainingPipeline: true, // Enable custom model training
  enableDeploymentOptimization: true,
  preferredEngine: 'enhanced-webarrocks' // Options: 'enhanced-webarrocks', 'mediapipe-tasks', 'auto'
});
```

## Core Components

### 1. Enhanced WebAR Rocks Engine

The enhanced WebAR Rocks engine provides specialized foot detection with mobile optimization:

```typescript
import { createFootDetectionManager } from '../lib/detection/manager';

const manager = createFootDetectionManager({
  accuracy: 'balanced',
  engineType: 'enhanced-webarrocks',
  enableMobileOptimization: true,
  enableModelSwitching: true,
  modelType: 'foot', // Options: 'foot', 'barefoot'
  threshold: 0.7
});

await manager.initialize();
```

### 2. Mobile Optimization

Automatic device capability detection and optimization:

```typescript
import { MobileOptimizer } from '../lib/optimization/mobile-optimizer';

const optimizer = new MobileOptimizer();
const level = optimizer.getOptimizationLevel();

// Apply optimizations based on device capability
if (level >= 2) {
  // High optimization for low-end devices
  console.log('Applying high mobile optimization');
}
```

### 3. Performance Monitoring

Real-time performance tracking and analytics:

```typescript
import { PerformanceMonitor } from '../lib/monitoring/performance-monitor';

const monitor = new PerformanceMonitor();

monitor.setCallbacks({
  onDetection: (data) => {
    console.log(`Detection time: ${data.detectionTime}ms`);
  },
  onModelSwitch: (data) => {
    console.log(`Switched from ${data.fromModel} to ${data.toModel}`);
  }
});

monitor.startMonitoring();
```

### 4. Training Pipeline

Custom model training infrastructure:

```typescript
import { TrainingPipeline } from '../lib/training/training-pipeline';

const pipeline = new TrainingPipeline({
  architecture: 'convnet',
  inputSize: 224,
  outputSize: 9, // 9 keypoints for foot detection
  learningRate: 0.001,
  hiddenLayers: [128, 64, 32]
});

// Load training data
await pipeline.loadTrainingData([
  { type: 'json', data: trainingData },
  { type: 'webcam', duration: 30000 } // 30 seconds of webcam data
]);

// Train the model
const result = await pipeline.train({
  epochs: 100,
  batchSize: 32,
  earlyStopping: { minLoss: 0.01 }
});
```

### 5. Deployment Optimization

Asset optimization, CDN integration, and caching:

```typescript
import { DeploymentOptimizer } from '../lib/deployment/deployment-optimizer';

const optimizer = new DeploymentOptimizer({
  cdn: {
    enabled: true,
    baseUrl: 'https://cdn.example.com',
    fallbackUrl: 'https://backup.example.com'
  },
  compression: {
    gzip: true,
    brotli: true
  },
  caching: {
    strategy: 'stale-while-revalidate',
    maxAge: 86400,
    staleWhileRevalidate: 604800
  }
});

// Preload critical assets
await optimizer.preloadCriticalAssets([
  '/models/neuralNets/NN_FOOT_23.json',
  '/models/web-ar-rocks/WebARRocksHand.js'
]);
```

## Usage Examples

### Basic Foot Detection

```typescript
import { NeuralNetworkIntegration } from '../lib/integration/neural-network-integration';

class FootDetectionApp {
  private integration: NeuralNetworkIntegration;
  private videoElement: HTMLVideoElement;

  constructor() {
    this.integration = new NeuralNetworkIntegration({
      enableMobileOptimization: true,
      enablePerformanceMonitoring: true,
      preferredEngine: 'enhanced-webarrocks'
    });
  }

  async initialize() {
    await this.integration.initialize();
    
    // Set up video element
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    
    // Start camera
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    this.videoElement.srcObject = stream;
  }

  async detectFoot() {
    try {
      const results = await this.integration.processVideoFrame(this.videoElement);
      
      if (results && results.length > 0) {
        // Process detected foot keypoints
        this.renderFootKeypoints(results);
      }
    } catch (error) {
      console.error('Detection failed:', error);
    }
  }

  renderFootKeypoints(results: any[]) {
    results.forEach(result => {
      if (result.keypoints) {
        result.keypoints.forEach((keypoint: any) => {
          // Draw keypoint on canvas
          this.drawKeypoint(keypoint.x, keypoint.y, keypoint.confidence);
        });
      }
    });
  }

  drawKeypoint(x: number, y: number, confidence: number) {
    const canvas = document.getElementById('detection-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    
    if (ctx && confidence > 0.5) {
      ctx.fillStyle = `rgba(0, 255, 0, ${confidence})`;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
```

### Model Comparison and Validation

```typescript
import { ModelComparisonTester } from '../src/components/ModelComparisonTester';

function ModelComparisonDemo() {
  const [results, setResults] = useState(null);

  const runComparison = async () => {
    const tester = new ModelComparisonTester();
    
    // Test different models
    const models = [
      'enhanced-webarrocks',
      'mediapipe-tasks',
      'webarrocks'
    ];
    
    const comparisonResults = await tester.compareModels(models, {
      testDuration: 30000, // 30 seconds
      videoSource: 'webcam'
    });
    
    setResults(comparisonResults);
  };

  return (
    <div>
      <button onClick={runComparison}>Run Model Comparison</button>
      {results && (
        <div>
          <h3>Comparison Results</h3>
          {results.models.map((model: any) => (
            <div key={model.name}>
              <h4>{model.name}</h4>
              <p>Avg Detection Time: {model.avgDetectionTime}ms</p>
              <p>Accuracy: {(model.accuracy * 100).toFixed(1)}%</p>
              <p>Frame Rate: {model.avgFrameRate} FPS</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Custom Model Training

```typescript
async function trainCustomModel() {
  const integration = new NeuralNetworkIntegration({
    enableTrainingPipeline: true
  });

  await integration.initialize();

  // Prepare training data
  const trainingData = [
    {
      image: 'data:image/jpeg;base64,...',
      keypoints: [
        { x: 100, y: 200, confidence: 0.9 },
        { x: 150, y: 250, confidence: 0.8 },
        // ... more keypoints
      ]
    }
    // ... more training samples
  ];

  // Train the model
  const trainedModel = await integration.trainCustomModel(trainingData);
  
  console.log('Custom model trained successfully:', trainedModel);
  
  // Use the trained model
  const results = await integration.processVideoFrame(videoElement);
}
```

### Performance Monitoring and Analytics

```typescript
function setupPerformanceMonitoring(integration: NeuralNetworkIntegration) {
  // Get real-time performance metrics
  setInterval(() => {
    const status = integration.getStatus();
    console.log('Current performance:', status.performanceMetrics);
  }, 1000);

  // Get detailed performance report
  const report = integration.getPerformanceReport();
  
  console.log('Performance Summary:');
  console.log(`Average Detection Time: ${report.avgDetectionTime}ms`);
  console.log(`Total Detections: ${report.totalDetections}`);
  console.log(`Error Rate: ${(report.errorRate * 100).toFixed(2)}%`);
  console.log(`Model Switches: ${report.modelSwitches}`);
  
  // Get recommendations
  if (report.recommendations.length > 0) {
    console.log('Performance Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`- ${rec.type}: ${rec.description}`);
    });
  }
}
```

## Configuration Reference

### NeuralNetworkIntegration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableMobileOptimization` | boolean | true | Enable mobile device optimization |
| `enablePerformanceMonitoring` | boolean | true | Enable performance tracking |
| `enableTrainingPipeline` | boolean | false | Enable custom model training |
| `enableDeploymentOptimization` | boolean | true | Enable deployment optimization |
| `preferredEngine` | string | 'enhanced-webarrocks' | Preferred detection engine |

### Detection Manager Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accuracy` | string | 'balanced' | Accuracy preset: 'high', 'balanced', 'fast' |
| `engineType` | string | 'auto' | Detection engine: 'enhanced-webarrocks', 'mediapipe-tasks', 'webarrocks', 'auto' |
| `enableMobileOptimization` | boolean | true | Enable mobile optimization |
| `enableModelSwitching` | boolean | true | Enable automatic model switching |
| `modelType` | string | 'foot' | Model type: 'foot', 'barefoot' |
| `threshold` | number | 0.7 | Detection confidence threshold |

### Mobile Optimizer Levels

| Level | Device Type | Optimizations |
|-------|-------------|---------------|
| 0 | High-end | Full resolution, all features enabled |
| 1 | Mid-range | Reduced resolution, optimized settings |
| 2 | Low-end | Minimal resolution, basic features only |

## Best Practices

### 1. Initialize Once
```typescript
// Initialize the integration once and reuse it
const integration = new NeuralNetworkIntegration(options);
await integration.initialize();

// Use the same instance for all operations
const results = await integration.processVideoFrame(video);
```

### 2. Handle Mobile Devices
```typescript
// Always enable mobile optimization for better performance
const integration = new NeuralNetworkIntegration({
  enableMobileOptimization: true
});

// Check device capability
const status = integration.getStatus();
console.log('Mobile optimization level:', status.mobileOptimization.level);
```

### 3. Monitor Performance
```typescript
// Enable performance monitoring in production
const integration = new NeuralNetworkIntegration({
  enablePerformanceMonitoring: true
});

// Regularly check performance metrics
const report = integration.getPerformanceReport();
if (report.avgDetectionTime > 100) {
  console.warn('Detection is slow, consider optimization');
}
```

### 4. Use Model Switching
```typescript
// Enable automatic model switching for better accuracy
const integration = new NeuralNetworkIntegration({
  enableModelSwitching: true,
  preferredEngine: 'auto' // Let the system choose the best engine
});
```

### 5. Optimize Deployment
```typescript
// Enable deployment optimization for faster loading
const integration = new NeuralNetworkIntegration({
  enableDeploymentOptimization: true
});

// Preload critical assets
await integration.preloadCriticalAssets([
  '/models/neuralNets/NN_FOOT_23.json',
  '/models/web-ar-rocks/WebARRocksHand.js'
]);
```

## Troubleshooting

### Common Issues

1. **Detection Fails**
   - Check if video element is properly initialized
   - Ensure proper lighting conditions
   - Verify model files are loaded correctly

2. **Slow Performance**
   - Enable mobile optimization
   - Use lower accuracy preset
   - Reduce video resolution

3. **Model Loading Issues**
   - Check network connectivity
   - Verify model file paths
   - Enable deployment optimization for caching

4. **Mobile Device Issues**
   - Check device capability level
   - Apply appropriate optimizations
   - Consider using lighter models

### Debug Mode

```typescript
// Enable debug logging
const integration = new NeuralNetworkIntegration({
  enablePerformanceMonitoring: true
});

// Set up debug callbacks
integration.setDebugCallbacks({
  onDetection: (data) => {
    console.log('Debug - Detection:', data);
  },
  onError: (error) => {
    console.error('Debug - Error:', error);
  }
});
```

This comprehensive guide provides everything needed to integrate and use the neural network system effectively in your Chrono Stride AR application.