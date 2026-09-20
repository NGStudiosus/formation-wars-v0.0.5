/**
 * Tactical Sensor Controller & Canonical Engagement Envelopes
 *
 * Enforces explicit static baseline distances derived from the baseline offensive missile lock range:
 * - Offensive Missile Envelope (R_Missile): 2,400 km (Reference baseline)
 * - Active Radar Range (R_Radar = 3.5 * R_Missile): 8,400 km
 * - Passive Sensor Horizon (R_Passive = 3.0 * R_Radar = 10.5 * R_Missile): 25,200 km
 * - Counter-Missile Intercept Radius (R_CM = 1/6 * R_Missile): 400 km
 * - Offensive Energy Beam Array (R_Beam = 1/8 * R_Missile): 300 km
 * - Point-Defense Lasers (R_PD = 1/12 * R_Missile): 200 km
 */

import { SensorBlip, ShipEntity } from '../types';

export interface TacticalRanges {
  missileLockRangeKm: number;    // 2,400 km base
  radarRangeKm: number;          // 8,400 km generic reference baseline
  sensorRangeKm: number;         // 8,400 km base (alias for radarRangeKm)
  passiveRangeKm: number;        // 25,200 km base (3.0 * radarRangeKm)
  counterMissileRangeKm: number; // 350 km combat perimeter
  offensiveBeamRangeKm: number;  // 300 km base
  pointDefenseRangeKm: number;   // 65 km combat perimeter
  laserMaxRangeKm: number;       // 800 km combat perimeter
  missileMaxRangeKm: number;     // 1200 km combat perimeter
}

export const BASE_TACTICAL_RANGES: TacticalRanges = {
  missileLockRangeKm: 2400,
  radarRangeKm: 8400,
  sensorRangeKm: 8400,
  passiveRangeKm: 25200,
  counterMissileRangeKm: 350,
  offensiveBeamRangeKm: 300,
  pointDefenseRangeKm: 65,
  laserMaxRangeKm: 800,
  missileMaxRangeKm: 1200,
};

export interface TacticalRangeModifiers {
  radarMultiplier?: number;
  passiveMultiplier?: number;
  sensorRangeMult?: number;
  radarRangeMult?: number;
  passiveRangeMult?: number;
  missileRangeMult?: number;
  cmRangeMult?: number;
  beamRangeMult?: number;
  pdRangeMult?: number;
}

export interface EffectiveTacticalRanges {
  effectiveRadarRange: number;
  effectiveSensorRange: number;
  effectivePassiveRange: number;
  effectiveMissileRange: number;
  effectiveCMRange: number;
  effectiveBeamRange: number;
  effectivePDRange: number;
}

/**
 * Applies flat scalar research coefficients directly against explicit baseline constants.
 * Radar (8,400 km) and passive (25,200 km base = 3x) scale independently via radarMultiplier
 * and passiveMultiplier.
 */
export function calculateEffectiveTacticalRanges(
  modifiers?: TacticalRangeModifiers
): EffectiveTacticalRanges {
  const radarMult = modifiers?.radarMultiplier ?? modifiers?.radarRangeMult ?? modifiers?.sensorRangeMult ?? 1.0;
  const passiveMult = modifiers?.passiveMultiplier ?? modifiers?.passiveRangeMult ?? 1.0;
  const missileRangeMult = modifiers?.missileRangeMult ?? 1.0;
  const cmRangeMult = modifiers?.cmRangeMult ?? 1.0;
  const beamRangeMult = modifiers?.beamRangeMult ?? 1.0;
  const pdRangeMult = modifiers?.pdRangeMult ?? 1.0;

  const effectiveRadarRange = BASE_TACTICAL_RANGES.sensorRangeKm * radarMult;
  const effectivePassiveRange = (BASE_TACTICAL_RANGES.sensorRangeKm * 3.0) * passiveMult;

  return {
    effectiveRadarRange,
    effectiveSensorRange: effectiveRadarRange,
    effectivePassiveRange,
    effectiveMissileRange: BASE_TACTICAL_RANGES.missileLockRangeKm * missileRangeMult,
    effectiveCMRange: BASE_TACTICAL_RANGES.counterMissileRangeKm * cmRangeMult,
    effectiveBeamRange: BASE_TACTICAL_RANGES.offensiveBeamRangeKm * beamRangeMult,
    effectivePDRange: BASE_TACTICAL_RANGES.pointDefenseRangeKm * pdRangeMult,
  };
}

