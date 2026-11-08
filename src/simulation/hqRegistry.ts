import { FactionId, HomeworldTypeId, HqTypeId, ShipEntity, RockyPlanet } from '../types';

export interface HomeworldTypeDefinition {
  id: HomeworldTypeId;
  name: string;
  defaultPlanetName: string;
  defaultFaction: FactionId;
  planetClass: HomeworldTypeId;
  baseColor: string;
  oceanColor?: string;
  atmosphereColor?: string;
  surfacePatternSeed: number;
  gravityRating: number;
  description: string;
  modifiersSummary: string;
  economyBonus: {
    metallic: number;
    organic: number;
  };
  specialEffect?: string;
}

export interface HqTypeDefinition {
  id: HqTypeId;
  name: string;
  defaultFaction: FactionId;
  classification: string;
  description: string;
  functionsDescription: string;

  // Dynamic Modifiers (NOT static constants)
  oreDropOffRange: number;       // Ore transfer perimeter in km
  missileLaunchers: number;      // Missile tube count
  totalMissileSalvo: number;     // Salvo volley size
  missilesMax: number;           // Total missile capacity
  counterMissilesMax: number;    // Point defense counter-missile capacity

  // Defenses
  hullMax: number;               // Hull hit points
  shieldHpMax: number;           // Shield capacity
  shieldRegen: number;           // Shield regeneration rate (HP/s)
  armorMitigation: number;       // Flat damage absorption ratio (0.0 to 1.0)
  pointDefenseLasers: number;    // Point defense laser turret count
  pdplaRange: number;            // Point defense laser range in km

  // Structural & Mobility Attributes
  radius: number;                // Collision & tactical reticle radius
  dockingRadius: number;         // Craft docking / resupply perimeter
  renderedLength?: number;       // Visual scale length
  isMobile: boolean;             // True if ship can navigate & jump
  isRingStructure: boolean;      // True for Garn ring
  isCityShip?: boolean;          // True for Yestiri city ship
  isGarnRing?: boolean;
  isGarnLongRange?: boolean;

  // Special abilities & multipliers
  refineryBonusMultiplier?: number;
  repairAuraRate?: number;
  storageMultiplier?: number;
  shipBuildTimeDiscount?: number;
  sensorRangeMultiplier?: number;
}

