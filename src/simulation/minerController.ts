import { ShipEntity, AsteroidEntity, AsteroidNode, Vec2D, MinerStance, MinerEntity, SolarSystem } from '../types';
import { GameState } from '../state/gameState';
import { computeSplineTangents, hermiteInterpolate, distSq } from './hermite';
import { issueMoveCommand, applyMinerApproachDeceleration, clearShipMovement } from './movementController';
import { clampAngularSlew } from './kinematics';

export type { MinerStance, MinerEntity };

/**
 * Localized Miner Target Acquisition:
 * Restrict miner AI to search for asteroids strictly within the miner's current star system.
 */
export function findAvailableAsteroid(miner: MinerEntity, state: GameState): AsteroidNode | null {
  const currentTick = state.simulationTick || 0;
  const currentSystemId = miner.systemId || 'SYS_1';

  // Query asteroids strictly belonging to this system
  const systemAsteroids = (state.asteroids || []).filter(a => a.systemId === currentSystemId && !a.isDepleted);

  let nearest: AsteroidNode | null = null;
  let nearestDistSq = Infinity;

  const minerX = miner.x !== undefined ? miner.x : (miner.pos?.x ?? 0);
  const minerY = miner.y !== undefined ? miner.y : (miner.pos?.y ?? 0);

  for (let i = 0; i < systemAsteroids.length; i++) {
    const ast = systemAsteroids[i];
    if (ast.oreRemaining <= 0) continue;

    // Check pirate hazard blacklist
    const blacklistExp = state.asteroidBlacklist?.get(ast.id);
    if (blacklistExp && currentTick < blacklistExp) continue;

    const astX = ast.x !== undefined ? ast.x : (ast.pos?.x ?? 0);
    const astY = ast.y !== undefined ? ast.y : (ast.pos?.y ?? 0);

    const distSqVal = (astX - minerX) ** 2 + (astY - minerY) ** 2;
    if (distSqVal < nearestDistSq) {
      nearestDistSq = distSqVal;
      nearest = ast;
    }
  }

  return nearest;
}

/**
 * Autonomous Miner Configuration Constants
 */
export const MINER_RADAR_ENVELOPE_KM = 8400.0; // Active radar detection envelope (8,400 km)
export const MINER_EVADE_CLEAR_TICKS = 300;    // 300 simulation ticks (10.0 seconds at 30Hz)
export const MINER_DANGER_RADIUS = 2000.0;     // Threat envelope threshold (2.0 * R_missile)
export const ASTEROID_THREAT_RADIUS = 2000.0;  // Hostile proximity that invalidates an asteroid for TIMID miners (2.0 * R_missile)
export const MINER_SAFE_HYSTERESIS = 2500.0;   // Buffer distance required to clear retreat mode
export const MINER_MINE_RATE = 50.0;           // Ore extracted per second
export const MINER_UNLOAD_RATE = 3000.0;       // Ore offloaded to HQ silos per second (high-speed offload: 100 Ore/tick or 3,000 Ore/s)
export const MINER_DOCKING_OFFLOAD_RATE_PER_SEC = 3000.0; // 3,000 Ore/s
export const MINER_DOCKING_OFFLOAD_RATE_PER_TICK = 100.0; // 100 Ore/tick at 30Hz
export const MINER_HOLD_CAPACITY = 1000.0;     // Standard miner hold capacity (1,000 raw ore)

/**
 * HQ & Orbital Refinery Ore Transfer Boundaries:
 * - HQ Ore Transfer Range (R_transfer): 250 km (~120px from HQ perimeter/docking collar)
 * - Approach Deceleration Horizon: 1.5 * R_transfer = 375 km
 */
export const HQ_ORE_TRANSFER_RANGE_KM = 250.0;
export const R_TRANSFER = 250.0;
export const HQ_ORE_TRANSFER_APPROACH_RANGE_KM = 375.0; // 1.5 * R_transfer

/**
 * Check whether a candidate asteroid is threatened by any active hostile ship or bastion.
 * Evaluates hostiles within 2.0 * R_missile.
 */