export type ContactDetectionLevel = 'NONE' | 'SENSOR_BLIP' | 'VISUAL_LOCK';

/**
 * Evaluates whether a contact is beyond detection, detected as a raw directional sensor blip,
 * or within the visual / full missile lock envelope.
 */
export function evaluateContactDetection(
  friendlyPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  effectiveSensorRange: number = BASE_TACTICAL_RANGES.sensorRangeKm,
  effectiveMissileRange: number = BASE_TACTICAL_RANGES.missileLockRangeKm
): ContactDetectionLevel {
  const dx = targetPos.x - friendlyPos.x;
  const dy = targetPos.y - friendlyPos.y;
  const distSq = dx * dx + dy * dy;

  if (distSq <= effectiveMissileRange * effectiveMissileRange) {
    return 'VISUAL_LOCK';
  }
  if (distSq <= effectiveSensorRange * effectiveSensorRange) {
    return 'SENSOR_BLIP';
  }
  return 'NONE';
}

/**
 * Derives Radar Cross Section (RCS) weight from ship role or mass for cluster weighting.
 */
export function resolveRCSWeight(target: any): number {
  if (!target) return 3;
  if (typeof target.rcsWeight === 'number' && target.rcsWeight > 0) {
    return target.rcsWeight;
  }
  const role = (target.role ?? '').toUpperCase();
  switch (role) {
    case 'SCOUT':
    case 'PROBE':
      return 1;
    case 'MINER':
    case 'PROSPECTOR':
    case 'BUILDER':
      return 2;
    case 'FRIGATE':
    case 'CORVETTE':
      return 3;
    case 'DESTROYER':
    case 'COLLIER':
    case 'TANKER':
      return 5;
    case 'CRUISER':
    case 'BASTION':
    case 'REPAIR_BAY':
      return 8;
    case 'BATTLESHIP':
    case 'DREADNOUGHT':
    case 'CARRIER':
    case 'HQ':
    case 'SHIPYARD':
      return 12;
    default:
      if (typeof target.massRating === 'number') {
        return Math.max(1, Math.min(15, Math.round(target.massRating / 100)));
      }
      return 3;
  }
}

export interface SensorEmitter {
  id: string;
  name: string;
  x: number;
  y: number;
  radarRange: number;
  radarRangeSq: number;
  passiveRange: number;
  passiveRangeSq: number;
}

export interface GameState {
  ships?: ShipEntity[];
  structures?: ShipEntity[];
  hostileEntities?: ShipEntity[];
  activeBlips?: SensorBlip[];
  sensorRangeMult?: number;
  combatModifiers?: TacticalRangeModifiers;
  simulationTick?: number;
  [key: string]: any;
}

// -----------------------------------------------------------------------------
// 2. ZERO-ALLOCATION CLUSTERING BUFFER POOLS
// Pre-allocated typed arrays and reusable blip instances to eliminate per-tick GC
// -----------------------------------------------------------------------------
export const MAX_BLIPS = 256;
export const BLIP_X = new Float32Array(MAX_BLIPS);
export const BLIP_Y = new Float32Array(MAX_BLIPS);
export const BLIP_MASS = new Uint16Array(MAX_BLIPS);
export const BLIP_HEADING = new Float32Array(MAX_BLIPS);
export const BLIP_SOURCE_ID: string[] = new Array(MAX_BLIPS).fill('');
export const BLIP_SOURCE_ROLE: string[] = new Array(MAX_BLIPS).fill('');
export const BLIP_SOURCE_NAME: string[] = new Array(MAX_BLIPS).fill('');
const BLIP_VISITED = new Uint8Array(MAX_BLIPS);

export const MAX_CLUSTERS = 128;
export const CLUSTER_POOL: SensorBlip[] = [];
for (let i = 0; i < MAX_CLUSTERS; i++) {
  CLUSTER_POOL.push({
    x: 0,
    y: 0,
    rcsWeight: 0,
    sourceId: '',
    sourceRole: '',
    sourceName: '',
    sourceHeading: 0,
    count: 1,
    clusterRadius: 10,
  });
}
export const ACTIVE_CLUSTERS_CACHE: SensorBlip[] = [];

// -----------------------------------------------------------------------------
// 3. SPATIAL PARTITIONING & EMITTER POOLS
// -----------------------------------------------------------------------------
export const MAX_EMITTERS = 128;
export const EMITTER_POOL: SensorEmitter[] = [];
for (let i = 0; i < MAX_EMITTERS; i++) {
  EMITTER_POOL.push({
    id: '',
    name: '',
    x: 0,
    y: 0,
    radarRange: 8400,
    radarRangeSq: 8400 * 8400,
    passiveRange: 25200,
    passiveRangeSq: 25200 * 25200,
  });
}
export const EMITTERS_SCRATCH: SensorEmitter[] = [];
const VISITED_EMITTER_IDS = new Set<string>();

