// Vitest JSDOM setup for project tests
import { expect } from 'vitest';

// Silence noisy console during tests
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (String(args[0] || '').includes('webar')) return; // suppress SDK noise
  origWarn(...args);
};

// Basic DOM APIs used in components
Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

// Polyfill requestVideoFrameCallback for tests
if (!(HTMLVideoElement.prototype as any).requestVideoFrameCallback) {
  (HTMLVideoElement.prototype as any).requestVideoFrameCallback = (cb: Function) => {
    setTimeout(() => cb(0, {}), 16);
  };
}