// -------------------------------------------------------------
// ALL 6 HOMEWORLD TYPES
// -------------------------------------------------------------
export const HOMEWORLD_REGISTRY: Record<HomeworldTypeId, HomeworldTypeDefinition> = {
  TERRAN: {
    id: 'TERRAN',
    name: 'Continental Terran Homeworld',
    defaultPlanetName: 'Novaria-Prime',
    defaultFaction: 'NOVAN',
    planetClass: 'TERRAN',
    baseColor: '#15803d',
    oceanColor: '#0284c7',
    atmosphereColor: 'rgba(56, 189, 248, 0.45)',
    surfacePatternSeed: 4041,
    gravityRating: 1.00,
    description: 'Temperate oceanic-continental biosphere with balanced nitrogen-oxygen atmosphere. Renowned for rapid crew recruitment and stable bio-support matrices.',
    modifiersSummary: '+20% Crew replenishment rate, balanced organic & metallic baseline.',
    economyBonus: { metallic: 1.0, organic: 1.15 },
    specialEffect: 'Balanced Biosphere'
  },
  DESERT: {
    id: 'DESERT',
    name: 'Arid Ferric Bastion Homeworld',
    defaultPlanetName: 'Garn-Khar',
    defaultFaction: 'GARN',
    planetClass: 'DESERT',
    baseColor: '#b45309',
    oceanColor: '#78350f',
    atmosphereColor: 'rgba(217, 119, 6, 0.35)',
    surfacePatternSeed: 8821,
    gravityRating: 1.18,
    description: 'Arid ferric badlands and deep tectonic canyons dense with heavy metallic ore veins. Fortified natural redoubts shelter colossal subterranean citadels.',
    modifiersSummary: '+30% Metallic ore extraction yield, hardened planetary surface defense.',
    economyBonus: { metallic: 1.35, organic: 0.80 },
    specialEffect: 'Dense Ferric Crust (+30% Metallic Yield)'
  },
  VOLCANIC: {
    id: 'VOLCANIC',
    name: 'Magma Crucible Homeworld',
    defaultPlanetName: 'Aldon-Vulkan',
    defaultFaction: 'ALDONAH',
    planetClass: 'VOLCANIC',
    baseColor: '#78350f',
    oceanColor: '#ea580c',
    atmosphereColor: 'rgba(234, 88, 12, 0.35)',
    surfacePatternSeed: 9142,
    gravityRating: 1.25,
    description: 'Hyperactive volcanic super-earth crisscrossed by magma trenches and basalt mantles. Extreme geothermal reserves fuel superheated orbital foundry complexes.',
    modifiersSummary: '+35% Heavy alloy refinement throughput, +20% thermal plating durability.',
    economyBonus: { metallic: 1.40, organic: 0.70 },
    specialEffect: 'Geothermal Foundry Core (+35% Smelting Speed)'
  },
  ICE: {
    id: 'ICE',
    name: 'Glacial Cryo Homeworld',
    defaultPlanetName: 'Kryos-Prime',
    defaultFaction: 'YESTIRI',
    planetClass: 'ICE',
    baseColor: '#0e7490',
    oceanColor: '#0369a1',
    atmosphereColor: 'rgba(103, 232, 249, 0.45)',
    surfacePatternSeed: 3317,
    gravityRating: 0.82,
    description: 'Sub-zero cryo-crust concealing boundless subterranean oceans. The premier source of cryo-volatiles, liquid hydrogen, and deuterium fuel.',
    modifiersSummary: '+40% Hydrogen / propellant distillation, pristine thermal sensor clarity.',
    economyBonus: { metallic: 0.90, organic: 1.25 },
    specialEffect: 'Cryo-Volatile Abundance (+40% Propellant Synthesis)'
  },
  OCEANIC: {
    id: 'OCEANIC',
    name: 'Pelagic Abyss Homeworld',
    defaultPlanetName: 'Liaal-Thalassa',
    defaultFaction: 'LIAAL',
    planetClass: 'OCEANIC',
    baseColor: '#0369a1',
    oceanColor: '#0284c7',
    atmosphereColor: 'rgba(56, 189, 248, 0.50)',
    surfacePatternSeed: 5543,
    gravityRating: 0.95,
    description: 'Vast oceanic expanse sheltering floating bio-agricultural rings and kelp synthesis gardens. Provides immense reserves of organic biopolymers.',
    modifiersSummary: '+50% Organic polymer harvest rate, accelerated terraforming and colony growth.',
    economyBonus: { metallic: 0.80, organic: 1.50 },
    specialEffect: 'Pelagic Kelp Bio-Harvesters (+50% Organic Yield)'
  },
  BARREN: {
    id: 'BARREN',
    name: 'Basalt Regolith Homeworld',
    defaultPlanetName: 'Kovak-Null',
    defaultFaction: 'KOVAK',
    planetClass: 'BARREN',
    baseColor: '#475569',
    oceanColor: undefined,
    atmosphereColor: undefined,
    surfacePatternSeed: 1209,
    gravityRating: 0.70,
    description: 'Airless basalt moonscape riddled with hollowed lava tubes and subterranean fabrication hives. Low gravity facilitates cheap, rapid excavation.',
    modifiersSummary: '-25% Structure construction time and alloy cost, high-velocity mass manufacturing.',
    economyBonus: { metallic: 1.15, organic: 0.90 },
    specialEffect: 'Subterranean Excavation (-25% Structure Cost)'
  }
};

export const ALL_HOMEWORLD_TYPES: HomeworldTypeId[] = [
  'TERRAN',
  'DESERT',
  'VOLCANIC',
  'ICE',
  'OCEANIC',
  'BARREN'
];