export function isAsteroidThreatened(
  ast: AsteroidEntity,
  hostiles: ShipEntity[],
  threatRadius = ASTEROID_THREAT_RADIUS
): boolean {
  const rSq = threatRadius * threatRadius;
  for (const hostile of hostiles) {
    if (hostile.hullState === 'DESTROYED') continue;
    if (distSq(ast.pos, hostile.pos) <= rSq) {
      return true;
    }
  }
  return false;
}

/**
 * Pure Stance-Driven Candidate Asteroid Selection.
 * - 'CARELESS': Nearest un-depleted asteroid strictly by min(distanceSq) regardless
 *              of enemy proximity, orbital boundaries, or planetary well edges.
 * - 'TIMID': Filters out all asteroids within 2.0 * R_missile of hostile entities.
 *            Returns nearest safe un-depleted node. If all nodes are threatened, returns null.
 */
export function findCandidateAsteroid(
  miner: ShipEntity,
  asteroids: AsteroidEntity[],
  hostiles: ShipEntity[],
  missileRange = 1000.0
): {
  asteroid: AsteroidEntity | null;
  reason?: 'ALL_NODES_THREATENED' | 'NO_ASTEROIDS' | 'NODE_FOUND';
  candidateCount: number;
  safeCount: number;
} {
  const currentSystemId = miner.systemId || 'SYS_1';
  const minerX = miner.pos.x;
  const minerY = miner.pos.y;
  const stance = miner.minerStance || 'TIMID';
  const effectiveThreatRadius = Math.max(missileRange * 2.0, ASTEROID_THREAT_RADIUS);

  // Pre-filter living hostiles in the miner's system
  const localHostiles: ShipEntity[] = [];
  for (let i = 0; i < hostiles.length; i++) {
    const h = hostiles[i];
    if (h.hullState !== 'DESTROYED' && (!h.systemId || h.systemId === currentSystemId)) {
      localHostiles.push(h);
    }
  }

  let nearestAst: AsteroidEntity | null = null;
  let minDistSq = Infinity;
  let candidateCount = 0;
  let safeCount = 0;

  for (let i = 0; i < asteroids.length; i++) {
    const ast = asteroids[i];
    if (ast.oreRemaining <= 0) continue;
    if (ast.systemId && ast.systemId !== currentSystemId) continue;
    candidateCount++;

    const dx = ast.pos.x - minerX;
    const dy = ast.pos.y - minerY;
    const dSq = dx * dx + dy * dy;

    if (stance === 'CARELESS') {
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearestAst = ast;
      }
    } else {
      // TIMID STANCE: Only test threat if this asteroid is closer than our current best safe candidate!
      if (dSq < minDistSq) {
        if (!isAsteroidThreatened(ast, localHostiles, effectiveThreatRadius)) {
          minDistSq = dSq;
          nearestAst = ast;
          safeCount++;
        }
      } else if (localHostiles.length === 0) {
        safeCount++;
      }
    }
  }

  if (!nearestAst) {
    return {
      asteroid: null,
      reason: candidateCount === 0 ? 'NO_ASTEROIDS' : 'ALL_NODES_THREATENED',
      candidateCount,
      safeCount,
    };
  }

  return {
    asteroid: nearestAst,
    reason: 'NODE_FOUND',
    candidateCount,
    safeCount: stance === 'CARELESS' ? candidateCount : Math.max(1, safeCount),
  };
}

/**
 * Scan for active hostile entities within threat radius (2.0 * R_missile) of the miner.
 */
export function getNearbyThreats(
  miner: ShipEntity,
  hostiles: ShipEntity[],
  dangerRadius = MINER_DANGER_RADIUS
): { threats: ShipEntity[]; nearestDist: number } {
  const threats: ShipEntity[] = [];
  let nearestDist = Infinity;
  const dangerSq = dangerRadius * dangerRadius;

  for (const h of hostiles) {
    if (h.hullState === 'DESTROYED') continue;
    const dSq = distSq(miner.pos, h.pos);
    if (dSq <= dangerSq) {
      threats.push(h);
      const d = Math.sqrt(dSq);
      if (d < nearestDist) {
        nearestDist = d;
      }
    }
  }

  return { threats, nearestDist };
}

