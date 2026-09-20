import type { NPCPatrolState } from './simulation/npcController';
export type { NPCPatrolState };

export interface SensorCoverageBubble {
  id: string;
  sourceEntityId: string;
  systemId: string;
  x: number;
  y: number;
  activeRadarRadius: number;   // Full visual/telemetry resolution (e.g. 8,000 - 15,000 km)
  passiveSensorRadius: number; // Thermal/gravimetric detection zone (e.g. 35,000 - 65,000 km)
}

export type EntityDetectionLevel = 'NONE' | 'PASSIVE' | 'ACTIVE_RADAR';
export type VisibilityTier = 'NONE' | 'PASSIVE' | 'RADAR';

export interface HostileVisibilityState {
  detectionLevel: EntityDetectionLevel;
  lastKnownPosition?: { x: number; y: number };
}

export interface Vec2D {
  x: number;
  y: number;
}

export type Faction = 'FRIENDLY' | 'HOSTILE';
export type ShipRole =
  | 'SCOUT'
  | 'CORVETTE'
  | 'CARGO'
  | 'FRIGATE'
  | 'DESTROYER'
  | 'LIGHT_CRUISER'
  | 'HEAVY_CRUISER'
  | 'CRUISER'
  | 'BATTLECRUISER'
  | 'BATTLESHIP'
  | 'DREADNOUGHT'
  | 'COLLIER'
  | 'TANKER'
  | 'REPAIR'
  | 'SCRAP'
  | 'BUILDER'
  | 'MINER'
  | 'HQ'
  | 'BASTION'
  | 'SY_LIGHT'
  | 'SY_MEDIUM'
  | 'SY_HEAVY'
  | 'CARRIER'
  | 'SUPER_CARRIER'
  | 'VANGUARD'
  | 'REP_SHIP'
  | 'SALVAGER'
  | 'MISSILE_BATTERY'
  | 'PD_PLATFORM'
  | 'REPAIR_BAY'
  | 'ORBITAL_REFINERY'
  | 'MILITARY_RESEARCH'
  | 'CIVIC_RESEARCH'
  | 'EXPANSION_CITADEL'
  | 'POST_SENSOR_SM'
  | 'POST_SENSOR_MD'
  | 'POST_SENSOR_LG'
  | 'MRS'
  | 'CRO'
  | 'EXC';

export type StructureType =
  | 'SY_LIGHT'
  | 'SY_MEDIUM'
  | 'SY_HEAVY'
  | 'MILITARY_RESEARCH'
  | 'CIVIC_RESEARCH'
  | 'EXPANSION_CITADEL'
  | 'POST_SENSOR_SM'
  | 'POST_SENSOR_MD'
  | 'POST_SENSOR_LG'
  | 'MISSILE_BATTERY'
  | 'PD_PLATFORM'
  | 'REPAIR_BAY'
  | 'ORBITAL_REFINERY'
  | 'BASTION'
  | 'MRS'
  | 'CRO'
  | 'EXC';

export interface ResearchStationCounts {
  military: number;
  civic: number;
  expansion: number;
}

export type BuilderState =
  | 'STATE_BUILDER_IDLE'
  | 'STATE_TRANSIT_TO_SCAFFOLD'
  | 'STATE_CONSTRUCTING'
  | 'STATE_RETURNING_TO_HQ'
  | 'STATE_IDLE'
  | 'BUILD_TRANSIT_TO_SITE'
  | 'BUILD_DEPOSIT_RESOURCES'
  | 'BUILD_FERRY_TO_HQ'
  | 'BUILD_RESUPPLY_AT_HQ'
  | 'BUILD_COMPLETE'
  | 'STATE_RESTOCK'
  | 'STATE_TRANSIT'
  | 'STATE_TRANSIT_SITE'
  | 'STATE_BUILDING';

export interface ConstructionScaffold {
  id: string;
  structureType: string;
  worldX: number;
  worldY: number;
  depositedM: number;
  totalM: number;
  depositedO: number;
  totalO: number;
  assignedBuilderId: string | null;
  orbitalParentId?: string;
  progressRatio?: number;
  costPaidM?: number;
  costPaidO?: number;
  buildTicks?: number;
}
export type HullState = 'OPERATIONAL' | 'CRIPPLED' | 'DESTROYED';
export type CombatStance = 'PASSIVE' | 'DEFENSIVE' | 'AGGRESSIVE';
export type AggressiveDoctrine = 'KILL' | 'DISABLE';

