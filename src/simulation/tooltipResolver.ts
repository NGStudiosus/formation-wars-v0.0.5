import { StructureType, ShipEntity } from '../types';
import { STRUCTURE_CATALOG, StructureDef } from './structures';
import { isStructureUnlocked, calculateResearchTokens, ResearchTokens } from './researchManager';
import {
  RESEARCH_CATALOG,
  TechNodeDefinition,
  HULL_UNLOCK_REQUIREMENTS,
} from './researchCatalog';

export interface TooltipDiagnostic {
  status: 'READY' | 'UNBUILDABLE';
  color: string;
  reason: string;
}

export interface DiagnosticReport {
  isAvailable: boolean;
  statusTag: string;
  statusColor: string;
  failureReason: string | null;
  unlockRequirement: string | null;
  costM: number;
  costO: number;
  costNeridium?: number;
  deficitM: number;
  deficitO: number;
  deficitNeridium?: number;
  gateType?: 'RESEARCH' | 'SLIPWAY' | 'MOORING' | 'RESOURCE' | 'READY';
  status: 'READY' | 'UNBUILDABLE';
  color: string;
  reason: string;
}

export interface ActionCatalogItem {
  id?: string;
  type?: string;
  role?: string;
  code?: string;
  name?: string;
  costM?: number;
  costO?: number;
  metallic?: number;
  organic?: number;
  techPrereqId?: string;
  techPrereqName?: string;
  requiredSlipwayTier?: number | string;
  requiredSlipwayTierName?: string;
  mooringType?: string;
  isMooredValid?: boolean;
  [key: string]: any;
}

export interface GameEntity {
  id?: string;
  name?: string;
  role?: string;
  structureType?: string;
  shipyardTier?: number | string;
  shipyardName?: string;
  supportedHulls?: string[];
  pos?: { x: number; y: number };
  gravityWellBody?: string | null;
  [key: string]: any;
}

export interface StructureEntity {
  id?: string;
  name?: string;
  role?: string;
  structureType?: string;
  supportedHulls?: string[];
  shipyardTier?: number | string;
  shipyardName?: string;
  [key: string]: any;
}

export interface GameState {
  unlockedTechs?: Set<string>;
  resources?: { metallic: number; organic: number };
  getHQResources?: () => { metallic: number; organic: number };
  getResearchState?: () => { completedNodes: Set<string> };
  isStructureUnlocked?: (type: StructureType) => boolean;
  isHullUnlocked?: (hullCodeOrRole: string) => boolean;
  [key: string]: any;
}

export interface ShipSpecConfig {
  role: string;
  code: string;
  name: string;
  classification: string;
  costM: number;
  costO: number;
  neridiumCost?: number;
  buildTicks: number;
  techPrereqId: string;
  techPrereqName: string;
  requiredShipyardTier: string;
  specs?: {
    hull: number;
    shield: number;
    tubes: number;
    pdBeams: number;
    speed: number;
    range: number;
  };
}

/**
 * Master Ship Specifications lookup keyed by both full naval role and shorthand tactical code.
 */
