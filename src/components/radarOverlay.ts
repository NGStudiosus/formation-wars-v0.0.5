import { ShipEntity } from '../types';
import { SimulationEngine } from '../simulation/engine';
import { BASE_TACTICAL_RANGES } from '../simulation/sensorController';

export interface TacticalCamera {
  x: number;
  y: number;
  zoom: number;
}

export interface CulledSensorNode {
  x: number;
  y: number;
  r: number;
  worldR: number;
  id: string;
  name: string;
}

/**
 * Calculates sensor/radar detection perimeter range in kilometers for any ship or orbital platform.
 * Radar horizon is keyed directly to static constants modified only by research tiers.
 */
export function getUnitSensorRange(ship: ShipEntity, engine: SimulationEngine): number {
  if (ship.radarRadius && ship.radarRadius > 0) {
    return ship.radarRadius;
  }
  if (ship.sensorRange && ship.sensorRange > 0) {
    return ship.sensorRange;
  }
  const mult = (engine.radarMultiplier || engine.activeRadarDistMult || engine.sensorRangeMult || 1.0);
  return BASE_TACTICAL_RANGES.radarRangeKm * mult;
}

// Scratch buffers to eliminate garbage-collection during 60FPS tactical loops
const culledNodesScratch: CulledSensorNode[] = [];
let intervalsScratch: number[] = [];
let swapIntervalsScratch: number[] = [];

const TWO_PI = Math.PI * 2;

function subtractCoveredInterval(
  current: number[],
  next: number[],
  covStart: number,
  covEnd: number
): void {
  next.length = 0;
  for (let i = 0; i < current.length; i += 2) {
    const s = current[i];
    const e = current[i + 1];

    if (covEnd <= s || covStart >= e) {
      next.push(s, e);
      continue;
    }
    if (covStart <= s && covEnd >= e) {
      continue;
    }
    if (covStart > s && covEnd < e) {
      next.push(s, covStart, covEnd, e);
      continue;
    }
    if (covStart <= s && covEnd < e) {
      next.push(covEnd, e);
      continue;
    }
    if (covStart > s && covEnd >= e) {
      next.push(s, covStart);
      continue;
    }
  }
}

function subtractAngleRange(
  inputIntervals: number[],
  covStart: number,
  covEnd: number
): number[] {
  let cur = inputIntervals;
  let next = cur === intervalsScratch ? swapIntervalsScratch : intervalsScratch;

  if (covStart < 0) {
    subtractCoveredInterval(cur, next, covStart + TWO_PI, TWO_PI);
    cur = next;
    next = cur === intervalsScratch ? swapIntervalsScratch : intervalsScratch;

    if (covEnd > 0) {
      subtractCoveredInterval(cur, next, 0, Math.min(covEnd, TWO_PI));
      cur = next;
    }
  } else if (covEnd > TWO_PI) {
    subtractCoveredInterval(cur, next, covStart, TWO_PI);
    cur = next;
    next = cur === intervalsScratch ? swapIntervalsScratch : intervalsScratch;

    subtractCoveredInterval(cur, next, 0, covEnd - TWO_PI);
    cur = next;
  } else {
    subtractCoveredInterval(cur, next, covStart, covEnd);
    cur = next;
  }
  return cur;
}

/**
 * Selective Sensor/Radar Overlay Renderer.
 *
 * Rules:
 * 1. If no entity is selected (selectedUnits.length === 0): Render zero radar rings.
 * 2. If a single ship/structure is selected: Render only that entity's radar ring with crisp dashed cyan stroke.
 * 3. If multiple ships are selected (Fleet Mode): Render a seamless multi-lobed sensor footprint:
 *    - Offscreen mask fills solid circles, drawn to main canvas with faint 0.05 tint.
 *    - Boundary contour is computed with circular arc interval subtraction so zero internal lines are drawn.
 */