export type FormationDensity = 'TIGHT' | 'CLOSE' | 'LOOSE';
export type MovementCohesion = 'UNIT' | 'MAX_SPEED';
export type FleetPdPosture = 'AUTO' | 'CONSERVE' | 'FOCUS';

export interface FleetGroup {
  id: number; // 1 to 9
  name: string;
  shipIds: string[];
  flagshipId: string;
  density: FormationDensity;
  cohesion: MovementCohesion;
  pdPosture: FleetPdPosture;
  screenVanguard: boolean;
  speedCap?: number; // Cached fleet maximum speed clamp v_fleet_cap
}

export type JumpState = 
  | 'IDLE'
  | 'SPOOLING'        // Stationary charging; burns hydrogen
  | 'IN_TRANSIT'      // Traveling through void along vector at 64x speed
  | 'EMERGING'        // Braking down to sublight cruise upon arrival
  | 'TRANSIT'         // Backwards compatibility alias for IN_TRANSIT
  | 'COOLDOWN';       // Thermal recharge

export interface JumpTransitData {
  originSystemId: string;
  targetSystemId: string;
  destinationPoint: { x: number; y: number };
  departurePoint: { x: number; y: number };
  transitVector: { x: number; y: number }; // Normalized heading
  totalDistance: number;
  distanceTraveled: number;
  jumpSpeed: number; // 64 * cruiseSpeed
  spoolTicksRemaining: number;
  formationOffset: { x: number; y: number };
}

export interface ShipEntity {
  id: string;
  name: string;
  faction: Faction;
  role: ShipRole;
  combatStance: CombatStance;
  aggressiveDoctrine?: AggressiveDoctrine; // 'KILL': fires until dead | 'DISABLE': ceases fire when crippled, self-destructs in-flight
  pos: Vec2D;
  systemId?: string;
  velocity: Vec2D;
  heading: number;
  maxSpeed: number;
  cruiseSpeed?: number;
  acceleration?: number;
  angularSlewRate?: number;
  commandedSpeed?: number;
  radius?: number;
  renderedLength?: number;
  selectionRadius?: number;

  // Station-Keeping & Cached Polar Offsets
  formationOffset?: Vec2D;
  formationCosAlpha?: number;
  formationSinAlpha?: number;
  formationRadius?: number;
  formationFlagshipId?: string;

  // Hermite Spline Kinematics & Linear-Quadratic Burns
  splineActive: boolean;
  splineP0: Vec2D;
  splineM0: Vec2D;
  splineP1: Vec2D;
  splineM1: Vec2D;
  splineC1?: Vec2D;
  splineC2?: Vec2D;
  splineTrajectory?: any;
  splineT: number;
  splineDuration: number;
  angularVelocity?: number;

  // Propulsion & Propellant (Strictly FTL & Micro-Jumps)
  h2FuelMax: number;
  h2Fuel: number;
  fuelReserveRule: number; // 0.40 (40%)

  // Jump Drive Overhaul & Kinematics (64x Sublight Vector Transit)
  jumpState?: JumpState;
  jumpTransitData?: JumpTransitData;
  jumpSpoolTimer?: number;       // 3.0s charge time (90 ticks at 30Hz)
  jumpSpoolDuration?: number;    // 3.0s
  jumpCooldownTimer?: number;    // Exactly 15.0s cooldown
  jumpCooldownDuration?: number; // 15.0s
  jumpTarget?: Vec2D;            // Destination coordinates
  jumpOrigin?: Vec2D;            // Departure coordinates
  jumpFuelCost?: number;         // Estimated / committed H2 propellant cost
  jumpTransitDistance?: number;  // Total jump distance in km

