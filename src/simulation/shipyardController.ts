import { NavalUnitRole, ProductionQueueItem, ShipEntity } from '../types';
import { SHIPYARD_CAPABILITIES } from './structureTypes';
import { isHullUnlocked, getHQStockpiles } from './researchManager';
import { GameState, StructureEntity } from '../state/gameState';

export interface ShipyardBuildSpec {
  role: NavalUnitRole;
  code: string;
  name: string;
  classification: string;
  costM: number;
  costO: number;
  buildTicks: number; // Duration in seconds/ticks
  requiresShipyard: boolean;
  minShipyardTier: 'HQ_INTEGRATED' | 'SY_LIGHT' | 'SY_MEDIUM' | 'SY_HEAVY';
  techPrereqId?: string;
  neridiumCost: number;
  specs: {
    hull: number;
    shield: number;
    tubes: number;
    pdBeams: number;
    speed: number;
    range: number;
  };
  description: string;
}

export const SHIP_CONFIGS: Record<string, ShipyardBuildSpec> = {
  FRIGATE: {
    role: 'FRIGATE',
    code: 'FG',
    name: 'Frigate',
    classification: 'Light Escort Screen',
    costM: 200,
    costO: 45,
    neridiumCost: 1,
    buildTicks: 10,
    requiresShipyard: false,
    minShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: '',
    specs: { hull: 100, shield: 360, tubes: 2, pdBeams: 1, speed: 160, range: 900 },
    description: 'High-speed screening escort with dual guided torpedo tubes and point-defense laser.',
  },
  DESTROYER: {
    role: 'DESTROYER',
    code: 'DD',
    name: 'Destroyer',
    classification: 'Guided Missile Destroyer',
    costM: 800,
    costO: 230,
    neridiumCost: 3,
    buildTicks: 18,
    requiresShipyard: false,
    minShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: 'MIL_DESTROYER',
    specs: { hull: 250, shield: 700, tubes: 4, pdBeams: 1, speed: 145, range: 950 },
    description: 'Workhorse fleet combatant with quad missile tubes, heavy deflector shield, and fast sublight drive.',
  },
  LIGHT_CRUISER: {
    role: 'LIGHT_CRUISER',
    code: 'CL',
    name: 'Light Cruiser',
    classification: 'Combat Cruiser Screen',
    costM: 2500,
    costO: 650,
    neridiumCost: 8,
    buildTicks: 25,
    requiresShipyard: true,
    minShipyardTier: 'SY_LIGHT',
    techPrereqId: 'MIL_LIGHT_CRUISER',
    specs: { hull: 350, shield: 1000, tubes: 5, pdBeams: 2, speed: 135, range: 1000 },
    description: 'Frontline cruiser featuring 5-tube missile volley capacity and twin PDPLA defensive arrays.',
  },
  HEAVY_CRUISER: {
    role: 'HEAVY_CRUISER',
    code: 'CH',
    name: 'Heavy Cruiser',
    classification: 'Vanguard Strike Cruiser',
    costM: 5000,
    costO: 1200,
    neridiumCost: 16,
    buildTicks: 35,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_HEAVY_CRUISER',
    specs: { hull: 500, shield: 1600, tubes: 6, pdBeams: 2, speed: 120, range: 1100 },
    description: 'Reinforced line combatant designed for prolonged fleet engagements and orbital bombardment.',
  },
  ESCORT_CARRIER: {
    role: 'CARRIER',
    code: 'CVE',
    name: 'Escort Carrier',
    classification: 'Auxiliary Flight Deck',
    costM: 6000,
    costO: 1500,
    neridiumCost: 16,
    buildTicks: 40,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_CARRIER',
    specs: { hull: 600, shield: 1800, tubes: 4, pdBeams: 3, speed: 110, range: 1200 },
    description: 'Escort carrier hull deploying strike support craft with medium warship shielding.',
  },
  BATTLECRUISER: {
    role: 'BATTLECRUISER',
    code: 'BC',
    name: 'Battlecruiser',
    classification: 'Capital Raider',
    costM: 8500,
    costO: 1800,
    neridiumCost: 24,
    buildTicks: 45,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_BATTLECRUISER',
    specs: { hull: 700, shield: 2200, tubes: 8, pdBeams: 3, speed: 110, range: 1250 },
    description: 'Heavy capital ship packing an 8-tube synchronized salvo array and reinforced kinetic armor.',
  },
  BATTLESHIP: {
    role: 'BATTLESHIP',
    code: 'BB',
    name: 'Battleship',
    classification: 'Dreadnought Line Battleship',
    costM: 14000,
    costO: 3000,
    neridiumCost: 34,
    buildTicks: 60,
    requiresShipyard: true,
    minShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_BATTLESHIP',
    specs: { hull: 1100, shield: 3200, tubes: 10, pdBeams: 4, speed: 95, range: 1400 },
    description: 'Super-heavy naval citadel capable of absorbing extreme fire while unleashing devastating salvos.',
  },
  DREADNOUGHT: {
    role: 'DREADNOUGHT',
    code: 'DN',
    name: 'Dreadnought',
    classification: 'Supreme Flagship Citadel',
    costM: 25000,
    costO: 5000,
    neridiumCost: 45,
    buildTicks: 90,
    requiresShipyard: true,
    minShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_DREADNOUGHT',
    specs: { hull: 2000, shield: 5000, tubes: 14, pdBeams: 6, speed: 80, range: 1600 },
    description: 'Apex fleet command vessel with 14 missile tubes, 6 PDPLA beams, and colossal shield barrier.',
  },
  MINER: {
    role: 'MINER',
    code: 'MN',
    name: 'Prospector Miner',
    classification: 'Autonomous Resource Harvester',
    costM: 1500,
    costO: 400,
    neridiumCost: 0,
    buildTicks: 25,
    requiresShipyard: false,
    minShipyardTier: 'HQ_INTEGRATED',
    techPrereqId: '',
    specs: { hull: 120, shield: 200, tubes: 0, pdBeams: 1, speed: 110, range: 0 },
    description: 'Autonomous ore extraction vessel with 1,000 unit cargo hold, laser drill, and tractor clamp.',
  },
  COLLIER: {
    role: 'COLLIER',
    code: 'COL',
    name: 'Fleet Collier',
    classification: 'Underway Replenishment Vessel',
    costM: 3500,
    costO: 900,
    neridiumCost: 0,
    buildTicks: 28,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_COLLIER',
    specs: { hull: 400, shield: 1200, tubes: 0, pdBeams: 2, speed: 115, range: 0 },
    description: 'Fleet replenishment collier carrying 2,000 missiles for underway restocking.',
  },
  TANKER: {
    role: 'TANKER',
    code: 'TNK',
    name: 'Fuel Tanker',
    classification: 'Hydrogen Fuel Logistics',
    costM: 3200,
    costO: 1100,
    neridiumCost: 0,
    buildTicks: 28,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_TANKER',
    specs: { hull: 380, shield: 1100, tubes: 0, pdBeams: 2, speed: 120, range: 0 },
    description: 'Mobile fuel tanker transferring liquid hydrogen propellant to fleet warships.',
  },
  REPAIR: {
    role: 'REP_SHIP',
    code: 'REP',
    name: 'Fleet Repair Ship',
    classification: 'Mobile Maintenance Tender',
    costM: 4200,
    costO: 1400,
    neridiumCost: 0,
    buildTicks: 32,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_REPAIR',
    specs: { hull: 450, shield: 1400, tubes: 0, pdBeams: 2, speed: 110, range: 0 },
    description: 'Dedicated fleet maintenance tender providing field hull repairs and shield calibration.',
  },
  SCRAP: {
    role: 'SALVAGER',
    code: 'SCP',
    name: 'Salvager',
    classification: 'Combat Salvage Tender',
    costM: 3000,
    costO: 800,
    neridiumCost: 0,
    buildTicks: 24,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'CIV_SALVAGE',
    specs: { hull: 350, shield: 900, tubes: 0, pdBeams: 1, speed: 125, range: 0 },
    description: 'Autonomous battlefield recovery vessel harvesting scrap and alloy from destroyed hulls.',
  },
  CARRIER: {
    role: 'CARRIER',
    code: 'CV',
    name: 'Fleet Carrier',
    classification: 'Super-Capital Fleet Carrier',
    costM: 28000,
    costO: 6500,
    neridiumCost: 34,
    buildTicks: 80,
    requiresShipyard: true,
    minShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_CARRIER',
    specs: { hull: 1800, shield: 4500, tubes: 8, pdBeams: 6, speed: 85, range: 1500 },
    description: 'Super-capital strike carrier launching autonomous strike wings and long-range interceptors.',
  },
  SUPER_CARRIER: {
    role: 'SUPER_CARRIER',
    code: 'CVF',
    name: 'Super-Carrier',
    classification: 'Apex Fleet Super-Carrier',
    costM: 38000,
    costO: 9000,
    neridiumCost: 50,
    buildTicks: 110,
    requiresShipyard: true,
    minShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_SUPER_CARRIER',
    specs: { hull: 2600, shield: 6000, tubes: 12, pdBeams: 8, speed: 75, range: 1700 },
    description: 'Apex super-carrier citadel projecting overwhelming planetary aerospace supremacy.',
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
    requiresShipyard: true,
    minShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_CITY_SHIP',
    specs: { hull: 5000, shield: 12000, tubes: 18, pdBeams: 12, speed: 60, range: 2200 },
    description: 'Monumental Yestiri mobile civilization fortress and apex capital combatant requiring 100 Neridium.',
  },
  LIAAL_LIGHT: {
    role: 'LIAAL_LIGHT',
    code: 'L-WS',
    name: 'Liaal Light Warship',
    classification: 'Swarm Strike Skiff',
    costM: 2400,
    costO: 650,
    neridiumCost: 6,
    buildTicks: 22,
    requiresShipyard: true,
    minShipyardTier: 'SY_LIGHT',
    techPrereqId: 'MIL_LIAAL_LIGHT',
    specs: { hull: 105, shield: 300, tubes: 20, pdBeams: 2, speed: 135, range: 1100 },
    description: 'Liaal light swarm warship equipped with a 20-tube synchronized salvo array, high-capacity cargo holds, but reduced 30% armor and shield bulkheads.',
  },
  LIAAL_MEDIUM: {
    role: 'LIAAL_MEDIUM',
    code: 'M-WS',
    name: 'Liaal Medium Warship',
    classification: 'Volley Bombardment Cruiser',
    costM: 5800,
    costO: 1400,
    neridiumCost: 18,
    buildTicks: 38,
    requiresShipyard: true,
    minShipyardTier: 'SY_MEDIUM',
    techPrereqId: 'MIL_LIAAL_MEDIUM',
    specs: { hull: 180, shield: 600, tubes: 45, pdBeams: 4, speed: 115, range: 1250 },
    description: 'Liaal medium bombardment warship unleashing 45 missiles per salvo, reinforced with bio-terraforming canisters and lightweight 30% integrity composite frames.',
  },
  LIAAL_HEAVY: {
    role: 'LIAAL_HEAVY',
    code: 'H-WS',
    name: 'Liaal Heavy Warship',
    classification: 'Cataclysm Missile Dreadnought',
    costM: 20000,
    costO: 4500,
    neridiumCost: 40,
    buildTicks: 80,
    requiresShipyard: true,
    minShipyardTier: 'SY_HEAVY',
    techPrereqId: 'MIL_LIAAL_HEAVY',
    specs: { hull: 600, shield: 1500, tubes: 100, pdBeams: 8, speed: 85, range: 1550 },
    description: 'Colossal Liaal heavy missile titan firing a staggering 100-missile cataclysm salvo per volley, balanced with delicate 30% structural shielding.',
  },
};

