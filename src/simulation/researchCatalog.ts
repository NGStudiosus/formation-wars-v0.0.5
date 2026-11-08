import { StructureType } from '../types';

export type ResearchBranch = 'MILITARY' | 'CIVILIAN' | 'EXPANSION' | 'HEADQUARTERS';

export interface TechNodeDefinition {
  id: string;
  branch: ResearchBranch;
  tier: number; // 1 to 10
  name: string;
  code: string;
  description: string;
  effects: string;
  costMetallic: number;
  costOrganic: number;
  totalTicks: number; // 300 ticks = 10.0s at 30Hz
  costM?: number;
  costO?: number;
  researchTicks?: number;
  prereqs?: string[];
  slot?: number; // 0 to 3
}

export type TechNodeStatus =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'RESEARCHING'
  | 'PAUSED_LACKING_CAPACITY'
  | 'COMPLETED'
  | 'UNAVAILABLE'
  | 'QUEUED';

export interface ActiveResearchProject {
  nodeId: string;
  branch: ResearchBranch;
  tier: number;
  currentTicks: number;
  totalTicks: number;
  status: 'RESEARCHING' | 'PAUSED_LACKING_CAPACITY';
  costPaidM?: number;
  costPaidO?: number;
  costM?: number;
  costO?: number;
}

export interface ResearchBranchState {
  activeProject: ActiveResearchProject | null;
  completedNodeIds: string[];
}

export interface ResearchStationsCountSnapshot {
  military: number;
  civic: number;
  expansion: number;
}

export interface ResearchState {
  completedNodes: Set<string>;
  unlockedHulls: Set<string>;
  unlockedStructures: Set<string>;
}

/**
 * Static lookup table mapping warship hulls to their unlock research tech IDs
 */
export const HULL_UNLOCK_REQUIREMENTS: Record<string, string> = {
  DESTROYER: 'mil-t1',
  DD: 'mil-t1',
  LIGHT_CRUISER: 'mil-t2',
  CL: 'mil-t2',
  HEAVY_CRUISER: 'mil-t4',
  CH: 'mil-t4',
  BATTLECRUISER: 'mil-t6',
  BC: 'mil-t6',
  BATTLESHIP: 'mil-t8',
  BB: 'mil-t8',
  DREADNOUGHT: 'mil-t10',
  DN: 'mil-t10',
  CITY_SHIP: 'mil-t10',
  CS: 'mil-t10',
  LIAAL_LIGHT: 'mil-t1',
  'L-WS': 'mil-t1',
  LIAAL_MEDIUM: 'mil-t4',
  'M-WS': 'mil-t4',
  LIAAL_HEAVY: 'mil-t8',
  'H-WS': 'mil-t8',
};

/**
 * 120-Node Comprehensive Technology Matrix (Immutable, Frozen Catalog):
 * - 40 Military nodes (4 nodes per tier across 10 tiers)
 * - 40 Civilian nodes (4 nodes per tier across 10 tiers)
 * - 40 Expansion nodes (4 nodes per tier across 10 tiers)
 * Total: 120 nodes. Every node runs on the deterministic 10.0-second (300 ticks at 30Hz) synthesis harness.
 */
