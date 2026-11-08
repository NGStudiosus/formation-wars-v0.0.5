import { StructureType, ResearchStationCounts } from '../types';

export type { StructureType, ResearchStationCounts };

// Updated Structure Cost Definitions (Testing Balance: 80% Reduction)
export const RESEARCH_STATION_COSTS = {
  MRS: {
    metallic: 2000,
    organic: 500,
    buildTicks: 150,
  },
  CRO: {
    metallic: 2000,
    organic: 500,
    buildTicks: 150,
  },
  EXC: {
    metallic: 2400,
    organic: 600,
    buildTicks: 150,
  },
} as const;

export interface ResearchStationDefinition {
  type: StructureType;
  code: string;
  name: string;
  costMetallic: number;
  costOrganic: number;
  buildTicks?: number;
  buildDurationSeconds?: number;
  mooring: string;
  capacity: string;
  hullMax: number;
  shieldHpMax: number;
  description: string;
  trait: string;
  radius: number;
  dockingRadius: number;
}

export interface ShipyardStructureDefinition {
  type: StructureType;
  code: string;
  name: string;
  costMetallic: number;
  costOrganic: number;
  mooring: string;
  prerequisite?: string;
  hullMax: number;
  shieldHpMax: number;
  description: string;
  trait: string;
  radius: number;
  dockingRadius: number;
  supportedHulls: string[];
}

/**
 * Three distinct orbital shipyard slipways (Light, Medium, Heavy)
 */
export const SHIPYARD_CAPABILITIES = {
  SY_LIGHT: ['MINER', 'MN', 'FG', 'FRIGATE', 'DD', 'DESTROYER', 'CL', 'LIGHT_CRUISER'],
  SY_MEDIUM: ['CH', 'HEAVY_CRUISER', 'BC', 'BATTLECRUISER', 'REP_SHIP', 'REPAIR', 'REP', 'COLLIER', 'COL', 'TANKER', 'TNK', 'SALVAGER', 'SCRAP', 'SCP'],
  SY_HEAVY: ['BB', 'BATTLESHIP', 'DN', 'DREADNOUGHT', 'CVE', 'CV', 'CARRIER', 'CVF', 'SUPER_CARRIER', 'CS', 'CITY_SHIP'],
} as const;

export const SHIPYARD_DEFINITIONS: Record<
  'SY_LIGHT' | 'SY_MEDIUM' | 'SY_HEAVY',
  ShipyardStructureDefinition
> = {
  SY_LIGHT: {
    type: 'SY_LIGHT',
    code: 'SY-L',
    name: 'Light Orbital Shipyard',
    costMetallic: 6000,
    costOrganic: 1500,
    mooring: 'Requires placement inside an active gravity well.',
    hullMax: 4000,
    shieldHpMax: 3000,
    description: 'Light orbital slipway for escorts, light cruisers, and autonomous miners.',
    trait: 'Constructs Frigate (FG), Destroyer (DD), Light Cruiser (CL), Autonomous Miner (MINER).',
    radius: 13,
    dockingRadius: 75,
    supportedHulls: ['FG', 'DD', 'CL', 'MINER', 'MN', 'FRIGATE', 'DESTROYER', 'LIGHT_CRUISER'],
  },
  SY_MEDIUM: {
    type: 'SY_MEDIUM',
    code: 'SY-M',
    name: 'Medium Orbital Shipyard',
    costMetallic: 18000,
    costOrganic: 4500,
    prerequisite: 'Civic Tier 3 / Military Tier 4',
    mooring: 'Requires placement inside an active gravity well.',
    hullMax: 7500,
    shieldHpMax: 5000,
    description: 'Medium orbital slipway for capital cruisers and fleet logistics vessels.',
    trait: 'Constructs Heavy Cruiser (CH), Battlecruiser (BC), Fleet Repair Ship (REP_SHIP), Fleet Collier (COLLIER), Fuel Tanker (TANKER), Salvager (SALVAGER).',
    radius: 21,
    dockingRadius: 95,
    supportedHulls: ['CH', 'BC', 'REP_SHIP', 'REP', 'COLLIER', 'COL', 'TANKER', 'TNK', 'SALVAGER', 'SCP', 'HEAVY_CRUISER', 'BATTLECRUISER', 'REPAIR', 'SCRAP'],
  },
  SY_HEAVY: {
    type: 'SY_HEAVY',
    code: 'SY-H',
    name: 'Heavy Orbital Shipyard',
    costMetallic: 45000,
    costOrganic: 12000,
    prerequisite: 'Military Tier 7',
    mooring: 'Requires placement inside an active gravity well.',
    hullMax: 15000,
    shieldHpMax: 10000,
    description: 'Super-heavy orbital drydock for line battleships, dreadnoughts, and super-capital carriers.',
    trait: 'Constructs Battleship (BB), Dreadnought (DN), Super-Capital Carriers (CV, CVF), and Yestiri City Ship (CS).',
    radius: 30,
    dockingRadius: 130,
    supportedHulls: ['BB', 'DN', 'CV', 'CVF', 'BATTLESHIP', 'DREADNOUGHT', 'CARRIER', 'SUPER_CARRIER', 'CS', 'CITY_SHIP'],
  },
};

/**
 * Three specialized orbital research stations
 */
