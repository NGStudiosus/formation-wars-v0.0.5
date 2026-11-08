import {
  CentralStar,
  RockyPlanet,
  GasGiant,
  CometEntity,
  SolarSystem,
  AsteroidEntity,
  AsteroidTier,
  AsteroidCluster,
  AsteroidNode,
  StarSystemDescriptor,
  PlanetEntity,
  GalaxyConfiguration,
  MoonEntity,
  Vec2D,
  HomeworldTypeId,
  FactionId,
} from '../types';
import {
  HOMEWORLD_REGISTRY,
  getDefaultHomeworldForFaction,
} from './hqRegistry';
import { createAsteroid, generateAsteroidFacets } from './asteroids';
import {
  K_SCALE,
  CELESTIAL_SCALE,
  GRAVITY_WELL_RATIOS,
  HQ_PROPORTIONS,
} from './systemConstants';
import {
  calculatePlanetaryGravityWellRadius,
  calculateLunarGravityWellRadius,
  calculateClusterGravityWellRadius,
  calculateHQRadiusForPlanet,
} from './celestialBodies';
import {
  BASE_ORBITAL_BUFFER_1_0G,
  BASE_GRAVITY_WELL_RADIUS_1_0G,
  FIXED_ASTEROID_CLUSTER_WELL_RADIUS,
  SURFACE_EXCLUSION_ZONE_KM,
  TERRAN_GRAVITY_CLAMP,
  TERRAN_GRAVITY_MIN,
  TERRAN_GRAVITY_MAX,
  calculateDynamicGravityWellRadius,
  calculateDynamicGravityWellRadiusSq,
  clampTerranGravity,
} from './celestialTypes';

/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% deterministic solar system generation for any given seed.
 */
export class SeededRNG {
  private s: number;

  constructor(seed: number = 1337) {
    this.s = Math.floor(Math.abs(seed)) >>> 0;
    if (this.s === 0) this.s = 1337;
  }

  public next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public choice<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }
}

// Procedural Astronomical Name Catalogs
const STAR_NAMES = ['Helios-Prime', 'Solaris-Alpha', 'Kepler-452', 'Epsilon-Eridani', 'Vega-Prime', 'Astraea-01'];
const ROCKY_NAMES = ['Aegis-IV', 'Terrene', 'Caelum', 'Verdant-Prime', 'Valles-Major', 'Oasis-Prime', 'Kore-VII', 'Rust-V'];
const GAS_GIANT_NAMES = ['Chronos', 'Titanus', 'Leviathan-IX', 'Boreas', 'Tethys-Prime', 'Aether-Major'];
const COMET_NAMES = ['Comet C/2026-X1 (Prometheus)', 'Comet 67P/Icarus', 'Comet Encke-Novus', 'Comet Hyakutake-II'];
const MOON_NAMES = ['Selene', 'Phobos-Major', 'Deimos-Beta', 'Callisto', 'Titan', 'Europa', 'Io', 'Ganymede', 'Enceladus', 'Triton'];

/**
 * Solve Kepler's Equation M = E - e*sin(E) for Eccentric Anomaly E using Newton-Raphson
 */
