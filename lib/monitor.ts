type Level = 'info' | 'warn' | 'error';

type Timer = { start: number; end?: number };
type Metrics = {
  timers: Record<string, Timer>;
  counters: Record<string, number>;
};

const metrics: Metrics = {
  timers: {},
  counters: {},
};

export function log(level: Level, msg: string, meta?: any) {
  const payload = { level, msg, meta, time: new Date().toISOString() };
  try {
    // eslint-disable-next-line no-console
    if (level === 'error') console.error('[AR]', payload);
    else if (level === 'warn') console.warn('[AR]', payload);
    else console.log('[AR]', payload);
  } catch {}
}

export function reportError(msg: string, error?: any) {
  log('error', msg, { error });
}

export function startTimer(name: string) {
  metrics.timers[name] = { start: performance.now() };
}

export function endTimer(name: string, meta?: any): number | undefined {
  const t = metrics.timers[name];
  if (!t) return undefined;
  t.end = performance.now();
  const duration = t.end - t.start;
  log('info', `timer:${name}`, { duration, ...meta });
  return duration;
}

export function incrementCounter(name: string, by = 1) {
  metrics.counters[name] = (metrics.counters[name] ?? 0) + by;
}

export function getMetrics(): Metrics {
  // return shallow copy to avoid external mutation
  return {
    timers: { ...metrics.timers },
    counters: { ...metrics.counters },
  };
}

export async function measure<T>(name: string, fn: () => Promise<T> | T, meta?: any): Promise<T> {
  startTimer(name);
  try {
    const result = await fn();
    endTimer(name, meta);
    return result;
  } catch (error) {
    endTimer(name, { ...meta, error: String(error) });
    reportError(`measure:${name}`, error);
    throw error;
  }
}