  // Ordnance Magazines & Class Tubes
  missilesMax: number;
  missiles: number;
  missileTubes?: number; // Tubes per salvo (Frigate: 2, Destroyer: 4, Light Cruiser: 5, Heavy Cruiser: 7)
  counterMissiles: number;
  counterMissilesMax?: number;
  counterMissilesPerSalvo?: number; // Defense missiles per burst (Frigate: 1, Destroyer: 2, Light Cruiser: 4, Heavy Cruiser: 5)
  counterMissileCooldown: number; // 3.0s reload/overheat between defensive salvos
  missileCooldown: number;
  missileRange: number;

  // Tactical Automation & Command Matrix
  autoFire: boolean;
  totMode?: boolean;
  pdMode?: 'AUTO' | 'CONSERVE' | 'FOCUS';
  class?: string;                          // Naval hull abbreviation (e.g. 'FG', 'DD', 'CL', 'CH', 'BC', 'BB', 'DN')
  shipClass?: string;                      // Ship prototype class name (e.g. 'FRIGATE', 'DESTROYER', 'HEAVY_CRUISER')
  isAlive?: boolean;                       // Convenience live operational status
  hull?: number;                           // Direct alias for hullHp
  hp?: number;                             // Direct alias for hullHp
  maxHp?: number;                          // Direct alias for hullMax
  shield?: number;                         // Direct alias for shieldHp
  maxShield?: number;                      // Direct alias for shieldHpMax
  fuelH2?: number;                         // Direct alias for h2Fuel
  maxFuelH2?: number;                      // Direct alias for h2FuelMax
  speed?: number;                          // Current scalar speed in km/s
  vx?: number;                             // Direct x velocity component
  vy?: number;                             // Direct y velocity component
  mooredAnchorId?: string | null;          // Host planet or anchor entity ID
  weapons?: any[];                         // Modular weapon mounts array
  targetEntityId?: string | null;          // Persistent locked hostile target entity ID
  salvoCooldownTicksRemaining?: number;    // Discrete 30Hz salvo cooldown timer
  baseSalvoCooldownTicks?: number;         // Baseline salvo cooldown in 30Hz ticks (e.g. 54 ticks for 1.8s)

  // Direct-Fire Energy Weapons (Continuous Lasers & Heavy Grasers)
  offensiveLaserActive?: boolean;
  offensiveLaserTarget?: Vec2D | null;
  offensiveLaserTargetId?: string | null;
  offensiveLaserTimer?: number;
  offensiveLaserCooldown?: number;
  offensiveGraserActive?: boolean;
  offensiveGraserTarget?: Vec2D | null;
  offensiveGraserTargetId?: string | null;
  offensiveGraserTimer?: number;
  offensiveGraserCooldown?: number;

  // Layer 1: E-War Soft-Kill Jamming
  ewarJammingRating: number;

  // Layer 3: PDPLA (Point Defense Phased Array Lasers)
  pdplaRange: number;
  pdplaCooldown: number;
  pdBeams?: number; // Number of PD laser arrays (Frigate: 1, Destroyer: 1, Light Cruiser: 2, Heavy Cruiser: 3)
  pdplaActiveBeamTarget: Vec2D | null;
  pdplaActiveBeamTargets?: Vec2D[]; // Support for multiple concurrent beams
  pdplaBeamTimer: number;
  pdplaBeamHit?: boolean;
  pdplaSalvoCount?: number;       // Salvo burst count (max 5 bursts)
  pdplaOverheated?: boolean;      // Overheat lockout status
  pdplaOverheatTimer?: number;    // Lockout timer (5.0s)
  pdplaOverheatDuration?: number; // Total lockout duration (5.0s)
  pdplaIdleCooldown?: number;     // Idle heat dissipation timer

  // Layer 4: Thermal Deflector Shields
  shieldHpMax: number;
  shieldHp: number;
  shieldHeat: number;
  shieldHeatMax: number;
  shieldOverheated: boolean;
  shieldCooldownTimer: number;

  // Hardware Armament Mounts
  bowMissileTubes?: number;
  broadsideMissileTubesPort?: number;
  broadsideMissileTubesStbd?: number;
  totalMissileSalvo?: number;
  offensiveLasers?: number;
  offensiveGrasers?: number;
  counterMissileCells?: number;
  pointDefenseLasers?: number;

