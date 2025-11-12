export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface PoseResult {
  keypoints: Keypoint[];
}

export interface MapToOriginalOptions {
  srcW: number;
  srcH: number;
  origW: number;
  origH: number;
  offsetX?: number; // for crops
  offsetY?: number; // for crops
}

export interface EstimateOptions {
  flipHorizontal?: boolean;
  mapToOriginal?: MapToOriginalOptions;
}

export interface FootDetectorEngine {
  /** Human-friendly name of the engine */
  name: string;
  /** Engine type identifier */
  type: 'tf';
  /** Run a single estimation on the provided source */
  estimate(source: HTMLVideoElement | HTMLCanvasElement, options?: EstimateOptions): Promise<PoseResult[] | null>;
  /** Optional init hook for engines that require pre-initialization */
  initialize?(): Promise<void> | void;
  /** Dispose underlying resources */
  dispose(): void | Promise<void>;
}

export type AccuracyPreset = 'lite' | 'full' | 'heavy';