export function renderSensorOverlay(
  ctx: CanvasRenderingContext2D,
  engine: SimulationEngine,
  selectedUnits: ShipEntity[],
  width: number,
  height: number,
  cam: TacticalCamera,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
): void {
  // Rule 1: Zero entities selected -> draw zero radar rings
  if (!selectedUnits || selectedUnits.length === 0) {
    return;
  }

  // Camera Viewport Culling & Screen Position calculation
  culledNodesScratch.length = 0;
  for (let i = 0; i < selectedUnits.length; i++) {
    const unit = selectedUnits[i];
    if (unit.hullState === 'DESTROYED') continue;

    const [sx, sy] = worldToScreen(unit.pos.x, unit.pos.y, width, height);
    const worldR = getUnitSensorRange(unit, engine);
    const screenR = worldR * cam.zoom;

    // Viewport intersection test
    if (
      sx + screenR < 0 ||
      sx - screenR > width ||
      sy + screenR < 0 ||
      sy - screenR > height
    ) {
      continue;
    }

    culledNodesScratch.push({
      x: sx,
      y: sy,
      r: screenR,
      worldR,
      id: unit.id,
      name: unit.name,
    });
  }

  if (culledNodesScratch.length === 0) {
    return;
  }

  // Rule 2: Single Entity Sensor Rendering
  if (culledNodesScratch.length === 1) {
    const node = culledNodesScratch[0];

    ctx.save();
    // Crisp single-stroke circular boundary at R_sensor (no hazy fills/washes)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.stroke();

    // HUD Label
    ctx.fillStyle = 'rgba(0, 240, 255, 0.70)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`SENSOR HORIZON: ${Math.round(node.worldR)}km`, node.x, node.y - node.r - 6);
    ctx.restore();
    return;
  }

  // Rule 3: Multi-Lobed Fleet Sensor Union (Fleet Mode)
  // Step 4: Generate crisp perimeter outline with thin dashed cyan line (no hazy washes or fills)
  // Calculate unified radial boundary contour arcs and eliminate interior circles
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([6, 6]);

  let topY = Infinity;
  let topX = width / 2;

  for (let i = 0; i < culledNodesScratch.length; i++) {
    const ni = culledNodesScratch[i];
    const xi = ni.x;
    const yi = ni.y;
    const ri = ni.r;

    if (yi - ri < topY) {
      topY = yi - ri;
      topX = xi;
    }

    // Start with the full circle [0, 2*PI]
    intervalsScratch.length = 0;
    intervalsScratch.push(0, TWO_PI);
    let activeIntervals = intervalsScratch;
    let completelyCovered = false;

    for (let j = 0; j < culledNodesScratch.length; j++) {
      if (i === j) continue;
      const nj = culledNodesScratch[j];
      const dx = nj.x - xi;
      const dy = nj.y - yi;
      const dSq = dx * dx + dy * dy;
      const d = Math.sqrt(dSq);
      const rj = nj.r;

      // Case 1: Disjoint or touching outer edges
      if (d >= ri + rj) {
        continue;
      }

      // Case 2: Circle i is completely inside circle j (internal sensor circle)
      if (d <= rj - ri) {
        // Co-located identical circles disambiguation
        if (dSq < 0.0001 && Math.abs(ri - rj) < 0.001) {
          if (i > j) {
            completelyCovered = true;
            break;
          }
          continue;
        }
        completelyCovered = true;
        break;
      }

      // Case 3: Circle j is completely inside circle i (j doesn't occlude i's perimeter)
      if (d <= ri - rj) {
        continue;
      }

      // Case 4: Overlapping circles intersecting at two points
      const cosDelta = (ri * ri + dSq - rj * rj) / (2 * ri * d);
      const clampedCos = Math.max(-1, Math.min(1, cosDelta));
      const delta = Math.acos(clampedCos);
      const centerAngle = Math.atan2(dy, dx);

      let normCenter = centerAngle;
      while (normCenter < 0) normCenter += TWO_PI;
      while (normCenter >= TWO_PI) normCenter -= TWO_PI;

      const covStart = normCenter - delta;
      const covEnd = normCenter + delta;

      activeIntervals = subtractAngleRange(activeIntervals, covStart, covEnd);
      if (activeIntervals.length === 0) {
        completelyCovered = true;
        break;
      }
    }

    // Draw exposed perimeter boundary arcs for circle i
    if (!completelyCovered && activeIntervals.length > 0) {
      for (let k = 0; k < activeIntervals.length; k += 2) {
        const startArc = activeIntervals[k];
        const endArc = activeIntervals[k + 1];
        ctx.beginPath();
        ctx.arc(xi, yi, ri, startArc, endArc);
        ctx.stroke();
      }
    }
  }

  // Fleet Sensor Envelope HUD Label
  if (topY < Infinity && topY > 20) {
    ctx.fillStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`FLEET SENSOR ENVELOPE [${culledNodesScratch.length} HULLS]`, topX, topY - 6);
  }

  ctx.restore();
}
