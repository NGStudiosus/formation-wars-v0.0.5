import {
  ShipEntity,
  SolarSystem,
  Vec2D,
  RockyPlanet,
  GasGiant,
  StarSystemDescriptor,
  ShipRole,
} from '../types';
import { SeededRNG, getPlanetaryGravityWellRadius } from './solarSystem';
import { K_SCALE } from './systemConstants';
import { initNPCPatrolState, DEFAULT_BELT_PATROL_RADIUS } from './npcController';
import { SHIP_PROTOTYPES, ShipPrototypeDefinition } from './shipPrototypes';
import { clampAngularSlew } from './kinematics';

export { SHIP_PROTOTYPES, type ShipPrototypeDefinition };

/**
 * Creates an autonomous hostile/pirate naval entity bound to prototypes with patrol anchor binding
 */
export function createHostileShip(
  id: string,
  systemId: string,
  faction: 'PIRATE' | 'HOSTILE',
  shipClass: string,
  x: number,
  y: number,
  mooredAnchorId?: string
): ShipEntity {
  const proto = SHIP_PROTOTYPES[shipClass] || SHIP_PROTOTYPES['FRIGATE'];
  const hp = proto.hp || 1200;
  const shield = proto.shield || 600;
  const fuelH2 = proto.fuelH2 || 1000;
  const cruiseSpeed = proto.cruiseSpeed || 120;
  const maxSpeed = proto.maxSpeed || 200;
  const heading = Math.random() * Math.PI * 2;
  const tubes = proto.missileTubes || 2;
  const missilesMax = proto.missilesMax || 120;
  const counterMissilesMax = proto.counterMissilesMax || 40;
  const pdBeams = proto.pdBeams || 1;
  const massRating = proto.massRating || 25000;
  const baseRadius = proto.baseRadius || 6;
  const isPirate = faction === 'PIRATE';

  return {
    id,
    name: `${isPirate ? 'Corsair' : 'Imperial'} ${proto.name} ${id.split('_').pop()}`,
    systemId,
    faction: 'HOSTILE',
    isPirate,
    role: proto.role || (shipClass as ShipRole) || 'FRIGATE',
    shipClass,
    class: proto.role || shipClass,
    combatStance: 'AGGRESSIVE',
    aggressiveDoctrine: 'KILL',
    x,
    y,
    vx: 0,
    vy: 0,
    pos: { x, y },
    velocity: { x: 0, y: 0 },
    heading,
    speed: 0,
    cruiseSpeed,
    maxSpeed,
    hp,
    maxHp: hp,
    hullHp: hp,
    hullMax: hp,
    maxRepairableHull: hp,
    crippleBar: Math.round(hp * 0.8),
    crippleBarMax: Math.round(hp * 0.8),
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,
    shield,
    maxShield: shield,
    shieldHp: shield,
    shieldHpMax: shield,
    shieldHeat: 0,
    shieldHeatMax: 120,
    shieldOverheated: false,
    shieldCooldownTimer: 0,
    fuelH2,
    maxFuelH2: fuelH2,
    h2Fuel: fuelH2,
    h2FuelMax: fuelH2,
    fuelReserveRule: 0.4,
    jumpState: 'IDLE',
    visibilityTier: 'NONE', // Fog-of-war will evaluate dynamically
    visibilityState: 'HIDDEN',
    mooredAnchorId: mooredAnchorId || null,
    targetEntityId: null,
    patrolAnchor: { x, y, radius: 4500 },
    patrolRadius: 4500,
    weapons: proto.weapons ? JSON.parse(JSON.stringify(proto.weapons)) : [],
    missiles: missilesMax,
    missilesMax,
    missileTubes: tubes,
    missileCooldown: 0,
    missileRange: 1100,
    counterMissiles: counterMissilesMax,
    counterMissilesMax,
    counterMissilesPerSalvo: Math.max(1, Math.floor(tubes / 2)),
    counterMissileCooldown: 0,
    autoFire: true,
    ewarJammingRating: 0.2,
    pdplaRange: 65,
    pdplaCooldown: 0,
    pdBeams,
    pdplaActiveBeamTarget: null,
    pdplaActiveBeamTargets: [],
    pdplaBeamTimer: 0,
    pdplaBeamHit: true,
    pdplaSalvoCount: 0,
    pdplaOverheated: false,
    pdplaOverheatTimer: 0,
    pdplaOverheatDuration: 5.0,
    massRating,
    fmsActive: false,
    fmsMultiplier: 3.5,
    radius: baseRadius,
    splineActive: false,
    splineP0: { x, y },
    splineM0: { x: 0, y: 0 },
    splineP1: { x, y },
    splineM1: { x: 0, y: 0 },
    splineT: 0,
    splineDuration: 0,
    inGravityWell: !!mooredAnchorId,
    gravityWellTetherPlanetId: mooredAnchorId || undefined,
    npcPatrolState: {
      anchorX: x,
      anchorY: y,
      patrolRadius: 4500,
      leashRadius: 4500 * 1.5,
      behaviorState: 'PATROL_ROAM',
      currentWanderTarget: null,
      dwellTicksRemaining: Math.floor(Math.random() * 60),
      targetEntityId: null,
      tetherPlanetId: mooredAnchorId || undefined,
    },
  };
}