// -------------------------------------------------------------
// ALL 6 HQ TYPES (WITH DYNAMIC MODIFIERS)
// -------------------------------------------------------------

/**
 * Computes canonical geometric and functional dimensions for the Garn Ring Citadel
 * as a function of the host planet's radius.
 */
export function getGarnRingDimensions(planetRadius: number = 700) {
  const ringInnerRadius = planetRadius * 1.40;
  const ringOuterRadius = planetRadius * 1.68;
  const ringMidRadius = (ringInnerRadius + ringOuterRadius) * 0.5;
  const ringThickness = ringOuterRadius - ringInnerRadius;
  // Ore transfer space sits as a FUNCTION of the size of the HQ (250km outside the outer visual edge)
  const oreTransferRange = ringOuterRadius + 250.0;
  const dockingRadius = ringOuterRadius + 40.0;
  const selectionRadius = ringOuterRadius + 30.0;
  const pdplaRange = 600.0; // Point-defense laser umbrella extends 600km beyond outer ring
  const counterMissileRange = 1200.0; // Counter-missile envelope extends 1200km beyond outer ring

  return {
    ringInnerRadius,
    ringOuterRadius,
    ringMidRadius,
    ringThickness,
    oreTransferRange,
    dockingRadius,
    selectionRadius,
    pdplaRange,
    counterMissileRange,
  };
}

