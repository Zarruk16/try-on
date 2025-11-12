import { describe, it, expect } from 'vitest';
import { computeQuality } from '@/lib/detection/quality';

describe('computeQuality', () => {
  const W = 640, H = 480;

  it('fails with too few keypoints', () => {
    const kp = [{ x: 100, y: 100 }];
    const qm = computeQuality(kp, W, H);
    expect(qm.passed).toBe(false);
    expect(qm.lmCount).toBe(1);
  });

  it('passes with sufficient area and toe distance', () => {
    const kp = [
      { x: 200, y: 300, name: 'anklefront' },
      { x: 210, y: 305, name: 'heelback' },
      { x: 300, y: 350, name: 'bigtoebase' },
      { x: 305, y: 355, name: 'middletoebasetop' },
      { x: 250, y: 310 },
      { x: 260, y: 315 },
    ];
    const qm = computeQuality(kp, W, H);
    expect(qm.lmCount).toBeGreaterThanOrEqual(6);
    expect(qm.bboxAreaRatio).toBeGreaterThan(0.001);
    expect(qm.toeDistRatio).toBeGreaterThan(0.03);
    expect(qm.passed).toBe(true);
  });

  it('respects custom thresholds', () => {
    const kp = [
      { x: 220, y: 220, name: 'ankleout' },
      { x: 221, y: 221, name: 'heelfront' },
      { x: 225, y: 225, name: 'bigtoebase' },
      { x: 226, y: 226 },
      { x: 227, y: 227 },
      { x: 228, y: 228 },
    ];
    const qm = computeQuality(kp, W, H, { minArea: 0.005, minToeDist: 0.06 });
    expect(qm.passed).toBe(false);
    expect(qm.reason).toContain('area');
  });
});