/**
 * Spawns system-aware hostile fleet and planetary garrison units for a star system
 */
export function spawnSystemHostiles(system: StarSystemDescriptor, state?: any): ShipEntity[] {
  const spawnedShips: ShipEntity[] = [];
  const isHomeworldSystem = system.index === 0;

  // 1. Inner Rocky Planet Garrisons & Outposts
  const rockyPlanets = (system.planets || []).filter((p) => p.type === 'ROCKY');

  for (let i = 0; i < rockyPlanets.length; i++) {
    const planet = rockyPlanets[i];
    const px = planet.x ?? planet.pos?.x ?? planet.position?.x ?? 0;
    const py = planet.y ?? planet.pos?.y ?? planet.position?.y ?? 0;

    // In Homeworld system: Skip player's habitable capital world
    if (isHomeworldSystem && planet.isHabitable) {
      continue;
    }

    // In Outer Systems (1 to N-1): The habitable planet is the Enemy Capital/Seat of Power
    if (!isHomeworldSystem && planet.isHabitable) {
      // Spawn heavy capital garrison battlegroup
      spawnedShips.push(
        createHostileShip(`${system.id}_CAPITAL_DEF_1`, system.id, 'HOSTILE', 'HEAVY_CRUISER', px + 1200, py + 400, planet.id),
        createHostileShip(`${system.id}_CAPITAL_ESC_1`, system.id, 'HOSTILE', 'DESTROYER', px - 900, py + 800, planet.id),
        createHostileShip(`${system.id}_CAPITAL_ESC_2`, system.id, 'HOSTILE', 'FRIGATE', px + 800, py - 1100, planet.id),
        createHostileShip(`${system.id}_CAPITAL_ESC_3`, system.id, 'HOSTILE', 'FRIGATE', px - 1200, py - 600, planet.id)
      );
      continue;
    }

    // Secondary Non-Habitable Inner Rocky Worlds:
    // 50% chance to host an active pirate outpost / picket patrol
    const spawnRoll = Math.random();
    if (spawnRoll > 0.4) {
      const patrolCount = isHomeworldSystem ? 2 : Math.floor(Math.random() * 2) + 2; // 2 in homeworld, 2-3 in outer systems

      for (let s = 0; s < patrolCount; s++) {
        const angle = (s / patrolCount) * Math.PI * 2 + Math.random() * 0.4;
        const orbitDist = 1400 + Math.random() * 600;
        const shipClass = !isHomeworldSystem && s === 0 && Math.random() > 0.5 ? 'DESTROYER' : 'FRIGATE';

        spawnedShips.push(
          createHostileShip(
            `${system.id}_PLN_${i + 1}_PATROL_${s + 1}`,
            system.id,
            'PIRATE',
            shipClass,
            px + Math.cos(angle) * orbitDist,
            py + Math.sin(angle) * orbitDist,
            planet.id
          )
        );
      }
    }
  }

  // 2. Asteroid Belt Raider Presence (1 to 2 Raider Pairs per Belt)
  const beltClusters = (system.clusters || []).filter((c) => c.id && c.id.includes('BELT'));
  const candidateClusters = beltClusters.length > 0 ? beltClusters : system.clusters || [];
  if (candidateClusters.length > 0) {
    const clusterPick = candidateClusters[Math.floor(Math.random() * candidateClusters.length)];
    const cx = clusterPick.center?.x ?? (clusterPick as any).x ?? 0;
    const cy = clusterPick.center?.y ?? (clusterPick as any).y ?? 0;
    spawnedShips.push(
      createHostileShip(`${system.id}_RAIDER_1`, system.id, 'PIRATE', 'FRIGATE', cx + 300, cy, clusterPick.id),
      createHostileShip(`${system.id}_RAIDER_2`, system.id, 'PIRATE', 'CORVETTE', cx - 300, cy + 200, clusterPick.id)
    );
  }

  return spawnedShips;
}

/**
 * Kinematic steering towards a target position with angular slewing and velocity update
 */
