import { ShipRole, ShipEntity, JumpState, JumpTransitData } from '../types';
import { BASE_TACTICAL_RANGES } from './sensorController';

export {
  type JumpState,
  type JumpTransitData,
};

export {
  type TacticalRanges,
  BASE_TACTICAL_RANGES,
} from './sensorController';

/**
 * Tactical Visual Scaling & Hull Proportions
 * Reference Capital Dimension:
 *   R_HQ = 90.0px (Normalized to 20% of host planet's visual radius)
 *   L_DN = 0.90 * R_HQ = 81px
 *   L_FG = 0.15 * L_DN = 12px
 */

/**
 * HQ & Orbital Refinery Ore Transfer Boundaries
 * R_transfer: 250 km (approx 120px from HQ docking collar/perimeter)
 */
export const HQ_ORE_TRANSFER_RANGE_KM = 250.0;
export const R_TRANSFER = 250.0;
export const HQ_ORE_TRANSFER_APPROACH_RANGE_KM = 375.0; // 1.5 * R_transfer

export interface ShipHullSpec {
  role: ShipRole;
  navalAbbr: string;
  className: string;
  relativeLengthPct: number; // Relative to DN (100%)
  renderedLengthPx: number;  // Explicit rendered length in pixels at zoom = 1.0
  selectionRadiusPx: number; // Hitbox radius in pixels for click raycasting and marquee
  baseRadius: number;        // Canonical base radius for vector mesh calculations
}

