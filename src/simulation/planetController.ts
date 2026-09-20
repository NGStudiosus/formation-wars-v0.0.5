import { RockyPlanet, GasGiant, Vec2D } from '../types';
import { SimulationEngine } from './engine';
import {
  PlanetClass,
  ColonizationValidation,
  validateColonization,
  establishPlanetaryGovernance,
  getPlanetClass,
  PLANET_COLONIZATION_TECHS,
} from './colonizationManager';
import {
  BASE_ORBITAL_BUFFER_1_0G,
  BASE_GRAVITY_WELL_RADIUS_1_0G,
  FIXED_ASTEROID_CLUSTER_WELL_RADIUS,
  SURFACE_EXCLUSION_ZONE_KM,
  TERRAN_GRAVITY_CLAMP,
  TERRAN_GRAVITY_MIN,
  TERRAN_GRAVITY_MAX,
  TERRAN_ORBITAL_BUFFER_MIN,
  TERRAN_ORBITAL_BUFFER_BASELINE,
  TERRAN_ORBITAL_BUFFER_MAX,
  TERRAN_WELL_RADIUS_MIN,
  TERRAN_WELL_RADIUS_BASELINE,
  TERRAN_WELL_RADIUS_MAX,
  calculateDynamicGravityWellRadius,
  calculateDynamicGravityWellRadiusSq,
  clampTerranGravity,
} from './celestialTypes';

export type { PlanetClass, ColonizationValidation };
export {
  validateColonization,
  establishPlanetaryGovernance,
  getPlanetClass,
  PLANET_COLONIZATION_TECHS,
  BASE_ORBITAL_BUFFER_1_0G,
  BASE_GRAVITY_WELL_RADIUS_1_0G,
  FIXED_ASTEROID_CLUSTER_WELL_RADIUS,
  SURFACE_EXCLUSION_ZONE_KM,
  TERRAN_GRAVITY_CLAMP,
  TERRAN_GRAVITY_MIN,
  TERRAN_GRAVITY_MAX,
  TERRAN_ORBITAL_BUFFER_MIN,
  TERRAN_ORBITAL_BUFFER_BASELINE,
  TERRAN_ORBITAL_BUFFER_MAX,
  TERRAN_WELL_RADIUS_MIN,
  TERRAN_WELL_RADIUS_BASELINE,
  TERRAN_WELL_RADIUS_MAX,
  calculateDynamicGravityWellRadius,
  calculateDynamicGravityWellRadiusSq,
  clampTerranGravity,
};

/**
 * Standardized surface-offset planetary gravity well calculation:
 * R_well = R_body + (D_orbit_1.0G * G) = R_body + (2,500 km * G)
 * Asteroid clusters are exempt and retain fixed 1,800 km capture zone from center.
 */
export function getPlanetaryGravityWellRadius(
  bodyOrRating:
    | number
    | {
        radius?: number;
        gravityRating?: number;
        isAsteroidCluster?: boolean;
        planetClass?: string;
        planetType?: string;
        wellRadius?: number;
        type?: string;
      },
  bodyRadiusFallback: number = 0
): number {
  return calculateDynamicGravityWellRadius(bodyOrRating, bodyRadiusFallback);
}

export function getPlanetaryGravityWellRadiusSq(
  bodyOrRating:
    | number
    | {
        radius?: number;
        gravityRating?: number;
        isAsteroidCluster?: boolean;
        planetClass?: string;
        planetType?: string;
        wellRadius?: number;
        type?: string;
      },
  bodyRadiusFallback: number = 0
): number {
  return calculateDynamicGravityWellRadiusSq(bodyOrRating, bodyRadiusFallback);
}

