import { ShipEntity, Vec2D } from '../types';
export * from './shipRenderers';

/**
 * Procedural Cherenkov FTL & Hyperdrive Kinematics Renderer
 * 
 * Implements high-fidelity visual representations for continuous 64x sublight jump transit:
 * 1. Elongated Cherenkov visual trail (300px along negative velocity vector, rgba(0, 240, 255, 0.8) fading to transparent)
 * 2. High-speed tactical vector streaks connecting origin star to destination star on the galactic map view
 * 3. Blue-white Cherenkov charging glow during the 3.0s (90 ticks) spool-up phase
 */

/**
 * Draws the elongated 300px Cherenkov visual trail behind a vessel in active 64x hyperdrive transit.
 */
export function renderCherenkovJumpTrail(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  headingRad: number,
  trailLengthPx: number = 300,
  nowMs: number = 0
): void {
  ctx.save();

  const backX = sx - Math.cos(headingRad) * trailLengthPx;
  const backY = sy - Math.sin(headingRad) * trailLengthPx;

  // 1. Wide diffuse subspace ionization sheath
  const sheathGrad = ctx.createLinearGradient(sx, sy, backX, backY);
  sheathGrad.addColorStop(0, 'rgba(0, 240, 255, 0.85)');
  sheathGrad.addColorStop(0.15, 'rgba(147, 197, 253, 0.65)');
  sheathGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.3)');
  sheathGrad.addColorStop(1.0, 'rgba(0, 240, 255, 0.0)');

  ctx.strokeStyle = sheathGrad;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(backX, backY);
  ctx.stroke();

  // 2. Focused high-energy Cherenkov core streak
  const coreGrad = ctx.createLinearGradient(sx, sy, backX, backY);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  coreGrad.addColorStop(0.2, 'rgba(224, 242, 254, 0.85)');
  coreGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.4)');
  coreGrad.addColorStop(1.0, 'rgba(0, 240, 255, 0.0)');

  ctx.strokeStyle = coreGrad;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(backX, backY);
  ctx.stroke();

  // 3. High-velocity Cherenkov ionization sparks shedding off stern
  const sparkPhase = (nowMs * 0.005) % 1;
  ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
  for (let i = 1; i <= 4; i++) {
    const dFactor = (sparkPhase + i * 0.22) % 1;
    const sparkDist = dFactor * (trailLengthPx * 0.7);
    const lateralJitter = Math.sin(nowMs * 0.02 + i * 1.7) * (3 + dFactor * 6);
    const perpAngle = headingRad + Math.PI * 0.5;
    const px = sx - Math.cos(headingRad) * sparkDist + Math.cos(perpAngle) * lateralJitter;
    const py = sy - Math.sin(headingRad) * sparkDist + Math.sin(perpAngle) * lateralJitter;
    const sparkSize = Math.max(0.8, (1 - dFactor) * 2.2);

    ctx.beginPath();
    ctx.arc(px, py, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Forward bow-shock Cherenkov radiation crest
  const forwardX = sx + Math.cos(headingRad) * 12;
  const forwardY = sy + Math.sin(headingRad) * 12;
  const bowGrad = ctx.createRadialGradient(forwardX, forwardY, 0, sx, sy, 18);
  bowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  bowGrad.addColorStop(0.4, 'rgba(0, 240, 255, 0.8)');
  bowGrad.addColorStop(1.0, 'rgba(0, 240, 255, 0.0)');
  ctx.fillStyle = bowGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the blue-white Cherenkov charging glow during hyperdrive spooling (3.0s / 90 ticks).
 */
export function renderCherenkovSpoolGlow(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hullRadiusPx: number,
  progress: number, // 0.0 to 1.0
  nowMs: number,
  isInterdicted: boolean = false
): void {
  ctx.save();
  const chargeRadius = Math.max(22, hullRadiusPx * 1.8);
  const pulseFreq = nowMs * 0.008 * (1.0 + progress * 2.5);
  const pulseR = chargeRadius + Math.sin(pulseFreq) * 5;

  // 1. Intense radial Cherenkov glow
  const glowGrad = ctx.createRadialGradient(sx, sy, hullRadiusPx * 0.3, sx, sy, pulseR);
  if (isInterdicted) {
    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    glowGrad.addColorStop(0.3, 'rgba(239, 68, 68, 0.85)');
    glowGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.4)');
    glowGrad.addColorStop(1.0, 'rgba(239, 68, 68, 0.0)');
  } else {
    glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    glowGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.85)');
    glowGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.4)');
    glowGrad.addColorStop(1.0, 'rgba(0, 240, 255, 0.0)');
  }

  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, pulseR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Collapsing spatial compression ripples
  const collapseCycle = (nowMs * 0.002 * (1.0 + progress * 2.0)) % 1;
  const collapsingR = chargeRadius * (1.7 - collapseCycle * 0.8);
  ctx.strokeStyle = isInterdicted
    ? `rgba(239, 68, 68, ${(1 - collapseCycle) * 0.8})`
    : `rgba(0, 240, 255, ${(1 - collapseCycle) * 0.85})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sx, sy, collapsingR, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Segmented high-speed spinning containment field brackets
  const spinSpeed = nowMs * 0.004 * (1.0 + progress * 3.0);
  ctx.strokeStyle = isInterdicted ? '#ef4444' : '#00f0ff';
  ctx.lineWidth = 2.0;
  ctx.shadowColor = isInterdicted ? '#ef4444' : '#00f0ff';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 4; i++) {
    const aStart = spinSpeed + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(sx, sy, chargeRadius + 4, aStart, aStart + Math.PI * 0.28);
    ctx.stroke();
  }

  // 4. Circular charge completion meter
  ctx.strokeStyle = isInterdicted ? '#f87171' : '#bae6fd';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(sx, sy, chargeRadius + 8, -Math.PI * 0.5, -Math.PI * 0.5 + progress * Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws high-speed tactical vector streaks connecting origin star to destination star on the galactic map view.
 */
export function renderGalacticJumpConduit(
  ctx: CanvasRenderingContext2D,
  origScreen: { x: number; y: number },
  destScreen: { x: number; y: number },
  shipScreen: { x: number; y: number },
  nowMs: number = 0
): void {
  ctx.save();

  // 1. Subspace channel corridor (soft outer glow)
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(origScreen.x, origScreen.y);
  ctx.lineTo(destScreen.x, destScreen.y);
  ctx.stroke();

  // 2. High-speed vector streak dashed beam
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([12, 10]);
  ctx.lineDashOffset = -nowMs * 0.04;
  ctx.beginPath();
  ctx.moveTo(origScreen.x, origScreen.y);
  ctx.lineTo(destScreen.x, destScreen.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Destination tactical marker ring
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(destScreen.x, destScreen.y, 6, 0, Math.PI * 2);
  ctx.stroke();

  // Origin anchor dot
  ctx.fillStyle = 'rgba(147, 197, 253, 0.7)';
  ctx.beginPath();
  ctx.arc(origScreen.x, origScreen.y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