/**
 * Calculates absolute world-space docking target offset at Fleet HQ.
 * Uses dynamic HQ docking perimeter safely nested within the ore drop-off transfer zone.
 */
export function getHQDockingTarget(miner: ShipEntity, hq: ShipEntity, transferRadius?: number): Vec2D {
  const isRing = Boolean(hq.isRingStructure || hq.hqType === 'GARN_RING_CITADEL' || hq.isGarnRing);
  const ringOuter = hq.ringOuterRadius || hq.radius || 1100;
  // Docking target should be positioned at the docking collar / ring perimeter (inside the transfer zone)
  const effectiveRadius = isRing
    ? (hq.dockingRadius || (ringOuter + 60.0))
    : (hq.dockingRadius || 140.0);
  const dx = miner.pos.x - hq.pos.x;
  const dy = miner.pos.y - hq.pos.y;
  const d = Math.hypot(dx, dy) || 1.0;
  return {
    x: hq.pos.x + (dx / d) * effectiveRadius,
    y: hq.pos.y + (dy / d) * effectiveRadius,
  };
}

/**
 * Calculates direct Euclidean distance between miner and Fleet HQ docking anchor:
 * D = sqrt((X_miner - X_HQ)^2 + (Y_miner - Y_HQ)^2)
 */
export function getHQDistance(miner: ShipEntity, hq: ShipEntity): number {
  const dx = miner.pos.x - hq.pos.x;
  const dy = miner.pos.y - hq.pos.y;
  return Math.hypot(dx, dy);
}

/**
 * Checks whether miner is within HQ Ore Transfer Range (dynamically modified by HQ specification).
 */
export function isWithinHQTransferRange(miner: ShipEntity, hq: ShipEntity, transferRadius?: number): boolean {
  const isRing = Boolean(hq.isRingStructure || hq.hqType === 'GARN_RING_CITADEL' || hq.isGarnRing);
  const ringOuter = hq.ringOuterRadius || hq.radius || 1100;
  const effectiveRadius = transferRadius ?? (isRing ? ringOuter + 250.0 : (hq.oreDropOffRange ?? hq.dockingRadius ?? R_TRANSFER));
  const dist = getHQDistance(miner, hq);
  if (isRing) {
    const minInnerRadius = (hq.ringInnerRadius || (ringOuter * (1.40 / 1.68))) - 100;
    return dist <= effectiveRadius + 40.0 && dist >= minInnerRadius;
  }
  return dist <= effectiveRadius + 40.0;
}

/**
 * Approach Deceleration Clamping & Retro-Braking:
 * As the miner approaches within 1.5 * effectiveRadius, clamps maximum thrust
 * and engages retro-braking to bleed off residual velocity before crossing the transfer boundary.
 */
export function applyMinerApproachBraking(
  miner: ShipEntity,
  hq: ShipEntity,
  dt: number,
  transferRadius?: number
): boolean {
  const isRing = Boolean(hq.isRingStructure || hq.hqType === 'GARN_RING_CITADEL' || hq.isGarnRing);
  const ringOuter = hq.ringOuterRadius || hq.radius || 1100;
  if (isRing) {
    // For annular ring structures, target the docking perimeter point (ringOuter + 60km)
    const target = getHQDockingTarget(miner, hq, ringOuter + 60.0);
    const dx = target.x - miner.pos.x;
    const dy = target.y - miner.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 60.0) return true;
    if (dist <= 250.0) {
      const curSpeed = Math.hypot(miner.velocity.x, miner.velocity.y);
      const aBrake = miner.acceleration ?? 220.0;
      const targetSpeed = Math.max(60.0, Math.sqrt(2.0 * aBrake * dist));
      if (curSpeed > targetSpeed && curSpeed > 0.001) {
        const scale = targetSpeed / curSpeed;
        miner.velocity.x *= scale;
        miner.velocity.y *= scale;
      }
    }
    return false;
  }
  const effectiveRadius = transferRadius ?? hq.oreDropOffRange ?? (hq.dockingRadius ?? R_TRANSFER);
  return applyMinerApproachDeceleration(miner, hq.pos, effectiveRadius, dt);
}