export function steerTowards(ship: ShipEntity, targetX: number, targetY: number, dt: number): void {
  const currentX = ship.pos?.x ?? ship.x ?? 0;
  const currentY = ship.pos?.y ?? ship.y ?? 0;
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  const dist = Math.hypot(dx, dy);

  if (dist < 2.0) {
    if (ship.velocity) {
      ship.velocity.x *= 0.92;
      ship.velocity.y *= 0.92;
    }
    ship.vx = 0;
    ship.vy = 0;
    ship.speed = 0;
    return;
  }

  const targetAngle = Math.atan2(dy, dx);
  const slewRate = ((ship.angularSlewRate || 25) * Math.PI) / 180;
  ship.heading = clampAngularSlew(ship.heading || 0, targetAngle, slewRate, dt);

  const desiredSpeed = Math.min(ship.cruiseSpeed || 120, dist * 0.45);
  const vx = Math.cos(ship.heading) * desiredSpeed;
  const vy = Math.sin(ship.heading) * desiredSpeed;

  if (ship.velocity) {
    ship.velocity.x = vx;
    ship.velocity.y = vy;
  }
  ship.vx = vx;
  ship.vy = vy;
  ship.speed = desiredSpeed;

  const newX = currentX + vx * dt;
  const newY = currentY + vy * dt;

  if (ship.pos) {
    ship.pos.x = newX;
    ship.pos.y = newY;
  }
  ship.x = newX;
  ship.y = newY;
}

/**
 * Executes inner planetary orbit/patrol loop for moored hostile/pirate vessels
 */
export function updateInnerPlanetaryPatrol(
  ship: ShipEntity,
  planets: { id: string; x?: number; y?: number; pos?: Vec2D; position?: { x: number; y: number } }[],
  simulationTick: number,
  dt: number
): boolean {
  if (ship.faction !== 'HOSTILE') return false;
  if (ship.targetEntityId || !ship.mooredAnchorId) return false;

  const hostPlanet = planets.find((p) => p.id === ship.mooredAnchorId);
  if (!hostPlanet) return false;

  // Slow orbital patrol around parent planet
  const angle = (simulationTick * 0.005 + (ship.id.charCodeAt(0) || 0)) % (Math.PI * 2);
  const orbitR = 2200;
  const px = hostPlanet.x ?? hostPlanet.pos?.x ?? hostPlanet.position?.x ?? 0;
  const py = hostPlanet.y ?? hostPlanet.pos?.y ?? hostPlanet.position?.y ?? 0;
  const targetX = px + Math.cos(angle) * orbitR;
  const targetY = py + Math.sin(angle) * orbitR;
  steerTowards(ship, targetX, targetY, dt);
  return true;
}

/**
 * Pirate Faction Configuration & Procedural Factory
 * 
 * Provides deterministic procedural generation for:
 * 1. The Pirate Bastion deep-space citadel and its garrison escort (1 Heavy Cruiser + 3 Destroyers)
 * 2. Planetary Gravity Well Pirate Garrisons (tethered perimeter patrols)
 * 3. Five (5) Roving Pirate Patrol Fleets restricted strictly to the mid-to-outer system (>= Asteroid Belt min radius)
 */

export interface PirateFleetGenerationResult {
  bastion: ShipEntity;
  bastionGarrison: ShipEntity[];
  planetaryPirates: ShipEntity[];
  rovingFleets: ShipEntity[];
  allPirates: ShipEntity[];
}

/**
 * Factory for creating the Pirate Bastion deep-space citadel
 */
export function createPirateBastion(pos: Vec2D): ShipEntity {
  return {
    id: 'pirate-bastion',
    name: 'Pirate Bastion [Corsair Stronghold]',
    faction: 'HOSTILE',
    role: 'BASTION',
    combatStance: 'AGGRESSIVE',
    aggressiveDoctrine: 'KILL',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    heading: 0,
    maxSpeed: 0,
    isStationary: true,
    isPirateBastion: true,
    defeatOnDestruction: false,

    splineActive: false,
    splineP0: { ...pos },
    splineM0: { x: 0, y: 0 },
    splineP1: { ...pos },
    splineM1: { x: 0, y: 0 },
    splineT: 0,
    splineDuration: 0,

    h2FuelMax: 10000,
    h2Fuel: 10000,
    fuelReserveRule: 0.4,

    // Armament: 10 heavy missile mounts
    missilesMax: 3000,
    missiles: 3000,
    missileTubes: 10,
    missileCooldown: 0,
    missileRange: 1200.0,
    autoFire: true,

    // Point Defense Grid
    counterMissilesMax: 400,
    counterMissiles: 400,
    counterMissilesPerSalvo: 8,
    counterMissileCooldown: 0,
    pdplaRange: 65.0,
    pdplaCooldown: 0,
    pdBeams: 6,
    pdplaActiveBeamTarget: null,
    pdplaActiveBeamTargets: [],
    pdplaBeamTimer: 0,
    pdplaBeamHit: false,
    pdplaSalvoCount: 0,
    pdplaOverheated: false,
    pdplaOverheatTimer: 0,
    pdplaOverheatDuration: 5.0,

    // Durability: 15,000 HP Hull, 45,000 HP Shield with extreme thermal overload resistance (300.0 heat cap)
    hullMax: 15000,
    hullHp: 15000,
    maxRepairableHull: 15000,
    crippleBarMax: 15000,
    crippleBar: 15000,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    shieldHpMax: 45000,
    shieldHp: 45000,
    shieldHeat: 0.0,
    shieldHeatMax: 300.0, // Tripled capacitor thermal limit
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    ewarJammingRating: 0.35,
    massRating: 350000.0,
    fmsActive: false,
    fmsMultiplier: 1.0,

    dockingRadius: 120,
    patrolAnchor: { ...pos },
  };
}