export const TECH_CATALOG: TechNodeDefinition[] = [
  // =======================================================================
  // 1. MILITARY BRANCH (MRS) - 4 Nodes Per Tier (Tiers 1 to 10 = 40 Nodes)
  // =======================================================================

  // --- TIER 1 (BASE ROW: Escorts & Planetary Line Defenses) ---
  {
    id: 'mil-t1',
    branch: 'MILITARY',
    tier: 1,
    name: 'Destroyer Hull Authorization',
    code: 'MIL-DHA',
    description: 'Guided missile destroyer hull schematics and authorization protocols for twin torpedo tubes and high-output sublight drives.',
    effects: 'Unlocks DD Class Destroyer Hull in HQ integrated slipway and Shipyards.',
    costMetallic: 1500,
    costOrganic: 500,
    totalTicks: 300,
  },
  {
    id: 'mil-t1-rail',
    branch: 'MILITARY',
    tier: 1,
    name: 'Accelerated Rail Assemblies',
    code: 'MIL-ARA',
    description: 'Linear magnetic induction coils accelerating kinetic flechettes and coilgun projectiles to hypersonic velocities.',
    effects: 'Kinetic Weapon Damage +5% across all naval hulls.',
    costMetallic: 1000,
    costOrganic: 350,
    totalTicks: 300,
  },
  {
    id: 'mil-t1-armor',
    branch: 'MILITARY',
    tier: 1,
    name: 'Basic Armor Plating',
    code: 'MIL-BAP',
    description: 'Standard compressed titanium-carbide hull armor plates bolted over primary structural frame bulkheads.',
    effects: 'Hull Structural HP +5% across all fleet units.',
    costMetallic: 1000,
    costOrganic: 350,
    totalTicks: 300,
  },
  {
    id: 'mil-t1-defgrid',
    branch: 'MILITARY',
    tier: 1,
    name: 'Defensive Station Grid',
    code: 'MIL-DSG',
    description: 'Tactical point-defense telemetry linking stationary orbital batteries and intercept lasers into a cohesive protective screen.',
    effects: 'Unlocks Builder placement for Missile Batteries & Point-Defense Turrets.',
    costMetallic: 1200,
    costOrganic: 400,
    totalTicks: 300,
  },

  // --- TIER 2 (Screening Cruisers & Kinetic/Shield Dynamics) ---
  {
    id: 'mil-t2',
    branch: 'MILITARY',
    tier: 2,
    name: 'Light Cruiser Frame Certification',
    code: 'MIL-LCC',
    description: 'Rapid combat cruiser screening chassis mounting 5-tube synchronized missile salvos and heavy armor belts.',
    effects: 'Unlocks CL Class Light Cruiser Hull in Shipyards.',
    costMetallic: 3500,
    costOrganic: 1200,
    totalTicks: 300,
  },
  {
    id: 'mil-t2-prop',
    branch: 'MILITARY',
    tier: 2,
    name: 'High-Yield Propellants',
    code: 'MIL-HYP',
    description: 'High-impulse metallized solid fuel mixtures boosting rocket acceleration curves and terminal intercept speeds.',
    effects: 'Missile Flight Velocity +10% across all launcher ordnance.',
    costMetallic: 2500,
    costOrganic: 900,
    totalTicks: 300,
  },
  {
    id: 'mil-t2-bulkhead',
    branch: 'MILITARY',
    tier: 2,
    name: 'Hull Bulkhead Reinforcement',
    code: 'MIL-HBR',
    description: 'Cross-ribbed honeycomb internal framing dampening ballistic shockwaves and kinetic penetrator fragmentation.',
    effects: 'Hull Armor Absorption +5% across all warship classes.',
    costMetallic: 2500,
    costOrganic: 900,
    totalTicks: 300,
  },
  {
    id: 'mil-t2-shield',
    branch: 'MILITARY',
    tier: 2,
    name: 'Shield Harmonic Calibration',
    code: 'MIL-SHC',
    description: 'Phase-tuned emitter coils stabilizing deflector bubble recharge frequency during active fire exchanges.',
    effects: 'Shield Regeneration Rate +10% across deflector-equipped hulls.',
    costMetallic: 2500,
    costOrganic: 900,
    totalTicks: 300,
  },

  // --- TIER 3 (Beam Range & Point Defense Countermeasures) ---
  {
    id: 'mil-t3-laser',
    branch: 'MILITARY',
    tier: 3,
    name: 'Laser Coherence Focusing',
    code: 'MIL-LCF',
    description: 'Precision dielectric mirror prisms maintaining focal beam spot density over long-range orbital trajectories.',
    effects: 'Offensive Laser Range +8% across all combat craft.',
    costMetallic: 5000,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'mil-t3-pd',
    branch: 'MILITARY',
    tier: 3,
    name: 'Point-Defense Slew Motors',
    code: 'MIL-PDS',
    description: 'Ultra-high torque magnetic gimbal servos rotating interception turrets rapidly onto fast-closing torpedo tracks.',
    effects: 'Point-Defense Tracking & Cycle Rate +10% across all screening mounts.',
    costMetallic: 5000,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'mil-t3-boosters',
    branch: 'MILITARY',
    tier: 3,
    name: 'Heavy Missile Solid Boosters',
    code: 'MIL-MSB',
    description: 'Two-stage booster stages providing rapid separation velocity and denser warhead payload envelopes.',
    effects: '+3% Missile Damage across all fleet ordnance.',
    costMetallic: 5000,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'mil-t3-cm',
    branch: 'MILITARY',
    tier: 3,
    name: 'Counter-Missile Tracking Relays',
    code: 'MIL-CTR',
    description: 'Dedicated optical telemetry channels linking escort interceptors with capital ship missile-defense fire controllers.',
    effects: 'Counter-Missile Intercept Probability +10% across escort screens.',
    costMetallic: 5000,
    costOrganic: 1800,
    totalTicks: 300,
  },

  // --- TIER 4 (Heavy Cruisers & Advanced Composites) ---
  {
    id: 'mil-t4',
    branch: 'MILITARY',
    tier: 4,
    name: 'Heavy Cruiser Structural Validation',
    code: 'MIL-HCS',
    description: 'Armored vanguard strike cruiser frameworks capable of sustained frontline orbital engagements and planetary interdiction.',
    effects: 'Unlocks CH Class Heavy Cruiser Hull in Shipyards.',
    costMetallic: 8000,
    costOrganic: 2800,
    totalTicks: 300,
  },
  {
    id: 'mil-t4-composites',
    branch: 'MILITARY',
    tier: 4,
    name: 'Advanced Polymer Composites',
    code: 'MIL-APC',
    description: 'Carbon-nanotube weave bonded directly into structural bulkheads for resilient lightweight shear resistance.',
    effects: 'Structural HP +10% across all naval hulls.',
    costMetallic: 7500,
    costOrganic: 2500,
    totalTicks: 300,
  },
  {
    id: 'mil-t4-graser',
    branch: 'MILITARY',
    tier: 4,
    name: 'Graser Optic Resonators',
    code: 'MIL-GOR',
    description: 'Gamma-ray ruby crystal cavities sustaining stimulated coherent emission loops during prolonged firing cycles.',
    effects: 'Heavy Graser Beam Duration +0.5s and Armor Penetration.',
    costMetallic: 7500,
    costOrganic: 2500,
    totalTicks: 300,
  },
  {
    id: 'mil-t4-autoloader',
    branch: 'MILITARY',
    tier: 4,
    name: 'Automated Autoloader Mechanisms',
    code: 'MIL-AAM',
    description: 'Robotic magazine shuttle elevators and pneumatic ramrods clearing missile tubes between volleys.',
    effects: 'Missile Salvo Cooldown -10% across all warship classes.',
    costMetallic: 7500,
    costOrganic: 2500,
    totalTicks: 300,
  },

  // --- TIER 5 (Warhead Binders & Shield Phase Inverters) ---
  {
    id: 'mil-t5-warhead',
    branch: 'MILITARY',
    tier: 5,
    name: 'Cluster Warhead Binders',
    code: 'MIL-CWB',
    description: 'Explosively formed sub-munition dispersal rings shattering point defenses and blanketing armor plates.',
    effects: 'Missile Damage +3% across all shipboard and station launchers.',
    costMetallic: 12000,
    costOrganic: 4200,
    totalTicks: 300,
  },
  {
    id: 'mil-t5-shield',
    branch: 'MILITARY',
    tier: 5,
    name: 'Shield Phase Inverters',
    code: 'MIL-SPI',
    description: 'Dynamic flux field capacitors cycling polarity to absorb energetic spikes from high-intensity beam strikes.',
    effects: 'Shield Capacity +15% across all shielded combat craft.',
    costMetallic: 12000,
    costOrganic: 4200,
    totalTicks: 300,
  },
  {
    id: 'mil-t5-flak',
    branch: 'MILITARY',
    tier: 5,
    name: 'Flak Screen Optimization',
    code: 'MIL-FSO',
    description: 'Tungsten-carbide dispersal shells timed to detonate in wide defensive spheres ahead of incoming swarms.',
    effects: 'Point-Defense Engagement Arc +15% and Flak Burst Density.',
    costMetallic: 12000,
    costOrganic: 4200,
    totalTicks: 300,
  },
  {
    id: 'mil-t5-torpedo',
    branch: 'MILITARY',
    tier: 5,
    name: 'Heavy Torpedo Hardpoints',
    code: 'MIL-HTH',
    description: 'Reinforced spinal umbilical clamps feeding power and pre-launch telemetry to capital-grade antiship torpedoes.',
    effects: 'Capital Ship Salvo Piercing & Anti-Citadel Penetration.',
    costMetallic: 12000,
    costOrganic: 4200,
    totalTicks: 300,
  },

  // --- TIER 6 (Battlecruisers & Kinetic Piercing) ---
  {
    id: 'mil-t6',
    branch: 'MILITARY',
    tier: 6,
    name: 'Battlecruiser Line Clearance',
    code: 'MIL-BCV',
    description: 'Fast capital raider hull architecture balancing extreme spinal firepower, heavy point defense, and reinforced bulkheads.',
    effects: 'Unlocks BC Class Battlecruiser Hull in Shipyards.',
    costMetallic: 18000,
    costOrganic: 6000,
    totalTicks: 300,
  },
  {
    id: 'mil-t6-slugs',
    branch: 'MILITARY',
    tier: 6,
    name: 'High-Density Depleted Armor Slugs',
    code: 'MIL-DAS',
    description: 'Super-dense actinide cores resisting kinetic deformation on impact to puncture through thick armor layers.',
    effects: 'Kinetic Piercing +15% against heavy capital plating.',
    costMetallic: 16000,
    costOrganic: 5500,
    totalTicks: 300,
  },
  {
    id: 'mil-t6-beams',
    branch: 'MILITARY',
    tier: 6,
    name: 'Focused Beam Emitters',
    code: 'MIL-FBE',
    description: 'Superconducting magnetic channeling rings collimating plasma and laser discharges into surgical cutting streams.',
    effects: 'Offensive Laser DPS +10% across all energy weapon mounts.',
    costMetallic: 16000,
    costOrganic: 5500,
    totalTicks: 300,
  },
  {
    id: 'mil-t6-reactor',
    branch: 'MILITARY',
    tier: 6,
    name: 'Sublight Reactor Tuning',
    code: 'MIL-SRT',
    description: 'Over-injected fusion plasma injector manifolds providing instant throttle response for tactical flanking maneuvers.',
    effects: 'Combat Burn Velocity +10% across all warships.',
    costMetallic: 16000,
    costOrganic: 5500,
    totalTicks: 300,
  },

  // --- TIER 7 (Tactical Targeting & Thermonuclear Payloads) ---
  {
    id: 'mil-t7-lock',
    branch: 'MILITARY',
    tier: 7,
    name: 'Advanced Sensor Target Lock',
    code: 'MIL-ATL',
    description: 'Multi-spectral synthetic aperture lidars identifying structural stress fractures on enemy hulls in real time.',
    effects: 'Beam Weapon Critical Strike Chance & Targeting Precision.',
    costMetallic: 26000,
    costOrganic: 9000,
    totalTicks: 300,
  },
  {
    id: 'mil-t7-ablation',
    branch: 'MILITARY',
    tier: 7,
    name: 'Reactive Armor Ablation',
    code: 'MIL-RAA',
    description: 'Endothermic energetic tiles vaporizing outwards upon beam contact to dissipate focused plasma heat.',
    effects: 'Hull Damage Reduction +10% against energy and projectile weapons.',
    costMetallic: 26000,
    costOrganic: 9000,
    totalTicks: 300,
  },
  {
    id: 'mil-t7-thermo',
    branch: 'MILITARY',
    tier: 7,
    name: 'Thermonuclear Warheads',
    code: 'MIL-TNW',
    description: 'High-yield multistage fusion cores releasing intense thermal and magnetic shockfronts at detonator trigger.',
    effects: 'Missile Damage +3% across all shipboard and station launchers.',
    costMetallic: 26000,
    costOrganic: 9000,
    totalTicks: 300,
  },
  {
    id: 'mil-t7-damagecontrol',
    branch: 'MILITARY',
    tier: 7,
    name: 'Automated Damage Control',
    code: 'MIL-ADC',
    description: 'Autonomous repair drones and fire suppression foams isolating breeches and sealing ruptured bulkheads.',
    effects: 'Passive Hull Repair in Gravity Wells & Emergency Containment.',
    costMetallic: 26000,
    costOrganic: 9000,
    totalTicks: 300,
  },

  // --- TIER 8 (Battleships & Graser Wave Amplifiers) ---
  {
    id: 'mil-t8',
    branch: 'MILITARY',
    tier: 8,
    name: 'Battleship Armor Citadel Blueprint',
    code: 'MIL-BBA',
    description: 'Heavy naval line of battle authorization for super-capital Battleship chassis fabrication and spinal lance conduits.',
    effects: 'Unlocks BB Class Battleship Hull in Shipyards.',
    costMetallic: 42000,
    costOrganic: 14000,
    totalTicks: 300,
  },
  {
    id: 'mil-t8-graser',
    branch: 'MILITARY',
    tier: 8,
    name: 'Heavy Graser Wave Amplifiers',
    code: 'MIL-GWA',
    description: 'Harmonic resonance feedback loops pumping high-energy photons into spinal mounts before beam discharge.',
    effects: 'Heavy Graser DPS +20% and Terminal Armor Penetration.',
    costMetallic: 38000,
    costOrganic: 13000,
    totalTicks: 300,
  },
  {
    id: 'mil-t8-shield',
    branch: 'MILITARY',
    tier: 8,
    name: 'Shield Overcharge Matrices',
    code: 'MIL-SOM',
    description: 'Emergency capacitor banks releasing instant energy floods to prevent shield collapse under concentrated fire.',
    effects: 'Emergency Shield Burst & Barrier Stabilization.',
    costMetallic: 38000,
    costOrganic: 13000,
    totalTicks: 300,
  },
  {
    id: 'mil-t8-swarm',
    branch: 'MILITARY',
    tier: 8,
    name: 'Saturation Swarm Algorithms',
    code: 'MIL-SSA',
    description: 'Dynamic mesh networking between inflight torpedoes timing impact synchronizations to overwhelm point defenses.',
    effects: 'Salvo Dispersion Tightening & Intercept Evasion.',
    costMetallic: 38000,
    costOrganic: 13000,
    totalTicks: 300,
  },

  // --- TIER 9 (Citadel Titanium & Antimatter Infusion) ---
  {
    id: 'mil-t9-belts',
    branch: 'MILITARY',
    tier: 9,
    name: 'Hardened Citadel Titanium Belts',
    code: 'MIL-CTB',
    description: 'Layered hyper-dense forged titanium armor belts encasing reactor modules and command citadels.',
    effects: 'Capital Ship Armor +25% across heavy warships (CH, BC, BB, DN).',
    costMetallic: 60000,
    costOrganic: 20000,
    totalTicks: 300,
  },
  {
    id: 'mil-t9-jamming',
    branch: 'MILITARY',
    tier: 9,
    name: 'Tachyon Countermeasure Jamming',
    code: 'MIL-TCJ',
    description: 'High-intensity broadband sensor blinding arrays scrambling terminal guidance seekers on hostile ordnance.',
    effects: 'Enemy Missile Miss Chance & ECM Jamming Radius.',
    costMetallic: 60000,
    costOrganic: 20000,
    totalTicks: 300,
  },
  {
    id: 'mil-t9-antimatter',
    branch: 'MILITARY',
    tier: 9,
    name: 'Antimatter Warhead Infusion',
    code: 'MIL-AWI',
    description: 'Micro-containment magnetic pods carrying anti-protons for devastating matter-annihilation detonation blasts.',
    effects: 'Missile Damage +3% across all shipboard and station launchers.',
    costMetallic: 60000,
    costOrganic: 20000,
    totalTicks: 300,
  },
  {
    id: 'mil-t9-coolant',
    branch: 'MILITARY',
    tier: 9,
    name: 'High-Efficiency Coolant Loops',
    code: 'MIL-HCL',
    description: 'Cryogenic superfluid circulation conduits rapidly dissipating thermal buildup from sustained laser fire.',
    effects: 'Laser Cycle Cooldown -15% and Continuous Fire Sustained Rate.',
    costMetallic: 60000,
    costOrganic: 20000,
    totalTicks: 300,
  },

  // --- TIER 10 (APEX ROW: Dreadnoughts & Nova Salvos) ---
  {
    id: 'mil-t10',
    branch: 'MILITARY',
    tier: 10,
    name: 'Dreadnought Strategic Protocol',
    code: 'MIL-DSP',
    description: 'Apex capital fleet doctrine authorizing titan-class Dreadnought hulls with synchronized broadside batteries and fleet command suites.',
    effects: 'Unlocks DN Class Dreadnought Hull in Shipyards.',
    costMetallic: 96000,
    costOrganic: 32000,
    totalTicks: 300,
  },
  {
    id: 'mil-t10-nova',
    branch: 'MILITARY',
    tier: 10,
    name: 'Nova-Class Salvo Doctrine',
    code: 'MIL-NSD',
    description: 'Fleet-wide coordinated barrage firing protocol saturating targets with catastrophic synchronized missile barrages.',
    effects: 'Missile Damage +10% Apex buff across all naval units.',
    costMetallic: 90000,
    costOrganic: 30000,
    totalTicks: 300,
  },
  {
    id: 'mil-t10-invuln',
    branch: 'MILITARY',
    tier: 10,
    name: 'Invulnerability Field Harmonics',
    code: 'MIL-IFH',
    description: 'Multi-layered graviton deflection envelopes creating near-impenetrable barrier envelopes against concentrated bombardments.',
    effects: 'Shield Maximum Clamp +30% Apex buffer across all warship shields.',
    costMetallic: 90000,
    costOrganic: 30000,
    totalTicks: 300,
  },
  {
    id: 'mil-t10-frames',
    branch: 'MILITARY',
    tier: 10,
    name: 'Armored Megastructure Frames',
    code: 'MIL-AMF',
    description: 'Super-dense planetary and orbital fortress framing reinforced with hyper-alloy girders and automated repair gantries.',
    effects: 'Starbase & Bastion Hull +50% Apex buff across all stationary structures.',
    costMetallic: 90000,
    costOrganic: 30000,
    totalTicks: 300,
  },

  // =======================================================================
  // 2. CIVILIAN BRANCH (CRO) - Industry, Economics, Logistics (40 Nodes, 4 per Tier)
  // =======================================================================

  // --- TIER 1 (Foundational Mining & Logistics) ---
  {
    id: 'civ-t1',
    branch: 'CIVILIAN',
    tier: 1,
    name: 'Basic Ore Processing',
    code: 'CIV-BOP',
    description: 'Centrifugal separator filters and magnetic hoppers expediting raw mineral discharge into orbital docking ports.',
    effects: 'Miner Unload Turnaround -15%.',
    costMetallic: 400,
    costOrganic: 500,
    totalTicks: 300,
  },
  {
    id: 'civ-t1-scaffold',
    branch: 'CIVILIAN',
    tier: 1,
    name: 'Composite Structural Scaffolding',
    code: 'CIV-CSS',
    description: 'Pre-stressed interlocking carbon composite frames enabling rapid assembly of orbital infrastructure.',
    effects: 'Structure Build Speed +10%.',
    costMetallic: 400,
    costOrganic: 500,
    totalTicks: 300,
  },
  {
    id: 'civ-t1-trade',
    branch: 'CIVILIAN',
    tier: 1,
    name: 'Civic Trade Registry',
    code: 'CIV-CTR',
    description: 'Standardized corporate tariffs and barter ledgers tracking commercial trade credits and orbital tariffs.',
    effects: 'HQ Economic Yield +5%.',
    costMetallic: 400,
    costOrganic: 500,
    totalTicks: 300,
  },
  {
    id: 'civ-t1-cargo',
    branch: 'CIVILIAN',
    tier: 1,
    name: 'Light Cargo Pods',
    code: 'CIV-LCP',
    description: 'Expandable pressurized container racks fitted along utility ship keels to increase dry mineral hold capacities.',
    effects: 'Logistics Craft Hold +15%.',
    costMetallic: 400,
    costOrganic: 500,
    totalTicks: 300,
  },

  // --- TIER 2 (Orbital Smelting & Assembly) ---
  {
    id: 'civ-t2',
    branch: 'CIVILIAN',
    tier: 2,
    name: 'Orbital Refinery Protocol',
    code: 'CIV-ORP',
    description: 'Standardized zero-g smelter architectures with high-volume continuous mineral cracking crucibles.',
    effects: 'Unlocks Builder placement for Orbital Refineries.',
    costMetallic: 800,
    costOrganic: 1000,
    totalTicks: 300,
  },
  {
    id: 'civ-t2-arms',
    branch: 'CIVILIAN',
    tier: 2,
    name: 'Automated Assembly Arms',
    code: 'CIV-AAA',
    description: 'Hydraulic gantry arrays and optical rivet manipulators accelerating vessel construction inside HQ slipways.',
    effects: 'HQ Slipway Build Speed +10%.',
    costMetallic: 800,
    costOrganic: 1000,
    totalTicks: 300,
  },
  {
    id: 'civ-t2-smelt',
    branch: 'CIVILIAN',
    tier: 2,
    name: 'Alloy Smelting Techniques',
    code: 'CIV-AST',
    description: 'Thermal flux control isolating titanium-iron precipitates during zero-g induction smelting.',
    effects: 'Refinery Metallic Yield +5%.',
    costMetallic: 800,
    costOrganic: 1000,
    totalTicks: 300,
  },
  {
    id: 'civ-t2-hydro',
    branch: 'CIVILIAN',
    tier: 2,
    name: 'Organic Hydro-Vats',
    code: 'CIV-OHV',
    description: 'Pressurized bioreactor vats cultivating photosynthetic algae and synthetic proteins in zero gravity.',
    effects: 'Passive Organic Generation +1.0/s.',
    costMetallic: 800,
    costOrganic: 1000,
    totalTicks: 300,
  },

  // --- TIER 3 (Deep-Vein Extraction & Administration) ---
  {
    id: 'civ-t3-drills',
    branch: 'CIVILIAN',
    tier: 3,
    name: 'Deep-Vein Core Drills',
    code: 'CIV-DVD',
    description: 'Tritanium-carbide rotary boreheads vibrating at resonant frequencies to fracture dense asteroidal core nodules.',
    effects: 'Miner Mining Speed +15%.',
    costMetallic: 1500,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'civ-t3-sort',
    branch: 'CIVILIAN',
    tier: 3,
    name: 'Automated Freight Sorting',
    code: 'CIV-AFS',
    description: 'Optical mass spectrometers sorting incoming mineral chunks prior to thermal chamber insertion.',
    effects: 'Refinery Processing Speed +10%.',
    costMetallic: 1500,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'civ-t3-fuel',
    branch: 'CIVILIAN',
    tier: 3,
    name: 'Expanded Fuel Bunkers',
    code: 'CIV-EFB',
    description: 'Cryogenic hydrogen tanks and enriched reaction mass manifolds sustaining higher burn accelerations.',
    effects: 'Logistics Vessel Max Speed +15%.',
    costMetallic: 1500,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'civ-t3-admin',
    branch: 'CIVILIAN',
    tier: 3,
    name: 'Civic Administrative Core',
    code: 'CIV-CAC',
    description: 'Decentralized administrative algorithms optimizing energy distribution grids and structure maintenance cycles.',
    effects: 'Reduces Structure Upkeep -15%.',
    costMetallic: 1500,
    costOrganic: 1800,
    totalTicks: 300,
  },

  // --- TIER 4 (Catalytic Smelting & Nanite Repairs) ---
  {
    id: 'civ-t4',
    branch: 'CIVILIAN',
    tier: 4,
    name: 'Catalytic Refining Loops',
    code: 'CIV-CRL',
    description: 'Closed-cycle gaseous chemical catalysts reducing thermal dissipation loss during heavy mineral cracking.',
    effects: 'Ore-to-Metallic Yield +10%.',
    costMetallic: 2500,
    costOrganic: 3200,
    totalTicks: 300,
  },
  {
    id: 'civ-t4-nanite',
    branch: 'CIVILIAN',
    tier: 4,
    name: 'Nanite Construction Swarms',
    code: 'CIV-NCS',
    description: 'Microscopic robotic swarms repairing damaged plating and accelerating scaffold weld completions.',
    effects: 'Builder Repair Rate +25%.',
    costMetallic: 2500,
    costOrganic: 3200,
    totalTicks: 300,
  },
  {
    id: 'civ-t4-slipway',
    branch: 'CIVILIAN',
    tier: 4,
    name: 'Industrial Heavy Slipways',
    code: 'CIV-IHS',
    description: 'Reinforced magnetic cradles and parallel rail gantries installed across dedicated shipyard stations.',
    effects: 'Dedicated Shipyard Build Speed +15%.',
    costMetallic: 2500,
    costOrganic: 3200,
    totalTicks: 300,
  },
  {
    id: 'civ-t4-silo',
    branch: 'CIVILIAN',
    tier: 4,
    name: 'High-Capacity Silo Storage',
    code: 'CIV-HCS',
    description: 'Pressurized orbital storage domes and sub-surface caverns expanding bulk metallic and organic reserves.',
    effects: 'HQ Storage Capacity +25%.',
    costMetallic: 2500,
    costOrganic: 3200,
    totalTicks: 300,
  },

  // --- TIER 5 (Bulk Freight & Advanced Biospheres) ---
  {
    id: 'civ-t5',
    branch: 'CIVILIAN',
    tier: 5,
    name: 'Bulk Ore Freighters',
    code: 'CIV-BOF',
    description: 'Super-sized modular cargo compartments fitted to commercial tenders and transport craft.',
    effects: 'Builder & Logistics Cargo Capacity +50%.',
    costMetallic: 4000,
    costOrganic: 5000,
    totalTicks: 300,
  },
  {
    id: 'civ-t5-thermal',
    branch: 'CIVILIAN',
    tier: 5,
    name: 'Thermal Smelting Chambers',
    code: 'CIV-TSC',
    description: 'High-containment electromagnetic crucibles sustaining plasma temperatures to separate rare heavy elements.',
    effects: 'Metallic Extraction Ratio +10%.',
    costMetallic: 4000,
    costOrganic: 5000,
    totalTicks: 300,
  },
  {
    id: 'civ-t5-hydro',
    branch: 'CIVILIAN',
    tier: 5,
    name: 'Advanced Hydroponic Biospheres',
    code: 'CIV-AHB',
    description: 'Multi-tiered aeroponic biomes and genetic accelerated flora generating abundant bio-organic matter.',
    effects: 'Organic Passive Output +5.0/s.',
    costMetallic: 4000,
    costOrganic: 5000,
    totalTicks: 300,
  },
  {
    id: 'civ-t5-routing',
    branch: 'CIVILIAN',
    tier: 5,
    name: 'System Logistics Routing',
    code: 'CIV-SLR',
    description: 'Slingshot flight corridors and navigational beacon relays reducing transit time across deep gravity wells.',
    effects: 'Miners Transit Speed in Gravity Wells +15%.',
    costMetallic: 4000,
    costOrganic: 5000,
    totalTicks: 300,
  },

  // --- TIER 6 (Arc Furnaces & Automated Gantries) ---
  {
    id: 'civ-t6',
    branch: 'CIVILIAN',
    tier: 6,
    name: 'Heavy Metallurgical Arc Furnaces',
    code: 'CIV-HMA',
    description: 'High-energy plasma arc torches melting down dense asteroidal iron and refractory rare-earth metals.',
    effects: 'Refinery Metallic Output +15%.',
    costMetallic: 5500,
    costOrganic: 6800,
    totalTicks: 300,
  },
  {
    id: 'civ-t6-gantries',
    branch: 'CIVILIAN',
    tier: 6,
    name: 'Automated Repair Gantries',
    code: 'CIV-ARG',
    description: 'Dockside laser welders and repair arms servicing docked friendly ships without requiring active builder focus.',
    effects: 'Moored Ships Repair Passively in Slipways.',
    costMetallic: 5500,
    costOrganic: 6800,
    totalTicks: 300,
  },
  {
    id: 'civ-t6-habitat',
    branch: 'CIVILIAN',
    tier: 6,
    name: 'Modular Habitat Construction',
    code: 'CIV-MHC',
    description: 'Interchangeable pre-fabricated hull modules streamlining the fabrication costs of orbital stations.',
    effects: 'Structure Cost -10%.',
    costMetallic: 5500,
    costOrganic: 6800,
    totalTicks: 300,
  },
  {
    id: 'civ-t6-salvage',
    branch: 'CIVILIAN',
    tier: 6,
    name: 'Deep-Space Salvage Arrays',
    code: 'CIV-DSS',
    description: 'Tractor beams and magnetic scrap sweepers recovering valuable metallics from wrecked hulls and station debris.',
    effects: 'Resource Recovery from Ship Debris +25%.',
    costMetallic: 5500,
    costOrganic: 6800,
    totalTicks: 300,
  },

  // --- TIER 7 (Strip-Mining & Heavy Drydocks) ---
  {
    id: 'civ-t7',
    branch: 'CIVILIAN',
    tier: 7,
    name: 'Automated Strip-Mining Matrix',
    code: 'CIV-ASM',
    description: 'Coordinated autonomous drone swarms stripping entire asteroid faces with resonant plasma cutters.',
    effects: 'Miner Mining Speed +25%.',
    costMetallic: 7000,
    costOrganic: 8800,
    totalTicks: 300,
  },
  {
    id: 'civ-t7-drydocks',
    branch: 'CIVILIAN',
    tier: 7,
    name: 'Heavy Industrial Drydocks',
    code: 'CIV-HID',
    description: 'Expanded drydock berths equipped with tandem crane bridges speeding up capital warship construction.',
    effects: 'Capital Ship Build Time -20%.',
    costMetallic: 7000,
    costOrganic: 8800,
    totalTicks: 300,
  },
  {
    id: 'civ-t7-plasma',
    branch: 'CIVILIAN',
    tier: 7,
    name: 'Plasma Smelting Torches',
    code: 'CIV-PST',
    description: 'Ultra-high-temperature plasma injectors vaporizing mineral impurities and doubling reaction chamber throughput.',
    effects: 'Refinery Processing Rate +20%.',
    costMetallic: 7000,
    costOrganic: 8800,
    totalTicks: 300,
  },
  {
    id: 'civ-t7-vaults',
    branch: 'CIVILIAN',
    tier: 7,
    name: 'Cryogenic Stockpile Vaults',
    code: 'CIV-CSV',
    description: 'Deep cryogenic vacuum vaults condensing gas stocks and compactly storing solid resource ingots.',
    effects: 'HQ Max Silo Storage Clamps Doubled.',
    costMetallic: 7000,
    costOrganic: 8800,
    totalTicks: 300,
  },

  // --- TIER 8 (Logistics Highways & Nanite Synthesizers) ---
  {
    id: 'civ-t8',
    branch: 'CIVILIAN',
    tier: 8,
    name: 'Orbital Logistics Network',
    code: 'CIV-OLN',
    description: 'Integrated cargo drone highways and sub-light delivery capsules connecting all sovereign outposts.',
    effects: 'System-wide Resource Transfer Efficiency +25%.',
    costMetallic: 9000,
    costOrganic: 11500,
    totalTicks: 300,
  },
  {
    id: 'civ-t8-synth',
    branch: 'CIVILIAN',
    tier: 8,
    name: 'Nanite Material Synthesizers',
    code: 'CIV-NMS',
    description: 'Molecular 3D printers transmuting ambient solar matter and space dust into high-tensile structural metallics.',
    effects: 'Passive Metallic Production +5.0/s.',
    costMetallic: 9000,
    costOrganic: 11500,
    totalTicks: 300,
  },
  {
    id: 'civ-t8-drones',
    branch: 'CIVILIAN',
    tier: 8,
    name: 'Autonomous Drone Management',
    code: 'CIV-ADM',
    description: 'Centralized task neural cores granting autonomous builders the capability to handle multiple scaffold queues.',
    effects: 'Simultaneous Builder Concurrency +1.',
    costMetallic: 9000,
    costOrganic: 11500,
    totalTicks: 300,
  },
  {
    id: 'civ-t8-heatsinks',
    branch: 'CIVILIAN',
    tier: 8,
    name: 'Extreme-Temp Heat Sinks',
    code: 'CIV-ETHS',
    description: 'Liquid helium radiator panels dissipating excess thermal buildup, allowing refineries to run without thermal throttling.',
    effects: 'Refinery Safety Clamps Removed (Continuous Overclock).',
    costMetallic: 9000,
    costOrganic: 11500,
    totalTicks: 300,
  },

  // --- TIER 9 (Industrial Nanites & Antimatter Refining) ---
  {
    id: 'civ-t9',
    branch: 'CIVILIAN',
    tier: 9,
    name: 'Industrial Nanite Assembly',
    code: 'CIV-INA',
    description: 'Self-replicating constructor nanites rapidly weaving structural armor ribs and conduits in real time.',
    effects: 'Shipyard Construction Speed +25%.',
    costMetallic: 12000,
    costOrganic: 15000,
    totalTicks: 300,
  },
  {
    id: 'civ-t9-antimatter',
    branch: 'CIVILIAN',
    tier: 9,
    name: 'Antimatter Refining Protocols',
    code: 'CIV-ARP',
    description: 'Catalytic converters extracting concentrated antimatter fuel isotopes directly from asteroidal core minerals.',
    effects: 'Refinery Fuel & Energy Output Boost.',
    costMetallic: 12000,
    costOrganic: 15000,
    totalTicks: 300,
  },
  {
    id: 'civ-t9-freighters',
    branch: 'CIVILIAN',
    tier: 9,
    name: 'Macro-Scale Cargo Freighters',
    code: 'CIV-MCF',
    description: 'Super-reinforced magnetic containment bulkheads doubling the mineral cargo hold volume of all autonomous mining craft.',
    effects: 'Miner Cargo Capacity Doubled (2,000 Ore Hold).',
    costMetallic: 12000,
    costOrganic: 15000,
    totalTicks: 300,
  },
  {
    id: 'civ-t9-highways',
    branch: 'CIVILIAN',
    tier: 9,
    name: 'System Orbital Highway Relays',
    code: 'CIV-SOH',
    description: 'Continuous graviton induction conduits accelerating civilian tenders, freighters, and logistics vessels between orbits.',
    effects: 'Allied Commercial Speed +20%.',
    costMetallic: 12000,
    costOrganic: 15000,
    totalTicks: 300,
  },

  // --- TIER 10 (Apex Industry & Megastructure Engineering) ---
  {
    id: 'civ-t10',
    branch: 'CIVILIAN',
    tier: 10,
    name: 'Deep-Core Antimatter Siphon',
    code: 'CIV-DAS',
    description: 'Stellar and planetary deep-core siphons tapping primordial antimatter streams for virtually boundless refining energy.',
    effects: 'System-wide Energy & Refining Apex (+10 Met & +10 Org/s).',
    costMetallic: 15000,
    costOrganic: 20000,
    totalTicks: 300,
  },
  {
    id: 'civ-t10-matrices',
    branch: 'CIVILIAN',
    tier: 10,
    name: 'Self-Replicating Constructor Matrices',
    code: 'CIV-SCM',
    description: 'Autonomous nanite lattices that self-assemble orbital scaffolding without requiring builder tenders on site.',
    effects: 'Scaffold Auto-Assembly & Construction Rate +50%.',
    costMetallic: 15000,
    costOrganic: 20000,
    totalTicks: 300,
  },
  {
    id: 'civ-t10-stockpile',
    branch: 'CIVILIAN',
    tier: 10,
    name: 'Post-Scarcity Stockpile Protocols',
    code: 'CIV-PSP',
    description: 'Complete closed-loop atomic matter recombination cutting the resource bill of all ships, structures, and upgrades.',
    effects: 'Global Build Costs -25% Apex discount.',
    costMetallic: 15000,
    costOrganic: 20000,
    totalTicks: 300,
  },
  {
    id: 'civ-t10-megastructure',
    branch: 'CIVILIAN',
    tier: 10,
    name: 'System Megastructure Engineering',
    code: 'CIV-SME',
    description: 'Unlocks hyper-scale orbital megaproject blueprints for planetary-scale refineries and massive trade archologies.',
    effects: 'Enables Mega-Refinery Blueprints & Apex Industrial Yields.',
    costMetallic: 15000,
    costOrganic: 20000,
    totalTicks: 300,
  },

  // =======================================================================
  // 3. EXPANSION BRANCH (EXC) - Colonization, Sensors, Gravity Control (10 Nodes)
  // =======================================================================
  {
    id: 'exp-t1',
    branch: 'EXPANSION',
    tier: 1,
    name: 'Terran Habitation Standards',
    code: 'EXP-THS',
    description: 'Standardized atmospheric shelters, biospheric environmental filters, and surface lifecycle infrastructure establishing sovereign Terran planetary footholds.',
    effects: 'FUNCTIONAL: Enables settlement, exploitation, and orbital mooring over Terran / Continental habitable worlds.',
    costMetallic: 400,
    costOrganic: 400,
    totalTicks: 300,
  },
  {
    id: 'exp-t1-outpost',
    branch: 'EXPANSION',
    tier: 1,
    name: 'Orbital Outpost Blueprints',
    code: 'EXP-OOB',
    description: 'Prefabricated deep-space framework allowing forward deployment of sensor relays and micro-depot platforms.',
    effects: 'Unlocks Deployable Outpost blueprint.',
    costMetallic: 400,
    costOrganic: 400,
    totalTicks: 300,
  },
  {
    id: 'exp-t1-radar',
    branch: 'EXPANSION',
    tier: 1,
    name: 'Basic Radar Relays',
    code: 'EXP-BRR',
    description: 'Long-wavelength radar transceivers boosting tactical perimeter detection across orbital approaches.',
    effects: '+5% Active Radar Range.',
    costMetallic: 400,
    costOrganic: 400,
    totalTicks: 300,
  },
  {
    id: 'exp-t1-scout',
    branch: 'EXPANSION',
    tier: 1,
    name: 'Scout Vessel Slipway Tuning',
    code: 'EXP-SST',
    description: 'Calibrated thruster manifolds and stripped structural bulkheads accelerating light reconnaissance vessels.',
    effects: 'Scout Ship Speed +15%.',
    costMetallic: 400,
    costOrganic: 400,
    totalTicks: 300,
  },

  // Tier 2
  {
    id: 'exp-t2-desert',
    branch: 'EXPANSION',
    tier: 2,
    name: 'Desert & Arid World Settlement',
    code: 'EXP-DAS',
    description: 'Atmospheric moisture condensers and heavy particulate dust sealing for hostile arid and desert world settlement.',
    effects: 'PLACEHOLDER: Arid Planet Colonization Protocol.',
    costMetallic: 900,
    costOrganic: 900,
    totalTicks: 300,
  },
  {
    id: 'exp-t2',
    branch: 'EXPANSION',
    tier: 2,
    name: 'Forward Outpost Blueprints',
    code: 'EXP-FOB',
    description: 'Deployable modular micro-depots providing forward sensor relays, emergency docking clamps, and repair slipways.',
    effects: 'Deployable Sensor / Micro-Depot Outpost blueprint.',
    costMetallic: 900,
    costOrganic: 900,
    totalTicks: 300,
  },
  {
    id: 'exp-t2-filter',
    branch: 'EXPANSION',
    tier: 2,
    name: 'Passive Sensor Filters',
    code: 'EXP-PSF',
    description: 'Algorithmic signal noise filters stripping background cosmic radiation to resolve distant mass contacts.',
    effects: '+10% Passive Blob Detection Distance.',
    costMetallic: 900,
    costOrganic: 900,
    totalTicks: 300,
  },
  {
    id: 'exp-t2-survey',
    branch: 'EXPANSION',
    tier: 2,
    name: 'Planetary Survey Scanners',
    code: 'EXP-PSS',
    description: 'Sub-surface orbital gravimetric scanners detecting high-density mineral veins and geothermal fissures.',
    effects: 'Reveals Resource Nodes on Worlds.',
    costMetallic: 900,
    costOrganic: 900,
    totalTicks: 300,
  },

  // Tier 3
  {
    id: 'exp-t3-ice',
    branch: 'EXPANSION',
    tier: 3,
    name: 'Ice & Glacial World Settlement',
    code: 'EXP-IGS',
    description: 'Thermal exchange foundations and sub-glacial heating grids engineered for permafrost and cryo-world colonization.',
    effects: 'PLACEHOLDER: Ice Planet Colonization Protocol.',
    costMetallic: 1800,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'exp-t3-beacon',
    branch: 'EXPANSION',
    tier: 3,
    name: 'Deep-Space Beacon Arrays',
    code: 'EXP-DBA',
    description: 'Autonomous navigation beacons transmitting real-time gravitational shear telemetry to accelerate tactical jumps.',
    effects: 'Gravity Well Jump Transit Time -10%.',
    costMetallic: 1800,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'exp-t3-moisture',
    branch: 'EXPANSION',
    tier: 3,
    name: 'Atmospheric Moisture Harvesting',
    code: 'EXP-AMH',
    description: 'High-efficiency vapor extractors and closed-loop hydrospheres boosting planetary colony growth rates.',
    effects: 'Colony Population Growth +10%.',
    costMetallic: 1800,
    costOrganic: 1800,
    totalTicks: 300,
  },
  {
    id: 'exp-t3-tether',
    branch: 'EXPANSION',
    tier: 3,
    name: 'Orbital Mooring Tether Engineering',
    code: 'EXP-OMT',
    description: 'Reinforced electromagnetic tension cables allowing stable orbital structure mooring further out from gravity cores.',
    effects: 'Mooring Radius Margin +10%.',
    costMetallic: 1800,
    costOrganic: 1800,
    totalTicks: 300,
  },

  // Tier 4
  {
    id: 'exp-t4-volcanic',
    branch: 'EXPANSION',
    tier: 4,
    name: 'Volcanic & Ash World Settlement',
    code: 'EXP-VAS',
    description: 'Refractory ceramic plating, tectonic dampeners, and magma heat shields enabling survival on pyroclastic worlds.',
    effects: 'PLACEHOLDER: Volcanic Planet Colonization Protocol.',
    costMetallic: 3000,
    costOrganic: 3000,
    totalTicks: 300,
  },
  {
    id: 'exp-t4',
    branch: 'EXPANSION',
    tier: 4,
    name: 'Sub-Surface Habitation Modules',
    code: 'EXP-SHM',
    description: 'Pressurized subterranean complexes shielding colonists from cosmic radiation and severe temperature deltas.',
    effects: 'Terran Planetary Max Population +25%.',
    costMetallic: 3000,
    costOrganic: 3000,
    totalTicks: 300,
  },
  {
    id: 'exp-t4-sensor2',
    branch: 'EXPANSION',
    tier: 4,
    name: 'Sensor Network Enhancements II',
    code: 'EXP-SN2',
    description: 'Cascading multi-band antenna arrays improving both active pulse targeting and passive contact triangulation.',
    effects: '+5% Active Radar / +10% Passive Sensors.',
    costMetallic: 3000,
    costOrganic: 3000,
    totalTicks: 300,
  },
  {
    id: 'exp-t4-clamps',
    branch: 'EXPANSION',
    tier: 4,
    name: 'Deep Asteroid Mooring Clamps',
    code: 'EXP-AMC',
    description: 'Pneumatic anchor harpoons and counter-torque gyros securing facilities into low-mass tumbling asteroids.',
    effects: 'Asteroid Cluster Well Mooring Stability.',
    costMetallic: 3000,
    costOrganic: 3000,
    totalTicks: 300,
  },

  // Tier 5
  {
    id: 'exp-t5-gas',
    branch: 'EXPANSION',
    tier: 5,
    name: 'Gas Giant Orbital Harvesting',
    code: 'EXP-GOH',
    description: 'Low-orbit skimming conduits capturing hydrogen, deuterium, and trace helium isotopes from gas giant upper decks.',
    effects: 'PLACEHOLDER: Atmospheric Skimming Stations.',
    costMetallic: 4500,
    costOrganic: 4500,
    totalTicks: 300,
  },
  {
    id: 'exp-t5',
    branch: 'EXPANSION',
    tier: 5,
    name: 'Tachyon Sensor Pickets',
    code: 'EXP-TSP',
    description: 'Coordinated radar pickets transmitting synchronized targeting vectors to defensive arrays and combat groups.',
    effects: 'Active Radar Targeting Distance +20%.',
    costMetallic: 4500,
    costOrganic: 4500,
    totalTicks: 300,
  },
  {
    id: 'exp-t5-geo',
    branch: 'EXPANSION',
    tier: 5,
    name: 'Geothermal Colony Generators',
    code: 'EXP-GCG',
    description: 'Deep mantle heat taps converting planetary thermal differentials into industrial power.',
    effects: 'Colony Tax/Resource Generation +15%.',
    costMetallic: 4500,
    costOrganic: 4500,
    totalTicks: 300,
  },
  {
    id: 'exp-t5-shield',
    branch: 'EXPANSION',
    tier: 5,
    name: 'Planetary Shield Arrays',
    code: 'EXP-PSA',
    description: 'Surface-projected energy deflector umbrellas dispersing orbital kinetic impacts and laser lances.',
    effects: 'Reduces Orbital Bombardment Damage.',
    costMetallic: 4500,
    costOrganic: 4500,
    totalTicks: 300,
  },

  // Tier 6
  {
    id: 'exp-t6-barren',
    branch: 'EXPANSION',
    tier: 6,
    name: 'Barren & Airless Rock Exploitation',
    code: 'EXP-BAE',
    description: 'Pressurized geodesic dome cities and vacuum seals allowing colonization on airless lunar and barren basalt worlds.',
    effects: 'PLACEHOLDER: Dead World Dome Colonies.',
    costMetallic: 6500,
    costOrganic: 6500,
    totalTicks: 300,
  },
  {
    id: 'exp-t6',
    branch: 'EXPANSION',
    tier: 6,
    name: 'Orbital Bastion Frameworks',
    code: 'EXP-OBF',
    description: 'Super-heavy orbital defense fortress blueprints mounting long-range missile silos and heavy point-defense arrays.',
    effects: 'Heavy Moored Defense Platform Blueprint.',
    costMetallic: 6500,
    costOrganic: 6500,
    totalTicks: 300,
  },
  {
    id: 'exp-t6-relays',
    branch: 'EXPANSION',
    tier: 6,
    name: 'Deep-Space Tachyon Relays',
    code: 'EXP-DTR',
    description: 'High-frequency tachyon transponders that pierce stealth screening to resolve hull classifications in the fog.',
    effects: 'Identifies Ship Classes inside Fog-of-War.',
    costMetallic: 6500,
    costOrganic: 6500,
    totalTicks: 300,
  },
  {
    id: 'exp-t6-infra',
    branch: 'EXPANSION',
    tier: 6,
    name: 'Planetary Heavy Infrastructure',
    code: 'EXP-PHI',
    description: 'Zoned orbital logistics corridors expanding the construction gantry envelope around developed colonies.',
    effects: 'Colony Structure Slots +1.',
    costMetallic: 6500,
    costOrganic: 6500,
    totalTicks: 300,
  },

  // Tier 7
  {
    id: 'exp-t7',
    branch: 'EXPANSION',
    tier: 7,
    name: 'Oceanic & Greenhouse Terraforming',
    code: 'EXP-OGT',
    description: 'Atmospheric scrubbing processors and hydrosphere stabilization matrices expanding world carrying capacity.',
    effects: 'PLACEHOLDER: Oceanic World Colonization Protocol.',
    costMetallic: 8500,
    costOrganic: 8500,
    totalTicks: 300,
  },
  {
    id: 'exp-t7-probes',
    branch: 'EXPANSION',
    tier: 7,
    name: 'Autonomous Survey Probes',
    code: 'EXP-ASP',
    description: 'Long-range autonomous micro-drones charting outer gravity wells and updating tactical nav-charts.',
    effects: 'Automatic Sector Exploration.',
    costMetallic: 8500,
    costOrganic: 8500,
    totalTicks: 300,
  },
  {
    id: 'exp-t7-sensor3',
    branch: 'EXPANSION',
    tier: 7,
    name: 'Sensor Network Enhancements III',
    code: 'EXP-SN3',
    description: 'Next-generation phased-array interferometer dishes extending the fleet tactical horizon.',
    effects: '+5% Active Radar / +10% Passive Sensors.',
    costMetallic: 8500,
    costOrganic: 8500,
    totalTicks: 300,
  },
  {
    id: 'exp-t7-warp',
    branch: 'EXPANSION',
    tier: 7,
    name: 'Gravity Well Warp Dampening',
    code: 'EXP-GWD',
    description: 'Harmonic subspace drag fields destabilizing hostile sublight drives inside allied planetary gravity wells.',
    effects: 'Enemy Sublight Infiltration Speed -20%.',
    costMetallic: 8500,
    costOrganic: 8500,
    totalTicks: 300,
  },

  // Tier 8
  {
    id: 'exp-t8',
    branch: 'EXPANSION',
    tier: 8,
    name: 'Deep Space Tachyon Arrays',
    code: 'EXP-DTA',
    description: 'Hyperspatial tachyon sensor emitters penetrating nebula interference and deep space stealth screens.',
    effects: 'Passive Sensor Range Doubled.',
    costMetallic: 11000,
    costOrganic: 11000,
    totalTicks: 300,
  },
  {
    id: 'exp-t8-weather',
    branch: 'EXPANSION',
    tier: 8,
    name: 'Planetary Weather Manipulation',
    code: 'EXP-PWM',
    description: 'Orbital ionizer satellites stabilizing planetary jet streams, eliminating catastrophic weather and boosting productivity.',
    effects: 'Terran Colony Output +30%.',
    costMetallic: 11000,
    costOrganic: 11000,
    totalTicks: 300,
  },
  {
    id: 'exp-t8-radar',
    branch: 'EXPANSION',
    tier: 8,
    name: 'Orbital Deep Radar Nodes',
    code: 'EXP-ODR',
    description: 'Deep-space listening posts linked into real-time defense networks providing early warning of incoming incursions.',
    effects: 'System-wide Early Warning Radar.',
    costMetallic: 11000,
    costOrganic: 11000,
    totalTicks: 300,
  },
  {
    id: 'exp-t8-domes',
    branch: 'EXPANSION',
    tier: 8,
    name: 'Atmospheric Dome Megastructures',
    code: 'EXP-ADM',
    description: 'Continental-scale forcefields and macro-domes shielding entire hemispheres on hostile planetary bodies.',
    effects: 'Extends Non-Terran Colony Sizes.',
    costMetallic: 11000,
    costOrganic: 11000,
    totalTicks: 300,
  },

  // Tier 9
  {
    id: 'exp-t9',
    branch: 'EXPANSION',
    tier: 9,
    name: 'Extreme World Core Extraction',
    code: 'EXP-EWC',
    description: 'Deep mantle mag-conduits siphoning heavy super-metals directly from the molten cores of extreme planetary bodies.',
    effects: 'PLACEHOLDER: Ultra-Dense Metallic Siphoning.',
    costMetallic: 14000,
    costOrganic: 14000,
    totalTicks: 300,
  },
  {
    id: 'exp-t9-distort',
    branch: 'EXPANSION',
    tier: 9,
    name: 'Gravity Distortion Sensors',
    code: 'EXP-GDS',
    description: 'Quantum gravimeters detecting minute micro-gravity disturbances caused by camouflaged vessels and phantom decoys.',
    effects: 'Reveals Camouflaged / Cloaked Fleets.',
    costMetallic: 14000,
    costOrganic: 14000,
    totalTicks: 300,
  },
  {
    id: 'exp-t9-beacons',
    branch: 'EXPANSION',
    tier: 9,
    name: 'Extreme Range Hyperlane Beacons',
    code: 'EXP-ERH',
    description: 'High-output navigational lighthouses guiding capital warships across immense interplanetary void stretches.',
    effects: 'Tactical Jump Range +50%.',
    costMetallic: 14000,
    costOrganic: 14000,
    totalTicks: 300,
  },
  {
    id: 'exp-t9-sync',
    branch: 'EXPANSION',
    tier: 9,
    name: 'Total Biosphere Synchronization',
    code: 'EXP-TBS',
    description: 'Full cybernetic and organic integration of continental colonies optimizing tax collections and economic yield.',
    effects: 'Terran World Tax +50%.',
    costMetallic: 14000,
    costOrganic: 14000,
    totalTicks: 300,
  },

  // Tier 10 (Apex Row)
  {
    id: 'exp-t10',
    branch: 'EXPANSION',
    tier: 10,
    name: 'Artificial Singularity Stabilization',
    code: 'EXP-ASS',
    description: 'Micro-singularity containment fields stabilizing artificial gravity well nodes across system space.',
    effects: 'Gravity Well Anchor Extension Apex.',
    costMetallic: 18000,
    costOrganic: 18000,
    totalTicks: 300,
  },
  {
    id: 'exp-t10-solar',
    branch: 'EXPANSION',
    tier: 10,
    name: 'Solar Core Radiation Shielding',
    code: 'EXP-SRS',
    description: 'Super-luminal magnetic deflector blankets allowing orbital structures to anchor deep inside the inner stellar corona.',
    effects: 'Allows Mooring in Inner Solar Corona.',
    costMetallic: 18000,
    costOrganic: 18000,
    totalTicks: 300,
  },
  {
    id: 'exp-t10-grid',
    branch: 'EXPANSION',
    tier: 10,
    name: 'Tachyon Omni-Sensory Grid',
    code: 'EXP-TOS',
    description: 'Apex sensor array synchronizing all system tachyon pulses to unveil full spatial awareness across every sector.',
    effects: 'Complete System-Wide Vision Unveiled Apex.',
    costMetallic: 18000,
    costOrganic: 18000,
    totalTicks: 300,
  },
  {
    id: 'exp-t10-genesis',
    branch: 'EXPANSION',
    tier: 10,
    name: 'Planetary Genesis Protocols',
    code: 'EXP-PGP',
    description: 'Apex planetary geo-engineering protocols initiating complete biosphere genesis on lifeless rock worlds.',
    effects: 'Barren-to-Terran World Conversion Apex.',
    costMetallic: 18000,
    costOrganic: 18000,
    totalTicks: 300,
  },

  // =======================================================================
  // 4. HEADQUARTERS BRANCH (CITADEL) - Modular Sub-Silos, Parallel Refineries,
  //    and Rapid-Fire Missile Volley Autoloaders
  // =======================================================================

  // --- SUB-SILO STORAGE EXPANSIONS (Tiers 1 to 10, Slot 0) ---
  {
    id: 'HQ_SILO_T1',
    branch: 'HEADQUARTERS',
    tier: 1,
    name: 'Sub-Silo Expansion Unit 1',
    code: 'HQ-SILO-1',
    slot: 0,
    description: 'Modular orbital ballast containment silos expanded within the primary citadel substructure.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 115,000 M / 115,000 O).',
    costMetallic: 3000,
    costOrganic: 1500,
    totalTicks: 300,
    prereqs: [],
  },
  {
    id: 'HQ_SILO_T2',
    branch: 'HEADQUARTERS',
    tier: 2,
    name: 'Sub-Silo Expansion Unit 2',
    code: 'HQ-SILO-2',
    slot: 0,
    description: 'Pressurized reinforced vaults equipped with magnetic stabilization for dense metallic ingots.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 130,000 M / 130,000 O).',
    costMetallic: 6000,
    costOrganic: 3000,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T1'],
  },
  {
    id: 'HQ_SILO_T3',
    branch: 'HEADQUARTERS',
    tier: 3,
    name: 'Sub-Silo Expansion Unit 3',
    code: 'HQ-SILO-3',
    slot: 0,
    description: 'Cryogenic buffer chambers preventing volatile organic compound decay during long-term storage.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 145,000 M / 145,000 O).',
    costMetallic: 10000,
    costOrganic: 5000,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T2'],
  },
  {
    id: 'HQ_SILO_T4',
    branch: 'HEADQUARTERS',
    tier: 4,
    name: 'Sub-Silo Expansion Unit 4',
    code: 'HQ-SILO-4',
    slot: 0,
    description: 'High-density compact storage arrays with automated zero-g gantry hoists.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 160,000 M / 160,000 O).',
    costMetallic: 15000,
    costOrganic: 7500,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T3'],
  },
  {
    id: 'HQ_SILO_T5',
    branch: 'HEADQUARTERS',
    tier: 5,
    name: 'Sub-Silo Expansion Unit 5',
    code: 'HQ-SILO-5',
    slot: 0,
    description: 'Reinforced subterranean structural baffles providing resilient deep-core stockpiling.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 175,000 M / 175,000 O).',
    costMetallic: 22000,
    costOrganic: 11000,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T4'],
  },
  {
    id: 'HQ_SILO_T6',
    branch: 'HEADQUARTERS',
    tier: 6,
    name: 'Sub-Silo Expansion Unit 6',
    code: 'HQ-SILO-6',
    slot: 0,
    description: 'Composite bulkhead insulation shielding high-volume resource reserves from cosmic radiation.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 190,000 M / 190,000 O).',
    costMetallic: 30000,
    costOrganic: 15000,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T5'],
  },
  {
    id: 'HQ_SILO_T7',
    branch: 'HEADQUARTERS',
    tier: 7,
    name: 'Sub-Silo Expansion Unit 7',
    code: 'HQ-SILO-7',
    slot: 0,
    description: 'Multi-tiered robotic sortation silos expediting inventory transfer and mass clamping.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 205,000 M / 205,000 O).',
    costMetallic: 40000,
    costOrganic: 20000,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T6'],
  },
  {
    id: 'HQ_SILO_T8',
    branch: 'HEADQUARTERS',
    tier: 8,
    name: 'Sub-Silo Expansion Unit 8',
    code: 'HQ-SILO-8',
    slot: 0,
    description: 'Gravimetrically insulated stockpile spheres compressing bulk raw materials into dense lattice storage.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 220,000 M / 220,000 O).',
    costMetallic: 55000,
    costOrganic: 27500,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T7'],
  },
  {
    id: 'HQ_SILO_T9',
    branch: 'HEADQUARTERS',
    tier: 9,
    name: 'Sub-Silo Expansion Unit 9',
    code: 'HQ-SILO-9',
    slot: 0,
    description: 'Advanced vacuum-sealed vaults preventing thermal degradation of synthetic biomatter.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 235,000 M / 235,000 O).',
    costMetallic: 72000,
    costOrganic: 36000,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T8'],
  },
  {
    id: 'HQ_SILO_T10',
    branch: 'HEADQUARTERS',
    tier: 10,
    name: 'Sub-Silo Expansion Unit 10',
    code: 'HQ-SILO-10',
    slot: 0,
    description: 'Apex orbital reserve megavaults providing unparalleled strategic stockpiling capacity.',
    effects: '+15,000 Metallic & Organic Storage Cap (Total: 250,000 M / 250,000 O).',
    costMetallic: 95000,
    costOrganic: 48000,
    totalTicks: 300,
    prereqs: ['HQ_SILO_T9'],
  },

  // --- MODULAR REFINERY TRACKS (Tiers 2, 4, 6, 8, 10, Slot 1) & TIER 1 BUILDINGS EXPANSION ---
  {
    id: 'HQ_BUILDINGS_EXPANSION',
    branch: 'HEADQUARTERS',
    tier: 1,
    name: 'Buildings Expansion',
    code: 'HQ-BLD-EXP',
    slot: 1,
    description: 'Structural outrigger docking rings mounted on the Yestiri City Ship HQ hull, expanding research orbital module capacity by 3 (up to 6 total).',
    effects: '+3 Research Orbital Pod Capacity on City Ship HQ (Max 6 pods).',
    costMetallic: 6000,
    costOrganic: 3000,
    totalTicks: 300,
    prereqs: [],
  },
  {
    id: 'HQ_REF_T2',
    branch: 'HEADQUARTERS',
    tier: 2,
    name: 'Auxiliary Refinery Track I',
    code: 'HQ-REF-1',
    slot: 1,
    description: 'High-capacity secondary centrifugal distillation column boosting crude ore cracking throughput at HQ Citadel.',
    effects: '+10.0 Ore/s processing speed (Total: 20/s), +4,000 HQ Ore storage (Total: 20,000).',
    costMetallic: 5000,
    costOrganic: 3000,
    totalTicks: 300,
    prereqs: [],
  },
  {
    id: 'HQ_REF_T4',
    branch: 'HEADQUARTERS',
    tier: 4,
    name: 'Auxiliary Refinery Track II',
    code: 'HQ-REF-2',
    slot: 1,
    description: 'Parallel plasma-arc smelting conduit integrating tertiary slag scrubbers for accelerated mineral separation.',
    effects: '+10.0 Ore/s processing speed (Total: 30/s), +4,000 HQ Ore storage (Total: 24,000).',
    costMetallic: 12000,
    costOrganic: 7000,
    totalTicks: 300,
    prereqs: ['HQ_REF_T2'],
  },
  {
    id: 'HQ_REF_T6',
    branch: 'HEADQUARTERS',
    tier: 6,
    name: 'Auxiliary Refinery Track III',
    code: 'HQ-REF-3',
    slot: 1,
    description: 'Quaternary magnetic resonance extraction loop designed for rapid catalytic breakdown of dense metal ores.',
    effects: '+10.0 Ore/s processing speed (Total: 40/s), +4,000 HQ Ore storage (Total: 28,000).',
    costMetallic: 25000,
    costOrganic: 14000,
    totalTicks: 300,
    prereqs: ['HQ_REF_T4'],
  },
  {
    id: 'HQ_REF_T8',
    branch: 'HEADQUARTERS',
    tier: 8,
    name: 'Auxiliary Refinery Track IV',
    code: 'HQ-REF-4',
    slot: 1,
    description: 'High-flux antimatter pre-heaters vaporizing impurities prior to fractional element deposition.',
    effects: '+10.0 Ore/s processing speed (Total: 50/s), +4,000 HQ Ore storage (Total: 32,000).',
    costMetallic: 48000,
    costOrganic: 26000,
    totalTicks: 300,
    prereqs: ['HQ_REF_T6'],
  },
  {
    id: 'HQ_REF_T10',
    branch: 'HEADQUARTERS',
    tier: 10,
    name: 'Apex Catalytic Siphon Array',
    code: 'HQ-REF-APEX',
    slot: 1,
    description: 'Unified sub-atomic cracking manifolds maximizing raw asteroid ore refining to theoretical thermodynamic peak.',
    effects: '+10.0 Ore/s processing speed (Total: 60/s), +4,000 HQ Ore storage (Total: 36,000).',
    costMetallic: 90000,
    costOrganic: 45000,
    totalTicks: 300,
    prereqs: ['HQ_REF_T8'],
  },

  // --- MISSILE VOLLEY AUTOLOADERS & BATTERY TUNING (Tiers 2, 5, 8, 10, Slot 2) ---
  {
    id: 'HQ_MSL_MOD3C',
    branch: 'HEADQUARTERS',
    tier: 2,
    name: 'Mod 3C Launchers',
    code: 'HQ-MSL-3C',
    slot: 2,
    description: 'Pneumatic assist rams and rapid-cycling breech blocks fitted to Citadel and defensive missile batteries.',
    effects: 'Reduces HQ Missile Battery reload cycle time by -10% (Increases salvo frequency).',
    costMetallic: 6000,
    costOrganic: 1500,
    totalTicks: 300,
    prereqs: [],
  },
  {
    id: 'HQ_MSL_MOD7B',
    branch: 'HEADQUARTERS',
    tier: 5,
    name: 'Mod 7B Launchers',
    code: 'HQ-MSL-7B',
    slot: 2,
    description: 'Hydraulic pre-tensioned canister feeds and synchronized ignition timing circuits.',
    effects: 'Additional -8% reload cycle time (Additive total: -18%).',
    costMetallic: 18000,
    costOrganic: 4500,
    totalTicks: 300,
    prereqs: ['HQ_MSL_MOD3C'],
  },
  {
    id: 'HQ_MSL_MOD11X',
    branch: 'HEADQUARTERS',
    tier: 8,
    name: 'Mod 11X Launchers',
    code: 'HQ-MSL-11X',
    slot: 2,
    description: 'Superconducting magnetic rack accelerators ejecting torpedoes clear of hull before booster ignition.',
    effects: 'Additional -8% reload cycle time (Additive total: -26%).',
    costMetallic: 42000,
    costOrganic: 10000,
    totalTicks: 300,
    prereqs: ['HQ_MSL_MOD7B'],
  },
  {
    id: 'HQ_MSL_FEEDER',
    branch: 'HEADQUARTERS',
    tier: 10,
    name: 'Continuous Magnetic Feeder Array',
    code: 'HQ-MSL-FEEDER',
    slot: 2,
    description: 'Zero-delay continuous rotary rail autoloaders delivering sustained volley barrage capability.',
    effects: 'Additional -10% reload cycle time (Additive total: -36%).',
    costMetallic: 85000,
    costOrganic: 20000,
    totalTicks: 300,
    prereqs: ['HQ_MSL_MOD11X'],
  },

  // =======================================================================
  // INDEPENDENT SENSOR RESEARCH NODES (Active Radar vs Passive Detection)
  // =======================================================================
  {
    id: 'TECH_RADAR_1',
    branch: 'EXPANSION',
    tier: 1,
    name: 'Active Radar Array I',
    code: 'RAD-1',
    description: 'High-frequency phased-array radar transmitters projecting synchronized pulse sweeps across the local sector.',
    effects: '+20% Active Radar Range and tactical lock-on horizon.',
    costMetallic: 800,
    costOrganic: 400,
    totalTicks: 300,
  },
  {
    id: 'TECH_RADAR_2',
    branch: 'EXPANSION',
    tier: 3,
    name: 'Active Radar Array II',
    code: 'RAD-2',
    description: 'Super-heterodyne multi-beam active radar emitters with synthetic aperture tracking for rapid resolution.',
    effects: '+20% Active Radar Range and tactical lock-on horizon.',
    costMetallic: 1600,
    costOrganic: 800,
    totalTicks: 300,
    prereqs: ['TECH_RADAR_1'],
  },
  {
    id: 'TECH_PASSIVE_SENSORS_1',
    branch: 'EXPANSION',
    tier: 1,
    name: 'Passive Thermal Array I',
    code: 'PAS-1',
    description: 'Cryogenically cooled bolometers and infrared sensors capturing faint emission signatures and drive plumes.',
    effects: '+25% Passive Sensor Detection Range (energy blobs).',
    costMetallic: 600,
    costOrganic: 600,
    totalTicks: 300,
  },
  {
    id: 'TECH_PASSIVE_SENSORS_2',
    branch: 'EXPANSION',
    tier: 3,
    name: 'Passive Gravimetric Array II',
    code: 'PAS-2',
    description: 'Quantum gravity interferometers and subspace distortion receivers registering mass movement at extreme ranges.',
    effects: '+25% Passive Sensor Detection Range (energy blobs).',
    costMetallic: 1500,
    costOrganic: 1500,
    totalTicks: 300,
    prereqs: ['TECH_PASSIVE_SENSORS_1'],
  },
];