export const SHIP_CONFIGS: Record<string, ShipSpecConfig> = {
  FRIGATE: {
    role: 'FRIGATE',
    code: 'FG',
    name: 'Frigate',
    classification: 'Light Escort Screen',
    costM: 200,
    costO: 45,
    buildTicks: 10,
    techPrereqId: '',
    techPrereqName: 'Baseline Escort Clearance',
    requiredShipyardTier: 'HQ Integrated or Light',
    specs: { hull: 100, shield: 360, tubes: 2, pdBeams: 1, speed: 160, range: 900 },
  },
  FG: {
    role: 'FRIGATE',
    code: 'FG',
    name: 'Frigate',
    classification: 'Light Escort Screen',
    costM: 200,
    costO: 45,
    buildTicks: 10,
    techPrereqId: '',
    techPrereqName: 'Baseline Escort Clearance',
    requiredShipyardTier: 'HQ Integrated or Light',
    specs: { hull: 100, shield: 360, tubes: 2, pdBeams: 1, speed: 160, range: 900 },
  },
  DESTROYER: {
    role: 'DESTROYER',
    code: 'DD',
    name: 'Destroyer',
    classification: 'Guided Missile Destroyer',
    costM: 800,
    costO: 230,
    buildTicks: 18,
    techPrereqId: 'mil-t1',
    techPrereqName: 'Destroyer Hull Authorization',
    requiredShipyardTier: 'HQ Integrated or Light',
    specs: { hull: 250, shield: 700, tubes: 4, pdBeams: 1, speed: 145, range: 950 },
  },
  DD: {
    role: 'DESTROYER',
    code: 'DD',
    name: 'Destroyer',
    classification: 'Guided Missile Destroyer',
    costM: 800,
    costO: 230,
    buildTicks: 18,
    techPrereqId: 'mil-t1',
    techPrereqName: 'Destroyer Hull Authorization',
    requiredShipyardTier: 'HQ Integrated or Light',
    specs: { hull: 250, shield: 700, tubes: 4, pdBeams: 1, speed: 145, range: 950 },
  },
  LIGHT_CRUISER: {
    role: 'LIGHT_CRUISER',
    code: 'CL',
    name: 'Light Cruiser',
    classification: 'Combat Cruiser Screen',
    costM: 2500,
    costO: 650,
    buildTicks: 25,
    techPrereqId: 'mil-t2',
    techPrereqName: 'Light Cruiser Frame Certification',
    requiredShipyardTier: 'Light',
    specs: { hull: 350, shield: 1000, tubes: 5, pdBeams: 2, speed: 135, range: 1000 },
  },
  CL: {
    role: 'LIGHT_CRUISER',
    code: 'CL',
    name: 'Light Cruiser',
    classification: 'Combat Cruiser Screen',
    costM: 2500,
    costO: 650,
    buildTicks: 25,
    techPrereqId: 'mil-t2',
    techPrereqName: 'Light Cruiser Frame Certification',
    requiredShipyardTier: 'Light',
    specs: { hull: 350, shield: 1000, tubes: 5, pdBeams: 2, speed: 135, range: 1000 },
  },
  HEAVY_CRUISER: {
    role: 'HEAVY_CRUISER',
    code: 'CH',
    name: 'Heavy Cruiser',
    classification: 'Vanguard Strike Cruiser',
    costM: 5000,
    costO: 1200,
    buildTicks: 35,
    techPrereqId: 'mil-t4',
    techPrereqName: 'Heavy Cruiser Structural Validation',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 500, shield: 1600, tubes: 6, pdBeams: 2, speed: 120, range: 1100 },
  },
  CH: {
    role: 'HEAVY_CRUISER',
    code: 'CH',
    name: 'Heavy Cruiser',
    classification: 'Vanguard Strike Cruiser',
    costM: 5000,
    costO: 1200,
    buildTicks: 35,
    techPrereqId: 'mil-t4',
    techPrereqName: 'Heavy Cruiser Structural Validation',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 500, shield: 1600, tubes: 6, pdBeams: 2, speed: 120, range: 1100 },
  },
  BATTLECRUISER: {
    role: 'BATTLECRUISER',
    code: 'BC',
    name: 'Battlecruiser',
    classification: 'Capital Raider',
    costM: 8500,
    costO: 1800,
    buildTicks: 45,
    techPrereqId: 'mil-t6',
    techPrereqName: 'Battlecruiser Line Clearance',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 700, shield: 2200, tubes: 8, pdBeams: 3, speed: 110, range: 1250 },
  },
  BC: {
    role: 'BATTLECRUISER',
    code: 'BC',
    name: 'Battlecruiser',
    classification: 'Capital Raider',
    costM: 8500,
    costO: 1800,
    buildTicks: 45,
    techPrereqId: 'mil-t6',
    techPrereqName: 'Battlecruiser Line Clearance',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 700, shield: 2200, tubes: 8, pdBeams: 3, speed: 110, range: 1250 },
  },
  BATTLESHIP: {
    role: 'BATTLESHIP',
    code: 'BB',
    name: 'Battleship',
    classification: 'Dreadnought Line Battleship',
    costM: 14000,
    costO: 3000,
    buildTicks: 60,
    techPrereqId: 'mil-t8',
    techPrereqName: 'Battleship Armor Citadel Blueprint',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 1100, shield: 3200, tubes: 10, pdBeams: 4, speed: 95, range: 1400 },
  },
  BB: {
    role: 'BATTLESHIP',
    code: 'BB',
    name: 'Battleship',
    classification: 'Dreadnought Line Battleship',
    costM: 14000,
    costO: 3000,
    buildTicks: 60,
    techPrereqId: 'mil-t8',
    techPrereqName: 'Battleship Armor Citadel Blueprint',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 1100, shield: 3200, tubes: 10, pdBeams: 4, speed: 95, range: 1400 },
  },
  DREADNOUGHT: {
    role: 'DREADNOUGHT',
    code: 'DN',
    name: 'Dreadnought',
    classification: 'Supreme Flagship Citadel',
    costM: 25000,
    costO: 5000,
    buildTicks: 90,
    techPrereqId: 'mil-t10',
    techPrereqName: 'Dreadnought Strategic Protocol',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 2000, shield: 5000, tubes: 14, pdBeams: 6, speed: 80, range: 1600 },
  },
  DN: {
    role: 'DREADNOUGHT',
    code: 'DN',
    name: 'Dreadnought',
    classification: 'Supreme Flagship Citadel',
    costM: 25000,
    costO: 5000,
    buildTicks: 90,
    techPrereqId: 'mil-t10',
    techPrereqName: 'Dreadnought Strategic Protocol',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 2000, shield: 5000, tubes: 14, pdBeams: 6, speed: 80, range: 1600 },
  },
  CARRIER: {
    role: 'CARRIER',
    code: 'CV',
    name: 'Fleet Carrier',
    classification: 'Super-Capital Fleet Carrier',
    costM: 28000,
    costO: 6500,
    buildTicks: 80,
    techPrereqId: 'mil-t7',
    techPrereqName: 'Fleet Carrier Aerospace Gantry',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 1800, shield: 4500, tubes: 8, pdBeams: 6, speed: 85, range: 1500 },
  },
  CV: {
    role: 'CARRIER',
    code: 'CV',
    name: 'Fleet Carrier',
    classification: 'Super-Capital Fleet Carrier',
    costM: 28000,
    costO: 6500,
    buildTicks: 80,
    techPrereqId: 'mil-t7',
    techPrereqName: 'Fleet Carrier Aerospace Gantry',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 1800, shield: 4500, tubes: 8, pdBeams: 6, speed: 85, range: 1500 },
  },
  SUPER_CARRIER: {
    role: 'SUPER_CARRIER',
    code: 'CVF',
    name: 'Super-Carrier',
    classification: 'Apex Fleet Super-Carrier',
    costM: 38000,
    costO: 9000,
    buildTicks: 110,
    techPrereqId: 'mil-t9',
    techPrereqName: 'Apex Super-Carrier Strategic Protocol',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 2500, shield: 6000, tubes: 10, pdBeams: 8, speed: 80, range: 1600 },
  },
  CVF: {
    role: 'SUPER_CARRIER',
    code: 'CVF',
    name: 'Super-Carrier',
    classification: 'Apex Fleet Super-Carrier',
    costM: 38000,
    costO: 9000,
    buildTicks: 110,
    techPrereqId: 'mil-t9',
    techPrereqName: 'Apex Super-Carrier Strategic Protocol',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 2500, shield: 6000, tubes: 10, pdBeams: 8, speed: 80, range: 1600 },
  },
  CITY_SHIP: {
    role: 'CITY_SHIP',
    code: 'CS',
    name: 'City Ship',
    classification: 'Super-Capital Mobile Habitat Fortress',
    costM: 52000,
    costO: 16000,
    neridiumCost: 100,
    buildTicks: 140,
    techPrereqId: 'mil-t10',
    techPrereqName: 'Yestiri City Ship Genesis Blueprint',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 5000, shield: 12000, tubes: 18, pdBeams: 12, speed: 60, range: 2200 },
  },
  CS: {
    role: 'CITY_SHIP',
    code: 'CS',
    name: 'City Ship',
    classification: 'Super-Capital Mobile Habitat Fortress',
    costM: 52000,
    costO: 16000,
    neridiumCost: 100,
    buildTicks: 140,
    techPrereqId: 'mil-t10',
    techPrereqName: 'Yestiri City Ship Genesis Blueprint',
    requiredShipyardTier: 'Heavy',
    specs: { hull: 5000, shield: 12000, tubes: 18, pdBeams: 12, speed: 60, range: 2200 },
  },
  MINER: {
    role: 'MINER',
    code: 'MINER',
    name: 'Prospector Miner',
    classification: 'Autonomous Resource Harvester',
    costM: 1500,
    costO: 400,
    buildTicks: 25,
    techPrereqId: '',
    techPrereqName: 'Baseline Resource Harvester Protocol',
    requiredShipyardTier: 'HQ Integrated or Light',
    specs: { hull: 120, shield: 200, tubes: 0, pdBeams: 1, speed: 110, range: 0 },
  },
  MN: {
    role: 'MINER',
    code: 'MINER',
    name: 'Prospector Miner',
    classification: 'Autonomous Resource Harvester',
    costM: 1500,
    costO: 400,
    buildTicks: 25,
    techPrereqId: '',
    techPrereqName: 'Baseline Resource Harvester Protocol',
    requiredShipyardTier: 'HQ Integrated or Light',
    specs: { hull: 120, shield: 200, tubes: 0, pdBeams: 1, speed: 110, range: 0 },
  },
  COLLIER: {
    role: 'COLLIER',
    code: 'COL',
    name: 'Fleet Collier',
    classification: 'Underway Replenishment Vessel',
    costM: 3000,
    costO: 800,
    buildTicks: 22,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Fleet Logistics Collier',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 400, shield: 1200, tubes: 0, pdBeams: 2, speed: 115, range: 0 },
  },
  COL: {
    role: 'COLLIER',
    code: 'COL',
    name: 'Fleet Collier',
    classification: 'Underway Replenishment Vessel',
    costM: 3000,
    costO: 800,
    buildTicks: 22,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Fleet Logistics Collier',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 400, shield: 1200, tubes: 0, pdBeams: 2, speed: 115, range: 0 },
  },
  TANKER: {
    role: 'TANKER',
    code: 'TNK',
    name: 'Fuel Tanker',
    classification: 'Hydrogen Fuel Logistics',
    costM: 3200,
    costO: 900,
    buildTicks: 22,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Fleet Fuel Tanker',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 380, shield: 1100, tubes: 0, pdBeams: 2, speed: 120, range: 0 },
  },
  TNK: {
    role: 'TANKER',
    code: 'TNK',
    name: 'Fuel Tanker',
    classification: 'Hydrogen Fuel Logistics',
    costM: 3200,
    costO: 900,
    buildTicks: 22,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Fleet Fuel Tanker',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 380, shield: 1100, tubes: 0, pdBeams: 2, speed: 120, range: 0 },
  },
  REPAIR: {
    role: 'REP_SHIP',
    code: 'REP',
    name: 'Fleet Repair Ship',
    classification: 'Mobile Maintenance Tender',
    costM: 4000,
    costO: 1200,
    buildTicks: 28,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Fleet Auxiliary Repair Ship',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 450, shield: 1400, tubes: 0, pdBeams: 2, speed: 110, range: 0 },
  },
  REP: {
    role: 'REP_SHIP',
    code: 'REP',
    name: 'Fleet Repair Ship',
    classification: 'Mobile Maintenance Tender',
    costM: 4000,
    costO: 1200,
    buildTicks: 28,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Fleet Auxiliary Repair Ship',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 450, shield: 1400, tubes: 0, pdBeams: 2, speed: 110, range: 0 },
  },
  REP_SHIP: {
    role: 'REP_SHIP',
    code: 'REP',
    name: 'Fleet Repair Ship',
    classification: 'Mobile Maintenance Tender',
    costM: 4000,
    costO: 1200,
    buildTicks: 28,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Fleet Auxiliary Repair Ship',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 450, shield: 1400, tubes: 0, pdBeams: 2, speed: 110, range: 0 },
  },
  SCRAP: {
    role: 'SALVAGER',
    code: 'SCP',
    name: 'Salvager',
    classification: 'Combat Salvage Tender',
    costM: 2500,
    costO: 700,
    buildTicks: 20,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Autonomous Salvage Tender',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 350, shield: 900, tubes: 0, pdBeams: 1, speed: 125, range: 0 },
  },
  SCP: {
    role: 'SALVAGER',
    code: 'SCP',
    name: 'Salvager',
    classification: 'Combat Salvage Tender',
    costM: 2500,
    costO: 700,
    buildTicks: 20,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Autonomous Salvage Tender',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 350, shield: 900, tubes: 0, pdBeams: 1, speed: 125, range: 0 },
  },
  SALVAGER: {
    role: 'SALVAGER',
    code: 'SCP',
    name: 'Salvager',
    classification: 'Combat Salvage Tender',
    costM: 2500,
    costO: 700,
    buildTicks: 20,
    techPrereqId: 'civ-t3',
    techPrereqName: 'Autonomous Salvage Tender',
    requiredShipyardTier: 'Medium or Heavy',
    specs: { hull: 350, shield: 900, tubes: 0, pdBeams: 1, speed: 125, range: 0 },
  },
};