/**
 * Factory for creating a Pirate Heavy Cruiser
 */
export function createPirateHeavyCruiser(
  id: string,
  name: string,
  pos: Vec2D,
  patrolAnchor?: Vec2D,
  patrolRadius: number = 420
): ShipEntity {
  return {
    id,
    name,
    faction: 'HOSTILE',
    role: 'HEAVY_CRUISER',
    combatStance: 'AGGRESSIVE',
    aggressiveDoctrine: 'KILL',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    heading: Math.PI,
    maxSpeed: 120.0,

    splineActive: false,
    splineP0: { ...pos },
    splineM0: { x: 0, y: 0 },
    splineP1: { ...pos },
    splineM1: { x: 0, y: 0 },
    splineT: 0,
    splineDuration: 0,

    h2FuelMax: 1600,
    h2Fuel: 1600,
    fuelReserveRule: 0.4,

    missilesMax: 600,
    missiles: 600,
    missileTubes: 7,
    missileCooldown: 0,
    missileRange: 1200.0,
    autoFire: true,

    counterMissilesMax: 150,
    counterMissiles: 150,
    counterMissilesPerSalvo: 5,
    counterMissileCooldown: 0,
    pdplaRange: 65.0,
    pdplaCooldown: 0,
    pdBeams: 3,
    pdplaActiveBeamTarget: null,
    pdplaActiveBeamTargets: [],
    pdplaBeamTimer: 0,
    pdplaBeamHit: false,
    pdplaSalvoCount: 0,
    pdplaOverheated: false,
    pdplaOverheatTimer: 0,
    pdplaOverheatDuration: 5.0,

    hullMax: 1100,
    hullHp: 1100,
    maxRepairableHull: 1100,
    crippleBarMax: 900,
    crippleBar: 900,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    shieldHpMax: 3200,
    shieldHp: 3200,
    shieldHeat: 0.0,
    shieldHeatMax: 120.0,
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    ewarJammingRating: 0.3,
    massRating: 65000.0,
    fmsActive: false,
    fmsMultiplier: 3.5,

    patrolAnchor: patrolAnchor ? { ...patrolAnchor } : { ...pos },
    patrolRadius,
    patrolAngle: 0,
    patrolTimer: 0,
    patrolPattern: 'ELLIPSE_SWEEP',
    npcPatrolState: {
      anchorX: (patrolAnchor || pos).x,
      anchorY: (patrolAnchor || pos).y,
      patrolRadius,
      leashRadius: patrolRadius * 1.5,
      behaviorState: 'PATROL_ROAM',
      currentWanderTarget: null,
      dwellTicksRemaining: Math.floor(Math.random() * 60),
      targetEntityId: null,
    },
  };
}

/**
 * Factory for creating a Pirate Destroyer
 */
export function createPirateDestroyer(
  id: string,
  name: string,
  pos: Vec2D,
  patrolAnchor?: Vec2D,
  patrolRadius: number = 360
): ShipEntity {
  return {
    id,
    name,
    faction: 'HOSTILE',
    role: 'DESTROYER',
    combatStance: 'AGGRESSIVE',
    aggressiveDoctrine: 'KILL',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    heading: Math.PI,
    maxSpeed: 165.0,

    splineActive: false,
    splineP0: { ...pos },
    splineM0: { x: 0, y: 0 },
    splineP1: { ...pos },
    splineM1: { x: 0, y: 0 },
    splineT: 0,
    splineDuration: 0,

    h2FuelMax: 950,
    h2Fuel: 950,
    fuelReserveRule: 0.4,

    missilesMax: 250,
    missiles: 250,
    missileTubes: 4,
    missileCooldown: 0,
    missileRange: 1100.0,
    autoFire: true,

    counterMissilesMax: 80,
    counterMissiles: 80,
    counterMissilesPerSalvo: 2,
    counterMissileCooldown: 0,
    pdplaRange: 65.0,
    pdplaCooldown: 0,
    pdBeams: 2,
    pdplaActiveBeamTarget: null,
    pdplaActiveBeamTargets: [],
    pdplaBeamTimer: 0,
    pdplaBeamHit: false,
    pdplaSalvoCount: 0,
    pdplaOverheated: false,
    pdplaOverheatTimer: 0,
    pdplaOverheatDuration: 5.0,

    hullMax: 550,
    hullHp: 550,
    maxRepairableHull: 550,
    crippleBarMax: 450,
    crippleBar: 450,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    shieldHpMax: 1500,
    shieldHp: 1500,
    shieldHeat: 0.0,
    shieldHeatMax: 100.0,
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    ewarJammingRating: 0.2,
    massRating: 32000.0,
    fmsActive: false,
    fmsMultiplier: 4.0,

    patrolAnchor: patrolAnchor ? { ...patrolAnchor } : { ...pos },
    patrolRadius,
    patrolAngle: 0,
    patrolTimer: 0,
    patrolPattern: 'ZIG_ZAG',
    npcPatrolState: {
      anchorX: (patrolAnchor || pos).x,
      anchorY: (patrolAnchor || pos).y,
      patrolRadius,
      leashRadius: patrolRadius * 1.5,
      behaviorState: 'PATROL_ROAM',
      currentWanderTarget: null,
      dwellTicksRemaining: Math.floor(Math.random() * 60),
      targetEntityId: null,
    },
  };
}