/**
 * Checks whether a given structure type is unlocked based on completed research nodes
 */
export function isStructureUnlocked(
  structureType: StructureType,
  completedTechs: Set<string>
): boolean {
  if (
    structureType === 'PD_PLATFORM' ||
    structureType === 'MISSILE_BATTERY' ||
    structureType === 'GARN_MISSILE_POD'
  ) {
    return completedTechs.has('mil-t1-defgrid') || completedTechs.has('mil-t1') || completedTechs.has('mil-t2');
  }
  if (structureType === 'ORBITAL_REFINERY') {
    return completedTechs.has('civ-t2');
  }
  if (structureType === 'BASTION') {
    return completedTechs.has('exp-t6');
  }
  if (structureType === 'SY_MEDIUM') {
    for (const id of completedTechs) {
      if (id.startsWith('civ-t')) {
        const tier = parseInt(id.slice(5), 10);
        if (!isNaN(tier) && tier >= 3) return true;
      }
      if (id.startsWith('mil-t')) {
        const tier = parseInt(id.slice(5), 10);
        if (!isNaN(tier) && tier >= 4) return true;
      }
    }
    return false;
  }
  if (structureType === 'SY_HEAVY') {
    for (const id of completedTechs) {
      if (id.startsWith('mil-t')) {
        const tier = parseInt(id.slice(5), 10);
        if (!isNaN(tier) && tier >= 7) return true;
      }
    }
    return false;
  }
  return true;
}

