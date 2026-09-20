import { ShipEntity, StructureType, Vec2D, RockyPlanet, GasGiant } from '../types';
import { RESEARCH_STATION_COSTS } from './structureTypes';

export { RESEARCH_STATION_COSTS };

export interface StructureDef {
  type: StructureType;
  name: string;
  code: string;
  category: 'SHIPYARD' | 'DEFENSE' | 'SUPPORT' | 'INDUSTRIAL';
  costMetallic: number;
  costOrganic: number;
  buildTicks?: number;
  buildDurationSeconds?: number;
  hullMax: number;
  shieldHpMax: number;
  description: string;
  trait: string;
  radius: number;
  dockingRadius?: number;
  mooring?: string;
  capacity?: string;
}

export const STRUCTURE_CATALOG: Record<StructureType, StructureDef> = {
  SY_LIGHT: {
    type: 'SY_LIGHT',
    name: 'Light Orbital Shipyard',
    code: 'SY-L',
    category: 'SHIPYARD',
    costMetallic: 6000,
    costOrganic: 1500,
    hullMax: 4000,
    shieldHpMax: 3000,
    description: 'Light orbital slipway for escorts, light cruisers, and autonomous miners.',
    trait: 'Constructs Frigate (FG), Destroyer (DD), Light Cruiser (CL), Autonomous Miner (MINER).',
    mooring: 'Requires placement inside an active gravity well.',
    radius: 38,
    dockingRadius: 75,
  },
  SY_MEDIUM: {
    type: 'SY_MEDIUM',
    name: 'Medium Orbital Shipyard',
    code: 'SY-M',
    category: 'SHIPYARD',
    costMetallic: 18000,
    costOrganic: 4500,
    hullMax: 7500,
    shieldHpMax: 5000,
    description: 'Medium orbital slipway for capital cruisers and fleet logistics vessels.',
    trait: 'Constructs Heavy Cruiser (CH), Battlecruiser (BC), Fleet Repair Ship (REP_SHIP), Fleet Collier (COLLIER), Fuel Tanker (TANKER), Salvager (SALVAGER).',
    mooring: 'Requires placement inside an active gravity well.',
    capacity: 'Prerequisite: Civic Tier 3 / Military Tier 4',
    radius: 46,
    dockingRadius: 95,
  },
  SY_HEAVY: {
    type: 'SY_HEAVY',
    name: 'Heavy Orbital Shipyard',
    code: 'SY-H',
    category: 'SHIPYARD',
    costMetallic: 45000,
    costOrganic: 12000,
    hullMax: 15000,
    shieldHpMax: 10000,
    description: 'Super-heavy orbital drydock for line battleships, dreadnoughts, and super-capital carriers.',
    trait: 'Constructs Battleship (BB), Dreadnought (DN), and Super-Capital Carriers (CV, CVF).',
    mooring: 'Requires placement inside an active gravity well.',
    capacity: 'Prerequisite: Military Tier 7',
    radius: 56,
    dockingRadius: 130,
  },
  MILITARY_RESEARCH: {
    type: 'MILITARY_RESEARCH',
    name: 'Military Research Station',
    code: 'MRS',
    category: 'SUPPORT',
    costMetallic: RESEARCH_STATION_COSTS.MRS.metallic,
    costOrganic: RESEARCH_STATION_COSTS.MRS.organic,
    buildTicks: RESEARCH_STATION_COSTS.MRS.buildTicks,
    buildDurationSeconds: 5.0,
    hullMax: 3500,
    shieldHpMax: 3000,
    description: 'Orbital military research laboratory synthesizing advanced warship telemetry and hull alloys.',
    trait: '+1 Military Lab tier capacity. Requires placement inside an active planetary, lunar, or tight asteroid cluster gravity well.',
    mooring: 'Requires placement inside an active planetary, lunar, or tight asteroid cluster gravity well.',
    capacity: '+1 Military Lab tier capacity',
    radius: 32,
    dockingRadius: 60,
  },
  CIVIC_RESEARCH: {
    type: 'CIVIC_RESEARCH',
    name: 'Civic Research Outpost',
    code: 'CRO',
    category: 'SUPPORT',
    costMetallic: RESEARCH_STATION_COSTS.CRO.metallic,
    costOrganic: RESEARCH_STATION_COSTS.CRO.organic,
    buildTicks: RESEARCH_STATION_COSTS.CRO.buildTicks,
    buildDurationSeconds: 5.0,
    hullMax: 3000,
    shieldHpMax: 2500,
    description: 'Civic scientific research outpost analyzing propulsion kinetics and sensor resolution.',
    trait: '+1 Civic Lab tier capacity. Requires placement inside an active gravity well.',
    mooring: 'Requires placement inside an active gravity well.',
    capacity: '+1 Civic Lab tier capacity',
    radius: 30,
    dockingRadius: 50,
  },
  EXPANSION_CITADEL: {
    type: 'EXPANSION_CITADEL',
    name: 'Expansion Citadel',
    code: 'EXC',
    category: 'INDUSTRIAL',
    costMetallic: RESEARCH_STATION_COSTS.EXC.metallic,
    costOrganic: RESEARCH_STATION_COSTS.EXC.organic,
    buildTicks: RESEARCH_STATION_COSTS.EXC.buildTicks,
    buildDurationSeconds: 5.0,
    hullMax: 8000,
    shieldHpMax: 6000,
    description: 'Deep-space regional expansion citadel providing sovereign anchoring, deep-space logistics, rearm, and repair.',
    trait: '+1 Expansion Lab tier capacity. Requires placement inside an active gravity well.',
    mooring: 'Requires placement inside an active gravity well.',
    capacity: '+1 Expansion Lab tier capacity',
    radius: 50,
    dockingRadius: 120,
  },
  POST_SENSOR_SM: {
    type: 'POST_SENSOR_SM',
    name: 'Small Sensor Post',
    code: 'POST-S',
    category: 'SUPPORT',
    costMetallic: 3000,
    costOrganic: 1500,
    hullMax: 2000,
    shieldHpMax: 1500,
    description: 'Light orbital early-warning sensor platform providing passive orbital tracking and perimeter alerts.',
    trait: 'Extends passive detection horizon and maintains early warning coverage across local orbit.',
    mooring: 'Requires placement inside an active gravity well.',
    radius: 24,
    dockingRadius: 45,
  },
  POST_SENSOR_MD: {
    type: 'POST_SENSOR_MD',
    name: 'Medium Sensor Post',
    code: 'POST-M',
    category: 'SUPPORT',
    costMetallic: 6500,
    costOrganic: 3500,
    hullMax: 3500,
    shieldHpMax: 3000,
    description: 'Mid-range electronic surveillance and subspace tachyon relay array.',
    trait: 'Expands active radar and passive telemetry envelope across transit lanes.',
    mooring: 'Requires placement inside an active gravity well.',
    radius: 30,
    dockingRadius: 60,
  },
  POST_SENSOR_LG: {
    type: 'POST_SENSOR_LG',
    name: 'Large Sensor Post',
    code: 'POST-L',
    category: 'SUPPORT',
    costMetallic: 12000,
    costOrganic: 7000,
    hullMax: 5500,
    shieldHpMax: 5000,
    description: 'Heavy deep-space tachyon array and long-range sensor bastion.',
    trait: 'Wide-area sensor projection, penetrating nebula interference and fog of war.',
    mooring: 'Requires placement inside an active gravity well.',
    radius: 38,
    dockingRadius: 80,
  },
  MISSILE_BATTERY: {
    type: 'MISSILE_BATTERY',
    name: 'Missile Battery',
    code: 'MSB',
    category: 'DEFENSE',
    costMetallic: 3000,
    costOrganic: 15,
    hullMax: 2500,
    shieldHpMax: 2000,
    description: 'Holds 500 Medium Missiles, mounts 10 automated missile tubes.',
    trait: '+15% extended engagement range over standard ship-mounted missile batteries.',
    radius: 28,
  },
  PD_PLATFORM: {
    type: 'PD_PLATFORM',
    name: 'Point-Defense Platform',
    code: 'PDP',
    category: 'DEFENSE',
    costMetallic: 1200,
    costOrganic: 900,
    hullMax: 2000,
    shieldHpMax: 2500,
    description: 'Holds 1,500 Counter-Missiles (CM), mounts 15 CM vertical launchers and 10 PD intercept lasers.',
    trait: '+50% extended PD engagement envelope relative to standard faction shipboard PD ranges.',
    radius: 26,
  },
  REPAIR_BAY: {
    type: 'REPAIR_BAY',
    name: 'Repair Bay',
    code: 'RPB',
    category: 'SUPPORT',
    costMetallic: 12000,
    costOrganic: 9000,
    hullMax: 3500,
    shieldHpMax: 3000,
    description: 'Encompasses the entire host planetary gravity well. Repairs 1 damaged friendly ship at a time (prioritizing lowest % HP).',
    trait: 'Peace: Restores 10 Hull HP/s & 15 Shield/s. Combat: Degraded 30% (3 Hull HP/s, 4.5 Shield/s).',
    radius: 34,
  },
  ORBITAL_REFINERY: {
    type: 'ORBITAL_REFINERY',
    name: 'Orbital Refinery',
    code: 'REF',
    category: 'INDUSTRIAL',
    costMetallic: 23000,
    costOrganic: 17000,
    hullMax: 4000,
    shieldHpMax: 3000,
    description: 'Converts raw ore at double HQ throughput (refines 3 Ore every 1.5 seconds).',
    trait: 'Conversion Yield: Identical 52% Metallic and 48% Organic split (1 Ore = 0.52 Met + 0.48 Org).',
    radius: 36,
  },
  BASTION: {
    type: 'BASTION',
    name: 'Forward Defense Bastion',
    code: 'BAS',
    category: 'DEFENSE',
    costMetallic: 7500,
    costOrganic: 4000,
    hullMax: 5500,
    shieldHpMax: 5000,
    description: 'Fortified heavy defense platform equipped with dual point-defense arrays and missile silos.',
    trait: 'Mounts 12 auto-loading missile tubes and 8 high-energy PD intercept lasers.',
    radius: 38,
    dockingRadius: 80,
  },
  MRS: {
    type: 'MRS',
    name: 'Military Research Station',
    code: 'MRS',
    category: 'SUPPORT',
    costMetallic: RESEARCH_STATION_COSTS.MRS.metallic,
    costOrganic: RESEARCH_STATION_COSTS.MRS.organic,
    buildTicks: RESEARCH_STATION_COSTS.MRS.buildTicks,
    buildDurationSeconds: 5.0,
    hullMax: 3500,
    shieldHpMax: 3000,
    description: 'Orbital military research laboratory synthesizing advanced warship telemetry and hull alloys.',
    trait: '+1 Military Lab tier capacity. Requires placement inside an active gravity well.',
    mooring: 'Requires placement inside an active gravity well.',
    capacity: '+1 Military Lab tier capacity',
    radius: 32,
    dockingRadius: 60,
  },
  CRO: {
    type: 'CRO',
    name: 'Civic Research Outpost',
    code: 'CRO',
    category: 'SUPPORT',
    costMetallic: RESEARCH_STATION_COSTS.CRO.metallic,
    costOrganic: RESEARCH_STATION_COSTS.CRO.organic,
    buildTicks: RESEARCH_STATION_COSTS.CRO.buildTicks,
    buildDurationSeconds: 5.0,
    hullMax: 3000,
    shieldHpMax: 2500,
    description: 'Civic scientific research outpost analyzing propulsion kinetics and sensor resolution.',
    trait: '+1 Civic Lab tier capacity. Requires placement inside an active gravity well.',
    mooring: 'Requires placement inside an active gravity well.',
    capacity: '+1 Civic Lab tier capacity',
    radius: 30,
    dockingRadius: 50,
  },
  EXC: {
    type: 'EXC',
    name: 'Expansion Citadel',
    code: 'EXC',
    category: 'INDUSTRIAL',
    costMetallic: RESEARCH_STATION_COSTS.EXC.metallic,
    costOrganic: RESEARCH_STATION_COSTS.EXC.organic,
    buildTicks: RESEARCH_STATION_COSTS.EXC.buildTicks,
    buildDurationSeconds: 5.0,
    hullMax: 8000,
    shieldHpMax: 6000,
    description: 'Deep-space regional expansion citadel providing sovereign anchoring, deep-space logistics, rearm, and repair.',
    trait: '+1 Expansion Lab tier capacity. Requires placement inside an active gravity well.',
    mooring: 'Requires placement inside an active gravity well.',
    capacity: '+1 Expansion Lab tier capacity',
    radius: 50,
    dockingRadius: 120,
  },
};