export const SHIP_HULL_SPECS: Record<string, ShipHullSpec> = {
  FRIGATE: {
    role: 'FRIGATE',
    navalAbbr: 'FG',
    className: 'Frigate',
    relativeLengthPct: 0.15,
    renderedLengthPx: 12,
    selectionRadiusPx: 8,
    baseRadius: 4,
  },
  DESTROYER: {
    role: 'DESTROYER',
    navalAbbr: 'DD',
    className: 'Destroyer',
    relativeLengthPct: 0.235,
    renderedLengthPx: 19,
    selectionRadiusPx: 10,
    baseRadius: 6.33,
  },
  LIGHT_CRUISER: {
    role: 'LIGHT_CRUISER',
    navalAbbr: 'CL',
    className: 'Light Cruiser',
    relativeLengthPct: 0.35,
    renderedLengthPx: 28,
    selectionRadiusPx: 14,
    baseRadius: 9.33,
  },
  CRUISER: {
    role: 'CRUISER',
    navalAbbr: 'CL',
    className: 'Light Cruiser',
    relativeLengthPct: 0.35,
    renderedLengthPx: 28,
    selectionRadiusPx: 14,
    baseRadius: 9.33,
  },
  HEAVY_CRUISER: {
    role: 'HEAVY_CRUISER',
    navalAbbr: 'CH',
    className: 'Heavy Cruiser',
    relativeLengthPct: 0.48,
    renderedLengthPx: 39,
    selectionRadiusPx: 18,
    baseRadius: 13,
  },
  BATTLECRUISER: {
    role: 'BATTLECRUISER',
    navalAbbr: 'BC',
    className: 'Battlecruiser',
    relativeLengthPct: 0.62,
    renderedLengthPx: 50,
    selectionRadiusPx: 23,
    baseRadius: 16.67,
  },
  BATTLESHIP: {
    role: 'BATTLESHIP',
    navalAbbr: 'BB',
    className: 'Battleship',
    relativeLengthPct: 0.78,
    renderedLengthPx: 63,
    selectionRadiusPx: 28,
    baseRadius: 21,
  },
  DREADNOUGHT: {
    role: 'DREADNOUGHT',
    navalAbbr: 'DN',
    className: 'Dreadnought',
    relativeLengthPct: 1.0,
    renderedLengthPx: 81,
    selectionRadiusPx: 36,
    baseRadius: 27,
  },
  CARRIER: {
    role: 'CARRIER',
    navalAbbr: 'CV',
    className: 'Fleet Carrier',
    relativeLengthPct: 0.95,
    renderedLengthPx: 77,
    selectionRadiusPx: 34,
    baseRadius: 25,
  },
  SUPER_CARRIER: {
    role: 'SUPER_CARRIER',
    navalAbbr: 'CVF',
    className: 'Super-Carrier',
    relativeLengthPct: 1.15,
    renderedLengthPx: 93,
    selectionRadiusPx: 42,
    baseRadius: 30,
  },
  MINER: {
    role: 'MINER',
    navalAbbr: 'MINER',
    className: 'Autonomous Miner',
    relativeLengthPct: 0.2,
    renderedLengthPx: 16,
    selectionRadiusPx: 8,
    baseRadius: 5.33,
  },
  // Logistics & Auxiliary Support Vessels
  BUILDER: {
    role: 'BUILDER',
    navalAbbr: 'BLD',
    className: 'Forge Builder',
    relativeLengthPct: 0.25,
    renderedLengthPx: 20,
    selectionRadiusPx: 10,
    baseRadius: 6.67,
  },
  COLLIER: {
    role: 'COLLIER',
    navalAbbr: 'COL',
    className: 'Collier Unrep',
    relativeLengthPct: 0.38,
    renderedLengthPx: 31,
    selectionRadiusPx: 15,
    baseRadius: 10.33,
  },
  TANKER: {
    role: 'TANKER',
    navalAbbr: 'TNK',
    className: 'Fleet Tanker',
    relativeLengthPct: 0.36,
    renderedLengthPx: 30,
    selectionRadiusPx: 15,
    baseRadius: 10,
  },
  REPAIR: {
    role: 'REPAIR',
    navalAbbr: 'REP',
    className: 'Fleet Repair Tender',
    relativeLengthPct: 0.32,
    renderedLengthPx: 26,
    selectionRadiusPx: 13,
    baseRadius: 8.67,
  },
  SCRAP: {
    role: 'SCRAP',
    navalAbbr: 'SCP',
    className: 'Scrap Recovery Barge',
    relativeLengthPct: 0.32,
    renderedLengthPx: 26,
    selectionRadiusPx: 13,
    baseRadius: 8.67,
  },
  // Orbital Facilities & Starbases
  HQ: {
    role: 'HQ',
    navalAbbr: 'HQ',
    className: 'Headquarters Citadel',
    relativeLengthPct: 1.11,
    renderedLengthPx: 90,
    selectionRadiusPx: 90,
    baseRadius: 90,
  },
  BASTION: {
    role: 'BASTION',
    navalAbbr: 'BST',
    className: 'Pirate Bastion Stronghold',
    relativeLengthPct: 0.8,
    renderedLengthPx: 64,
    selectionRadiusPx: 45,
    baseRadius: 45,
  },
  SY_LIGHT: {
    role: 'SY_LIGHT',
    navalAbbr: 'SY-L',
    className: 'Light Orbital Shipyard',
    relativeLengthPct: 0.65,
    renderedLengthPx: 52,
    selectionRadiusPx: 28,
    baseRadius: 28,
  },
  SY_MEDIUM: {
    role: 'SY_MEDIUM',
    navalAbbr: 'SY-M',
    className: 'Medium Orbital Shipyard',
    relativeLengthPct: 0.8,
    renderedLengthPx: 65,
    selectionRadiusPx: 36,
    baseRadius: 36,
  },
  SY_HEAVY: {
    role: 'SY_HEAVY',
    navalAbbr: 'SY-H',
    className: 'Heavy Orbital Shipyard',
    relativeLengthPct: 1.05,
    renderedLengthPx: 85,
    selectionRadiusPx: 45,
    baseRadius: 45,
  },
  MISSILE_BATTERY: {
    role: 'MISSILE_BATTERY',
    navalAbbr: 'BAT',
    className: 'Missile Defense Battery',
    relativeLengthPct: 0.45,
    renderedLengthPx: 36,
    selectionRadiusPx: 20,
    baseRadius: 20,
  },
  PD_PLATFORM: {
    role: 'PD_PLATFORM',
    navalAbbr: 'PDP',
    className: 'Point Defense Platform',
    relativeLengthPct: 0.4,
    renderedLengthPx: 32,
    selectionRadiusPx: 18,
    baseRadius: 18,
  },
  REPAIR_BAY: {
    role: 'REPAIR_BAY',
    navalAbbr: 'R-BAY',
    className: 'Orbital Repair Bay',
    relativeLengthPct: 0.6,
    renderedLengthPx: 48,
    selectionRadiusPx: 26,
    baseRadius: 26,
  },
  ORBITAL_REFINERY: {
    role: 'ORBITAL_REFINERY',
    navalAbbr: 'REF',
    className: 'Orbital Refinery',
    relativeLengthPct: 0.7,
    renderedLengthPx: 56,
    selectionRadiusPx: 30,
    baseRadius: 30,
  },
  MILITARY_RESEARCH: {
    role: 'MILITARY_RESEARCH',
    navalAbbr: 'MRS',
    className: 'Military Research Station',
    relativeLengthPct: 0.55,
    renderedLengthPx: 44,
    selectionRadiusPx: 24,
    baseRadius: 24,
  },
  CIVIC_RESEARCH: {
    role: 'CIVIC_RESEARCH',
    navalAbbr: 'CRO',
    className: 'Civic Research Outpost',
    relativeLengthPct: 0.5,
    renderedLengthPx: 40,
    selectionRadiusPx: 22,
    baseRadius: 22,
  },
  EXPANSION_CITADEL: {
    role: 'EXPANSION_CITADEL',
    navalAbbr: 'EXC',
    className: 'Expansion Citadel',
    relativeLengthPct: 0.85,
    renderedLengthPx: 68,
    selectionRadiusPx: 38,
    baseRadius: 38,
  },
  POST_SENSOR_SM: {
    role: 'POST_SENSOR_SM',
    navalAbbr: 'POST-S',
    className: 'Small Sensor Post',
    relativeLengthPct: 0.35,
    renderedLengthPx: 28,
    selectionRadiusPx: 16,
    baseRadius: 16,
  },
  POST_SENSOR_MD: {
    role: 'POST_SENSOR_MD',
    navalAbbr: 'POST-M',
    className: 'Medium Sensor Post',
    relativeLengthPct: 0.45,
    renderedLengthPx: 36,
    selectionRadiusPx: 20,
    baseRadius: 20,
  },
  POST_SENSOR_LG: {
    role: 'POST_SENSOR_LG',
    navalAbbr: 'POST-L',
    className: 'Large Sensor Post',
    relativeLengthPct: 0.55,
    renderedLengthPx: 44,
    selectionRadiusPx: 26,
    baseRadius: 26,
  },
};