/**
 * Engages Docking & Synchronized Station-Keeping Hold:
 * - Transitions state from STATE_TRANSIT_TO_HQ to STATE_DOCKING_OFFLOAD
 * - Nullifies all linear and angular momentum (v = 0, omega = 0)
 * - Locks prospector coordinates relative to the HQ (or synchronized orbital hold at radius R_transfer)
 * - Suppresses standard flight waypoints and spline recalculations
 * - Activates visual industrial ore transfer beam
 */
export function engageMinerDockingStationKeeping(
  miner: ShipEntity,
  hq: ShipEntity,
  transferRadius?: number
): void {
  // 1. Transition state
  miner.minerState = 'STATE_DOCKING_OFFLOAD';

  // 2. Nullify all linear and angular momentum
  miner.velocity = { x: 0, y: 0 };
  if (miner.angularVelocity !== undefined) {
    miner.angularVelocity = 0;
  }

  // 3. Suppress standard flight waypoints and spline recalculations
  clearShipMovement(miner);

  // 4. Lock coordinates relative to HQ at transfer perimeter
  const isRing = Boolean(hq.isRingStructure || hq.hqType === 'GARN_RING_CITADEL' || hq.isGarnRing);
  const ringOuter = hq.ringOuterRadius || hq.radius || 1100;
  const effectiveLimit = transferRadius ?? hq.oreDropOffRange ?? (isRing ? ringOuter + 250.0 : R_TRANSFER);

  const dx = miner.pos.x - hq.pos.x;
  const dy = miner.pos.y - hq.pos.y;
  const d = Math.hypot(dx, dy) || 1.0;
  const holdRadius = isRing
    ? (hq.dockingRadius || (ringOuter + 60.0))
    : Math.min(Math.max(d, 100.0), hq.dockingRadius || 140.0);

  miner.minerHQOffset = {
    x: (dx / d) * holdRadius,
    y: (dy / d) * holdRadius,
  };
  miner.pos.x = hq.pos.x + miner.minerHQOffset.x;
  miner.pos.y = hq.pos.y + miner.minerHQOffset.y;

  // Orient heading towards HQ docking collar
  miner.heading = Math.atan2(-miner.minerHQOffset.y, -miner.minerHQOffset.x);

  miner.isStationKeeping = true;
  miner.isMoored = false;
  miner.isHoldingVector = false;

  // 5. Connect visual industrial ore transfer conduit (targeting outer edge of ring or HQ core)
  miner.transferBeamActive = true;
  miner.transferBeamTarget = isRing
    ? { x: hq.pos.x + (dx / d) * ringOuter, y: hq.pos.y + (dy / d) * ringOuter }
    : { x: hq.pos.x, y: hq.pos.y };
}

/**
 * Synchronized Station-Keeping Hold Tick:
 * Maintains strict relative lock to HQ coordinates as HQ traverses geosynchronous orbit.
 */
export function updateMinerDockingStationKeeping(miner: ShipEntity, hq: ShipEntity): void {
  const isRing = Boolean(hq.isRingStructure || hq.hqType === 'GARN_RING_CITADEL' || hq.isGarnRing);
  const ringOuter = hq.ringOuterRadius || hq.radius || 1100;
  const maxR = hq.oreDropOffRange || (isRing ? ringOuter + 250.0 : R_TRANSFER);

  if (!miner.minerHQOffset) {
    const dx = miner.pos.x - hq.pos.x;
    const dy = miner.pos.y - hq.pos.y;
    const d = Math.hypot(dx, dy) || 1.0;
    const holdDist = isRing ? (hq.dockingRadius || (ringOuter + 60.0)) : Math.min(d, hq.dockingRadius || 140.0);
    miner.minerHQOffset = {
      x: (dx / d) * holdDist,
      y: (dy / d) * holdDist,
    };
  }

  miner.pos.x = hq.pos.x + miner.minerHQOffset.x;
  miner.pos.y = hq.pos.y + miner.minerHQOffset.y;
  miner.velocity = { x: 0, y: 0 };
  if (miner.angularVelocity !== undefined) {
    miner.angularVelocity = 0;
  }
  miner.splineActive = false;
  miner.heading = Math.atan2(-miner.minerHQOffset.y, -miner.minerHQOffset.x);

  // Maintain active transfer conduit link to HQ
  const dx = miner.pos.x - hq.pos.x;
  const dy = miner.pos.y - hq.pos.y;
  const d = Math.hypot(dx, dy) || 1.0;
  miner.transferBeamActive = true;
  miner.transferBeamTarget = isRing
    ? { x: hq.pos.x + (dx / d) * ringOuter, y: hq.pos.y + (dy / d) * ringOuter }
    : { x: hq.pos.x, y: hq.pos.y };
}