export function solveKeplerEquation(M: number, e: number, tolerance: number = 1e-6): number {
  let E = M;
  for (let i = 0; i < 6; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

/**
 * Granular orbital movement toggles:
 * - planetsMoons: false (frozen: planets, moons, primary star bodies remain in static locked state)
 * - asteroidBeltClusters: true (restored: dynamic orbital revolution enabled)
 * - comets: true (restored: high-eccentricity orbital progression enabled)
 */
export const ORBITAL_CONFIG = {
  planetsMoons: false,      // REMAIN FROZEN: Do not progress planet/moon coordinates
  asteroidBeltClusters: true, // RESTORED: Dynamic orbital revolution enabled
  comets: true               // RESTORED: High-eccentricity orbital progression enabled
};

// Backward-compatibility alias
export const ENABLE_ORBITAL_REVOLUTION = ORBITAL_CONFIG.planetsMoons;

/**
 * Headquarters (HQ Citadel) Prototype & Dimensional Configuration
 * Normalized physical dimension locked to 18%-22% of host planet's visual radius (target 20%):
 * - Baseline radius: R_HQ = R_planet * 0.20 (90.0px for ~450px Aegis-IV)
 * - Docking radius: R_dock = 170.0px (~1.85 * R_HQ)
 */
export const HQ_CONFIG = {
  baseRadius: 45.0,
  radius: 90.0,
  baseDockingRadius: 85.0,
  dockingRadius: 170.0,
  missileTubes: 20,
  refineryRate: 30.0,
  standoffOffset: 18.0,
};

/**
 * Headquarters (HQ Citadel) Planetary Anchor Offset Mathematics:
 * Docks the HQ directly into the close upper-right shoulder (-45 deg) of Aegis-IV:
 * theta_anchor = -PI / 4 (-45 deg)
 * D_anchor = R_planet + (R_HQ * 0.75) + standoffOffset
 * X_HQ = X_planet + D_anchor * cos(theta_anchor)
 * Y_HQ = Y_planet + D_anchor * sin(theta_anchor)
 * Leaves over 75% of the host gravity well wide open for forward bastions, shipyards, and outposts.
 */
export function calculateHQAnchorOffset(
  planetRadius: number,
  hqStationRadius?: number,
  standoffOffset: number = HQ_CONFIG.standoffOffset
): Vec2D {
  const actualHqRadius = hqStationRadius ?? calculateHQRadiusForPlanet(planetRadius);
  const anchorAngle = -Math.PI / 4; // -45 deg upper-right shoulder
  // Ensure anchorDistance sits beyond the surface exclusion zone (R_body + 150 km)
  const minClearanceDistance = planetRadius + SURFACE_EXCLUSION_ZONE_KM + 15.0;
  const calculatedDistance = planetRadius + actualHqRadius * 0.75 + standoffOffset;
  const anchorDistance = Math.max(minClearanceDistance, calculatedDistance);
  return {
    x: Math.cos(anchorAngle) * anchorDistance,
    y: Math.sin(anchorAngle) * anchorDistance,
  };
}

export function calculateHQSpawnPosition(
  planetPos: Vec2D,
  planetRadiusOrWell: number,
  hqRadius?: number
): Vec2D {
  // If a well radius (> 1200) was passed by legacy callers, convert back to planet radius
  const planetRadius = planetRadiusOrWell > 1200 ? planetRadiusOrWell / 6.0 : planetRadiusOrWell;
  const actualHqRadius = hqRadius ?? calculateHQRadiusForPlanet(planetRadius);
  const offset = calculateHQAnchorOffset(planetRadius, actualHqRadius);
  return {
    x: planetPos.x + offset.x,
    y: planetPos.y + offset.y,
  };
}

/**
 * GRAVITY WELL RADIUS CONFIGURATION & CALCULATION HELPERS
 * Surface-Offset Formula: R_well = R_body + (2,500 km * G)
 * Asteroid Clusters: Fixed 1,800 km capture zone from center (exempt from surface scaling)
 */
export const GRAVITY_WELL_CONFIG = {
  baseline1G: BASE_GRAVITY_WELL_RADIUS_1_0G,
  baselineBuffer1G: BASE_ORBITAL_BUFFER_1_0G,
  fixedAsteroidCluster: FIXED_ASTEROID_CLUSTER_WELL_RADIUS,
  surfaceExclusionZoneKm: SURFACE_EXCLUSION_ZONE_KM,
  planetaryMultiplier: 6.0,
  lunarMultiplier: 3.0,
  clusterMultiplier: 1.10,
};

export const BASE_RADIUS_PER_CLUSTER_NODE = 70.0 * K_SCALE; // 315.0px spread factor per cluster node

export function getPlanetaryGravityWellRadius(
  bodyOrRating:
    | number
    | {
        gravityRating?: number;
        isAsteroidCluster?: boolean;
        planetClass?: string;
        planetType?: string;
        wellRadius?: number;
        radius?: number;
        type?: string;
      },
  bodyRadiusFallback: number = 0
): number {
  return calculateDynamicGravityWellRadius(bodyOrRating, bodyRadiusFallback);
}

export function getLunarGravityWellRadius(
  bodyOrRating:
    | number
    | {
        gravityRating?: number;
        isAsteroidCluster?: boolean;
        wellRadius?: number;
        radius?: number;
      },
  bodyRadiusFallback: number = 0
): number {
  return calculateDynamicGravityWellRadius(bodyOrRating, bodyRadiusFallback);
}

export function getClusterGravityWellRadius(
  clusterOrRadius?: AsteroidCluster | number,
  _memberCount?: number
): number {
  if (typeof clusterOrRadius === 'object' && clusterOrRadius !== null) {
    const r = clusterOrRadius.radius || clusterOrRadius.wellRadius || 2200;
    return Math.round(r * 1.10);
  }
  if (typeof clusterOrRadius === 'number' && clusterOrRadius > 0) {
    return Math.round(clusterOrRadius * 1.10);
  }
  return Math.round(2200 * 1.10);
}

/**
 * Updates a comet's physical kinematics on an eccentric elliptical orbit around origin [0,0]
 */
export function stepCometKinematics(comet: CometEntity, dt: number): void {
  if (!ORBITAL_CONFIG.comets && dt > 0) {
    // Keep comets anchored if toggle is disabled
    return;
  }

  // Mean motion n = 2*PI / T
  const meanMotion = (Math.PI * 2) / comet.orbitalPeriod;
  comet.meanAnomaly = (comet.meanAnomaly + meanMotion * dt) % (Math.PI * 2);

  // Solve eccentric anomaly
  const E = solveKeplerEquation(comet.meanAnomaly, comet.eccentricity);

  // Orbital plane position where focal star is at origin (0, 0):
  // For focus at origin: x_orb = a*(cos(E) - e), y_orb = a*sqrt(1 - e^2)*sin(E)
  const a = comet.semiMajorAxis;
  const e = comet.eccentricity;
  const b = a * Math.sqrt(Math.max(0.001, 1 - e * e));

  const xOrb = a * (Math.cos(E) - e);
  const yOrb = b * Math.sin(E);

  // Rotate orbital coordinates by ellipse inclination/orientation angle
  const cosInc = Math.cos(comet.inclinationAngle);
  const sinInc = Math.sin(comet.inclinationAngle);

  const prevX = comet.pos.x;
  const prevY = comet.pos.y;

  const ox = (comet as any).systemCenter?.x ?? 0;
  const oy = (comet as any).systemCenter?.y ?? 0;

  comet.pos.x = ox + (xOrb * cosInc - yOrb * sinInc);
  comet.pos.y = oy + (xOrb * sinInc + yOrb * cosInc);

  if (dt > 0) {
    comet.velocity.x = (comet.pos.x - prevX) / dt;
    comet.velocity.y = (comet.pos.y - prevY) / dt;
  }
}

/**
 * Updates planetary orbital progression around the central star
 */
export function stepPlanetKinematics(planet: RockyPlanet | GasGiant, dt: number): void {
  if (!ORBITAL_CONFIG.planetsMoons) {
    // Keep celestial bodies anchored at their initial spawn coordinates/angles
    return;
  }

  const ox = (planet as any).systemCenter?.x ?? 0;
  const oy = (planet as any).systemCenter?.y ?? 0;

  const currentAngle = planet.orbitalAngle ?? (planet as any).orbitAngle ?? 0;
  const currentSpeed = planet.orbitalSpeed ?? (planet as any).orbitSpeed ?? 0;
  const currentRadius = planet.orbitalRadius ?? (planet as any).orbitRadius ?? 0;

  planet.orbitalAngle = (currentAngle + currentSpeed * dt) % (Math.PI * 2);
  (planet as any).orbitAngle = planet.orbitalAngle;
  planet.pos.x = ox + Math.cos(planet.orbitalAngle) * currentRadius;
  planet.pos.y = oy + Math.sin(planet.orbitalAngle) * currentRadius;
  if ((planet as any).x !== undefined) (planet as any).x = planet.pos.x;
  if ((planet as any).y !== undefined) (planet as any).y = planet.pos.y;

  if (planet.moons) {
    for (const moon of planet.moons) {
      stepMoonKinematics(moon, planet, dt);
    }
  }
}

/**
 * Updates lunar orbital progression around parent planet
 */
export function stepMoonKinematics(moon: MoonEntity, parent: RockyPlanet | GasGiant, dt: number): void {
  if (!ORBITAL_CONFIG.planetsMoons) {
    // Keep moons anchored at their initial spawn coordinates
    return;
  }

  moon.orbitalAngle = (moon.orbitalAngle + moon.orbitalSpeed * dt) % (Math.PI * 2);
  moon.pos.x = parent.pos.x + Math.cos(moon.orbitalAngle) * moon.orbitalRadius;
  moon.pos.y = parent.pos.y + Math.sin(moon.orbitalAngle) * moon.orbitalRadius;
}

const PERSISTENT_CLUSTER_MAP = new Map<string, AsteroidCluster>();

/**
 * Updates dynamic orbital revolution of asteroid clusters around the central star.
 * Uses persistent cluster map to eliminate per-tick Map allocations and linear rescans.
 */
export function stepAsteroidBeltKinematics(
  clusters: AsteroidCluster[],
  asteroids: AsteroidEntity[],
  dt: number
): void {
  if (!ORBITAL_CONFIG.asteroidBeltClusters || dt <= 0 || !clusters) return;

  // 1. Advance clusters along their Keplerian orbital path around the star
  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const ox = (cluster as any).systemCenter?.x ?? 0;
    const oy = (cluster as any).systemCenter?.y ?? 0;
    cluster.orbitalAngle = (cluster.orbitalAngle + cluster.orbitalSpeed * dt) % (Math.PI * 2);
    const cosA = Math.cos(cluster.orbitalAngle);
    const sinA = Math.sin(cluster.orbitalAngle);
    cluster.center.x = ox + cosA * cluster.orbitalRadius;
    cluster.center.y = oy + sinA * cluster.orbitalRadius;
    (cluster as any)._cosA = cosA;
    (cluster as any)._sinA = sinA;
    cluster.velocity = {
      x: -sinA * cluster.orbitalSpeed * cluster.orbitalRadius,
      y: cosA * cluster.orbitalSpeed * cluster.orbitalRadius,
    };
    PERSISTENT_CLUSTER_MAP.set(cluster.id, cluster);
  }
}

/**
 * Single-pass asteroid position synchronization across all systems with zero allocations.
 */
export function syncAllAsteroidsKinematics(asteroids: AsteroidEntity[], dt: number): void {
  if (!asteroids || asteroids.length === 0 || dt <= 0) return;
  const astLen = asteroids.length;
  for (let i = 0; i < astLen; i++) {
    const ast = asteroids[i];
    if (ast.clusterId) {
      let parentCluster = (ast as any)._parentCluster;
      if (!parentCluster || parentCluster.id !== ast.clusterId) {
        parentCluster = PERSISTENT_CLUSTER_MAP.get(ast.clusterId);
        (ast as any)._parentCluster = parentCluster;
      }
      if (parentCluster && ast.clusterOffset) {
        const cosA = (parentCluster as any)._cosA;
        const sinA = (parentCluster as any)._sinA;
        if (cosA !== undefined && sinA !== undefined) {
          ast.pos.x = parentCluster.center.x + (ast.clusterOffset.x * cosA - ast.clusterOffset.y * sinA);
          ast.pos.y = parentCluster.center.y + (ast.clusterOffset.x * sinA + ast.clusterOffset.y * cosA);
        }
      }
    } else if (!ast.isAmbient && ast.orbitalRadius && ast.orbitalSpeed) {
      // Solitary rogue asteroid orbital revolution
      const ox = (ast as any).systemCenter?.x ?? 0;
      const oy = (ast as any).systemCenter?.y ?? 0;
      ast.orbitalAngle = ((ast.orbitalAngle ?? 0) + ast.orbitalSpeed * dt) % (Math.PI * 2);
      ast.pos.x = ox + Math.cos(ast.orbitalAngle) * ast.orbitalRadius;
      ast.pos.y = oy + Math.sin(ast.orbitalAngle) * ast.orbitalRadius;
    }
  }
}

export function generateIndependentSystem(
  systemIndex: number,
  origin: { x: number; y: number },
  isPlayerHome: boolean,
  factionId?: string,
  homeworldTypeParam?: HomeworldTypeId
): StarSystemDescriptor {
  const systemId = `SYS_${systemIndex + 1}`;
  const planets: PlanetEntity[] = [];
  const clusters: AsteroidCluster[] = [];
  const asteroids: AsteroidNode[] = [];
  let asteroidSeq = 0;

  // 1. Rocky Planets (3 to 6)
  const rockyCount = Math.floor(Math.random() * 4) + 3;
  const habitableIndex = Math.floor(Math.random() * 3);
  for (let p = 0; p < rockyCount; p++) {
    // Step orbits evenly outward so up to 6 rocky worlds fit inside the inner boundary
    const baseOrbit = 28000 + p * 9500;
    const orbitJitter = (Math.random() - 0.5) * 2000;
    const orbitR = Math.round(baseOrbit + orbitJitter);
    const angle = Math.random() * Math.PI * 2;
    const isHabitable = (p === habitableIndex);
    const isPrimaryHabitable = isHabitable && isPlayerHome;

    const resolvedHomeworldType: HomeworldTypeId = homeworldTypeParam ||
      (factionId ? getDefaultHomeworldForFaction(factionId as FactionId) : 'TERRAN');
    const hwDef = isPrimaryHabitable ? HOMEWORLD_REGISTRY[resolvedHomeworldType] : null;

    planets.push({
      id: `${systemId}_PLANET_${p + 1}`,
      systemId,
      name: hwDef
        ? hwDef.defaultPlanetName
        : isHabitable
        ? (isPlayerHome ? 'Aegis-IV' : 'Verdant-Prime')
        : `Sector ${systemIndex + 1} Planet ${String.fromCharCode(65 + p)}`,
      type: 'ROCKY',
      planetClass: hwDef ? hwDef.planetClass : undefined,
      planetType: hwDef ? hwDef.planetClass : undefined,
      isHabitable,
      isHydrogenRich: false,
      orbitRadius: orbitR,
      orbitAngle: angle,
      orbitSpeed: 0.00035 / Math.sqrt(orbitR / 10000),
      x: origin.x + Math.cos(angle) * orbitR,
      y: origin.y + Math.sin(angle) * orbitR,
      pos: { x: origin.x + Math.cos(angle) * orbitR, y: origin.y + Math.sin(angle) * orbitR },
      position: { x: origin.x + Math.cos(angle) * orbitR, y: origin.y + Math.sin(angle) * orbitR },
      radius: isHabitable ? 700 : (550 + Math.random() * 350),
      gravityWellRadius: isHabitable ? 2400 : (1900 + Math.random() * 600),
      wellRadius: isHabitable ? 2400 : (1900 + Math.random() * 600),
      wellRadiusSq: Math.pow(isHabitable ? 2400 : (1900 + Math.random() * 600), 2),
      surfaceGravity: hwDef ? hwDef.gravityRating : (isHabitable ? 1.0 : (0.45 + Math.random() * 0.85)),
      gravityRating: hwDef ? hwDef.gravityRating : (isHabitable ? 1.0 : (0.45 + Math.random() * 0.85)),
      habitable: isHabitable,
      isPrimaryHabitable,
      isHomeworld: isPrimaryHabitable,
      hasHQ: isPrimaryHabitable,
      colonized: isPrimaryHabitable,
      colonyGovernance: isPrimaryHabitable,
      baseColor: hwDef ? hwDef.baseColor : (isHabitable ? '#22c55e' : '#a8a29e'),
      oceanColor: hwDef ? hwDef.oceanColor : (isHabitable ? '#3b82f6' : undefined),
      atmosphereColor: hwDef ? hwDef.atmosphereColor : undefined,
      surfacePatternSeed: hwDef ? hwDef.surfacePatternSeed : Math.floor(Math.random() * 10000),
      moons: [],
    });
  }

  // 2. Main Asteroid Belt (250-350 total loose asteroids + 8-15 embedded clusters)
  const beltClusterCount = Math.floor(Math.random() * 8) + 8; // 8-15
  const beltRadiusMin = 95000;
  const beltRadiusMax = 145000;

  for (let c = 0; c < beltClusterCount; c++) {
    const clusterDist = beltRadiusMin + Math.random() * (beltRadiusMax - beltRadiusMin);
    const clusterAngle = (c / beltClusterCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    const clusterCenter = {
      x: origin.x + Math.cos(clusterAngle) * clusterDist,
      y: origin.y + Math.sin(clusterAngle) * clusterDist
    };
    const clusterCount = Math.floor(Math.random() * 21) + 25; // 25 to 45 nodes
    const clusterId = `${systemId}_CLUSTER_BELT_${c + 1}`;
    const clusterNodes: AsteroidNode[] = [];

    for (let a = 0; a < clusterCount; a++) {
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * 2200;
      const sizeRoll = Math.random();
      const size: 'SMALL' | 'MEDIUM' | 'LARGE' = sizeRoll < 0.5 ? 'SMALL' : sizeRoll < 0.85 ? 'MEDIUM' : 'LARGE';
      const maxOre = size === 'SMALL' ? 1000 : size === 'MEDIUM' ? 3500 : 9000;

      const astId = `${systemId}_AST_${++asteroidSeq}`;
      const rad = size === 'SMALL' ? 60 : size === 'MEDIUM' ? 140 : 260;
      const { vertices, craters } = generateAsteroidFacets(rad, astId);

      const node: AsteroidNode = {
        id: astId,
        systemId,
        clusterId,
        x: clusterCenter.x + Math.cos(offsetAngle) * offsetDist,
        y: clusterCenter.y + Math.sin(offsetAngle) * offsetDist,
        radius: rad,
        size,
        oreRemaining: maxOre,
        maxOre,
        isDepleted: false,
        pos: { x: clusterCenter.x + Math.cos(offsetAngle) * offsetDist, y: clusterCenter.y + Math.sin(offsetAngle) * offsetDist },
        position: { x: clusterCenter.x + Math.cos(offsetAngle) * offsetDist, y: clusterCenter.y + Math.sin(offsetAngle) * offsetDist },
        tier: size,
        remainingOre: maxOre,
        vertices,
        facets: vertices,
        craters,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
      };
      clusterNodes.push(node);
      asteroids.push(node);
    }

    const clusterRad = 2200;
    const wellRad = Math.round(clusterRad * 1.10);
    clusters.push({
      id: clusterId,
      systemId,
      name: `Belt Cluster ${c + 1}`,
      center: clusterCenter,
      radius: clusterRad,
      gravityWellRadius: wellRad,
      wellRadius: wellRad,
      asteroidIds: clusterNodes.map(n => n.id),
      isMoorable: true,
      isAsteroidCluster: true,
    });
  }

  // Spawn 250 to 350 loose/scattered belt asteroids across the whole ring
  const looseBeltCount = Math.floor(Math.random() * 101) + 250; // 250 to 350 loose nodes
  for (let b = 0; b < looseBeltCount; b++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = beltRadiusMin + Math.random() * (beltRadiusMax - beltRadiusMin);
    const sizeRoll = Math.random();
    const size: 'SMALL' | 'MEDIUM' | 'LARGE' = sizeRoll < 0.55 ? 'SMALL' : sizeRoll < 0.85 ? 'MEDIUM' : 'LARGE';
    const maxOre = size === 'SMALL' ? 1000 : size === 'MEDIUM' ? 3500 : 9000;
    const astId = `${systemId}_AST_${++asteroidSeq}`;
    const rad = size === 'SMALL' ? 60 : size === 'MEDIUM' ? 140 : 260;
    const { vertices, craters } = generateAsteroidFacets(rad, astId);

    asteroids.push({
      id: astId,
      systemId,
      // No clusterId (indicates loose belt node)
      x: origin.x + Math.cos(angle) * dist,
      y: origin.y + Math.sin(angle) * dist,
      radius: rad,
      size,
      oreRemaining: maxOre,
      maxOre,
      isDepleted: false,
      pos: { x: origin.x + Math.cos(angle) * dist, y: origin.y + Math.sin(angle) * dist },
      position: { x: origin.x + Math.cos(angle) * dist, y: origin.y + Math.sin(angle) * dist },
      tier: size,
      remainingOre: maxOre,
      vertices,
      facets: vertices,
      craters,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.08,
    });
  }

  // Loose belt asteroids to reach 250-350 target
  const targetBeltTotal = Math.floor(Math.random() * 101) + 250;
  const looseToSpawn = Math.max(0, targetBeltTotal - asteroids.length);
  for (let i = 0; i < looseToSpawn; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = beltRadiusMin + Math.random() * (beltRadiusMax - beltRadiusMin);
    const sizeRoll = Math.random();
    const size: 'SMALL' | 'MEDIUM' | 'LARGE' = sizeRoll < 0.6 ? 'SMALL' : sizeRoll < 0.9 ? 'MEDIUM' : 'LARGE';
    const maxOre = size === 'SMALL' ? 1000 : size === 'MEDIUM' ? 3500 : 9000;
    const ax = origin.x + Math.cos(angle) * dist;
    const ay = origin.y + Math.sin(angle) * dist;
    const rad = size === 'SMALL' ? 60 : size === 'MEDIUM' ? 140 : 260;
    const astId = `${systemId}_AST_${++asteroidSeq}`;
    const { vertices, craters } = generateAsteroidFacets(rad, astId);

    asteroids.push({
      id: astId,
      systemId,
      x: ax,
      y: ay,
      radius: rad,
      size,
      oreRemaining: maxOre,
      maxOre,
      isDepleted: false,
      pos: { x: ax, y: ay },
      position: { x: ax, y: ay },
      tier: size,
      remainingOre: maxOre,
      vertices,
      facets: vertices,
      craters,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.08,
    });
  }

  // 3. Gas Giants (1 to 4)
  const gasCount = Math.floor(Math.random() * 4) + 1;
  for (let g = 0; g < gasCount; g++) {
    const orbitR = 165000 + g * 25000 + Math.random() * 5000;
    const angle = Math.random() * Math.PI * 2;
    const gx = origin.x + Math.cos(angle) * orbitR;
    const gy = origin.y + Math.sin(angle) * orbitR;
    const radius = 1400 + Math.random() * 700;
    const wellRadius = 3800 + Math.random() * 1400;
    const surfaceGravity = 2.2 + Math.random() * 1.8;
    const isHydrogen = Math.random() < 0.30;

    planets.push({
      id: `${systemId}_GIANT_${g + 1}`,
      systemId,
      name: `Sector ${systemIndex + 1} Giant ${g + 1}`,
      type: 'GAS_GIANT',
      isHabitable: false,
      isHydrogenRich: isHydrogen,
      orbitRadius: orbitR,
      orbitAngle: angle,
      orbitSpeed: 0.00015 / Math.sqrt(orbitR / 10000),
      orbitalRadius: orbitR,
      orbitalAngle: angle,
      orbitalSpeed: 0.00015 / Math.sqrt(orbitR / 10000),
      x: gx,
      y: gy,
      pos: { x: gx, y: gy },
      position: { x: gx, y: gy },
      radius,
      gravityWellRadius: wellRadius,
      wellRadius,
      wellRadiusSq: wellRadius * wellRadius,
      surfaceGravity,
      gravityRating: surfaceGravity,
      hydrogen: isHydrogen,
      baseColor: '#d97706',
      bandColors: ['#b45309', '#f59e0b', '#78350f'],
      moons: [],
    });
  }

  // 4. Outer Scattered Clusters (5 to 8)
  const scatteredCount = Math.floor(Math.random() * 4) + 5;
  for (let s = 0; s < scatteredCount; s++) {
    const dist = 180000 + Math.random() * 100000;
    const angle = Math.random() * Math.PI * 2;
    const clusterCenter = {
      x: origin.x + Math.cos(angle) * dist,
      y: origin.y + Math.sin(angle) * dist
    };
    const clusterId = `${systemId}_CLUSTER_OUTER_${s + 1}`;
    const count = Math.floor(Math.random() * 21) + 25; // 25-45
    const clusterAsteroids: AsteroidNode[] = [];

    for (let a = 0; a < count; a++) {
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetDist = Math.random() * 2000;
      const sizeRoll = Math.random();
      const size: 'SMALL' | 'MEDIUM' | 'LARGE' = sizeRoll < 0.4 ? 'SMALL' : sizeRoll < 0.8 ? 'MEDIUM' : 'LARGE';
      const maxOre = size === 'SMALL' ? 1000 : size === 'MEDIUM' ? 3500 : 9000;
      const ax = clusterCenter.x + Math.cos(offsetAngle) * offsetDist;
      const ay = clusterCenter.y + Math.sin(offsetAngle) * offsetDist;
      const astId = `${systemId}_AST_${++asteroidSeq}`;
      const rad = size === 'SMALL' ? 60 : size === 'MEDIUM' ? 140 : 260;
      const { vertices, craters } = generateAsteroidFacets(rad, astId);

      const node: AsteroidNode = {
        id: astId,
        systemId,
        clusterId,
        x: ax,
        y: ay,
        radius: rad,
        size,
        oreRemaining: maxOre,
        maxOre,
        isDepleted: false,
        pos: { x: ax, y: ay },
        position: { x: ax, y: ay },
        tier: size,
        remainingOre: maxOre,
        vertices,
        facets: vertices,
        craters,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
      };
      clusterAsteroids.push(node);
      asteroids.push(node);
    }

    const outerClusterRad = 2000;
    const outerWellRad = Math.round(outerClusterRad * 1.10);
    clusters.push({
      id: clusterId,
      systemId,
      name: `Outer Cluster ${s + 1}`,
      center: clusterCenter,
      radius: outerClusterRad,
      gravityWellRadius: outerWellRad,
      wellRadius: outerWellRad,
      asteroidIds: clusterAsteroids.map(n => n.id),
      isMoorable: true,
      isAsteroidCluster: true,
    });
  }

  const rockyPlanets = planets.filter((p) => p.type === 'ROCKY');
  const gasGiants = planets.filter((p) => p.type === 'GAS_GIANT');
  const primaryHabitablePlanet = rockyPlanets.find((p) => p.isHabitable) || rockyPlanets[0];

  const solarSys: any = {
    seed: systemIndex + 1337,
    arenaRadius: 300000,
    star: {
      id: `${systemId}_STAR`,
      name: `Star ${systemId}`,
      pos: { x: origin.x, y: origin.y },
      radius: 5500,
      gravityRating: 1.0,
      wellRadius: 12000,
    },
    rockyPlanets,
    primaryHabitablePlanet,
    gasGiants,
    comets: [],
    beltRadiusMin: 95000,
    beltRadiusMax: 145000,
    asteroidCount: asteroids.length,
    clusters,
  };

  return {
    id: systemId,
    index: systemIndex,
    name: `Sector 0${systemIndex + 1}`,
    center: origin,
    starRadius: 5500,
    deepSpaceBoundaryRadius: 300000,
    systemBoundaryRadius: 300000,
    planets,
    clusters,
    asteroids,
    solarSystem: solarSys,
    rockyPlanets,
    gasGiants,
  };
}

export function generateGalaxy(
  systemCountOrConfig: number | { systemCount?: number; factionId?: string; [key: string]: any } = 3,
  factionIdParam?: string
): {
  systems: StarSystemDescriptor[];
  allPlanets: PlanetEntity[];
  allClusters: AsteroidCluster[];
  allAsteroids: AsteroidNode[];
  systemMap: Map<string, StarSystemDescriptor>;
  config: GalaxyConfiguration;
} {
  const systemCount =
    typeof systemCountOrConfig === 'number'
      ? systemCountOrConfig
      : systemCountOrConfig?.systemCount ?? 3;
  const factionId = factionIdParam || (typeof systemCountOrConfig === 'object' ? systemCountOrConfig.factionId : undefined);
  const homeworldType = (typeof systemCountOrConfig === 'object' ? systemCountOrConfig.homeworldType : undefined);

  const systems: StarSystemDescriptor[] = [];
  const allPlanets: PlanetEntity[] = [];
  const allClusters: AsteroidCluster[] = [];
  const allAsteroids: AsteroidNode[] = [];

  const radius = systemCount > 1 ? 320000 * Math.sqrt(systemCount) : 0;

  for (let i = 0; i < systemCount; i++) {
    const angle = systemCount > 1 ? (i / systemCount) * Math.PI * 2 : 0;
    const origin = {
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius)
    };
    const sys = generateIndependentSystem(i, origin, i === 0, i === 0 ? factionId : undefined, i === 0 ? homeworldType : undefined);
    systems.push(sys);
    allPlanets.push(...sys.planets);
    allClusters.push(...sys.clusters);
    allAsteroids.push(...sys.asteroids);
  }

  const systemMap = new Map<string, StarSystemDescriptor>();
  for (const s of systems) {
    systemMap.set(s.id, s);
  }

  return {
    systems,
    allPlanets,
    allClusters,
    allAsteroids,
    systemMap,
    config: {
      systemCount,
      systemSpacing: 650000,
      seed: 1337,
    },
  };
}

export const generateSingleSystem = (
  index: number = 0,
  origin: { x: number; y: number } = { x: 0, y: 0 },
  isHomeworld: boolean = true
): StarSystemDescriptor => {
  return generateIndependentSystem(index, origin, isHomeworld);
};


/**
 * PROCEDURAL SOLAR SYSTEM GENERATOR
 * Generates an expansive deep-space solar system conforming to the exact deterministic hierarchy.
 */
export function generateProceduralSolarSystem(
  seed: number = Math.floor(Math.random() * 1000000)
): { solarSystem: SolarSystem; asteroids: AsteroidEntity[] } {
  const rng = new SeededRNG(seed);

  // 1. MAP SCALE & BOUNDS: Expansive orbital arena (scaled 4.5x: radius 126,000px to 153,000px)
  const arenaRadius = Math.round(rng.range(CELESTIAL_SCALE.arenaRadiusMin, CELESTIAL_SCALE.arenaRadiusMax));

  // A. CENTRAL STAR: At origin (0, 0), radiant disc with emissive corona (scaled 4.5x)
  const starName = rng.choice(STAR_NAMES);
  const star: CentralStar = {
    name: starName,
    pos: { x: 0, y: 0 },
    radius: Math.round(rng.range(CELESTIAL_SCALE.starRadiusMin, CELESTIAL_SCALE.starRadiusMax)),
    coronaRadius: Math.round(rng.range(CELESTIAL_SCALE.starCoronaMin, CELESTIAL_SCALE.starCoronaMax)),
    color: '#fef08a',
    spectralClass: 'Class G2V Yellow Main-Sequence Dwarf',
  };

  // B. ROCKY PLANETS (Count: 4 to 5):
  // Inner system inside the asteroid belt (~11,700px to 47,700px)
  const rockyCount = rng.int(4, 5);
  const rockyPlanets: RockyPlanet[] = [];

  // Guarantee exactly ONE rocky planet is 'habitable = true' and 'isPrimaryHabitable = true'
  // Pick primary habitable index
  const primaryHabitableIndex = 0;

  // Spaced radii across the inner system (scaled 4.5x)
  const minInnerRadius = CELESTIAL_SCALE.rockyOrbitMin;
  const maxInnerRadius = CELESTIAL_SCALE.rockyOrbitMax;
  const radiusStep = (maxInnerRadius - minInnerRadius) / Math.max(rockyCount, 1);

  for (let i = 0; i < rockyCount; i++) {
    const isPrimary = i === primaryHabitableIndex;
    // Guaranteed secondary colonizable Terran world at index 3
    const isSecondaryTerran = i === 3;
    const isHabitable = isPrimary || isSecondaryTerran;

    const orbitalRadius = Math.round(minInnerRadius + i * radiusStep + rng.range(-180 * K_SCALE, 180 * K_SCALE));
    const orbitalAngle = rng.range(0, Math.PI * 2);
    // Slow, realistic angular rate (rad/s)
    const orbitalSpeed = (0.0035 / Math.sqrt(orbitalRadius / (3000 * K_SCALE))) * (rng.next() < 0.5 ? 1 : 1);

    const pos: Vec2D = {
      x: Math.cos(orbitalAngle) * orbitalRadius,
      y: Math.sin(orbitalAngle) * orbitalRadius,
    };

    const name = isPrimary
      ? 'Aegis-IV'
      : isSecondaryTerran
      ? 'Verdant-Prime'
      : ROCKY_NAMES[i % ROCKY_NAMES.length] || `Rocky-${i + 1}`;
    const radius = Math.round(rng.range(CELESTIAL_SCALE.rockyRadiusMin, CELESTIAL_SCALE.rockyRadiusMax));

    // Base colors & atmospheric palette
    let baseColor = '#64748b';
    let oceanColor: string | undefined = undefined;
    let atmosphereColor: string | undefined = undefined;
    let planetClass: 'TERRAN' | 'DESERT' | 'ICE' | 'VOLCANIC' | 'BARREN' = 'BARREN';

    if (isHabitable) {
      planetClass = 'TERRAN';
      baseColor = '#15803d'; // Continental moss/forest green
      oceanColor = '#0284c7'; // Deep ocean blue
      atmosphereColor = 'rgba(56, 189, 248, 0.45)'; // Vivid oxygen-nitrogen Rayleigh blue
    } else {
      // Deterministically guarantee Ice at index 1 and Volcanic at index 2
      const biomeType = i === 1 ? 3 : i === 2 ? 4 : rng.int(1, 4);
      if (biomeType === 1) {
        planetClass = 'DESERT';
        baseColor = '#b45309'; // Arid ferric oxide / Mars rust
        atmosphereColor = 'rgba(217, 119, 6, 0.25)';
      } else if (biomeType === 2) {
        planetClass = 'BARREN';
        baseColor = '#475569'; // Barren basalt / lunar regolith
      } else if (biomeType === 3) {
        planetClass = 'ICE';
        baseColor = '#0e7490'; // Subsurface frozen ocean / cryo-crust
        atmosphereColor = 'rgba(103, 232, 249, 0.3)';
      } else {
        planetClass = 'VOLCANIC';
        baseColor = '#78350f'; // Scorched volcanic silicate
        atmosphereColor = 'rgba(234, 88, 12, 0.2)';
      }
    }

    const planetId = `planet-rocky-${i + 1}`;
    const planetMoons: MoonEntity[] = [];

    // Lunar generation for rocky planets: Primary gets guaranteed moon; others have 35% chance
    const shouldSpawnMoon = isPrimary || rng.next() < 0.35;
    if (shouldSpawnMoon) {
      const moonAngle = rng.range(0, Math.PI * 2);
      const moonDist = Math.round(radius * rng.range(2.8, 3.8));
      const moonRadius = isPrimary ? CELESTIAL_SCALE.primaryMoonRadius : Math.round(rng.range(CELESTIAL_SCALE.rockyMoonRadiusMin, CELESTIAL_SCALE.rockyMoonRadiusMax));
      const moonName = isPrimary ? 'Selene-Prime' : `${name}-I`;
      const moonGravity = parseFloat(rng.range(0.14, 0.22).toFixed(2));
      const moonWellRadius = calculateDynamicGravityWellRadius({
        radius: moonRadius,
        gravityRating: moonGravity,
        type: 'MOON',
      });
      planetMoons.push({
        id: `moon-rocky-${i + 1}-1`,
        name: moonName,
        parentPlanetId: planetId,
        parentPlanetName: name,
        orbitalRadius: moonDist,
        orbitalAngle: moonAngle,
        orbitalSpeed: 0.004 / Math.sqrt(moonDist / (300 * K_SCALE)),
        pos: {
          x: pos.x + Math.cos(moonAngle) * moonDist,
          y: pos.y + Math.sin(moonAngle) * moonDist,
        },
        radius: moonRadius,
        color: '#cbd5e1',
        gravityRating: moonGravity,
        wellRadius: moonWellRadius,
        wellRadiusSq: moonWellRadius * moonWellRadius,
      });
    }

    const gRating = isPrimary
      ? 1.00
      : isHabitable || planetClass === 'TERRAN'
      ? parseFloat(rng.range(TERRAN_GRAVITY_MIN, TERRAN_GRAVITY_MAX).toFixed(2))
      : parseFloat(rng.range(0.35, 1.40).toFixed(2));

    const pWellRadius = calculateDynamicGravityWellRadius({
      radius,
      gravityRating: gRating,
      planetClass,
    });
    const pWellRadiusSq = pWellRadius * pWellRadius;

    rockyPlanets.push({
      id: planetId,
      name,
      orbitalRadius,
      orbitalAngle,
      orbitalSpeed,
      pos,
      radius,
      habitable: isHabitable,
      isPrimaryHabitable: isPrimary,
      planetClass,
      planetType: planetClass,
      colonized: isPrimary,
      colonyGovernance: isPrimary,
      gravityRating: gRating,
      wellRadius: pWellRadius,
      wellRadiusSq: pWellRadiusSq,
      baseColor,
      oceanColor,
      atmosphereColor,
      surfacePatternSeed: rng.int(1, 99999),
      moons: planetMoons,
    });
  }

  const primaryHabitablePlanet = rockyPlanets[primaryHabitableIndex];

  // C. TWO-TIER ASTEROID BELT OVERHAUL (Scaled 4.5x)
  // Belt Radius: ~54,000px to 72,000px from origin
  const beltRadiusMin = CELESTIAL_SCALE.beltRadiusMin;
  const beltRadiusMax = CELESTIAL_SCALE.beltRadiusMax;
  const generatedAsteroids: AsteroidEntity[] = [];
  const clusters: AsteroidCluster[] = [];
  let astIdCounter = 1;

  // --- LAYER 1: AMBIENT BELT RING GENERATION ---
  // Ambient background ring spanning 200 to 350 asteroids distributed uniformly across the annular belt
  const nRing = rng.int(CELESTIAL_SCALE.ambientRingCountMin, CELESTIAL_SCALE.ambientRingCountMax);
  const minRSq = beltRadiusMin * beltRadiusMin;
  const maxRSq = beltRadiusMax * beltRadiusMax;

  for (let i = 0; i < nRing; i++) {
    const theta = rng.range(0, Math.PI * 2);
    // Uniform area distribution across annular zone: r = sqrt(randomFloat(R_inner^2, R_outer^2))
    const r = Math.sqrt(rng.range(minRSq, maxRSq));
    const x = star.pos.x + r * Math.cos(theta);
    const y = star.pos.y + r * Math.sin(theta);

    // Tier Distribution for Ambient Ring: Small (70%), Medium (25%), Large (5%)
    const roll = rng.next();
    let tier: AsteroidTier = 'SMALL';
    if (roll < 0.70) {
      tier = 'SMALL';  // 250 ore
    } else if (roll < 0.95) {
      tier = 'MEDIUM'; // 670 ore
    } else {
      tier = 'LARGE';  // 1,500 ore
    }

    const astId = `ast-ring-${astIdCounter++}`;
    const ast = createAsteroid(astId, { x, y }, tier);
    ast.isAmbient = true;
    // Ambient asteroids possess static spatial coordinates relative to the system center
    // and do not project individual gravity wells.
    generatedAsteroids.push(ast);
  }

  // --- LAYER 2: DENSE SUPER-CLUSTERS WITH COUNT-SCALED GRAVITY WELLS ---
  // 8 to 15 focal points along the belt, each with 25 to 40 gravitationally bound member asteroids
  const clusterCount = rng.int(8, 15);

  for (let c = 0; c < clusterCount; c++) {
    const baseAngle = (c / clusterCount) * Math.PI * 2 + rng.range(-0.18, 0.18);
    const clusterBeltRadius = rng.range(beltRadiusMin, beltRadiusMax);
    const clusterCenter: Vec2D = {
      x: Math.cos(baseAngle) * clusterBeltRadius,
      y: Math.sin(baseAngle) * clusterBeltRadius,
    };
    const clusterBaseRadius = CELESTIAL_SCALE.clusterBaseRadius; // 1890px physical core spread (scaled 4.5x)
    const clusterOrbitalSpeed = 0.00065 / Math.sqrt(clusterBeltRadius / (12000 * K_SCALE));
    const clusterAsteroidIds: string[] = [];
    const clusterId = `cluster-${c + 1}`;
    const clusterName = `Belt Formation ${String.fromCharCode(65 + (c % 26))}-${c + 1}`;

    // Roll cluster member count: 25 to 40 asteroids
    const nCluster = rng.int(25, 40);
    const clusterAsteroids: AsteroidEntity[] = [];

    for (let i = 0; i < nCluster; i++) {
      // Clustered tightly around focal center (X_k, Y_k) using radius-clamped dispersion
      const scAngle = rng.range(0, Math.PI * 2);
      const scDist = rng.range(0, clusterBaseRadius);
      const relOffset: Vec2D = {
        x: Math.cos(scAngle) * scDist,
        y: Math.sin(scAngle) * scDist,
      };
      const aPos: Vec2D = {
        x: clusterCenter.x + relOffset.x,
        y: clusterCenter.y + relOffset.y,
      };

      // Cluster Tier Distribution: Small (60%), Medium (25%), Large (15%)
      const roll = rng.next();
      let tier: AsteroidTier = 'SMALL';
      if (roll < 0.60) {
        tier = 'SMALL';  // 250 ore
      } else if (roll < 0.85) {
        tier = 'MEDIUM'; // 670 ore
      } else {
        tier = 'LARGE';  // 1,500 ore
      }

      const astId = `ast-cluster-${c + 1}-${i + 1}`;
      clusterAsteroidIds.push(astId);
      const ast = createAsteroid(astId, aPos, tier);
      // All 25-40 asteroids within the cluster orbit locked to the cluster focal point
      ast.clusterId = clusterId;
      ast.clusterOffset = relOffset;
      generatedAsteroids.push(ast);
      clusterAsteroids.push(ast);
    }

    // Compute actual physical bounding radius R_bounds of each cluster based on member node distribution:
    // Determine the maximum Euclidean distance from focal center to outermost member asteroid in cluster:
    // R_cluster_envelope = max_i sqrt((X_i - X_cluster)^2 + (Y_i - Y_cluster)^2) + R_asteroid_mesh
    let maxDistWithMesh = 0;
    for (const ast of clusterAsteroids) {
      const distFromCenter = Math.hypot(ast.pos.x - clusterCenter.x, ast.pos.y - clusterCenter.y);
      const distPlusMesh = distFromCenter + (ast.radius || 16.0);
      if (distPlusMesh > maxDistWithMesh) {
        maxDistWithMesh = distPlusMesh;
      }
    }
    const clusterEnvelope = maxDistWithMesh > 0 ? maxDistWithMesh : clusterBaseRadius;

    // Enforce the tight 10% operational margin formula:
    // R_cluster_well = R_cluster_envelope * 1.10
    const wellRadius = calculateClusterGravityWellRadius(clusterEnvelope);

    clusters.push({
      id: clusterId,
      systemId: 'SYS_1',
      name: clusterName,
      center: clusterCenter,
      orbitalRadius: clusterBeltRadius,
      orbitalAngle: baseAngle,
      orbitalSpeed: clusterOrbitalSpeed,
      radius: clusterEnvelope,
      envelopeRadius: clusterEnvelope,
      wellRadius: wellRadius,
      gravityWellRadius: wellRadius,
      isMoorable: true,
      isAsteroidCluster: true,
      baseRadiusPerNode: BASE_RADIUS_PER_CLUSTER_NODE,
      memberCount: nCluster,
      velocity: {
        x: -Math.sin(baseAngle) * clusterOrbitalSpeed * clusterBeltRadius,
        y: Math.cos(baseAngle) * clusterOrbitalSpeed * clusterBeltRadius,
      },
      asteroidIds: clusterAsteroidIds,
    });
  }

  // D. ROGUE ASTEROIDS (Count: 12 to 15):
  // Scattered as isolated, solitary nodes across deep space (scaled 4.5x)
  const rogueCount = rng.int(12, 15);
  for (let r = 0; r < rogueCount; r++) {
    const rogueAngle = rng.range(0, Math.PI * 2);
    // Solitary across deep space: from inner orbital margin to outer rim (scaled 4.5x)
    const rogueDist = rng.range(2200 * K_SCALE, 27500 * K_SCALE);
    const aPos: Vec2D = {
      x: Math.cos(rogueAngle) * rogueDist,
      y: Math.sin(rogueAngle) * rogueDist,
    };

    const roll = rng.next();
    let tier: AsteroidTier = 'SMALL';
    if (roll < 0.60) {
      tier = 'SMALL';
    } else if (roll < 0.85) {
      tier = 'MEDIUM';
    } else {
      tier = 'LARGE';
    }

    const ast = createAsteroid(`ast-rogue-${astIdCounter++}`, aPos, tier);
    ast.orbitalRadius = rogueDist;
    ast.orbitalAngle = rogueAngle;
    ast.orbitalSpeed = 0.0007 / Math.sqrt(rogueDist / (10000 * K_SCALE));
    generatedAsteroids.push(ast);
  }

  // E. GAS GIANTS (Count: 1 to 4):
  // Outer orbital radii beyond the asteroid belt (~81,000px to 132,750px)
  const gasGiantCount = rng.int(1, 4);
  const gasGiants: GasGiant[] = [];

  const minOuterRadius = CELESTIAL_SCALE.gasOrbitMin;
  const maxOuterRadius = CELESTIAL_SCALE.gasOrbitMax;
  const gasRadiusStep = (maxOuterRadius - minOuterRadius) / Math.max(gasGiantCount, 1);

  const GAS_THEMES = [
    {
      base: '#b45309', // Jupiter Amber / Ochre
      bands: ['#d97706', '#fef3c7', '#92400e', '#78350f', '#fef08a'],
    },
    {
      base: '#0369a1', // Neptune Cobalt / Azure
      bands: ['#0284c7', '#38bdf8', '#0c4a6e', '#bae6fd', '#0369a1'],
    },
    {
      base: '#d97706', // Saturn Gold / Warm Cream
      bands: ['#fef3c7', '#fde68a', '#b45309', '#d97706', '#fcd34d'],
      ring: true,
    },
    {
      base: '#0d9488', // Uranus Cyan / Deep Teal
      bands: ['#14b8a6', '#5eead4', '#134e4a', '#ccfbf1'],
      ring: true,
    },
  ];

  for (let g = 0; g < gasGiantCount; g++) {
    const orbitalRadius = Math.round(minOuterRadius + g * gasRadiusStep + rng.range(-400 * K_SCALE, 400 * K_SCALE));
    const orbitalAngle = rng.range(0, Math.PI * 2);
    const orbitalSpeed = (0.0018 / Math.sqrt(orbitalRadius / (3000 * K_SCALE)));

    const pos: Vec2D = {
      x: Math.cos(orbitalAngle) * orbitalRadius,
      y: Math.sin(orbitalAngle) * orbitalRadius,
    };

    const radius = Math.round(rng.range(CELESTIAL_SCALE.gasRadiusMin, CELESTIAL_SCALE.gasRadiusMax));
    // Each gas giant rolls an independent 30% chance to possess the tag 'hydrogen = true'
    const hasHydrogen = rng.next() < 0.30;

    const theme = GAS_THEMES[g % GAS_THEMES.length];
    const ringSystem = theme.ring
      ? {
          innerRadius: radius * 1.35,
          outerRadius: radius * 2.2,
          color: theme.base,
          opacity: 0.35,
        }
      : undefined;

    const giantId = `planet-gas-${g + 1}`;
    const giantName = GAS_GIANT_NAMES[g % GAS_GIANT_NAMES.length] || `Gas-Giant-${g + 1}`;

    // Lunar generation for gas giants: 1 to 3 large moons
    const giantMoonCount = rng.int(1, 3);
    const giantMoons: MoonEntity[] = [];
    for (let m = 0; m < giantMoonCount; m++) {
      const moonAngle = rng.range(0, Math.PI * 2);
      const moonDist = Math.round(radius * rng.range(2.6, 4.4));
      const moonRadius = Math.round(rng.range(CELESTIAL_SCALE.gasMoonRadiusMin, CELESTIAL_SCALE.gasMoonRadiusMax));
      const moonName = MOON_NAMES[(g * 2 + m + 3) % MOON_NAMES.length];
      const moonGravity = parseFloat(rng.range(0.18, 0.30).toFixed(2));
      const moonWellRadius = calculateDynamicGravityWellRadius({
        radius: moonRadius,
        gravityRating: moonGravity,
        type: 'MOON',
      });
      giantMoons.push({
        id: `moon-gas-${g + 1}-${m + 1}`,
        name: `${giantName}-${moonName}`,
        parentPlanetId: giantId,
        parentPlanetName: giantName,
        orbitalRadius: moonDist,
        orbitalAngle: moonAngle,
        orbitalSpeed: 0.003 / Math.sqrt(moonDist / (500 * K_SCALE)),
        pos: {
          x: pos.x + Math.cos(moonAngle) * moonDist,
          y: pos.y + Math.sin(moonAngle) * moonDist,
        },
        radius: moonRadius,
        color: '#e2e8f0',
        gravityRating: moonGravity,
        wellRadius: moonWellRadius,
        wellRadiusSq: moonWellRadius * moonWellRadius,
      });
    }

    const giantGravity = parseFloat(rng.range(1.65, 2.75).toFixed(2));
    const gWellRadius = calculateDynamicGravityWellRadius({
      radius,
      gravityRating: giantGravity,
      planetClass: 'GAS_GIANT',
    });
    const gWellRadiusSq = gWellRadius * gWellRadius;

    gasGiants.push({
      id: giantId,
      name: giantName,
      orbitalRadius,
      orbitalAngle,
      orbitalSpeed,
      pos,
      radius,
      hydrogen: hasHydrogen,
      gravityRating: giantGravity,
      wellRadius: gWellRadius,
      wellRadiusSq: gWellRadiusSq,
      baseColor: theme.base,
      bandColors: theme.bands,
      ringSystem,
      moons: giantMoons,
    });
  }

  // F. COMETS (Count: 1 to 2):
  // High-eccentricity elliptical orbits around the central star [0,0]
  const cometCount = rng.int(1, 2);
  const comets: CometEntity[] = [];

  for (let cm = 0; cm < cometCount; cm++) {
    const semiMajorAxis = Math.round(rng.range(CELESTIAL_SCALE.cometSemiMajorMin, CELESTIAL_SCALE.cometSemiMajorMax));
    // High-eccentricity (0.76 to 0.88)
    const eccentricity = parseFloat(rng.range(0.76, 0.88).toFixed(3));
    const inclinationAngle = rng.range(0, Math.PI * 2);
    const orbitalPeriod = Math.round(rng.range(280, 480)); // 4.5 to 8 minutes per orbit
    const meanAnomaly = rng.range(0, Math.PI * 2);

    const comet: CometEntity = {
      id: `comet-${cm + 1}`,
      name: COMET_NAMES[cm % COMET_NAMES.length] || `Comet-${cm + 1}`,
      semiMajorAxis,
      eccentricity,
      inclinationAngle,
      meanAnomaly,
      orbitalPeriod,
      pos: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      nucleusRadius: Math.round(rng.range(CELESTIAL_SCALE.cometNucleusMin, CELESTIAL_SCALE.cometNucleusMax)),
      tailLength: Math.round(rng.range(CELESTIAL_SCALE.cometTailMin, CELESTIAL_SCALE.cometTailMax)),
      mystery: true, // Strictly tagged mystery = true
    };

    // Calculate initial position
    stepCometKinematics(comet, 0);
    comets.push(comet);
  }

  const solarSystem: SolarSystem = {
    seed,
    arenaRadius,
    star,
    rockyPlanets,
    primaryHabitablePlanet,
    gasGiants,
    comets,
    beltRadiusMin,
    beltRadiusMax,
    asteroidCount: generatedAsteroids.length,
    clusters,
  };

  return {
    solarSystem,
    asteroids: generatedAsteroids,
  };
}
