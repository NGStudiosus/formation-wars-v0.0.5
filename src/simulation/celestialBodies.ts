/**
 * Celestial Bodies Module
 * Mathematical definitions, gravity well envelopes, and orbital parameters
 * under the K_SCALE = 4.5 macro spatial expansion.
 */

import { Vec2D, RockyPlanet, GasGiant, MoonEntity, AsteroidCluster } from '../types';
import { K_SCALE, CELESTIAL_SCALE, GRAVITY_WELL_RATIOS, HQ_PROPORTIONS } from './systemConstants';
import {
  BASE_GRAVITY_WELL_RADIUS_1_0G,
  FIXED_ASTEROID_CLUSTER_WELL_RADIUS,
  calculateDynamicGravityWellRadius,
} from './celestialTypes';

/**
 * Calculates planetary gravity well radius dynamically:
 * R_well = 3,000 km * G.
 */
export function calculatePlanetaryGravityWellRadius(
  bodyOrRating: number | { gravityRating?: number; isAsteroidCluster?: boolean; planetClass?: string; wellRadius?: number }
): number {
  return calculateDynamicGravityWellRadius(bodyOrRating);
}

/**
 * Calculates lunar gravity well radius dynamically based on G rating:
 * R_well = 3,000 km * G.
 */
export function calculateLunarGravityWellRadius(
  bodyOrRating: number | { gravityRating?: number; isAsteroidCluster?: boolean; wellRadius?: number }
): number {
  return calculateDynamicGravityWellRadius(bodyOrRating);
}

/**
 * Calculates asteroid cluster gravity well radius:
 * Fixed 1,800 km capture zone (exempt from surface gravity scaling).
 */
export function calculateClusterGravityWellRadius(_envelopeRadius?: number): number {
  return FIXED_ASTEROID_CLUSTER_WELL_RADIUS;
}

/**
 * Calculates the exact HQ Citadel radius for a host planet.
 * Guaranteed to sit between 18% and 22% of host planet visual radius (default 20%).
 */
export function calculateHQRadiusForPlanet(planetRadius: number): number {
  return Math.round(planetRadius * HQ_PROPORTIONS.planetRadiusRatio);
}

/**
 * Recomputes the upper-right shoulder mooring vector at theta = -45 degrees (-PI/4):
 * D_anchor = R_planet + (R_HQ * 0.75) + standoffOffset
 * X_HQ = X_planet + D_anchor * cos(theta)
 * Y_HQ = Y_planet + D_anchor * sin(theta)
 */
export function calculateHQAnchorCoordinates(
  planetPos: Vec2D,
  planetRadius: number,
  hqRadius?: number,
  standoffOffset: number = HQ_PROPORTIONS.standoffOffset
): Vec2D {
  const actualHqRadius = hqRadius ?? calculateHQRadiusForPlanet(planetRadius);
  const anchorDistance = planetRadius + actualHqRadius * HQ_PROPORTIONS.hqRadiusFactorInAnchor + standoffOffset;
  return {
    x: planetPos.x + Math.cos(HQ_PROPORTIONS.anchorAngle) * anchorDistance,
    y: planetPos.y + Math.sin(HQ_PROPORTIONS.anchorAngle) * anchorDistance,
  };
}

/**
 * Returns the offset vector from planet center to HQ shoulder position.
 */
export function calculateHQOffsetVector(
  planetRadius: number,
  hqRadius?: number,
  standoffOffset: number = HQ_PROPORTIONS.standoffOffset
): Vec2D {
  const actualHqRadius = hqRadius ?? calculateHQRadiusForPlanet(planetRadius);
  const anchorDistance = planetRadius + actualHqRadius * HQ_PROPORTIONS.hqRadiusFactorInAnchor + standoffOffset;
  return {
    x: Math.cos(HQ_PROPORTIONS.anchorAngle) * anchorDistance,
    y: Math.sin(HQ_PROPORTIONS.anchorAngle) * anchorDistance,
  };
}