/**
 * Releases station-keeping lock and disengages transfer conduit.
 */
export function releaseMinerDockingStationKeeping(miner: ShipEntity): void {
  miner.isStationKeeping = false;
  miner.minerHQOffset = undefined;
  miner.transferBeamActive = false;
  miner.transferBeamTarget = null;
}

/**
 * High-Speed Cargo Offload into HQ Ore Silos:
 * Transfers ore at 3,000 Ore/s (100 Ore/tick at 30Hz).
 * Clamps transfer if HQ ore storage capacity is reached, holding the prospector stationary in queue.
 */
export function stepMinerCargoOffload(
  miner: ShipEntity,
  hq: ShipEntity,
  dt: number,
  speedMult = 1.0
): { transferred: number; hqFull: boolean; holdEmpty: boolean } {
  if (!hq.resources) {
    hq.resources = { ore: 0, maxOre: 16000, metallic: 0, maxMetallic: 100000, organic: 0, maxOrganic: 100000 };
  }
  const maxOre = hq.resources.maxOre || 16000;
  const currentOre = hq.resources.ore || 0;
  const availableSpace = Math.max(0, maxOre - currentOre);

  if (availableSpace <= 0.01) {
    // Clamped: HQ ore silos are full. Miner remains stationary in queue.
    return { transferred: 0, hqFull: true, holdEmpty: (miner.cargoOre || 0) <= 0 };
  }

  const currentCargo = miner.cargoOre || 0;
  if (currentCargo <= 0) {
    miner.cargoOre = 0;
    return { transferred: 0, hqFull: false, holdEmpty: true };
  }

  // 3,000 Ore/s (100 Ore/tick at 30Hz) boosted by research turnaround speed
  const transferBudget = MINER_DOCKING_OFFLOAD_RATE_PER_SEC * speedMult * dt;
  const actualTransfer = Math.min(currentCargo, availableSpace, transferBudget);

  miner.cargoOre = Math.max(0, currentCargo - actualTransfer);
  hq.resources.ore = Math.min(maxOre, currentOre + actualTransfer);

  return {
    transferred: actualTransfer,
    hqFull: hq.resources.ore >= maxOre,
    holdEmpty: miner.cargoOre <= 0,
  };
}

/**
 * Automated Return-To-Mine Dispatch Loop:
 * Triggered when cargo is completely emptied (cargoOre <= 0).
 * Releases station-keeping lock, switches state to STATE_TRANSIT_TO_ASTEROID,
 * generates a clean straight-line departure spline directed away from HQ collision boundary,
 * and accelerates smoothly to cruise speed.
 */
export function dispatchMinerReturnToAsteroids(
  miner: ShipEntity,
  hq: ShipEntity,
  targetAsteroid: AsteroidEntity
): void {
  // 1. Release station-keeping hold
  releaseMinerDockingStationKeeping(miner);

  // 2. Switch state to transit
  miner.minerState = 'STATE_TRANSIT_TO_ASTEROID';
  miner.minerTargetAsteroidId = targetAsteroid.id;

  // 3. Generate departure vector directed away from HQ collision boundary
  const dx = miner.pos.x - hq.pos.x;
  const dy = miner.pos.y - hq.pos.y;
  const d = Math.hypot(dx, dy) || 1.0;
  const awayUnitX = dx / d;
  const awayUnitY = dy / d;

  // Clear HQ docking collar with departure offset
  const departurePoint: Vec2D = {
    x: miner.pos.x + awayUnitX * 60.0,
    y: miner.pos.y + awayUnitY * 60.0,
  };

  miner.pos.x = departurePoint.x;
  miner.pos.y = departurePoint.y;

  // Orient towards target asteroid
  const astDx = targetAsteroid.pos.x - miner.pos.x;
  const astDy = targetAsteroid.pos.y - miner.pos.y;
  miner.heading = Math.atan2(astDy, astDx);

  // Launch clean cruise burn
  const cruiseSpd = miner.cruiseSpeed || (miner.maxSpeed ? miner.maxSpeed * 0.75 : 600.0);
  launchMinerSpline(miner, targetAsteroid.pos, cruiseSpd);
}