/**
 * Resolves current HQ stockpile quantities directly from primary simulation state.
 */
export function getHQStockpiles(state: GameState): { metallic: number; organic: number; neridium?: number; ore?: number } {
  if (!state) return { metallic: 0, organic: 0, neridium: 0, ore: 0 };
  if (typeof state.getHQResources === 'function') {
    return state.getHQResources();
  }
  if (state.resources) {
    return state.resources;
  }
  if ((state as any).hqStockpiles) {
    return (state as any).hqStockpiles;
  }
  return { metallic: 0, organic: 0, neridium: 0, ore: 0 };
}

/**
 * Returns supported hulls list for an active shipyard or command structure.
 */
export function getSupportedHullsForStructure(structure?: StructureEntity | null): string[] {
  if (!structure) {
    // Baseline HQ integrated slipway
    return ['FG', 'FRIGATE', 'DD', 'DESTROYER', 'MINER', 'MN'];
  }
  if (Array.isArray(structure.supportedHulls) && structure.supportedHulls.length > 0) {
    return structure.supportedHulls;
  }

  const role = (structure.role || structure.structureType || '').toUpperCase();
  if (role === 'HQ' || role === 'STATION' || role === 'HEADQUARTERS') {
    return ['FG', 'FRIGATE', 'DD', 'DESTROYER', 'MINER', 'MN'];
  }
  if (role === 'SY_LIGHT') {
    return ['FG', 'FRIGATE', 'DD', 'DESTROYER', 'CL', 'LIGHT_CRUISER', 'MINER', 'MN'];
  }
  if (role === 'SY_MEDIUM') {
    return [
      'FG', 'FRIGATE', 'DD', 'DESTROYER', 'CL', 'LIGHT_CRUISER', 'MINER', 'MN',
      'CH', 'HEAVY_CRUISER', 'BC', 'BATTLECRUISER',
      'COL', 'COLLIER', 'TNK', 'TANKER', 'REP', 'REPAIR', 'REP_SHIP', 'SCP', 'SCRAP', 'SALVAGER'
    ];
  }
  if (role === 'SY_HEAVY') {
    return [
      'FG', 'FRIGATE', 'DD', 'DESTROYER', 'CL', 'LIGHT_CRUISER', 'MINER', 'MN',
      'CH', 'HEAVY_CRUISER', 'BC', 'BATTLECRUISER',
      'COL', 'COLLIER', 'TNK', 'TANKER', 'REP', 'REPAIR', 'REP_SHIP', 'SCP', 'SCRAP', 'SALVAGER',
      'BB', 'BATTLESHIP', 'DN', 'DREADNOUGHT', 'CV', 'CARRIER', 'CVF', 'SUPER_CARRIER', 'CS', 'CITY_SHIP'
    ];
  }
  return ['FG', 'FRIGATE', 'DD', 'DESTROYER', 'MINER', 'MN'];
}

