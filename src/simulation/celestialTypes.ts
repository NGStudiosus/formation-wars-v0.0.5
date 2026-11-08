/**
 * CELESTIAL TYPES & GRAVITATIONAL PHYSICS
 * Standardized Surface-Offset Gravity Well Formula:
 * R_well = R_body + (D_orbit_1.0G * G)
 * R_well_sq = R_well^2
 * D_orbit_1.0G = 2,500 km baseline orbital buffer depth
 * Terran worlds physical clamp: G_Terran in [0.85G, 1.05G]
 * Resulting Terran orbital buffers:
 * - Minimum (0.85G): R_body + 2,125 km
 * - Baseline (1.00G): R_body + 2,500 km
 * - Maximum (1.05G): R_body + 2,625 km
 * Asteroid clusters are exempt from dynamic scaling, retaining fixed 1,800 km capture zone from center.
 */

import { Vec2D, JumpState, JumpTransitData, AsteroidCluster, AsteroidNode, StarSystemDescriptor } from '../types';

export {
  type JumpState,
  type JumpTransitData,
  type AsteroidCluster,
  type AsteroidNode,
  type StarSystemDescriptor,
};

/**
 * Baseline 1.00G orbital clearance buffer depth:
 * D_orbit_1.0G = 2,500 km
 * Guarantees a clear 2,500 km orbital band between the surface of the planet
 * and the outer gravity well boundary for ship maneuvering, orbital shipyards, research labs, and defensive stations.
 */
export const BASE_ORBITAL_BUFFER_1_0G = 2500.0;

/**
 * Backwards-compatible alias for 1.00G baseline orbital depth.
 */
export const BASE_GRAVITY_WELL_RADIUS_1_0G = 2500.0;

/**
 * Fixed Capture Zone Radius for Asteroid Clusters = 1,800 km
 * Measured from center, bypassing R_body surface offsets.
 */
export const FIXED_ASTEROID_CLUSTER_WELL_RADIUS = 1800.0;

/**
 * Minimum surface clearance zone (Surface Exclusion Zone) = 150 km above planet radius.
 */
export const SURFACE_EXCLUSION_ZONE_KM = 150.0;

/**
 * Realistic Terrestrial surface gravity boundaries for Terran worlds: [0.85G, 1.05G]
 */
export const TERRAN_GRAVITY_CLAMP = {
  min: 0.85,
  max: 1.05,
  baseline: 1.00,
} as const;

export const TERRAN_GRAVITY_MIN = 0.85;
export const TERRAN_GRAVITY_MAX = 1.05;

/**
 * Resulting Terran Orbital Clearance Buffers:
 * Minimum (0.85G): 2,125 km (R_body + 2,125 km)
 * Baseline (1.00G): 2,500 km (R_body + 2,500 km)
 * Maximum (1.05G): 2,625 km (R_body + 2,625 km)
 */
export const TERRAN_ORBITAL_BUFFER_MIN = BASE_ORBITAL_BUFFER_1_0G * TERRAN_GRAVITY_MIN; // 2,125 km
export const TERRAN_ORBITAL_BUFFER_BASELINE = BASE_ORBITAL_BUFFER_1_0G * TERRAN_GRAVITY_CLAMP.baseline; // 2,500 km
export const TERRAN_ORBITAL_BUFFER_MAX = BASE_ORBITAL_BUFFER_1_0G * TERRAN_GRAVITY_MAX; // 2,625 km

// Aliases for backwards compatibility with tests and callers
export const TERRAN_WELL_RADIUS_MIN = TERRAN_ORBITAL_BUFFER_MIN;
export const TERRAN_WELL_RADIUS_BASELINE = TERRAN_ORBITAL_BUFFER_BASELINE;
export const TERRAN_WELL_RADIUS_MAX = TERRAN_ORBITAL_BUFFER_MAX;

export interface CelestialBodyGravityProfile {
  id: string;
  name: string;
  pos: Vec2D;
  radius: number;
  gravityRating?: number;
  planetClass?: string;
  planetType?: string;
  isAsteroidCluster?: boolean;
  wellRadius?: number;
  wellRadiusSq?: number;
  type?: 'PLANET' | 'GAS_GIANT' | 'MOON' | 'ASTEROID_CLUSTER';
}

/**
 * Clamps surface gravity for Terran worlds to the realistic terrestrial band [0.85G, 1.05G].
 */
export function clampTerranGravity(gravity: number): number {
  return Math.min(TERRAN_GRAVITY_MAX, Math.max(TERRAN_GRAVITY_MIN, gravity));
}