  // Layer 5: Hull Lifecycle
  hullMax: number;
  hullHp: number;
  maxRepairableHull: number;
  crippleBarMax: number;
  crippleBar: number;
  hullState: HullState;
  permanentFrameBuckled: boolean;

  // Sensors, Radar & Fog-of-War Horizon
  massRating: number;
  sensorRange?: number; // Active sensor/radar perimeter in km (8,400 km base)
  radarRange?: number;  // Active radar envelope
  radarRadius?: number; // Active radar radius in km
  passiveRange?: number; // Passive sensor horizon in km
  passiveRadius?: number; // Passive sensor radius in km
  baseRadar?: number;    // Baseline un-upgraded radar radius in km
  visibilityState?: 'RESOLVED' | 'BLIP_ONLY' | 'HIDDEN';
  visibilityTier?: VisibilityTier;
  rcsWeight?: number;
  x?: number;
  y?: number;
  fmsActive: boolean;
  fmsMultiplier: number;

  // Autonomous Patrol & Wandering AI
  patrolAnchor?: Vec2D | { x: number; y: number; radius?: number };
  patrolRadius?: number;
  patrolAngle?: number;
  patrolTimer?: number;
  patrolPattern?: 'FIGURE_EIGHT' | 'ELLIPSE_SWEEP' | 'ZIG_ZAG' | 'PERIMETER_BOX';
  patrolWaypoints?: Vec2D[];
  waypoints?: Vec2D[];
  activeMissiles?: MissileEntity[] | string[];
  patrolWaypointIndex?: number;
  patrolOrientation?: number;
  npcPatrolState?: NPCPatrolState;

  // Support & Auxiliary Logistics
  supportRadius?: number;              // 200px AOE field
  supportActiveTargets?: string[];     // IDs of ships currently receiving support in the AOE field
  scrapStored?: number;                // Scrap Barge property: 0
  scrapCapacity?: number;              // Scrap Barge property: 5000
  materialsStored?: {                  // Builder Unit property: 5,000 Metallic, 5,000 Organic, 5,000 Ore
    metallic: number;
    metallicMax: number;
    organic: number;
    organicMax: number;
    ore?: number;
    oreMax?: number;
  };

  // Orbital Structure & Construction Properties
  structureType?: StructureType;
  isStructure?: boolean;
  isUnderConstruction?: boolean;
  constructionState?: 'PENDING' | 'PENDING_RESTOCK' | 'TRANSITING' | 'BUILDING' | 'COMPLETED';
  constructionProgress?: number;       // 0.0 to 1.0
  constructionOpacity?: number;        // 0.15 up to 1.0
  constructionTimer?: number;          // 10.0s countdown
  constructionDuration?: number;       // 10.0s
  constructionTimeRemaining?: number;
  assignedBuilderId?: string;
  hostPlanetId?: string;
  repairMode?: 'PEACE' | 'COMBAT';
  activeRepairTargetId?: string | null;
  refineryAccumulator?: number;
  cargoMetallic?: number;
  cargoOrganic?: number;
  cargoCapacity?: { metallic?: number; organic?: number; ore?: number } | number;

  // Scaffold & Resource Delivery Tracking
  depositedM?: number;
  totalM?: number;
  depositedO?: number;
  totalO?: number;
  costPaidM?: number;
  costPaidO?: number;
  buildTicks?: number;
  worldX?: number;
  worldY?: number;
  scaffold?: ConstructionScaffold;

  // Builder Logistics State Machine
  builderState?: BuilderState;
  builderStatusTag?: string;           // e.g. "AWAITING HQ MATERIALS"
  builderTargetStructureId?: string | null;
  builderTargetPos?: Vec2D | null;
  builderTargetCost?: { metallic: number; organic: number } | null;
  targetStructureId?: string;
  targetStructureType?: StructureType;
  targetStructurePos?: Vec2D;

  // Station & Headquarters Properties
  isStationary?: boolean;
  defeatOnDestruction?: boolean;
  dockingRadius?: number;
  resources?: HQResources;
  refineryRate?: number;               // Ore converted per second (e.g. 25-30)
  refineryActive?: boolean;

  // Shared Production Queue (HQ Light Shipyard & Dedicated Shipyard)
  productionQueue?: ProductionQueueItem[];