// Aliases for short codes (FG, DD, CL, etc.)
SHIP_CONFIGS['FG'] = SHIP_CONFIGS['FRIGATE'];
SHIP_CONFIGS['DD'] = SHIP_CONFIGS['DESTROYER'];
SHIP_CONFIGS['CL'] = SHIP_CONFIGS['LIGHT_CRUISER'];
SHIP_CONFIGS['CH'] = SHIP_CONFIGS['HEAVY_CRUISER'];
SHIP_CONFIGS['CVE'] = SHIP_CONFIGS['ESCORT_CARRIER'];
SHIP_CONFIGS['BC'] = SHIP_CONFIGS['BATTLECRUISER'];
SHIP_CONFIGS['BB'] = SHIP_CONFIGS['BATTLESHIP'];
SHIP_CONFIGS['DN'] = SHIP_CONFIGS['DREADNOUGHT'];
SHIP_CONFIGS['MN'] = SHIP_CONFIGS['MINER'];
SHIP_CONFIGS['COL'] = SHIP_CONFIGS['COLLIER'];
SHIP_CONFIGS['TNK'] = SHIP_CONFIGS['TANKER'];
SHIP_CONFIGS['REP'] = SHIP_CONFIGS['REPAIR'];
SHIP_CONFIGS['REP_SHIP'] = SHIP_CONFIGS['REPAIR'];
SHIP_CONFIGS['SALVAGER'] = SHIP_CONFIGS['SCRAP'];
SHIP_CONFIGS['SCP'] = SHIP_CONFIGS['SCRAP'];
SHIP_CONFIGS['CV'] = SHIP_CONFIGS['CARRIER'];
SHIP_CONFIGS['CVF'] = SHIP_CONFIGS['SUPER_CARRIER'];
SHIP_CONFIGS['CS'] = SHIP_CONFIGS['CITY_SHIP'];
SHIP_CONFIGS['L-WS'] = SHIP_CONFIGS['LIAAL_LIGHT'];
SHIP_CONFIGS['L_WS'] = SHIP_CONFIGS['LIAAL_LIGHT'];
SHIP_CONFIGS['M-WS'] = SHIP_CONFIGS['LIAAL_MEDIUM'];
SHIP_CONFIGS['M_WS'] = SHIP_CONFIGS['LIAAL_MEDIUM'];
SHIP_CONFIGS['H-WS'] = SHIP_CONFIGS['LIAAL_HEAVY'];
SHIP_CONFIGS['H_WS'] = SHIP_CONFIGS['LIAAL_HEAVY'];