/**
 * Retrieves tech prerequisite metadata for a warship hull
 */
export function getTechPrereqForHull(hullRoleOrCode: string): {
  techId: string;
  name: string;
  branch: string;
  tier: number;
} | null {
  const norm = String(hullRoleOrCode || '').toUpperCase().replace(/\s+/g, '_');
  const techId = HULL_UNLOCK_REQUIREMENTS[norm] || SHIP_CONFIGS[norm]?.techPrereqId;
  if (!techId) return null;
  const tech = RESEARCH_CATALOG[techId];
  if (tech) {
    return {
      techId,
      name: tech.name,
      branch: tech.branch,
      tier: tech.tier,
    };
  }
  const spec = SHIP_CONFIGS[norm];
  return {
    techId,
    name: spec?.techPrereqName ?? techId,
    branch: 'MILITARY',
    tier: 1,
  };
}

/**
 * Retrieves tech prerequisite metadata for a structure blueprint
 */
export function getTechPrereqForStructure(structType: StructureType): {
  techId: string;
  name: string;
  branch: string;
  tier: number;
} | null {
  if (structType === 'SY_MEDIUM') {
    const tech = RESEARCH_CATALOG['civ-t3'] || RESEARCH_CATALOG['mil-t4'];
    return {
      techId: 'civ-t3',
      name: tech?.name ?? 'Fleet Logistics Industrialization (Civic Tier 3 / Military Tier 4)',
      branch: 'CIVILIAN',
      tier: 3,
    };
  }
  if (structType === 'SY_HEAVY') {
    const tech = RESEARCH_CATALOG['mil-t7'];
    return {
      techId: 'mil-t7',
      name: tech?.name ?? 'Fleet Carrier Aerospace Gantry',
      branch: 'MILITARY',
      tier: 7,
    };
  }
  if (structType === 'ORBITAL_REFINERY') {
    const tech = RESEARCH_CATALOG['civ-t2'];
    return {
      techId: 'civ-t2',
      name: tech?.name ?? 'Automated Ore Refining & Hydrocarbon Cracking',
      branch: 'CIVILIAN',
      tier: 2,
    };
  }
  if (structType === 'MISSILE_BATTERY' || structType === 'PD_PLATFORM') {
    const tech = RESEARCH_CATALOG['mil-t1-defgrid'];
    return {
      techId: 'mil-t1-defgrid',
      name: tech?.name ?? 'Defensive Station Grid',
      branch: 'MILITARY',
      tier: 1,
    };
  }
  if (structType === 'BASTION') {
    const tech = RESEARCH_CATALOG['exp-t6'];
    return {
      techId: 'exp-t6',
      name: tech?.name ?? 'Bastion Deep Fortress',
      branch: 'EXPANSION',
      tier: 6,
    };
  }
  return null;
}

/**
 * Prioritized Hierarchical Action Unlock Evaluation Pipeline
 * 1. Technology Prerequisite Gate (Highest Priority)
 * 2. Slipway / Facility Tonnage Incompatibility
 * 3. Gravity Well Mooring & Placement Constraints
 * 4. Material Resource Shortfall
 * 5. Operational Ready State
 */
export function resolveActionDiagnostics(
  item: ActionCatalogItem,
  activeEntity: GameEntity | null | undefined,
  state: GameState
): DiagnosticReport {
  const hqStock = getHQStockpiles(state);
  const costM = item.costM ?? item.metallic ?? 0;
  const costO = item.costO ?? item.organic ?? 0;
  const deficitM = Math.max(0, costM - hqStock.metallic);
  const deficitO = Math.max(0, costO - hqStock.organic);

  const unlockedSet: Set<string> =
    state?.unlockedTechs instanceof Set
      ? state.unlockedTechs
      : (state as any)?.getResearchState?.()?.completedNodes instanceof Set
      ? (state as any).getResearchState().completedNodes
      : new Set(Array.isArray(state?.unlockedTechs) ? state.unlockedTechs : []);

  // 1. Technology Prerequisite Gate
  const techId =
    item.techPrereqId ||
    (item.role ? HULL_UNLOCK_REQUIREMENTS[item.role.toUpperCase()] : undefined);

  if (techId && !unlockedSet.has(techId)) {
    const tech = RESEARCH_CATALOG[techId];
    const techName = tech?.name ?? item.techPrereqName ?? techId;
    const branchRaw = tech?.branch ?? 'MILITARY';
    const branch =
      branchRaw === 'CIVILIAN' ? 'Civic' : branchRaw === 'EXPANSION' ? 'Expansion' : 'Military';
    const tier = tech?.tier ?? 1;

    return {
      isAvailable: false,
      statusTag: '[RESEARCH LOCKED]',
      statusColor: '#ff3344',
      failureReason: `BLUEPRINT LOCKED: Requires technology ${techName}`,
      unlockRequirement: `Construct ${tier} ${branch} Research Labs and research ${techName} in Archives [R]`,
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'RESEARCH',
      status: 'UNBUILDABLE',
      color: '#ff3344',
      reason: `BLUEPRINT LOCKED: Requires technology ${techName}`,
    };
  }

  // 2. Slipway / Facility Tonnage Incompatibility
  if (item.requiredSlipwayTier !== undefined && activeEntity) {
    const activeTier =
      typeof activeEntity.shipyardTier === 'number'
        ? activeEntity.shipyardTier
        : activeEntity.role === 'SY_HEAVY' || (activeEntity as any).structureType === 'SY_HEAVY'
        ? 3
        : activeEntity.role === 'SY_MEDIUM' || (activeEntity as any).structureType === 'SY_MEDIUM'
        ? 2
        : activeEntity.role === 'SY_LIGHT' || (activeEntity as any).structureType === 'SY_LIGHT'
        ? 1
        : 0;

    const reqTierNum =
      typeof item.requiredSlipwayTier === 'number'
        ? item.requiredSlipwayTier
        : item.requiredSlipwayTier === 'HEAVY'
        ? 3
        : item.requiredSlipwayTier === 'MEDIUM'
        ? 2
        : 1;

    if (activeTier < reqTierNum) {
      const tierName =
        item.requiredSlipwayTierName ||
        (reqTierNum === 3 ? 'Heavy' : reqTierNum === 2 ? 'Medium' : 'Light');
      const hullName = item.name || item.role || 'Hull Class';

      return {
        isAvailable: false,
        statusTag: '[INCOMPATIBLE SLIPWAY]',
        statusColor: '#ffaa00',
        failureReason: `SLIPWAY DEFICIT: ${hullName} requires a ${tierName} Shipyard`,
        unlockRequirement: `Deploy a ${tierName} Shipyard scaffold using the Builder or HQ Domestic Structures menu`,
        costM,
        costO,
        deficitM,
        deficitO,
        gateType: 'SLIPWAY',
        status: 'UNBUILDABLE',
        color: '#ffaa00',
        reason: `SLIPWAY DEFICIT: ${hullName} requires a ${tierName} Shipyard`,
      };
    }
  }

  // 3. Gravity Well Mooring & Placement Constraints
  if (item.isMooredValid === false) {
    return {
      isAvailable: false,
      statusTag: '[INVALID MOORING SITE]',
      statusColor: '#ffaa00',
      failureReason: 'INVALID GRAVITY MOORING: Scaffold is outside the celestial capture zone',
      unlockRequirement:
        'Reposition scaffold within the dashed circular gravity well boundary around a planet or asteroid node',
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'MOORING',
      status: 'UNBUILDABLE',
      color: '#ffaa00',
      reason: 'INVALID GRAVITY MOORING: Scaffold is outside the celestial capture zone',
    };
  }

  // 4. Material Resource Shortfall
  if (deficitM > 0 || deficitO > 0) {
    return {
      isAvailable: false,
      statusTag: '[INSUFFICIENT RESERVES]',
      statusColor: '#ff6644',
      failureReason: 'STOCKPILE DEFICIT: Insufficient materials in HQ storage',
      unlockRequirement:
        'Mine raw ore with Autonomous Miners or expand HQ Refinery conversion tracks',
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'RESOURCE',
      status: 'UNBUILDABLE',
      color: '#ff6644',
      reason: 'STOCKPILE DEFICIT: Insufficient materials in HQ storage',
    };
  }

  // 5. Operational Ready State
  return {
    isAvailable: true,
    statusTag: '[READY TO CONSTRUCT]',
    statusColor: '#00ff88',
    failureReason: null,
    unlockRequirement: null,
    costM,
    costO,
    deficitM: 0,
    deficitO: 0,
    gateType: 'READY',
    status: 'READY',
    color: '#00ff88',
    reason: `CLICK TO COMMIT: -${costM.toLocaleString()} Metallic / -${costO.toLocaleString()} Organic`,
  };
}

