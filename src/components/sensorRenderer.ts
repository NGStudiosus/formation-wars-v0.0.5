import { ShipEntity } from '../types';
import {
  BASE_TACTICAL_RANGES,
  calculateEffectiveTacticalRanges,
  EffectiveTacticalRanges,
  TacticalRangeModifiers,
} from '../simulation/sensorController';
import { getBaseRadarRadius, calculateEntitySensors } from '../simulation/sensors';
import { renderFogOfWarContactBlip, renderAllActiveBlips } from './fogOfWarRenderer';

export { renderFogOfWarContactBlip, renderAllActiveBlips };

export interface TacticalCamera {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Clean Vector Range Reticles Renderer
 * Renders concentric, high-contrast dashed or hairline vector rings centered on selected units.
 * Completely eliminates soft-edge radial gradient fills, blurred masks, and semi-opaque fog washes.
 */
export function renderTacticalRangeReticles(
  ctx: CanvasRenderingContext2D,
  selectedUnits: ShipEntity[],
  width: number,
  height: number,
  cam: TacticalCamera,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  modifiers?: TacticalRangeModifiers
): void {
  if (!selectedUnits || selectedUnits.length === 0) return;

  const ranges: EffectiveTacticalRanges = calculateEffectiveTacticalRanges(modifiers);
  const radarMult = modifiers?.radarMultiplier ?? modifiers?.radarRangeMult ?? modifiers?.sensorRangeMult ?? 1.0;
  const passiveMult = modifiers?.passiveMultiplier ?? modifiers?.passiveRangeMult ?? 1.0;

  ctx.save();

  for (let i = 0; i < selectedUnits.length; i++) {
    const ship = selectedUnits[i];
    if (ship.hullState === 'DESTROYED') continue;

    const [sx, sy] = worldToScreen(ship.pos.x, ship.pos.y, width, height);

    // Calculate entity-specific active radar and passive sensor ranges
    const baseRadar = ship.baseRadar || getBaseRadarRadius(ship);
    const { activeRadarR, passiveSensorR } = calculateEntitySensors(baseRadar, {
      radarMultiplier: radarMult,
      passiveMultiplier: passiveMult,
    });
    const unitRadarR = ship.radarRadius || activeRadarR;
    const unitPassiveR = ship.passiveRadius || passiveSensorR;

    // Calculate screen radii
    const radarScreenR = unitRadarR * cam.zoom;
    const passiveScreenR = unitPassiveR * cam.zoom;
    const missileR = ranges.effectiveMissileRange * cam.zoom;
    const cmR = ranges.effectiveCMRange * cam.zoom;
    const beamR = ranges.effectiveBeamRange * cam.zoom;
    const pdR = ranges.effectivePDRange * cam.zoom;

    // Viewport intersection test for the outer passive sensor horizon
    if (
      sx + passiveScreenR < 0 ||
      sx - passiveScreenR > width ||
      sy + passiveScreenR < 0 ||
      sy - passiveScreenR > height
    ) {
      continue;
    }

    // 1A. PASSIVE DETECTION (Outer Ring: 3x Active Radar * passiveMultiplier)
    // Draw the outer dashed perimeter for Passive Detection at exactly 3 * R_radar * passiveMultiplier (rgba(255, 170, 0, 0.25))
    if (passiveScreenR > 0) {
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(sx, sy, passiveScreenR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 170, 0, 0.65)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`PASSIVE DETECTION: ${Math.round(unitPassiveR)}km`, sx, sy - passiveScreenR - 6);
    }

    // 1B. ACTIVE RADAR (Inner Ring: R_radar)
    // Draw the inner solid/dashed circle for Active Radar at R_radar (rgba(0, 240, 255, 0.4))
    if (radarScreenR > 0) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.40)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(sx, sy, radarScreenR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 240, 255, 0.70)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`ACTIVE RADAR: ${Math.round(unitRadarR)}km`, sx, sy - radarScreenR - 6);
    }

    // 2. OFFENSIVE MISSILE ENVELOPE (2400 km Base)
    // Distinct amber dashed ring (rgba(255, 170, 0, 0.40), 1px stroke, setLineDash([4, 4]))
    if (missileR > 0) {
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.40)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(sx, sy, missileR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 170, 0, 0.65)';
      ctx.fillText(`MISSILE LOCK: ${Math.round(ranges.effectiveMissileRange)}km`, sx, sy - missileR - 4);
    }

    // 3. OFFENSIVE ENERGY BEAM ARRAY (300 km Base)
    // Engagement band for offensive continuous lasers & heavy grasers
    if (beamR > 0 && (ship.offensiveLasers || ship.offensiveGrasers || (ship.role !== 'MINER' && ship.role !== 'BUILDER'))) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.30)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, beamR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. CLOSE-IN DEFENSE GRID
    // Counter-Missile Intercept Radius (400 km Base) - Faint red solid hairline boundary
    if (cmR > 0) {
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]); // solid hairline
      ctx.beginPath();
      ctx.arc(sx, sy, cmR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(248, 113, 113, 0.60)';
      ctx.fillText(`CM INTERCEPT: ${Math.round(ranges.effectiveCMRange)}km`, sx, sy - cmR - 4);
    }

    // Point-Defense Lasers (200 km Base) - Faint white/cyan solid hairline boundary
    if (pdR > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
      ctx.lineWidth = 1;
      ctx.setLineDash([]); // solid hairline
      ctx.beginPath();
      ctx.arc(sx, sy, pdR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText(`POINT DEFENSE: ${Math.round(ranges.effectivePDRange)}km`, sx, sy - pdR - 4);
    }
  }

  ctx.restore();
}

/**
 * Renders directional sensor blip for hostile contacts detected within sensor horizon
 * but outside full visual / missile lock envelope. Zero blurry gradients or haze.
 */
export function renderSensorContactBlip(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  heading?: number,
  rcsWeight: number = 3
): void {
  renderFogOfWarContactBlip(ctx, sx, sy, rcsWeight, heading, Date.now());
}
