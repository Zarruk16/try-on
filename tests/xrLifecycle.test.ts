import { describe, it, expect, vi } from 'vitest';
import { startSession, endSession, createRenderer } from '@/lib/xrLifecycle';

describe('xrLifecycle', () => {
  it('createRenderer handles missing WebGL in test env', () => {
    const canvas = document.createElement('canvas');
    try {
      const r = createRenderer(canvas);
      expect(r).toBeDefined();
    } catch (e) {
      expect(String(e)).toContain('WebGL');
    }
  });

  it('startSession handles lack of XR gracefully', async () => {
    const canvas = document.createElement('canvas');
    const res = await startSession({}, canvas);
    expect(res).toBeNull();
  });

  it('endSession handles empty resources', () => {
    // Should not throw
    endSession({});
    expect(true).toBe(true);
  });
});