/**
 * Primary diagnostic resolver for shipyard production orders.
 * Validates in strict hierarchical sequence:
 * 1. Technology Prerequisite Gate (Highest Priority)
 * 2. Slipway / Facility Tonnage Incompatibility
 * 3. Material Resource Shortfall
 * 4. Operational Ready State
 */
export function resolveShipyardDiagnostics(
  shipClass: string,
  activeStructure: StructureEntity | null | undefined,
  state: GameState
): DiagnosticReport {
  const normKey = String(shipClass || '').toUpperCase().replace(/\s+/g, '_');
  const spec = SHIP_CONFIGS[normKey] || SHIP_CONFIGS[shipClass] || SHIP_CONFIGS['FRIGATE'];
  const hqStock = getHQStockpiles(state);
  const costM = spec.costM;
  const costO = spec.costO;
  const costNer = spec.neridiumCost || 0;
  const curNer = hqStock.neridium ?? (state.resources as any)?.neridium ?? 0;
  const deficitM = Math.max(0, costM - hqStock.metallic);
  const deficitO = Math.max(0, costO - hqStock.organic);
  const deficitNer = Math.max(0, costNer - curNer);

  const unlockedSet: Set<string> =
    state?.unlockedTechs instanceof Set
      ? state.unlockedTechs
      : (state as any)?.getResearchState?.()?.completedNodes instanceof Set
      ? (state as any).getResearchState().completedNodes
      : new Set(Array.isArray(state?.unlockedTechs) ? state.unlockedTechs : []);

  // Determine required shipyard tier name
  const reqTierName =
    spec.code === 'BB' ||
    spec.code === 'DN' ||
    spec.code === 'CV' ||
    spec.code === 'CVF' ||
    spec.code === 'CS' ||
    spec.role === 'BATTLESHIP' ||
    spec.role === 'DREADNOUGHT' ||
    spec.role === 'CARRIER' ||
    spec.role === 'SUPER_CARRIER' ||
    spec.role === 'CITY_SHIP'
      ? 'Heavy'
      : spec.code === 'CL' || spec.role === 'LIGHT_CRUISER'
      ? 'Light'
      : 'Medium';

  const supported =
    activeStructure?.supportedHulls ?? getSupportedHullsForStructure(activeStructure);
  const isSupported =
    supported.includes(shipClass) ||
    supported.includes(spec.code) ||
    supported.includes(spec.role) ||
    supported.includes(normKey);

  const isDedicatedYard =
    activeStructure &&
    (activeStructure.role === 'SY_LIGHT' ||
      activeStructure.role === 'SY_MEDIUM' ||
      activeStructure.role === 'SY_HEAVY' ||
      (activeStructure as any).structureType === 'SY_LIGHT' ||
      (activeStructure as any).structureType === 'SY_MEDIUM' ||
      (activeStructure as any).structureType === 'SY_HEAVY');

  // If a dedicated shipyard is selected and physically lacks the slipway for this hull class,
  // slipway deficit is the immediate physical blocker for the facility.
  if (isDedicatedYard && !isSupported) {
    return {
      isAvailable: false,
      statusTag: '[INCOMPATIBLE SLIPWAY]',
      statusColor: '#ffaa00',
      failureReason: `SLIPWAY DEFICIT: ${spec.name} requires a ${reqTierName} Shipyard`,
      unlockRequirement: `Deploy a ${reqTierName} Shipyard scaffold using the Builder or HQ Domestic Structures menu`,
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'SLIPWAY',
      status: 'UNBUILDABLE',
      color: '#ffaa00',
      reason: `SLIPWAY DEFICIT: ${spec.name} requires a ${reqTierName} Shipyard`,
    };
  }

  // 1. Technology Prerequisite Gate
  const techMeta = getTechPrereqForHull(spec.role || normKey);
  const techId = techMeta?.techId || spec.techPrereqId;

  if (techId && !unlockedSet.has(techId)) {
    const tech = RESEARCH_CATALOG[techId];
    const techName = tech?.name || techMeta?.name || spec.techPrereqName || techId;
    const branchRaw = tech?.branch || techMeta?.branch || 'MILITARY';
    const branch =
      branchRaw === 'CIVILIAN' ? 'Civic' : branchRaw === 'EXPANSION' ? 'Expansion' : 'Military';
    const tier = tech?.tier || techMeta?.tier || 1;

    return {
      isAvailable: false,
      statusTag: '[RESEARCH LOCKED]',
      statusColor: '#ff3344',
      failureReason: `BLUEPRINT LOCKED: Requires technology ${techName}`,
      unlockRequirement: `Construct ${tier} ${branch} Research Labs and research ${techName} in Archives [R]`,
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'RESEARCH',
      status: 'UNBUILDABLE',
      color: '#ff3344',
      reason: `BLUEPRINT LOCKED: Requires technology ${techName}`,
    };
  }

  // 2. Slipway / Facility Tonnage Incompatibility (general context)
  if (!isSupported) {
    return {
      isAvailable: false,
      statusTag: '[INCOMPATIBLE SLIPWAY]',
      statusColor: '#ffaa00',
      failureReason: `SLIPWAY DEFICIT: ${spec.name} requires a ${reqTierName} Shipyard`,
      unlockRequirement: `Deploy a ${reqTierName} Shipyard scaffold using the Builder or HQ Domestic Structures menu`,
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'SLIPWAY',
      status: 'UNBUILDABLE',
      color: '#ffaa00',
      reason: `SLIPWAY DEFICIT: ${spec.name} requires a ${reqTierName} Shipyard`,
    };
  }

  // 3. Material Resource Shortfall
  if (deficitM > 0 || deficitO > 0) {
    return {
      isAvailable: false,
      statusTag: '[INSUFFICIENT RESERVES]',
      statusColor: '#ff6644',
      failureReason: 'STOCKPILE DEFICIT: Insufficient materials in HQ storage',
      unlockRequirement:
        'Mine raw ore with Autonomous Miners or expand HQ Refinery conversion tracks',
      costM,
      costO,
      costNeridium: costNer,
      deficitM,
      deficitO,
      deficitNeridium: deficitNer,
      gateType: 'RESOURCE',
      status: 'UNBUILDABLE',
      color: '#ff6644',
      reason: 'STOCKPILE DEFICIT: Insufficient materials in HQ storage',
    };
  }

  if (deficitNer > 0) {
    return {
      isAvailable: false,
      statusTag: '[INSUFFICIENT NERIDIUM]',
      statusColor: '#c084fc',
      failureReason: `NERIDIUM DEFICIT: Requires ${costNer} Neridium (${Math.round(curNer)} available)`,
      unlockRequirement:
        'Refine raw ore at HQ Refinery tracks to yield rare Neridium byproducts (1 per 5,000 ore)',
      costM,
      costO,
      costNeridium: costNer,
      deficitM: 0,
      deficitO: 0,
      deficitNeridium: deficitNer,
      gateType: 'RESOURCE',
      status: 'UNBUILDABLE',
      color: '#c084fc',
      reason: `NERIDIUM DEFICIT: Requires ${costNer} Neridium (${Math.round(curNer)} available)`,
    };
  }

  // 4. Operational Ready State
  return {
    isAvailable: true,
    statusTag: '[READY TO CONSTRUCT]',
    statusColor: '#00ff88',
    failureReason: null,
    unlockRequirement: null,
    costM,
    costO,
    costNeridium: costNer,
    deficitM: 0,
    deficitO: 0,
    deficitNeridium: 0,
    gateType: 'READY',
    status: 'READY',
    color: '#00ff88',
    reason: `CLICK TO COMMIT: -${costM.toLocaleString()} Metallic / -${costO.toLocaleString()} Organic${costNer > 0 ? ` / -${costNer} Neridium` : ''}`,
  };
}