/**
 * Factory for creating a Pirate Frigate
 */
export function createPirateFrigate(
  id: string,
  name: string,
  pos: Vec2D,
  patrolAnchor?: Vec2D,
  patrolRadius: number = 280
): ShipEntity {
  return {
    id,
    name,
    faction: 'HOSTILE',
    role: 'FRIGATE',
    combatStance: 'AGGRESSIVE',
    aggressiveDoctrine: 'KILL',
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    heading: Math.PI,
    maxSpeed: 190.0,

    splineActive: false,
    splineP0: { ...pos },
    splineM0: { x: 0, y: 0 },
    splineP1: { ...pos },
    splineM1: { x: 0, y: 0 },
    splineT: 0,
    splineDuration: 0,

    h2FuelMax: 650,
    h2Fuel: 650,
    fuelReserveRule: 0.4,

    missilesMax: 120,
    missiles: 120,
    missileTubes: 2,
    missileCooldown: 0,
    missileRange: 1050.0,
    autoFire: true,

    counterMissilesMax: 40,
    counterMissiles: 40,
    counterMissilesPerSalvo: 1,
    counterMissileCooldown: 0,
    pdplaRange: 65.0,
    pdplaCooldown: 0,
    pdBeams: 1,
    pdplaActiveBeamTarget: null,
    pdplaActiveBeamTargets: [],
    pdplaBeamTimer: 0,
    pdplaBeamHit: false,
    pdplaSalvoCount: 0,
    pdplaOverheated: false,
    pdplaOverheatTimer: 0,
    pdplaOverheatDuration: 5.0,

    hullMax: 350,
    hullHp: 350,
    maxRepairableHull: 350,
    crippleBarMax: 300,
    crippleBar: 300,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    shieldHpMax: 800,
    shieldHp: 800,
    shieldHeat: 0.0,
    shieldHeatMax: 100.0,
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    ewarJammingRating: 0.15,
    massRating: 18000.0,
    fmsActive: false,
    fmsMultiplier: 5.0,

    patrolAnchor: patrolAnchor ? { ...patrolAnchor } : { ...pos },
    patrolRadius,
    patrolAngle: 0,
    patrolTimer: 0,
    patrolPattern: 'ELLIPSE_SWEEP',
    npcPatrolState: {
      anchorX: (patrolAnchor || pos).x,
      anchorY: (patrolAnchor || pos).y,
      patrolRadius,
      leashRadius: patrolRadius * 1.5,
      behaviorState: 'PATROL_ROAM',
      currentWanderTarget: null,
      dwellTicksRemaining: Math.floor(Math.random() * 60),
      targetEntityId: null,
    },
  };
}

/**
 * Generates an 8-point orbital perimeter loop around a celestial body or anchor
 */
export function generatePerimeterWaypoints(
  anchor: Vec2D,
  radius: number,
  offsetAngle: number = 0
): Vec2D[] {
  const points: Vec2D[] = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + offsetAngle;
    points.push({
      x: anchor.x + Math.cos(angle) * radius,
      y: anchor.y + Math.sin(angle) * radius,
    });
  }
  return points;
}

/**
 * Deterministic generation of the entire Pirate Faction hierarchy
 */
