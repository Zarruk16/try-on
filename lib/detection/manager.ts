import type { FootDetectorEngine, AccuracyPreset } from './types';
import { createWebARRocksEngine } from './webarrocks';

export interface CreateManagerOptions {
  preset: AccuracyPreset;
  preferWebARRocks?: boolean;
}

export async function createFootDetectionManager(opts: CreateManagerOptions): Promise<{
  engine: FootDetectorEngine;
  usingWebARRocks: boolean;
}> {
  let usingWebARRocks = true;
  const engine = await createWebARRocksEngine();
  if (!engine) {
    throw new Error('WebAR.rocks engine unavailable');
  }
  return { engine, usingWebARRocks };
}