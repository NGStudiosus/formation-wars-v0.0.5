import { ShipEntity, MissileEntity, Vec2D, MissileClass } from '../types';
import { SHIP_ARMAMENTS, getShipArmament, getShipClassKey } from './shipPrototypes';
import { computeSplineTangents } from './hermite';
import { DEFAULT_MISSILE_SPEED } from './systemConstants';
import { BASE_TACTICAL_RANGES } from './sensorController';
import type { OrdnanceBridge } from './ordnanceBridge';

export interface CombatModifiers {
  missileReloadMultiplier: number;
  laserRangeMultiplier: number;
  laserDpsMultiplier: number;
  graserArmorPiercingMultiplier: number;
  radarMultiplier?: number;
  passiveMultiplier?: number;
  radarRangeMult?: number;
  passiveRangeMult?: number;
  sensorRangeMult?: number;
  missileRangeMult?: number;
  cmRangeMult?: number;
  beamRangeMult?: number;
  pdRangeMult?: number;
}

export interface WeaponContext {
  missiles: MissileEntity[];
  ships?: ShipEntity[];
  ordnanceBridge?: OrdnanceBridge;
  combatModifiers: CombatModifiers;
  addLog: (category: string, message: string, severity?: 'info' | 'warn' | 'crit' | 'success') => void;
  applyHitToShip?: (target: ShipEntity, damage: number) => void;
  nextMissileId: () => string;
}

// Pre-allocated reusable scratch vectors at module scope to eliminate GC churn
export const VEC_A: Vec2D = { x: 0, y: 0 };
export const VEC_B: Vec2D = { x: 0, y: 0 };
const VEC_ORIGIN: Vec2D = { x: 0, y: 0 };

function getMissileClass(role: string): MissileClass {
  if (role === 'FRIGATE' || role === 'DESTROYER') return 'LIGHT';
  if (role === 'LIGHT_CRUISER' || role === 'CRUISER' || role === 'HEAVY_CRUISER') return 'MEDIUM';
  if (role === 'BATTLECRUISER' || role === 'BATTLESHIP' || role === 'DREADNOUGHT' || role === 'HQ') return 'HEAVY';
  return 'MEDIUM';
}

/**
 * 1. ZERO-ALLOCATION SALVO FIRING PIPELINE
 * Discharges Port Broadsides, Starboard Broadsides, and Bow Tubes.
 * Evaluates squared distance directly without Math.sqrt().
 * Monomorphic indexed iteration over tube arrays.
 */