/**
 * Calculates deterministic synthesis ticks for research nodes based on tier.
 * Baseline: Tier 1 = 10.0 seconds (300 ticks at 30Hz)
 * Median: Tier 10 = ~300.0 seconds (9,000 ticks at 30Hz)
 */
export function getDefaultTierTicks(tier: number, isCapstone: boolean = false): number {
  switch (tier) {
    case 1: return 300;   // 10.0s (Tier 1 baseline)
    case 2: return 750;   // 25.0s
    case 3: return 1350;  // 45.0s
    case 4: return 2250;  // 75.0s
    case 5: return 3300;  // 110.0s
    case 6: return 4650;  // 155.0s
    case 7: return 6000;  // 200.0s
    case 8: return 7350;  // 245.0s
    case 9: return 8400;  // 280.0s
    case 10: return isCapstone ? 9450 : 8850; // 315.0s for capstone super-flagships/citadels, 295.0s standard (~300.0s median)
    default: return 300;
  }
}

// Normalize alias fields, calculate tier-scaled deterministic research ticks, and deeply freeze each node definition
for (let i = 0; i < TECH_CATALOG.length; i++) {
  const node = TECH_CATALOG[i];
  node.costM = node.costMetallic;
  node.costO = node.costOrganic;
  const isCapstone = node.tier === 10 && (
    node.id === 'mil-t10' || node.id === 'mil-t10-carrier' ||
    node.id === 'civ-t10' || node.id === 'exp-t10'
  );
  node.totalTicks = getDefaultTierTicks(node.tier, isCapstone);
  node.researchTicks = node.totalTicks;
  Object.freeze(node);
}