/**
 * Resolves standard visual scaling and selection specs for any entity.
 */
export interface ShipArmamentSpec {
  bowMissileTubes: number;
  broadsideMissileTubesPort: number;
  broadsideMissileTubesStbd: number;
  totalMissileSalvo: number;
  offensiveLasers: number;
  offensiveGrasers: number;
  counterMissileCells: number;
  pointDefenseLasers: number;
}

export const SHIP_ARMAMENTS: Record<string, ShipArmamentSpec> = {
  FG: {
    bowMissileTubes: 0,
    broadsideMissileTubesPort: 2,
    broadsideMissileTubesStbd: 2,
    totalMissileSalvo: 4,
    offensiveLasers: 2,
    offensiveGrasers: 0,
    counterMissileCells: 4,
    pointDefenseLasers: 4,
  },
  DD: {
    bowMissileTubes: 2,
    broadsideMissileTubesPort: 3,
    broadsideMissileTubesStbd: 3,
    totalMissileSalvo: 8,
    offensiveLasers: 2,
    offensiveGrasers: 0,
    counterMissileCells: 6,
    pointDefenseLasers: 4,
  },
  CL: {
    bowMissileTubes: 0,
    broadsideMissileTubesPort: 7,
    broadsideMissileTubesStbd: 7,
    totalMissileSalvo: 14,
    offensiveLasers: 4,
    offensiveGrasers: 0,
    counterMissileCells: 12,
    pointDefenseLasers: 10,
  },
  CH: {
    bowMissileTubes: 2,
    broadsideMissileTubesPort: 10,
    broadsideMissileTubesStbd: 10,
    totalMissileSalvo: 22,
    offensiveLasers: 6,
    offensiveGrasers: 2,
    counterMissileCells: 20,
    pointDefenseLasers: 18,
  },
  BC: {
    bowMissileTubes: 6,
    broadsideMissileTubesPort: 13,
    broadsideMissileTubesStbd: 13,
    totalMissileSalvo: 32,
    offensiveLasers: 10,
    offensiveGrasers: 4,
    counterMissileCells: 36,
    pointDefenseLasers: 32,
  },
  BB: {
    bowMissileTubes: 8,
    broadsideMissileTubesPort: 19,
    broadsideMissileTubesStbd: 19,
    totalMissileSalvo: 46,
    offensiveLasers: 14,
    offensiveGrasers: 6,
    counterMissileCells: 54,
    pointDefenseLasers: 50,
  },
  DN: {
    bowMissileTubes: 12,
    broadsideMissileTubesPort: 24,
    broadsideMissileTubesStbd: 24,
    totalMissileSalvo: 60,
    offensiveLasers: 20,
    offensiveGrasers: 10,
    counterMissileCells: 80,
    pointDefenseLasers: 75,
  },
  MINER: {
    bowMissileTubes: 0,
    broadsideMissileTubesPort: 0,
    broadsideMissileTubesStbd: 0,
    totalMissileSalvo: 0,
    offensiveLasers: 0,
    offensiveGrasers: 0,
    counterMissileCells: 0,
    pointDefenseLasers: 1,
  },
  BUILDER: {
    bowMissileTubes: 0,
    broadsideMissileTubesPort: 0,
    broadsideMissileTubesStbd: 0,
    totalMissileSalvo: 0,
    offensiveLasers: 0,
    offensiveGrasers: 0,
    counterMissileCells: 0,
    pointDefenseLasers: 0,
  },
  HQ: {
    bowMissileTubes: 4,
    broadsideMissileTubesPort: 8,
    broadsideMissileTubesStbd: 8,
    totalMissileSalvo: 20,
    offensiveLasers: 8,
    offensiveGrasers: 4,
    counterMissileCells: 40,
    pointDefenseLasers: 30,
  },
};

// Map full role names directly into SHIP_ARMAMENTS dictionary
SHIP_ARMAMENTS.FRIGATE = SHIP_ARMAMENTS.FG;
SHIP_ARMAMENTS.DESTROYER = SHIP_ARMAMENTS.DD;
SHIP_ARMAMENTS.LIGHT_CRUISER = SHIP_ARMAMENTS.CL;
SHIP_ARMAMENTS.CRUISER = SHIP_ARMAMENTS.CL;
SHIP_ARMAMENTS.HEAVY_CRUISER = SHIP_ARMAMENTS.CH;
SHIP_ARMAMENTS.BATTLECRUISER = SHIP_ARMAMENTS.BC;
SHIP_ARMAMENTS.BATTLESHIP = SHIP_ARMAMENTS.BB;
SHIP_ARMAMENTS.DREADNOUGHT = SHIP_ARMAMENTS.DN;

/**
 * Resolves explicit hardware armament mounts for any role or naval abbreviation.
 */
