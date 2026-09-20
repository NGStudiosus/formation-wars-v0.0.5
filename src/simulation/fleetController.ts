import { ShipEntity, ShipRole, Vec2D, FormationDensity, MovementCohesion, FleetGroup, FleetPdPosture, CombatStance } from '../types';
import { computeSplineTangents } from './hermite';

export const NAVAL_TIER_WEIGHTS: Record<string, number> = {
  BASTION: 100,
  HQ: 95,
  DREADNOUGHT: 90,
  BATTLESHIP: 80,
  BATTLECRUISER: 70,
  HEAVY_CRUISER: 60,
  CRUISER: 58,
  LIGHT_CRUISER: 50,
  DESTROYER: 40,
  FRIGATE: 30,
  BUILDER: 20,
  COLLIER: 18,
  TANKER: 18,
  REPAIR: 18,
  SCRAP: 18,
  MINER: 10,
};

export function getShipCollisionRadius(role?: ShipRole): number {
  switch (role) {
    case 'BASTION':
    case 'HQ':
      return 38;
    case 'DREADNOUGHT':
      return 32;
    case 'BATTLESHIP':
      return 28;
    case 'BATTLECRUISER':
      return 24;
    case 'HEAVY_CRUISER':
    case 'CRUISER':
      return 20;
    case 'LIGHT_CRUISER':
      return 18;
    case 'DESTROYER':
      return 15;
    case 'FRIGATE':
      return 12;
    case 'BUILDER':
    case 'MINER':
    default:
      return 12;
  }
}

/**
 * Automatically designates the flagship as the largest/most powerful vessel
 * in the selection using standard naval tonnage hierarchy:
 * Dreadnought (DN) > Battleship (BB) > Battlecruiser (BC) > Heavy Cruiser (CH) >
 * Light Cruiser (CL) > Destroyer (DD) > Frigate (FG) > Miner
 * Ties are broken by highest current structural hull integrity (hullHp).
 */
export function determineFlagship(ships: ShipEntity[]): ShipEntity | null {
  const operational = ships.filter((s) => s && s.hullState !== 'DESTROYED');
  if (operational.length === 0) return null;
  if (operational.length === 1) return operational[0];

  const sorted = [...operational].sort((a, b) => {
    const weightA = NAVAL_TIER_WEIGHTS[a.role] ?? 15;
    const weightB = NAVAL_TIER_WEIGHTS[b.role] ?? 15;
    if (weightB !== weightA) {
      return weightB - weightA;
    }
    // Tie break by hull integrity
    if (b.hullHp !== a.hullHp) {
      return b.hullHp - a.hullHp;
    }
    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}

/**
 * Computes concentric radial ring formation offsets relative to the flagship (0, 0).
 * Supports Tight, Close, and Loose density spacing profiles and Vanguard/Rearguard screen positioning.
 * Caches local trigonometric offsets (cos alpha_i, sin alpha_i) per ship to eliminate per-tick recalculations.
 */
export function computeFormationOffsets(
  flagship: ShipEntity,
  escorts: ShipEntity[],
  density: FormationDensity,
  screenVanguard: boolean = true,
  cmRange: number = 140.0
): Vec2D[] {
  const escortCount = escorts.length;
  if (escortCount === 0) return [];

  const rFlag = getShipCollisionRadius(flagship.role);
  let escortRadiusSum = 0;
  for (let i = 0; i < escortCount; i++) {
    escortRadiusSum += getShipCollisionRadius(escorts[i]?.role);
  }
  const avgEscortRadius = escortRadiusSum / escortCount;

  // Base ring spacing derived from density formula
  let baseSpacing = (rFlag + avgEscortRadius) * 2.0; // Default: Close
  if (density === 'TIGHT') {
    // Tight: Escort collision boundaries nearly touching
    baseSpacing = rFlag + avgEscortRadius + 20.0;
  } else if (density === 'LOOSE') {
    // Loose: Dispersed standoff spacing based on CM defensive radius (140km)
    baseSpacing = Math.max(cmRange * 0.85, (rFlag + avgEscortRadius) * 3.2);
  }

  const offsets: Vec2D[] = [];
  let escortIndex = 0;
  let ringIndex = 1;

  // Concentric ring allocation:
  // Ring 1: up to 6 escorts
  // Ring 2: up to 12 escorts
  // Ring 3: up to 18 escorts
  while (escortIndex < escortCount) {
    const ringCapacity = ringIndex * 6;
    const remainingEscorts = escortCount - escortIndex;
    const shipsInThisRing = Math.min(ringCapacity, remainingEscorts);
    const ringRadius = ringIndex * baseSpacing;

    // Angle offset: if rearguard, rotate by PI so screens reposition to the rear
    const angleRotation = screenVanguard ? 0 : Math.PI;

    for (let i = 0; i < shipsInThisRing; i++) {
      const angle = angleRotation + (i * (2 * Math.PI)) / shipsInThisRing;
      const cosAlpha = Math.cos(angle);
      const sinAlpha = Math.sin(angle);
      const offsetX = cosAlpha * ringRadius;
      const offsetY = sinAlpha * ringRadius;

      // Cache local trigonometric and polar offsets on the escort entity
      const escort = escorts[escortIndex];
      if (escort) {
        escort.formationCosAlpha = cosAlpha;
        escort.formationSinAlpha = sinAlpha;
        escort.formationRadius = ringRadius;
        escort.formationFlagshipId = flagship.id;
        escort.formationOffset = { x: offsetX, y: offsetY };
      }

      offsets.push({ x: offsetX, y: offsetY });
      escortIndex++;
    }

    ringIndex++;
  }

  return offsets;
}

/**
 * Returns station-keeping position using cached polar trigonometric offsets (cos alpha_i, sin alpha_i).
 * Eliminates Math.cos/Math.sin per-tick recalculations in high-frequency loops.
 */
export function getStationKeepingPosition(flagshipPos: Vec2D, escort: ShipEntity): Vec2D {
  if (escort.formationOffset) {
    return {
      x: flagshipPos.x + escort.formationOffset.x,
      y: flagshipPos.y + escort.formationOffset.y,
    };
  }
  if (escort.formationCosAlpha !== undefined && escort.formationRadius !== undefined) {
    return {
      x: flagshipPos.x + escort.formationCosAlpha * escort.formationRadius,
      y: flagshipPos.y + (escort.formationSinAlpha ?? 0) * escort.formationRadius,
    };
  }
  return { x: flagshipPos.x, y: flagshipPos.y };
}

/**
 * Speed Governor Optimization: Computes the fleet maximum speed clamp (v_fleet_cap = min(v_max)).
 * Calculated once when a fleet is formed or altered, caching the result to avoid per-tick recalculation.
 */
export function computeFleetSpeedCap(ships: ShipEntity[]): number {
  let minSpeed = Infinity;
  for (let i = 0, len = ships.length; i < len; i++) {
    const s = ships[i];
    if (s && s.hullState !== 'DESTROYED') {
      const spd = s.maxSpeed || 1000.0;
      if (spd < minSpeed) {
        minSpeed = spd;
      }
    }
  }
  return minSpeed === Infinity ? 100.0 : minSpeed;
}

export const getFleetSlowestSpeed = computeFleetSpeedCap;