// Freeze the 120-node array
Object.freeze(TECH_CATALOG);

/**
 * Fast O(1) ID-to-Node immutable dictionary lookup map
 */
export const RESEARCH_CATALOG: Readonly<Record<string, TechNodeDefinition>> = Object.freeze(
  TECH_CATALOG.reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {} as Record<string, TechNodeDefinition>)
);

/**
 * Precomputed, immutable 10-Tier x 4-Slot branch grids for zero-allocation UI rendering
 */
function buildBranchGrid(branch: ResearchBranch): readonly (readonly (TechNodeDefinition | null)[])[] {
  const grid: (TechNodeDefinition | null)[][] = Array.from({ length: 10 }, () => [
    null,
    null,
    null,
    null,
  ]);

  const branchNodes = TECH_CATALOG.filter((n) => n.branch === branch).sort(
    (a, b) => a.tier - b.tier
  );

  const tierCounts = new Array(10).fill(0);
  for (const node of branchNodes) {
    const tierIdx = Math.max(0, Math.min(9, node.tier - 1));
    const slotIdx = node.slot !== undefined ? node.slot : tierCounts[tierIdx];
    if (slotIdx >= 0 && slotIdx < 4) {
      grid[tierIdx][slotIdx] = node;
      tierCounts[tierIdx] = Math.max(tierCounts[tierIdx], slotIdx + 1);
    }
  }

  for (let t = 0; t < 10; t++) {
    Object.freeze(grid[t]);
  }
  return Object.freeze(grid);
}