export function getShipArmament(roleOrKey: string): ShipArmamentSpec {
  if (SHIP_ARMAMENTS[roleOrKey]) {
    return SHIP_ARMAMENTS[roleOrKey];
  }
  switch (roleOrKey) {
    case 'FRIGATE':
      return SHIP_ARMAMENTS.FG;
    case 'DESTROYER':
      return SHIP_ARMAMENTS.DD;
    case 'LIGHT_CRUISER':
    case 'CRUISER':
      return SHIP_ARMAMENTS.CL;
    case 'HEAVY_CRUISER':
      return SHIP_ARMAMENTS.CH;
    case 'BATTLECRUISER':
      return SHIP_ARMAMENTS.BC;
    case 'BATTLESHIP':
      return SHIP_ARMAMENTS.BB;
    case 'DREADNOUGHT':
      return SHIP_ARMAMENTS.DN;
    case 'MINER':
      return SHIP_ARMAMENTS.MINER;
    default:
      return SHIP_ARMAMENTS.FG;
  }
}

export function getShipClassKey(shipOrRole: string | { class?: string; role?: string }): string {
  if (typeof shipOrRole === 'string') {
    if (SHIP_ARMAMENTS[shipOrRole]) return shipOrRole;
    switch (shipOrRole) {
      case 'FRIGATE': return 'FG';
      case 'DESTROYER': return 'DD';
      case 'LIGHT_CRUISER':
      case 'CRUISER': return 'CL';
      case 'HEAVY_CRUISER': return 'CH';
      case 'BATTLECRUISER': return 'BC';
      case 'BATTLESHIP': return 'BB';
      case 'DREADNOUGHT': return 'DN';
      case 'MINER': return 'MINER';
      case 'BUILDER': return 'BUILDER';
      default: return 'FG';
    }
  }
  if (shipOrRole.class && SHIP_ARMAMENTS[shipOrRole.class]) {
    return shipOrRole.class;
  }
  return getShipClassKey(shipOrRole.role || 'FRIGATE');
}

/**
 * Applies explicit hardware armament mounts to a ship entity.
 */
export function applyShipArmament(ship: Partial<ShipEntity>, role: string): void {
  const arm = getShipArmament(role);
  ship.class = getShipClassKey(role);
  ship.bowMissileTubes = arm.bowMissileTubes;
  ship.broadsideMissileTubesPort = arm.broadsideMissileTubesPort;
  ship.broadsideMissileTubesStbd = arm.broadsideMissileTubesStbd;
  ship.totalMissileSalvo = arm.totalMissileSalvo;
  ship.offensiveLasers = arm.offensiveLasers;
  ship.offensiveGrasers = arm.offensiveGrasers;
  ship.counterMissileCells = arm.counterMissileCells;
  ship.pointDefenseLasers = arm.pointDefenseLasers;
  ship.missileTubes = arm.totalMissileSalvo;
  ship.pdBeams = Math.max(1, Math.min(8, Math.floor(arm.pointDefenseLasers / 3)));
  ship.counterMissilesPerSalvo = Math.max(1, Math.floor(arm.counterMissileCells / 4));
  ship.baseSalvoCooldownTicks = ship.baseSalvoCooldownTicks ?? 54; // 1.8s at 30Hz
  ship.salvoCooldownTicksRemaining = ship.salvoCooldownTicksRemaining ?? 0;
  ship.missileRange = BASE_TACTICAL_RANGES.missileLockRangeKm;
  ship.sensorRange = BASE_TACTICAL_RANGES.sensorRangeKm;
  ship.pdplaRange = BASE_TACTICAL_RANGES.pointDefenseRangeKm;
}

export function getShipHullSpec(roleOrEntity: ShipRole | { role?: string; id?: string }): ShipHullSpec {
  let role: string = 'FRIGATE';
  if (typeof roleOrEntity === 'string') {
    role = roleOrEntity;
  } else if (roleOrEntity && typeof roleOrEntity.role === 'string') {
    role = roleOrEntity.role;
  }

  // Handle miner or bastion id hints
  if (typeof roleOrEntity === 'object' && roleOrEntity?.id) {
    if (roleOrEntity.id.includes('miner') || roleOrEntity.id.includes('prospector')) {
      role = 'MINER';
    } else if (roleOrEntity.id.includes('bastion')) {
      role = 'BASTION';
    } else if (roleOrEntity.id.includes('builder')) {
      role = 'BUILDER';
    } else if (roleOrEntity.id.includes('hq')) {
      role = 'HQ';
    }
  }

  return (
    SHIP_HULL_SPECS[role] || {
      role: 'FRIGATE',
      navalAbbr: 'FG',
      className: 'Frigate',
      relativeLengthPct: 0.15,
      renderedLengthPx: 18,
      selectionRadiusPx: 10,
      baseRadius: 6,
    }
  );
}

export {
  type ShipKinematicsSpec,
  SHIP_KINEMATICS,
  getShipKinematics,
  applyShipKinematics,
} from './kinematics';

export interface ShipConfig {
  id: string;
  name: string;
  class: string;
  role: ShipRole;
  requiredShipyardTier: 'HQ_INTEGRATED' | 'SY_LIGHT' | 'SY_MEDIUM' | 'SY_HEAVY' | string;
  techPrereqId: string;
  costM: number;
  costO: number;
  buildTicks: number;
  specs?: any;
  description?: string;
}