export function fireMissiles(
  ship: ShipEntity,
  target: ShipEntity,
  state: WeaponContext
): void {
  const specKey = ship.class || getShipClassKey(ship);
  const spec = SHIP_ARMAMENTS[specKey] || getShipArmament(ship.role);
  if (!spec || spec.totalMissileSalvo === 0) return;

  // Discrete 30Hz weapon reload cooldown tick check
  if (ship.salvoCooldownTicksRemaining && ship.salvoCooldownTicksRemaining > 0) {
    ship.salvoCooldownTicksRemaining--;
    ship.missileCooldown = ship.salvoCooldownTicksRemaining / 30;
    return;
  }

  // Target validity checks
  const isTargetAlive = target.hullState !== 'DESTROYED' && (target.hullHp > 0 || (target.hull ?? 1) > 0);
  if (!isTargetAlive || ship.missiles <= 0) return;

  // Range validation: squared Euclidean distance check (D^2 <= R^2)
  const modifiers: Partial<CombatModifiers> = state.combatModifiers || {};
  const effectiveMissileRange = BASE_TACTICAL_RANGES.missileLockRangeKm * (modifiers.missileRangeMult ?? 1.0);
  const missileRangeSq = effectiveMissileRange * effectiveMissileRange;

  const targetDx = target.pos.x - ship.pos.x;
  const targetDy = target.pos.y - ship.pos.y;
  const targetDistSq = targetDx * targetDx + targetDy * targetDy;
  if (targetDistSq > missileRangeSq) {
    return;
  }

  const availableMissiles = Math.floor(ship.missiles);
  if (availableMissiles <= 0) return;

  const portTubes = spec.broadsideMissileTubesPort;
  const stbdTubes = spec.broadsideMissileTubesStbd;
  const bowTubes = spec.bowMissileTubes;
  const totalSalvoCapacity = spec.totalMissileSalvo;

  // If SoA ordnance bridge is active, route salvo directly into zero-allocation buffer
  if (state.ordnanceBridge) {
    const toFire = Math.min(availableMissiles, totalSalvoCapacity);
    if (toFire > 0) {
      ship.missiles = Math.max(0, ship.missiles - toFire);
      const baseTicks = ship.baseSalvoCooldownTicks || 54;
      const reloadMult = ship.faction === 'FRIENDLY'
        ? (state.combatModifiers?.missileReloadMultiplier ?? 1.0)
        : 1.0;
      ship.salvoCooldownTicksRemaining = Math.max(1, Math.round(baseTicks * reloadMult));
      ship.missileCooldown = ship.salvoCooldownTicksRemaining / 30;

      const shipsList = state.ships || [ship, target];
      state.ordnanceBridge.fireSalvo(
        ship,
        target,
        shipsList,
        toFire,
        160.0,
        effectiveMissileRange,
        DEFAULT_MISSILE_SPEED
      );

      const prefix = ship.faction === 'HOSTILE' ? '🚨 ' : '';
      state.addLog(
        'ORDNANCE',
        `${prefix}${ship.name} [${ship.faction}]: Broadside/Bow salvo of ${toFire} missiles launched at ${target.name}!`,
        'warn'
      );
      return;
    }
  }

  let firingBudget = Math.min(availableMissiles, totalSalvoCapacity);
  const initialBudget = firingBudget;

  // 1. Fire Port Broadsides (-Math.PI / 2)
  const portToFire = Math.min(portTubes, firingBudget);
  if (portToFire > 0) {
    spawnBroadsideMissiles(ship, target, portToFire, -Math.PI / 2, state);
    firingBudget -= portToFire;
  }

  // 2. Fire Starboard Broadsides (+Math.PI / 2)
  const stbdToFire = Math.min(stbdTubes, firingBudget);
  if (stbdToFire > 0) {
    spawnBroadsideMissiles(ship, target, stbdToFire, Math.PI / 2, state);
    firingBudget -= stbdToFire;
  }

  // 3. Fire Bow Tubes (DD, CH, BC, BB, DN)
  if (bowTubes > 0 && firingBudget > 0) {
    const bowToFire = Math.min(bowTubes, firingBudget);
    spawnBowMissiles(ship, target, bowToFire, state);
    firingBudget -= bowToFire;
  }

  const actuallyFired = initialBudget - firingBudget;
  ship.missiles = Math.max(0, ship.missiles - actuallyFired);

  // Reset reload timer using ship prototype baseline and research modifiers
  const baseTicks = ship.baseSalvoCooldownTicks || 54;
  const reloadMult = ship.faction === 'FRIENDLY'
    ? (state.combatModifiers?.missileReloadMultiplier ?? 1.0)
    : 1.0;
  ship.salvoCooldownTicksRemaining = Math.max(1, Math.round(baseTicks * reloadMult));
  ship.missileCooldown = ship.salvoCooldownTicksRemaining / 30;

  const prefix = ship.faction === 'HOSTILE' ? '🚨 ' : '';
  state.addLog(
    'ORDNANCE',
    `${prefix}${ship.name} [${ship.faction}]: Broadside/Bow salvo of ${actuallyFired} missiles launched at ${target.name}!`,
    'warn'
  );
}

// Backward-compatible alias
export const fireMissileSalvo = fireMissiles;

/**
 * Spawns broadside missiles with cubic Hermite spline physics.
 * Strictly avoids spread operators and cleans up dynamic allocations.
 */