export interface ResearchState {
  unlockedHulls: Set<string>;
}

export const defaultResearchState: ResearchState = {
  unlockedHulls: new Set([
    'FRIGATE', 'FG',
    'MINER', 'MN',
  ]),
};

/**
 * Resolves effective ship resource and strategic costs accounting for faction doctrines.
 * For Kovak:
 * - 50% Metallic & Organic costs
 * - 50% build ticks (mass production)
 * - 50% strategic material (Neridium) rounded to nearest whole unit, with frigates using at least 1.
 */
export function getEffectiveShipCost(
  spec: ShipyardBuildSpec,
  factionId?: string
): { costM: number; costO: number; neridiumCost: number; buildTicks: number } {
  if (factionId === 'KOVAK') {
    const isFrigate = spec.code === 'FG' || spec.role === 'FRIGATE';
    let neridiumCost = 0;
    if (spec.neridiumCost > 0) {
      neridiumCost = Math.round(spec.neridiumCost * 0.50);
      if (isFrigate) neridiumCost = Math.max(1, neridiumCost);
    } else if (isFrigate) {
      neridiumCost = 1; // Frigates still use 1 strategic material for Kovak
    }
    return {
      costM: Math.round(spec.costM * 0.50),
      costO: Math.round(spec.costO * 0.50),
      neridiumCost,
      buildTicks: Math.max(1, Math.round(spec.buildTicks * 0.50)),
    };
  }

  return {
    costM: spec.costM,
    costO: spec.costO,
    neridiumCost: spec.neridiumCost,
    buildTicks: spec.buildTicks,
  };
}