export const SHIP_CONFIGS: Record<string, ShipConfig> = {
  FG: {
    id: 'FG',
    name: 'Frigate',
    class: 'FG',
    role: 'FRIGATE',
    requiredShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: '',
    costM: 200,
    costO: 45,
    buildTicks: 10,
    specs: { hull: 100, shield: 360, tubes: 2, pdBeams: 1, speed: 160, range: 900 },
    description: 'Light screening escort with dual torpedo tubes and point defense laser.',
  },
  FRIGATE: {
    id: 'FG',
    name: 'Frigate',
    class: 'FG',
    role: 'FRIGATE',
    requiredShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: '',
    costM: 200,
    costO: 45,
    buildTicks: 10,
    specs: { hull: 100, shield: 360, tubes: 2, pdBeams: 1, speed: 160, range: 900 },
    description: 'Light screening escort with dual torpedo tubes and point defense laser.',
  },
  DD: {
    id: 'DD',
    name: 'Destroyer',
    class: 'DD',
    role: 'DESTROYER',
    requiredShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: 'MIL_DESTROYER',
    costM: 800,
    costO: 230,
    buildTicks: 18,
    specs: { hull: 250, shield: 700, tubes: 4, pdBeams: 1, speed: 145, range: 950 },
    description: 'Guided missile destroyer with 4 missile tubes and heavy deflector shield.',
  },
  DESTROYER: {
    id: 'DD',
    name: 'Destroyer',
    class: 'DD',
    role: 'DESTROYER',
    requiredShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: 'MIL_DESTROYER',
    costM: 800,
    costO: 230,
    buildTicks: 18,
    specs: { hull: 250, shield: 700, tubes: 4, pdBeams: 1, speed: 145, range: 950 },
    description: 'Guided missile destroyer with 4 missile tubes and heavy deflector shield.',
  },
  CL: {
    id: 'CL',
    name: 'Light Cruiser',
    class: 'CL',
    role: 'LIGHT_CRUISER',
    requiredShipyardTier: 'SY_LIGHT',
    techPrereqId: 'MIL_LIGHT_CRUISER',
    costM: 2500,
    costO: 650,
    buildTicks: 25,
    specs: { hull: 350, shield: 1000, tubes: 5, pdBeams: 2, speed: 135, range: 1000 },
    description: 'Combat cruiser screen with 5-tube missile volley capacity.',
  },
  LIGHT_CRUISER: {
    id: 'CL',
    name: 'Light Cruiser',
    class: 'CL',
    role: 'LIGHT_CRUISER',
    requiredShipyardTier: 'SY_LIGHT',
    techPrereqId: 'MIL_LIGHT_CRUISER',
    costM: 2500,
    costO: 650,
    buildTicks: 25,
    specs: { hull: 350, shield: 1000, tubes: 5, pdBeams: 2, speed: 135, range: 1000 },
    description: 'Combat cruiser screen with 5-tube missile volley capacity.',
  },
  CRUISER: {
    id: 'CL',
    name: 'Light Cruiser',
    class: 'CL',
    role: 'LIGHT_CRUISER',
    requiredShipyardTier: 'SY_LIGHT',
    techPrereqId: 'MIL_LIGHT_CRUISER',
    costM: 2500,
    costO: 650,
    buildTicks: 25,
    specs: { hull: 350, shield: 1000, tubes: 5, pdBeams: 2, speed: 135, range: 1000 },
    description: 'Combat cruiser screen with 5-tube missile volley capacity.',
  },
  CH: {
    id: 'CH',
    name: 'Heavy Cruiser',
    class: 'CH',
    role: 'HEAVY_CRUISER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_HEAVY_CRUISER',
    costM: 5000,
    costO: 1200,
    buildTicks: 35,
    specs: { hull: 500, shield: 1600, tubes: 6, pdBeams: 2, speed: 120, range: 1100 },
    description: 'Vanguard strike cruiser designed for heavy fleet engagements.',
  },
  HEAVY_CRUISER: {
    id: 'CH',
    name: 'Heavy Cruiser',
    class: 'CH',
    role: 'HEAVY_CRUISER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_HEAVY_CRUISER',
    costM: 5000,
    costO: 1200,
    buildTicks: 35,
    specs: { hull: 500, shield: 1600, tubes: 6, pdBeams: 2, speed: 120, range: 1100 },
    description: 'Vanguard strike cruiser designed for heavy fleet engagements.',
  },
  BC: {
    id: 'BC',
    name: 'Battlecruiser',
    class: 'BC',
    role: 'BATTLECRUISER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_BATTLECRUISER',
    costM: 8500,
    costO: 1800,
    buildTicks: 45,
    specs: { hull: 700, shield: 2200, tubes: 8, pdBeams: 3, speed: 110, range: 1250 },
    description: 'Capital raider packing an 8-tube synchronized salvo array.',
  },
  BATTLECRUISER: {
    id: 'BC',
    name: 'Battlecruiser',
    class: 'BC',
    role: 'BATTLECRUISER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_BATTLECRUISER',
    costM: 8500,
    costO: 1800,
    buildTicks: 45,
    specs: { hull: 700, shield: 2200, tubes: 8, pdBeams: 3, speed: 110, range: 1250 },
    description: 'Capital raider packing an 8-tube synchronized salvo array.',
  },
  BB: {
    id: 'BB',
    name: 'Battleship',
    class: 'BB',
    role: 'BATTLESHIP',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_BATTLESHIP',
    costM: 14000,
    costO: 3000,
    buildTicks: 60,
    specs: { hull: 1100, shield: 3200, tubes: 10, pdBeams: 4, speed: 95, range: 1400 },
    description: 'Line battleship citadel capable of absorbing extreme fire.',
  },
  BATTLESHIP: {
    id: 'BB',
    name: 'Battleship',
    class: 'BB',
    role: 'BATTLESHIP',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_BATTLESHIP',
    costM: 14000,
    costO: 3000,
    buildTicks: 60,
    specs: { hull: 1100, shield: 3200, tubes: 10, pdBeams: 4, speed: 95, range: 1400 },
    description: 'Line battleship citadel capable of absorbing extreme fire.',
  },
  DN: {
    id: 'DN',
    name: 'Dreadnought',
    class: 'DN',
    role: 'DREADNOUGHT',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_DREADNOUGHT',
    costM: 25000,
    costO: 5000,
    buildTicks: 90,
    specs: { hull: 2000, shield: 5000, tubes: 14, pdBeams: 6, speed: 80, range: 1600 },
    description: 'Apex fleet command vessel with 14 missile tubes and colossal shield barrier.',
  },
  DREADNOUGHT: {
    id: 'DN',
    name: 'Dreadnought',
    class: 'DN',
    role: 'DREADNOUGHT',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_DREADNOUGHT',
    costM: 25000,
    costO: 5000,
    buildTicks: 90,
    specs: { hull: 2000, shield: 5000, tubes: 14, pdBeams: 6, speed: 80, range: 1600 },
    description: 'Apex fleet command vessel with 14 missile tubes and colossal shield barrier.',
  },
  MINER: {
    id: 'MINER',
    name: 'Autonomous Miner',
    class: 'MINER',
    role: 'MINER',
    requiredShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: '',
    costM: 1500,
    costO: 400,
    buildTicks: 25,
    specs: { hull: 120, shield: 200, tubes: 0, pdBeams: 1, speed: 110, range: 0 },
    description: 'Autonomous ore extraction vessel with laser drill and cargo hold.',
  },
  MN: {
    id: 'MINER',
    name: 'Autonomous Miner',
    class: 'MINER',
    role: 'MINER',
    requiredShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: '',
    costM: 1500,
    costO: 400,
    buildTicks: 25,
    specs: { hull: 120, shield: 200, tubes: 0, pdBeams: 1, speed: 110, range: 0 },
    description: 'Autonomous ore extraction vessel with laser drill and cargo hold.',
  },
  COLLIER: {
    id: 'COLLIER',
    name: 'Fleet Collier',
    class: 'COLLIER',
    role: 'COLLIER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_COLLIER',
    costM: 3500,
    costO: 900,
    buildTicks: 28,
    specs: { hull: 400, shield: 1200, tubes: 0, pdBeams: 2, speed: 115, range: 0 },
    description: 'Fleet replenishment collier carrying 2,000 missiles for underway restocking.',
  },
  COL: {
    id: 'COLLIER',
    name: 'Fleet Collier',
    class: 'COLLIER',
    role: 'COLLIER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_COLLIER',
    costM: 3500,
    costO: 900,
    buildTicks: 28,
    specs: { hull: 400, shield: 1200, tubes: 0, pdBeams: 2, speed: 115, range: 0 },
    description: 'Fleet replenishment collier carrying 2,000 missiles for underway restocking.',
  },
  TANKER: {
    id: 'TANKER',
    name: 'Fuel Tanker',
    class: 'TANKER',
    role: 'TANKER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_TANKER',
    costM: 3200,
    costO: 1100,
    buildTicks: 28,
    specs: { hull: 380, shield: 1100, tubes: 0, pdBeams: 2, speed: 120, range: 0 },
    description: 'Mobile fuel tanker transferring liquid hydrogen propellant to fleet warships.',
  },
  TNK: {
    id: 'TANKER',
    name: 'Fuel Tanker',
    class: 'TANKER',
    role: 'TANKER',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_TANKER',
    costM: 3200,
    costO: 1100,
    buildTicks: 28,
    specs: { hull: 380, shield: 1100, tubes: 0, pdBeams: 2, speed: 120, range: 0 },
    description: 'Mobile fuel tanker transferring liquid hydrogen propellant to fleet warships.',
  },
  REP_SHIP: {
    id: 'REP_SHIP',
    name: 'Fleet Repair Ship',
    class: 'REP_SHIP',
    role: 'REPAIR',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_REPAIR',
    costM: 4200,
    costO: 1400,
    buildTicks: 32,
    specs: { hull: 450, shield: 1400, tubes: 0, pdBeams: 2, speed: 110, range: 0 },
    description: 'Dedicated fleet maintenance tender providing field hull repairs.',
  },
  REPAIR: {
    id: 'REP_SHIP',
    name: 'Fleet Repair Ship',
    class: 'REP_SHIP',
    role: 'REPAIR',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_REPAIR',
    costM: 4200,
    costO: 1400,
    buildTicks: 32,
    specs: { hull: 450, shield: 1400, tubes: 0, pdBeams: 2, speed: 110, range: 0 },
    description: 'Dedicated fleet maintenance tender providing field hull repairs.',
  },
  REP: {
    id: 'REP_SHIP',
    name: 'Fleet Repair Ship',
    class: 'REP_SHIP',
    role: 'REPAIR',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_REPAIR',
    costM: 4200,
    costO: 1400,
    buildTicks: 32,
    specs: { hull: 450, shield: 1400, tubes: 0, pdBeams: 2, speed: 110, range: 0 },
    description: 'Dedicated fleet maintenance tender providing field hull repairs.',
  },
  SALVAGER: {
    id: 'SALVAGER',
    name: 'Salvager',
    class: 'SALVAGER',
    role: 'SCRAP',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_SALVAGE',
    costM: 3000,
    costO: 800,
    buildTicks: 24,
    specs: { hull: 350, shield: 900, tubes: 0, pdBeams: 1, speed: 125, range: 0 },
    description: 'Autonomous battlefield recovery vessel harvesting scrap and alloy.',
  },
  SCRAP: {
    id: 'SALVAGER',
    name: 'Salvager',
    class: 'SALVAGER',
    role: 'SCRAP',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_SALVAGE',
    costM: 3000,
    costO: 800,
    buildTicks: 24,
    specs: { hull: 350, shield: 900, tubes: 0, pdBeams: 1, speed: 125, range: 0 },
    description: 'Autonomous battlefield recovery vessel harvesting scrap and alloy.',
  },
  SCP: {
    id: 'SALVAGER',
    name: 'Salvager',
    class: 'SALVAGER',
    role: 'SCRAP',
    requiredShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_SALVAGE',
    costM: 3000,
    costO: 800,
    buildTicks: 24,
    specs: { hull: 350, shield: 900, tubes: 0, pdBeams: 1, speed: 125, range: 0 },
    description: 'Autonomous battlefield recovery vessel harvesting scrap and alloy.',
  },
  CV: {
    id: 'CV',
    name: 'Fleet Carrier',
    class: 'CV',
    role: 'CARRIER',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_CARRIER',
    costM: 28000,
    costO: 6500,
    buildTicks: 80,
    specs: { hull: 1800, shield: 4500, tubes: 8, pdBeams: 6, speed: 85, range: 1500 },
    description: 'Super-capital strike carrier launching autonomous strike wings.',
  },
  CARRIER: {
    id: 'CV',
    name: 'Fleet Carrier',
    class: 'CV',
    role: 'CARRIER',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_CARRIER',
    costM: 28000,
    costO: 6500,
    buildTicks: 80,
    specs: { hull: 1800, shield: 4500, tubes: 8, pdBeams: 6, speed: 85, range: 1500 },
    description: 'Super-capital strike carrier launching autonomous strike wings.',
  },
  CVF: {
    id: 'CVF',
    name: 'Super-Carrier',
    class: 'CVF',
    role: 'SUPER_CARRIER',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_SUPER_CARRIER',
    costM: 38000,
    costO: 9000,
    buildTicks: 110,
    specs: { hull: 2600, shield: 6000, tubes: 12, pdBeams: 8, speed: 75, range: 1700 },
    description: 'Apex super-carrier citadel projecting overwhelming aerospace supremacy.',
  },
  SUPER_CARRIER: {
    id: 'CVF',
    name: 'Super-Carrier',
    class: 'CVF',
    role: 'SUPER_CARRIER',
    requiredShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_SUPER_CARRIER',
    costM: 38000,
    costO: 9000,
    buildTicks: 110,
    specs: { hull: 2600, shield: 6000, tubes: 12, pdBeams: 8, speed: 75, range: 1700 },
    description: 'Apex super-carrier citadel projecting overwhelming aerospace supremacy.',
  },
};