export function spawnBroadsideMissiles(
  ship: ShipEntity,
  target: ShipEntity,
  count: number,
  flankNormalAngle: number,
  state: WeaponContext
): void {
  if (count <= 0) return;
  const r = ship.radius || 18;
  const heading = ship.heading || 0;
  const flankAngle = heading + flankNormalAngle;
  const flankDirX = Math.cos(flankAngle);
  const flankDirY = Math.sin(flankAngle);
  const fwdDirX = Math.cos(heading);
  const fwdDirY = Math.sin(heading);

  const modifiers: Partial<CombatModifiers> = state.combatModifiers || {};
  const effectiveMissileRange = BASE_TACTICAL_RANGES.missileLockRangeKm * (modifiers.missileRangeMult ?? 1.0);
  const missileRange = effectiveMissileRange;
  const doctrine = ship.aggressiveDoctrine || 'KILL';
  const missileClass = getMissileClass(ship.role);

  for (let k = 0; k < count; k++) {
    const spacing = count > 1 ? (k / (count - 1) - 0.5) * (r * 1.3) : 0;
    const originX = ship.pos.x + flankDirX * (r * 0.75) + fwdDirX * spacing;
    const originY = ship.pos.y + flankDirY * (r * 0.75) + fwdDirY * spacing;

    VEC_ORIGIN.x = originX;
    VEC_ORIGIN.y = originY;

    // Spline tangents: starts along flank normal at ejection impulse, arcs to target
    const { m0, m1, duration } = computeSplineTangents(
      VEC_ORIGIN,
      flankAngle,
      130, // ejection speed
      target.pos,
      DEFAULT_MISSILE_SPEED
    );

    const m: MissileEntity = {
      id: state.nextMissileId(),
      origin: { x: originX, y: originY },
      pos: { x: originX, y: originY },
      targetId: target.id,
      sourceShipId: ship.id,
      faction: ship.faction,
      speed: DEFAULT_MISSILE_SPEED,
      maxLifetime: 20.0,
      lifetime: 0,
      alive: true,
      damage: 160.0,
      visualSeed: Math.random() * 100,
      trail: [],
      trailSampleTimer: 0,
      range: missileRange,
      maxPoweredDistance: missileRange * 1.10,
      distanceTraveled: 0,
      underPower: true,
      fuelExhausted: false,
      burnoutTimer: 0,
      doctrine,
      status: 'TRACKING',
      missileClass,
      heading: flankAngle,
      // Broadside ejection physics fields
      isBroadsideEjection: true,
      ejectionTimer: 0.35,
      ejectionDuration: 0.35,
      ejectionHeading: flankAngle,
      sustainerActive: false,
      splineP0: { x: originX, y: originY },
      splineM0: { x: m0.x, y: m0.y },
      splineP1: { x: target.pos.x, y: target.pos.y },
      splineM1: { x: m1.x, y: m1.y },
      splineT: 0,
      splineDuration: Math.max(duration, 0.8),
    };

    state.missiles.push(m);
  }
}

/**
 * Spawns missiles from forward bow tubes.
 */
export function spawnBowMissiles(
  ship: ShipEntity,
  target: ShipEntity,
  count: number,
  state: WeaponContext
): void {
  if (count <= 0) return;
  const r = ship.radius || 18;
  const heading = ship.heading || 0;
  const fwdDirX = Math.cos(heading);
  const fwdDirY = Math.sin(heading);
  const latDirX = -fwdDirY;
  const latDirY = fwdDirX;

  const modifiers: Partial<CombatModifiers> = state.combatModifiers || {};
  const effectiveMissileRange = BASE_TACTICAL_RANGES.missileLockRangeKm * (modifiers.missileRangeMult ?? 1.0);
  const missileRange = effectiveMissileRange;
  const doctrine = ship.aggressiveDoctrine || 'KILL';
  const missileClass = getMissileClass(ship.role);

  for (let k = 0; k < count; k++) {
    const spacing = count > 1 ? (k / (count - 1) - 0.5) * (r * 0.55) : 0;
    const originX = ship.pos.x + fwdDirX * (r * 0.95) + latDirX * spacing;
    const originY = ship.pos.y + fwdDirY * (r * 0.95) + latDirY * spacing;

    const initialHeading = Math.atan2(target.pos.y - originY, target.pos.x - originX);

    const m: MissileEntity = {
      id: state.nextMissileId(),
      origin: { x: originX, y: originY },
      pos: { x: originX, y: originY },
      targetId: target.id,
      sourceShipId: ship.id,
      faction: ship.faction,
      speed: DEFAULT_MISSILE_SPEED,
      maxLifetime: 20.0,
      lifetime: 0,
      alive: true,
      damage: 160.0,
      visualSeed: Math.random() * 100,
      trail: [],
      trailSampleTimer: 0,
      range: missileRange,
      maxPoweredDistance: missileRange * 1.10,
      distanceTraveled: 0,
      underPower: true,
      fuelExhausted: false,
      burnoutTimer: 0,
      doctrine,
      status: 'TRACKING',
      missileClass,
      heading: initialHeading,
      sustainerActive: true,
    };

    state.missiles.push(m);
  }
}