export interface RejectionDiagnosticItem {
  code: string;
  label: string;
  detail: string;
}

export interface BuildValidationResult {
  valid: boolean;
  spec?: ShipyardBuildSpec;
  effectiveCost?: { costM: number; costO: number; neridiumCost: number; buildTicks: number };
  rejectionCode?:
    | 'FACILITY_OFFLINE'
    | 'FACILITY_UNDER_CONSTRUCTION'
    | 'FACILITY_INCAPABLE'
    | 'INSUFFICIENT_METALLIC'
    | 'INSUFFICIENT_ORGANIC'
    | 'INSUFFICIENT_NERIDIUM'
    | 'INSUFFICIENT_RESOURCES'
    | 'TECH_LOCKED';
  rejectionReason?: string;
  rejectionItems: RejectionDiagnosticItem[];
  metallicDeficit: number;
  organicDeficit: number;
  neridiumDeficit: number;
  canAfford: boolean;
  tierCapable: boolean;
  isUnlocked: boolean;
}

/**
 * Validates whether a station or shipyard can build a specific ship class.
 * Returns detailed diagnostic errors for tactical tooltip rendering.
 */
export function validateShipBuild(
  station: ShipEntity | null | undefined,
  shipClass: string,
  hqStock: { metallic: number; organic: number; neridium?: number } | null | undefined,
  researchState: ResearchState = defaultResearchState,
  factionId?: string
): BuildValidationResult {
  const normKey = String(shipClass || '').toUpperCase().replace(/\s+/g, '_');
  const spec = SHIP_CONFIGS[normKey] || (shipClass ? SHIP_CONFIGS[shipClass] : undefined);

  const items: RejectionDiagnosticItem[] = [];

  if (!spec) {
    return {
      valid: false,
      rejectionCode: 'TECH_LOCKED',
      rejectionReason: `Unknown hull specification: ${shipClass}`,
      rejectionItems: [{ code: 'ERR_UNKNOWN_HULL', label: 'INVALID SPEC', detail: `Hull class ${shipClass} is not recognized by naval architecture.` }],
      metallicDeficit: 0,
      organicDeficit: 0,
      neridiumDeficit: 0,
      canAfford: false,
      tierCapable: false,
      isUnlocked: false,
    };
  }

  const effectiveCost = getEffectiveShipCost(spec, factionId || (station as any)?.factionId);

  // 1. Tech Unlock validation
  const isUnlocked = isHullUnlocked(normKey, researchState.unlockedHulls) ||
    isHullUnlocked(spec.code, researchState.unlockedHulls) ||
    researchState.unlockedHulls.has(spec.role) ||
    researchState.unlockedHulls.has(spec.code) ||
    researchState.unlockedHulls.has(normKey) ||
    (spec.techPrereqId ? researchState.unlockedHulls.has(spec.techPrereqId) : false);

  if (!isUnlocked) {
    const techName =
      spec.code === 'DD'
        ? 'Tier 1 Military Research: [Destroyer Hull Authorization]'
        : spec.code === 'CL'
        ? 'Tier 2 Military Research: [Light Cruiser Frame Certification]'
        : spec.code === 'CH'
        ? 'Tier 4 Military Research: [Heavy Cruiser Structural Validation]'
        : spec.code === 'BC'
        ? 'Tier 6 Military Research: [Battlecruiser Line Clearance]'
        : spec.code === 'BB'
        ? 'Tier 8 Military Research: [Battleship Armor Citadel Blueprint]'
        : spec.code === 'DN'
        ? 'Tier 10 Military Research: [Dreadnought Strategic Protocol]'
        : 'Military Research lab authorization';

    items.push({
      code: 'ERR_TECH_LOCKED',
      label: 'BLUEPRINT CLASSIFIED',
      detail: `${spec.name} [${spec.code}] requires ${techName}.`,
    });
  }

  // 2. Station presence & operational state
  if (!station) {
    items.push({
      code: 'ERR_NO_FACILITY',
      label: 'NO FACILITY SELECTED',
      detail: 'Select an operational HQ or orbital shipyard gantry to initiate fabrication.',
    });
  } else {
    if (station.isUnderConstruction) {
      items.push({
        code: 'ERR_FACILITY_UNDER_CONSTRUCTION',
        label: 'GANTRY UNDER CONSTRUCTION',
        detail: `${station.name} framework is undergoing nanite scaffold assembly. Cannot fabricate.`,
      });
    }
    if (station.hullState === 'DESTROYED') {
      items.push({
        code: 'ERR_FACILITY_DESTROYED',
        label: 'FACILITY DESTROYED',
        detail: `${station.name} has suffered critical structural catastrophic failure.`,
      });
    }

    // 3. Shipyard Tier Capability validation
    const sRole = station.role;
    const sType = (station as any).structureType;
    const isHQ = sRole === 'HQ' || (station as any).type === 'HQ_INTEGRATED';

    const isLightYard = sRole === 'SY_LIGHT' || sType === 'SY_LIGHT';
    const isMediumYard = sRole === 'SY_MEDIUM' || sType === 'SY_MEDIUM';

    const mediumHulls = ['CH', 'BC', 'CVE', 'REP_SHIP', 'REPAIR', 'REP', 'COLLIER', 'COL', 'TANKER', 'TNK', 'SALVAGER', 'SCRAP', 'SCP', 'HEAVY_CRUISER', 'BATTLECRUISER', 'ESCORT_CARRIER', 'M-WS', 'M_WS', 'LIAAL_MEDIUM'];
    const heavyHulls = ['BB', 'DN', 'CV', 'CVF', 'CS', 'CITY_SHIP', 'BATTLESHIP', 'DREADNOUGHT', 'CARRIER', 'SUPER_CARRIER', 'H-WS', 'H_WS', 'LIAAL_HEAVY'];

    const targetCode = (spec.code || '').toUpperCase();
    const targetRole = (spec.role || '').toUpperCase();

    const isTargetMedium = mediumHulls.includes(targetCode) || mediumHulls.includes(targetRole);
    const isTargetHeavy = heavyHulls.includes(targetCode) || heavyHulls.includes(targetRole);

    if (isHQ) {
      if (!['FG', 'DD', 'MINER', 'MN', 'FRIGATE', 'DESTROYER', 'L-WS', 'L_WS', 'LIAAL_LIGHT'].includes(targetCode) && !['FG', 'DD', 'MINER', 'MN', 'FRIGATE', 'DESTROYER', 'L-WS', 'L_WS', 'LIAAL_LIGHT'].includes(targetRole)) {
        items.push({
          code: 'ERR_FACILITY_INCAPABLE',
          label: 'GANTRY SCALE RESTRICTION',
          detail: `HQ Integrated Forge is limited to Escorts (FG, DD) and Autonomous Miners (MN). Cruisers and Capitals require a Dedicated Orbital Shipyard gantry.`,
        });
      }
    } else if (isLightYard) {
      if (isTargetMedium) {
        items.push({
          code: 'ERR_LIGHT_YARD_CAPACITY',
          label: 'INCAPABLE SLIPWAY',
          detail: 'UNBUILDABLE: REQUIRES MEDIUM OR HEAVY SHIPYARD SLIPWAY',
        });
      } else if (isTargetHeavy) {
        items.push({
          code: 'ERR_LIGHT_YARD_CAPACITY',
          label: 'INCAPABLE SLIPWAY',
          detail: 'UNBUILDABLE: REQUIRES HEAVY SHIPYARD SLIPWAY',
        });
      }
    } else if (isMediumYard) {
      if (isTargetHeavy) {
        items.push({
          code: 'ERR_MEDIUM_YARD_CAPACITY',
          label: 'INCAPABLE SLIPWAY',
          detail: 'UNBUILDABLE: REQUIRES HEAVY SHIPYARD SLIPWAY',
        });
      }
    }
  }

  // 4. Resource validation
  const curMet = hqStock?.metallic ?? 0;
  const curOrg = hqStock?.organic ?? 0;
  const curNer = hqStock?.neridium ?? 0;
  const metDeficit = Math.max(0, effectiveCost.costM - curMet);
  const orgDeficit = Math.max(0, effectiveCost.costO - curOrg);
  const nerDeficit = Math.max(0, effectiveCost.neridiumCost - curNer);

  if (metDeficit > 0) {
    items.push({
      code: 'ERR_METALLIC_SHORTFALL',
      label: 'INSUFFICIENT METALLIC',
      detail: `Deficit: -${Math.round(metDeficit).toLocaleString()} Refined Metallic (Required: ${effectiveCost.costM.toLocaleString()}, Silo: ${Math.round(curMet).toLocaleString()})`,
    });
  }

  if (orgDeficit > 0) {
    items.push({
      code: 'ERR_ORGANIC_SHORTFALL',
      label: 'INSUFFICIENT ORGANIC',
      detail: `Deficit: -${Math.round(orgDeficit).toLocaleString()} Organic Polymers (Required: ${effectiveCost.costO.toLocaleString()}, Silo: ${Math.round(curOrg).toLocaleString()})`,
    });
  }

  if (nerDeficit > 0) {
    items.push({
      code: 'ERR_NERIDIUM_SHORTFALL',
      label: 'INSUFFICIENT NERIDIUM',
      detail: `Deficit: -${Math.round(nerDeficit)} Neridium (Required: ${effectiveCost.neridiumCost}, Available: ${Math.round(curNer)})`,
    });
  }

  const valid = items.length === 0;
  const canAfford = metDeficit === 0 && orgDeficit === 0 && nerDeficit === 0;
  const tierCapable = !items.some((i) => i.code.includes('FACILITY') || i.code.includes('GANTRY') || i.code.includes('YARD'));

  let rejectionCode: BuildValidationResult['rejectionCode'] = undefined;
  if (!valid) {
    if (items.some((i) => i.code === 'ERR_TECH_LOCKED')) rejectionCode = 'TECH_LOCKED';
    else if (items.some((i) => i.code === 'ERR_FACILITY_DESTROYED')) rejectionCode = 'FACILITY_OFFLINE';
    else if (items.some((i) => i.code === 'ERR_FACILITY_UNDER_CONSTRUCTION')) rejectionCode = 'FACILITY_UNDER_CONSTRUCTION';
    else if (!tierCapable) rejectionCode = 'FACILITY_INCAPABLE';
    else if (nerDeficit > 0) rejectionCode = 'INSUFFICIENT_NERIDIUM';
    else if (metDeficit > 0 && orgDeficit > 0) rejectionCode = 'INSUFFICIENT_RESOURCES';
    else if (metDeficit > 0) rejectionCode = 'INSUFFICIENT_METALLIC';
    else if (orgDeficit > 0) rejectionCode = 'INSUFFICIENT_ORGANIC';
  }

  const tierErrorItem = items.find((i) => i.code.includes('YARD') || i.code.includes('GANTRY') || i.code.includes('FACILITY_INCAPABLE'));

  return {
    valid,
    spec,
    effectiveCost,
    rejectionCode,
    rejectionReason: tierErrorItem ? tierErrorItem.detail : (items.length > 0 ? items[0].detail : undefined),
    rejectionItems: items,
    metallicDeficit: metDeficit,
    organicDeficit: orgDeficit,
    neridiumDeficit: nerDeficit,
    canAfford,
    tierCapable,
    isUnlocked,
  };
}

