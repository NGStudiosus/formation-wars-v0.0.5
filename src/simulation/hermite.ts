import { Vec2D } from '../types';

export function hermiteInterpolate(p0: Vec2D, m0: Vec2D, p1: Vec2D, m1: Vec2D, t: number): Vec2D {
  const t2 = t * t;
  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return {
    x: p0.x * h00 + m0.x * h10 + p1.x * h01 + m1.x * h11,
    y: p0.y * h00 + m0.y * h10 + p1.y * h01 + m1.y * h11,
  };
}

export function distSq(a: Vec2D, b: Vec2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function dist(a: Vec2D, b: Vec2D): number {
  return Math.sqrt(distSq(a, b));
}

export function normalize(v: Vec2D): Vec2D {
  const lSq = v.x * v.x + v.y * v.y;
  if (lSq > 0.000001) {
    const inv = 1 / Math.sqrt(lSq);
    return { x: v.x * inv, y: v.y * inv };
  }
  return { x: 0, y: 0 };
}

export function computeSplineTangents(
  p0: Vec2D,
  heading: number,
  currentSpeed: number,
  p1: Vec2D,
  maxSpeed: number
): { m0: Vec2D; m1: Vec2D; duration: number } {
  const forwardDir = { x: Math.cos(heading), y: Math.sin(heading) };
  const chord = { x: p1.x - p0.x, y: p1.y - p0.y };
  const chordLen = Math.sqrt(chord.x * chord.x + chord.y * chord.y);

  // Impulse scaling: Scale initial impulse and tangents with chord length and vessel maxSpeed
  // Pulls vessels out of turns and burns responsively across multi-thousand-kilometer sectors without crawling
  const effectiveMax = Math.max(maxSpeed, 200.0);
  const baselineSpeed = Math.max(currentSpeed, effectiveMax * 0.4);
  const tangentMag = Math.min(
    Math.max(chordLen * 0.4, baselineSpeed * 1.5),
    chordLen * 1.5
  );

  const m0 = {
    x: forwardDir.x * tangentMag,
    y: forwardDir.y * tangentMag,
  };

  const approachDir = chordLen > 0.001
    ? { x: chord.x / chordLen, y: chord.y / chordLen }
    : forwardDir;

  const m1 = {
    x: approachDir.x * tangentMag * 0.75,
    y: approachDir.y * tangentMag * 0.75,
  };

  // Traversal duration: Scales smoothly with commanded speed and sector distance
  const duration = Math.max(chordLen / effectiveMax, 1.2);

  return { m0, m1, duration };
}

export interface CubicSplineTrajectory {
  p0: Vec2D;
  p1: Vec2D;
  c0: Vec2D;
  c1: Vec2D;
  c2: Vec2D;
  c3: Vec2D;
  t0: Vec2D;
  t1: Vec2D;
  totalLength: number;
  sampleCount: number;
  cumDistances: number[];
  samples: Vec2D[];
}

/**
 * Evaluates a point on a cubic Bezier curve at parameter t in [0, 1].
 */
export function evaluateCubicBezier(c0: Vec2D, c1: Vec2D, c2: Vec2D, c3: Vec2D, t: number): Vec2D {
  const oneMinusT = 1.0 - t;
  const mt2 = oneMinusT * oneMinusT;
  const mt3 = mt2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: mt3 * c0.x + 3.0 * mt2 * t * c1.x + 3.0 * oneMinusT * t2 * c2.x + t3 * c3.x,
    y: mt3 * c0.y + 3.0 * mt2 * t * c1.y + 3.0 * oneMinusT * t2 * c2.y + t3 * c3.y,
  };
}

/**
 * Evaluates the first derivative vector B'(t) of a cubic Bezier curve at parameter t.
 * B'(t) = 3(1-t)^2 (C1 - C0) + 6(1-t)t (C2 - C1) + 3t^2 (C3 - C2)
 */
export function evaluateCubicBezierDerivative(c0: Vec2D, c1: Vec2D, c2: Vec2D, c3: Vec2D, t: number): Vec2D {
  const oneMinusT = 1.0 - t;
  const mt2 = oneMinusT * oneMinusT;
  const t2 = t * t;

  return {
    x: 3.0 * mt2 * (c1.x - c0.x) + 6.0 * oneMinusT * t * (c2.x - c1.x) + 3.0 * t2 * (c3.x - c2.x),
    y: 3.0 * mt2 * (c1.y - c0.y) + 6.0 * oneMinusT * t * (c2.y - c1.y) + 3.0 * t2 * (c3.y - c2.y),
  };
}