/**
 * Launches an uninhibited kinematic Hermite spline directly in absolute world space
 * from current miner position (X_miner, Y_miner) to target world position (X_target, Y_target).
 * Completely immune to gravity well capture, orbital drift offsets, or reference frame translations.
 */
export function launchMinerSpline(miner: ShipEntity, targetPos: Vec2D, maxSpeed?: number): void {
  const speedLimit = maxSpeed ?? miner.maxSpeed ?? 125.0;
  issueMoveCommand(miner, targetPos, speedLimit);
}

/**
 * Clamps miner to an asteroid during STATE_MINE at zero relative velocity.
 * Matches moving asteroid / cluster orbital progression only while clamped.
 */
export function clampMinerToAsteroid(miner: ShipEntity, asteroid: AsteroidEntity): void {
  miner.minerClamped = true;
  miner.splineActive = false;
  miner.velocity = { x: 0, y: 0 };
  miner.isMoored = false;
  miner.isHoldingVector = false;

  const dx = miner.pos.x - asteroid.pos.x;
  const dy = miner.pos.y - asteroid.pos.y;
  const d = Math.hypot(dx, dy) || 1.0;
  const tetherDist = Math.max(asteroid.radius + 15.0, Math.min(d, asteroid.radius + 35.0));
  miner.minerClampedOffset = {
    x: (dx / d) * tetherDist,
    y: (dy / d) * tetherDist,
  };
  miner.pos.x = asteroid.pos.x + miner.minerClampedOffset.x;
  miner.pos.y = asteroid.pos.y + miner.minerClampedOffset.y;
  miner.heading = Math.atan2(-miner.minerClampedOffset.y, -miner.minerClampedOffset.x);
}

/**
 * Unclamps miner from asteroid immediately.
 * Re-enables absolute world-space flight.
 */
export function unclampMiner(miner: ShipEntity): void {
  miner.minerClamped = false;
  miner.minerClampedOffset = undefined;
  miner.miningLaserActive = false;
  miner.miningLaserTarget = null;
}

/**
 * Check whether a vessel is an autonomous miner exempt from gravity well capture.
 */
export function isMinerVessel(ship: ShipEntity): boolean {
  return ship.role === 'MINER' || ship.isMiningVessel === true || (ship as any).type === 'MINER';
}

/**
 * Check whether miner is under transit thrust (STATE_SEEK, STATE_RETURN, active spline, or propulsion)
 * and therefore strictly exempt from orbital reference frame translations and mooring.
 */
export function isMinerInTransitThrust(ship: ShipEntity): boolean {
  if (!isMinerVessel(ship)) return false;
  return (
    ship.minerState === 'STATE_SEEK' ||
    ship.minerState === 'STATE_RETURN' ||
    ship.minerState === 'STATE_EVADING_HOSTILE' ||
    ship.splineActive === true ||
    ship.minerRetreating === true ||
    Math.hypot(ship.velocity.x, ship.velocity.y) > 0.05
  );
}

/**
 * Locate nearest allied sanctuary:
 * 1. Friendly HQ station
 * 2. Orbital refinery (vessel with refineryRate or role === 'HQ')
 * 3. Allied celestial gravity well center (e.g. Earth, HQ planet)
 */