export const HQ_REGISTRY: Record<HqTypeId, HqTypeDefinition> = {
  NOVAN_COMMAND_SPIRE: {
    id: 'NOVAN_COMMAND_SPIRE',
    name: 'Novan Command Spire [HQ]',
    defaultFaction: 'NOVAN',
    classification: 'Precision Tactical Command Spire',
    description: 'High-tech orbital command fortress featuring advanced quantum telemetry, precision tractor docking berths, and cycling shield emitters.',
    functionsDescription: 'Quantum Comms Array (+50% radar detection envelope), balanced cycling deflector shields, 850km tractor drop-off.',
    oreDropOffRange: 850.0,
    missileLaunchers: 20,
    totalMissileSalvo: 20,
    missilesMax: 2000,
    counterMissilesMax: 300,
    hullMax: 15000.0,
    shieldHpMax: 10000.0,
    shieldRegen: 45.0,
    armorMitigation: 0.15,
    pointDefenseLasers: 12,
    pdplaRange: 1800.0,
    radius: 90.0,
    dockingRadius: 170.0,
    isMobile: false,
    isRingStructure: false,
    sensorRangeMultiplier: 1.50
  },
  GARN_RING_CITADEL: {
    id: 'GARN_RING_CITADEL',
    name: 'Garn Ring Citadel [HQ]',
    defaultFaction: 'GARN',
    classification: 'Colossal Megastructure Ring Fortress',
    description: 'Massive annular ring fortress encircling the homeworld. Ore transfer space sits as a direct function of ring size (+250km outside outer visual edge).',
    functionsDescription: 'Annular Ring Citadel: Ore transfer space scales to ring size (+250km outside outer visual edge), 48 VLS missile tubes with infinite theater defense, ring-perimeter point-defense umbrella, and 35% heavy armor mitigation.',
    oreDropOffRange: 1426.0, // Scaled dynamically to host planet (ringOuterR + 250km)
    missileLaunchers: 48,
    totalMissileSalvo: 48,
    missilesMax: 5000,
    counterMissilesMax: 800,
    hullMax: 35000.0,
    shieldHpMax: 12000.0,
    shieldRegen: 30.0,
    armorMitigation: 0.35,
    pointDefenseLasers: 24,
    pdplaRange: 600.0, // Extends 600km beyond outer ring
    radius: 1176.0,
    dockingRadius: 1216.0,
    renderedLength: 2352.0,
    isMobile: false,
    isRingStructure: true,
    isGarnRing: true,
    isGarnLongRange: true
  },
  ALDONAH_FORGE_CITADEL: {
    id: 'ALDONAH_FORGE_CITADEL',
    name: 'Aldonah Star Fort Citadel [HQ]',
    defaultFaction: 'ALDONAH',
    classification: 'Colonial Star Fortress & Heavy Super-Foundry',
    description: 'Monumental colonial-era star fortress citadel slowly rotating in geostationary orbit over the volcanic homeworld, featuring massive slab-masonry bastions, detached ravelin outworks, superheated smelting crucibles, and 16 heavy siege batteries.',
    functionsDescription: 'Colonial Star Fortress (+50% ore conversion throughput, 16 heavy missile/kinetic batteries, automated repair aura 25 HP/s, 1,400km ore vacuum-hopper chutes, massive bastion armor).',
    oreDropOffRange: 1400.0,
    missileLaunchers: 20,
    totalMissileSalvo: 20,
    missilesMax: 2000,
    counterMissilesMax: 350,
    hullMax: 32000.0,
    shieldHpMax: 10000.0,
    shieldRegen: 28.0,
    armorMitigation: 0.35,
    pointDefenseLasers: 12,
    pdplaRange: 1800.0,
    radius: 175.0,
    dockingRadius: 280.0,
    renderedLength: 350.0,
    isMobile: false,
    isRingStructure: false,
    refineryBonusMultiplier: 1.50,
    repairAuraRate: 25.0
  },
  YESTIRI_CITY_SHIP: {
    id: 'YESTIRI_CITY_SHIP',
    name: 'Yestiri City Ship Citadel [HQ]',
    defaultFaction: 'YESTIRI',
    classification: 'Mobile Nomadic Apex City-Ship',
    description: 'Self-contained mobile civilization flagship capable of independent sublight transit, hyper-jump operations, and mounting mobile modular research laboratories.',
    functionsDescription: 'Mobile Flagship (Sublight & jump-drive propulsion, mounts 3 mobile research modules, 18,000 HP resonant shields, moves ore drop-off with fleet).',
    oreDropOffRange: 750.0,
    missileLaunchers: 24,
    totalMissileSalvo: 24,
    missilesMax: 2500,
    counterMissilesMax: 400,
    hullMax: 12000.0,
    shieldHpMax: 18000.0,
    shieldRegen: 80.0,
    armorMitigation: 0.10,
    pointDefenseLasers: 14,
    pdplaRange: 2000.0,
    radius: 85.0,
    dockingRadius: 160.0,
    isMobile: true,
    isRingStructure: false,
    isCityShip: true
  },
  LIAAL_AGRO_CITADEL: {
    id: 'LIAAL_AGRO_CITADEL',
    name: 'Liaal Agro-Crucible Citadel [HQ]',
    defaultFaction: 'LIAAL',
    classification: 'Deep-Space Agronomy & Swarm Silo Spire',
    description: 'Expansive biodome logistics hub boasting sprawling cargo drone intake funnels and an overwhelming 60-tube swarm missile battery with 2.5x resource silos.',
    functionsDescription: 'Swarm Missile Saturation (60 VLS missile tubes, 1,600km drone cargo intake, 2.5x resource storage capacity, 800 counter-missiles).',
    oreDropOffRange: 1600.0,
    missileLaunchers: 60,
    totalMissileSalvo: 60,
    missilesMax: 6000,
    counterMissilesMax: 800,
    hullMax: 10000.0,
    shieldHpMax: 7000.0,
    shieldRegen: 35.0,
    armorMitigation: 0.05,
    pointDefenseLasers: 16,
    pdplaRange: 2200.0,
    radius: 105.0,
    dockingRadius: 200.0,
    isMobile: false,
    isRingStructure: false,
    storageMultiplier: 2.50
  },
  KOVAK_SWARM_BASTION: {
    id: 'KOVAK_SWARM_BASTION',
    name: 'Kovak Rhomboid Swarm Bastion [HQ]',
    defaultFaction: 'KOVAK',
    classification: 'Angular Rhomboid Mass Fabricator',
    description: 'Angular geometric mass-production hive station built from rugged stamped alloys, engineered for high-throughput multi-vessel staging and rapid construction.',
    functionsDescription: 'Swarm Rapid Fabrication (-40% warship construction time, 32 rapid-cycling light missile tubes, multi-berth conveyor intake funnels).',
    oreDropOffRange: 1100.0,
    missileLaunchers: 32,
    totalMissileSalvo: 32,
    missilesMax: 3500,
    counterMissilesMax: 500,
    hullMax: 11000.0,
    shieldHpMax: 6000.0,
    shieldRegen: 20.0,
    armorMitigation: 0.10,
    pointDefenseLasers: 18,
    pdplaRange: 1650.0,
    radius: 95.0,
    dockingRadius: 180.0,
    isMobile: false,
    isRingStructure: false,
    shipBuildTimeDiscount: 0.40
  }
};