  // Autonomous Miner State Machine & Stances
  minerStance?: MinerStance;           // 'CARELESS' | 'TIMID'
  minerState?: MinerState;
  minerTargetAsteroidId?: string | null;
  cargoOre?: number;
  cargoOreMax?: number;                // 1,000 ore hold capacity
  maxCargoOre?: number;                // 1,000 ore hold capacity alias
  miningLaserActive?: boolean;
  miningLaserTarget?: Vec2D | null;
  minerRetreating?: boolean;           // Active retreat steering flag
  minerThreatClearTicks?: number;      // Ticks elapsed with radar horizon clear of hostiles
  lastUnderAttackTick?: number;        // Tick when vessel was last hit or targeted
  isMiningVessel?: boolean;            // Explicit mining vessel kinematic flag
  minerClamped?: boolean;              // Tether clamped to asteroid during STATE_MINE
  minerClampedOffset?: Vec2D;          // Clamped offset relative to asteroid center
  minerHQOffset?: Vec2D;               // Synchronized station-keeping offset relative to HQ
  isStationKeeping?: boolean;          // Synchronized station-keeping hold flag
  transferBeamActive?: boolean;        // Visual industrial ore transfer beam active
  transferBeamTarget?: Vec2D | null;   // Visual industrial ore transfer beam target
  isHoldingVector?: boolean;           // Explicit vector hold state (speed === 0 retro-burn)

  // Planetary Gravity Well & Pirate Hierarchy
  inGravityWell?: boolean;
  gravityWellBody?: string | null;
  capturedReferenceFrame?: {
    id: string;
    name: string;
    type: 'PLANET' | 'GAS_GIANT' | 'MOON' | 'ASTEROID_CLUSTER';
    center: Vec2D;
    localOffset: Vec2D;
  };
  isMoored?: boolean;
  isPirate?: boolean;
  isPirateBastion?: boolean;
  isRovingPirate?: boolean;
  rovingFleetId?: string;
  gravityWellTetherPlanetId?: string;
}

export type AsteroidTier = 'SMALL' | 'MEDIUM' | 'LARGE';

export interface AsteroidEntity {
  id: string;
  pos: Vec2D;
  x?: number;
  y?: number;
  systemId?: string;
  isDepleted?: boolean;
  tier: AsteroidTier;
  oreCapacity: number;
  oreRemaining: number;
  radius: number;
  vertices: Vec2D[];                   // Irregular faceted gray polygon nodes
  facets?: Vec2D[];                    // Faceted body polygon vertices
  craters?: { x: number; y: number; r: number }[]; // Crater ore vein markers
  rotation: number;
  rotationSpeed: number;
  clusterId?: string;
  clusterOffset?: Vec2D;
  isAmbient?: boolean;
  orbitalRadius?: number;
  orbitalAngle?: number;
  orbitalSpeed?: number;
}

export type MinerState =
  | 'STATE_SEEK'
  | 'STATE_MINE'
  | 'STATE_RETURN'
  | 'STATE_UNLOAD'
  | 'STATE_EVADING_HOSTILE'
  | 'STATE_TRANSIT_TO_HQ'
  | 'STATE_DOCKING_OFFLOAD'
  | 'STATE_TRANSIT_TO_ASTEROID'
  | 'STATE_OFFLOAD';
export type MinerStance = 'CARELESS' | 'TIMID';

export interface MinerEntity extends ShipEntity {
  minerStance: MinerStance; // Default: 'TIMID'
  cargoOre: number;
  maxCargoOre: number; // 1,000
}

// --- CELESTIAL BODIES & PROCEDURAL SOLAR SYSTEM ---
export interface CentralStar {
  name: string;
  pos: Vec2D;                          // strictly { x: 0, y: 0 }
  radius: number;                      // radiant disc radius
  coronaRadius: number;                // emissive corona radius
  color: string;
  spectralClass: string;
}

export interface MoonEntity {
  id: string;
  name: string;
  parentPlanetId: string;
  parentPlanetName: string;
  orbitalRadius: number;               // local orbital radius around parent planet
  orbitalAngle: number;
  orbitalSpeed: number;
  pos: Vec2D;
  radius: number;                      // R_sprite (20px to 45px)
  color: string;
  gravityRating: number;
  wellRadius?: number;
  wellRadiusSq?: number;
}

