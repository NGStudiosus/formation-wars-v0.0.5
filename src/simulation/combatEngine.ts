import { ShipEntity, MissileEntity, Vec2D } from '../types';
import { getShipClassKey, SHIP_ARMAMENTS, getShipArmament } from './shipPrototypes';
import { DEFAULT_MISSILE_SPEED } from './systemConstants';
import { OrdnanceBridge } from './ordnanceBridge';
import {
  BASE_TACTICAL_RANGES,
  TacticalRanges,
  calculateEffectiveTacticalRanges,
} from './sensorController';
import {
  acquireTargets,
  getShipIdHash,
  VEC_A,
  VEC_B,
} from './targetingSystem';
import {
  CombatModifiers,
  WeaponContext,
  fireMissiles,
  fireMissileSalvo,
  spawnBroadsideMissiles,
  spawnBowMissiles,
  updateDirectFireWeapons,
  applyEnergyDamage,
} from './weaponController';

export {
  type TacticalRanges,
  BASE_TACTICAL_RANGES,
  calculateEffectiveTacticalRanges,
  type CombatModifiers,
  acquireTargets,
  getShipIdHash,
  fireMissiles,
  fireMissileSalvo,
  spawnBroadsideMissiles,
  spawnBowMissiles,
  updateDirectFireWeapons,
  applyEnergyDamage,
  OrdnanceBridge,
  VEC_A,
  VEC_B,
};

export interface CombatSimulationState extends WeaponContext {
  playerShips: ShipEntity[];
  ships: ShipEntity[];
  missiles: MissileEntity[];
  ordnanceBridge?: OrdnanceBridge;
  combatModifiers: CombatModifiers;
  isTargetInFriendlyVisualRange?: (pos: Vec2D) => boolean;
  addLog: (category: string, message: string, severity?: 'info' | 'warn' | 'crit' | 'success') => void;
  applyHitToShip?: (target: ShipEntity, damage: number) => void;
  nextMissileId: () => string;
}

// Global 30Hz simulation tick counter for staggered targeting sweeps
let globalSimulationTick = 0;

/**
 * 1. ALLOCATION PURGE IN HIGH-FREQUENCY LOOPS
 * Monomorphic indexed iteration across live combat entities.
 * Strictly avoids .filter(), .map(), .reduce(), and array spreading.
 */
export function updateCombat(state: CombatSimulationState, dt: number, simulationTick?: number): void {
  const tick = simulationTick !== undefined ? simulationTick : ++globalSimulationTick;
  const playerShips = state.playerShips;
  const len = playerShips.length;

  for (let i = 0; i < len; i++) {
    const ship = playerShips[i];
    ship.isAlive = ship.hullState !== 'DESTROYED' && (ship.hullHp > 0 || (ship.hull ?? 1) > 0);
    ship.hull = ship.hullHp;
    if (!ship.class) {
      ship.class = getShipClassKey(ship);
    }

    // Process Novan active shield cycling state evolution
    updateShieldCycling(ship, 1);

    if (!ship.isAlive || (ship.hull ?? ship.hullHp) <= 0) continue;
    if (ship.class === 'MINER' || ship.class === 'BUILDER') continue;

    updateShipCombatTick(ship, state, dt, i, tick);
  }

  // Also update shield cycling on other ships in the simulation
  const allShips = state.ships;
  const allLen = allShips ? allShips.length : 0;
  for (let j = 0; j < allLen; j++) {
    const s = allShips[j];
    if (s && s.faction !== 'FRIENDLY') {
      updateShieldCycling(s, 1);
    }
  }
}

/**
 * Novan Cold Shield Reboot Ability Trigger
 * Immediately sets shieldCycleState to 'REBOOTING', 4.0s timer, collapses shields to 0.
 */