/**
 * Valid structures presented in HQ and Builder placement menus:
 * SY-L, SY-M, SY-H, MRS, CRO, EXC, POST-S, POST-M, POST-L
 */
export const STRUCTURE_LIST: StructureDef[] = [
  STRUCTURE_CATALOG.SY_LIGHT,
  STRUCTURE_CATALOG.SY_MEDIUM,
  STRUCTURE_CATALOG.SY_HEAVY,
  STRUCTURE_CATALOG.MILITARY_RESEARCH,
  STRUCTURE_CATALOG.CIVIC_RESEARCH,
  STRUCTURE_CATALOG.EXPANSION_CITADEL,
  STRUCTURE_CATALOG.POST_SENSOR_SM,
  STRUCTURE_CATALOG.POST_SENSOR_MD,
  STRUCTURE_CATALOG.POST_SENSOR_LG,
];

/**
 * Creates a new structure entity in ghost/blueprint state (0.15 opacity).
 */
export function createGhostStructureEntity(
  type: StructureType,
  pos: Vec2D,
  hostPlanet: RockyPlanet | GasGiant | { id: string; name: string; pos: Vec2D; type?: string },
  builderId: string,
  index: number = 1
): ShipEntity {
  const def = STRUCTURE_CATALOG[type] || STRUCTURE_CATALOG.SY_LIGHT;
  const structId = `struct-${type.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

  const isShipyard =
    type === 'SY_LIGHT' ||
    type === 'SY_MEDIUM' ||
    type === 'SY_HEAVY';

  const isMissileBattery = type === 'MISSILE_BATTERY' || type === 'BASTION';
  const isPdPlatform = type === 'PD_PLATFORM' || type === 'BASTION';

  // Base range calculations
  const baseMissileRange = 850.0;
  const missileRange = isMissileBattery ? baseMissileRange * 1.15 : baseMissileRange;
  const pdplaRange = isPdPlatform ? 65.0 * 1.5 : 65.0; // +50% PD envelope

  const entity: ShipEntity = {
    id: structId,
    name: `${def.name}-${index}`,
    faction: 'FRIENDLY',
    role: type as any,
    structureType: type,
    isStationary: true,
    isStructure: true,
    pos: { ...pos },
    velocity: { x: 0, y: 0 },
    heading: 0,
    maxSpeed: 0,

    // Kinematics & Splines
    splineActive: false,
    splineP0: { x: 0, y: 0 },
    splineM0: { x: 0, y: 0 },
    splineP1: { x: 0, y: 0 },
    splineM1: { x: 0, y: 0 },
    splineT: 0,
    splineDuration: 1.0,

    // Construction Ghost State
    isUnderConstruction: true,
    constructionState: 'PENDING',
    constructionProgress: 0.0,
    constructionOpacity: 0.15, // Starts at 0.15 translucent ghost blueprint
    constructionTimer: 10.0,
    constructionDuration: 10.0,
    assignedBuilderId: builderId,
    builderTargetCost: { metallic: def.costMetallic, organic: def.costOrganic },
    depositedM: 0,
    totalM: def.costMetallic,
    depositedO: 0,
    totalO: def.costOrganic,
    worldX: pos.x,
    worldY: pos.y,
    scaffold: {
      id: structId,
      structureType: type,
      worldX: pos.x,
      worldY: pos.y,
      depositedM: 0,
      totalM: def.costMetallic,
      depositedO: 0,
      totalO: def.costOrganic,
      assignedBuilderId: builderId,
    },

    // Fuel & Reserves
    h2FuelMax: 5000.0,
    h2Fuel: 5000.0,
    fuelReserveRule: 0.1,

    // Combat & Weaponry
    missilesMax: isMissileBattery ? 500 : 60,
    missiles: isMissileBattery ? 500 : 60,
    missileTubes: isMissileBattery ? 10 : 4,
    missileCooldown: 0.0,
    missileRange,

    counterMissilesMax: isPdPlatform ? 1500 : 80,
    counterMissiles: isPdPlatform ? 1500 : 80,
    counterMissilesPerSalvo: isPdPlatform ? 15 : 2,
    counterMissileCooldown: 0.0,

    combatStance: 'DEFENSIVE',
    autoFire: isMissileBattery || isPdPlatform,
    ewarJammingRating: 0.15,

    // Point Defense
    pdplaRange,
    pdplaCooldown: 0.0,
    pdBeams: isPdPlatform ? 10 : 2,
    pdplaActiveBeamTarget: null,
    pdplaActiveBeamTargets: [],
    pdplaBeamTimer: 0.0,
    pdplaBeamHit: true,

    // Defenses & Durability
    shieldHpMax: def.shieldHpMax,
    shieldHp: def.shieldHpMax,
    shieldHeat: 0.0,
    shieldHeatMax: 100.0,
    shieldOverheated: false,
    shieldCooldownTimer: 0.0,

    hullMax: def.hullMax,
    hullHp: def.hullMax,
    maxRepairableHull: def.hullMax,
    crippleBarMax: def.hullMax * 0.8,
    crippleBar: def.hullMax * 0.8,
    hullState: 'OPERATIONAL',
    permanentFrameBuckled: false,

    massRating: 150000.0,
    fmsActive: false,
    fmsMultiplier: 1.0,

    // Shipyard & Logistics
    productionQueue: isShipyard ? [] : undefined,
    dockingRadius: def.dockingRadius || 60.0,

    // Planetary Gravity Well reference
    hostPlanetId: hostPlanet.id,
    inGravityWell: true,
    gravityWellBody: hostPlanet.name,
    capturedReferenceFrame: {
      id: hostPlanet.id,
      name: hostPlanet.name,
      type: 'PLANET',
      center: hostPlanet.pos,
      localOffset: {
        x: pos.x - hostPlanet.pos.x,
        y: pos.y - hostPlanet.pos.y,
      },
    },
    isMoored: true,

    // Support & Industrial specifics
    repairMode: 'PEACE',
    activeRepairTargetId: null,
    refineryAccumulator: 0,

    // Sensor platform ranges
    sensorRange:
      type === 'POST_SENSOR_SM'
        ? 10500
        : type === 'POST_SENSOR_MD'
        ? 14000
        : type === 'POST_SENSOR_LG'
        ? 21000
        : 8400,
  };

  return entity;
}