/**
 * 2. DIRECT-FIRE ENERGY WEAPONS (CONTINUOUS LASERS & GRASERS)
 * Continuous laser arrays (50 DPS for 3.0s, R_beam <= 300km) and heavy grasers (100 DPS for 3.0s).
 * Eliminates per-tick object instantiation: updates target vectors in place.
 * Uses squared Euclidean distances exclusively.
 */
export function updateDirectFireWeapons(
  ship: ShipEntity,
  target: ShipEntity,
  state: WeaponContext,
  dt: number
): void {
  const specKey = ship.class || getShipClassKey(ship);
  const spec = SHIP_ARMAMENTS[specKey] || getShipArmament(ship.role);
  if (!spec) return;

  const dx = target.pos.x - ship.pos.x;
  const dy = target.pos.y - ship.pos.y;
  const dSq = dx * dx + dy * dy;

  // Engagement validation: Offensive Energy Beam Array (300 km base, R_Beam = 1/8 R_Missile)
  const effectiveBeamRange =
    BASE_TACTICAL_RANGES.offensiveBeamRangeKm *
    (state.combatModifiers?.beamRangeMult ?? state.combatModifiers?.laserRangeMultiplier ?? 1.0);
  const beamRangeSq = effectiveBeamRange * effectiveBeamRange;

  if (dSq > beamRangeSq) {
    if ((ship.offensiveLaserCooldown || 0) > 0) {
      ship.offensiveLaserCooldown = Math.max(0, (ship.offensiveLaserCooldown || 0) - dt);
    }
    if ((ship.offensiveGraserCooldown || 0) > 0) {
      ship.offensiveGraserCooldown = Math.max(0, (ship.offensiveGraserCooldown || 0) - dt);
    }
    ship.offensiveLaserActive = false;
    ship.offensiveGraserActive = false;
    return;
  }

  // --- Offensive Continuous Lasers (50 DPS for 3.0s, R_Beam <= 300km) ---
  if ((ship.offensiveLaserCooldown || 0) > 0) {
    ship.offensiveLaserCooldown = Math.max(0, (ship.offensiveLaserCooldown || 0) - dt);
  }

  if (spec.offensiveLasers > 0) {
    if (ship.offensiveLaserTimer && ship.offensiveLaserTimer > 0) {
      ship.offensiveLaserTimer -= dt;
      ship.offensiveLaserActive = true;
      // In-place vector update to prevent GC allocation spikes
      if (!ship.offensiveLaserTarget) {
        ship.offensiveLaserTarget = { x: target.pos.x, y: target.pos.y };
      } else {
        ship.offensiveLaserTarget.x = target.pos.x;
        ship.offensiveLaserTarget.y = target.pos.y;
      }
      ship.offensiveLaserTargetId = target.id;

      const dpsMult = state.combatModifiers?.laserDpsMultiplier || 1.0;
      const damage = 50.0 * dt * dpsMult;
      applyEnergyDamage(target, damage, false, state);

      if (ship.offensiveLaserTimer <= 0) {
        ship.offensiveLaserActive = false;
        ship.offensiveLaserTarget = null;
        ship.offensiveLaserCooldown = 3.5; // Thermal recharge cooldown
      }
    } else if ((ship.offensiveLaserCooldown || 0) <= 0 && dSq <= beamRangeSq) {
      ship.offensiveLaserTimer = 3.0;
      ship.offensiveLaserActive = true;
      if (!ship.offensiveLaserTarget) {
        ship.offensiveLaserTarget = { x: target.pos.x, y: target.pos.y };
      } else {
        ship.offensiveLaserTarget.x = target.pos.x;
        ship.offensiveLaserTarget.y = target.pos.y;
      }
      ship.offensiveLaserTargetId = target.id;
      state.addLog(
        'ENERGY',
        `⚡ ${ship.name}: Fired ${spec.offensiveLasers} Offensive Lasers at ${target.name} [50 DPS, 3.0s beam, <= ${Math.round(effectiveBeamRange)}km]`,
        'info'
      );
    }
  }

  // --- Heavy Grasers (100 DPS for 3.0s, R_Beam <= 300km) ---
  if ((ship.offensiveGraserCooldown || 0) > 0) {
    ship.offensiveGraserCooldown = Math.max(0, (ship.offensiveGraserCooldown || 0) - dt);
  }

  if (spec.offensiveGrasers > 0) {
    if (ship.offensiveGraserTimer && ship.offensiveGraserTimer > 0) {
      ship.offensiveGraserTimer -= dt;
      ship.offensiveGraserActive = true;
      // In-place vector update to prevent GC allocation spikes
      if (!ship.offensiveGraserTarget) {
        ship.offensiveGraserTarget = { x: target.pos.x, y: target.pos.y };
      } else {
        ship.offensiveGraserTarget.x = target.pos.x;
        ship.offensiveGraserTarget.y = target.pos.y;
      }
      ship.offensiveGraserTargetId = target.id;

      const apMult = state.combatModifiers?.graserArmorPiercingMultiplier || 1.0;
      const damage = 100.0 * dt * apMult;
      applyEnergyDamage(target, damage, true, state);

      if (ship.offensiveGraserTimer <= 0) {
        ship.offensiveGraserActive = false;
        ship.offensiveGraserTarget = null;
        ship.offensiveGraserCooldown = 4.5; // Thermal recharge cooldown
      }
    } else if ((ship.offensiveGraserCooldown || 0) <= 0 && dSq <= beamRangeSq) {
      ship.offensiveGraserTimer = 3.0;
      ship.offensiveGraserActive = true;
      if (!ship.offensiveGraserTarget) {
        ship.offensiveGraserTarget = { x: target.pos.x, y: target.pos.y };
      } else {
        ship.offensiveGraserTarget.x = target.pos.x;
        ship.offensiveGraserTarget.y = target.pos.y;
      }
      ship.offensiveGraserTargetId = target.id;
      state.addLog(
        'ENERGY',
        `⚛️ ${ship.name}: Heavy Grasers engaged ${target.name} [100 DPS, Armor Piercing, 3.0s beam]!`,
        'warn'
      );
    }
  }
}

