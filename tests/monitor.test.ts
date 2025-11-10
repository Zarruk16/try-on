import { describe, it, expect } from 'vitest';
import { log, startTimer, endTimer, incrementCounter, getMetrics, measure } from '@/lib/monitor';

describe('monitor utilities', () => {
  it('start and end timer records duration', () => {
    startTimer('t1');
    const dur = endTimer('t1');
    expect(dur).toBeTypeOf('number');
    const m = getMetrics();
    expect(m.timers['t1']).toBeDefined();
  });

  it('incrementCounter accumulates values', () => {
    incrementCounter('c1');
    incrementCounter('c1', 2);
    const m = getMetrics();
    expect(m.counters['c1']).toBe(3);
  });

  it('measure wraps async function and logs duration', async () => {
    const result = await measure('m1', async () => {
      return 42;
    });
    expect(result).toBe(42);
    const m = getMetrics();
    expect(m.timers['m1']).toBeDefined();
  });
});