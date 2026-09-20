import { ShipEntity, CombatStance, AggressiveDoctrine, Vec2D } from '../types';
import { applyShipArmament, getShipClassKey } from './shipPrototypes';

export function isBuilderVessel(ship: ShipEntity): boolean {
  return ship.class === 'BUILDER' || ship.role === 'BUILDER';
}

export function isMinerVessel(ship: ShipEntity): boolean {
  return ship.class === 'MINER' || ship.role === 'MINER' || ship.isMiningVessel === true;
}

/**
 * Ship Controller
 * Manages tactical posture, targeting state, and combat readiness across all player-owned combat craft.
 */
export function ensureShipCombatReady(ship: ShipEntity): void {
  ship.isAlive = ship.hullState !== 'DESTROYED' && (ship.hullHp > 0 || (ship.hull ?? 1) > 0);
  ship.hull = ship.hullHp;

  if (!ship.class) {
    ship.class = getShipClassKey(ship);
  }

  // Builder & Autonomous Miner Isolation: Strictly excluded from combat systems & weapon locks
  if (isBuilderVessel(ship) || isMinerVessel(ship)) {
    ship.combatStance = 'PASSIVE';
    ship.targetEntityId = null;
    ship.offensiveLaserActive = false;
    ship.offensiveGraserActive = false;
    return;
  }

  if (ship.salvoCooldownTicksRemaining === undefined) {
    ship.salvoCooldownTicksRemaining = 0;
  }
  if (ship.baseSalvoCooldownTicks === undefined) {
    ship.baseSalvoCooldownTicks = 54; // 1.8s at 30Hz
  }

  // Ensure armaments are bound
  if (ship.totalMissileSalvo === undefined || ship.offensiveLasers === undefined) {
    applyShipArmament(ship, ship.role);
  }
}

/**
 * Sets combat posture: 'AGGRESSIVE' (FIGHT), 'DEFENSIVE' (DEFEND), or 'PASSIVE' (HOLD FIRE).
 */
export function setShipCombatStance(ship: ShipEntity, stance: CombatStance): void {
  ship.combatStance = stance;
  if (stance === 'PASSIVE') {
    ship.targetEntityId = null;
    ship.offensiveLaserActive = false;
    ship.offensiveGraserActive = false;
  }
}

/**
 * Cycles posture: AGGRESSIVE -> DEFENSIVE -> PASSIVE -> AGGRESSIVE
 */
export function cycleShipCombatStance(ship: ShipEntity): CombatStance {
  let nextStance: CombatStance = 'AGGRESSIVE';
  if (ship.combatStance === 'AGGRESSIVE') {
    nextStance = 'DEFENSIVE';
  } else if (ship.combatStance === 'DEFENSIVE') {
    nextStance = 'PASSIVE';
  } else {
    nextStance = 'AGGRESSIVE';
  }
  setShipCombatStance(ship, nextStance);
  return nextStance;
}

/**
 * Sets aggressive engagement doctrine: 'KILL' vs 'DISABLE'.
 */
export function setShipDoctrine(ship: ShipEntity, doctrine: AggressiveDoctrine): void {
  ship.aggressiveDoctrine = doctrine;
}

/**
 * Zero-allocation search for closest valid hostile contact within range.
 */
let scDx = 0;
let scDy = 0;
let scDistSq = 0;
let scMinDistSq = Infinity;
let scTarget: ShipEntity | null = null;

export function findClosestHostile(
  ship: ShipEntity,
  ships: ShipEntity[],
  maxDist: number,
  isVisRange?: (pos: Vec2D) => boolean
): ShipEntity | null {
  // Builder & Miner Isolation: Never target or participate in combat passes
  if (isBuilderVessel(ship) || isMinerVessel(ship)) {
    return null;
  }

  scMinDistSq = maxDist * maxDist;
  scTarget = null;

  for (let i = 0; i < ships.length; i++) {
    const candidate = ships[i];
    if (candidate.faction === ship.faction || candidate.hullState === 'DESTROYED' || candidate.hullHp <= 0) {
      continue;
    }
    if (ship.aggressiveDoctrine === 'DISABLE' && candidate.hullState === 'CRIPPLED') {
      continue;
    }
    if (ship.faction === 'FRIENDLY' && isVisRange && !isVisRange(candidate.pos)) {
      continue;
    }

    scDx = candidate.pos.x - ship.pos.x;
    scDy = candidate.pos.y - ship.pos.y;
    scDistSq = scDx * scDx + scDy * scDy;

    if (scDistSq <= scMinDistSq) {
      scMinDistSq = scDistSq;
      scTarget = candidate;
    }
  }

  return scTarget;
}

import { updateNPCPatrolStateMachine } from './npcController';
export { updateNPCPatrolStateMachine };

/**
 * Strict Faction Isolation: Player Warship Autonomy Guarantee
 * Ensures player warships strictly obey player-issued waypoints, fleet formation station-keeping,
 * and user-selected stance. Player warships must never execute NPC wander, anchor drift,
 * or pursuit leashing, and never disengage or drop target lock when moving away from an anchor.
 */
export function isPlayerCombatVessel(ship: ShipEntity): boolean {
  const isPlayerFaction = ship.faction === 'FRIENDLY' || (ship.faction as string) === 'PLAYER';
  return (
    isPlayerFaction &&
    ship.class !== 'MINER' &&
    ship.role !== 'MINER' &&
    ship.class !== 'BUILDER' &&
    ship.role !== 'BUILDER'
  );
}