export function triggerShieldReboot(ship: ShipEntity): boolean {
  if (!ship || ship.hullState === 'DESTROYED') return false;

  if (!ship.shieldCycleState) {
    ship.shieldCycleState = 'READY';
  }
  if (ship.currentShield === undefined) {
    ship.currentShield = ship.shieldHp ?? 0;
  }
  const maxCap = ship.shieldHpMax || ship.maxShield || 1000;
  if (ship.maxShield === undefined) {
    ship.maxShield = maxCap;
  }

  // Can only be activated if READY and currentShield < maxShield
  if (ship.shieldCycleState !== 'READY') return false;
  if (ship.currentShield >= maxCap && ship.shieldHp >= maxCap) {
    return false;
  }

  const isKovak = ship.factionId === 'KOVAK' || (ship.faction as any) === 'KOVAK';
  ship.shieldCycleState = 'REBOOTING';
  ship.shieldCycleTimer = isKovak ? 180 : 120; // 6.0 seconds for Kovak (slower reboot) vs 4.0 seconds standard
  ship.shieldCycleDuration = isKovak ? 180 : 120;
  ship.currentShield = 0;
  ship.shieldHp = 0;
  if (ship.shield !== undefined) ship.shield = 0;
  return true;
}

/**
 * Novan Active Shield Cycling State Machine (30Hz evaluation)
 */
export function updateShieldCycling(ship: ShipEntity, dtTicks: number = 1): void {
  if (ship.shieldCycleState === 'READY' && ship.currentShield !== undefined) {
    return;
  }
  if (!ship.shieldCycleState) {
    ship.shieldCycleState = 'READY';
  }
  if (ship.currentShield === undefined) {
    ship.currentShield = ship.shieldHp ?? 0;
  }
  const maxCap = ship.shieldHpMax || ship.maxShield || 1000;
  if (ship.maxShield === undefined) {
    ship.maxShield = maxCap;
  }

  const isKovak = ship.factionId === 'KOVAK' || (ship.faction as any) === 'KOVAK';

  // 1. Processing Active Reboot Channel (Vulnerability Window)
  if (ship.shieldCycleState === 'REBOOTING') {
    ship.shieldCycleTimer = (ship.shieldCycleTimer ?? 120) - dtTicks;

    // Shields remain strictly pinned to zero during cycle
    ship.currentShield = 0;
    ship.shieldHp = 0;
    if (ship.shield !== undefined) ship.shield = 0;

    if (ship.shieldCycleTimer <= 0) {
      // Cycle complete: Kovak shields reboot with slight instability (85% initial snap)
      const capMultiplier = isKovak ? 0.85 : 1.0;
      const targetShield = Math.round(maxCap * capMultiplier);
      ship.currentShield = targetShield;
      ship.shieldHp = targetShield;
      if (ship.shield !== undefined) ship.shield = targetShield;
      ship.shieldOverheated = false;
      ship.shieldHeat = 0;
      ship.shieldCycleState = 'COOLDOWN';
      ship.shieldCycleCooldown = isKovak ? 1440 : 960; // 48.0s vs 32.0s recharge cooldown
      ship.shieldHardeningTimer = isKovak ? 15 : 30;  // 0.5s vs 1.0s hardening buff
    }
    return;
  }

  // 2. Processing Cooldown State
  if (ship.shieldCycleState === 'COOLDOWN') {
    if ((ship.shieldHardeningTimer ?? 0) > 0) {
      ship.shieldHardeningTimer = Math.max(0, (ship.shieldHardeningTimer ?? 0) - dtTicks);
    }
    if ((ship.shieldCycleCooldown ?? 0) > 0) {
      ship.shieldCycleCooldown = Math.max(0, (ship.shieldCycleCooldown ?? 0) - dtTicks);
    } else {
      ship.shieldCycleState = 'READY';
    }
  }
}

// Backward-compatible alias for engine.ts
export const updateCombatTick = updateCombat;

/**
 * 2. UNIFIED OFFENSIVE STANCE & COMBAT TICK EVALUATION
 * - Evaluates weapon reload cooldowns
 * - Handles PASSIVE stance suppression
 * - Target-stickiness: preserves active target within 1.20x envelope without full world sweep
 * - Staggered target acquisition: non-firing vessels refresh targets at 10Hz across 3 slices
 * - Discharges missile salvos and direct-fire energy weapons with in-place vector updates
 */
