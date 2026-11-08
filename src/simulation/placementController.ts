import { StructureType, Vec2D, ShipEntity } from '../types';
import { SimulationEngine } from './engine';
import { STRUCTURE_CATALOG, StructureDef } from './structures';
import {
  getPlanetaryGravityWellRadius,
  getLunarGravityWellRadius,
  getClusterGravityWellRadius,
} from './solarSystem';

export interface CelestialGravityWell {
  id: string;
  name: string;
  pos: Vec2D;
  radius: number;
  wellRadius: number;
  type: 'PLANET' | 'MOON' | 'GAS_GIANT' | 'ASTEROID_CLUSTER';
  isAlliedOrCaptured: boolean;
  hostileCount: number;
}

export interface PlacementValidationResult {
  isValid: boolean;
  activeWell: CelestialGravityWell | null;
  worldPos: Vec2D;
  reason?: string;
}

/**
 * Gathers all planetary, lunar, and asteroid cluster gravity wells across the solar system,
 * computing their true gravitational boundaries and dynamic faction control status.
 */
export function getAllSystemGravityWells(engine: SimulationEngine): CelestialGravityWell[] {
  const wells: CelestialGravityWell[] = [];
  const systemsToScan: any[] = [];
  if (engine.systems && engine.systems.length > 0) {
    for (const sys of engine.systems) {
      if (sys.solarSystem) systemsToScan.push(sys.solarSystem);
    }
  } else if (engine.solarSystem) {
    systemsToScan.push(engine.solarSystem);
  }

  if (systemsToScan.length === 0) return wells;

  for (const solarSystem of systemsToScan) {
    // 1. Rocky Planets and their Moons
    for (const planet of solarSystem.rockyPlanets) {
      const pWellR = planet.wellRadius || getPlanetaryGravityWellRadius(planet);
      wells.push({
        id: planet.id,
        name: planet.name,
        pos: planet.pos,
        radius: planet.radius,
        wellRadius: pWellR,
        type: 'PLANET',
        isAlliedOrCaptured: false,
        hostileCount: 0,
      });

      if (planet.moons) {
        for (const moon of planet.moons) {
          const mWellR = getLunarGravityWellRadius(moon);
          wells.push({
            id: moon.id,
            name: moon.name,
            pos: moon.pos,
            radius: moon.radius,
            wellRadius: mWellR,
            type: 'MOON',
            isAlliedOrCaptured: false,
            hostileCount: 0,
          });
        }
      }
    }

    // 2. Gas Giants and their Moons
    for (const giant of solarSystem.gasGiants) {
      const gWellR = giant.wellRadius || getPlanetaryGravityWellRadius(giant);
      wells.push({
        id: giant.id,
        name: giant.name,
        pos: giant.pos,
        radius: giant.radius,
        wellRadius: gWellR,
        type: 'GAS_GIANT',
        isAlliedOrCaptured: false,
        hostileCount: 0,
      });

      if (giant.moons) {
        for (const moon of giant.moons) {
          const mWellR = getLunarGravityWellRadius(moon);
          wells.push({
            id: moon.id,
            name: moon.name,
            pos: moon.pos,
            radius: moon.radius,
            wellRadius: mWellR,
            type: 'MOON',
            isAlliedOrCaptured: false,
            hostileCount: 0,
          });
        }
      }
    }

    // 3. Asteroid Clusters (Tight 1.10x envelope gravity well)
    if (solarSystem.clusters) {
      for (const cluster of solarSystem.clusters) {
        const cWellR = cluster.wellRadius || getClusterGravityWellRadius(cluster);
        wells.push({
          id: cluster.id,
          name: cluster.name,
          pos: cluster.center,
          radius: cluster.radius,
          wellRadius: cWellR,
          type: 'ASTEROID_CLUSTER',
          isAlliedOrCaptured: false,
          hostileCount: 0,
        });
      }
    }
  }

  // Evaluate allied/captured status based on presence of hostile forces and friendly assets
  const operationalShips = (engine.ships || []).filter((s) => s.hullState === 'OPERATIONAL');

  for (const well of wells) {
    let hostilesInWell = 0;
    let friendliesInWell = 0;
    let hasFriendlyHQ = false;

    for (const ship of operationalShips) {
      const dx = ship.pos.x - well.pos.x;
      const dy = ship.pos.y - well.pos.y;
      if (dx * dx + dy * dy <= well.wellRadius * well.wellRadius) {
        if (ship.faction === 'HOSTILE') {
          hostilesInWell++;
        } else if (ship.faction === 'FRIENDLY') {
          friendliesInWell++;
          if (ship.role === 'HQ') {
            hasFriendlyHQ = true;
          }
        }
      }
    }

    well.hostileCount = hostilesInWell;

    // A well is allied/captured if:
    // 1. HQ is stationed inside it (Aegis-IV / Sovereign command anchor)
    // 2. Or there are ZERO operational hostile vessels inside it (cleared or unoccupied sector)
    // 3. If hostiles are present, it is considered contested / uncaptured
    if (hasFriendlyHQ) {
      well.isAlliedOrCaptured = true;
    } else if (hostilesInWell === 0) {
      well.isAlliedOrCaptured = true;
    } else {
      well.isAlliedOrCaptured = false;
    }
  }

  return wells;
}