export const ALL_HQ_TYPES: HqTypeId[] = [
  'NOVAN_COMMAND_SPIRE',
  'GARN_RING_CITADEL',
  'ALDONAH_FORGE_CITADEL',
  'YESTIRI_CITY_SHIP',
  'LIAAL_AGRO_CITADEL',
  'KOVAK_SWARM_BASTION'
];

// -------------------------------------------------------------
// DEFAULT MAPPINGS PER FACTION
// -------------------------------------------------------------
export function getDefaultHomeworldForFaction(factionId: FactionId): HomeworldTypeId {
  switch (factionId) {
    case 'NOVAN': return 'TERRAN';
    case 'GARN': return 'DESERT';
    case 'ALDONAH': return 'VOLCANIC';
    case 'YESTIRI': return 'ICE';
    case 'LIAAL': return 'OCEANIC';
    case 'KOVAK': return 'BARREN';
    default: return 'TERRAN';
  }
}

export function getDefaultHQForFaction(factionId: FactionId): HqTypeId {
  switch (factionId) {
    case 'NOVAN': return 'NOVAN_COMMAND_SPIRE';
    case 'GARN': return 'GARN_RING_CITADEL';
    case 'ALDONAH': return 'ALDONAH_FORGE_CITADEL';
    case 'YESTIRI': return 'YESTIRI_CITY_SHIP';
    case 'LIAAL': return 'LIAAL_AGRO_CITADEL';
    case 'KOVAK': return 'KOVAK_SWARM_BASTION';
    default: return 'NOVAN_COMMAND_SPIRE';
  }
}

// -------------------------------------------------------------
// APPLICATION HELPERS
// -------------------------------------------------------------
export function applyHomeworldTypeToPlanet(
  planet: RockyPlanet | any,
  homeworldTypeId: HomeworldTypeId
): void {
  const def = HOMEWORLD_REGISTRY[homeworldTypeId];
  if (!def || !planet) return;

  planet.planetClass = def.planetClass;
  planet.planetType = def.planetClass;
  planet.name = def.defaultPlanetName;
  planet.baseColor = def.baseColor;
  planet.oceanColor = def.oceanColor;
  planet.atmosphereColor = def.atmosphereColor;
  planet.surfacePatternSeed = def.surfacePatternSeed;
  planet.gravityRating = def.gravityRating;
  planet.habitable = true;
  planet.isHabitable = true;
  planet.isPrimaryHabitable = true;
  planet.isHomeworld = true;
  planet.hasHQ = true;
  planet.colonized = true;
  planet.colonyGovernance = true;
}

