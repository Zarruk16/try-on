export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Blends angles in radians, handling wrap-around at ±PI
export function blendAngle(prev: number, next: number, t: number): number {
  let delta = next - prev;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return prev + delta * t;
}