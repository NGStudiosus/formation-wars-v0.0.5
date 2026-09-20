/**
 * Fog of War & Tactical Contact Blip Renderer
 *
 * Visualizes unresolved radar echoes when contacts reside within the
 * Passive Sensor Horizon (25,200 km) but outside Active Radar (8,400 km).
 *
 * Characteristics:
 * - Suppresses vector hull geometry, ship names, and health/shield bars.
 * - Renders a distinct tactical sensor blip at the target's world position:
 *   - Glowing amber/orange radar echo (#ff9900 or #ff7700) with diamond or circular pip.
 *   - 1px dashed ring pulsing slightly (radius ~10px to 18px depending on RCS cluster size).
 *   - Monospace label in red/amber: [CONTACT - UNRESOLVED BLIP].
 * - Dynamically tracks contacts orbiting celestial bodies (e.g., Verdant-Prime).
 */

import { SensorBlip } from '../types';

export interface BlipRenderOptions {
  rcsWeight?: number;
  heading?: number;
  nowMs?: number;
  count?: number;
}

/**
 * Renders an unresolved tactical contact blip at the given screen coordinates.
 */
export function renderFogOfWarContactBlip(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  rcsWeight: number = 3,
  heading?: number,
  nowMs: number = Date.now(),
  count?: number
): void {
  ctx.save();

  // Dynamic radius based on RCS cluster size (clamped between 10px and 18px)
  const baseRadius = Math.max(10, Math.min(18, 9 + Math.sqrt(rcsWeight) * 2.0));
  // 1px dashed ring pulsing slightly (sinusoidal pulse ~1.2px)
  const pulse = Math.sin(nowMs * 0.005) * 1.5;
  const currentRadius = baseRadius + pulse;

  // 1. Glowing amber/orange radar echo perimeter (#ff9900 / #ff7700)
  ctx.strokeStyle = 'rgba(255, 153, 0, 0.75)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([3, 3]);
  ctx.lineDashOffset = -nowMs * 0.01;
  ctx.beginPath();
  ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Crisp vector diamond pip
  const pipSize = Math.max(3.5, Math.min(6.5, 3.2 + Math.sqrt(rcsWeight) * 0.75));
  ctx.fillStyle = '#ff9900';

  // Diamond pip
  ctx.beginPath();
  ctx.moveTo(sx, sy - pipSize);
  ctx.lineTo(sx + pipSize, sy);
  ctx.lineTo(sx, sy + pipSize);
  ctx.lineTo(sx - pipSize, sy);
  ctx.closePath();
  ctx.fill();

  // Inner bright core
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // 3. Optional directional bearing line if heading is known
  if (heading !== undefined && !isNaN(heading)) {
    ctx.strokeStyle = 'rgba(255, 153, 0, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(heading) * (currentRadius + 6), sy + Math.sin(heading) * (currentRadius + 6));
    ctx.stroke();
  }

  // 4. Adjacent label in red/amber monospace: [CONTACT - UNRESOLVED BLIP]
  ctx.fillStyle = '#ff9900';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[CONTACT - UNRESOLVED BLIP]', sx, sy + currentRadius + 12);

  if (count && count > 1) {
    ctx.fillStyle = '#fb923c';
    ctx.font = '8px monospace';
    ctx.fillText(`CLUSTER x${count} (RCS ${Math.round(rcsWeight)})`, sx, sy + currentRadius + 22);
  }

  ctx.restore();
}

/**
 * Batch renders clustered passive radar blips across the tactical canvas.
 */
export function renderAllActiveBlips(
  ctx: CanvasRenderingContext2D,
  blips: SensorBlip[],
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  nowMs: number = Date.now()
): void {
  if (!blips || blips.length === 0) return;
  for (let i = 0; i < blips.length; i++) {
    const blip = blips[i];
    const [sx, sy] = worldToScreen(blip.x, blip.y, width, height);
    // Viewport cull check
    if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) continue;
    renderFogOfWarContactBlip(ctx, sx, sy, blip.rcsWeight, blip.sourceHeading, nowMs, blip.count);
  }
}