/**
 * 3. FLAT HULL & SHIELD ENERGY DAMAGE RESOLUTION
 * Pure flat hull/shield pools. Legacy armor-mitigation formulas and beam raycasting are pruned.
 */
export function applyEnergyDamage(
  target: ShipEntity,
  damage: number,
  isPiercing: boolean,
  state: WeaponContext
): void {
  if (state.applyHitToShip) {
    state.applyHitToShip(target, damage);
    return;
  }

  if (target.hullState === 'DESTROYED') return;
  if (target.role === 'HQ') return; // Citadel fortress holds

  // Shield resolution
  if (!target.shieldOverheated && target.shieldHp > 0) {
    if (isPiercing) {
      // Grasers pierce shields: 50% bypass directly into hull
      const shieldDmg = damage * 0.5;
      const hullDmg = damage * 0.5;
      target.shieldHp -= shieldDmg;
      target.shieldHeat += shieldDmg * 0.28;
      target.hullHp = Math.max(0, target.hullHp - hullDmg);
    } else {
      target.shieldHp -= damage;
      target.shieldHeat += damage * 0.28;
    }

    if (target.shieldHeat >= target.shieldHeatMax || target.shieldHp <= 0) {
      target.shieldOverheated = true;
      target.shieldHp = 0;
      target.shieldCooldownTimer = 3.0;
    }
    return;
  }

  // Direct hull degradation
  target.hullHp = Math.max(0, target.hullHp - damage);
  if (target.hullHp <= 0 && target.hullState === 'OPERATIONAL') {
    target.hullState = 'CRIPPLED';
    target.splineActive = false;
  }
}