/**
 * Diagnostic structure blueprint descriptor extending DiagnosticReport
 */
export interface StructureTooltipDiagnostic extends DiagnosticReport {
  missingM: number;
  missingO: number;
  mooring: string;
  trait: string;
  name: string;
  code: string;
  isUnlocked: boolean;
  lockReason?: string;
}

/**
 * Maps shorthand codes to catalog types
 */
export const CODE_TO_STRUCTURE_TYPE: Record<string, StructureType> = {
  'SY-L': 'SY_LIGHT',
  'SY_LIGHT': 'SY_LIGHT',
  'SY-M': 'SY_MEDIUM',
  'SY_MEDIUM': 'SY_MEDIUM',
  'SY-H': 'SY_HEAVY',
  'SY_HEAVY': 'SY_HEAVY',
  'REF': 'ORBITAL_REFINERY',
  'ORBITAL_REFINERY': 'ORBITAL_REFINERY',
  'MRS': 'MILITARY_RESEARCH',
  'MILITARY_RESEARCH': 'MILITARY_RESEARCH',
  'CRO': 'CIVIC_RESEARCH',
  'CIVIC_RESEARCH': 'CIVIC_RESEARCH',
  'EXC': 'EXPANSION_CITADEL',
  'EXPANSION_CITADEL': 'EXPANSION_CITADEL',
  'POST-S': 'POST_SENSOR_SM',
  'POST_SENSOR_SM': 'POST_SENSOR_SM',
  'POST-M': 'POST_SENSOR_MD',
  'POST_SENSOR_MD': 'POST_SENSOR_MD',
  'POST-L': 'POST_SENSOR_LG',
  'POST_SENSOR_LG': 'POST_SENSOR_LG',
  'MSB': 'MISSILE_BATTERY',
  'MISSILE_BATTERY': 'MISSILE_BATTERY',
  'PDP': 'PD_PLATFORM',
  'PD_PLATFORM': 'PD_PLATFORM',
  'RPB': 'REPAIR_BAY',
  'REPAIR_BAY': 'REPAIR_BAY',
  'BAS': 'BASTION',
  'BASTION': 'BASTION',
};

/**
 * Resolves structure blueprint diagnostics directly from live game state and HQ stockpiles.
 * Evaluates:
 * 1. Technology Prerequisite Gate
 * 2. Gravity Well Mooring & Placement Constraints
 * 3. Material Resource Shortfall
 * 4. Operational Ready State
 */