/**
 * Validates whether a shipyard structure can queue a ship hull under the state.
 */
export function canQueueShip(
  shipClass: string,
  shipyard: StructureEntity | ShipEntity,
  state: GameState | any,
  commissionerFaction?: string,
  proxyFaction?: string
): { success: boolean; code?: string; reason?: string } {
  const normKey = String(shipClass || '').toUpperCase().replace(/\s+/g, '_');
  const spec = SHIP_CONFIGS[normKey] || (shipClass ? SHIP_CONFIGS[shipClass] : undefined);
  if (!spec) return { success: false, code: 'UNKNOWN_HULL', reason: `Unknown hull specification: ${shipClass}` };

  // Proxy build permission check on shipyard
  const yardOwnerFaction = (shipyard as any)?.factionId || (state as any)?.playerFaction || 'NOVAN';
  const isProxyOrder = Boolean(proxyFaction || (commissionerFaction && commissionerFaction !== yardOwnerFaction));
  if (isProxyOrder && (shipyard as any).allowProxyBuild === false) {
    return {
      success: false,
      code: 'PROXY_BUILD_DISABLED',
      reason: `Proxy construction is toggled OFF at ${shipyard.name || 'this shipyard'} by sovereign command.`
    };
  }

  // 1. Tech Prerequisite Check
  const ownerFaction = proxyFaction || commissionerFaction || (state as any)?.playerFaction || (state as any)?.factionId || (shipyard as any)?.factionId || 'NOVAN';
  if ((normKey.includes('CARRIER') || spec.code === 'CV' || spec.role === 'CARRIER') && ownerFaction !== 'NOVAN') {
    return { success: false, code: 'FACTION_RESTRICTED', reason: 'UNSUPPORTED SHIP CHASSIS FOR CURRENT EMPIRE' };
  }

  const unlockedTechs = state.unlockedTechs || (state.researchManager?.completedNodes);
  const isUnlocked = isHullUnlocked(normKey, unlockedTechs, ownerFaction) ||
    isHullUnlocked(spec.code, unlockedTechs, ownerFaction) ||
    (!spec.techPrereqId) ||
    (unlockedTechs instanceof Set ? unlockedTechs.has(spec.techPrereqId) : Array.isArray(unlockedTechs) ? unlockedTechs.includes(spec.techPrereqId) : false);

  if (!isUnlocked) {
    return { success: false, code: 'TECH_LOCKED', reason: `Tech prerequisite locked for ${spec.name}` };
  }

  // 2. Slipway Hull Support Check
  const yardType = ((shipyard as any).subType || (shipyard as any).structureType || (shipyard as any).role || (shipyard as any).type || '') as string;
  const allowedHulls: readonly string[] = (SHIPYARD_CAPABILITIES as Record<string, readonly string[]>)[yardType] ||
                       (yardType === 'HQ' ? ['FG', 'FRIGATE', 'DD', 'DESTROYER', 'MINER', 'MN', 'LIAAL_LIGHT', 'L_WS', 'L-WS'] : []);
  if (!allowedHulls || (!allowedHulls.includes(normKey) && !allowedHulls.includes(shipClass) && !allowedHulls.includes(spec.code) && !allowedHulls.includes(spec.role))) {
    return { success: false, code: 'INCOMPATIBLE_SLIPWAY', reason: `Shipyard slipway ${yardType} cannot fabricate ${shipClass}` };
  }

  const effectiveCost = getEffectiveShipCost(spec, ownerFaction);

  // 3. Resource Check
  const stockpiles = state.hqStockpiles || getHQStockpiles(state);
  if (!stockpiles || stockpiles.metallic < effectiveCost.costM || stockpiles.organic < effectiveCost.costO) {
    return { success: false, code: 'INSUFFICIENT_MATERIALS', reason: 'Insufficient materials in HQ stockpile' };
  }

  if (effectiveCost.neridiumCost > 0) {
    const curNer = (stockpiles as any).neridium ?? state.resources?.neridium ?? 0;
    if (curNer < effectiveCost.neridiumCost) {
      return { success: false, code: 'INSUFFICIENT_NERIDIUM', reason: `Insufficient Neridium (${curNer}/${effectiveCost.neridiumCost})` };
    }
  }

  return { success: true };
}