export function findNearestAlliedSanctuary(
  miner: ShipEntity,
  hq: ShipEntity | null,
  friendlies: ShipEntity[],
  solarSystem?: SolarSystem
): { pos: Vec2D; name: string } | null {
  let nearestPos: Vec2D | null = null;
  let nearestDistSq = Infinity;
  let nearestName = 'Fleet Sanctuary';

  // 1. HQ Station
  if (hq && hq.hullState !== 'DESTROYED') {
    const dSq = distSq(miner.pos, hq.pos);
    nearestPos = hq.pos;
    nearestDistSq = dSq;
    nearestName = hq.name || 'Fleet HQ';
  }

  // 2. Friendly orbital refineries
  for (const f of friendlies) {
    if (f.id === miner.id || f.hullState === 'DESTROYED') continue;
    if (f.refineryRate && f.refineryRate > 0) {
      const dSq = distSq(miner.pos, f.pos);
      if (dSq < nearestDistSq) {
        nearestDistSq = dSq;
        nearestPos = f.pos;
        nearestName = f.name;
      }
    }
  }

  // 3. Allied celestial gravity wells (e.g. rocky planets)
  if (solarSystem) {
    for (const p of solarSystem.rockyPlanets) {
      const dSq = distSq(miner.pos, p.pos);
      if (dSq < nearestDistSq) {
        nearestDistSq = dSq;
        nearestPos = p.pos;
        nearestName = p.name;
      }
    }
  }

  return nearestPos ? { pos: nearestPos, name: nearestName } : null;
}

/**
 * Calculates dedicated Timid evasion vector:
 * V_threat = P_threat - P_miner
 * V_evasion = normalize(P_miner - P_threat)
 * Blended with burn vector toward nearest allied sanctuary (gravity well, orbital refinery, or HQ station)
 */
export function computeMinerEvasionVector(
  miner: ShipEntity,
  threats: ShipEntity[],
  hq: ShipEntity | null,
  friendlies: ShipEntity[],
  solarSystem?: SolarSystem
): Vec2D {
  if (threats.length === 0) {
    const sanctuary = findNearestAlliedSanctuary(miner, hq, friendlies, solarSystem);
    if (sanctuary) {
      const dx = sanctuary.pos.x - miner.pos.x;
      const dy = sanctuary.pos.y - miner.pos.y;
      const d = Math.hypot(dx, dy) || 1.0;
      return { x: dx / d, y: dy / d };
    }
    return { x: 1, y: 0 };
  }

  // Find nearest hostile threat
  let nearestThreat = threats[0];
  let minThreatDistSq = distSq(miner.pos, threats[0].pos);
  for (let i = 1; i < threats.length; i++) {
    const d = distSq(miner.pos, threats[i].pos);
    if (d < minThreatDistSq) {
      minThreatDistSq = d;
      nearestThreat = threats[i];
    }
  }

  // Threat vector = P_threat - P_miner
  // Evasion vector = normalize(P_miner - P_threat)
  const evDx = miner.pos.x - nearestThreat.pos.x;
  const evDy = miner.pos.y - nearestThreat.pos.y;
  const evDist = Math.hypot(evDx, evDy) || 1.0;
  const unitEvX = evDx / evDist;
  const unitEvY = evDy / evDist;

  // Sanctuary attraction
  const sanctuary = findNearestAlliedSanctuary(miner, hq, friendlies, solarSystem);
  let sancUnitX = unitEvX;
  let sancUnitY = unitEvY;
  let hasSanctuary = false;

  if (sanctuary) {
    const sDx = sanctuary.pos.x - miner.pos.x;
    const sDy = sanctuary.pos.y - miner.pos.y;
    const sDist = Math.hypot(sDx, sDy);
    if (sDist > 50.0) {
      sancUnitX = sDx / sDist;
      sancUnitY = sDy / sDist;
      hasSanctuary = true;
    }
  }

  let finalX = unitEvX;
  let finalY = unitEvY;
  if (hasSanctuary) {
    // Blend: 60% evasion away from threat + 40% bearing toward sanctuary
    finalX = unitEvX * 0.60 + sancUnitX * 0.40;
    finalY = unitEvY * 0.60 + sancUnitY * 0.40;
  }

  const finalLen = Math.hypot(finalX, finalY) || 1.0;
  return { x: finalX / finalLen, y: finalY / finalLen };
}

