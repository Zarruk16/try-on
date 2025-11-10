import { describe, it, expect } from 'vitest';
import { degToRad, lerp, blendAngle } from '../lib/math';

describe('math helpers', () => {
  it('degToRad converts degrees to radians', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 6);
    expect(degToRad(0)).toBe(0);
  });

  it('lerp blends between values', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('blendAngle handles wrap-around', () => {
    const prev = Math.PI - 0.1; // ~179°
    const next = -Math.PI + 0.1; // -179° (wrap)
    const blended = blendAngle(prev, next, 0.4);
    // should move a small amount across the boundary, not jump ~-358°
    expect(blended).toBeGreaterThan(2.9);
    expect(blended).toBeLessThanOrEqual(Math.PI);
  });
});