/**
 * Queues ship production at the shipyard with atomic resource deduction.
 */
export function queueProduction(
  shipClass: string,
  shipyard: StructureEntity | ShipEntity,
  state: GameState | any,
  commissionerFaction?: string,
  proxyFaction?: string
): { success: boolean; error?: string } {
  const validation = canQueueShip(shipClass, shipyard, state, commissionerFaction, proxyFaction);
  if (!validation.success) {
    return { success: false, error: validation.reason || validation.code };
  }

  const normKey = String(shipClass || '').toUpperCase().replace(/\s+/g, '_');
  const spec = SHIP_CONFIGS[normKey] || (shipClass ? SHIP_CONFIGS[shipClass]! : undefined)!;
  const effectiveFaction = proxyFaction || commissionerFaction || (state as any)?.playerFaction || (state as any)?.factionId || (shipyard as any)?.factionId || 'NOVAN';
  const effectiveCost = getEffectiveShipCost(spec, effectiveFaction);

  const stockpiles = state.hqStockpiles || getHQStockpiles(state);
  if (stockpiles) {
    stockpiles.metallic = Math.max(0, stockpiles.metallic - effectiveCost.costM);
    stockpiles.organic = Math.max(0, stockpiles.organic - effectiveCost.costO);
    if (effectiveCost.neridiumCost > 0) {
      if ((stockpiles as any).neridium !== undefined) {
        (stockpiles as any).neridium = Math.max(0, (stockpiles as any).neridium - effectiveCost.neridiumCost);
      }
      if (state.resources?.neridium !== undefined) {
        state.resources.neridium = Math.max(0, state.resources.neridium - effectiveCost.neridiumCost);
      }
    }
  }

  if (!shipyard.productionQueue) {
    shipyard.productionQueue = [];
  }

  const queueItem: ProductionQueueItem & { remainingTicks?: number; totalTicks?: number; shipClass?: string } = {
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitRole: spec.role,
    name: spec.name,
    code: spec.code,
    shipClass: spec.code,
    commissionerFaction: commissionerFaction as any,
    proxyFaction: proxyFaction as any,
    buildTimeTotal: effectiveCost.buildTicks,
    buildTimeRemaining: effectiveCost.buildTicks,
    costMetallic: effectiveCost.costM,
    costOrganic: effectiveCost.costO,
    costNeridium: effectiveCost.neridiumCost,
    remainingTicks: effectiveCost.buildTicks,
    totalTicks: effectiveCost.buildTicks,
  };

  shipyard.productionQueue.push(queueItem);

  if (typeof state.addLog === 'function') {
    state.addLog(
      'LOGISTICS',
      `🔨 [${spec.name}] queued at ${shipyard.name || 'Shipyard'}${proxyFaction ? ` (Proxy Commission for ${proxyFaction})` : ''}. Deducted ${effectiveCost.costM.toLocaleString()} M, ${effectiveCost.costO.toLocaleString()} O${effectiveCost.neridiumCost > 0 ? `, ${effectiveCost.neridiumCost} Neridium` : ''}.`,
      'info'
    );
  }

  return { success: true };
}