/**
 * DYNAMIC VELOCITY-BASED SPLINE ENGINE (DELTA-V TURNING ARCS)
 * Computes cubic Bezier trajectory with control points based on initial vessel speed and momentum vector.
 */
export function computeDynamicSplineTrajectory(
  p0: Vec2D,
  v0: Vec2D,
  pDest: Vec2D,
  cruiseSpeed: number = 700.0
): CubicSplineTrajectory {
  const dx = pDest.x - p0.x;
  const dy = pDest.y - p0.y;
  const L = Math.hypot(dx, dy);

  let uTarget: Vec2D;
  if (L > 0.0001) {
    uTarget = { x: dx / L, y: dy / L };
  } else {
    uTarget = { x: 1.0, y: 0.0 };
  }

  const v0Speed = Math.hypot(v0?.x || 0, v0?.y || 0);
  let T0: Vec2D;
  let T1: Vec2D;

  // Condition A: Low Speed / Rest (|v0| < 50 km/s or short hops L < 500 km)
  if (v0Speed < 50.0 || L < 500.0) {
    const tangentScale = 0.25 * L;
    T0 = { x: uTarget.x * tangentScale, y: uTarget.y * tangentScale };
    T1 = { x: uTarget.x * tangentScale, y: uTarget.y * tangentScale };
  } else {
    // Condition B: In-Flight Course Change (|v0| >= 50 km/s)
    const effectiveCruise = Math.max(cruiseSpeed, 100.0);
    const speedRatio = v0Speed / effectiveCruise;
    const leadFactor = Math.min(1.5, speedRatio) * (0.35 * L);
    const v0Norm = { x: v0.x / v0Speed, y: v0.y / v0Speed };

    T0 = { x: v0Norm.x * leadFactor, y: v0Norm.y * leadFactor };
    T1 = { x: uTarget.x * (0.25 * L), y: uTarget.y * (0.25 * L) };
  }

  // Control Points for Cubic Curve:
  // C0 = P0
  // C1 = P0 + T0
  // C2 = Pdest - T1
  // C3 = Pdest
  const c0: Vec2D = { x: p0.x, y: p0.y };
  const c1: Vec2D = { x: p0.x + T0.x, y: p0.y + T0.y };
  const c2: Vec2D = { x: pDest.x - T1.x, y: pDest.y - T1.y };
  const c3: Vec2D = { x: pDest.x, y: pDest.y };

  // Sample the curve for arc length lookup
  const sampleCount = 32;
  const samples: Vec2D[] = [];
  const cumDistances: number[] = [0];
  let totalLength = 0;

  let prevPoint = evaluateCubicBezier(c0, c1, c2, c3, 0);
  samples.push(prevPoint);

  for (let i = 1; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const pt = evaluateCubicBezier(c0, c1, c2, c3, t);
    samples.push(pt);
    const segDist = Math.hypot(pt.x - prevPoint.x, pt.y - prevPoint.y);
    totalLength += segDist;
    cumDistances.push(totalLength);
    prevPoint = pt;
  }

  return {
    p0: c0,
    p1: c3,
    c0,
    c1,
    c2,
    c3,
    t0: T0,
    t1: T1,
    totalLength: Math.max(totalLength, L),
    sampleCount,
    cumDistances,
    samples,
  };
}

/**
 * Returns the remaining arc distance along the spline S(t) from parameter t to endpoint (t=1).
 */
export function getRemainingArcDistance(traj: CubicSplineTrajectory, t: number): number {
  if (!traj || !traj.cumDistances || traj.cumDistances.length === 0) {
    return 0;
  }
  const clampedT = Math.max(0, Math.min(1.0, t));
  if (clampedT >= 1.0) return 0;
  if (clampedT <= 0.0) return traj.totalLength;

  const rawIdx = clampedT * traj.sampleCount;
  const idx = Math.floor(rawIdx);
  const frac = rawIdx - idx;

  const d0 = traj.cumDistances[idx];
  const d1 = traj.cumDistances[Math.min(idx + 1, traj.sampleCount)];
  const traversed = d0 + frac * (d1 - d0);

  return Math.max(0, traj.totalLength - traversed);
}