export function generatePirateFaction(
  solarSystem: SolarSystem,
  rng: SeededRNG,
  hqPos: Vec2D
): PirateFleetGenerationResult {
  let shipIdCounter = 1;

  // -------------------------------------------------------------
  // 1. PIRATE BASTION ENTITY & GARRISON ESCORT
  // -------------------------------------------------------------
  // Placement: deep space in outer system band beyond asteroid belt, away from Player HQ
  const hqAngle = Math.atan2(hqPos.y, hqPos.x);
  // Spawn in the opposite hemisphere (+PI) with slight angular jitter (+/- 0.35 rad)
  const bastionAngle = hqAngle + Math.PI + rng.range(-0.35, 0.35);
  // Outer system band beyond asteroid belt (between beltRadiusMax + 3,000 and arenaRadius - 3,500)
  const minBastionDist = solarSystem.beltRadiusMax + 3000;
  const maxBastionDist = Math.max(solarSystem.arenaRadius - 3500, minBastionDist + 2000);
  const bastionDist = rng.range(minBastionDist, maxBastionDist);

  const bastionPos: Vec2D = {
    x: Math.cos(bastionAngle) * bastionDist,
    y: Math.sin(bastionAngle) * bastionDist,
  };

  const bastion = createPirateBastion(bastionPos);

  // Garrison Escort: Always 1 Heavy Cruiser and 3 Destroyers
  // Active orbital patrol vector around the Bastion (~420km radius)
  const bastionGarrison: ShipEntity[] = [];

  const hcPos: Vec2D = {
    x: bastionPos.x + 420,
    y: bastionPos.y,
  };
  const heavyCruiser = createPirateHeavyCruiser(
    `pirate-bastion-escort-hc-${shipIdCounter++}`,
    `Corsair Heavy Cruiser 'Reaver-Prime'`,
    hcPos,
    bastionPos,
    420
  );
  heavyCruiser.patrolWaypoints = generatePerimeterWaypoints(bastionPos, 420, 0);
  heavyCruiser.npcPatrolState = {
    anchorX: bastionPos.x,
    anchorY: bastionPos.y,
    patrolRadius: 420,
    leashRadius: 420 * 1.5,
    behaviorState: 'PATROL_ROAM',
    currentWanderTarget: null,
    dwellTicksRemaining: 0,
    targetEntityId: null,
  };
  bastionGarrison.push(heavyCruiser);

  const destroyerNames = [
    `Corsair Destroyer 'Marauder-Alpha'`,
    `Corsair Destroyer 'Marauder-Beta'`,
    `Corsair Destroyer 'Marauder-Gamma'`,
  ];
  for (let i = 0; i < 3; i++) {
    const angle = ((i + 1) / 3) * Math.PI * 2;
    const dPos: Vec2D = {
      x: bastionPos.x + Math.cos(angle) * 360,
      y: bastionPos.y + Math.sin(angle) * 360,
    };
    const dest = createPirateDestroyer(
      `pirate-bastion-escort-dd-${shipIdCounter++}`,
      destroyerNames[i],
      dPos,
      bastionPos,
      360
    );
    dest.patrolWaypoints = generatePerimeterWaypoints(bastionPos, 360, angle);
    dest.npcPatrolState = {
      anchorX: bastionPos.x,
      anchorY: bastionPos.y,
      patrolRadius: 360,
      leashRadius: 360 * 1.5,
      behaviorState: 'PATROL_ROAM',
      currentWanderTarget: null,
      dwellTicksRemaining: 0,
      targetEntityId: null,
    };
    bastionGarrison.push(dest);
  }

  // -------------------------------------------------------------
  // 2. PLANETARY GRAVITY WELL PIRATE SPAWNS
  // -------------------------------------------------------------
  const planetaryPirates: ShipEntity[] = [];

  // Helper to tether ship to planet gravity well perimeter
  const tetherToPlanetGravityWell = (
    ship: ShipEntity,
    planet: RockyPlanet | GasGiant,
    shipIdx: number,
    totalShips: number
  ) => {
    // Exact center coordinates of assigned celestial body's gravity well
    const rBody = planet.radius || 0;
    const rWell = planet.wellRadius || getPlanetaryGravityWellRadius(planet);
    // NPC patrol bounds:
    // Minimum patrol distance from center: R_min_patrol = R_body + 300 km
    // Maximum: R_max_patrol = R_well - 200 km
    // Leash break-off boundary: R_leash = R_body + 1.50 * (R_well - R_body)
    const minPatrol = rBody > 0 ? rBody + 300.0 : 0;
    const maxPatrol = rBody > 0 ? Math.max(minPatrol + 100.0, rWell - 200.0) : rWell * 0.85;
    const calculatedLeash = rBody > 0 ? rBody + 1.50 * (rWell - rBody) : rWell * 1.50;

    // Spawn patrol ships centered in the valid annular band
    const gwPerimeterRadius = (minPatrol + maxPatrol) / 2.0;
    const offsetAngle = (shipIdx / Math.max(totalShips, 1)) * Math.PI * 2;
    ship.pos = {
      x: planet.pos.x + Math.cos(offsetAngle) * gwPerimeterRadius,
      y: planet.pos.y + Math.sin(offsetAngle) * gwPerimeterRadius,
    };
    ship.patrolAnchor = { ...planet.pos };
    ship.patrolRadius = maxPatrol;
    ship.patrolPattern = 'ELLIPSE_SWEEP';
    ship.patrolWaypoints = generatePerimeterWaypoints(planet.pos, gwPerimeterRadius, offsetAngle);
    ship.inGravityWell = true;
    ship.gravityWellBody = planet.name;
    ship.gravityWellTetherPlanetId = planet.id;
    ship.npcPatrolState = {
      anchorX: planet.pos.x,
      anchorY: planet.pos.y,
      patrolRadius: maxPatrol,
      leashRadius: calculatedLeash,
      behaviorState: 'PATROL_ROAM',
      currentWanderTarget: null,
      dwellTicksRemaining: Math.floor(Math.random() * 60),
      targetEntityId: null,
      tetherPlanetId: planet.id,
      bodyRadius: rBody,
      minPatrolRadius: minPatrol,
      maxPatrolRadius: maxPatrol,
    };
  };

  // A. Rocky Planets (excluding Player HQ planet)
  for (const planet of solarSystem.rockyPlanets) {
    if (planet.isPrimaryHabitable) {
      // Excluded from all ambient pirate spawns
      continue;
    }

    const spawnedShips: ShipEntity[] = [];

    // Frigate Baseline: Guaranteed on Verdant-Prime, 85% chance on other rocky planets
    const isVerdant = planet.name.includes('Verdant') || planet.id.includes('verdant');
    if (isVerdant || rng.next() < 0.85) {
      spawnedShips.push(
        createPirateFrigate(
          `pirate-gw-frigate-${shipIdCounter++}`,
          `Corsair Frigate [${planet.name} Sentry-I]`,
          planet.pos
        )
      );
      if (rng.next() < 0.35) {
        spawnedShips.push(
          createPirateFrigate(
            `pirate-gw-frigate-${shipIdCounter++}`,
            `Corsair Frigate [${planet.name} Sentry-II]`,
            planet.pos
          )
        );
      }
    }

    // Rocky Planets Additional Roll: 50% chance to spawn 1 Pirate Destroyer
    if (rng.next() < 0.5) {
      spawnedShips.push(
        createPirateDestroyer(
          `pirate-gw-destroyer-${shipIdCounter++}`,
          `Corsair Destroyer [${planet.name} Enforcer]`,
          planet.pos
        )
      );
    }

    // Position and tether all spawned ships around the gravity well perimeter
    spawnedShips.forEach((s, idx) => {
      tetherToPlanetGravityWell(s, planet, idx, spawnedShips.length);
      planetaryPirates.push(s);
    });
  }

  // B. Gas Giants (Guaranteed Heavy Garrison)
  for (const giant of solarSystem.gasGiants) {
    const spawnedShips: ShipEntity[] = [];

    // Frigate Baseline roll (85% + 35%)
    if (rng.next() < 0.85) {
      spawnedShips.push(
        createPirateFrigate(
          `pirate-gw-frigate-${shipIdCounter++}`,
          `Corsair Frigate [${giant.name} Picket-A]`,
          giant.pos
        )
      );
      if (rng.next() < 0.35) {
        spawnedShips.push(
          createPirateFrigate(
            `pirate-gw-frigate-${shipIdCounter++}`,
            `Corsair Frigate [${giant.name} Picket-B]`,
            giant.pos
          )
        );
      }
    }

    // Gas Giants (Guaranteed Heavy Garrison):
    // 100% chance: Spawns 1 Pirate Destroyer and 3 Pirate Frigates
    spawnedShips.push(
      createPirateDestroyer(
        `pirate-gw-destroyer-${shipIdCounter++}`,
        `Corsair Destroyer [${giant.name} Siege-Leader]`,
        giant.pos
      )
    );
    for (let f = 1; f <= 3; f++) {
      spawnedShips.push(
        createPirateFrigate(
          `pirate-gw-frigate-${shipIdCounter++}`,
          `Corsair Frigate [${giant.name} Escort-${f}]`,
          giant.pos
        )
      );
    }

    // 80% chance: Spawns a 2nd Pirate Destroyer
    if (rng.next() < 0.8) {
      spawnedShips.push(
        createPirateDestroyer(
          `pirate-gw-destroyer-${shipIdCounter++}`,
          `Corsair Destroyer [${giant.name} Flank-Guard]`,
          giant.pos
        )
      );
    }

    spawnedShips.forEach((s, idx) => {
      tetherToPlanetGravityWell(s, giant, idx, spawnedShips.length);
      planetaryPirates.push(s);
    });
  }

  // -------------------------------------------------------------
  // 3. SYSTEM ROVING PIRATE PATROLS (Count: Exactly 5 Fleets)
  // -------------------------------------------------------------
  const rovingFleets: ShipEntity[] = [];
  const ROVING_FLEET_COUNT = 5;
  const beltMinRadius = solarSystem.beltRadiusMin;
  const outerLimit = Math.max(solarSystem.arenaRadius - 2000, beltMinRadius + 4000);

  const fleetDesignations = ['Iron Claw', 'Black Tide', 'Void Fang', 'Blood Star', 'Shadow Maw'];

  for (let fleetIdx = 0; fleetIdx < ROVING_FLEET_COUNT; fleetIdx++) {
    const fleetName = fleetDesignations[fleetIdx % fleetDesignations.length];
    const fleetId = `roving-fleet-${fleetIdx + 1}`;

    // Generate fleet's base patrol orbit around outer system
    const baseAngle = (fleetIdx / ROVING_FLEET_COUNT) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const fleetDist = rng.range(beltMinRadius + 800, outerLimit);

    // Fleet Center Patrol Circuit: 8 outer-system waypoints strictly >= beltMinRadius
    const circuitPoints: Vec2D[] = [];
    const wpCount = 8;
    for (let w = 0; w < wpCount; w++) {
      const angle = baseAngle + (w / wpCount) * Math.PI * 2 + rng.range(-0.15, 0.15);
      // Strictly enforce >= beltMinRadius + 500
      const radius = rng.range(beltMinRadius + 600, outerLimit);
      circuitPoints.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    // Determine fleet composition:
    // Base: 5 Pirate Frigates + 2 Pirate Destroyers
    let numFrigates = 5;
    let numDestroyers = 2;

    // Reinforcement Roll A: 50% chance to add +2 Pirate Frigates
    if (rng.next() < 0.5) {
      numFrigates += 2;
    }

    // Reinforcement Roll B: 45% chance to add +1 Pirate Destroyer
    if (rng.next() < 0.45) {
      numDestroyers += 1;
    }

    const fleetShips: ShipEntity[] = [];

    // Create Destroyers
    for (let d = 0; d < numDestroyers; d++) {
      fleetShips.push(
        createPirateDestroyer(
          `roving-${fleetIdx + 1}-dd-${shipIdCounter++}`,
          `${fleetName} Destroyer ${d === 0 ? 'Lead' : `Escort-${d}`}`,
          circuitPoints[0]
        )
      );
    }

    // Create Frigates
    for (let f = 0; f < numFrigates; f++) {
      fleetShips.push(
        createPirateFrigate(
          `roving-${fleetIdx + 1}-ff-${shipIdCounter++}`,
          `${fleetName} Frigate ${f + 1}`,
          circuitPoints[0]
        )
      );
    }

    // Configure formation positions & patrol circuits for all fleet members
    fleetShips.forEach((ship, shipIdx) => {
      // Tactical formation offset
      const row = Math.floor(shipIdx / 3);
      const col = (shipIdx % 3) - 1;
      const offX = col * 85 + (ship.role === 'DESTROYER' ? 0 : 35);
      const offY = (row - 1) * 85;

      // Assign ship waypoints based on fleet circuit with offset
      const shipWaypoints = circuitPoints.map((wp) => {
        let x = wp.x + offX;
        let y = wp.y + offY;
        const d = Math.hypot(x, y);
        if (d < beltMinRadius + 400) {
          // Strictly clamp outward if offset clipped inner radius
          const scale = (beltMinRadius + 400) / (d || 1);
          x *= scale;
          y *= scale;
        }
        return { x, y };
      });

      ship.pos = { ...shipWaypoints[0] };
      ship.isRovingPirate = true;
      ship.rovingFleetId = fleetId;
      ship.patrolAnchor = { ...circuitPoints[0] };
      ship.patrolRadius = DEFAULT_BELT_PATROL_RADIUS;
      ship.patrolPattern = 'PERIMETER_BOX';
      ship.patrolWaypoints = shipWaypoints;
      ship.patrolWaypointIndex = 0;
      ship.npcPatrolState = {
        anchorX: circuitPoints[0].x,
        anchorY: circuitPoints[0].y,
        patrolRadius: DEFAULT_BELT_PATROL_RADIUS,
        leashRadius: DEFAULT_BELT_PATROL_RADIUS * 1.5,
        behaviorState: 'PATROL_ROAM',
        currentWanderTarget: null,
        dwellTicksRemaining: Math.floor(Math.random() * 60),
        targetEntityId: null,
      };

      rovingFleets.push(ship);
    });
  }

  const allPirates: ShipEntity[] = [
    bastion,
    ...bastionGarrison,
    ...planetaryPirates,
    ...rovingFleets,
  ];

  allPirates.forEach((ship) => {
    if (ship.maxSpeed) ship.maxSpeed *= K_SCALE;
    if (ship.missileRange) ship.missileRange *= K_SCALE;
    if (ship.pdplaRange) ship.pdplaRange *= K_SCALE;
  });

  return {
    bastion,
    bastionGarrison,
    planetaryPirates,
    rovingFleets,
    allPirates,
  };
}