export function updateShipCombatTick(
  ship: ShipEntity,
  state: CombatSimulationState,
  dt: number,
  shipIndex?: number,
  simulationTick?: number
): void {
  if (ship.hullState === 'DESTROYED') return;

  // Discrete 30Hz weapon reload cooldown ticks countdown
  if (ship.salvoCooldownTicksRemaining && ship.salvoCooldownTicksRemaining > 0) {
    ship.salvoCooldownTicksRemaining--;
    ship.missileCooldown = ship.salvoCooldownTicksRemaining / 30;
  } else if (ship.missileCooldown > 0) {
    ship.missileCooldown = Math.max(0, ship.missileCooldown - dt);
    ship.salvoCooldownTicksRemaining = Math.round(ship.missileCooldown * 30);
  }

  // PASSIVE Posture or RETURNING_TO_PATROL: Suppress offensive systems, clear lock
  const stance = ship.combatStance;
  if (stance === 'PASSIVE' || ship.npcPatrolState?.behaviorState === 'RETURNING_TO_PATROL') {
    ship.targetEntityId = null;
    ship.offensiveLaserActive = false;
    ship.offensiveGraserActive = false;
    return;
  }

  // Garn Infinite-Range Theater Defense System & Missile Pod logic
  const isGarnTheaterDefense =
    Boolean(ship.isGarnLongRange) ||
    (ship.role as string) === 'GARN_MISSILE_POD' ||
    ship.structureType === 'GARN_MISSILE_POD' ||
    ((ship.factionId === 'GARN' || (ship.faction as any) === 'GARN') && ship.role === 'HQ');

  const effectiveMissileRange = isGarnTheaterDefense
    ? 999999999 // Infinite-range theater defense across the star system
    : BASE_TACTICAL_RANGES.missileLockRangeKm * (state.combatModifiers?.missileRangeMult ?? 1.0);

  // Target acquisition through targeting system (Zero allocations, Target-Stickiness & 3-slice stagger)
  let activeTarget = acquireTargets(
    ship,
    {
      ships: state.ships,
      missiles: state.missiles,
      effectiveMissileRange,
      isTargetInFriendlyVisualRange: state.isTargetInFriendlyVisualRange,
    },
    simulationTick !== undefined ? simulationTick : globalSimulationTick,
    shipIndex
  );

  // Garn Infinite-Range Theater Defense Rule:
  // Cannot fire on passive thermal/EM contacts (FULL or RADAR lock required)
  if (isGarnTheaterDefense && activeTarget) {
    const tier = activeTarget.visibilityTier;
    const hasActiveRadarLock = tier === 'FULL' || tier === 'RADAR';
    if (!hasActiveRadarLock) {
      activeTarget = null;
    }
  }

  // Execute offensive fire passes when a valid locked target is engaged
  const canFire =
    ship.hullState === 'OPERATIONAL' ||
    (ship.hullState === 'CRIPPLED' && ship.hullHp > 0.125 * ship.hullMax);

  if (activeTarget && canFire) {
    // Missile salvo firing pass
    if (ship.missiles > 0 && (!ship.salvoCooldownTicksRemaining || ship.salvoCooldownTicksRemaining <= 0)) {
      fireMissiles(ship, activeTarget, state);
    }

    // Direct-fire continuous energy weapons pass (lasers & grasers)
    updateDirectFireWeapons(ship, activeTarget, state, dt);
  } else {
    // Thermal dissipation when no target is engaged or disabled/heavy crippled
    if ((ship.offensiveLaserCooldown || 0) > 0) {
      ship.offensiveLaserCooldown = Math.max(0, (ship.offensiveLaserCooldown || 0) - dt);
    }
    if ((ship.offensiveGraserCooldown || 0) > 0) {
      ship.offensiveGraserCooldown = Math.max(0, (ship.offensiveGraserCooldown || 0) - dt);
    }
    ship.offensiveLaserActive = false;
    ship.offensiveGraserActive = false;
  }
}