export function resolveStructureDiagnostics(
  structureTypeOrCode: string,
  state: GameState,
  mooringContext?: { isMooredValid?: boolean; isOutsideCaptureZone?: boolean }
): StructureTooltipDiagnostic {
  const norm = structureTypeOrCode?.toUpperCase?.() || '';
  const structType: StructureType = CODE_TO_STRUCTURE_TYPE[norm] || (norm as StructureType);
  const def = STRUCTURE_CATALOG[structType] || STRUCTURE_CATALOG.SY_LIGHT;
  const hqStock = getHQStockpiles(state);

  const costM = def.costMetallic;
  const costO = def.costOrganic;
  const deficitM = Math.max(0, costM - hqStock.metallic);
  const deficitO = Math.max(0, costO - hqStock.organic);

  const unlockedSet: Set<string> =
    state?.unlockedTechs instanceof Set
      ? state.unlockedTechs
      : (state as any)?.getResearchState?.()?.completedNodes instanceof Set
      ? (state as any).getResearchState().completedNodes
      : new Set(Array.isArray(state?.unlockedTechs) ? state.unlockedTechs : []);

  let isUnlocked = true;
  if (typeof state?.isStructureUnlocked === 'function') {
    isUnlocked = state.isStructureUnlocked(structType);
  } else {
    isUnlocked = isStructureUnlocked(structType, unlockedSet);
  }

  const techMeta = getTechPrereqForStructure(structType);

  const mooring =
    def.mooring ||
    (norm === 'REF' || structType === 'ORBITAL_REFINERY'
      ? 'Requires placement inside an active planetary or asteroid gravity well.'
      : norm === 'MRS' || structType === 'MILITARY_RESEARCH'
      ? 'Requires placement inside an active planetary, lunar, or tight asteroid cluster gravity well.'
      : norm === 'POST-S' ||
        structType === 'POST_SENSOR_SM' ||
        structType === 'POST_SENSOR_MD' ||
        structType === 'POST_SENSOR_LG'
      ? 'Requires placement inside an active planetary, lunar, or asteroid gravity well.'
      : 'Requires placement inside an active gravity well.');

  // 1. Technology Prerequisite Gate (Highest Priority)
  if (!isUnlocked) {
    const techName = techMeta?.name ?? 'Advanced Facility Schematics';
    const branchRaw = techMeta?.branch ?? 'RESEARCH';
    const branch =
      branchRaw === 'CIVILIAN' ? 'Civic' : branchRaw === 'EXPANSION' ? 'Expansion' : 'Military';
    const tier = techMeta?.tier ?? 1;
    const failureReason = `BLUEPRINT LOCKED: Requires technology ${techName}`;
    const unlockRequirement = `Construct ${tier} ${branch} Research Labs and research ${techName} in Archives [R]`;

    return {
      isAvailable: false,
      statusTag: '[RESEARCH LOCKED]',
      statusColor: '#ff3344',
      failureReason,
      unlockRequirement,
      costM,
      costO,
      missingM: deficitM,
      missingO: deficitO,
      deficitM,
      deficitO,
      gateType: 'RESEARCH',
      status: 'UNBUILDABLE',
      color: '#ff3344',
      reason: failureReason,
      mooring,
      trait: def.trait,
      name: def.name,
      code: def.code,
      isUnlocked: false,
      lockReason: failureReason,
    };
  }

  // 2. Gravity Well Mooring & Placement Constraints
  if (mooringContext?.isMooredValid === false || mooringContext?.isOutsideCaptureZone === true) {
    const failureReason = 'INVALID GRAVITY MOORING: Scaffold is outside the celestial capture zone';
    const unlockRequirement =
      'Reposition scaffold within the dashed circular gravity well boundary around a planet or asteroid node';

    return {
      isAvailable: false,
      statusTag: '[INVALID MOORING SITE]',
      statusColor: '#ffaa00',
      failureReason,
      unlockRequirement,
      costM,
      costO,
      missingM: deficitM,
      missingO: deficitO,
      deficitM,
      deficitO,
      gateType: 'MOORING',
      status: 'UNBUILDABLE',
      color: '#ffaa00',
      reason: failureReason,
      mooring,
      trait: def.trait,
      name: def.name,
      code: def.code,
      isUnlocked: true,
    };
  }

  // 3. Material Resource Shortfall
  if (deficitM > 0 || deficitO > 0) {
    const failureReason = 'STOCKPILE DEFICIT: Insufficient materials in HQ storage';
    const unlockRequirement =
      'Mine raw ore with Autonomous Miners or expand HQ Refinery conversion tracks';

    return {
      isAvailable: false,
      statusTag: '[INSUFFICIENT RESERVES]',
      statusColor: '#ff6644',
      failureReason,
      unlockRequirement,
      costM,
      costO,
      missingM: deficitM,
      missingO: deficitO,
      deficitM,
      deficitO,
      gateType: 'RESOURCE',
      status: 'UNBUILDABLE',
      color: '#ff6644',
      reason: failureReason,
      mooring,
      trait: def.trait,
      name: def.name,
      code: def.code,
      isUnlocked: true,
    };
  }

  // 4. Operational Ready State
  return {
    isAvailable: true,
    statusTag: '[READY TO CONSTRUCT]',
    statusColor: '#00ff88',
    failureReason: null,
    unlockRequirement: null,
    costM,
    costO,
    missingM: 0,
    missingO: 0,
    deficitM: 0,
    deficitO: 0,
    gateType: 'READY',
    status: 'READY',
    color: '#00ff88',
    reason: `CLICK TO COMMIT: -${costM.toLocaleString()} Metallic / -${costO.toLocaleString()} Organic`,
    mooring,
    trait: def.trait,
    name: def.name,
    code: def.code,
    isUnlocked: true,
  };
}

export interface ResearchNodeDiagnosticReport extends DiagnosticReport {
  node: TechNodeDefinition;
  tokens: ResearchTokens;
  currentCapacity: number;
  requiredCapacity: number;
  isCompleted: boolean;
  isResearching: boolean;
  isPaused: boolean;
}

/**
 * Resolves comprehensive diagnostics for research nodes.
 * Enforces dual-token emission model:
 * - Specialized branches require branch tokens (tokens[branch] >= Tier N)
 * - HQ branch requires HQ tokens (tokens.headquarters >= Tier N * 3)
 * - Deficit reporting never suggests building 1 of each lab type.
 */
