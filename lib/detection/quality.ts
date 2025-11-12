export interface QualityMetrics {
  lmCount: number;
  bboxAreaRatio: number;
  toeDistRatio: number;
  passed: boolean;
  reason?: string;
}

// Vendor landmark groups (WebAR.rocks foot NN labels)
const vendorAnkles = [
  'ankleback','ankleout','anklein','anklefront','heelbackout','heelbackin','heelback','heelfront'
];
const vendorToes = [
  'bigtoebasetop','middletoebasetop','pinkytoebasetop','bigtoebase','middletoebase','pinkytoebase'
];

function normName(n: unknown): string {
  return String(n || '').toLowerCase();
}

function collectByNames(keypoints: Array<{x:number;y:number;name?:string}>, names: string[]) {
  return keypoints.filter(kp => names.includes(normName(kp.name)));
}

function avgPoint(pts: Array<{x:number;y:number}>): {x:number;y:number} | null {
  if (!pts.length) return null;
  const sx = pts.reduce((s, p) => s + (p.x || 0), 0);
  const sy = pts.reduce((s, p) => s + (p.y || 0), 0);
  return { x: sx / pts.length, y: sy / pts.length };
}

/**
 * Compute quality metrics for a set of keypoints and video dimensions.
 * Thresholds tuned to avoid false positives while being permissive enough for typical feet.
 */
export function computeQuality(
  keypoints: Array<{ x:number; y:number; name?: string }>,
  videoW: number,
  videoH: number,
  thresholds?: { minKP?: number; minArea?: number; minToeDist?: number },
): QualityMetrics {
  const MIN_KP = thresholds?.minKP ?? 6;
  const MIN_AREA = thresholds?.minArea ?? 0.002; // ~0.2% of frame area
  const MIN_TOE_DIST = thresholds?.minToeDist ?? 0.05; // 5% of max(videoW,videoH)

  const lmCount = keypoints.length;
  let bboxAreaRatio = 0;
  let toeDistRatio = 0;

  if (lmCount > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k of keypoints) {
      const x = k.x || 0, y = k.y || 0;
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    const bw = Math.max(0, maxX - minX);
    const bh = Math.max(0, maxY - minY);
    bboxAreaRatio = (bw * bh) / (videoW * videoH);
  }

  // Anchor: prefer ankles/heels, else centroid
  const anklePts = collectByNames(keypoints, vendorAnkles);
  const toePts = collectByNames(keypoints, vendorToes);
  const centroid = avgPoint(keypoints);
  const anchor = avgPoint(anklePts) || centroid;
  let toe: {x:number;y:number} | null = avgPoint(toePts);
  if (!toe && anchor && keypoints.length > 0) {
    // Farthest from anchor as toe fallback
    let far: {x:number;y:number} | null = null;
    let farD = -1;
    for (const k of keypoints) {
      const dx = (k.x || 0) - anchor.x;
      const dy = (k.y || 0) - anchor.y;
      const d = dx*dx + dy*dy;
      if (d > farD) { farD = d; far = { x: k.x, y: k.y }; }
    }
    toe = far;
  }
  if (anchor && toe) {
    const dxp = anchor.x - toe.x;
    const dyp = anchor.y - toe.y;
    const dist = Math.sqrt(dxp*dxp + dyp*dyp);
    toeDistRatio = dist / Math.max(videoW, videoH);
  }

  let passed = false;
  let reason = '';
  if (lmCount >= MIN_KP && bboxAreaRatio >= MIN_AREA && toeDistRatio >= MIN_TOE_DIST) {
    passed = true;
  } else {
    reason = `kp:${lmCount} area:${bboxAreaRatio.toFixed(4)} toe:${toeDistRatio.toFixed(3)}`;
  }

  return { lmCount, bboxAreaRatio, toeDistRatio, passed, reason: passed ? undefined : reason };
}