export interface FleetSensorBoundingSphere {
  centroidX: number;
  centroidY: number;
  maxPassiveRadius: number;
  maxPassiveRadiusSq: number;
  emitterCount: number;
}

export const fleetBoundingSphere: FleetSensorBoundingSphere = {
  centroidX: 0,
  centroidY: 0,
  maxPassiveRadius: 0,
  maxPassiveRadiusSq: 0,
  emitterCount: 0,
};

/**
 * Identifies all allied active sensor emitters (ships, structures, stations) and computes
 * their effective radar (8,400 km) and passive (25,200 km) envelopes.
 * Caches the fleet centroid and maximum combined detection reach for spatial partitioning.
 */
export function getAlliedSensorEmitters(state: GameState): SensorEmitter[] {
  EMITTERS_SCRATCH.length = 0;
  VISITED_EMITTER_IDS.clear();

  const ships = state.ships;
  const radarMult = state.sensorRangeMult ?? state.combatModifiers?.sensorRangeMult ?? 1.0;
  const passiveMult = state.combatModifiers?.passiveRangeMult ?? radarMult;

  const baseRadar = BASE_TACTICAL_RANGES.radarRangeKm;
  const radarRange = baseRadar * radarMult;
  const passiveRange = BASE_TACTICAL_RANGES.passiveRangeKm * passiveMult;
  const radarRangeSq = radarRange * radarRange;
  const passiveRangeSq = passiveRange * passiveRange;

  let emitterCount = 0;

  if (ships) {
    for (let i = 0, len = ships.length; i < len; i++) {
      const s = ships[i];
      if (!s || s.faction !== 'FRIENDLY' || s.hullState === 'DESTROYED' || s.isUnderConstruction) continue;
      if (VISITED_EMITTER_IDS.has(s.id)) continue;
      VISITED_EMITTER_IDS.add(s.id);

      if (emitterCount >= MAX_EMITTERS) break;
      const em = EMITTER_POOL[emitterCount++];
      em.id = s.id;
      em.name = s.name;
      em.x = s.pos?.x ?? (s as any).x ?? 0;
      em.y = s.pos?.y ?? (s as any).y ?? 0;
      em.radarRange = radarRange;
      em.radarRangeSq = radarRangeSq;
      em.passiveRange = passiveRange;
      em.passiveRangeSq = passiveRangeSq;
      EMITTERS_SCRATCH.push(em);
    }
  }

  const structures = state.structures;
  if (structures && Array.isArray(structures)) {
    for (let i = 0, len = structures.length; i < len; i++) {
      const st = structures[i];
      if (!st || st.faction !== 'FRIENDLY' || st.hullState === 'DESTROYED' || st.isUnderConstruction) continue;
      if (VISITED_EMITTER_IDS.has(st.id)) continue;
      VISITED_EMITTER_IDS.add(st.id);

      if (emitterCount >= MAX_EMITTERS) break;
      const em = EMITTER_POOL[emitterCount++];
      em.id = st.id;
      em.name = st.name;
      em.x = st.pos?.x ?? (st as any).x ?? 0;
      em.y = st.pos?.y ?? (st as any).y ?? 0;
      em.radarRange = radarRange;
      em.radarRangeSq = radarRangeSq;
      em.passiveRange = passiveRange;
      em.passiveRangeSq = passiveRangeSq;
      EMITTERS_SCRATCH.push(em);
    }
  }

  // Update Fleet Centroid and Max Detection Envelope for Spatial Partitioning
  fleetBoundingSphere.emitterCount = emitterCount;
  if (emitterCount === 0) {
    fleetBoundingSphere.centroidX = 0;
    fleetBoundingSphere.centroidY = 0;
    fleetBoundingSphere.maxPassiveRadius = 0;
    fleetBoundingSphere.maxPassiveRadiusSq = 0;
    return EMITTERS_SCRATCH;
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < emitterCount; i++) {
    sumX += EMITTERS_SCRATCH[i].x;
    sumY += EMITTERS_SCRATCH[i].y;
  }
  const centroidX = sumX / emitterCount;
  const centroidY = sumY / emitterCount;
  fleetBoundingSphere.centroidX = centroidX;
  fleetBoundingSphere.centroidY = centroidY;

  let maxPassiveReach = 0;
  for (let i = 0; i < emitterCount; i++) {
    const em = EMITTERS_SCRATCH[i];
    const dx = em.x - centroidX;
    const dy = em.y - centroidY;
    const distFromCentroid = Math.sqrt(dx * dx + dy * dy);
    const reach = distFromCentroid + em.passiveRange;
    if (reach > maxPassiveReach) {
      maxPassiveReach = reach;
    }
  }

  fleetBoundingSphere.maxPassiveRadius = maxPassiveReach;
  fleetBoundingSphere.maxPassiveRadiusSq = maxPassiveReach * maxPassiveReach;

  return EMITTERS_SCRATCH;
}