export interface ShipPrototypeDefinition {
  name: string;
  role: ShipRole;
  cruiseSpeed: number;
  maxSpeed: number;
  hp: number;
  shield: number;
  fuelH2: number;
  baseRadar?: number;
  basePassive?: number;
  missileTubes?: number;
  missilesMax?: number;
  counterMissilesMax?: number;
  pdBeams?: number;
  massRating?: number;
  baseRadius?: number;
  weapons?: any[];
}

export const SHIP_PROTOTYPES: Record<string, ShipPrototypeDefinition> = {
  FRIGATE: {
    name: 'Frigate',
    role: 'FRIGATE',
    cruiseSpeed: 120,
    maxSpeed: 200,
    hp: 1200,
    shield: 600,
    fuelH2: 1000,
    baseRadar: 6000,
    basePassive: 18000,
    missileTubes: 2,
    missilesMax: 120,
    counterMissilesMax: 40,
    pdBeams: 1,
    massRating: 18000,
    baseRadius: 4,
    weapons: [
      { type: 'MISSILE', tubes: 2, range: 1050, damage: 250, cooldown: 2.0 },
      { type: 'PDPLA', beams: 1, range: 65, damage: 15, cooldown: 0.2 },
    ],
  },
  CORVETTE: {
    name: 'Corvette',
    role: 'FRIGATE',
    cruiseSpeed: 140,
    maxSpeed: 220,
    hp: 800,
    shield: 400,
    fuelH2: 800,
    baseRadar: 8000,
    basePassive: 24000,
    missileTubes: 1,
    missilesMax: 80,
    counterMissilesMax: 20,
    pdBeams: 1,
    massRating: 12000,
    baseRadius: 3,
    weapons: [
      { type: 'MISSILE', tubes: 1, range: 900, damage: 200, cooldown: 2.0 },
    ],
  },
  SCOUT: {
    name: 'Scout',
    role: 'SCOUT' as ShipRole,
    cruiseSpeed: 160,
    maxSpeed: 240,
    hp: 700,
    shield: 400,
    fuelH2: 1200,
    baseRadar: 8000,
    basePassive: 24000,
    missileTubes: 1,
    missilesMax: 60,
    counterMissilesMax: 20,
    pdBeams: 1,
    massRating: 10000,
    baseRadius: 3,
    weapons: [
      { type: 'MISSILE', tubes: 1, range: 900, damage: 150, cooldown: 2.0 },
    ],
  },
  MINER: {
    name: 'Miner',
    role: 'MINER',
    cruiseSpeed: 80,
    maxSpeed: 120,
    hp: 1500,
    shield: 500,
    fuelH2: 1500,
    baseRadar: 6000,
    basePassive: 18000,
    missileTubes: 0,
    missilesMax: 0,
    counterMissilesMax: 20,
    pdBeams: 1,
    massRating: 25000,
    baseRadius: 5,
  },
  CARGO: {
    name: 'Cargo',
    role: 'CARGO',
    cruiseSpeed: 85,
    maxSpeed: 130,
    hp: 2000,
    shield: 600,
    fuelH2: 2000,
    baseRadar: 6000,
    basePassive: 18000,
    missileTubes: 0,
    missilesMax: 0,
    counterMissilesMax: 30,
    pdBeams: 1,
    massRating: 35000,
    baseRadius: 6,
  },
  DESTROYER: {
    name: 'Destroyer',
    role: 'DESTROYER',
    cruiseSpeed: 110,
    maxSpeed: 165,
    hp: 1800,
    shield: 1000,
    fuelH2: 1500,
    baseRadar: 6000,
    basePassive: 18000,
    missileTubes: 4,
    missilesMax: 250,
    counterMissilesMax: 80,
    pdBeams: 2,
    massRating: 32000,
    baseRadius: 6.33,
    weapons: [
      { type: 'MISSILE', tubes: 4, range: 1100, damage: 300, cooldown: 2.0 },
      { type: 'PDPLA', beams: 2, range: 65, damage: 20, cooldown: 0.2 },
    ],
  },
  LIGHT_CRUISER: {
    name: 'Light Cruiser',
    role: 'LIGHT_CRUISER',
    cruiseSpeed: 105,
    maxSpeed: 155,
    hp: 2200,
    shield: 1400,
    fuelH2: 2000,
    baseRadar: 10000,
    basePassive: 30000,
    missileTubes: 5,
    missilesMax: 350,
    counterMissilesMax: 100,
    pdBeams: 2,
    massRating: 48000,
    baseRadius: 9.33,
    weapons: [
      { type: 'MISSILE', tubes: 5, range: 1150, damage: 350, cooldown: 1.9 },
      { type: 'PDPLA', beams: 2, range: 65, damage: 25, cooldown: 0.2 },
    ],
  },
  HEAVY_CRUISER: {
    name: 'Heavy Cruiser',
    role: 'HEAVY_CRUISER',
    cruiseSpeed: 95,
    maxSpeed: 140,
    hp: 2800,
    shield: 1800,
    fuelH2: 2500,
    baseRadar: 10000,
    basePassive: 30000,
    missileTubes: 7,
    missilesMax: 500,
    counterMissilesMax: 150,
    pdBeams: 3,
    massRating: 65000,
    baseRadius: 13.0,
    weapons: [
      { type: 'MISSILE', tubes: 7, range: 1200, damage: 450, cooldown: 1.8 },
      { type: 'PDPLA', beams: 3, range: 65, damage: 30, cooldown: 0.2 },
    ],
  },
  BATTLECRUISER: {
    name: 'Battlecruiser',
    role: 'BATTLECRUISER',
    cruiseSpeed: 90,
    maxSpeed: 130,
    hp: 4200,
    shield: 2600,
    fuelH2: 3500,
    baseRadar: 10000,
    basePassive: 30000,
    missileTubes: 8,
    missilesMax: 700,
    counterMissilesMax: 200,
    pdBeams: 4,
    massRating: 95000,
    baseRadius: 16.67,
  },
  BATTLESHIP: {
    name: 'Battleship',
    role: 'BATTLESHIP',
    cruiseSpeed: 80,
    maxSpeed: 115,
    hp: 6500,
    shield: 4000,
    fuelH2: 5000,
    baseRadar: 10000,
    basePassive: 30000,
    missileTubes: 10,
    missilesMax: 1000,
    counterMissilesMax: 300,
    pdBeams: 5,
    massRating: 140000,
    baseRadius: 21.0,
  },
  DREADNOUGHT: {
    name: 'Dreadnought',
    role: 'DREADNOUGHT',
    cruiseSpeed: 70,
    maxSpeed: 100,
    hp: 10000,
    shield: 6000,
    fuelH2: 7500,
    baseRadar: 10000,
    basePassive: 30000,
    missileTubes: 12,
    missilesMax: 1500,
    counterMissilesMax: 450,
    pdBeams: 6,
    massRating: 200000,
    baseRadius: 27.0,
  },
};