export interface AsteroidNode {
  id: string;
  systemId: string;
  clusterId?: string;
  x: number;
  y: number;
  radius: number;
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
  oreRemaining: number;
  maxOre: number;
  isDepleted: boolean;
  pos?: Vec2D;
  position?: { x: number; y: number };
  tier?: 'SMALL' | 'MEDIUM' | 'LARGE' | string;
  remainingOre?: number;
  isAmbient?: boolean;
  clusterOffset?: Vec2D;
  orbitalRadius?: number;
  orbitalAngle?: number;
  orbitalSpeed?: number;
  systemIndex?: number;
  systemCenter?: Vec2D;
  [key: string]: any;
}

export interface AsteroidCluster {
  id: string;
  systemId: string;
  center: { x: number; y: number };
  radius: number;
  gravityWellRadius: number; // Moorable/capturable well (2,500km)
  asteroidIds: string[];
  isMoorable: boolean;
  name?: string;
  orbitalRadius?: number;
  orbitalAngle?: number;
  orbitalSpeed?: number;
  envelopeRadius?: number;
  wellRadius?: number;
  isAsteroidCluster?: boolean;
  baseRadiusPerNode?: number;
  memberCount?: number;
  velocity?: Vec2D;
  [key: string]: any;
}

export interface RockyPlanet {
  id: string;
  name: string;
  orbitalRadius: number;               // inside asteroid belt (2,500px to 10,500px)
  orbitalAngle: number;
  orbitalSpeed: number;
  pos: Vec2D;
  radius: number;                      // 65px to 130px
  habitable: boolean;                  // exactly one is guaranteed true; others 12% roll
  isPrimaryHabitable: boolean;         // receiving player HQ
  gravityRating: number;               // e.g. 1.00g (clamped between 0.85g and 1.05g for Terran)
  wellRadius?: number;
  wellRadiusSq?: number;
  baseColor: string;
  oceanColor?: string;
  atmosphereColor?: string;
  surfacePatternSeed: number;
  moons?: MoonEntity[];
  planetClass?: 'TERRAN' | 'DESERT' | 'ICE' | 'VOLCANIC' | 'BARREN' | 'OCEANIC';
  planetType?: 'TERRAN' | 'DESERT' | 'ICE' | 'VOLCANIC' | 'BARREN' | 'OCEANIC';
  colonized?: boolean;
  colonyGovernance?: boolean;
  resourceYieldRate?: { metallic: number; organic: number };
  structureSlots?: number;
}

export interface GasGiant {
  id: string;
  name: string;
  orbitalRadius: number;               // beyond asteroid belt (17,500px to 31,000px)
  orbitalAngle: number;
  orbitalSpeed: number;
  pos: Vec2D;
  radius: number;                      // 240px to 420px
  hydrogen: boolean;                   // 30% independent roll (tag for fuel/future)
  gravityRating: number;
  wellRadius?: number;
  wellRadiusSq?: number;
  baseColor: string;
  bandColors: string[];
  ringSystem?: {
    innerRadius: number;
    outerRadius: number;
    color: string;
    opacity: number;
  };
  moons?: MoonEntity[];
}

export interface CometEntity {
  id: string;
  name: string;
  semiMajorAxis: number;               // 18,000px to 28,000px
  eccentricity: number;                // 0.75 to 0.88 high-eccentricity
  inclinationAngle: number;            // orientation of elliptical orbit in radians
  meanAnomaly: number;                 // current mean anomaly [0, 2*PI)
  orbitalPeriod: number;               // seconds per orbit
  pos: Vec2D;
  velocity: Vec2D;
  nucleusRadius: number;               // 10px to 16px
  tailLength: number;                  // 180px to 450px
  mystery: boolean;                    // placeholder tag: strictly true
}

export interface SolarSystem {
  seed: number;
  arenaRadius: number;                 // 25,000px to 35,000px
  star: CentralStar;
  rockyPlanets: RockyPlanet[];
  primaryHabitablePlanet: RockyPlanet;
  gasGiants: GasGiant[];
  comets: CometEntity[];
  beltRadiusMin: number;               // ~12,000px
  beltRadiusMax: number;               // ~16,000px
  asteroidCount: number;
  clusters: AsteroidCluster[];
}