/**
 * Zero-allocation clustering directly from pre-allocated typed arrays.
 * Merges close-proximity passive echoes into single tactical contact clusters without throwaways.
 */
export function clusterFromTypedBuffers(blipCount: number, clusterRadiusKm: number = 800): SensorBlip[] {
  ACTIVE_CLUSTERS_CACHE.length = 0;
  if (blipCount === 0) return ACTIVE_CLUSTERS_CACHE;

  const clusterRadiusSq = clusterRadiusKm * clusterRadiusKm;
  BLIP_VISITED.fill(0, 0, blipCount);

  let clusterCount = 0;
  for (let i = 0; i < blipCount; i++) {
    if (BLIP_VISITED[i] === 1) continue;
    BLIP_VISITED[i] = 1;

    let totalWeight = BLIP_MASS[i];
    let sumX = BLIP_X[i] * totalWeight;
    let sumY = BLIP_Y[i] * totalWeight;
    let memberCount = 1;
    const leadIdx = i;

    for (let j = i + 1; j < blipCount; j++) {
      if (BLIP_VISITED[j] === 1) continue;
      const dx = BLIP_X[i] - BLIP_X[j];
      const dy = BLIP_Y[i] - BLIP_Y[j];
      if (dx * dx + dy * dy <= clusterRadiusSq) {
        BLIP_VISITED[j] = 1;
        const w = BLIP_MASS[j];
        totalWeight += w;
        sumX += BLIP_X[j] * w;
        sumY += BLIP_Y[j] * w;
        memberCount++;
      }
    }

    if (clusterCount < MAX_CLUSTERS) {
      const cl = CLUSTER_POOL[clusterCount++];
      cl.x = sumX / totalWeight;
      cl.y = sumY / totalWeight;
      cl.rcsWeight = totalWeight;
      cl.sourceId = BLIP_SOURCE_ID[leadIdx];
      cl.sourceHeading = BLIP_HEADING[leadIdx];
      cl.count = memberCount;
      if (memberCount === 1) {
        cl.sourceRole = BLIP_SOURCE_ROLE[leadIdx];
        cl.sourceName = BLIP_SOURCE_NAME[leadIdx];
        cl.clusterRadius = Math.max(10, Math.min(18, 9 + Math.sqrt(totalWeight) * 2.0));
      } else {
        cl.sourceRole = 'FLEET_GROUP';
        cl.sourceName = `${memberCount}x UNRESOLVED CONTACTS`;
        cl.clusterRadius = Math.min(18, Math.max(10, 10 + Math.sqrt(totalWeight) * 1.5));
      }
      ACTIVE_CLUSTERS_CACHE.push(cl);
    }
  }

  return ACTIVE_CLUSTERS_CACHE;
}

/**
 * Backward-compatible clustering function accepting SensorBlip arrays.
 * Eliminates array slicing and recursive cluster merges.
 */
export function clusterPassiveBlips(
  passiveBlips: SensorBlip[],
  clusterRadiusKm: number = 800
): SensorBlip[] {
  if (!passiveBlips || passiveBlips.length === 0) {
    ACTIVE_CLUSTERS_CACHE.length = 0;
    return ACTIVE_CLUSTERS_CACHE;
  }

  const count = Math.min(passiveBlips.length, MAX_BLIPS);
  for (let i = 0; i < count; i++) {
    const b = passiveBlips[i];
    BLIP_X[i] = b.x;
    BLIP_Y[i] = b.y;
    BLIP_MASS[i] = b.rcsWeight || 3;
    BLIP_HEADING[i] = b.sourceHeading ?? 0;
    BLIP_SOURCE_ID[i] = b.sourceId ?? '';
    BLIP_SOURCE_ROLE[i] = b.sourceRole ?? '';
    BLIP_SOURCE_NAME[i] = b.sourceName ?? '';
  }

  return clusterFromTypedBuffers(count, clusterRadiusKm);
}

