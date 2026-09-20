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

    if (!ship.isAlive || (ship.hull ?? ship.hullHp) <= 0) continue;
    if (ship.class === 'MINER' || ship.class === 'BUILDER') continue;

    updateShipCombatTick(ship, state, dt, i, tick);
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

  const effectiveMissileRange =
    BASE_TACTICAL_RANGES.missileLockRangeKm * (state.combatModifiers?.missileRangeMult ?? 1.0);

  // Target acquisition through targeting system (Zero allocations, Target-Stickiness & 3-slice stagger)
  const activeTarget = acquireTargets(
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

  // Execute offensive fire passes when a valid locked target is engaged
  if (activeTarget && ship.hullState === 'OPERATIONAL') {
    // Missile salvo firing pass
    if (ship.missiles > 0 && (!ship.salvoCooldownTicksRemaining || ship.salvoCooldownTicksRemaining <= 0)) {
      if (state.ordnanceBridge) {
        const specKey = ship.class || getShipClassKey(ship);
        const spec = SHIP_ARMAMENTS[specKey] || getShipArmament(ship.role);
        const tubeCapacity = spec?.totalMissileSalvo || Math.max(1, Math.min(8, Math.floor(ship.missiles)));
        const toFire = Math.min(Math.floor(ship.missiles), tubeCapacity);
        if (toFire > 0) {
          ship.missiles = Math.max(0, ship.missiles - toFire);
          const baseTicks = ship.baseSalvoCooldownTicks || 54;
          const reloadMult = ship.faction === 'FRIENDLY'
            ? (state.combatModifiers?.missileReloadMultiplier ?? 1.0)
            : 1.0;
          ship.salvoCooldownTicksRemaining = Math.max(1, Math.round(baseTicks * reloadMult));
          ship.missileCooldown = ship.salvoCooldownTicksRemaining / 30;

          state.ordnanceBridge.fireSalvo(
            ship,
            activeTarget,
            state.ships,
            toFire,
            160.0,
            effectiveMissileRange,
            DEFAULT_MISSILE_SPEED
          );

          const prefix = ship.faction === 'HOSTILE' ? '🚨 ' : '';
          state.addLog(
            'ORDNANCE',
            `${prefix}${ship.name} [${ship.faction}]: Broadside/Bow salvo of ${toFire} missiles launched at ${activeTarget.name}!`,
            'warn'
          );
        }
      } else {
        fireMissiles(ship, activeTarget, state);
      }
    }

    // Direct-fire continuous energy weapons pass (lasers & grasers)
    updateDirectFireWeapons(ship, activeTarget, state, dt);
  } else {
    // Thermal dissipation when no target is engaged
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