import type {
  PlanetEntity,
  PatrolRoute,
} from './simulation/celestialTypes';

export interface StarSystemDescriptor {
  id: string;
  index: number;
  name: string;
  center: { x: number; y: number };
  starRadius: number;
  deepSpaceBoundaryRadius: number; // 130,000 km outer perimeter
  planets: PlanetEntity[];
  clusters: AsteroidCluster[];
  asteroids: AsteroidNode[];
  systemBoundaryRadius?: number;
  solarSystem?: any;
  starType?: string;
  starColor?: string;
  gravityWellRadius?: number;
  patrolRoutes?: PatrolRoute[];
  systemType?: string;
  arenaRadius?: number;
  beltRadiusMin?: number;
  beltRadiusMax?: number;
  sensorInterference?: number;
  rockyPlanets?: any[];
  gasGiants?: any[];
  comets?: any[];
  [key: string]: any;
}

export type {
  GalaxyConfiguration,
  PlanetEntity,
  PatrolRoute,
  GalaxyGenerationResult,
} from './simulation/celestialTypes';


export type NavalUnitRole =
  | 'FRIGATE'
  | 'DESTROYER'
  | 'LIGHT_CRUISER'
  | 'HEAVY_CRUISER'
  | 'BATTLECRUISER'
  | 'BATTLESHIP'
  | 'DREADNOUGHT'
  | 'MINER'
  | 'COLLIER'
  | 'TANKER'
  | 'REPAIR'
  | 'REP_SHIP'
  | 'SCRAP'
  | 'SALVAGER'
  | 'CARRIER'
  | 'SUPER_CARRIER'
  | 'VANGUARD';

export interface ProductionQueueItem {
  id: string;
  unitRole: NavalUnitRole;
  name: string;
  code?: string;
  buildTimeTotal: number;
  buildTimeRemaining: number;
  costMetallic: number;
  costOrganic: number;
}

export interface HQResources {
  ore: number;
  maxOre: number;       // 16,000
  metallic: number;
  maxMetallic: number;  // 100,000
  organic: number;
  maxOrganic: number;   // 100,000
}

export type MissileStatus = 'TRACKING' | 'SPOOFED' | 'OVERFLIGHT';
export type MissileClass = 'LIGHT' | 'MEDIUM' | 'HEAVY';

export interface MissileEntity {
  id: string;
  origin: Vec2D;
  pos: Vec2D;
  targetId: string;
  sourceShipId?: string;
  faction: Faction;
  speed: number;
  maxLifetime: number;
  lifetime: number;
  alive: boolean;
  damage: number;
  visualSeed: number;
  trail: Vec2D[];
  trailSampleTimer: number;

  // Missile Status & Airframe Class
  visibilityTier?: VisibilityTier;
  status?: MissileStatus;              // 'TRACKING' | 'SPOOFED' | 'OVERFLIGHT'
  missileClass?: MissileClass;         // 'LIGHT' (6px weave) | 'MEDIUM' (10px weave) | 'HEAVY' (16px weave)

  // E-War Jamming & Spoofing
  heading?: number;
  ewarTested?: boolean;
  isSpoofed?: boolean;
  spoofedTimer?: number;
  spoofedDeflectionDeg?: number;
  spoofedDirection?: 'PORT' | 'STARBOARD';
  spoofedBaseHeading?: number;
  spoofedWaggleFreq?: number;
  selfDestructTimer?: number;          // 3.0s runaway self-destruct countdown
  runawayVector?: Vec2D;               // Fixed runaway trajectory at maximum burn speed

  // Ballistic Overflight (Terminal Misses)
  isMissed?: boolean;
  overflightTimer?: number;            // 1.5s post-target ballistic overflight timer
  overflightVector?: Vec2D;            // Unaltered high-speed vector past target

  // Fuel & Finite Powered Flight (Range ~= Fuel, Powered Limit = Range + 10%)
  range: number;
  maxPoweredDistance: number;
  distanceTraveled: number;
  underPower: boolean;
  fuelExhausted?: boolean;
  burnoutTimer?: number;

