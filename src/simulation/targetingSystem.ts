import { ShipEntity, MissileEntity, Vec2D } from '../types';
import { BASE_TACTICAL_RANGES, TacticalRanges } from './sensorController';

export { type TacticalRanges, BASE_TACTICAL_RANGES };

export interface TargetingContext {
  ships: ShipEntity[];
  missiles: MissileEntity[];
  effectiveMissileRange: number;
  isTargetInFriendlyVisualRange?: (pos: Vec2D) => boolean;
}

// Module-scoped scratch vectors to eliminate dynamic object allocations
export const VEC_A: Vec2D = { x: 0, y: 0 };
export const VEC_B: Vec2D = { x: 0, y: 0 };

// Pre-allocated scratch scalars for high-frequency 30Hz loops
let scratchDx = 0;
let scratchDy = 0;
let scratchDistSq = 0;
let scratchClosestDistSq = Infinity;
let scratchBestTarget: ShipEntity | null = null;
let scratchEnvelope = 0;
let scratchEnvelopeSq = 0;
let scratchMaxPersistenceSq = 0;
let scratchThreatDx = 0;
let scratchThreatDy = 0;

/**
 * Fast deterministic integer hash of ship ID without string splitting or array allocation
 */
export function getShipIdHash(id: string): number {
  let hash = 0;
  for (let i = 0, len = id.length; i < len; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * ACQUIRE TARGETS (ZERO-ALLOCATION 30Hz TARGETING PIPELINE)
 *
 * Performance characteristics:
 * - O(1) Target-Stickiness: retains valid locked target within 1.20x envelope without full world sweep.
 * - Staggered Acquisition: non-firing ships refresh targets at 10Hz (staggered across 3 tick slices).
 * - Monomorphic indexed loops with cached array lengths. Strictly zero .filter/.map/allocations.
 * - Pure squared Euclidean distance comparisons (D^2 <= R^2) bypassing Math.sqrt().
 * - No hardcoded ship ID checks.
 */
export function acquireTargets(
  ship: ShipEntity,
  context: TargetingContext,
  simulationTick?: number,
  shipIndex?: number
): ShipEntity | null {
  if (ship.hullState === 'DESTROYED') {
    ship.targetEntityId = null;
    return null;
  }

  // PASSIVE posture or RETURNING_TO_PATROL suppresses all offensive targeting acquisition
  const stance = ship.combatStance;
  if (stance === 'PASSIVE' || ship.npcPatrolState?.behaviorState === 'RETURNING_TO_PATROL') {
    ship.targetEntityId = null;
    return null;
  }

  const isAggressive = stance === 'AGGRESSIVE' || (stance as string) === 'FIGHT' || Boolean(ship.autoFire);
  const isDefensive = stance === 'DEFENSIVE' || (stance as string) === 'DEFEND';
  if (!isAggressive && !isDefensive) {
    ship.targetEntityId = null;
    return null;
  }

  scratchEnvelope = context.effectiveMissileRange;
  scratchEnvelopeSq = scratchEnvelope * scratchEnvelope;
  // 1.20x target-stickiness envelope threshold
  const persistenceEnvelope = scratchEnvelope * 1.20;
  scratchMaxPersistenceSq = persistenceEnvelope * persistenceEnvelope;

  const doctrine = ship.aggressiveDoctrine || 'KILL';
  const allShips = context.ships;
  const shipCount = allShips.length;

  // 1. TARGET-STICKINESS CHECK
  // If the ship already holds a designated target, verify its validity in O(1) to O(N) single-lookup
  // without broad-phase scanning all hostiles.
  if (ship.targetEntityId) {
    for (let i = 0; i < shipCount; i++) {
      const candidate = allShips[i];
      if (candidate.id === ship.targetEntityId) {
        const candidateAlive = candidate.hullState !== 'DESTROYED' && candidate.hullHp > 0;
        const candidateHostile = candidate.faction !== ship.faction;
        const disableAllowed = !(doctrine === 'DISABLE' && candidate.hullState === 'CRIPPLED');
        const visualAllowed = !(
          ship.faction === 'FRIENDLY' &&
          context.isTargetInFriendlyVisualRange &&
          !context.isTargetInFriendlyVisualRange(candidate.pos)
        );

        if (candidateAlive && candidateHostile && disableAllowed && visualAllowed) {
          scratchDx = candidate.pos.x - ship.pos.x;
          scratchDy = candidate.pos.y - ship.pos.y;
          scratchDistSq = scratchDx * scratchDx + scratchDy * scratchDy;

          // Target remains within engagement envelope (or active radar envelope for NPC pursuit): keep lock!
          const maxPersistSq = ship.npcPatrolState?.behaviorState === 'PURSUIT_ENGAGE'
            ? Math.max(scratchMaxPersistenceSq, 8400.0 * 8400.0)
            : scratchMaxPersistenceSq;
          if (scratchDistSq <= maxPersistSq) {
            return candidate;
          }
        }
        break;
      }
    }

    // Target destroyed, crippled under DISABLE doctrine, or escaped 1.20x envelope
    ship.targetEntityId = null;
  }

  // 2. STAGGERED TARGET ACQUISITION SWEEPS
  // Non-firing ships offset broad-phase sweeps across 3 simulation tick slices (10Hz target refresh)
  // rather than re-evaluating every 30Hz frame.
  if (simulationTick !== undefined) {
    const isReloading = (ship.salvoCooldownTicksRemaining ?? 0) > 0;
    if (isReloading) {
      const shipSlice = ((shipIndex !== undefined ? shipIndex : getShipIdHash(ship.id)) % 3 + 3) % 3;
      const currentSlice = simulationTick % 3;
      if (shipSlice !== currentSlice) {
        // Non-firing ship waiting for its staggered 10Hz slice; skip costly broad-phase scan
        return null;
      }
    }
  }

  // 3. BROAD-PHASE TARGET SELECTION (SQUARED EUCLIDEAN DISTANCES ONLY)
  scratchClosestDistSq = Infinity;
  scratchBestTarget = null;

  if (isAggressive) {
    // AGGRESSIVE: Lock onto the closest hostile within the engagement envelope
    for (let i = 0; i < shipCount; i++) {
      const candidate = allShips[i];
      if (candidate.faction === ship.faction || candidate.hullState === 'DESTROYED' || candidate.hullHp <= 0) {
        continue;
      }
      if (doctrine === 'DISABLE' && candidate.hullState === 'CRIPPLED') {
        continue;
      }
      if (
        ship.faction === 'FRIENDLY' &&
        context.isTargetInFriendlyVisualRange &&
        !context.isTargetInFriendlyVisualRange(candidate.pos)
      ) {
        continue;
      }

      scratchDx = candidate.pos.x - ship.pos.x;
      scratchDy = candidate.pos.y - ship.pos.y;
      scratchDistSq = scratchDx * scratchDx + scratchDy * scratchDy;

      if (scratchDistSq <= scratchEnvelopeSq && scratchDistSq < scratchClosestDistSq) {
        scratchClosestDistSq = scratchDistSq;
        scratchBestTarget = candidate;
      }
    }

    if (scratchBestTarget) {
      ship.targetEntityId = scratchBestTarget.id;
      return scratchBestTarget;
    }
  } else if (isDefensive) {
    // DEFENSIVE: Targets hostiles actively firing on this ship or allied escorts within defensive sphere (600km)
    const defensiveSphereSq = 600.0 * 600.0;
    const missiles = context.missiles;
    const missileCount = missiles.length;

    for (let i = 0; i < shipCount; i++) {
      const candidate = allShips[i];
      if (candidate.faction === ship.faction || candidate.hullState === 'DESTROYED' || candidate.hullHp <= 0) {
        continue;
      }
      if (doctrine === 'DISABLE' && candidate.hullState === 'CRIPPLED') {
        continue;
      }
      if (
        ship.faction === 'FRIENDLY' &&
        context.isTargetInFriendlyVisualRange &&
        !context.isTargetInFriendlyVisualRange(candidate.pos)
      ) {
        continue;
      }

      scratchDx = candidate.pos.x - ship.pos.x;
      scratchDy = candidate.pos.y - ship.pos.y;
      scratchDistSq = scratchDx * scratchDx + scratchDy * scratchDy;
      if (scratchDistSq > scratchEnvelopeSq) continue;

      let isActivelyAttacking = candidate.targetEntityId === ship.id;

      // Check if hostile is attacking allied escort within defensive sphere
      if (!isActivelyAttacking && candidate.targetEntityId) {
        for (let a = 0; a < shipCount; a++) {
          const ally = allShips[a];
          if (ally.faction === ship.faction && ally.id === candidate.targetEntityId && ally.hullState !== 'DESTROYED') {
            scratchThreatDx = ally.pos.x - ship.pos.x;
            scratchThreatDy = ally.pos.y - ship.pos.y;
            if (scratchThreatDx * scratchThreatDx + scratchThreatDy * scratchThreatDy <= defensiveSphereSq) {
              isActivelyAttacking = true;
              break;
            }
          }
        }
      }

      // Check in-flight missiles originating from this hostile targeting this ship
      if (!isActivelyAttacking) {
        for (let m = 0; m < missileCount; m++) {
          const mis = missiles[m];
          if (mis.alive && mis.sourceShipId === candidate.id && mis.targetId === ship.id) {
            isActivelyAttacking = true;
            break;
          }
        }
      }

      if (isActivelyAttacking && scratchDistSq < scratchClosestDistSq) {
        scratchClosestDistSq = scratchDistSq;
        scratchBestTarget = candidate;
      }
    }

    if (scratchBestTarget) {
      ship.targetEntityId = scratchBestTarget.id;
      return scratchBestTarget;
    }
  }

  return null;
}