export const STATIC_BRANCH_GRIDS: Readonly<
  Record<ResearchBranch, readonly (readonly (TechNodeDefinition | null)[])[]>
> = Object.freeze({
  MILITARY: buildBranchGrid('MILITARY'),
  CIVILIAN: buildBranchGrid('CIVILIAN'),
  EXPANSION: buildBranchGrid('EXPANSION'),
  HEADQUARTERS: buildBranchGrid('HEADQUARTERS'),
});

const EMPTY_PREREQS: readonly string[] = Object.freeze([]);

/**
 * O(1) direct dictionary lookup to check if a technology node is unlocked
 */
export function isTechUnlocked(
  nodeId: string,
  completedNodes?: Set<string> | readonly string[] | string[] | null
): boolean {
  if (!nodeId || !completedNodes) return false;
  if (completedNodes instanceof Set) {
    return completedNodes.has(nodeId);
  }
  if (Array.isArray(completedNodes)) {
    return completedNodes.includes(nodeId);
  }
  return false;
}

/**
 * O(1) direct dictionary lookup for tech resource costs and durations
 */
export function getTechCost(nodeId: string): {
  metallic: number;
  organic: number;
  costM: number;
  costO: number;
  totalTicks: number;
  researchTicks: number;
} | undefined {
  const node = RESEARCH_CATALOG[nodeId];
  if (!node) return undefined;
  return {
    metallic: node.costMetallic,
    organic: node.costOrganic,
    costM: node.costMetallic,
    costO: node.costOrganic,
    totalTicks: node.totalTicks,
    researchTicks: node.totalTicks,
  };
}