  // Stance Subsets: Kill vs Disable Protocol
  doctrine?: AggressiveDoctrine; // 'KILL' vs 'DISABLE'

  // Broadside Ejection Physics & Cubic Spline Pursuit
  isBroadsideEjection?: boolean;
  ejectionTimer?: number;
  ejectionDuration?: number;
  ejectionHeading?: number;
  sustainerActive?: boolean;
  splineP0?: Vec2D;
  splineM0?: Vec2D;
  splineP1?: Vec2D;
  splineM1?: Vec2D;
  splineT?: number;
  splineDuration?: number;
}

export interface SpaceDetonation {
  id: string;
  pos: Vec2D;
  timer: number;
  duration: number;
  maxRadius: number;
  color: string;
  type: 'EWAR_HARMLESS' | 'IMPACT' | 'COUNTER_HIT' | 'FUEL_EXHAUSTION' | 'SELF_DESTRUCT';
  label?: string;
}

export interface CounterMissileEntity {
  id: string;
  pos: Vec2D;
  origin: Vec2D;
  targetMissileId: string;
  speed: number; // Half speed: 245.0 km/s
  maxRange: number; // Scaled to ~140.0 km (representing 800k-1.2M km)
  distanceTraveled: number;
  heading: number;
  alive: boolean;
  willHit: boolean; // Evaluated at launch: defaults to 80% accuracy
  isMissed: boolean; // Flagged when missing the target
  trail: Vec2D[];
  trailSampleTimer: number;
}

export interface JumpGateEntity {
  pos: Vec2D;
  radius: number;
  shuttingDown: boolean;
  shutdownTimer: number;
  maxShutdownTime: number; // 300s
}

export interface CombatLogEntry {
  id: string;
  time: string;
  type:
    | 'JAM'
    | 'INTERCEPT'
    | 'PDPLA'
    | 'SHIELD_DROP'
    | 'CRIPPLE'
    | 'BUCKLE'
    | 'DESTROY'
    | 'UNREP'
    | 'MICROJUMP'
    | 'ORDNANCE'
    | 'TACTICAL'
    | 'RESOURCE'
    | 'LOGISTICS'
    | 'RESEARCH'
    | 'RADAR'
    | 'BUILDER'
    | 'NAV'
    | 'COMBAT'
    | 'STANCE';
  text: string;
  severity: 'info' | 'warn' | 'crit' | 'success' | 'danger';
  category?: string;
  message?: string;
  timestamp?: string;
}

export interface SimBenchmark {
  fps: number;
  tickMs: number;
  renderMs: number;
  missilesCount: number;
  cmCount: number;
  shipCount: number;
  totalInterceptions: number;
  totalPdplaHits: number;
  totalMissileHits: number;
  totalJammingDeflects: number;
}

export interface SensorBlip {
  x: number;
  y: number;
  rcsWeight: number;
  sourceId: string;
  sourceRole?: string;
  sourceName?: string;
  sourceHeading?: number;
  count?: number;
  clusterRadius?: number;
}

export interface SimulationConfig {
  hostilePdplaHitChance: number;
  friendlyPdplaHitChance: number;
  hostileCmLaunchProb: number;
  friendlyCmLaunchProb: number;
  counterMissileAccuracy: number; // Default 0.80 (80%)
  pdplaAccuracy: number; // Default 0.90 (90%)
  missileTerminalAccuracy?: number; // Default 0.88 (88% terminal hit roll)
  counterMissileSpeed: number; // Half speed: 245.0
  counterMissileRange: number; // Scaled to ~140.0 (800k-1.2M km)
  counterMissileReload: number; // 3.0s reload
  pdplaRange: number; // Scaled to ~65.0 (450k km)
  pdplaMaxBursts?: number; // Maximum bursts before overload (default 5)
  pdplaOverheatDuration?: number; // Overload lockout duration (default 3.0s)
  shieldCoolRate: number;
  radarRange: number;
  passiveRange?: number;
  missileRange: number;
  fogOfWarRange: number; // ~3x missile range (~3150.0km)
  showRangeRings: boolean;
  hostileAutoFire: boolean;
  seed?: number;
}
