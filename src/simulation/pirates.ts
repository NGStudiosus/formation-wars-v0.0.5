import {
  ShipEntity,
  SolarSystem,
  Vec2D,
  RockyPlanet,
  GasGiant,
  StarSystemDescriptor,
  ShipRole,
  FactionId,
} from '../types';
import { SeededRNG, getPlanetaryGravityWellRadius } from './solarSystem';
import { K_SCALE } from './systemConstants';
import { initNPCPatrolState, DEFAULT_BELT_PATROL_RADIUS } from './npcController';
import { SHIP_PROTOTYPES, ShipPrototypeDefinition } from './shipPrototypes';
import { clampAngularSlew } from './kinematics';
import { FACTION_REGISTRY } from './factions/factionRegistry';

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
  mooredAnchorId?: string,
  factionId?: FactionId | 'PIRATE'
): ShipEntity {
  const isPirate = faction === 'PIRATE' || factionId === 'PIRATE' || id.includes('pirate');
  const effectiveFactionId = isPirate ? ('PIRATE' as const) : (factionId || 'KOVAK');
  const facMeta = isPirate ? null : FACTION_REGISTRY[effectiveFactionId as FactionId];
  const factionNamePrefix = isPirate ? 'Corsair' : (facMeta ? facMeta.name : 'Imperial');
  const proto = SHIP_PROTOTYPES[shipClass] || SHIP_PROTOTYPES['FRIGATE'];

  // Balance Tuning:
  // Pirate/Defender ships deal an ok amount of damage (65 dmg torpedoes) but cannot take much in return (fragile glass hulls, paper shields).
  // 3 Kovak frigates and a destroyer (10 missile tubes total, 160 dmg/mssl) can destroy 6-7 pirate/defender NPCs with ~90% certainty.
  let hp: number;
  let shield: number;
  let tubes: number;
  let missilesMax: number;
  let counterMissilesMax: number;
  let pdBeams: number;
  let massRating: number;
  let missileRange: number;
  let ewarJammingRating: number;
  const cruiseSpeed = proto.cruiseSpeed || 120;
  const maxSpeed = proto.maxSpeed || 200;
  const heading = Math.random() * Math.PI * 2;
  const baseRadius = proto.baseRadius || 6;

  if (isPirate) {
    if (shipClass === 'DESTROYER' || shipClass === 'DD') {
      hp = 85;
      shield = 155;
      tubes = 3;
      missilesMax = 60;
      counterMissilesMax = 10;
      pdBeams = 1;
      massRating = 24000;
      missileRange = 900.0;
      ewarJammingRating = 0.08;
    } else if (shipClass === 'HEAVY_CRUISER' || shipClass === 'CH' || shipClass === 'CRUISER' || shipClass === 'CL') {
      hp = 150;
      shield = 280;
      tubes = 4;
      missilesMax = 100;
      counterMissilesMax = 16;
      pdBeams = 2;
      massRating = 40000;
      missileRange = 1000.0;
      ewarJammingRating = 0.10;
    } else {
      // Frigate / Scout / Raider
      hp = 45;
      shield = 85;
      tubes = 2;
      missilesMax = 30;
      counterMissilesMax = 6;
      pdBeams = 1;
      massRating = 14000;
      missileRange = 850.0;
      ewarJammingRating = 0.05;
    }
  } else {
    // Sovereign AI Opponent fleet (Military standard)
    hp = proto.hp || 500;
    shield = proto.shield || 700;
    tubes = proto.missileTubes || 2;
    missilesMax = proto.missilesMax || 120;
    counterMissilesMax = proto.counterMissilesMax || 40;
    pdBeams = proto.pdBeams || 1;
    massRating = proto.massRating || 25000;
    missileRange = 1100.0;
    ewarJammingRating = 0.20;
  }

  const fuelH2 = proto.fuelH2 || 1000;

  return {
    id,
    name: `${factionNamePrefix} ${proto.name} ${id.split('_').pop()}`,
    systemId,
    faction: 'HOSTILE',
    factionId: effectiveFactionId,
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
    crippleBar: Math.round(hp * 0.25),
    crippleBarMax: Math.round(hp * 0.25),
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,
    shield,
    maxShield: shield,
    shieldHp: shield,
    shieldHpMax: shield,
    shieldHeat: 0,
    shieldHeatMax: 100,
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
    missileRange,
    counterMissiles: counterMissilesMax,
    counterMissilesMax,
    counterMissilesPerSalvo: Math.max(1, Math.floor(tubes / 2)),
    counterMissileCooldown: 0,
    autoFire: true,
    ewarJammingRating,
    pdplaRange: 60,
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
 * Spawns system-aware hostile fleet and planetary garrison units for a star system.
 * Rules:
 * - Each star system has NPCs even if there's no AI or real players in it.
 * - NPCs are default hostile to all except each other (handled by areShipsHostile).
 * - Rocky planets have patrollers: 3-6 frigates and 1-2 destroyers (excluding player HQ capital).
 * - Asteroid clusters have 1-3 frigates each cluster.
 * - Gas giants have 5-8 frigates, 2-4 destroyers, and 50% chance of spawning a cruiser.
 * - Units spawn in their own star system with matching systemId and local anchors.
 */
export function spawnSystemHostiles(system: StarSystemDescriptor, state?: any): ShipEntity[] {
  const spawnedShips: ShipEntity[] = [];
  const isHomeworldSystem = system.index === 0;
  const sysId = system.id;
  const sysCenter = system.center || { x: 0, y: 0 };
  const assignedFaction: FactionId =
    system.assignedFaction ||
    (state?.gameSetupConfig?.systemOpponents && system.index > 0
      ? state.gameSetupConfig.systemOpponents[system.index - 1]
      : 'KOVAK');

  let shipSeq = 0;

  // 1. ROCKY PLANET PATROLLERS (3-6 Frigates and 1-2 Destroyers)
  const rockyPlanets = (system.planets || []).filter((p) => p.type === 'ROCKY');

  for (let i = 0; i < rockyPlanets.length; i++) {
    const planet = rockyPlanets[i];
    const px = planet.x ?? planet.pos?.x ?? planet.position?.x ?? (sysCenter.x + 30000);
    const py = planet.y ?? planet.pos?.y ?? planet.position?.y ?? sysCenter.y;
    const isPlayerCapital = isHomeworldSystem && (planet.isPrimaryHabitable || planet.isHabitable);

    // In Homeworld system: Skip player's habitable capital world where player HQ spawns
    if (isPlayerCapital) {
      continue;
    }

    // In Outer Systems (system.index > 0), if this is the habitable planet / seat of power of the AI opponent:
    if (!isHomeworldSystem && planet.isHabitable) {
      // Spawn Sovereign Enemy AI Capital Battlegroup (belongs to assignedFaction, NOT pirate)
      const aiCapitalFlagship = createHostileShip(
        `${sysId}_AI_FLAGSHIP_${++shipSeq}`,
        sysId,
        'HOSTILE',
        'HEAVY_CRUISER',
        px + 1200,
        py + 400,
        planet.id,
        assignedFaction
      );
      aiCapitalFlagship.isPirate = false;
      aiCapitalFlagship.factionId = assignedFaction;
      aiCapitalFlagship.patrolAnchor = { x: px, y: py };

      const aiEscortDd1 = createHostileShip(`${sysId}_AI_DD_${++shipSeq}`, sysId, 'HOSTILE', 'DESTROYER', px - 900, py + 800, planet.id, assignedFaction);
      aiEscortDd1.isPirate = false;
      aiEscortDd1.factionId = assignedFaction;
      aiEscortDd1.patrolAnchor = { x: px, y: py };

      const aiEscortDd2 = createHostileShip(`${sysId}_AI_DD_${++shipSeq}`, sysId, 'HOSTILE', 'DESTROYER', px + 900, py - 800, planet.id, assignedFaction);
      aiEscortDd2.isPirate = false;
      aiEscortDd2.factionId = assignedFaction;
      aiEscortDd2.patrolAnchor = { x: px, y: py };

      const aiEscortFf1 = createHostileShip(`${sysId}_AI_FF_${++shipSeq}`, sysId, 'HOSTILE', 'FRIGATE', px + 750, py - 1100, planet.id, assignedFaction);
      aiEscortFf1.isPirate = false;
      aiEscortFf1.factionId = assignedFaction;
      aiEscortFf1.patrolAnchor = { x: px, y: py };

      const aiEscortFf2 = createHostileShip(`${sysId}_AI_FF_${++shipSeq}`, sysId, 'HOSTILE', 'FRIGATE', px - 1100, py - 600, planet.id, assignedFaction);
      aiEscortFf2.isPirate = false;
      aiEscortFf2.factionId = assignedFaction;
      aiEscortFf2.patrolAnchor = { x: px, y: py };

      const aiEscortFf3 = createHostileShip(`${sysId}_AI_FF_${++shipSeq}`, sysId, 'HOSTILE', 'FRIGATE', px - 700, py + 1200, planet.id, assignedFaction);
      aiEscortFf3.isPirate = false;
      aiEscortFf3.factionId = assignedFaction;
      aiEscortFf3.patrolAnchor = { x: px, y: py };

      spawnedShips.push(aiCapitalFlagship, aiEscortDd1, aiEscortDd2, aiEscortFf1, aiEscortFf2, aiEscortFf3);
    }

    // Rocky Planet NPC Patrollers: 3-6 Frigates and 1-2 Destroyers
    const frigateCount = Math.floor(Math.random() * 4) + 3; // 3 to 6
    const destroyerCount = Math.floor(Math.random() * 2) + 1; // 1 to 2
    const totalPatrollers = frigateCount + destroyerCount;

    for (let s = 0; s < totalPatrollers; s++) {
      const isDestroyer = s < destroyerCount;
      const shipClass = isDestroyer ? 'DESTROYER' : 'FRIGATE';
      const angle = (s / totalPatrollers) * Math.PI * 2 + Math.random() * 0.3;
      const orbitDist = Math.max(planet.radius + 350, 1400) + Math.random() * 600;
      const sx = px + Math.cos(angle) * orbitDist;
      const sy = py + Math.sin(angle) * orbitDist;

      const patroller = createHostileShip(
        `${sysId}_PLN_${i + 1}_PATROL_${++shipSeq}`,
        sysId,
        'PIRATE',
        shipClass,
        sx,
        sy,
        planet.id,
        'PIRATE' as any
      );
      patroller.patrolAnchor = { x: px, y: py };
      patroller.patrolRadius = orbitDist + 400;
      patroller.patrolWaypoints = generatePerimeterWaypoints({ x: px, y: py }, orbitDist, angle);
      patroller.npcPatrolState = {
        anchorX: px,
        anchorY: py,
        patrolRadius: orbitDist + 400,
        leashRadius: (orbitDist + 400) * 1.5,
        behaviorState: 'PATROL_ROAM',
        currentWanderTarget: null,
        dwellTicksRemaining: Math.floor(Math.random() * 60),
        targetEntityId: null,
        tetherPlanetId: planet.id,
      };
      spawnedShips.push(patroller);
    }
  }

  // 2. ASTEROID CLUSTER PATROLLERS (1-3 Frigates each cluster)
  const allClusters = system.clusters || [];
  for (let c = 0; c < allClusters.length; c++) {
    const cluster = allClusters[c];
    const cx = cluster.center?.x ?? (cluster as any).x ?? sysCenter.x;
    const cy = cluster.center?.y ?? (cluster as any).y ?? sysCenter.y;
    const clusterFrigateCount = Math.floor(Math.random() * 3) + 1; // 1 to 3

    for (let f = 0; f < clusterFrigateCount; f++) {
      const angle = (f / clusterFrigateCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 300 + Math.random() * 600;
      const fx = cx + Math.cos(angle) * dist;
      const fy = cy + Math.sin(angle) * dist;

      const clusterPicket = createHostileShip(
        `${sysId}_CLUST_${c + 1}_PICKET_${++shipSeq}`,
        sysId,
        'PIRATE',
        'FRIGATE',
        fx,
        fy,
        cluster.id,
        'PIRATE' as any
      );
      clusterPicket.patrolAnchor = { x: cx, y: cy };
      clusterPicket.patrolRadius = cluster.radius || 2200;
      clusterPicket.patrolWaypoints = generatePerimeterWaypoints({ x: cx, y: cy }, 800, angle);
      clusterPicket.npcPatrolState = {
        anchorX: cx,
        anchorY: cy,
        patrolRadius: cluster.radius || 2200,
        leashRadius: (cluster.radius || 2200) * 1.5,
        behaviorState: 'PATROL_ROAM',
        currentWanderTarget: null,
        dwellTicksRemaining: Math.floor(Math.random() * 60),
        targetEntityId: null,
      };
      spawnedShips.push(clusterPicket);
    }
  }

  // 3. GAS GIANT GARRISONS (5-8 Frigates, 2-4 Destroyers and 50% chance of spawning a cruiser)
  const gasGiants = (system.planets || []).filter((p) => p.type === 'GAS_GIANT');
  for (let g = 0; g < gasGiants.length; g++) {
    const giant = gasGiants[g];
    const gx = giant.x ?? giant.pos?.x ?? giant.position?.x ?? (sysCenter.x + 180000);
    const gy = giant.y ?? giant.pos?.y ?? giant.position?.y ?? sysCenter.y;

    const giantFrigates = Math.floor(Math.random() * 4) + 5; // 5 to 8
    const giantDestroyers = Math.floor(Math.random() * 3) + 2; // 2 to 4
    const spawnCruiser = Math.random() < 0.5; // 50% chance
    const cruiserCount = spawnCruiser ? 1 : 0;
    const totalGiantShips = giantFrigates + giantDestroyers + cruiserCount;

    for (let s = 0; s < totalGiantShips; s++) {
      let shipClass = 'FRIGATE';
      if (s < cruiserCount) {
        shipClass = Math.random() > 0.5 ? 'HEAVY_CRUISER' : 'LIGHT_CRUISER';
      } else if (s < cruiserCount + giantDestroyers) {
        shipClass = 'DESTROYER';
      }

      const angle = (s / totalGiantShips) * Math.PI * 2 + Math.random() * 0.25;
      const orbitDist = Math.max(giant.radius + 600, 2400) + Math.random() * 900;
      const sx = gx + Math.cos(angle) * orbitDist;
      const sy = gy + Math.sin(angle) * orbitDist;

      const giantWarship = createHostileShip(
        `${sysId}_GIANT_${g + 1}_GARRISON_${++shipSeq}`,
        sysId,
        'PIRATE',
        shipClass,
        sx,
        sy,
        giant.id,
        'PIRATE' as any
      );
      giantWarship.patrolAnchor = { x: gx, y: gy };
      giantWarship.patrolRadius = orbitDist + 800;
      giantWarship.patrolWaypoints = generatePerimeterWaypoints({ x: gx, y: gy }, orbitDist, angle);
      giantWarship.npcPatrolState = {
        anchorX: gx,
        anchorY: gy,
        patrolRadius: orbitDist + 800,
        leashRadius: (orbitDist + 800) * 1.5,
        behaviorState: 'PATROL_ROAM',
        currentWanderTarget: null,
        dwellTicksRemaining: Math.floor(Math.random() * 60),
        targetEntityId: null,
        tetherPlanetId: giant.id,
      };
      spawnedShips.push(giantWarship);
    }
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
    x: pos.x,
    y: pos.y,
    velocity: { x: 0, y: 0 },
    heading: 0,
    maxSpeed: 0,
    isStationary: true,
    isPirateBastion: true,
    defeatOnDestruction: false,
    visibilityTier: 'NONE',
    visibilityState: 'HIDDEN',

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
    x: pos.x,
    y: pos.y,
    velocity: { x: 0, y: 0 },
    heading: Math.PI,
    maxSpeed: 120.0,
    visibilityTier: 'NONE',
    visibilityState: 'HIDDEN',

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

    missilesMax: 120,
    missiles: 120,
    missileTubes: 4,
    missileCooldown: 0,
    missileRange: 1050.0,
    autoFire: true,

    counterMissilesMax: 20,
    counterMissiles: 20,
    counterMissilesPerSalvo: 2,
    counterMissileCooldown: 0,
    pdplaRange: 60.0,
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

    hullMax: 180,
    hullHp: 180,
    maxRepairableHull: 180,
    crippleBarMax: 45,
    crippleBar: 45,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    shieldHpMax: 340,
    shieldHp: 340,
    shieldHeat: 0.0,
    shieldHeatMax: 100.0,
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    ewarJammingRating: 0.12,
    massRating: 45000.0,
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
    x: pos.x,
    y: pos.y,
    velocity: { x: 0, y: 0 },
    heading: Math.PI,
    maxSpeed: 165.0,
    visibilityTier: 'NONE',
    visibilityState: 'HIDDEN',

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

    missilesMax: 60,
    missiles: 60,
    missileTubes: 3,
    missileCooldown: 0,
    missileRange: 900.0,
    autoFire: true,

    counterMissilesMax: 10,
    counterMissiles: 10,
    counterMissilesPerSalvo: 1,
    counterMissileCooldown: 0,
    pdplaRange: 60.0,
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

    hullMax: 85,
    hullHp: 85,
    maxRepairableHull: 85,
    crippleBarMax: 21.25,
    crippleBar: 21.25,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    shieldHpMax: 155,
    shieldHp: 155,
    shieldHeat: 0.0,
    shieldHeatMax: 100.0,
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    ewarJammingRating: 0.08,
    massRating: 24000.0,
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
    x: pos.x,
    y: pos.y,
    velocity: { x: 0, y: 0 },
    heading: Math.PI,
    maxSpeed: 190.0,
    visibilityTier: 'NONE',
    visibilityState: 'HIDDEN',

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

    missilesMax: 30,
    missiles: 30,
    missileTubes: 2,
    missileCooldown: 0,
    missileRange: 850.0,
    autoFire: true,

    counterMissilesMax: 6,
    counterMissiles: 6,
    counterMissilesPerSalvo: 1,
    counterMissileCooldown: 0,
    pdplaRange: 55.0,
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

    hullMax: 45,
    hullHp: 45,
    maxRepairableHull: 45,
    crippleBarMax: 11.25,
    crippleBar: 11.25,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    shieldHpMax: 85,
    shieldHp: 85,
    shieldHeat: 0.0,
    shieldHeatMax: 100.0,
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    ewarJammingRating: 0.05,
    massRating: 14000.0,
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
    ship.x = ship.pos.x;
    ship.y = ship.pos.y;
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