export function applyHQDefinitionToShip(
  ship: ShipEntity,
  hqTypeId: HqTypeId,
  factionId: FactionId = 'NOVAN',
  hostPlanet?: RockyPlanet | null
): void {
  const def = HQ_REGISTRY[hqTypeId];
  if (!def) return;

  ship.role = 'HQ';
  ship.hqType = hqTypeId;
  ship.name = def.name;
  ship.factionId = factionId;
  ship.oreDropOffRange = def.oreDropOffRange;
  ship.missileTubes = def.missileLaunchers;
  ship.totalMissileSalvo = def.totalMissileSalvo;
  ship.missiles = def.missilesMax;
  ship.missilesMax = def.missilesMax;
  ship.counterMissiles = def.counterMissilesMax;
  ship.counterMissilesMax = def.counterMissilesMax;
  ship.hullMax = def.hullMax;
  ship.hullHp = def.hullMax;
  ship.maxRepairableHull = def.hullMax;
  ship.crippleBarMax = def.hullMax * 0.80;
  ship.crippleBar = ship.crippleBarMax;
  ship.shieldHpMax = def.shieldHpMax;
  ship.shieldHp = def.shieldHpMax;
  ship.shieldRegen = def.shieldRegen;
  ship.armorMitigation = def.armorMitigation;
  ship.pointDefenseLasers = def.pointDefenseLasers;
  ship.pdplaRange = def.pdplaRange;
  ship.radius = def.radius;
  ship.dockingRadius = def.dockingRadius;
  ship.selectionRadius = Math.max(def.dockingRadius, def.radius * 1.25);
  if (def.renderedLength) ship.renderedLength = def.renderedLength;

  ship.isRingStructure = Boolean(def.isRingStructure);
  ship.isGarnRing = Boolean(def.isGarnRing);
  ship.isGarnLongRange = Boolean(def.isGarnLongRange);
  ship.isCityShip = Boolean(def.isCityShip);
  ship.isYestiriRing = Boolean(def.isCityShip);
  ship.isMobile = Boolean(def.isMobile);

  // If this is an annular megastructure (e.g. Garn Ring Citadel), scale dimensions to host planet
  if (def.isRingStructure || hqTypeId === 'GARN_RING_CITADEL' || ship.isGarnRing) {
    const planetR = hostPlanet?.radius ?? (ship.radius ? Math.round(ship.radius / 1.68) : 700);
    const ringDims = getGarnRingDimensions(planetR);
    ship.ringInnerRadius = ringDims.ringInnerRadius;
    ship.ringOuterRadius = ringDims.ringOuterRadius;
    ship.radius = ringDims.ringOuterRadius;
    ship.renderedLength = ringDims.ringOuterRadius * 2.0;
    ship.dockingRadius = ringDims.dockingRadius;
    ship.oreDropOffRange = ringDims.oreTransferRange;
    ship.selectionRadius = ringDims.selectionRadius;
    ship.pdplaRange = ringDims.pdplaRange;
    ship.counterMissileRange = ringDims.counterMissileRange;
  }

  if (def.isMobile) {
    ship.isStationary = false;
    ship.maxSpeed = 420.0;
    ship.cruiseSpeed = 280.0;
    ship.acceleration = 60.0;
    ship.angularSlewRate = 5.0;
    ship.h2Fuel = 10000.0;
    ship.h2FuelMax = 10000.0;
    ship.mountedResearchModules = ship.mountedResearchModules || [];
    ship.maxMountedModules = 3;
  } else {
    ship.isStationary = true;
    ship.maxSpeed = 0;
    ship.cruiseSpeed = 0;
    ship.velocity = { x: 0, y: 0 };
  }

  // Set up storage silos according to storage multiplier
  const mult = def.storageMultiplier || 1.0;
  if (!ship.resources) {
    ship.resources = {
      ore: 0,
      maxOre: Math.round(16000 * mult),
      metallic: 5000,
      maxMetallic: Math.round(100000 * mult),
      organic: 5000,
      maxOrganic: Math.round(100000 * mult),
    };
  } else {
    ship.resources.maxOre = Math.round(16000 * mult);
    ship.resources.maxMetallic = Math.round(100000 * mult);
    ship.resources.maxOrganic = Math.round(100000 * mult);
  }
}