export const RESEARCH_STATION_DEFINITIONS: Record<
  'MILITARY_RESEARCH' | 'CIVIC_RESEARCH' | 'EXPANSION_CITADEL',
  ResearchStationDefinition
> = {
  MILITARY_RESEARCH: {
    type: 'MILITARY_RESEARCH',
    code: 'MRS',
    name: 'Military Research Station',
    costMetallic: RESEARCH_STATION_COSTS.MRS.metallic,
    costOrganic: RESEARCH_STATION_COSTS.MRS.organic,
    buildTicks: RESEARCH_STATION_COSTS.MRS.buildTicks,
    buildDurationSeconds: 5.0,
    mooring: 'Requires placement inside an active planetary, lunar, or tight asteroid cluster gravity well.',
    capacity: '+1 Military Lab tier capacity.',
    hullMax: 3500,
    shieldHpMax: 3000,
    description: 'Orbital laboratory synthesizing advanced warship telemetry, targeting suites, and hull alloys.',
    trait: '+1 Military Lab tier capacity. Requires placement inside an active planetary, lunar, or tight asteroid cluster gravity well.',
    radius: 16.67,
    dockingRadius: 60,
  },
  CIVIC_RESEARCH: {
    type: 'CIVIC_RESEARCH',
    code: 'CRO',
    name: 'Civic Research Outpost',
    costMetallic: RESEARCH_STATION_COSTS.CRO.metallic,
    costOrganic: RESEARCH_STATION_COSTS.CRO.organic,
    buildTicks: RESEARCH_STATION_COSTS.CRO.buildTicks,
    buildDurationSeconds: 5.0,
    mooring: 'Requires placement inside an active gravity well.',
    capacity: '+1 Civic Lab tier capacity.',
    hullMax: 3000,
    shieldHpMax: 2500,
    description: 'Civic scientific research outpost analyzing propulsion kinetics, logistics throughput, and sensor resolution.',
    trait: '+1 Civic Lab tier capacity. Requires placement inside an active gravity well.',
    radius: 16.67,
    dockingRadius: 50,
  },
  EXPANSION_CITADEL: {
    type: 'EXPANSION_CITADEL',
    code: 'EXC',
    name: 'Expansion Citadel',
    costMetallic: RESEARCH_STATION_COSTS.EXC.metallic,
    costOrganic: RESEARCH_STATION_COSTS.EXC.organic,
    buildTicks: RESEARCH_STATION_COSTS.EXC.buildTicks,
    buildDurationSeconds: 5.0,
    mooring: 'Requires placement inside an active gravity well.',
    capacity: '+1 Expansion Lab tier capacity.',
    hullMax: 8000,
    shieldHpMax: 6000,
    description: 'Regional orbital command bastion providing sovereign anchoring, deep-space logistics, rearm, and repair.',
    trait: '+1 Expansion Lab tier capacity. Requires placement inside an active gravity well.',
    radius: 21,
    dockingRadius: 120,
  },
};

export interface SensorPostDefinition {
  type: StructureType;
  code: string;
  name: string;
  costMetallic: number;
  costOrganic: number;
  mooring: string;
  hullMax: number;
  shieldHpMax: number;
  description: string;
  trait: string;
  radius: number;
  dockingRadius: number;
  radarRange: number;
  passiveRange: number;
}

export const SENSOR_POST_DEFINITIONS: Record<
  'POST_SENSOR_SM' | 'POST_SENSOR_MD' | 'POST_SENSOR_LG',
  SensorPostDefinition
> = {
  POST_SENSOR_SM: {
    type: 'POST_SENSOR_SM',
    code: 'POST-S',
    name: 'Small Sensor Post',
    costMetallic: 3000,
    costOrganic: 1500,
    mooring: 'Requires placement inside an active gravity well.',
    hullMax: 2000,
    shieldHpMax: 1500,
    description: 'Light orbital early-warning sensor platform providing passive orbital tracking and perimeter alerts.',
    trait: 'Extends passive detection horizon and maintains early warning coverage across local orbit.',
    radius: 24,
    dockingRadius: 45,
    radarRange: 10500,
    passiveRange: 31500,
  },
  POST_SENSOR_MD: {
    type: 'POST_SENSOR_MD',
    code: 'POST-M',
    name: 'Medium Sensor Post',
    costMetallic: 6500,
    costOrganic: 3500,
    mooring: 'Requires placement inside an active gravity well.',
    hullMax: 3500,
    shieldHpMax: 3000,
    description: 'Mid-range electronic surveillance and subspace tachyon relay array.',
    trait: 'Expands active radar and passive telemetry envelope across transit lanes.',
    radius: 30,
    dockingRadius: 60,
    radarRange: 14000,
    passiveRange: 42000,
  },
  POST_SENSOR_LG: {
    type: 'POST_SENSOR_LG',
    code: 'POST-L',
    name: 'Large Sensor Post',
    costMetallic: 12000,
    costOrganic: 7000,
    mooring: 'Requires placement inside an active gravity well.',
    hullMax: 5500,
    shieldHpMax: 5000,
    description: 'Heavy deep-space tachyon array and long-range sensor bastion.',
    trait: 'Wide-area sensor projection, penetrating nebula interference and fog of war.',
    radius: 38,
    dockingRadius: 80,
    radarRange: 21000,
    passiveRange: 63000,
  },
};