export function isInsidePlanetaryGravityWell(
  pos: Vec2D,
  planet: {
    pos: Vec2D;
    radius?: number;
    gravityRating?: number;
    planetClass?: string;
    planetType?: string;
    isAsteroidCluster?: boolean;
    wellRadius?: number;
    type?: string;
  }
): boolean {
  const dx = pos.x - planet.pos.x;
  const dy = pos.y - planet.pos.y;
  const distSq = dx * dx + dy * dy;
  const wellRadiusSq = calculateDynamicGravityWellRadiusSq(planet);
  return distSq <= wellRadiusSq;
}

export class PlanetController {
  private selectedPlanetId: string | null = null;

  public getSelectedPlanet(engine: SimulationEngine): RockyPlanet | GasGiant | null {
    if (!this.selectedPlanetId) return null;
    const rocky = engine.solarSystem.rockyPlanets.find((p) => p.id === this.selectedPlanetId);
    if (rocky) return rocky;
    const gas = engine.solarSystem.gasGiants.find((g) => g.id === this.selectedPlanetId);
    return gas || null;
  }

  public selectPlanet(planetId: string | null): void {
    this.selectedPlanetId = planetId;
  }

  public getValidation(planet: RockyPlanet | GasGiant, engine: SimulationEngine): ColonizationValidation {
    return validateColonization(planet, engine.researchManager.completedNodes);
  }

  public colonize(planetId: string, engine: SimulationEngine): { success: boolean; message: string } {
    return establishPlanetaryGovernance(planetId, engine);
  }

  public getGravityWellRadius(
    planet: RockyPlanet | GasGiant | { radius?: number; gravityRating?: number; isAsteroidCluster?: boolean; wellRadius?: number }
  ): number {
    return calculateDynamicGravityWellRadius(planet);
  }

  public getGravityWellRadiusSq(
    planet: RockyPlanet | GasGiant | { radius?: number; gravityRating?: number; isAsteroidCluster?: boolean; wellRadius?: number }
  ): number {
    return calculateDynamicGravityWellRadiusSq(planet);
  }

  public isPositionInGravityWell(
    pos: Vec2D,
    planet: RockyPlanet | GasGiant | { pos: Vec2D; radius?: number; gravityRating?: number; isAsteroidCluster?: boolean; wellRadius?: number }
  ): boolean {
    return isInsidePlanetaryGravityWell(pos, planet);
  }

  public getSurfaceExclusionZone(
    planet: { radius?: number; isAsteroidCluster?: boolean; type?: string }
  ): number {
    const isCluster = planet.isAsteroidCluster === true || planet.type === 'ASTEROID_CLUSTER';
    return isCluster ? 0 : (planet.radius ? planet.radius + SURFACE_EXCLUSION_ZONE_KM : 0);
  }

  public isValidMooringPosition(
    pos: Vec2D,
    planet: { pos: Vec2D; radius?: number; gravityRating?: number; isAsteroidCluster?: boolean; type?: string }
  ): { isValid: boolean; dist: number; surfaceExclusion: number; wellRadius: number; reason?: string } {
    const dx = pos.x - planet.pos.x;
    const dy = pos.y - planet.pos.y;
    const dist = Math.hypot(dx, dy);
    const wellRadius = calculateDynamicGravityWellRadius(planet);
    const isCluster = planet.isAsteroidCluster === true || planet.type === 'ASTEROID_CLUSTER';
    const surfaceExclusion = isCluster ? 0 : (planet.radius ? planet.radius + SURFACE_EXCLUSION_ZONE_KM : 0);

    if (surfaceExclusion > 0 && dist <= surfaceExclusion) {
      return {
        isValid: false,
        dist,
        surfaceExclusion,
        wellRadius,
        reason: `Inside surface exclusion zone (${Math.round(surfaceExclusion)} km)`,
      };
    }
    if (dist > wellRadius) {
      return {
        isValid: false,
        dist,
        surfaceExclusion,
        wellRadius,
        reason: `Outside outer gravity well (${Math.round(wellRadius)} km)`,
      };
    }

    return { isValid: true, dist, surfaceExclusion, wellRadius };
  }
}

export const planetController = new PlanetController();