export function resolveResearchNodeDiagnostics(
  node: TechNodeDefinition,
  state: GameState | any
): ResearchNodeDiagnosticReport {
  const tokens: ResearchTokens = calculateResearchTokens(state);
  const hqStock = getHQStockpiles(state);
  const costM = node.costMetallic ?? node.costM ?? 0;
  const costO = node.costOrganic ?? node.costO ?? 0;
  const deficitM = Math.max(0, costM - (hqStock.metallic ?? 0));
  const deficitO = Math.max(0, costO - (hqStock.organic ?? 0));

  const branch = node.branch || 'MILITARY';
  const isHQ = branch === 'HEADQUARTERS';
  const tier = node.tier ?? 1;
  const requiredCapacity = isHQ ? tier * 3 : tier;

  let currentCapacity = 0;
  let branchStationName = '';
  if (branch === 'MILITARY') {
    currentCapacity = tokens.military;
    branchStationName = 'Military Research Station [MRS]';
  } else if (branch === 'CIVILIAN') {
    currentCapacity = tokens.civilian;
    branchStationName = 'Civic Research Outpost [CRO]';
  } else if (branch === 'EXPANSION') {
    currentCapacity = tokens.expansion;
    branchStationName = 'Expansion Citadel [EXC]';
  } else {
    currentCapacity = tokens.headquarters;
    branchStationName = 'HQ Research Tokens';
  }

  const completedNodes: Set<string> =
    state?.unlockedTechs instanceof Set
      ? state.unlockedTechs
      : state?.researchManager?.completedNodes instanceof Set
      ? state.researchManager.completedNodes
      : new Set(Array.isArray(state?.unlockedTechs) ? state.unlockedTechs : []);

  const isCompleted = completedNodes.has(node.id);

  // Check active research
  let isResearching = false;
  let isPaused = false;
  const rm = state?.researchManager;
  if (rm?.branches?.[branch]?.activeProject?.nodeId === node.id) {
    const p = rm.branches[branch].activeProject;
    isResearching = p.status === 'RESEARCHING';
    isPaused = p.status === 'PAUSED_LACKING_CAPACITY';
  }

  // 1. Completed
  if (isCompleted) {
    return {
      node,
      tokens,
      currentCapacity,
      requiredCapacity,
      isCompleted: true,
      isResearching: false,
      isPaused: false,
      isAvailable: false,
      statusTag: '[SYNTHESIS COMPLETE]',
      statusColor: '#00ff88',
      failureReason: null,
      unlockRequirement: null,
      costM,
      costO,
      deficitM: 0,
      deficitO: 0,
      gateType: 'READY',
      status: 'READY',
      color: '#00ff88',
      reason: 'COMPLETED: ACTIVE PROTOCOL',
    };
  }

  // 2. Active Researching / Paused
  if (isResearching || isPaused) {
    const statusText = isPaused
      ? isHQ
        ? `PAUSED: HQ Research Tokens dropped below required ${requiredCapacity} tokens`
        : `PAUSED: Station capacity dropped below Tier ${tier}`
      : 'RESEARCHING: SYNTHESIS PROTOCOL IN PROGRESS';

    return {
      node,
      tokens,
      currentCapacity,
      requiredCapacity,
      isCompleted: false,
      isResearching,
      isPaused,
      isAvailable: false,
      statusTag: isPaused ? '[PAUSED - DEFICIT]' : '[IN PROGRESS]',
      statusColor: isPaused ? '#ffaa00' : '#00f0ff',
      failureReason: isPaused ? statusText : null,
      unlockRequirement: isPaused
        ? isHQ
          ? `Construct ${requiredCapacity - currentCapacity} additional research lab(s) of ANY type to resume synthesis`
          : `Construct ${requiredCapacity - currentCapacity} additional ${branchStationName} to resume synthesis`
        : null,
      costM,
      costO,
      deficitM: 0,
      deficitO: 0,
      gateType: 'RESEARCH',
      status: isPaused ? 'UNBUILDABLE' : 'READY',
      color: isPaused ? '#ffaa00' : '#00f0ff',
      reason: statusText,
    };
  }

  // 3. Node Prerequisites Gate
  if (node.prereqs && node.prereqs.length > 0) {
    for (const prereqId of node.prereqs) {
      if (!completedNodes.has(prereqId)) {
        const prereqNode = RESEARCH_CATALOG[prereqId];
        const prereqName = prereqNode?.name || prereqId;
        const failureReason = `PREREQUISITE LOCKED: Requires prior technology ${prereqName}`;
        const unlockRequirement = `Synthesize ${prereqName} in the Technological Codex before unlocking this protocol`;

        return {
          node,
          tokens,
          currentCapacity,
          requiredCapacity,
          isCompleted: false,
          isResearching: false,
          isPaused: false,
          isAvailable: false,
          statusTag: '[PREREQUISITE LOCKED]',
          statusColor: '#ff3344',
          failureReason,
          unlockRequirement,
          costM,
          costO,
          deficitM,
          deficitO,
          gateType: 'RESEARCH',
          status: 'UNBUILDABLE',
          color: '#ff3344',
          reason: failureReason,
        };
      }
    }
  }

  // 4. Token & Station Capacity Gate
  if (currentCapacity < requiredCapacity) {
    const deficit = requiredCapacity - currentCapacity;
    const failureReason = isHQ
      ? `HQ TOKEN DEFICIT: Requires ${requiredCapacity} HQ Research Tokens (Current: ${currentCapacity})`
      : `FACILITY DEFICIT: Requires Tier ${tier} ${branchStationName} (Current: ${currentCapacity}/${tier})`;

    const unlockRequirement = isHQ
      ? `Construct ${deficit} additional research lab(s) of ANY type (MRS, CRO, or EXC) to reach ${requiredCapacity} HQ tokens`
      : `Construct ${deficit} additional ${branchStationName} via Builder or HQ Domestic menu`;

    return {
      node,
      tokens,
      currentCapacity,
      requiredCapacity,
      isCompleted: false,
      isResearching: false,
      isPaused: false,
      isAvailable: false,
      statusTag: isHQ ? '[HQ TOKEN DEFICIT]' : '[STATION DEFICIT]',
      statusColor: '#ff3344',
      failureReason,
      unlockRequirement,
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'RESEARCH',
      status: 'UNBUILDABLE',
      color: '#ff3344',
      reason: failureReason,
    };
  }

  // 5. Stockpile Solvency Gate
  if (deficitM > 0 || deficitO > 0) {
    const failureReason = 'STOCKPILE DEFICIT: Insufficient materials in HQ storage';
    const unlockRequirement =
      'Mine raw ore with Autonomous Miners or expand HQ Refinery conversion tracks';

    return {
      node,
      tokens,
      currentCapacity,
      requiredCapacity,
      isCompleted: false,
      isResearching: false,
      isPaused: false,
      isAvailable: false,
      statusTag: '[INSUFFICIENT RESERVES]',
      statusColor: '#ff6644',
      failureReason,
      unlockRequirement,
      costM,
      costO,
      deficitM,
      deficitO,
      gateType: 'RESOURCE',
      status: 'UNBUILDABLE',
      color: '#ff6644',
      reason: failureReason,
    };
  }

  // 6. Ready to Initiate
  return {
    node,
    tokens,
    currentCapacity,
    requiredCapacity,
    isCompleted: false,
    isResearching: false,
    isPaused: false,
    isAvailable: true,
    statusTag: '[READY TO SYNTHESIZE]',
    statusColor: '#00ff88',
    failureReason: null,
    unlockRequirement: null,
    costM,
    costO,
    deficitM: 0,
    deficitO: 0,
    gateType: 'READY',
    status: 'READY',
    color: '#00ff88',
    reason: `CLICK TO COMMIT: -${costM.toLocaleString()} Metallic / -${costO.toLocaleString()} Organic`,
  };
}