/**
 * O(1) direct lookup for tech prerequisites
 */
export function getNodePrereqs(nodeId: string): readonly string[] {
  const node = RESEARCH_CATALOG[nodeId];
  if (!node) return EMPTY_PREREQS;
  if (node.prereqs) return node.prereqs;
  return EMPTY_PREREQS;
}

/**
 * O(1) direct lookup for tech definition by ID with optional faction context
 */
export function getNode(nodeId: string, faction?: string): TechNodeDefinition | undefined {
  if (faction && faction !== 'NOVAN') {
    const catalog = getFactionTechCatalog(faction as any);
    const found = catalog.find(n => n.id === nodeId);
    if (found) return found;
  }
  return RESEARCH_CATALOG[nodeId];
}

/**
 * Builds a faction-diverged technology catalog respecting lore, specialty, and balance
 */
export function getFactionTechCatalog(faction: string = 'NOVAN'): TechNodeDefinition[] {
  if (!faction || faction === 'NOVAN') {
    return TECH_CATALOG;
  }

  const facNorm = faction.toUpperCase();

  return TECH_CATALOG.map((baseNode) => {
    const node: TechNodeDefinition = { ...baseNode };

    if (facNorm === 'GARN') {
      // Garn Hegemony: Fortress bastions, +65% armor, +35% shields, +50% metallic, -20% organic
      node.costMetallic = Math.round(node.costMetallic * 1.50);
      node.costOrganic = Math.round(node.costOrganic * 0.80);
      if (node.id === 'mil-t1') {
        node.name = 'Garn Escort & Line Battery Clearance';
        node.description = 'Heavily armored line escort chassis and integrated point-defense missile telemetry.';
      } else if (node.id === 'mil-t1-armor' || node.id === 'mil-t2-bulkhead' || node.id === 'mil-t4-armor' || node.id === 'mil-t8-armor') {
        node.name = `Garn Bastion Plate ${node.tier > 1 ? `Mark ${node.tier}` : 'Alpha'}`;
        node.effects = 'Passive Composite Armor HP +15% and Point-Defense Interception +5%';
      } else if (node.id === 'mil-t1-defgrid' || node.id === 'exp-t6') {
        node.name = 'Garn Theater Fortress Bastion Array';
        node.description = 'Extreme-range missile defense grid with over-the-horizon active radar lock telemetry.';
      } else if (node.id === 'mil-t10') {
        node.name = 'Garn Citadel Dreadnought Blueprint';
        node.description = 'Impenetrable fortress dreadnought with massive kinetic siege batteries and heavy barrier shields.';
      }
    } else if (facNorm === 'ALDONAH') {
      // Alondahan Monarchy: Slab armor, brawler close-quarters, +50% refinery conversion, -10% metallic, +20% organic
      node.costMetallic = Math.round(node.costMetallic * 0.90);
      node.costOrganic = Math.round(node.costOrganic * 1.20);
      if (node.id === 'civ-t1-smelt' || node.id === 'civ-t2' || node.id === 'civ-t4-refine' || node.id === 'civ-t6-slag') {
        node.name = `Alondahan Superheated Crucible ${node.tier > 1 ? `Tier ${node.tier}` : 'Alpha'}`;
        node.effects = 'Refinery Ore Conversion Throughput +50% and Smelting Heat Tolerance';
      } else if (node.id === 'mil-t1-armor' || node.id === 'mil-t3-citadel' || node.id === 'mil-t7-armor') {
        node.name = `Alondahan Slab Armor Laminate Tier ${node.tier}`;
        node.effects = 'Armor Hit Points +20% and Flat Kinetic/Thermal Mitigation +10%';
      } else if (node.id === 'mil-t1') {
        node.name = 'Alondahan Brawler Line Escort Authorization';
      }
    } else if (facNorm === 'YESTIRI') {
      // Yestiri Sodality: Ring-ships, +40% resonant shields, +20% beam range, no frigates, DD unlocked at baseline
      if (node.id === 'mil-t1') {
        node.name = 'Yestiri Destroyer Hull (Baseline Active)';
        node.description = 'Annular ring chassis with open center; foundational escort ship already commissioned at baseline.';
        node.effects = 'Immediate Baseline Access to DD Class Destroyer Ring Hull.';
      } else if (node.id === 'mil-t1-shield' || node.id === 'mil-t3-shield' || node.id === 'mil-t5-barrier' || node.id === 'mil-t9-shield') {
        node.name = `Annular Resonant Shield Matrix ${node.tier}`;
        node.effects = 'Resonant Barrier Shield Capacity +25% and Harmonic Distortion Field';
      } else if (node.id === 'mil-t10') {
        node.name = 'Yestiri City-Ship Civilization Citadel Protocol';
        node.description = 'Self-contained mobile biosphere and supreme flagship constructed with 100 Neridium.';
      }
    } else if (facNorm === 'LIAAL') {
      // Liaal Consortium: Proxy buy powers, 3 fragile warships (20/45/100 salvo), 2x cargo, 2.5x freighters, 30% terraforming discount
      if (node.id === 'mil-t1') {
        node.name = 'L-WS Light Warship & Proxy Procurement Network';
        node.effects = 'Unlocks Light Warship (20-Missile Salvo) + Proxy Commissioning of Allied Hulls.';
      } else if (node.id === 'mil-t4') {
        node.name = 'M-WS Medium Warship 45-Salvo Battery';
        node.effects = 'Unlocks Medium Warship (45-Missile Salvo) and Allied Cruiser Proxy Licensing.';
      } else if (node.id === 'mil-t8') {
        node.name = 'H-WS Heavy Warship 100-Salvo Titan';
        node.effects = 'Unlocks Heavy Warship (100-Missile Salvo) and Allied Capital Proxy Licensing.';
      } else if (node.id === 'civ-t1' || node.id === 'civ-t3' || node.id === 'civ-t5' || node.id === 'civ-t7' || node.id === 'civ-t9') {
        node.name = `Liaal Planetary Bio-Dome & Logistics Array ${node.tier}`;
        node.effects = 'Colony Growth +50%, Cargo Capacity +100%, and Terraforming Cost Discount -30%';
      }
    } else if (facNorm === 'KOVAK') {
      // Kovak Enclave: Volume over quality, 50% cost & build times, 40% durability, +10% swarm velocity
      node.costMetallic = Math.max(50, Math.round(node.costMetallic * 0.50));
      node.costOrganic = Math.max(20, Math.round(node.costOrganic * 0.50));
      node.totalTicks = Math.max(100, Math.round(node.totalTicks * 0.50));
      if (node.id === 'mil-t1') {
        node.name = 'Kovak Swarm Frigate Rapid-Printing Matrix';
        node.description = 'Angular rhomboid mass-fabrication templates for rapid swarm deployment at half resource cost.';
      } else if (node.id === 'mil-t1-thruster' || node.id === 'mil-t3-maneuver' || node.id === 'mil-t5-prop' || node.id === 'mil-t7-vector') {
        node.name = `Kovak Swarm Overdrive Thruster ${node.tier}`;
        node.effects = 'Swarm Sublight Velocity +15% and Acceleration Curves +20%';
      } else if (node.id === 'civ-t1' || node.id === 'civ-t4' || node.id === 'civ-t8') {
        node.name = `Mass-Fabrication Nano-Forge Tier ${node.tier}`;
        node.effects = 'Universal Hull Fabrication Time -50% and Strategic Material Consumption Halved';
      }
    }

    node.costM = node.costMetallic;
    node.costO = node.costOrganic;
    node.researchTicks = node.totalTicks;

    return node;
  });
}

