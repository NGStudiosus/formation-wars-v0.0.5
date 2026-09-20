import { ShipEntity, Vec2D } from '../types';
import { getShipHullSpec } from './shipPrototypes';

export interface WorldBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Evaluates single-click raycasting against explicit entity selection radii.
 * To guarantee that Frigates (selection radius 10px) remain immediately clickable
 * at standard zoom levels without requiring aggressive zoom-in, a generous minimum
 * screen click cushion (default 24px) is converted to world coordinates.
 */
export function raycastSelectShip(
  worldMouse: Vec2D,
  candidates: ShipEntity[],
  cameraZoom: number,
  options?: {
    minScreenTolerancePx?: number;
    filterHostileFog?: (ship: ShipEntity) => boolean;
  }
): ShipEntity | null {
  const minScreenPx = options?.minScreenTolerancePx ?? 24;
  const minWorldTolerance = minScreenPx / Math.max(0.01, cameraZoom);

  let bestCandidate: ShipEntity | null = null;
  let bestDistanceSq = Infinity;

  for (const ship of candidates) {
    if (!ship || ship.hullState === 'DESTROYED') continue;

    // Filter out targets completely hidden in fog of war if requested
    if (options?.filterHostileFog && options.filterHostileFog(ship)) {
      continue;
    }

    const spec = getShipHullSpec(ship);
    const explicitRadius = ship.selectionRadius ?? spec.selectionRadiusPx;

    // Effective hit radius in world units: explicit selection radius plus generous screen-space tolerance
    const effectiveRadius = Math.max(explicitRadius, minWorldTolerance);
    const effectiveRadiusSq = effectiveRadius * effectiveRadius;

    const dx = ship.pos.x - worldMouse.x;
    const dy = ship.pos.y - worldMouse.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= effectiveRadiusSq && distSq < bestDistanceSq) {
      bestDistanceSq = distSq;
      bestCandidate = ship;
    }
  }

  return bestCandidate;
}

/**
 * Evaluates multi-unit marquee selection against explicit entity selection bounding circles.
 * A ship is selected if its position +/- selection radius overlaps the marquee box.
 */
export function marqueeSelectShips(
  worldBox: WorldBoundingBox,
  candidates: ShipEntity[],
  cameraZoom: number,
  options?: {
    friendlyOnly?: boolean;
    filterHostileFog?: (ship: ShipEntity) => boolean;
  }
): ShipEntity[] {
  const selected: ShipEntity[] = [];
  const normalizedBox: WorldBoundingBox = {
    minX: Math.min(worldBox.minX, worldBox.maxX),
    minY: Math.min(worldBox.minY, worldBox.maxY),
    maxX: Math.max(worldBox.minX, worldBox.maxX),
    maxY: Math.max(worldBox.minY, worldBox.maxY),
  };

  // Prevent degenerate tiny accidental marquee drags (< 5px world span)
  const width = normalizedBox.maxX - normalizedBox.minX;
  const height = normalizedBox.maxY - normalizedBox.minY;
  if (width < 3 && height < 3) {
    return [];
  }

  for (const ship of candidates) {
    if (!ship || ship.hullState === 'DESTROYED') continue;

    if (options?.friendlyOnly && ship.faction !== 'FRIENDLY') {
      continue;
    }

    if (options?.filterHostileFog && options.filterHostileFog(ship)) {
      continue;
    }

    const spec = getShipHullSpec(ship);
    const radius = ship.selectionRadius ?? spec.selectionRadiusPx;

    // Evaluate overlap: ship circle intersects box
    const overlaps =
      ship.pos.x + radius >= normalizedBox.minX &&
      ship.pos.x - radius <= normalizedBox.maxX &&
      ship.pos.y + radius >= normalizedBox.minY &&
      ship.pos.y - radius <= normalizedBox.maxY;

    if (overlaps) {
      selected.push(ship);
    }
  }

  return selected;
}