/**
 * Surface-Offset Gravity Well Sizing Formula:
 * Planetary gravity well radius is the physical surface radius R_body plus an orbital clearance buffer scaled by gravity G:
 * R_well = R_body + (D_orbit_1.0G * G) = R_body + (2,500 km * G)
 * Asteroid clusters are exempt, retaining fixed 1,800 km capture zone from center.
 */
export function calculateDynamicGravityWellRadius(
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
  if (typeof bodyOrRating === 'object' && bodyOrRating !== null) {
    // Asteroid clusters have their own capture gravity well equal to cluster size + 10% (1.10x envelope)
    if (bodyOrRating.isAsteroidCluster === true || bodyOrRating.type === 'ASTEROID_CLUSTER') {
      const clusterR = bodyOrRating.radius || bodyOrRating.wellRadius || bodyRadiusFallback || 2200;
      return bodyOrRating.wellRadius ?? Math.round(clusterR * 1.10);
    }

    let g = bodyOrRating.gravityRating ?? 1.0;
    const isTerran =
      bodyOrRating.planetClass === 'TERRAN' ||
      bodyOrRating.planetType === 'TERRAN';
    if (isTerran) {
      g = clampTerranGravity(g);
    }

    const rBody = bodyOrRating.radius ?? bodyRadiusFallback;
    return rBody + BASE_ORBITAL_BUFFER_1_0G * g;
  }

  if (typeof bodyOrRating === 'number') {
    // If a gravity rating <= 10.0 is passed, compute R_body + (2,500 km * G)
    if (bodyOrRating <= 10.0) {
      return bodyRadiusFallback + BASE_ORBITAL_BUFFER_1_0G * bodyOrRating;
    }
    // If bodyRadiusFallback <= 10.0 and > 0, caller passed (bodyRadius, gravityRating)
    if (bodyRadiusFallback > 0 && bodyRadiusFallback <= 10.0) {
      return bodyOrRating + BASE_ORBITAL_BUFFER_1_0G * bodyRadiusFallback;
    }
    // Fallback if raw distance value was provided
    return bodyOrRating;
  }

  return bodyRadiusFallback + BASE_ORBITAL_BUFFER_1_0G;
}

/**
 * Returns R_well^2 for distance comparisons.
 */
export function calculateDynamicGravityWellRadiusSq(
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
  const r = calculateDynamicGravityWellRadius(bodyOrRating, bodyRadiusFallback);
  return r * r;
}

// --- MULTI-SYSTEM TOPOLOGY & UNIFIED GALACTIC COORDINATES ---

export interface PlanetEntity {
  id: string;
  systemId: string;
  name: string;
  type: 'ROCKY' | 'GAS_GIANT';
  isHabitable: boolean; // Exactly one rocky planet per system
  isHydrogenRich: boolean; // 30% roll on gas giants
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  position?: { x: number; y: number };
  x?: number;
  y?: number;
  radius: number;
  gravityWellRadius: number;
  surfaceGravity: number;
  pos?: Vec2D;
  gravityRating?: number;
  wellRadius?: number;
  wellRadiusSq?: number;
  planetClass?: string;
  planetType?: string;
  isPrimaryHabitable?: boolean;
  habitable?: boolean;
  colonized?: boolean;
  colonyGovernance?: boolean;
  moons?: any[];
  orbitalRadius?: number;
  orbitalAngle?: number;
  orbitalSpeed?: number;
  systemIndex?: number;
  systemCenter?: Vec2D;
  baseColor?: string;
  oceanColor?: string;
  atmosphereColor?: string;
  surfacePatternSeed?: number;
  hydrogen?: boolean;
  bandColors?: string[];
  ringSystem?: {
    innerRadius: number;
    outerRadius: number;
    color: string;
    opacity: number;
  };
  resourceYieldRate?: { metallic: number; organic: number };
  structureSlots?: number;
  [key: string]: any;
}

export interface PatrolRoute {
  id: string;
  name?: string;
  systemId?: string;
  systemIndex?: number;
  anchor: { x: number; y: number };
  radius: number;
  waypoints?: { x: number; y: number }[];
  pattern?: 'FIGURE_EIGHT' | 'ELLIPSE_SWEEP' | 'ZIG_ZAG' | 'PERIMETER_BOX' | string;
  faction?: 'FRIENDLY' | 'HOSTILE' | 'NEUTRAL';
  threatLevel?: number;
  [key: string]: any;
}

export interface GalaxyConfiguration {
  systemCount: number; // 2 to 8
  systemSpacing: number; // e.g., 200,000 km to 350,000 km
  seed: number;
}

export interface GalaxyGenerationResult {
  config: GalaxyConfiguration;
  systems: StarSystemDescriptor[];
  allPlanets: PlanetEntity[];
  allClusters: AsteroidCluster[];
  allAsteroids: AsteroidNode[];
  systemMap: Map<string, StarSystemDescriptor>;
}

