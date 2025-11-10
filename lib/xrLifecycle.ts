import * as THREE from 'three';
import { log, reportError, startTimer, endTimer } from './monitor';

export type XRResources = {
  renderer?: THREE.WebGLRenderer;
  session?: XRSession | null;
};

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  startTimer('webgl_renderer_create');
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    endTimer('webgl_renderer_create');
    return renderer;
  } catch (error) {
    endTimer('webgl_renderer_create', { error: String(error) });
    reportError('Error creating WebGLRenderer', error);
    throw error;
  }
}

export async function startSession(resources: XRResources, canvas: HTMLCanvasElement): Promise<XRSession | null> {
  if (!navigator.xr) {
    reportError('XR not supported');
    return null;
  }
  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
      log('warn', 'XR immersive-ar not supported');
      return null;
    }
    startTimer('xr_session_start');
    const session = await navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local', 'hit-test'] });
    endTimer('xr_session_start');
    resources.session = session;
    if (!resources.renderer) resources.renderer = createRenderer(canvas);
    resources.renderer.xr.enabled = true;
    await resources.renderer.xr.setSession(session);
    log('info', 'XR session started');
    return session;
  } catch (error) {
    reportError('Failed to start XR session', error);
    return null;
  }
}

export function endSession(resources: XRResources) {
  const { session, renderer } = resources;
  if (session) {
    try {
      session.end();
      log('info', 'XR session ended');
    } catch (error) {
      reportError('Failed to end XR session', error);
    }
    resources.session = null;
  }
  if (renderer) {
    try {
      renderer.setAnimationLoop(null);
      const gl = renderer.getContext();
      if (gl && 'loseContext' in gl) {
        // @ts-ignore
        gl.loseContext();
      }
      log('info', 'WebGL renderer stopped');
    } catch (error) {
      reportError('Failed to stop WebGL renderer', error);
    }
  }
}

export function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
  const canvas = renderer.domElement as HTMLCanvasElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
}