/**
 * Evaluates whether a world coordinate (W_x, W_y) falls within an allied/captured gravity well.
 * Formula: distSq(W_x, W_y, well_i.x, well_i.y) <= R_well_i^2
 */
export function validatePlacementCoordinates(
  worldPos: Vec2D,
  engine: SimulationEngine
): PlacementValidationResult {
  const wells = getAllSystemGravityWells(engine);

  // Check intersection against all system gravity wells
  let candidateWell: CelestialGravityWell | null = null;
  let minDistance = Infinity;

  for (const well of wells) {
    const dx = worldPos.x - well.pos.x;
    const dy = worldPos.y - well.pos.y;
    const distSq = dx * dx + dy * dy;
    const wellRadiusSq = well.wellRadius * well.wellRadius;

    if (distSq <= wellRadiusSq) {
      const d = Math.sqrt(distSq);
      if (d < minDistance) {
        minDistance = d;
        candidateWell = well;
      }
    }
  }

  if (!candidateWell) {
    return {
      isValid: false,
      activeWell: null,
      worldPos,
      reason: 'Deep Space: Scaffolds must be anchored inside an allied planetary, lunar, or asteroid gravity well!',
    };
  }

  if (!candidateWell.isAlliedOrCaptured) {
    const operationalShips = (engine.ships || []).filter((s) => s.hullState === 'OPERATIONAL');
    const detectedHostiles = operationalShips.filter((s) => {
      if (s.faction !== 'HOSTILE' || !s.visibilityTier || s.visibilityTier === 'NONE' || s.visibilityState === 'HIDDEN') return false;
      const dx = s.pos.x - candidateWell!.pos.x;
      const dy = s.pos.y - candidateWell!.pos.y;
      return dx * dx + dy * dy <= candidateWell!.wellRadius * candidateWell!.wellRadius;
    }).length;

    const reason = detectedHostiles > 0
      ? `Contested Sector: [${candidateWell.name}] is occupied by hostile forces (${detectedHostiles} contacts detected)! Clear garrison first.`
      : `Unsecured Sector: [${candidateWell.name}] has not been secured or surveyed by allied forces. Scout and clear the gravity well first.`;

    return {
      isValid: false,
      activeWell: candidateWell,
      worldPos,
      reason,
    };
  }

  return {
    isValid: true,
    activeWell: candidateWell,
    worldPos,
  };
}

/**
 * Global Placement Controller managing active blueprint selection, ghost cursor state,
 * and decoupling placement range from HQ spatial radius.
 */
class PlacementController {
  private activeBlueprint: StructureDef | null = null;

  public setActiveBlueprint(blueprint: StructureDef | StructureType | null): void {
    if (!blueprint) {
      this.activeBlueprint = null;
      return;
    }
    if (typeof blueprint === 'string') {
      this.activeBlueprint = STRUCTURE_CATALOG[blueprint] || null;
    } else {
      this.activeBlueprint = blueprint;
    }
  }

  public getActiveBlueprint(): StructureDef | null {
    return this.activeBlueprint;
  }

  public clear(): void {
    this.activeBlueprint = null;
  }

  public validate(worldPos: Vec2D, engine: SimulationEngine): PlacementValidationResult {
    return validatePlacementCoordinates(worldPos, engine);
  }

  public getAllWells(engine: SimulationEngine): CelestialGravityWell[] {
    return getAllSystemGravityWells(engine);
  }
}

export const placementController = new PlacementController();