/**
 * Precomputed, immutable faction-aware branch grids for zero-allocation UI rendering
 */
const FACTION_BRANCH_GRIDS_CACHE = new Map<string, Record<ResearchBranch, readonly (readonly (TechNodeDefinition | null)[])[]>>();

export function getBranchGridForFaction(
  branch: ResearchBranch,
  faction: string = 'NOVAN'
): readonly (readonly (TechNodeDefinition | null)[])[] {
  const facKey = (faction || 'NOVAN').toUpperCase();
  if (facKey === 'NOVAN') {
    return STATIC_BRANCH_GRIDS[branch];
  }

  let grids = FACTION_BRANCH_GRIDS_CACHE.get(facKey);
  if (!grids) {
    const catalog = getFactionTechCatalog(facKey);
    const buildGridForCatalog = (b: ResearchBranch) => {
      const grid: (TechNodeDefinition | null)[][] = Array.from({ length: 10 }, () => [
        null,
        null,
        null,
        null,
      ]);
      const branchNodes = catalog.filter((n) => n.branch === b).sort((x, y) => x.tier - y.tier);
      const tierCounts = new Array(10).fill(0);
      for (const node of branchNodes) {
        const tierIdx = Math.max(0, Math.min(9, node.tier - 1));
        const slotIdx = node.slot !== undefined ? node.slot : tierCounts[tierIdx];
        if (slotIdx >= 0 && slotIdx < 4) {
          grid[tierIdx][slotIdx] = node;
          tierCounts[tierIdx] = Math.max(tierCounts[tierIdx], slotIdx + 1);
        }
      }
      for (let t = 0; t < 10; t++) {
        Object.freeze(grid[t]);
      }
      return Object.freeze(grid);
    };

    grids = {
      MILITARY: buildGridForCatalog('MILITARY'),
      CIVILIAN: buildGridForCatalog('CIVILIAN'),
      EXPANSION: buildGridForCatalog('EXPANSION'),
      HEADQUARTERS: buildGridForCatalog('HEADQUARTERS'),
    };
    FACTION_BRANCH_GRIDS_CACHE.set(facKey, grids);
  }

  return grids[branch];
}