let sensorTickCounter = 0;

/**
 * Evaluates tactical sensor sweeps across all hostile and neutral entities.
 * Enforces two-tier detection architecture with spatial partitioning:
 * - Outside Fleet Centroid Max Envelope: 'HIDDEN' (bypasses emitter distance checks in O(1))
 * - Inside Active Radar (<= 8,400 km): 'RESOLVED' (full hull, class, facing, health bars)
 * - Inside Passive Horizon (<= 25,200 km): 'BLIP_ONLY' (coarse contact echo blip, throttled to 6Hz)
 * - Beyond Passive Horizon (> 25,200 km): 'HIDDEN' (completely obscured)
 */
export function updateSensorsAndFogOfWar(state: GameState, simulationTick?: number): void {
  const tick = simulationTick !== undefined ? simulationTick : ++sensorTickCounter;
  const emitters = getAlliedSensorEmitters(state);
  const emitterCount = fleetBoundingSphere.emitterCount;

  const hostiles = state.hostileEntities || state.ships;
  if (!hostiles) {
    state.activeBlips = ACTIVE_CLUSTERS_CACHE;
    return;
  }

  let blipCount = 0;
  const maxPassiveSq = fleetBoundingSphere.maxPassiveRadiusSq;
  const centX = fleetBoundingSphere.centroidX;
  const centY = fleetBoundingSphere.centroidY;

  for (let j = 0, hLen = hostiles.length; j < hLen; j++) {
    const target = hostiles[j];
    if (!target || target.faction === 'FRIENDLY') continue;

    const isAlive = target.isAlive !== undefined ? target.isAlive : target.hullState !== 'DESTROYED';
    if (!isAlive) {
      target.visibilityState = 'HIDDEN';
      continue;
    }

    const targetX = target.pos ? target.pos.x : ((target as any).x ?? 0);
    const targetY = target.pos ? target.pos.y : ((target as any).y ?? 0);

    // Keep top-level coordinate mirrors populated
    (target as any).x = targetX;
    (target as any).y = targetY;

    if (emitterCount === 0) {
      target.visibilityState = 'HIDDEN';
      continue;
    }

    // SPATIAL PARTITIONING FOR EMITTER SWEEPS:
    // If target is beyond max combined detection reach from fleet centroid, skip individual emitter checks
    const dxCent = targetX - centX;
    const dyCent = targetY - centY;
    const distToCentroidSq = dxCent * dxCent + dyCent * dyCent;

    if (distToCentroidSq > maxPassiveSq) {
      target.visibilityState = 'HIDDEN';
      continue;
    }

    // Within bounding envelope - evaluate emitters with early exit on active radar
    let isInsideActiveRadar = false;
    let isInsidePassive = false;

    for (let i = 0; i < emitterCount; i++) {
      const emitter = emitters[i];
      const dx = targetX - emitter.x;
      const dy = targetY - emitter.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= emitter.radarRangeSq) {
        isInsideActiveRadar = true;
        break; // Active radar early exit
      }

      if (distSq <= emitter.passiveRangeSq) {
        isInsidePassive = true;
      }
    }

    if (isInsideActiveRadar) {
      target.visibilityState = 'RESOLVED';
    } else if (isInsidePassive) {
      target.visibilityState = 'BLIP_ONLY';
      const rcsWeight = resolveRCSWeight(target);
      target.rcsWeight = rcsWeight;

      if (blipCount < MAX_BLIPS) {
        BLIP_X[blipCount] = targetX;
        BLIP_Y[blipCount] = targetY;
        BLIP_MASS[blipCount] = Math.min(65535, Math.max(1, rcsWeight));
        BLIP_HEADING[blipCount] = target.heading ?? 0;
        BLIP_SOURCE_ID[blipCount] = target.id ?? '';
        BLIP_SOURCE_ROLE[blipCount] = target.role ?? '';
        BLIP_SOURCE_NAME[blipCount] = target.name ?? '';
        blipCount++;
      }
    } else {
      target.visibilityState = 'HIDDEN';
    }
  }

  // Throttle passive sensor clustering to 6Hz (every 5 simulation ticks at 30Hz)
  if (tick % 5 === 0 || ACTIVE_CLUSTERS_CACHE.length === 0) {
    clusterFromTypedBuffers(blipCount, 800);
  }
  state.activeBlips = ACTIVE_CLUSTERS_CACHE;
}