/**
 * Executes a verified build order at the specified station/shipyard.
 * Follows the 4 strict pipeline steps:
 * 1. Validate Tech Unlock
 * 2. Validate Shipyard Tier Capability
 * 3. Validate Resources
 * 4. Deduct and Enqueue
 */
export function handleBuildShip(
  station: ShipEntity,
  shipClass: string,
  getHQStockpiles: () => { metallic: number; organic: number; neridium?: number } | null,
  deductHQResources: (m: number, o: number, n?: number) => void,
  addLog?: (category: 'LOGISTICS' | 'TACTICAL' | 'RESOURCE', message: string, level?: 'info' | 'warn' | 'crit' | 'success') => void,
  researchState: ResearchState = defaultResearchState
): { success: boolean; error?: string } {
  const hqStock = getHQStockpiles();
  if (!hqStock) {
    addLog?.('LOGISTICS', 'Build order rejected: HQ Resource storage offline.', 'warn');
    return { success: false, error: 'HQ Resource storage offline' };
  }

  const validation = validateShipBuild(station, shipClass, hqStock, researchState);

  if (!validation.valid || !validation.spec) {
    const primaryError = validation.rejectionReason || 'Build order rejected by shipyard flight control.';
    addLog?.('LOGISTICS', `[DISPATCH REJECTED] ${primaryError}`, 'warn');
    return { success: false, error: primaryError };
  }

  const spec = validation.spec;

  // 4. Deduct and Enqueue
  deductHQResources(spec.costM, spec.costO, spec.neridiumCost);

  if (!station.productionQueue) {
    station.productionQueue = [];
  }

  const queueItem: ProductionQueueItem & { remainingTicks?: number; totalTicks?: number; shipClass?: string } = {
    id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitRole: spec.role,
    name: spec.name,
    code: spec.code,
    buildTimeTotal: spec.buildTicks,
    buildTimeRemaining: spec.buildTicks,
    costMetallic: spec.costM,
    costOrganic: spec.costO,
    costNeridium: spec.neridiumCost,
    remainingTicks: spec.buildTicks,
    totalTicks: spec.buildTicks,
    shipClass: spec.code,
  };

  station.productionQueue.push(queueItem);

  addLog?.(
    'LOGISTICS',
    `🔨 [${spec.name}] queued at ${station.name}. Deducted ${spec.costM.toLocaleString()} Metallic, ${spec.costO.toLocaleString()} Organic${spec.neridiumCost > 0 ? `, ${spec.neridiumCost} Neridium` : ''}.`,
    'info'
  );

  return { success: true };
}