/**
 * Calculate multi-source retreat steering vector:
 * Repulsion from hostile combatants + Attraction to HQ and friendly combat cover.
 */
export function computeRetreatVector(
  miner: ShipEntity,
  threats: ShipEntity[],
  hq: ShipEntity | null,
  friendlies: ShipEntity[]
): Vec2D {
  let repX = 0;
  let repY = 0;

  // 1. Repulsion from immediate hostile threats (inverse distance weighted)
  for (const threat of threats) {
    const dx = miner.pos.x - threat.pos.x;
    const dy = miner.pos.y - threat.pos.y;
    const dist = Math.max(Math.hypot(dx, dy), 1.0);
    const weight = Math.max(0.2, (MINER_DANGER_RADIUS - dist) / MINER_DANGER_RADIUS + 0.6);
    repX += (dx / dist) * weight;
    repY += (dy / dist) * weight;
  }

  // 2. Attraction towards friendly sanctuary (HQ Primary)
  let attX = 0;
  let attY = 0;
  if (hq) {
    const hdx = hq.pos.x - miner.pos.x;
    const hdy = hq.pos.y - miner.pos.y;
    const hDist = Math.max(Math.hypot(hdx, hdy), 1.0);
    attX += (hdx / hDist) * 1.6;
    attY += (hdy / hDist) * 1.6;
  }

  // 3. Attraction towards nearest friendly combat ship for defensive cover
  let nearestCombatDist = Infinity;
  let nearestCombatShip: ShipEntity | null = null;
  for (const f of friendlies) {
    if (f.id === miner.id || f.role === 'MINER' || f.hullState === 'DESTROYED') continue;
    const fd = Math.hypot(f.pos.x - miner.pos.x, f.pos.y - miner.pos.y);
    if (fd < nearestCombatDist) {
      nearestCombatDist = fd;
      nearestCombatShip = f;
    }
  }

  if (nearestCombatShip && nearestCombatDist > 100.0) {
    const fdx = nearestCombatShip.pos.x - miner.pos.x;
    const fdy = nearestCombatShip.pos.y - miner.pos.y;
    const fDist = Math.max(Math.hypot(fdx, fdy), 1.0);
    attX += (fdx / fDist) * 0.8;
    attY += (fdy / fDist) * 0.8;
  }

  const combinedX = repX * 2.2 + attX * 1.4;
  const combinedY = repY * 2.2 + attY * 1.4;
  const len = Math.hypot(combinedX, combinedY);

  if (len > 0.0001) {
    return { x: combinedX / len, y: combinedY / len };
  }

  // Default escape vector towards HQ if repulsion and attraction cancel out
  if (hq) {
    const hdx = hq.pos.x - miner.pos.x;
    const hdy = hq.pos.y - miner.pos.y;
    const hLen = Math.hypot(hdx, hdy);
    if (hLen > 0.001) return { x: hdx / hLen, y: hdy / hLen };
  }

  return { x: -1.0, y: 0.0 };
}

/**
 * Execute retreat steering step
 */
export function stepRetreatSteering(
  miner: ShipEntity,
  retreatDir: Vec2D,
  dt: number,
  hq: ShipEntity | null
) {
  const targetAngle = Math.atan2(retreatDir.y, retreatDir.x);
  
  // Smoothly rotate heading towards escape vector using wrapped radians
  miner.heading = clampAngularSlew(miner.heading, targetAngle, 4.0, dt);

  const speed = miner.maxSpeed * 1.05; // Maximum emergency evasive thrust
  miner.velocity = {
    x: Math.cos(miner.heading) * speed,
    y: Math.sin(miner.heading) * speed,
  };

  miner.pos.x += miner.velocity.x * dt;
  miner.pos.y += miner.velocity.y * dt;
  miner.splineActive = false;

  // If retreating and arrived at HQ ore transfer perimeter with cargo, transition to docking offload
  if (hq && (miner.cargoOre || 0) > 0) {
    if (isWithinHQTransferRange(miner, hq)) {
      engageMinerDockingStationKeeping(miner, hq);
    }
  }
}
