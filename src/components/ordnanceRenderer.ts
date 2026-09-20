import { MissileStoreSOA, CounterMissileStoreSOA } from '../simulation/ordnanceSOA';

export interface CameraViewport {
  x: number;
  y: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Batched Zero-Allocation Canvas 2D Render Pipeline for SoA Ordnance.
 * Completely avoids per-entity save/restore, gradient allocations, and closures.
 * Uses single stroke call per pass:
 * Pass 1: Batched missile exhaust trails
 * Pass 2: Batched missile bodies
 * Pass 3: Batched counter-missiles & tracers
 */
export function renderOrdnanceBatched(
  ctx: CanvasRenderingContext2D,
  m: MissileStoreSOA,
  cm: CounterMissileStoreSOA,
  camera: CameraViewport
): void {
  const { zoom, x: camX, y: camY, viewportWidth, viewportHeight } = camera;
  const halfW = viewportWidth * 0.5;
  const halfH = viewportHeight * 0.5;

  const minX = camX - halfW / zoom - 200;
  const maxX = camX + halfW / zoom + 200;
  const minY = camY - halfH / zoom - 200;
  const maxY = camY + halfH / zoom + 200;

  // -------------------------------------------------------------
  // PASS 1: BATCHED MISSILE EXHAUST TRAILS (SINGLE DRAW CALL)
  // -------------------------------------------------------------
  const mCount = m.activeCount;
  const mTrails = m.trailHistory;
  const mHeads = m.trailHead;

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = Math.max(1.0, 1.5 * zoom);
  ctx.beginPath();

  for (let i = 0; i < mCount; i++) {
    const px = m.posX[i];
    const py = m.posY[i];
    if (px < minX || px > maxX || py < minY || py > maxY) continue;

    const baseOffset = i * 32;
    const head = mHeads[i];

    // Read oldest to newest in circular buffer
    let isFirst = true;
    for (let step = 0; step < 16; step++) {
      const ringIdx = (head + 1 + step) & 15;
      const tx = mTrails[baseOffset + ringIdx * 2];
      const ty = mTrails[baseOffset + ringIdx * 2 + 1];

      if (tx === 0 && ty === 0) continue;

      const sx = (tx - camX) * zoom + halfW;
      const sy = (ty - camY) * zoom + halfH;

      if (isFirst) {
        ctx.moveTo(sx, sy);
        isFirst = false;
      } else {
        ctx.lineTo(sx, sy);
      }
    }
  }
  ctx.stroke();

  // -------------------------------------------------------------
  // PASS 2: BATCHED MISSILE BODIES (SINGLE DRAW CALL)
  // -------------------------------------------------------------
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, 2.2 * zoom);
  ctx.beginPath();

  for (let i = 0; i < mCount; i++) {
    const px = m.posX[i];
    const py = m.posY[i];
    if (px < minX || px > maxX || py < minY || py > maxY) continue;

    const sx = (px - camX) * zoom + halfW;
    const sy = (py - camY) * zoom + halfH;

    // Project forward nose vector
    const vx = m.velX[i];
    const vy = m.velY[i];
    const invSpd = 1.0 / (m.speed[i] || 1.0);
    const dirX = vx * invSpd * (6.0 * zoom);
    const dirY = vy * invSpd * (6.0 * zoom);

    ctx.moveTo(sx - dirX, sy - dirY);
    ctx.lineTo(sx + dirX, sy + dirY);
  }
  ctx.stroke();

  // -------------------------------------------------------------
  // PASS 3: BATCHED COUNTER-MISSILES & TRACERS (SINGLE DRAW CALL)
  // -------------------------------------------------------------
  const cmCount = cm.activeCount;
  ctx.strokeStyle = '#ff9900';
  ctx.lineWidth = Math.max(1.0, 1.8 * zoom);
  ctx.beginPath();

  for (let i = 0; i < cmCount; i++) {
    const px = cm.posX[i];
    const py = cm.posY[i];
    if (px < minX || px > maxX || py < minY || py > maxY) continue;

    const sx = (px - camX) * zoom + halfW;
    const sy = (py - camY) * zoom + halfH;
    ctx.moveTo(sx - 2, sy);
    ctx.lineTo(sx + 2, sy);
    ctx.moveTo(sx, sy - 2);
    ctx.lineTo(sx, sy + 2);
  }
  ctx.stroke();
}
