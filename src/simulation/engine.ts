import {
  ShipEntity,
  ShipRole,
  MissileEntity,
  MissileStatus,
  MissileClass,
  CounterMissileEntity,
  JumpGateEntity,
  SimulationConfig,
  CombatLogEntry,
  SimBenchmark,
  Vec2D,
  CombatStance,
  AggressiveDoctrine,
  SpaceDetonation,
  AsteroidEntity,
  HQResources,
  ProductionQueueItem,
  NavalUnitRole,
  SolarSystem,
  MinerStance,
  MinerEntity,
  RockyPlanet,
  GasGiant,
  StructureType,
  ResearchStationCounts,
  FormationDensity,
  MovementCohesion,
  FleetGroup,
  FleetPdPosture,
  SensorBlip,
  RefineryProgressState,
  FactionId,
  GameSetupConfig,
  DebugState,
  HomeworldTypeId,
  HqTypeId,
  ScrapEntity,
  ScrapCargoItem,
  ScrapSize,
} from '../types';
import {
  HOMEWORLD_REGISTRY,
  HQ_REGISTRY,
  applyHQDefinitionToShip,
  applyHomeworldTypeToPlanet,
  getDefaultHQForFaction,
  getDefaultHomeworldForFaction,
  HqTypeDefinition,
  HomeworldTypeDefinition,
} from './hqRegistry';
import { FACTION_REGISTRY, ALL_FACTION_IDS } from './factions/factionRegistry';
import { processRefineryOre } from './economy';
import { state as globalState, getOperationalLabCounts, setGlobalGalaxyData, GameStatus } from '../state/gameState';
import { generateGalaxy, generateSingleSystem } from './solarSystem';
import {
  StarSystemDescriptor,
  GalaxyConfiguration,
  GalaxyGenerationResult,
} from './celestialTypes';

import {
  determineFlagship,
  computeFormationOffsets,
  computeFleetSpeedCap,
  getFleetSlowestSpeed,
  getStationKeepingPosition,
} from './fleetController';
import {
  clearShipMovement,
  issueMoveCommand,
  updateShipMovementTick,
  checkSublightPerimeterInterdiction,
  initiateMicroJump,
  updateMicroJumpKinematics,
} from './movementController';
import {
  initiateSingleJump,
  initiateSynchronizedFleetJump,
  stepShipJumpDrive,
  auditJumpViability,
} from './jumpEngine';
import { clampAngularSlew } from './kinematics';
import { handleBuildShip } from './shipyardController';
import {
  STRUCTURE_CATALOG,
  createGhostStructureEntity,
  StructureDef,
} from './structures';
import { constructionManager } from './constructionManager';
import {
  researchManager,
  ResearchManager,
  ResearchState,
  isHullUnlocked,
  isStructureUnlocked,
} from './researchManager';
import {
  DiplomacyState,
  initializeDiplomacyState,
  getAlliedFactions,
  offerAlliance,
  acceptAlliance,
  breakAlliance,
  setPlayerTeam,
} from './diplomacyController';
import {
  calculateOreConversionRate,
  calculateMaxOreStorage,
  getUnlockedRefineryCount,
} from './refineryController';
import {
  calculateStorageLimit,
  clampStockpileReserves,
  getUnlockedSiloTier,
} from './storageManager';
import {
  calculateMissileReloadReduction,
  calculateMissileReloadMultiplier,
  calculateEffectiveReloadTicks,
} from './autoloaderController';
import {
  colonizationManager,
  ColonizationManager,
  validateColonization,
  establishPlanetaryGovernance,
  ColonizationValidation,
  PlanetClass,
} from './colonizationManager';
import { planetController, PlanetController } from './planetController';
import {
  updateBuilderLogistics,
  orderBuilderConstruct as executeBuilderConstruct,
  launchBuilderTransit as launchBuilderTransitSpline,
  syncScaffoldEntity,
} from './builderController';
import {
  findCandidateAsteroid,
  getNearbyThreats,
  computeRetreatVector,
  stepRetreatSteering,
  computeMinerEvasionVector,
  MINER_RADAR_ENVELOPE_KM,
  MINER_EVADE_CLEAR_TICKS,
  isAsteroidThreatened,
  getHQDockingTarget,
  launchMinerSpline,
  clampMinerToAsteroid,
  unclampMiner,
  isMinerVessel,
  isMinerInTransitThrust,
  MINER_DANGER_RADIUS,
  ASTEROID_THREAT_RADIUS,
  MINER_SAFE_HYSTERESIS,
  MINER_MINE_RATE,
  MINER_UNLOAD_RATE,
  R_TRANSFER,
  HQ_ORE_TRANSFER_RANGE_KM,
  HQ_ORE_TRANSFER_APPROACH_RANGE_KM,
  getHQDistance,
  isWithinHQTransferRange,
  applyMinerApproachBraking,
  engageMinerDockingStationKeeping,
  updateMinerDockingStationKeeping,
  releaseMinerDockingStationKeeping,
  stepMinerCargoOffload,
  dispatchMinerReturnToAsteroids,
} from './minerController';
import { hermiteInterpolate, distSq, normalize, computeSplineTangents } from './hermite';
import { createDefaultShips } from './scenarios';
import { getShipHullSpec, getShipArmament, applyShipArmament, applyShipKinematics, getShipKinematics, SHIP_PROTOTYPES } from './shipPrototypes';
import {
  updateCombatTick,
  updateShipCombatTick,
  fireMissileSalvo as runCombatSalvo,
  CombatSimulationState,
  CombatModifiers,
  triggerShieldReboot,
  updateShieldCycling,
} from './combatEngine';
import { ensureShipCombatReady } from './shipController';
import { createDefaultAsteroidBelt, createAsteroid } from './asteroids';
import {
  generateProceduralSolarSystem,
  stepCometKinematics,
  stepPlanetKinematics,
  stepAsteroidBeltKinematics,
  syncAllAsteroidsKinematics,
  ORBITAL_CONFIG,
  ENABLE_ORBITAL_REVOLUTION,
  GRAVITY_WELL_CONFIG,
  getPlanetaryGravityWellRadius,
  getLunarGravityWellRadius,
  getClusterGravityWellRadius,
  calculateHQAnchorOffset,
  SeededRNG,
} from './solarSystem';
import { generatePirateFaction, spawnSystemHostiles, steerTowards, updateInnerPlanetaryPatrol } from './pirates';
import { PlanetEntity } from './celestialTypes';
import { initNPCPatrolState, updateNPCPatrol, handleNPCOnArrival } from './npcController';
import { areShipsHostile } from './targetingSystem';
import { BASE_TACTICAL_RANGES, updateSensorsAndFogOfWar } from './sensorController';
import { updateSensorVisibility } from './sensors';
import { AsteroidSpatialStore } from './spatialBuffer';
import { K_SCALE, HQ_CONFIG, DEFAULT_MISSILE_SPEED, DEFAULT_CM_SPEED } from './systemConstants';
import {
  createOrdnanceBuffers,
  updateMissilesSOA,
  updateCounterMissilesSOA,
  removeMissileSOA,
  MAX_MISSILES,
  MAX_CMS,
  ORDNANCE_STATUS,
  type MissileStoreSOA,
  type CounterMissileStoreSOA,
} from './ordnanceSOA';
import { OrdnanceBridge } from './ordnanceBridge';

export { DEFAULT_MISSILE_SPEED, DEFAULT_CM_SPEED };
export const DEFAULT_CM_RANGE = 140.0 * K_SCALE;       // 630.0 km (scaled 4.5x)
export const DEFAULT_PD_RANGE = 65.0 * K_SCALE;        // 292.5 km (scaled 4.5x)
export const CM_INTERCEPT_DIST_SQ = (18.0 * K_SCALE) * (18.0 * K_SCALE); // Proximity kill radius squared

export class SimulationEngine {
  public ships: ShipEntity[] = [];
  public missiles: MissileEntity[] = [];
  public counterMissiles: CounterMissileEntity[] = [];
  public ordnanceSOA = createOrdnanceBuffers(MAX_MISSILES, MAX_CMS);
  public ordnanceBridge = new OrdnanceBridge(this.ordnanceSOA.missiles, this.ordnanceSOA.cms);
  public detonations: SpaceDetonation[] = [];
  public asteroids: AsteroidEntity[] = [];
  public asteroidSpatialStore: AsteroidSpatialStore = new AsteroidSpatialStore();
  public solarSystem!: SolarSystem;
  public systems: StarSystemDescriptor[] = [];
  public planets: PlanetEntity[] = [];
  public simulationTick: number = 0;
  public galaxyConfig: GalaxyConfiguration = {
    systemCount: 3,
    systemSpacing: 250000,
    seed: 1337,
  };
  public galaxyResult?: GalaxyGenerationResult;
  public jumpGate: JumpGateEntity;
  public config: SimulationConfig;

  public selectedShipId: string | null = null;
  public selectedShipIds: string[] = [];
  public fleetGroups: Map<number, FleetGroup> = new Map();
  public formationDensity: FormationDensity = 'CLOSE';
  public movementCohesion: MovementCohesion = 'UNIT';
  public fleetPdPosture: FleetPdPosture = 'AUTO';
  public fleetScreenVanguard: boolean = true;
  public gameStatus: GameStatus = 'SETUP';
  public combatLogs: CombatLogEntry[] = [];
  public isPaused: boolean = false;
  public tickCount: number = 0;
  public simulationTime: number = 0;
  public benchmark: SimBenchmark = {
    fps: 60,
    tickMs: 0,
    renderMs: 0,
    missilesCount: 0,
    cmCount: 0,
    shipCount: 0,
    totalInterceptions: 0,
    totalPdplaHits: 0,
    totalMissileHits: 0,
    totalJammingDeflects: 0,
  };

  private missileIdCounter = 0;
  private cmIdCounter = 0;
  private logIdCounter = 0;
  private hostileAutoFireTimer = 0;
  private vanguardRespawnTimer = 0;
  public scraps: ScrapEntity[] = [];

  public playerFaction: FactionId = 'NOVAN';
  public homeworldType: HomeworldTypeId = 'TERRAN';
  public hqType: HqTypeId = 'NOVAN_COMMAND_SPIRE';
  public gameSetupConfig?: GameSetupConfig;
  public diplomacyState: DiplomacyState = initializeDiplomacyState();

  public researchStations: ResearchStationCounts = { military: 0, civic: 0, expansion: 0 };
  public researchManager: ResearchManager = researchManager;
  public debugState: DebugState = { revealAllMap: false, freeResearch: false };
  public research = {
    completedTechIds: [] as string[],
    activeTechId: null as string | null,
    progress: 0,
  };

  // Real-time scalar research multipliers directly applied into engine mechanics
  public missileYieldMult: number = 1.0;
  public missileSpeedMult: number = 1.0;
  public kineticDamageMult: number = 1.0;
  public kineticPiercingMult: number = 1.0;
  public laserRangeMult: number = 1.0;
  public laserDpsMult: number = 1.0;
  public hullHpMult: number = 1.0;
  public armorAbsorptionMult: number = 1.0;
  public shieldRegenMult: number = 1.0;
  public shieldCapMult: number = 1.0;
  public pdTrackingMult: number = 1.0;
  public combatBurnMult: number = 1.0;
  public radarMultiplier: number = 1.0;
  public passiveMultiplier: number = 1.0;
  public sensorRangeMult: number = 1.0;
  public missileRangeMult: number = 1.0;
  public cmRangeMult: number = 1.0;
  public beamRangeMult: number = 1.0;
  public pdRangeMult: number = 1.0;
  public graserArmorPiercingMult: number = 1.0;
  public counterMissileReloadMult: number = 1.0;
  public shipyardSpeedMult: number = 1.0;
  public hqStorageMult: number = 1.0;
  public minerSpeedMult: number = 1.0;
  public minerTurnaroundSpeedMult: number = 1.0;
  public refineryYieldMult: number = 1.0;
  public refinerySpeedMult: number = 1.0;
  public refineryProgress: RefineryProgressState = { oreAccumulator: 0, totalNeridiumExtracted: 0 };
  public freighterCargoMult: number = 1.0;
  public oreConversionMult: number = 1.0;
  public structureBuildSpeedMult: number = 1.0;
  public structureCostDiscount: number = 0.0;
  public hqEconomicYieldMult: number = 1.0;
  public activeBlips: SensorBlip[] = [];
  public get hostileEntities(): ShipEntity[] {
    return (this.ships || []).filter((s) => s && s.faction === 'HOSTILE');
  }
  public passiveOrganicRate: number = 0.0;
  public passiveMetallicRate: number = 0.0;
  public capitalShipBuildTimeMult: number = 1.0;
  public builderRepairSpeedMult: number = 1.0;
  public logisticsSpeedMult: number = 1.0;
  public colonyCapacityMult: number = 1.0;
  public activeRadarDistMult: number = 1.0;
  public popGrowthMult: number = 1.0;
  public gravityAnchorMult: number = 1.0;
  public colonyTaxMult: number = 1.0;
  public scoutSpeedMult: number = 1.0;
  public missileReloadMult: number = 1.0;
  public missileReloadReduction: number = 0.0;
  public dynamicMaxOre: number = 16000;
  public dynamicMaxStockpile: number = 100000;
  public dynamicRefineryRate: number = 10.0;
  public colonizationManager: ColonizationManager = colonizationManager;
  public planetController: PlanetController = planetController;

  public recalculateResearchScalars(): void {
    const nodes = this.researchManager.completedNodes;

    if (nodes.has('HQ_BUILDINGS_EXPANSION')) {
      const hq = this.ships.find((s) => s.role === 'HQ');
      if (hq) {
        hq.maxMountedModules = 6;
      }
    }

    // --- Ordnance & Missile Multipliers ---
    let missileYield = 1.0;
    if (nodes.has('mil-t3-boosters')) missileYield += 0.03;
    if (nodes.has('mil-t5-warhead')) missileYield += 0.03;
    if (nodes.has('mil-t7-thermo')) missileYield += 0.03;
    if (nodes.has('mil-t9-antimatter')) missileYield += 0.03;
    if (nodes.has('mil-t10-nova')) missileYield += 0.10;
    this.missileYieldMult = missileYield;
    this.missileSpeedMult = nodes.has('mil-t2-prop') ? 1.10 : 1.0;

    // --- Tactical Ranges & Independent Sensor Scaling ---
    let radarMult = 1.0;
    if (nodes.has('TECH_RADAR_1') || nodes.has('exp-t1-radar') || nodes.has('exp-t2-sensors')) radarMult += 0.20;
    if (nodes.has('TECH_RADAR_2') || nodes.has('exp-t4-subspace')) radarMult += 0.20;
    this.radarMultiplier = radarMult;
    this.sensorRangeMult = radarMult;

    let passiveMult = 1.0;
    if (nodes.has('TECH_PASSIVE_SENSORS_1') || nodes.has('exp-t2-filter')) passiveMult += 0.25;
    if (nodes.has('TECH_PASSIVE_SENSORS_2') || nodes.has('exp-t4-sensor2')) passiveMult += 0.25;
    this.passiveMultiplier = passiveMult;

    this.missileRangeMult = nodes.has('mil-t2-prop') || nodes.has('mil-t3-boosters') ? 1.10 : 1.0;
    this.cmRangeMult = nodes.has('mil-t4-sprint') || nodes.has('mil-t2-prop') ? 1.10 : 1.0;

    // --- Kinetic & Ballistics ---
    this.kineticDamageMult = nodes.has('mil-t1-rail') ? 1.05 : 1.0;
    this.kineticPiercingMult = nodes.has('mil-t6-slugs') ? 1.15 : 1.0;

    // --- Lasers & Energy Grasers ---
    this.laserRangeMult = nodes.has('mil-t3-laser') ? 1.08 : 1.0;
    this.beamRangeMult = this.laserRangeMult;
    this.laserDpsMult = nodes.has('mil-t6-beams') ? 1.10 : 1.0;
    this.pdRangeMult = nodes.has('mil-t6-beams') || nodes.has('mil-t3-laser') ? 1.10 : 1.0;
    let graserAP = 1.0;
    if (nodes.has('mil-t4-graser')) graserAP += 0.10;
    if (nodes.has('mil-t5')) graserAP += 0.15;
    if (nodes.has('mil-t8-graser')) graserAP += 0.20;
    this.graserArmorPiercingMult = graserAP;

    // --- Hull Armor & Shield Defenses ---
    let hullHp = 1.0;
    if (nodes.has('mil-t1-armor')) hullHp += 0.05;
    if (nodes.has('mil-t4-composites')) hullHp += 0.10;
    this.hullHpMult = hullHp;

    let armorAbsorb = 1.0;
    if (nodes.has('mil-t2-bulkhead')) armorAbsorb += 0.05;
    if (nodes.has('mil-t7-ablation')) armorAbsorb += 0.10;
    if (nodes.has('mil-t9-belts')) armorAbsorb += 0.25;
    this.armorAbsorptionMult = armorAbsorb;

    this.shieldRegenMult = nodes.has('mil-t2-shield') ? 1.10 : 1.0;
    let shieldCap = 1.0;
    if (nodes.has('mil-t5-shield')) shieldCap += 0.15;
    if (nodes.has('mil-t10-invuln')) shieldCap += 0.30;
    this.shieldCapMult = shieldCap;

    // --- Point Defense & Counter-Missiles ---
    this.pdTrackingMult = nodes.has('mil-t3-pd') ? 1.10 : 1.0;
    let cmReload = 1.0;
    if (nodes.has('mil-t3-cm')) cmReload += 0.10;
    if (nodes.has('mil-t3')) cmReload += 0.15;
    this.counterMissileReloadMult = cmReload;

    // --- Sublight Mobility ---
    this.combatBurnMult = nodes.has('mil-t6-reactor') ? 1.10 : 1.0;

    // --- Civilian / Industry Multipliers ---
    // Tier 1
    this.minerTurnaroundSpeedMult = nodes.has('civ-t1') ? 1.15 : 1.0;
    let bldSpeed = 1.0;
    if (nodes.has('civ-t1-scaffold')) bldSpeed += 0.10;
    if (nodes.has('civ-t10-matrices')) bldSpeed += 0.50;
    this.structureBuildSpeedMult = bldSpeed;
    this.hqEconomicYieldMult = nodes.has('civ-t1-trade') ? 1.05 : 1.0;

    // Tier 2
    let refYield = 1.0;
    if (nodes.has('civ-t2-smelt')) refYield += 0.05;
    if (nodes.has('civ-t6')) refYield += 0.15;
    this.refineryYieldMult = refYield;

    // Passive Organic Generation
    let passOrg = 0.0;
    if (nodes.has('civ-t2-hydro')) passOrg += 1.0;
    if (nodes.has('civ-t5-hydro')) passOrg += 5.0;
    if (nodes.has('civ-t10')) passOrg += 10.0;
    this.passiveOrganicRate = passOrg;

    // Passive Metallic Generation
    let passMet = 0.0;
    if (nodes.has('civ-t8-synth')) passMet += 5.0;
    if (nodes.has('civ-t10')) passMet += 10.0;
    this.passiveMetallicRate = passMet;

    // Tier 3
    let minerSpeed = 1.0;
    if (nodes.has('civ-t3-drills')) minerSpeed += 0.15;
    if (nodes.has('civ-t7')) minerSpeed += 0.25;
    this.minerSpeedMult = minerSpeed;

    let refSpeed = 1.0;
    if (nodes.has('civ-t3-sort')) refSpeed += 0.10;
    if (nodes.has('civ-t7-plasma')) refSpeed += 0.20;
    this.refinerySpeedMult = refSpeed;

    let logSpeed = 1.0;
    if (nodes.has('civ-t3-fuel')) logSpeed += 0.15;
    if (nodes.has('civ-t5-routing')) logSpeed += 0.15;
    if (nodes.has('civ-t9-highways')) logSpeed += 0.20;
    this.logisticsSpeedMult = logSpeed;

    // Tier 4
    let oreConv = 1.0;
    if (nodes.has('civ-t4')) oreConv += 0.10;
    if (nodes.has('civ-t5-thermal')) oreConv += 0.10;
    this.oreConversionMult = oreConv;

    this.builderRepairSpeedMult = nodes.has('civ-t4-nanite') ? 1.25 : 1.0;

    let shipSpeed = 1.0;
    if (nodes.has('civ-t2-arms')) shipSpeed += 0.10;
    if (nodes.has('civ-t4-slipway')) shipSpeed += 0.15;
    if (nodes.has('civ-t9')) shipSpeed += 0.25;
    this.shipyardSpeedMult = shipSpeed;

    let hqStorage = 1.0;
    if (nodes.has('civ-t4-silo')) hqStorage += 0.25;
    if (nodes.has('civ-t7-vaults') || nodes.has('civ-t8')) hqStorage *= 2.0;
    this.hqStorageMult = hqStorage;

    // Cargo Holds
    let cargoHold = 1.0;
    if (nodes.has('civ-t1-cargo')) cargoHold += 0.15;
    if (nodes.has('civ-t5')) cargoHold += 0.50;
    if (nodes.has('civ-t9-freighters')) cargoHold *= 2.0;
    this.freighterCargoMult = cargoHold;

    // Discounts
    let costDisc = 0.0;
    if (nodes.has('civ-t3-admin')) costDisc += 0.05;
    if (nodes.has('civ-t6-habitat')) costDisc += 0.10;
    if (nodes.has('civ-t10-stockpile')) costDisc += 0.25;
    this.structureCostDiscount = costDisc;

    this.capitalShipBuildTimeMult = nodes.has('civ-t7-drydocks') ? 0.80 : 1.0;

    // --- Expansion ---
    let gravAnchor = 1.0;
    if (nodes.has('exp-t3-tether')) gravAnchor += 0.10;
    if (nodes.has('exp-t10')) gravAnchor += 0.50;
    this.gravityAnchorMult = gravAnchor;

    let sensRange = 1.0;
    if (nodes.has('exp-t2-filter')) sensRange += 0.10;
    if (nodes.has('exp-t4-sensor2')) sensRange += 0.10;
    if (nodes.has('exp-t7-sensor3')) sensRange += 0.10;
    if (nodes.has('exp-t8')) sensRange *= 2.0;
    this.sensorRangeMult = sensRange;

    let radarDist = 1.0;
    if (nodes.has('exp-t1-radar')) radarDist += 0.05;
    if (nodes.has('exp-t4-sensor2')) radarDist += 0.05;
    if (nodes.has('exp-t5')) radarDist += 0.20;
    if (nodes.has('exp-t7-sensor3')) radarDist += 0.05;
    this.activeRadarDistMult = radarDist;

    let popGrowth = 1.0;
    if (nodes.has('exp-t3-moisture')) popGrowth += 0.10;
    if (nodes.has('exp-t4')) popGrowth += 0.25;
    this.popGrowthMult = popGrowth;

    let colonyCap = 1.0;
    if (nodes.has('exp-t6-infra')) colonyCap += 0.20;
    if (nodes.has('exp-t7')) colonyCap += 0.30;
    if (nodes.has('exp-t8-domes')) colonyCap += 0.25;
    if (this.playerFaction === 'LIAAL') colonyCap *= 1.30;
    this.colonyCapacityMult = colonyCap;

    let colonyTax = 1.0;
    if (nodes.has('exp-t5-geo')) colonyTax += 0.15;
    if (nodes.has('exp-t8-weather')) colonyTax += 0.30;
    if (nodes.has('exp-t9-sync')) colonyTax += 0.50;
    this.colonyTaxMult = colonyTax;

    this.scoutSpeedMult = nodes.has('exp-t1-scout') ? 1.15 : 1.0;

    // Faction-Specific Baseline Doctrine Multipliers
    if (this.playerFaction === 'KOVAK') {
      this.hullHpMult *= 0.40;          // 40% durability / universal positive stats
      this.shieldCapMult *= 0.40;       // 40% shield capacity
      this.shieldRegenMult *= 0.40;     // Slower shield recharge and instability
      this.pdRangeMult *= 0.90;         // 10% reduction in PD ranges
      this.shipyardSpeedMult *= 2.0;    // Volume over quality: 50% build time (2x speed)
    } else if (this.playerFaction === 'LIAAL') {
      this.hullHpMult *= 0.30;       // 30% durability
      this.shieldCapMult *= 0.30;     // 30% shielding
      this.freighterCargoMult *= 2.0; // 2x cargo capacity
      this.popGrowthMult *= 1.5;      // 50% faster population growth / terraforming
    } else if (this.playerFaction === 'GARN') {
      this.hullHpMult *= 1.65;
      this.shieldCapMult *= 1.35;
    } else if (this.playerFaction === 'YESTIRI') {
      this.shieldCapMult *= 1.40;
      this.hullHpMult *= 1.15;
    }

    // --- Modular HQ Internal Upgrade Systems ---
    // 1. Modular Refinery Parallel Tracks (10.0 Ore/s + unlockedRefineryCount * 10.0)
    this.dynamicRefineryRate = calculateOreConversionRate(nodes, this.refinerySpeedMult || 1.0);
    this.dynamicMaxOre = calculateMaxOreStorage(nodes, this.hqStorageMult || 1.0);

    // 2. Sub-Silo Storage Expansion (100,000 + unlockedSiloTier * 15,000)
    this.dynamicMaxStockpile = calculateStorageLimit(nodes, this.hqStorageMult || 1.0);

    // 3. Missile Volley Autoloaders: baseCooldownTicks * (1.0 - reloadReductionScalar)
    this.missileReloadReduction = calculateMissileReloadReduction(nodes);
    this.missileReloadMult = calculateMissileReloadMultiplier(nodes);

    const hq = this.getHQ();
    if (hq && hq.resources) {
      hq.resources.maxOre = this.dynamicMaxOre;
      hq.resources.maxMetallic = this.dynamicMaxStockpile;
      hq.resources.maxOrganic = this.dynamicMaxStockpile;
      hq.refineryRate = this.dynamicRefineryRate;
      clampStockpileReserves(hq.resources, nodes, this.hqStorageMult || 1.0);
    }
  }

  public get unlockedTechs(): Set<string> {
    return this.researchManager.completedNodes;
  }

  public validateColonization(planet: RockyPlanet | GasGiant): ColonizationValidation {
    return validateColonization(planet, this.unlockedTechs);
  }

  public colonizePlanet(planetId: string): { success: boolean; message: string } {
    return establishPlanetaryGovernance(planetId, this);
  }

  public getResearchState(): ResearchState {
    return this.researchManager.getResearchState();
  }

  private _playerShipsScratch: ShipEntity[] = [];
  private _celestialWellsCache: Array<{
    id: string;
    name: string;
    pos: Vec2D;
    radius: number;
    wellRadius: number;
    type: 'PLANET' | 'GAS_GIANT' | 'MOON' | 'ASTEROID_CLUSTER';
  }> = [];
  private _threatBuckets = new Map<string, MissileEntity[]>();
  private _combatState!: CombatSimulationState;

  public getCombatState(): CombatSimulationState {
    this._playerShipsScratch.length = 0;
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.faction === 'FRIENDLY') {
        this._playerShipsScratch.push(s);
      }
    }

    if (!this._combatState) {
      this._combatState = {
        playerShips: this._playerShipsScratch,
        ships: this.ships,
        missiles: this.missiles,
        ordnanceBridge: this.ordnanceBridge,
        combatModifiers: {
          missileReloadMultiplier: 1.0,
          laserRangeMultiplier: 1.0,
          laserDpsMultiplier: 1.0,
          graserArmorPiercingMultiplier: 1.0,
        },
        isTargetInFriendlyVisualRange: (pos: Vec2D) => this.isTargetInFriendlyVisualRange(pos),
        addLog: (cat: string, msg: string, lvl?: any, isPlayerOwned?: boolean, sourceFaction?: string) =>
          this.addLog(cat as any, msg, lvl, isPlayerOwned, sourceFaction),
        applyHitToShip: (target: ShipEntity, damage: number) => this.applyHitToShip(target, damage),
        nextMissileId: () => `m-${++this.missileIdCounter}`,
      };
    } else {
      this._combatState.playerShips = this._playerShipsScratch;
      this._combatState.ships = this.ships;
      this._combatState.missiles = this.missiles;
      this._combatState.ordnanceBridge = this.ordnanceBridge;
    }

    this._combatState.combatModifiers.missileReloadMultiplier = this.missileReloadMult;
    this._combatState.combatModifiers.laserRangeMultiplier = this.laserRangeMult;
    this._combatState.combatModifiers.laserDpsMultiplier = this.laserDpsMult;
    this._combatState.combatModifiers.graserArmorPiercingMultiplier = this.graserArmorPiercingMult;
    this._combatState.combatModifiers.radarMultiplier = this.radarMultiplier;
    this._combatState.combatModifiers.passiveMultiplier = this.passiveMultiplier;
    this._combatState.combatModifiers.radarRangeMult = this.radarMultiplier;
    this._combatState.combatModifiers.passiveRangeMult = this.passiveMultiplier;
    this._combatState.combatModifiers.missileRangeMult = this.missileRangeMult;
    this._combatState.combatModifiers.sensorRangeMult = this.sensorRangeMult;
    this._combatState.combatModifiers.cmRangeMult = this.cmRangeMult;
    this._combatState.combatModifiers.beamRangeMult = this.beamRangeMult;
    this._combatState.combatModifiers.pdRangeMult = this.pdRangeMult;

    return this._combatState;
  }

  public get combatModifiers(): CombatModifiers {
    return {
      missileReloadMultiplier: this.missileReloadMult,
      laserRangeMultiplier: this.laserRangeMult,
      laserDpsMultiplier: this.laserDpsMult,
      graserArmorPiercingMultiplier: this.graserArmorPiercingMult,
      radarMultiplier: this.radarMultiplier,
      passiveMultiplier: this.passiveMultiplier,
      radarRangeMult: this.radarMultiplier,
      passiveRangeMult: this.passiveMultiplier,
      missileRangeMult: this.missileRangeMult,
      sensorRangeMult: this.sensorRangeMult,
      cmRangeMult: this.cmRangeMult,
      beamRangeMult: this.beamRangeMult,
      pdRangeMult: this.pdRangeMult,
    };
  }

  public get modifiers() {
    return {
      radarMultiplier: this.radarMultiplier,
      passiveMultiplier: this.passiveMultiplier,
      radarRangeMult: this.radarMultiplier,
      passiveRangeMult: this.passiveMultiplier,
      sensorRangeMult: this.sensorRangeMult,
      missileRangeMult: this.missileRangeMult,
    };
  }

  public isHullUnlocked(shipClass: string): boolean {
    const allied = this.diplomacyState
      ? getAlliedFactions(this.playerFaction, this.diplomacyState)
      : [this.playerFaction];
    return this.researchManager.isHullUnlocked(shipClass, this.playerFaction, allied);
  }

  public getDiplomaticAllies(): FactionId[] {
    return this.diplomacyState
      ? getAlliedFactions(this.playerFaction, this.diplomacyState)
      : [this.playerFaction];
  }

  public isStructureUnlocked(structureType: StructureType): boolean {
    return this.researchManager.isStructureUnlocked(structureType);
  }

  public initiateResearch(nodeId: string): { success: boolean; error?: string } {
    const hq = this.getHQ();
    if (!hq || !hq.resources) {
      return { success: false, error: 'HQ command center offline or destroyed.' };
    }
    return this.researchManager.initiateResearch(
      nodeId,
      this.researchStations,
      hq.resources,
      (m, o) => {
        hq.resources!.metallic = Math.max(0, hq.resources!.metallic - m);
        hq.resources!.organic = Math.max(0, hq.resources!.organic - o);
      },
      (cat, msg, lvl) => this.addLog(cat as any, msg, lvl)
    );
  }

  public enqueueResearch(nodeId: string): { success: boolean; position?: number; error?: string } {
    return this.researchManager.enqueueNode(nodeId, (cat, msg, lvl) => this.addLog(cat as any, msg, lvl));
  }

  public removeFromResearchQueue(nodeId: string): { success: boolean } {
    return this.researchManager.dequeueNode(nodeId, (cat, msg, lvl) => this.addLog(cat as any, msg, lvl));
  }

  public getResearchQueue(branch: any): string[] {
    return this.researchManager.getQueue(branch);
  }

  public clearResearchQueue(branch?: any): void {
    this.researchManager.clearQueue(branch);
  }

  public cancelResearch(branchOrNodeId: string): { success: boolean; error?: string } {
    const hq = this.getHQ();
    return this.researchManager.cancelResearch(
      branchOrNodeId,
      (m, o) => {
        if (hq && hq.resources) {
          hq.resources.metallic = Math.min(hq.resources.maxMetallic ?? 100000, hq.resources.metallic + m);
          hq.resources.organic = Math.min(hq.resources.maxOrganic ?? 100000, hq.resources.organic + o);
        }
      },
      (cat, msg, lvl) => this.addLog(cat as any, msg, lvl)
    );
  }

  public get structures(): ShipEntity[] {
    if (!Array.isArray(this.ships)) return [];
    return this.ships.filter(
      (s) => s && (s.role === 'HQ' || s.role === 'SY_LIGHT' || s.role === 'SY_MEDIUM' || s.role === 'SY_HEAVY' || s.isStationary || s.isStructure || s.isUnderConstruction)
    );
  }

  public get hqStockpiles(): { metallic: number; organic: number; maxMetallic?: number; maxOrganic?: number } {
    return this.getHQResources();
  }

  public get activeResearch(): Record<string, any> {
    const raw = this.researchManager.getActiveResearch();
    const hqProject = this.researchManager.getActiveProject('HEADQUARTERS');
    const toTask = (p: any, branchName: string) => {
      if (!p) return null;
      return {
        nodeId: p.nodeId,
        tier: p.tier,
        branch: branchName,
        currentTicks: p.currentTicks,
        totalTicks: p.totalTicks,
        costPaidM: p.costPaidM ?? p.costM ?? 0,
        costPaidO: p.costPaidO ?? p.costO ?? 0,
        isPaused: p.status === 'PAUSED_LACKING_CAPACITY',
        pauseReason: p.status === 'PAUSED_LACKING_CAPACITY' ? 'INSUFFICIENT_LAB_CAPACITY' : undefined,
        status: p.status,
      };
    };
    return {
      military: toTask(raw.military, 'military'),
      civic: toTask(raw.civic, 'civic'),
      civilian: toTask(raw.civic, 'civic'),
      expansion: toTask(raw.expansion, 'expansion'),
      headquarters: toTask(hqProject, 'headquarters'),
      hq: toTask(hqProject, 'headquarters'),
    };
  }

  public get state() {
    return {
      structures: this.structures,
      ships: this.ships,
      resources: this.getHQ()?.resources,
      hqStockpiles: this.hqStockpiles,
      activeResearch: this.activeResearch,
      unlockedTechs: this.unlockedTechs,
      researchStations: this.researchStations,
    };
  }

  public updateResearchStationsCount(): void {
    const counts = getOperationalLabCounts(this);
    this.researchStations.military = counts.military;
    this.researchStations.civic = counts.civic;
    this.researchStations.expansion = counts.expansion;
    (this.researchStations as any).headquarters = counts.total;
    globalState.researchStations.military = counts.military;
    globalState.researchStations.civic = counts.civic;
    globalState.researchStations.expansion = counts.expansion;
    (globalState.researchStations as any).headquarters = counts.total;
    if (typeof window !== 'undefined' && (window as any).state) {
      (window as any).state.researchStations = this.researchStations;
    }
  }

  public onStructureCompleted(structure: ShipEntity): void {
    this.updateResearchStationsCount();
    // Remove completed scaffold record from construction backlog / manager
    constructionManager.scaffolds = constructionManager.scaffolds.filter((s) => s.id !== structure.id);
  }

  public cancelScaffold(scaffoldId: string): boolean {
    return constructionManager.cancelScaffold(scaffoldId, this);
  }

  public dismantleStructure(structureId: string): boolean {
    // If target is an in-progress scaffold, cancel with 100% refund
    const targetShip = this.ships.find((s) => s.id === structureId);
    const hasScaffold = constructionManager.scaffolds.some((s) => s.id === structureId);
    if (targetShip?.isUnderConstruction || hasScaffold) {
      return this.cancelScaffold(structureId);
    }

    const idx = this.ships.findIndex((s) => s.id === structureId);
    if (idx !== -1) {
      const s = this.ships[idx];
      this.ships.splice(idx, 1);
      this.addLog('LOGISTICS', `Structure [${s.name}] decommissioned and dismantled.`, 'info');
      this.updateResearchStationsCount();
      return true;
    }
    return false;
  }

  public sanitizeShip(s: ShipEntity): ShipEntity {
    if (!s) return s;
    if (s.faction === 'FRIENDLY' && !s.factionId) {
      s.factionId = this.playerFaction || 'NOVAN';
    } else if (s.faction === 'HOSTILE' && !s.factionId) {
      s.factionId = 'KOVAK';
    }
    const spec = getShipHullSpec(s);
    if (!s.renderedLength) s.renderedLength = spec.renderedLengthPx;
    if (!s.selectionRadius) s.selectionRadius = spec.selectionRadiusPx;
    if (!s.radius) s.radius = spec.baseRadius;
    if (!s.productionQueue) s.productionQueue = [];
    if (!s.supportActiveTargets) s.supportActiveTargets = [];
    if (!s.patrolWaypoints) s.patrolWaypoints = [];
    if (!s.waypoints) s.waypoints = [];
    if (!s.activeMissiles) s.activeMissiles = [];
    if (!s.pdplaActiveBeamTargets) s.pdplaActiveBeamTargets = [];
    if (s.role === 'BUILDER') {
      if (!s.materialsStored) {
        s.materialsStored = {
          metallic: 5000,
          metallicMax: 5000,
          organic: 5000,
          organicMax: 5000,
          ore: 0,
          oreMax: 5000,
        };
      }
      if (!s.cargoCapacity) {
        s.cargoCapacity = { metallic: 5000, organic: 5000, ore: 5000 };
      }
      if (!s.builderState) {
        s.builderState = 'STATE_BUILDER_IDLE';
      }
    }
    if (s.role !== 'HQ' && !s.isStationary && s.role) {
      applyShipKinematics(s, s.role);
    }
    if (!s.sensorRange) {
      s.sensorRange = BASE_TACTICAL_RANGES.sensorRangeKm;
    }
    s.radarRange = BASE_TACTICAL_RANGES.radarRangeKm;
    s.passiveRange = BASE_TACTICAL_RANGES.passiveRangeKm;
    if (s.pos) {
      if (s.x === undefined) s.x = s.pos.x;
      if (s.y === undefined) s.y = s.pos.y;
    } else if (s.x !== undefined && s.y !== undefined) {
      s.pos = { x: s.x, y: s.y };
    }
    if (s.faction === 'HOSTILE') {
      if (!s.visibilityTier) s.visibilityTier = 'NONE';
      if (!s.visibilityState) s.visibilityState = 'HIDDEN';
    }

    // Ensure Robust Hull & Health Attributes
    const proto = (SHIP_PROTOTYPES as any)[s.role] || (STRUCTURE_CATALOG as any)[s.role];
    const defaultHull = proto?.specs?.hull ?? proto?.hullMax ?? (s as any).hull ?? (spec.baseRadius ? spec.baseRadius * 50 : 500.0);
    const defaultShield = proto?.specs?.shield ?? (s as any).shieldMax ?? (s as any).maxShield ?? 1000.0;

    if (!s.hullMax || isNaN(s.hullMax) || s.hullMax <= 0) {
      s.hullMax = defaultHull;
    }
    if (s.hullHp === undefined || isNaN(s.hullHp) || s.hullHp === null) {
      s.hullHp = (s as any).hull !== undefined && !isNaN((s as any).hull) ? (s as any).hull : s.hullMax;
    }
    s.hull = s.hullHp;
    if (s.maxRepairableHull === undefined || isNaN(s.maxRepairableHull)) {
      s.maxRepairableHull = s.hullMax;
    }
    if (!s.hullState) {
      s.hullState = s.hullHp <= 0 ? 'DESTROYED' : s.hullHp <= 0.125 * s.hullMax ? 'DISABLED' : s.hullHp <= 0.25 * s.hullMax ? 'CRIPPLED' : 'OPERATIONAL';
    }
    s.crippleBarMax = 0.25 * s.hullMax;
    if (s.crippleBar === undefined || isNaN(s.crippleBar)) {
      s.crippleBar = Math.min(s.crippleBarMax, Math.max(0, s.hullHp));
    }

    // Ensure Robust Shield Attributes
    if (!s.shieldHpMax || isNaN(s.shieldHpMax) || s.shieldHpMax <= 0) {
      s.shieldHpMax = defaultShield;
    }
    if (s.shieldHp === undefined || isNaN(s.shieldHp) || s.shieldHp === null) {
      s.shieldHp = (s as any).shield !== undefined && !isNaN((s as any).shield) ? (s as any).shield : s.shieldHpMax;
    }
    if (s.currentShield === undefined) {
      s.currentShield = s.shieldHp;
    }
    if (s.shieldHeatMax === undefined || isNaN(s.shieldHeatMax)) {
      s.shieldHeatMax = 100.0;
    }
    if (s.shieldHeat === undefined || isNaN(s.shieldHeat)) {
      s.shieldHeat = 0;
    }

    ensureShipCombatReady(s);
    return s;
  }

  constructor(initialShips: ShipEntity[], jumpGate: JumpGateEntity, initialConfig?: Partial<SimulationConfig>) {
    this.ships = Array.isArray(initialShips) ? JSON.parse(JSON.stringify(initialShips)) : [];
    this.jumpGate = jumpGate
      ? JSON.parse(JSON.stringify(jumpGate))
      : { pos: { x: 350, y: -250 }, radius: 38, shuttingDown: false, shutdownTimer: 0, maxShutdownTime: 300 };
    this.selectedShipId = this.ships[0]?.id || null;
    this.missiles = [];
    this.counterMissiles = [];
    if (this.ordnanceSOA) {
      this.ordnanceSOA.missiles.activeCount = 0;
      this.ordnanceSOA.cms.activeCount = 0;
    }
    this.detonations = [];
    this.combatLogs = [];

    this.config = {
      hostilePdplaHitChance: 0.90,
      friendlyPdplaHitChance: 0.90,
      hostileCmLaunchProb: 0.80,
      friendlyCmLaunchProb: 0.80,
      counterMissileAccuracy: 0.80, // Default 80% accuracy for counter-missiles
      pdplaAccuracy: 0.90,          // 90% accuracy for beam point defenses
      counterMissileSpeed: DEFAULT_CM_SPEED,   // 1102.5 km/s (scaled 4.5x)
      counterMissileRange: BASE_TACTICAL_RANGES.counterMissileRangeKm,   // 400.0 km
      counterMissileReload: 3.0,    // 3.0s reload between defensive salvos
      pdplaRange: BASE_TACTICAL_RANGES.pointDefenseRangeKm,             // 200.0 km
      pdplaMaxBursts: 5,            // Maximum 5 bursts before overload lockout
      pdplaOverheatDuration: 3.0,   // 3.0s lockout duration
      shieldCoolRate: 12.0,
      radarRange: BASE_TACTICAL_RANGES.radarRangeKm,                   // 8400.0 km
      passiveRange: BASE_TACTICAL_RANGES.passiveRangeKm,               // 25200.0 km
      missileRange: BASE_TACTICAL_RANGES.missileLockRangeKm,            // 2400.0 km
      fogOfWarRange: BASE_TACTICAL_RANGES.passiveRangeKm,               // 25200.0 km passive horizon
      showRangeRings: true,
      hostileAutoFire: false,
      ...initialConfig,
    };

    // Procedural Solar System Generation & Celestial Synchronization
    this.initSolarSystemAndEntities(this.config.seed);

    // Ensure warships default to AGGRESSIVE stance and autoFire is true for active combat testing
    for (const s of this.ships) {
      this.sanitizeShip(s);
      if (s.role === 'CRUISER' || s.role === 'BATTLECRUISER' || s.role === 'DESTROYER') {
        s.combatStance = 'AGGRESSIVE';
        s.autoFire = true;
      }
      if (s.counterMissilesMax === undefined) {
        s.counterMissilesMax = s.counterMissiles || 50;
      }
      if (s.counterMissileCooldown === undefined) {
        s.counterMissileCooldown = 0.0;
      }
      if (s.pdplaBeamHit === undefined) {
        s.pdplaBeamHit = true;
      }
      if (s.pdplaSalvoCount === undefined) {
        s.pdplaSalvoCount = 0;
      }
      if (s.pdplaOverheated === undefined) {
        s.pdplaOverheated = false;
      }
      if (s.pdplaOverheatTimer === undefined) {
        s.pdplaOverheatTimer = 0.0;
      }
      if (s.pdplaOverheatDuration === undefined) {
        s.pdplaOverheatDuration = 3.0;
      }
      if (s.faction === 'HOSTILE') {
        this.initHostilePatrol(s);
      }
    }

    this.updateResearchStationsCount();
    this.recalculateResearchScalars();

    // Initial Sensor Sweep & Fog of War Evaluation across all initial entities
    updateSensorsAndFogOfWar(this);
  }

  /**
   * Initializes or regenerates the procedural multi-system galaxy hierarchy and docks HQ/fleet
   */
  public initSolarSystemAndEntities(
    seed?: number,
    systemCount?: number,
    systemSpacing?: number,
    homeworldTypeParam?: HomeworldTypeId,
    hqTypeParam?: HqTypeId
  ) {
    const effectiveSeed = seed ?? this.config.seed ?? 1337;
    const effectiveSystemCount = systemCount ?? (this.config as any).systemCount ?? 4;
    const effectiveSystemSpacing = systemSpacing ?? (this.config as any).systemSpacing ?? 250000;
    (this.config as any).systemCount = effectiveSystemCount;
    (this.config as any).systemSpacing = effectiveSystemSpacing;

    if (homeworldTypeParam) {
      this.homeworldType = homeworldTypeParam;
    } else if (!this.homeworldType) {
      this.homeworldType = getDefaultHomeworldForFaction(this.playerFaction);
    }

    if (hqTypeParam) {
      this.hqType = hqTypeParam;
    } else if (!this.hqType) {
      this.hqType = getDefaultHQForFaction(this.playerFaction);
    }

    const galaxyRes = generateGalaxy({
      systemCount: effectiveSystemCount,
      systemSpacing: effectiveSystemSpacing,
      seed: effectiveSeed,
      factionId: this.playerFaction,
      homeworldType: this.homeworldType,
    });
    this.galaxyResult = galaxyRes;
    this.systems = galaxyRes.systems;
    this.planets = galaxyRes.allPlanets;
    const homeworldDescriptor = galaxyRes.systems[0];
    this.solarSystem = homeworldDescriptor.solarSystem!;
    this.asteroids = galaxyRes.allAsteroids as unknown as AsteroidEntity[];
    this.asteroidSpatialStore.init(this.asteroids, galaxyRes.allClusters);

    setGlobalGalaxyData(this.systems, galaxyRes.allPlanets, galaxyRes.allAsteroids);
    globalState.ships = this.ships;

    // Apply designated homeworld biome to primary habitable planet
    const primaryPlanet = this.solarSystem.primaryHabitablePlanet;
    if (primaryPlanet) {
      applyHomeworldTypeToPlanet(primaryPlanet, this.homeworldType);
    }

    // Configure and position HQ entity independently
    const hq = this.ships.find((s) => s.role === 'HQ');
    if (hq && primaryPlanet) {
      applyHQDefinitionToShip(hq, this.hqType, this.playerFaction, primaryPlanet);

      const isRing = hq.isRingStructure || hq.hqType === 'GARN_RING_CITADEL' || hq.isGarnRing;
      const isMobile = hq.isMobile || hq.hqType === 'YESTIRI_CITY_SHIP' || hq.isCityShip;

      if (isRing) {
        // Garn Ring Citadel: Encircles the homeworld planet as an annular orbital megastructure
        hq.pos.x = primaryPlanet.pos.x;
        hq.pos.y = primaryPlanet.pos.y;
        const ringInnerR = primaryPlanet.radius * 1.40;
        const ringOuterR = primaryPlanet.radius * 1.68;
        hq.ringInnerRadius = ringInnerR;
        hq.ringOuterRadius = ringOuterR;
        hq.radius = ringOuterR;
        hq.renderedLength = ringOuterR * 2.0;
        hq.dockingRadius = ringOuterR + 40.0;
        // Ore transfer space sits as a FUNCTION of the size of the HQ: 250km outside outer visual edge of actual ring
        hq.oreDropOffRange = ringOuterR + 250.0;
        hq.selectionRadius = ringOuterR + 30.0;
        hq.pdplaRange = 600.0;
        hq.isStationary = true;
        hq.velocity = { x: 0, y: 0 };
        hq.inGravityWell = true;
        hq.gravityWellBody = primaryPlanet.name;
        hq.capturedReferenceFrame = {
          id: primaryPlanet.id,
          name: primaryPlanet.name,
          type: 'PLANET',
          center: { ...primaryPlanet.pos },
          localOffset: { x: 0, y: 0 },
        };
        hq.isMoored = true;
      } else {
        const hqStationRadius = hq.radius || HQ_CONFIG.radius;
        const hqOffset = calculateHQAnchorOffset(primaryPlanet.radius, hqStationRadius);
        hq.pos.x = primaryPlanet.pos.x + hqOffset.x;
        hq.pos.y = primaryPlanet.pos.y + hqOffset.y;
        hq.velocity = { x: 0, y: 0 };
        hq.inGravityWell = true;
        hq.gravityWellBody = primaryPlanet.name;
        hq.capturedReferenceFrame = {
          id: primaryPlanet.id,
          name: primaryPlanet.name,
          type: 'PLANET',
          center: { ...primaryPlanet.pos },
          localOffset: { x: hqOffset.x, y: hqOffset.y },
        };
        hq.isMoored = !isMobile;
        hq.isStationary = !isMobile;
      }
    }

    // Position friendly taskforce in tactical escort formation around HQ/Planet with clearance
    const isRing = hq?.isRingStructure || hq?.hqType === 'GARN_RING_CITADEL' || hq?.isGarnRing;
    const friendlyUnits = this.ships.filter((s) => s.faction === 'FRIENDLY' && s.role !== 'HQ');
    friendlyUnits.forEach((s, idx) => {
      const formAngle = Math.PI * 0.75 + (idx - 0.5) * 0.45;
      const baseDist = isRing ? (primaryPlanet.radius * 1.75 + 180) : ((hq?.radius || 90) * 1.8 + 120);
      const formDist = baseDist + (idx % 2) * 80;
      const centerOrigin = isRing ? primaryPlanet.pos : (hq ? hq.pos : primaryPlanet.pos);
      s.pos.x = centerOrigin.x + Math.cos(formAngle) * formDist;
      s.pos.y = centerOrigin.y + Math.sin(formAngle) * formDist;
      s.velocity = { x: 0, y: 0 };
      s.splineActive = false;
      s.waypoints = [];
    });

    // Jump Gate: Hyperspace egress threshold placed outside inner planetary margin of homeworld
    const jgAngle = Math.PI * 0.85;
    const origin0 = homeworldDescriptor.center;
    this.jumpGate.pos = {
      x: origin0.x + Math.cos(jgAngle) * (9500 * K_SCALE),
      y: origin0.y + Math.sin(jgAngle) * (9500 * K_SCALE),
    };

    // Retain existing friendly ships (HQ, Vanguard, logistics, miners, shipyard)
    const friendlyShips = this.ships.filter((s) => s.faction === 'FRIENDLY');
    friendlyShips.forEach((s) => {
      s.factionId = this.playerFaction || 'NOVAN';
      s.systemId = homeworldDescriptor.id;
    });

    // System-Aware Hostile Fleet & Planetary Garrison Spawning
    const allHostiles: ShipEntity[] = [];
    for (let i = 0; i < this.systems.length; i++) {
      const sys = this.systems[i];
      if (i > 0 && this.gameSetupConfig?.systemOpponents && this.gameSetupConfig.systemOpponents[i - 1]) {
        sys.assignedFaction = this.gameSetupConfig.systemOpponents[i - 1];
      } else if (i === 0) {
        sys.assignedFaction = this.playerFaction || 'NOVAN';
      }
      const hostiles = spawnSystemHostiles(sys, this);
      allHostiles.push(...hostiles);
    }

    // Homeworld Outer Deep-Space Pirate Bastion & Garrison
    const pirateRng = new SeededRNG(effectiveSeed + 7777);
    const effectiveHqPos = hq ? hq.pos : primaryPlanet.pos;
    const pirateResult = generatePirateFaction(this.solarSystem, pirateRng, effectiveHqPos);
    pirateResult.bastion.factionId = 'PIRATE';
    pirateResult.bastion.isPirate = true;
    pirateResult.bastion.systemId = homeworldDescriptor.id;
    pirateResult.bastionGarrison.forEach((g) => {
      g.factionId = 'PIRATE';
      g.isPirate = true;
      g.systemId = homeworldDescriptor.id;
    });
    allHostiles.push(pirateResult.bastion);
    allHostiles.push(...pirateResult.bastionGarrison);

    // Combine friendly ships with procedural hostile fleet
    const sanitizedHostiles = allHostiles.map((p) => {
      this.sanitizeShip(p);
      if (p.counterMissilesMax === undefined) p.counterMissilesMax = p.counterMissiles || 50;
      if (p.counterMissileCooldown === undefined) p.counterMissileCooldown = 0.0;
      if (p.pdplaBeamHit === undefined) p.pdplaBeamHit = true;
      if (p.pdplaSalvoCount === undefined) p.pdplaSalvoCount = 0;
      if (p.pdplaOverheated === undefined) p.pdplaOverheated = false;
      if (p.pdplaOverheatTimer === undefined) p.pdplaOverheatTimer = 0.0;
      if (p.pdplaOverheatDuration === undefined) p.pdplaOverheatDuration = 5.0;
      return p;
    });

    this.ships = [...friendlyShips, ...sanitizedHostiles];
    globalState.ships = this.ships;
    globalState.planets = this.planets;

    // Initialize autonomous patrol splines for mobile units with waypoints
    sanitizedHostiles.forEach((p) => {
      if (!p.isStationary) {
        const pWps = p.patrolWaypoints ?? [];
        if (pWps.length > 0) {
          p.pos = { ...pWps[0] };
          p.patrolWaypointIndex = 0;
          this.setAutonomousSplineOrder(p, pWps[0]);
        } else if (!p.mooredAnchorId) {
          this.initHostilePatrol(p);
        }
      }
    });

    this.addLog(
      'TACTICAL',
      `🏴‍☠️ Hostile Factions & Garrisons spawned: ${sanitizedHostiles.length} enemy warships active across ${this.systems.length} star systems!`,
      'warn'
    );
    updateSensorVisibility(this);
  }

  /**
   * Begins an active campaign with the specified system count (1-8) and faction configuration
   */
  public startCampaign(setupOrCount: number | GameSetupConfig = 4, seed: number = Date.now()) {
    let systemCount = 4;
    let playerFaction: FactionId = 'NOVAN';
    let systemOpponents: FactionId[] = [];

    if (typeof setupOrCount === 'number') {
      systemCount = Math.min(8, Math.max(2, setupOrCount || 2));
      const pool = ALL_FACTION_IDS.filter((f) => f !== 'NOVAN');
      systemOpponents = Array.from({ length: Math.max(1, systemCount - 1) }, (_, i) => pool[i % pool.length]);
      this.homeworldType = getDefaultHomeworldForFaction('NOVAN');
      this.hqType = getDefaultHQForFaction('NOVAN');
      this.gameSetupConfig = {
        systemCount,
        playerFaction,
        systemOpponents,
        homeworldType: this.homeworldType,
        hqType: this.hqType,
      };
    } else {
      systemCount = Math.min(8, Math.max(2, setupOrCount.systemCount || 2));
      playerFaction = setupOrCount.playerFaction;
      const pool = ALL_FACTION_IDS.filter((f) => f !== playerFaction);
      const needed = systemCount - 1;
      systemOpponents = Array.from({ length: needed }, (_, i) =>
        (setupOrCount.systemOpponents && setupOrCount.systemOpponents[i]) || pool[i % pool.length]
      );
      this.homeworldType = setupOrCount.homeworldType || getDefaultHomeworldForFaction(playerFaction);
      this.hqType = setupOrCount.hqType || getDefaultHQForFaction(playerFaction);
      this.gameSetupConfig = {
        systemCount,
        playerFaction,
        systemOpponents,
        homeworldType: this.homeworldType,
        hqType: this.hqType,
      };
    }

    this.playerFaction = playerFaction;
    globalState.playerFaction = playerFaction;
    globalState.factionId = playerFaction;
    globalState.gameSetupConfig = this.gameSetupConfig;

    this.gameStatus = 'ACTIVE';
    globalState.gameStatus = 'ACTIVE';
    this.isPaused = false;
    this.initSolarSystemAndEntities(seed, systemCount, 250000, this.homeworldType, this.hqType);
    this.diplomacyState = initializeDiplomacyState(this.gameSetupConfig, this.systems, this.playerFaction);
    (globalState as any).diplomacyState = this.diplomacyState;
    const facName = FACTION_REGISTRY[playerFaction]?.name || playerFaction;
    this.addLog(
      'TACTICAL',
      `CAMPAIGN INITIALIZED // Sector Commission: ${systemCount} Star Systems online. ${facName} Fleet commissioned.`,
      'info'
    );
  }

  /**
   * Advances orbital kinematics of comets and asteroid belt clusters across all star systems,
   * while keeping planets, moons, and primary star bodies in a static locked state.
   */
  public updateSolarSystem(dt: number) {
    if (!this.solarSystem) return;

    if (this.systems && this.systems.length > 0) {
      for (let sIdx = 0; sIdx < this.systems.length; sIdx++) {
        const sys = this.systems[sIdx]?.solarSystem;
        if (!sys) continue;
        if (ORBITAL_CONFIG.comets && sys.comets) {
          for (let i = 0; i < sys.comets.length; i++) stepCometKinematics(sys.comets[i], dt);
        }
        if (ORBITAL_CONFIG.planetsMoons) {
          if (sys.rockyPlanets) {
            for (let i = 0; i < sys.rockyPlanets.length; i++) stepPlanetKinematics(sys.rockyPlanets[i], dt);
          }
          if (sys.gasGiants) {
            for (let i = 0; i < sys.gasGiants.length; i++) stepPlanetKinematics(sys.gasGiants[i], dt);
          }
        }
        if (ORBITAL_CONFIG.asteroidBeltClusters && sys.clusters) {
          stepAsteroidBeltKinematics(sys.clusters, this.asteroids, dt);
        }
      }
      if (ORBITAL_CONFIG.asteroidBeltClusters) {
        syncAllAsteroidsKinematics(this.asteroids, dt);
      }
    } else {
      const sys = this.solarSystem;
      if (ORBITAL_CONFIG.comets && sys.comets) {
        for (let i = 0; i < sys.comets.length; i++) stepCometKinematics(sys.comets[i], dt);
      }
      if (ORBITAL_CONFIG.planetsMoons) {
        if (sys.rockyPlanets) {
          for (let i = 0; i < sys.rockyPlanets.length; i++) stepPlanetKinematics(sys.rockyPlanets[i], dt);
        }
        if (sys.gasGiants) {
          for (let i = 0; i < sys.gasGiants.length; i++) stepPlanetKinematics(sys.gasGiants[i], dt);
        }
      }
      if (ORBITAL_CONFIG.asteroidBeltClusters && sys.clusters) {
        stepAsteroidBeltKinematics(sys.clusters, this.asteroids, dt);
        syncAllAsteroidsKinematics(this.asteroids, dt);
      }
    }

    // 4. Maintain Player HQ stationary locked into position (ring centered on planet, others in upper-right shoulder):
    const primaryPlanet = this.solarSystem.primaryHabitablePlanet;
    const hq = this.getHQ();
    const isRingHq = Boolean(hq?.isRingStructure || hq?.hqType === 'GARN_RING_CITADEL' || hq?.isGarnRing);
    if (hq && primaryPlanet && !hq.isCityShip && !hq.isYestiriRing && !isRingHq) {
      const hqStationRadius = hq.radius ?? 80.0;
      const hqOffset = calculateHQAnchorOffset(primaryPlanet.radius, hqStationRadius);
      hq.pos.x = primaryPlanet.pos.x + hqOffset.x;
      hq.pos.y = primaryPlanet.pos.y + hqOffset.y;
      hq.velocity = { x: 0, y: 0 };
      hq.isStationary = true;
      if (hq.capturedReferenceFrame) {
        hq.capturedReferenceFrame.localOffset.x = hqOffset.x;
        hq.capturedReferenceFrame.localOffset.y = hqOffset.y;
        hq.capturedReferenceFrame.center.x = primaryPlanet.pos.x;
        hq.capturedReferenceFrame.center.y = primaryPlanet.pos.y;
      }
    } else if (hq && primaryPlanet && isRingHq) {
      hq.pos.x = primaryPlanet.pos.x;
      hq.pos.y = primaryPlanet.pos.y;
      hq.velocity = { x: 0, y: 0 };
      hq.isStationary = true;
      if (hq.capturedReferenceFrame) {
        hq.capturedReferenceFrame.localOffset.x = 0;
        hq.capturedReferenceFrame.localOffset.y = 0;
        hq.capturedReferenceFrame.center.x = primaryPlanet.pos.x;
        hq.capturedReferenceFrame.center.y = primaryPlanet.pos.y;
      }
    }

    globalState.ships = this.ships;
  }

  public isTargetInFriendlyVisualRange(pos: Vec2D): boolean {
    const radarRange = BASE_TACTICAL_RANGES.radarRangeKm * (this.sensorRangeMult ?? this.combatModifiers?.sensorRangeMult ?? 1.0);
    const radarRangeSq = radarRange * radarRange;
    for (const s of this.ships) {
      if (s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED') {
        const dx = s.pos.x - pos.x;
        const dy = s.pos.y - pos.y;
        if (dx * dx + dy * dy <= radarRangeSq) {
          return true;
        }
      }
    }
    return false;
  }

  public isShipObstructedByFog(ship: ShipEntity): boolean {
    if (ship.faction === 'FRIENDLY') return false;
    if (ship.visibilityState) {
      return ship.visibilityState !== 'RESOLVED';
    }
    return !this.isTargetInFriendlyVisualRange(ship.pos);
  }

  public addLog(
    type: CombatLogEntry['type'],
    text: string,
    severity: CombatLogEntry['severity'] = 'info',
    isPlayerOwned?: boolean,
    sourceFaction?: string
  ) {
    const timeStr = new Date().toTimeString().split(' ')[0];

    // Determine whether this log is produced by or directly targets a player-owned unit
    let effectivePlayerOwned = isPlayerOwned;
    if (effectivePlayerOwned === undefined) {
      if (sourceFaction) {
        effectivePlayerOwned = sourceFaction === 'FRIENDLY';
      } else {
        const lowerText = text.toLowerCase();
        if (
          text.includes('[HOSTILE]') ||
          text.includes('[PIRATE]') ||
          text.includes('[DEFENDER]') ||
          text.includes('[NEUTRAL]') ||
          lowerText.includes('pirate raider') ||
          lowerText.includes('defender patrol') ||
          lowerText.includes('hostile frigate') ||
          lowerText.includes('hostile destroyer')
        ) {
          // If a player unit or HQ was targeted/damaged by hostile fire, player still receives the notification
          if (
            lowerText.includes('vanguard') ||
            lowerText.includes('citadel') ||
            lowerText.includes('friendly') ||
            lowerText.includes('forge-builder') ||
            lowerText.includes('hq')
          ) {
            effectivePlayerOwned = true;
          } else {
            effectivePlayerOwned = false;
          }
        } else {
          effectivePlayerOwned = true;
        }
      }
    }

    this.combatLogs.push({
      id: `log-${++this.logIdCounter}`,
      time: timeStr,
      type,
      text,
      severity,
      isPlayerOwned: effectivePlayerOwned,
      sourceFaction,
    });
    if (this.combatLogs.length > 60) {
      this.combatLogs.splice(0, this.combatLogs.length - 60);
    }
  }

  public getSelectedShip(): ShipEntity | undefined {
    return this.ships.find((s) => s.id === this.selectedShipId);
  }

  public setSplineOrder(shipId: string, targetPos: Vec2D, targetSpeed?: number) {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || ship.hullState === 'DESTROYED') return;

    if (ship.isStationary) {
      this.addLog('TACTICAL', `${ship.name}: Stationary orbital structure cannot maneuver.`, 'warn');
      return;
    }

    issueMoveCommand(ship, targetPos, targetSpeed);

    if (isMinerVessel(ship)) {
      unclampMiner(ship);
    }

    const maxSpd = (ship.commandedSpeed || ship.maxSpeed || 1000.0).toFixed(0);
    this.addLog('ORDNANCE', `${ship.name}: Kinematic burn vector set -> (${Math.round(targetPos.x)}, ${Math.round(targetPos.y)}) [Max Speed: ${maxSpd} km/s]`, 'info');
  }

  public getSelectedShips(): ShipEntity[] {
    const idSet = new Set(this.selectedShipIds);
    return this.ships.filter((s) => idSet.has(s.id) && s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED');
  }

  public getDesignatedFlagship(): ShipEntity | null {
    const ships = this.getSelectedShips();
    return determineFlagship(ships);
  }

  public setFleetMoveOrder(targetPos: Vec2D, density?: FormationDensity, cohesion?: MovementCohesion) {
    const selected = this.getSelectedShips();
    if (selected.length === 0) return;

    if (selected.length === 1) {
      this.setSplineOrder(selected[0].id, targetPos);
      return;
    }

    const flagship = determineFlagship(selected);
    if (!flagship) return;

    const escorts: ShipEntity[] = [];
    for (let i = 0, len = selected.length; i < len; i++) {
      if (selected[i].id !== flagship.id) {
        escorts.push(selected[i]);
      }
    }

    const usedDensity = density ?? this.formationDensity;
    const usedCohesion = cohesion ?? this.movementCohesion;

    computeFormationOffsets(
      flagship,
      escorts,
      usedDensity,
      this.fleetScreenVanguard,
      this.config.counterMissileRange
    );

    // Speed Governor Optimization: Compute fleet maximum speed clamp only once when fleet is ordered/altered
    const fleetSpeed = computeFleetSpeedCap(selected);

    // Order Flagship
    this.setSplineOrder(
      flagship.id,
      targetPos,
      usedCohesion === 'UNIT' ? fleetSpeed : flagship.maxSpeed
    );

    // Order Escorts using cached polar station-keeping offsets
    for (let i = 0, len = escorts.length; i < len; i++) {
      const escort = escorts[i];
      const escortTarget = getStationKeepingPosition(targetPos, escort);
      this.setSplineOrder(
        escort.id,
        escortTarget,
        usedCohesion === 'UNIT' ? fleetSpeed : escort.maxSpeed
      );
    }

    this.addLog(
      'TACTICAL',
      `Fleet Formation (${selected.length} hulls) en route to (${Math.round(targetPos.x)}, ${Math.round(targetPos.y)}) [${usedDensity} | ${usedCohesion === 'UNIT' ? `UNIT COHESION (${fleetSpeed.toFixed(0)} km/s)` : 'MAX SPEED'}]`,
      'info'
    );
  }

  public setFleetCombatStance(stance: CombatStance) {
    const selected = this.getSelectedShips();
    for (const s of selected) {
      this.setCombatStance(s.id, stance);
    }
    this.addLog('TACTICAL', `Fleet Tactical Stance synchronized -> [${stance}] across ${selected.length} vessels.`, 'info');
  }

  public cycleFleetFormationDensity(): FormationDensity {
    const cycle: FormationDensity[] = ['CLOSE', 'LOOSE', 'TIGHT'];
    const curIdx = cycle.indexOf(this.formationDensity);
    this.formationDensity = cycle[(curIdx + 1) % cycle.length];

    const flagship = this.getDesignatedFlagship();
    if (flagship && flagship.splineActive && flagship.splineP1) {
      this.setFleetMoveOrder(flagship.splineP1, this.formationDensity, this.movementCohesion);
    }

    this.addLog('TACTICAL', `Fleet Formation Spacing toggled -> [${this.formationDensity}]`, 'info');
    return this.formationDensity;
  }

  public toggleFleetMovementCohesion(): MovementCohesion {
    this.movementCohesion = this.movementCohesion === 'UNIT' ? 'MAX_SPEED' : 'UNIT';
    const flagship = this.getDesignatedFlagship();
    if (flagship && flagship.splineActive && flagship.splineP1) {
      this.setFleetMoveOrder(flagship.splineP1, this.formationDensity, this.movementCohesion);
    }
    this.addLog('TACTICAL', `Fleet Speed Mode -> [${this.movementCohesion === 'UNIT' ? 'MOVE AS A UNIT (Throttle to Slowest)' : 'MAX INDEPENDENT SPEED'}]`, 'info');
    return this.movementCohesion;
  }

  public cycleFleetPdPosture(): FleetPdPosture {
    const cycle: FleetPdPosture[] = ['AUTO', 'CONSERVE', 'FOCUS'];
    const curIdx = cycle.indexOf(this.fleetPdPosture);
    this.fleetPdPosture = cycle[(curIdx + 1) % cycle.length];
    const selected = this.getSelectedShips();
    for (const s of selected) {
      s.pdMode = this.fleetPdPosture;
    }
    this.addLog('TACTICAL', `Fleet Point-Defense Posture set -> [${this.fleetPdPosture}] across ${selected.length} hulls.`, 'info');
    return this.fleetPdPosture;
  }

  public fireFleetSynchronizedSalvo(): number {
    const selected = this.getSelectedShips();
    let firedCount = 0;
    for (const s of selected) {
      if (s.missiles > 0 && s.missileCooldown <= 0) {
        this.fireManualSalvo(s.id);
        firedCount++;
      }
    }
    if (firedCount > 0) {
      this.addLog('ORDNANCE', `SYNCHRONIZED VOLLEY: ${firedCount} vessels fired salvo ripples simultaneously!`, 'success');
    } else {
      this.addLog('ORDNANCE', 'Synchronized Volley: No selected ships had ordnance loaded and off cooldown.', 'warn');
    }
    return firedCount;
  }

  public toggleFleetScreenPosition(): boolean {
    this.fleetScreenVanguard = !this.fleetScreenVanguard;
    const flagship = this.getDesignatedFlagship();
    if (flagship && flagship.splineActive && flagship.splineP1) {
      this.setFleetMoveOrder(flagship.splineP1, this.formationDensity, this.movementCohesion);
    }
    this.addLog('TACTICAL', `Fleet Screen Repositioned -> [${this.fleetScreenVanguard ? 'FORWARD VANGUARD' : 'REARGUARD'}]`, 'info');
    return this.fleetScreenVanguard;
  }

  public formFleetGroup(customShipIds?: string[]): FleetGroup | null {
    const targetIds = customShipIds ?? (this.selectedShipIds.length > 0 ? this.selectedShipIds : (this.selectedShipId ? [this.selectedShipId] : []));
    const validShips = this.ships.filter((s) => targetIds.includes(s.id) && s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED');
    if (validShips.length === 0) {
      this.addLog('TACTICAL', 'Cannot form fleet: No operational friendly ships selected.', 'warn');
      return null;
    }

    // Find lowest available slot 1..9
    let targetSlot = -1;
    for (let i = 1; i <= 9; i++) {
      if (!this.fleetGroups.has(i)) {
        targetSlot = i;
        break;
      }
    }
    if (targetSlot === -1) {
      targetSlot = 1;
    }

    const flagship = determineFlagship(validShips);
    const speedCap = computeFleetSpeedCap(validShips);
    const group: FleetGroup = {
      id: targetSlot,
      name: `Fleet ${targetSlot}`,
      shipIds: validShips.map((s) => s.id),
      flagshipId: flagship ? flagship.id : validShips[0].id,
      density: this.formationDensity,
      cohesion: this.movementCohesion,
      pdPosture: this.fleetPdPosture,
      screenVanguard: this.fleetScreenVanguard,
      speedCap,
    };

    this.fleetGroups.set(targetSlot, group);
    this.addLog('TACTICAL', `⚡ FLEET BINDING: Fleet Group [${targetSlot}] registered with ${validShips.length} vessels (Flagship: ${flagship?.name || 'N/A'}, Speed Cap: ${speedCap.toFixed(0)} km/s). Hotkey: [${targetSlot}]`, 'success');
    return group;
  }

  public disbandFleetGroup(slot: number) {
    if (this.fleetGroups.has(slot)) {
      this.fleetGroups.delete(slot);
      this.addLog('TACTICAL', `Fleet Group [${slot}] disbanded. Slot [${slot}] is now free.`, 'info');
    }
  }

  public selectFleetGroup(slot: number): string[] {
    const group = this.fleetGroups.get(slot);
    if (!group) return [];

    const operational = this.ships.filter((s) => group.shipIds.includes(s.id) && s.hullState !== 'DESTROYED');
    if (operational.length === 0) {
      this.fleetGroups.delete(slot);
      this.addLog('TACTICAL', `Fleet Group [${slot}] automatically disbanded: All vessels destroyed.`, 'warn');
      return [];
    }

    group.shipIds = operational.map((s) => s.id);
    group.speedCap = computeFleetSpeedCap(operational);
    const flagship = determineFlagship(operational);
    if (flagship) {
      group.flagshipId = flagship.id;
    }

    this.selectedShipIds = [...group.shipIds];
    this.selectedShipId = group.flagshipId;
    this.formationDensity = group.density;
    this.movementCohesion = group.cohesion;
    this.fleetPdPosture = group.pdPosture;
    this.fleetScreenVanguard = group.screenVanguard;

    this.addLog('TACTICAL', `Fleet Group [${slot}] selected (${operational.length} vessels, Flagship: ${flagship?.name || 'N/A'}).`, 'info');
    return group.shipIds;
  }

  public getShipFleetId(shipId: string): number {
    for (const [fId, group] of this.fleetGroups.entries()) {
      if (group.shipIds.includes(shipId)) {
        return fId;
      }
    }
    return 0;
  }

  public assignShipToFleet(shipId: string, targetFleetId: number): void {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship) return;

    // Detach ship from any current fleet groups
    for (const [fId, group] of this.fleetGroups.entries()) {
      if (group.shipIds.includes(shipId)) {
        group.shipIds = group.shipIds.filter((id) => id !== shipId);
        if (group.shipIds.length === 0) {
          this.fleetGroups.delete(fId);
        } else if (group.flagshipId === shipId) {
          const remaining = this.ships.filter((s) => group.shipIds.includes(s.id) && s.hullState !== 'DESTROYED');
          const newFlag = determineFlagship(remaining);
          if (newFlag) {
            group.flagshipId = newFlag.id;
          }
        }
      }
    }

    // Detached to independent status
    if (targetFleetId === 0) {
      this.addLog('TACTICAL', `⚓ ${ship.name}: Detached from fleet groups. Operating as independent unit.`, 'info');
      return;
    }

    // Assign to targeted fleet group
    let group = this.fleetGroups.get(targetFleetId);
    if (!group) {
      group = {
        id: targetFleetId,
        name: `Fleet ${targetFleetId}`,
        shipIds: [shipId],
        flagshipId: shipId,
        density: this.formationDensity,
        cohesion: this.movementCohesion,
        pdPosture: this.fleetPdPosture,
        screenVanguard: this.fleetScreenVanguard,
      };
      this.fleetGroups.set(targetFleetId, group);
      this.addLog('TACTICAL', `⚡ FLEET BINDING: Created Fleet Group [${targetFleetId}] with ${ship.name} as Flagship.`, 'success');
    } else {
      if (!group.shipIds.includes(shipId)) {
        group.shipIds.push(shipId);
      }
      // Automatically adopt the fleet's current formation spacing, stance, and speed mode
      const allMembers = this.ships.filter((s) => group!.shipIds.includes(s.id) && s.hullState !== 'DESTROYED');
      const flagship = determineFlagship(allMembers);
      if (flagship) {
        group.flagshipId = flagship.id;
        ship.combatStance = flagship.combatStance;
        ship.aggressiveDoctrine = flagship.aggressiveDoctrine;
      }
      this.formationDensity = group.density;
      this.movementCohesion = group.cohesion;
      this.fleetPdPosture = group.pdPosture;
      this.fleetScreenVanguard = group.screenVanguard;
      this.addLog('TACTICAL', `⚓ ${ship.name}: Assigned to Fleet Group [${targetFleetId}] (${group.shipIds.length} vessels). Stance & formation synchronized.`, 'success');
    }
  }

  public readonly FTL_INTERDICTION_RADIUS = 16000.0;

  public get ftlInterdictionRadius(): number {
    return this.solarSystem?.beltRadiusMax || this.FTL_INTERDICTION_RADIUS;
  }

  public isInsideInterdictionZone(pos: Vec2D): boolean {
    return Math.hypot(pos.x, pos.y) <= this.ftlInterdictionRadius;
  }

  /**
   * Resolves the star system descriptor that the given ship belongs to.
   */
  public getSystemForShip(ship: ShipEntity): StarSystemDescriptor | undefined {
    if (ship.systemId && this.systems) {
      const found = this.systems.find((s) => s.id === ship.systemId);
      if (found) return found;
    }
    if (this.systems && this.systems.length > 0 && ship.pos) {
      let closest = this.systems[0];
      let minDistSq = Infinity;
      for (const sys of this.systems) {
        const cx = sys.center?.x ?? 0;
        const cy = sys.center?.y ?? 0;
        const dSq = (ship.pos.x - cx) ** 2 + (ship.pos.y - cy) ** 2;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          closest = sys;
        }
      }
      return closest;
    }
    return undefined;
  }

  /**
   * Finds the host planetary body whose gravity well contains the given coordinates.
   * Orbital structures can only be designated within this boundary.
   */
  public findHostPlanetForPosition(pos: Vec2D): RockyPlanet | GasGiant | null {
    if (!this.solarSystem) return null;
    for (const planet of this.solarSystem.rockyPlanets) {
      const d = Math.hypot(pos.x - planet.pos.x, pos.y - planet.pos.y);
      const rWell = planet.wellRadius || getPlanetaryGravityWellRadius(planet);
      if (d <= rWell) {
        return planet;
      }
    }
    for (const giant of this.solarSystem.gasGiants) {
      const d = Math.hypot(pos.x - giant.pos.x, pos.y - giant.pos.y);
      const rWell = giant.wellRadius || getPlanetaryGravityWellRadius(giant);
      if (d <= rWell) {
        return giant;
      }
    }
    return null;
  }

  public calculateJumpCost(origin: Vec2D, target: Vec2D): number {
    // Baseline: Maximum possible system diameter (e.g., 2 * arenaRadius, ~60,000px) costs exactly 1,000 Hydrogen.
    // Actual Cost = Math.ceil((targetDistance / systemDiameter) * 1000)
    const systemDiameter = this.solarSystem?.arenaRadius ? this.solarSystem.arenaRadius * 2.0 : 60000.0;
    const dist = Math.hypot(target.x - origin.x, target.y - origin.y);
    return Math.max(1, Math.ceil((dist / systemDiameter) * 1000.0));
  }

  public triggerCatastrophicDriveFailure(pos: Vec2D, shipName: string) {
    for (let i = 0; i < 5; i++) {
      this.detonations.push({
        id: `det-breach-${Date.now()}-${i}-${Math.random()}`,
        pos: {
          x: pos.x + (Math.random() - 0.5) * 60,
          y: pos.y + (Math.random() - 0.5) * 60,
        },
        timer: -i * 0.12,
        duration: 2.2 + i * 0.4,
        maxRadius: 150.0 + i * 45.0,
        color: i % 2 === 0 ? '#ef4444' : '#fb923c',
        type: 'FUEL_EXHAUSTION',
        label: `💥 [CATASTROPHIC FTL DRIVE BREACH: ${shipName.toUpperCase()}]`,
      });
    }
  }

  public initiateJump(shipId: string, targetPos: Vec2D): { success: boolean; reason?: string } {
    const ship = this.ships.find((s) => s.id === shipId);
    const canJumpStationary = ship && (ship.isCityShip || ship.role === 'CITY_SHIP' || (ship.role === 'HQ' && (ship.isYestiriRing || ship.factionId === 'YESTIRI' || ship.isCityShip)));
    if (!ship || ship.hullState !== 'OPERATIONAL' || (ship.isStationary && !canJumpStationary)) {
      return { success: false, reason: 'Stationary, crippled, or invalid vessel' };
    }

    const systemDiameter = this.solarSystem?.arenaRadius ? this.solarSystem.arenaRadius * 2.0 : 60000.0;
    return initiateSingleJump(
      ship,
      targetPos,
      this.ftlInterdictionRadius,
      systemDiameter,
      this.systems,
      this.addLog.bind(this)
    );
  }

  public executeTacticalMicroJump(shipId: string, worldMouse: Vec2D): boolean {
    const res = this.initiateJump(shipId, worldMouse);
    return res.success;
  }

  public getMissileClassForRole(role?: ShipRole): MissileClass {
    if (!role) return 'MEDIUM';
    if (role === 'DREADNOUGHT' || role === 'BATTLESHIP' || role === 'BASTION' || role === 'SY_HEAVY') {
      return 'HEAVY';
    }
    if (
      role === 'FRIGATE' ||
      role === 'DESTROYER' ||
      role === 'LIGHT_CRUISER' ||
      role === 'MINER' ||
      role === 'SY_LIGHT'
    ) {
      return 'LIGHT';
    }
    return 'MEDIUM';
  }

  public fireManualSalvo(shipId: string) {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || ship.hullState !== 'OPERATIONAL') return;

    if (ship.combatStance === 'PASSIVE') {
      this.addLog('ORDNANCE', `${ship.name}: Firing BLOCKED - Ship in PASSIVE stance (Weapons Hold). Switch to Defensive or Aggressive to fire.`, 'warn');
      return;
    }

    if (ship.missiles <= 0) {
      this.addLog('ORDNANCE', `${ship.name}: Missile Magazine EMPTY. UNREP replenishment required!`, 'warn');
      return;
    }
    if (ship.missileCooldown > 0) return;

    const doctrine = ship.aggressiveDoctrine || 'KILL';

    const hostiles = this.ships.filter((s) => {
      if (s.faction === ship.faction || s.hullState === 'DESTROYED') return false;
      if (doctrine === 'DISABLE' && s.hullState === 'CRIPPLED') return false;
      return true;
    });

    if (hostiles.length === 0) {
      if (doctrine === 'DISABLE') {
        this.addLog('ORDNANCE', `${ship.name}: Firing HOLD - In-range target is already DISABLED (Fire-to-Disable protocol).`, 'info');
      }
      return;
    }

    // A ship can only shoot something in visual range (not obstructed by fog of war)
    const visibleHostiles =
      ship.faction === 'FRIENDLY'
        ? hostiles.filter((h) => this.isTargetInFriendlyVisualRange(h.pos))
        : hostiles;

    if (visibleHostiles.length === 0) {
      this.addLog(
        'ORDNANCE',
        `${ship.name}: Firing ABORTED - All hostile targets obstructed by Fog of War (beyond ~3x missile range sensor horizon).`,
        'warn'
      );
      return;
    }

    // Closest visible hostile
    visibleHostiles.sort((a, b) => distSq(a.pos, ship.pos) - distSq(b.pos, ship.pos));
    const target = visibleHostiles[0];
    const targetDistSq = distSq(target.pos, ship.pos);
    const maxRangeSq = ship.missileRange * ship.missileRange;

    if (targetDistSq > maxRangeSq) {
      this.addLog(
        'ORDNANCE',
        `${ship.name}: Firing HOLD - Target ${target.name} is in visual range but beyond missile range (${Math.round(Math.sqrt(targetDistSq))}km > ${ship.missileRange}km).`,
        'warn'
      );
      return;
    }

    ship.targetEntityId = target.id;
    runCombatSalvo(ship, target, this.getCombatState());
  }

  public fireEnemySalvo() {
    const hostiles = this.ships.filter((s) => s.faction === 'HOSTILE' && s.hullState !== 'DESTROYED');
    const friendlies = this.ships.filter((s) => s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED');
    if (hostiles.length === 0 || friendlies.length === 0) return;

    const shooter = hostiles[0];
    const doctrine = shooter.aggressiveDoctrine || 'KILL';
    const validTargets = doctrine === 'DISABLE'
      ? friendlies.filter((f) => f.hullState === 'OPERATIONAL')
      : friendlies;
    if (validTargets.length === 0) return;

    const target = validTargets[0];
    const missileRange = shooter.missileRange || 800.0;
    const tubeCapacity = shooter.missileTubes ?? getShipArmament(shooter.role).totalMissileSalvo;
    const salvoCount = Math.min(tubeCapacity, Math.floor(shooter.missiles || 4));
    const missileClass = this.getMissileClassForRole(shooter.role);
    const initialHeading = Math.atan2(target.pos.y - shooter.pos.y, target.pos.x - shooter.pos.x);
    const offsets = [
      { x: -12, y: -8 }, { x: -12, y: 8 }, { x: 0, y: 0 },
      { x: 12, y: -4 }, { x: 12, y: 4 }, { x: -16, y: 0 }, { x: 16, y: 0 },
    ];
    for (let i = 0; i < salvoCount; i++) {
      const off = offsets[i % offsets.length];
      this.missiles.push({
        id: `m-${++this.missileIdCounter}`,
        origin: { x: shooter.pos.x + off.x, y: shooter.pos.y + off.y },
        pos: { x: shooter.pos.x + off.x, y: shooter.pos.y + off.y },
        targetId: target.id,
        sourceShipId: shooter.id,
        faction: 'HOSTILE',
        speed: DEFAULT_MISSILE_SPEED,
        maxLifetime: 20.0,
        lifetime: 0,
        alive: true,
        damage: 160.0,
        visualSeed: Math.random() * 100,
        trail: [],
        trailSampleTimer: 0,
        range: missileRange,
        maxPoweredDistance: missileRange * 1.10,
        distanceTraveled: 0,
        underPower: true,
        fuelExhausted: false,
        burnoutTimer: 0,
        doctrine,
        status: 'TRACKING',
        missileClass,
        heading: initialHeading,
      });
    }

    if (shooter.missiles > 0) {
      shooter.missiles = Math.max(0, shooter.missiles - salvoCount);
    }

    this.addLog(
      'ORDNANCE',
      `${shooter.name} [HOSTILE]: Inbound ${salvoCount}-warhead salvo tracked on ${target.name} [${doctrine}]!`,
      'warn'
    );
  }

  public setCombatStance(shipId: string, stance: CombatStance) {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || ship.hullState === 'DESTROYED') return;

    ship.combatStance = stance;
    ship.autoFire = stance === 'AGGRESSIVE';
    if (stance === 'AGGRESSIVE' && !ship.aggressiveDoctrine) {
      ship.aggressiveDoctrine = 'KILL';
    }

    const stanceLabel =
      stance === 'PASSIVE'
        ? 'PASSIVE [Weapons Hold - Never Fire]'
        : stance === 'DEFENSIVE'
        ? 'DEFENSIVE [Point Defense Only]'
        : `AGGRESSIVE [${ship.aggressiveDoctrine === 'DISABLE' ? 'Fire to Disable' : 'Fire to Kill'}]`;
    const severity = stance === 'AGGRESSIVE' ? 'warn' : stance === 'PASSIVE' ? 'info' : 'success';
    this.addLog('ORDNANCE', `${ship.name}: Combat Stance set to ${stanceLabel}`, severity);
  }

  public mountResearchOrbitalToShip(shipId: string, orbitalType: 'MILITARY_RESEARCH' | 'CIVIC_RESEARCH' | 'EXPANSION_CITADEL'): { success: boolean; reason?: string } {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship) return { success: false, reason: 'Vessel not found' };
    if (!ship.isCityShip && ship.role !== 'HQ' && (ship.role as string) !== 'CITY_SHIP') {
      return { success: false, reason: 'Only City Ships and Mobile Citadel HQs can mount hull research orbitals.' };
    }

    ship.mountedResearchModules = ship.mountedResearchModules || [];
    const maxModules = ship.maxMountedModules ?? 3;
    if (ship.mountedResearchModules.length >= maxModules) {
      return {
        success: false,
        reason: `Maximum mounted research modules reached (${maxModules}/${maxModules}). Research HQ Tier 1 Buildings Expansion to unlock +3 slots.`,
      };
    }

    const costs = {
      MILITARY_RESEARCH: { metallic: 50, organic: 25 },
      CIVIC_RESEARCH: { metallic: 40, organic: 30 },
      EXPANSION_CITADEL: { metallic: 80, organic: 45 },
    }[orbitalType];

    const hqRes = this.getHQResources();
    if (hqRes.metallic < costs.metallic || hqRes.organic < costs.organic) {
      return {
        success: false,
        reason: `Insufficient resources: requires ${costs.metallic} Metallic & ${costs.organic} Organic (Stockpile: ${Math.floor(hqRes.metallic)}M, ${Math.floor(hqRes.organic)}O)`,
      };
    }

    hqRes.metallic -= costs.metallic;
    hqRes.organic -= costs.organic;
    ship.mountedResearchModules.push(orbitalType);
    this.recalculateResearchScalars();

    const nameMap = {
      MILITARY_RESEARCH: 'Military Research Station (MRS)',
      CIVIC_RESEARCH: 'Civic Research Outpost (CRO)',
      EXPANSION_CITADEL: 'Expansion Research Citadel (EXC)',
    };
    this.addLog('LOGISTICS', `🛠️ Mounted ${nameMap[orbitalType]} onto ${ship.name} hull [Slots: ${ship.mountedResearchModules.length}/${maxModules}].`, 'success');
    return { success: true };
  }

  public unmountResearchOrbitalFromShip(shipId: string, index?: number): { success: boolean; reason?: string } {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || !ship.mountedResearchModules || ship.mountedResearchModules.length === 0) {
      return { success: false, reason: 'No mounted research modules to unmount' };
    }

    const targetIdx = index !== undefined && index >= 0 && index < ship.mountedResearchModules.length
      ? index
      : ship.mountedResearchModules.length - 1;

    const removed = ship.mountedResearchModules.splice(targetIdx, 1)[0];

    const refund = {
      MILITARY_RESEARCH: { metallic: 50, organic: 25 },
      CIVIC_RESEARCH: { metallic: 40, organic: 30 },
      EXPANSION_CITADEL: { metallic: 80, organic: 45 },
    }[removed] || { metallic: 0, organic: 0 };

    const hqRes = this.getHQResources();
    hqRes.metallic += refund.metallic;
    hqRes.organic += refund.organic;
    this.recalculateResearchScalars();

    this.addLog('LOGISTICS', `♻️ Dismantled hull orbital module from ${ship.name}; refunded ${refund.metallic}M & ${refund.organic}O.`, 'info');
    return { success: true };
  }

  public setAggressiveDoctrine(shipId: string, doctrine: AggressiveDoctrine) {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || ship.hullState === 'DESTROYED') return;

    ship.aggressiveDoctrine = doctrine;
    const doctrineLabel =
      doctrine === 'KILL'
        ? 'FIRE TO KILL [Fires until target frame destroyed]'
        : 'FIRE TO DISABLE [Ceases fire once crippled; in-flight rounds self-destruct]';
    this.addLog('ORDNANCE', `${ship.name}: Aggressive Doctrine set to ${doctrineLabel}`, 'warn');
  }

  public setMinerStance(shipId: string, stance: MinerStance) {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || ship.hullState === 'DESTROYED') return;

    ship.minerStance = stance;
    if (stance === 'CARELESS') {
      ship.minerRetreating = false;
    }
    const desc =
      stance === 'TIMID'
        ? 'TIMID [Threat-Aware: Avoids hostile sectors & executes retreat steering]'
        : 'CARELESS [Threat-Agnostic: Mines nearest nodes under fire]';
    const severity = stance === 'TIMID' ? 'info' : 'warn';
    this.addLog('RESOURCE', `⛏️ ${ship.name}: Miner Stance set to ${desc}`, severity);
  }

  public toggleShipCleanup(shipId: string): boolean {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || ship.hullState === 'DESTROYED') return false;

    ship.cleanupStance = !ship.cleanupStance;
    if (ship.cleanupStance) {
      ship.salvageState =
        (ship.scrapUnits || 0) >= (ship.scrapUnitsMax || 3)
          ? 'RETURNING_TO_DEPOSIT'
          : 'SEEKING_SCRAP';
      this.addLog(
        'SALVAGE',
        `♻️ ${ship.name}: Autonomous Battlefield Cleanup protocol ENGAGED. Scanning sector for debris...`,
        'info'
      );
    } else {
      ship.salvageState = 'IDLE';
      ship.salvageTargetId = null;
      this.addLog('SALVAGE', `⏸️ ${ship.name}: Cleanup protocol STANDBY.`, 'info');
    }
    return Boolean(ship.cleanupStance);
  }

  public orderDepositScrap(shipId: string): boolean {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship || ship.hullState === 'DESTROYED') return false;
    ship.salvageState = 'RETURNING_TO_DEPOSIT';
    this.addLog('SALVAGE', `📦 ${ship.name}: Ordered to return and deposit scrap hold to nearest Depot.`, 'info');
    return true;
  }

  public orderSalvageScrap(shipId: string, scrapId: string): boolean {
    const ship = this.ships.find((s) => s.id === shipId);
    const scrap = this.scraps.find((sc) => sc.id === scrapId);
    if (!ship || !scrap || ship.hullState === 'DESTROYED') return false;

    const currentUnits = ship.scrapUnits || 0;
    const maxUnits = ship.scrapUnitsMax || 3;
    if (maxUnits - currentUnits < scrap.units) {
      this.addLog(
        'SALVAGE',
        `⚠️ ${ship.name}: Insufficient hold capacity to recover [${scrap.size} Scrap (${scrap.units}U)]. Available: ${maxUnits - currentUnits}/${maxUnits}U.`,
        'warn'
      );
      return false;
    }

    ship.salvageTargetId = scrap.id;
    ship.salvageState = 'SEEKING_SCRAP';
    this.setSplineOrder(ship.id, { x: scrap.pos.x, y: scrap.pos.y });
    this.addLog('SALVAGE', `🧲 ${ship.name}: Manual salvage vector plotted to [${scrap.size} Scrap - ${scrap.sourceShipName} wreck].`, 'info');
    return true;
  }

  public updateScrapSalvageLogistics(dt: number): void {
    const salvageBarges = this.ships.filter(
      (s) => (s.role === 'SCRAP' || (s.class as string) === 'SALVAGER') && s.hullState !== 'DESTROYED'
    );
    if (salvageBarges.length === 0) return;

    for (let i = 0; i < salvageBarges.length; i++) {
      const barge = salvageBarges[i];
      if (barge.hullState === 'DISABLED') continue;

      if (barge.scrapUnitsMax === undefined) barge.scrapUnitsMax = 3;
      if (barge.scrapUnits === undefined) barge.scrapUnits = 0;
      if (!barge.scrapCargo) barge.scrapCargo = [];
      if (barge.cleanupStance === undefined) barge.cleanupStance = false;
      if (!barge.salvageState) barge.salvageState = 'IDLE';

      const maxUnits = barge.scrapUnitsMax || 3;
      const currentUnits = barge.scrapUnits || 0;
      const availableCapacity = Math.max(0, maxUnits - currentUnits);

      // Find nearest friendly Depot (Refinery or HQ or Starbase)
      const friendlyDepots = this.ships.filter(
        (s) =>
          s.faction === barge.faction &&
          s.hullState !== 'DESTROYED' &&
          (s.role === 'HQ' || (s.role as string) === 'REFINERY' || (s.role as string) === 'STARBASE')
      );
      let nearestDepot: ShipEntity | null = null;
      let minDepotDist = Infinity;
      for (let dIdx = 0; dIdx < friendlyDepots.length; dIdx++) {
        const d = friendlyDepots[dIdx];
        const dist = Math.hypot(d.pos.x - barge.pos.x, d.pos.y - barge.pos.y);
        if (dist < minDepotDist) {
          minDepotDist = dist;
          nearestDepot = d;
        }
      }

      // 1. RETURNING TO DEPOSIT
      if (barge.salvageState === 'RETURNING_TO_DEPOSIT' || (currentUnits >= maxUnits && nearestDepot)) {
        barge.salvageState = 'RETURNING_TO_DEPOSIT';
        if (!nearestDepot) continue;

        const depotDist = Math.hypot(nearestDepot.pos.x - barge.pos.x, nearestDepot.pos.y - barge.pos.y);
        const dockRadius = 140.0;

        if (depotDist > dockRadius) {
          // Transit towards depot
          if (
            !barge.splineActive ||
            !barge.splineP1 ||
            Math.hypot(barge.splineP1.x - nearestDepot.pos.x, barge.splineP1.y - nearestDepot.pos.y) > 50
          ) {
            this.setSplineOrder(barge.id, { x: nearestDepot.pos.x, y: nearestDepot.pos.y });
          }
        } else {
          // Offload Scrap Cargo into Depot Resources
          clearShipMovement(barge);
          barge.velocity.x = 0;
          barge.velocity.y = 0;

          if (barge.scrapCargo && barge.scrapCargo.length > 0) {
            let totalM = 0;
            let totalO = 0;
            for (let c = 0; c < barge.scrapCargo.length; c++) {
              totalM += barge.scrapCargo[c].metallic || 0;
              totalO += barge.scrapCargo[c].organic || 0;
            }

            const hq = this.getHQ();
            if (hq && hq.resources) {
              hq.resources.metallic += totalM;
              hq.resources.organic += totalO;
            }

            const cargoCount = barge.scrapCargo.length;
            barge.scrapCargo = [];
            barge.scrapUnits = 0;

            this.addLog(
              'SALVAGE',
              `♻️ ${barge.name}: Offloaded ${cargoCount} salvage wreck(s) to ${nearestDepot.name}! Recovered +${totalM.toLocaleString()} Metallic, +${totalO.toLocaleString()} Organic. Hold capacity cleared (0/3 U).`,
              'success'
            );
          }

          if (barge.cleanupStance) {
            barge.salvageState = 'SEEKING_SCRAP';
          } else {
            barge.salvageState = 'IDLE';
          }
        }
        continue;
      }

      // 2. SEEKING / COLLECTING SCRAP
      if (barge.cleanupStance || barge.salvageState === 'SEEKING_SCRAP' || barge.salvageState === 'COLLECTING') {
        if (availableCapacity <= 0) {
          barge.salvageState = 'RETURNING_TO_DEPOSIT';
          continue;
        }

        // Check if current targeted scrap is still valid and fits in capacity
        let targetScrap: ScrapEntity | null = null;
        if (barge.salvageTargetId) {
          targetScrap = this.scraps.find((s) => s.id === barge.salvageTargetId) || null;
          if (targetScrap && targetScrap.units > availableCapacity) {
            targetScrap = null;
            barge.salvageTargetId = null;
          }
        }

        // Find closest fitting scrap in sector
        if (!targetScrap && this.scraps.length > 0) {
          let bestDist = Infinity;
          for (let sIdx = 0; sIdx < this.scraps.length; sIdx++) {
            const sc = this.scraps[sIdx];
            if (sc.units <= availableCapacity) {
              const d = Math.hypot(sc.pos.x - barge.pos.x, sc.pos.y - barge.pos.y);
              if (d < bestDist) {
                bestDist = d;
                targetScrap = sc;
              }
            }
          }
          if (targetScrap) {
            barge.salvageTargetId = targetScrap.id;
          }
        }

        if (targetScrap) {
          const distToScrap = Math.hypot(targetScrap.pos.x - barge.pos.x, targetScrap.pos.y - barge.pos.y);
          const salvageRange = 100.0;

          if (distToScrap > salvageRange) {
            barge.salvageState = 'SEEKING_SCRAP';
            barge.salvageBeamTimer = 0;
            if (
              !barge.splineActive ||
              !barge.splineP1 ||
              Math.hypot(barge.splineP1.x - targetScrap.pos.x, barge.splineP1.y - targetScrap.pos.y) > 30
            ) {
              this.setSplineOrder(barge.id, { x: targetScrap.pos.x, y: targetScrap.pos.y });
            }
          } else {
            // In range: deploy tractor beam and collect
            barge.salvageState = 'COLLECTING';
            clearShipMovement(barge);
            barge.velocity.x *= 0.85;
            barge.velocity.y *= 0.85;

            barge.salvageBeamTimer = (barge.salvageBeamTimer || 0) + dt;
            if (barge.salvageBeamTimer >= 1.2) {
              // Complete salvage operation
              barge.scrapCargo.push({
                id: targetScrap.id,
                size: targetScrap.size,
                units: targetScrap.units,
                metallic: targetScrap.metallic,
                organic: targetScrap.organic,
                sourceShipName: targetScrap.sourceShipName,
              });
              barge.scrapUnits = (barge.scrapUnits || 0) + targetScrap.units;

              // Remove scrap from world simulation
              const sIdx = this.scraps.findIndex((s) => s.id === targetScrap!.id);
              if (sIdx !== -1) {
                this.scraps.splice(sIdx, 1);
              }

              this.addLog(
                'SALVAGE',
                `🧲 ${barge.name}: Harvested [${targetScrap.size} Debris - ${targetScrap.units}U] (${targetScrap.sourceShipName}: +${targetScrap.metallic.toLocaleString()} M, +${targetScrap.organic.toLocaleString()} O). Hold: ${barge.scrapUnits}/3 U.`,
                'success'
              );

              barge.salvageBeamTimer = 0;
              barge.salvageTargetId = null;

              if (barge.scrapUnits >= maxUnits) {
                barge.salvageState = 'RETURNING_TO_DEPOSIT';
              } else {
                barge.salvageState = 'SEEKING_SCRAP';
              }
            }
          }
        } else {
          // No fitting scrap available in range
          if (barge.scrapUnits > 0) {
            barge.salvageState = 'RETURNING_TO_DEPOSIT';
          } else {
            barge.salvageState = 'IDLE';
          }
        }
      }
    }
  }

  public updateSalvageBarges(dt: number): void {
    this.updateScrapSalvageLogistics(dt);
  }

  public toggleAutoFire(shipId?: string) {
    const id = shipId || this.selectedShipId || 'vanguard-01';
    const ship = this.ships.find((s) => s.id === id);
    if (ship) {
      if (ship.combatStance === 'AGGRESSIVE') {
        this.setCombatStance(ship.id, 'DEFENSIVE');
      } else {
        this.setCombatStance(ship.id, 'AGGRESSIVE');
      }
    }
  }

  public toggleFms(shipId?: string) {
    const ship = shipId ? this.ships.find((s) => s.id === shipId) : this.getSelectedShip();
    if (ship) {
      ship.fmsActive = !ship.fmsActive;
      this.addLog('JAM', `${ship.name}: FMS Footprint Spoofing ${ship.fmsActive ? 'ACTIVE (Emulating Dreadnought Mass)' : 'DEACTIVATED'}`, 'info');
    }
  }

  public toggleJumpGate() {
    this.jumpGate.shuttingDown = !this.jumpGate.shuttingDown;
    this.addLog('UNREP', `Jump Gate: 300s Shutdown Sequence ${this.jumpGate.shuttingDown ? 'COMMENCED' : 'ABORTED / ACTIVE'}`, this.jumpGate.shuttingDown ? 'warn' : 'info');
  }

  private _tickListeners: Set<(tickCount: number) => void> = new Set();

  public subscribeTick(listener: (tickCount: number) => void): () => void {
    this._tickListeners.add(listener);
    return () => {
      this._tickListeners.delete(listener);
    };
  }

  public update(dt: number) {
    if (this.gameStatus === 'SETUP' || this.isPaused) {
      this.benchmark.tickMs = 0;
      return;
    }
    this.tickCount++;
    this.simulationTick = this.tickCount;
    this.simulationTime += dt;
    if (this._tickListeners.size > 0) {
      this._tickListeners.forEach((listener) => listener(this.tickCount));
    }
    const t0 = performance.now();

    // Periodic dead entity reference sweep (every 30 ticks ~ 1s)
    if (this.tickCount % 30 === 0) {
      this.purgeDestroyedEntities();
    }

    // Vanguard Automated Combat Test Respawn Countdown
    if (this.vanguardRespawnTimer > 0) {
      this.vanguardRespawnTimer -= dt;
      if (this.vanguardRespawnTimer <= 0) {
        this.vanguardRespawnTimer = 0;
        this.respawnVanguard();
      }
    }

    // Jump Gate Countdown
    if (this.jumpGate.shuttingDown) {
      this.jumpGate.shutdownTimer += dt;
      if (this.jumpGate.shutdownTimer >= this.jumpGate.maxShutdownTime) {
        this.jumpGate.shutdownTimer = this.jumpGate.maxShutdownTime;
      }
    }

    // Space Detonations update (fading expanding shockwaves) - in-place compaction
    let detWrite = 0;
    for (let dIdx = 0; dIdx < this.detonations.length; dIdx++) {
      const d = this.detonations[dIdx];
      d.timer += dt;
      if (d.timer < d.duration) {
        this.detonations[detWrite++] = d;
      }
    }
    this.detonations.length = detWrite;

    // Single-pass Threat Bucketing: O(M) with zero-allocation array recycling
    // Note: Spoofed missiles or fuel-exhausted (unhoming/burnt-out) missiles are no longer active homing threats
    for (const bucket of this._threatBuckets.values()) {
      bucket.length = 0;
    }
    const missilesLen = this.missiles.length;
    for (let mIdx = 0; mIdx < missilesLen; mIdx++) {
      const m = this.missiles[mIdx];
      if (m.alive && !m.isSpoofed && !m.fuelExhausted) {
        let bucket = this._threatBuckets.get(m.targetId);
        if (!bucket) {
          bucket = [];
          this._threatBuckets.set(m.targetId, bucket);
        }
        bucket.push(m);
      }
    }
    const threatBuckets = this._threatBuckets;

    // Hostile Auto-Fire check
    if (this.config.hostileAutoFire) {
      this.hostileAutoFireTimer += dt;
      if (this.hostileAutoFireTimer >= 4.0) {
        this.hostileAutoFireTimer = 0;
        this.fireEnemySalvo();
      }
    }

    // 0. Update Hostile Autonomous Patrol & Wandering Logic
    this.updateHostilePatrols(dt);

    // Deep-Space Procedural Solar System Progression
    this.updateSolarSystem(dt);

    // Dynamic Fog of War & Two-Tier Sensor Sweeps (Active Radar 8400km, Passive Horizon 25200km)
    updateSensorsAndFogOfWar(this, this.tickCount);

    // Gravity Well Zone Detection (6.0x radius for rocky planets, gas giants, moons, and asteroid clusters)
    if (this.solarSystem) {
      let wellIdx = 0;
      const wells = this._celestialWellsCache;
      const setWell = (
        id: string,
        name: string,
        pos: Vec2D,
        radius: number,
        wellRadius: number,
        type: 'PLANET' | 'GAS_GIANT' | 'MOON' | 'ASTEROID_CLUSTER'
      ) => {
        if (wellIdx < wells.length) {
          const w = wells[wellIdx];
          w.id = id;
          w.name = name;
          w.pos = pos;
          w.radius = radius;
          w.wellRadius = wellRadius;
          w.type = type;
        } else {
          wells.push({ id, name, pos, radius, wellRadius, type });
        }
        wellIdx++;
      };

      // 1. Rocky planets and their moons
      for (const planet of this.solarSystem.rockyPlanets) {
        setWell(
          planet.id,
          planet.name,
          planet.pos,
          planet.radius,
          planet.wellRadius || getPlanetaryGravityWellRadius(planet),
          'PLANET'
        );
        if (planet.moons) {
          for (const moon of planet.moons) {
            setWell(
              moon.id,
              moon.name,
              moon.pos,
              moon.radius,
              getLunarGravityWellRadius(moon),
              'MOON'
            );
          }
        }
      }

      // 2. Gas giants and their moons
      for (const giant of this.solarSystem.gasGiants) {
        setWell(
          giant.id,
          giant.name,
          giant.pos,
          giant.radius,
          giant.wellRadius || getPlanetaryGravityWellRadius(giant),
          'GAS_GIANT'
        );
        if (giant.moons) {
          for (const moon of giant.moons) {
            setWell(
              moon.id,
              moon.name,
              moon.pos,
              moon.radius,
              getLunarGravityWellRadius(moon),
              'MOON'
            );
          }
        }
      }

      // 3. Asteroid cluster formations
      if (this.solarSystem.clusters) {
        for (const cluster of this.solarSystem.clusters) {
          setWell(
            cluster.id,
            cluster.name,
            cluster.center,
            cluster.radius,
            cluster.wellRadius || getClusterGravityWellRadius(cluster),
            'ASTEROID_CLUSTER'
          );
        }
      }
      wells.length = wellIdx;

      for (const ship of this.ships) {
        if (ship.hullState === 'DESTROYED') {
          ship.inGravityWell = false;
          ship.gravityWellBody = null;
          ship.capturedReferenceFrame = undefined;
          ship.isMoored = false;
          continue;
        }

        let inWell = false;
        let matchedBody: (typeof wells)[0] | null = null;
        for (let i = 0; i < wellIdx; i++) {
          const well = wells[i];
          const dx = ship.pos.x - well.pos.x;
          const dy = ship.pos.y - well.pos.y;
          if (dx * dx + dy * dy <= well.wellRadius * well.wellRadius) {
            inWell = true;
            matchedBody = well;
            break;
          }
        }

        const wasInWell = ship.inGravityWell;
        const prevBodyId = ship.capturedReferenceFrame?.id;

        ship.inGravityWell = inWell;
        ship.gravityWellBody = matchedBody ? matchedBody.name : null;

        const isMiner = isMinerVessel(ship);
        const isMinerInTransit = isMinerInTransitThrust(ship);

        if (inWell && matchedBody) {
          // Kinematic capture into orbital reference frame
          if (!wasInWell || prevBodyId !== matchedBody.id) {
            ship.capturedReferenceFrame = {
              id: matchedBody.id,
              name: matchedBody.name,
              type: matchedBody.type,
              center: { ...matchedBody.pos },
              localOffset: {
                x: ship.pos.x - matchedBody.pos.x,
                y: ship.pos.y - matchedBody.pos.y,
              },
            };
            if (ship.faction === 'FRIENDLY' && !isMinerInTransit) {
              this.addLog(
                'TACTICAL',
                `⚓ ${ship.name}: Captured into reference frame of ${matchedBody.name} [R_well: ${Math.round(matchedBody.wellRadius)}km]`,
                'info'
              );
            }
          }

          // EXPLICIT EXEMPTION FOR MINERS:
          // Completely bypass orbital reference frame coordinate translations (ΔX_planet, ΔY_planet)
          // whenever the miner is in STATE_SEEK, STATE_RETURN, or executing active propulsion.
          // The miner computes position and spline trajectories purely in absolute world space.
          // Zero velocity dampening, orbital drag, or angular deflection across gravity well boundaries.
          if (isMinerInTransit) {
            ship.isMoored = false;
            if (ship.capturedReferenceFrame) {
              ship.capturedReferenceFrame.localOffset.x = ship.pos.x - matchedBody.pos.x;
              ship.capturedReferenceFrame.localOffset.y = ship.pos.y - matchedBody.pos.y;
            }
            continue;
          }

          // Mooring check:
          // Only stationary/parked combat hulls (speed === 0 and isHoldingVector === true)
          // and anchored static structures moor to the well.
          const currentSpeed = Math.hypot(ship.velocity.x, ship.velocity.y);
          const isAnchoredStaticStructure =
            ship.role === 'HQ' ||
            ship.role === 'SY_LIGHT' ||
            ship.role === 'SY_MEDIUM' ||
            ship.role === 'SY_HEAVY' ||
            !!ship.isPirateBastion ||
            !!ship.isStationary;
          const isParkedCombatHull =
            !isMiner &&
            !isAnchoredStaticStructure &&
            currentSpeed < 0.01 &&
            ship.isHoldingVector === true &&
            !ship.splineActive;

          const canMoor =
            (isAnchoredStaticStructure || isParkedCombatHull) && (ship.hullState === 'OPERATIONAL' || ship.isUnderConstruction);

          if (canMoor && ship.capturedReferenceFrame) {
            ship.isMoored = true;
            ship.pos.x = matchedBody.pos.x + ship.capturedReferenceFrame.localOffset.x;
            ship.pos.y = matchedBody.pos.y + ship.capturedReferenceFrame.localOffset.y;
            if (ship.isUnderConstruction) {
              syncScaffoldEntity(ship);
            }
          } else if (ship.capturedReferenceFrame) {
            ship.isMoored = false;
            // Update local offset as the ship moves
            ship.capturedReferenceFrame.localOffset.x = ship.pos.x - matchedBody.pos.x;
            ship.capturedReferenceFrame.localOffset.y = ship.pos.y - matchedBody.pos.y;
          }
        } else {
          if (wasInWell && ship.faction === 'FRIENDLY' && !isMinerInTransit) {
            this.addLog(
              'TACTICAL',
              `🚀 ${ship.name}: Exited gravity well into deep space reference frame`,
              'info'
            );
          }
          ship.capturedReferenceFrame = undefined;
          ship.isMoored = false;
        }
      }
    }

    // Foundational Economy & Industrial Loop
    this.updateAsteroids(dt);
    this.updateRefinery(dt);
    this.updateAutonomousMiners(dt);
    this.updateProductionQueues(dt);
    this.updateBuilderLogic(dt);
    this.updateRepairBays(dt);
    this.updateOrbitalRefineries(dt);
    this.updateSalvageBarges(dt);
    this.updateMissileBatteries(dt);

    // 30Hz Offensive Target Acquisition and Salvo Execution Pipeline across all player vessels
    const combatState = this.getCombatState();
    updateCombatTick(combatState, dt);

    // Hostile combat ships pass
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.faction === 'HOSTILE' && s.hullState === 'OPERATIONAL' && s.role !== 'MINER' && s.role !== 'BUILDER') {
        updateShipCombatTick(s, combatState, dt);
      }
    }

    // Pre-index alive ships and missiles for instant O(1) lookups across all defense, combat, and fleet loops
    const liveShipMap = new Map<string, ShipEntity>();
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.hullState !== 'DESTROYED') {
        liveShipMap.set(s.id, s);
      }
    }

    const liveMissileMap = new Map<string, MissileEntity>();
    const activeHostileMissiles: MissileEntity[] = [];
    for (let i = 0; i < this.missiles.length; i++) {
      const m = this.missiles[i];
      if (m.alive) {
        liveMissileMap.set(m.id, m);
        if (!m.isSpoofed && m.status !== 'SPOOFED' && m.status !== 'OVERFLIGHT' && !m.fuelExhausted) {
          activeHostileMissiles.push(m);
        }
      }
    }

    // Update Ships
    for (const ship of this.ships) {
      if (ship.hullState === 'DESTROYED') continue;
      if (ship.isUnderConstruction) continue;

      // A-C. Continuous Non-Instantaneous Jump Drive Kinematics (64x Sublight Vector)
      const isJumping = stepShipJumpDrive(
        ship,
        dt,
        this.ftlInterdictionRadius,
        this.solarSystem?.arenaRadius ? this.solarSystem.arenaRadius * 2.0 : 60000.0,
        (pos, name) => this.triggerCatastrophicDriveFailure(pos, name),
        this.addLog.bind(this)
      );

      if (
        isJumping ||
        ship.jumpState === 'SPOOLING' ||
        ship.jumpState === 'IN_TRANSIT' ||
        ship.jumpState === 'TRANSIT'
      ) {
        // While spooling or in active physical 64x transit, ship skips sublight drift & standard collisions
        continue;
      }

      // Hard Sublight Perimeter Interdiction
      const sysDesc = this.getSystemForShip(ship);
      const sysCenter = sysDesc?.center || sysDesc?.solarSystem?.star?.pos || { x: 0, y: 0 };
      const boundaryR = sysDesc?.systemBoundaryRadius || sysDesc?.deepSpaceBoundaryRadius || (sysDesc?.solarSystem as any)?.arenaRadius || 280000;
      checkSublightPerimeterInterdiction(ship, sysCenter, boundaryR, (msg) => {
        if (ship.faction === 'FRIENDLY') {
          this.addLog('NAV', msg, 'warn');
        }
      });

      // Novan tactical micro-jump kinematic evolution
      if (ship.microJumpState && ship.microJumpState !== 'IDLE') {
        updateMicroJumpKinematics(ship, 1);
      }

      // 1. Kinematic Linear-Quadratic Burns & Wrapped-Radian Slew Traversal
      if (ship.splineActive && (ship.hullState === 'OPERATIONAL' || ship.hullState === 'CRIPPLED')) {
        updateShipMovementTick(ship, dt, (arrivedShip) => {
          if (arrivedShip.faction === 'HOSTILE') {
            if (arrivedShip.npcPatrolState) {
              handleNPCOnArrival(arrivedShip);
            } else {
              // Continuous Patrol: Instead of stopping, immediately transition to next waypoint!
              this.advanceHostilePatrol(arrivedShip);
            }
          } else {
            clearShipMovement(arrivedShip);
          }
        });
      } else if (ship.hullState === 'CRIPPLED') {
        const decay = Math.max(1.0 - dt * 2.5, 0.0);
        ship.velocity.x *= decay;
        ship.velocity.y *= decay;
        ship.pos.x += ship.velocity.x * dt;
        ship.pos.y += ship.velocity.y * dt;

        // Cripple Recovery: As long as cripple is above 50%, the ship can reverse its cripple state.
        // Slowly moves 1% every 2 seconds (0.5% per second) towards uncrippled.
        const halfCripple = ship.crippleBarMax * 0.5;
        if (ship.crippleBar >= halfCripple && !ship.permanentFrameBuckled) {
          const recoveryRate = 0.01 / 2.0; // 1% every 2 seconds = 0.005/s
          ship.crippleBar = Math.min(ship.crippleBarMax, ship.crippleBar + ship.crippleBarMax * recoveryRate * dt);

          // Once cripple bar reaches 100%, restore ship to OPERATIONAL
          if (ship.crippleBar >= ship.crippleBarMax) {
            ship.hullState = 'OPERATIONAL';
            ship.hullHp = Math.max(ship.hullHp, ship.maxRepairableHull * 0.35);
            this.addLog(
              'CRIPPLE',
              `🛠️ ${ship.name}: Damage control crews successfully reversed cripple state! Systems back to OPERATIONAL.`,
              'success'
            );
          }
        }
      }

      // 2. Shield Radiator Dynamics & Shield Auto-Repair
      if (ship.shieldOverheated) {
        ship.shieldCooldownTimer -= dt;
        if (ship.shieldCooldownTimer <= 0) {
          ship.shieldOverheated = false;
          ship.shieldHeat = 0;
          ship.shieldHp = ship.shieldHpMax;
          this.addLog('SHIELD_DROP', `${ship.name}: Radiators cooled. Thermal Deflector Shields RESTORED!`, 'success');
        }
      } else {
        ship.shieldHeat = Math.max(ship.shieldHeat - this.config.shieldCoolRate * dt, 0);

        // Auto Repair: 1% maxShield/sec in combat, 5% maxShield/sec when no missiles are actively fired at it
        const inCombat = (threatBuckets.get(ship.id)?.length || 0) > 0;
        const shieldRepairRate = inCombat ? 0.01 : 0.05;
        if (ship.shieldHp < ship.shieldHpMax) {
          ship.shieldHp = Math.min(ship.shieldHpMax, ship.shieldHp + ship.shieldHpMax * shieldRepairRate * dt);
        }
      }

      // Hostile PD Missile Regeneration (slowly regenerates defensive Counter-Missiles for sustained testing)
      if (ship.faction === 'HOSTILE' && ship.hullState === 'OPERATIONAL') {
        const maxCM = ship.counterMissilesMax || 50;
        if (ship.counterMissiles < maxCM) {
          ship.counterMissiles = Math.min(maxCM, ship.counterMissiles + dt * 0.8);
        }
      }

      // Cooldowns and Overheat Processing
      ship.missileCooldown = Math.max(ship.missileCooldown - dt, 0);
      ship.counterMissileCooldown = Math.max((ship.counterMissileCooldown || 0) - dt, 0);
      ship.pdplaCooldown = Math.max(ship.pdplaCooldown - dt, 0);

      // Point-Defense Overheat Lockout Timer (3.0s countdown)
      if (ship.pdplaOverheated) {
        ship.pdplaOverheatTimer = Math.max((ship.pdplaOverheatTimer || 0) - dt, 0);
        if (ship.pdplaOverheatTimer <= 0) {
          ship.pdplaOverheated = false;
          ship.pdplaSalvoCount = 0;
          this.addLog(
            'PDPLA',
            `${ship.name}: Point-Defense Lasers COOLED. Overheat lockout cleared (0/5 bursts ready).`,
            'success'
          );
        }
      } else if ((ship.pdplaSalvoCount || 0) > 0) {
        // Idle dissipation: if no defensive bursts fired for 4.0s, salvo count gradually cools down
        ship.pdplaIdleCooldown = (ship.pdplaIdleCooldown || 0) + dt;
        if (ship.pdplaIdleCooldown >= 4.0) {
          ship.pdplaSalvoCount = Math.max(0, (ship.pdplaSalvoCount || 0) - 1);
          ship.pdplaIdleCooldown = 0;
        }
      }

      // 3. Defense Grid against Pre-Filtered Threats
      // In PASSIVE stance or when DISABLED (HP <= 12.5% max HP / 50% cripple bar), defenses are offline.
      const defensesActive =
        (ship.hullState === 'OPERATIONAL' ||
          (ship.hullState === 'CRIPPLED' && ship.hullHp > 0.125 * ship.hullMax)) &&
        ship.combatStance !== 'PASSIVE';

      if (defensesActive) {
        if (ship.pdplaBeamTimer > 0) {
          ship.pdplaBeamTimer -= dt;
          if (ship.pdplaBeamTimer <= 0) {
            ship.pdplaActiveBeamTarget = null;
          }
        }

        const myThreats = threatBuckets.get(ship.id) || [];
        const isRingCitadel = Boolean(ship.isRingStructure || ship.isGarnRing || ship.hqType === 'GARN_RING_CITADEL');
        const ringOuterMargin = isRingCitadel ? (ship.ringOuterRadius || ship.radius || 1100) : 0;
        const effectiveCMRange = (ship.counterMissileRange ?? BASE_TACTICAL_RANGES.counterMissileRangeKm) * (this.combatModifiers.cmRangeMult ?? 1.0);
        const effectivePDRange = (ship.pdplaRange ?? BASE_TACTICAL_RANGES.pointDefenseRangeKm) * (this.combatModifiers.pdRangeMult ?? 1.0);
        const pdplaRangeSq = effectivePDRange * effectivePDRange;
        const cmMaxRange = effectiveCMRange;
        const cmMaxSq = cmMaxRange * cmMaxRange;
        const cmMinSq = (effectivePDRange * 0.7) * (effectivePDRange * 0.7);

        // Layer 2: Counter-Missiles (Hard Kill & Fleet Defense Umbrella)
        // Defends self as priority, but also extends defensive umbrella to ANY friendly hull within CM range!
        let chosenCmThreat: MissileEntity | null = null;
        let cmDefendedShip: ShipEntity | null = null;

        // Priority 1: Inbound threats targeting this ship directly
        for (const threat of myThreats) {
          if (!threat.alive || threat.isSpoofed || threat.status === 'SPOOFED' || threat.status === 'OVERFLIGHT' || threat.fuelExhausted) continue;
          const rawD = Math.hypot(threat.pos.x - ship.pos.x, threat.pos.y - ship.pos.y);
          const effD = Math.max(0, rawD - ringOuterMargin);
          const dSq = effD * effD;
          if (dSq <= cmMaxSq && dSq > cmMinSq) {
            chosenCmThreat = threat;
            cmDefendedShip = ship;
            break;
          }
        }

        // Priority 2: Fleet Defense Umbrella - Intercept hostile missiles targeting ANY friendly hull within this ship's CM range
        if (!chosenCmThreat && (ship.combatStance === 'DEFENSIVE' || ship.combatStance === 'AGGRESSIVE')) {
          let bestDistSq = Infinity;
          for (let mIdx = 0; mIdx < activeHostileMissiles.length; mIdx++) {
            const m = activeHostileMissiles[mIdx];
            if (m.faction !== ship.faction) {
              const friendlyHull = liveShipMap.get(m.targetId);
              if (friendlyHull && friendlyHull.faction === ship.faction) {
                const rawD = Math.hypot(m.pos.x - ship.pos.x, m.pos.y - ship.pos.y);
                const effD = Math.max(0, rawD - ringOuterMargin);
                const dSq = effD * effD;
                if (dSq <= cmMaxSq && dSq > cmMinSq && dSq < bestDistSq) {
                  bestDistSq = dSq;
                  chosenCmThreat = m;
                  cmDefendedShip = friendlyHull;
                }
              }
            }
          }
        }

        if (
          chosenCmThreat &&
          ship.counterMissiles > 0 &&
          (ship.counterMissileCooldown || 0) <= 0
        ) {
          const salvoCount = Math.min(
            Math.floor(Math.random() * 2) + 2, // 2 or 3 missiles
            Math.floor(ship.counterMissiles)
          );
          ship.counterMissiles -= salvoCount;
          ship.counterMissileCooldown = this.config.counterMissileReload || 3.0;

          const offsets = [
            { x: -6, y: -4 },
            { x: 6, y: 4 },
            { x: 0, y: -6 },
          ];

          const baseAngle = Math.atan2(chosenCmThreat.pos.y - ship.pos.y, chosenCmThreat.pos.x - ship.pos.x);
          const accuracy = this.config.counterMissileAccuracy ?? 0.80;

          for (let i = 0; i < salvoCount; i++) {
            const off = offsets[i % offsets.length];
            const willHit = Math.random() < accuracy;
            this.counterMissiles.push({
              id: `cm-${++this.cmIdCounter}`,
              origin: { x: ship.pos.x + off.x, y: ship.pos.y + off.y },
              pos: { x: ship.pos.x + off.x, y: ship.pos.y + off.y },
              targetMissileId: chosenCmThreat.id,
              speed: this.config.counterMissileSpeed || 245.0, // Half speed: 245 km/s
              maxRange: effectiveCMRange,
              distanceTraveled: 0,
              heading: baseAngle + (Math.random() - 0.5) * 0.08,
              alive: true,
              willHit,
              isMissed: false,
              trail: [],
              trailSampleTimer: 0,
            });
          }

          const isFleetDefense = cmDefendedShip && cmDefendedShip.id !== ship.id;
          this.addLog(
            'INTERCEPT',
            isFleetDefense
              ? `🛡️ ${ship.name} [FLEET DEFENSE]: Fired ${salvoCount} Counter-Missiles screening ${cmDefendedShip.name} against warhead ${chosenCmThreat.id}!`
              : `${ship.name}: Defensive cluster fired - ${salvoCount} Counter-Missiles [Speed: 245km/s, 3.0s reload] tracking warhead ${chosenCmThreat.id}`,
            'info'
          );
        }

        // Layer 3: Point-Defense Phased Array Lasers (PDPLA)
        // FLEET DEFENSIVE UMBRELLA:
        // When in "Defensive Stance" (Key '1'), ships with active PD lasers fire on ANY hostile missile
        // that enters their PD range circle, regardless of whether that ship is the missile's designated target.
        // Escorts prioritize the closest missile within range.
        if (!ship.pdplaOverheated && ship.pdplaCooldown <= 0) {
          let chosenThreat: MissileEntity | null = null;
          let defendedShip: ShipEntity | null = null;

          if (ship.combatStance === 'DEFENSIVE') {
            // Find all hostile, alive, non-spoofed missiles within this ship's PD range circle
            let bestThreat: MissileEntity | null = null;
            let minThreatDistSq = Infinity;

            for (let mIdx = 0; mIdx < activeHostileMissiles.length; mIdx++) {
              const m = activeHostileMissiles[mIdx];
              if (m.faction !== ship.faction) {
                const rawD = Math.hypot(m.pos.x - ship.pos.x, m.pos.y - ship.pos.y);
                const effD = Math.max(0, rawD - ringOuterMargin);
                const distToEscortSq = effD * effD;
                if (distToEscortSq <= pdplaRangeSq && distToEscortSq < minThreatDistSq) {
                  minThreatDistSq = distToEscortSq;
                  bestThreat = m;
                }
              }
            }

            if (bestThreat) {
              chosenThreat = bestThreat;
              defendedShip = liveShipMap.get(chosenThreat.targetId) || null;
            }
          } else {
            // Other stances (e.g. AGGRESSIVE): Target hostile missiles directly threatening self
            for (const threat of myThreats) {
              if (!threat.alive || threat.isSpoofed || threat.status === 'SPOOFED' || threat.status === 'OVERFLIGHT' || threat.fuelExhausted) continue;
              const rawD = Math.hypot(threat.pos.x - ship.pos.x, threat.pos.y - ship.pos.y);
              const effD = Math.max(0, rawD - ringOuterMargin);
              const dSq = effD * effD;
              if (dSq <= pdplaRangeSq) {
                chosenThreat = threat;
                defendedShip = ship;
                break;
              }
            }
          }

          if (chosenThreat) {
            ship.pdplaCooldown = 0.20;
            ship.pdplaBeamTimer = 0.12;
            ship.pdplaIdleCooldown = 0.0;
            ship.pdplaSalvoCount = (ship.pdplaSalvoCount || 0) + 1;

            const burstNumber = ship.pdplaSalvoCount;
            const maxBursts = this.config.pdplaMaxBursts ?? 5;
            const lockoutDuration = this.config.pdplaOverheatDuration ?? 5.0;

            if (burstNumber >= maxBursts) {
              ship.pdplaOverheated = true;
              ship.pdplaOverheatTimer = lockoutDuration;
              ship.pdplaOverheatDuration = lockoutDuration;
              this.addLog(
                'PDPLA',
                `⚠️ ${ship.name}: POINT-DEFENSE OVERLOAD! ${maxBursts} bursts fired — entering ${lockoutDuration.toFixed(1)}s OVERHEAT lockout!`,
                'warn'
              );
            }

            const accuracy = this.config.pdplaAccuracy ?? 0.90;
            const willHit = Math.random() < accuracy;
            const defendedName = defendedShip ? defendedShip.name : 'Friendly Fleet';
            const isScreeningEscort = defendedShip && defendedShip.id !== ship.id;

            if (willHit) {
              if (!ship.pdplaActiveBeamTarget) {
                ship.pdplaActiveBeamTarget = { x: chosenThreat.pos.x, y: chosenThreat.pos.y };
              } else {
                ship.pdplaActiveBeamTarget.x = chosenThreat.pos.x;
                ship.pdplaActiveBeamTarget.y = chosenThreat.pos.y;
              }
              ship.pdplaBeamHit = true;
              chosenThreat.alive = false;
              this.benchmark.totalPdplaHits++;
              this.addLog(
                'PDPLA',
                isScreeningEscort
                  ? `🛡️ ${ship.name} [DEFENSIVE UMBRELLA]: PD burst [${burstNumber}/${maxBursts}] vaporized warhead ${chosenThreat.id} screening ${defendedName}!`
                  : `${ship.name}: PDPLA burst [${burstNumber}/${maxBursts}] vaporized inbound warhead at ${Math.round(Math.sqrt(distSq(chosenThreat.pos, ship.pos)))}km!`,
                'success'
              );
            } else {
              // Miss: Laser beam extends to its short maximum range
              const dirX = chosenThreat.pos.x - ship.pos.x;
              const dirY = chosenThreat.pos.y - ship.pos.y;
              const missAngle = Math.atan2(dirY, dirX) + (Math.random() < 0.5 ? 0.07 : -0.07);
              ship.pdplaActiveBeamTarget = {
                x: ship.pos.x + Math.cos(missAngle) * effectivePDRange,
                y: ship.pos.y + Math.sin(missAngle) * effectivePDRange,
              };
              ship.pdplaBeamHit = false;
              this.addLog(
                'PDPLA',
                `${ship.name}: PDPLA burst [${burstNumber}/${maxBursts}] tracking error - MISSED warhead ${chosenThreat.id}! Beam dissipated at max range (${Math.round(effectivePDRange)}km)`,
                'warn'
              );
            }
          }
        }
      } else if (ship.hullState === 'OPERATIONAL') {
        // Cooldowns already handled above
      }

      // 4. Automated Combat Engagement
      // Automated offensive target acquisition, broadside/bow salvo execution, and direct-fire energy weapons
      // are handled uniformly by the generalized combatEngine pipeline executed each simulation tick.

      // 5. Fleet Support Ships: AOE Replenishment (radius: 200px) & 70% Movement Penalty
      if (
        (ship.role === 'COLLIER' || ship.role === 'TANKER' || ship.role === 'REPAIR') &&
        ship.hullState === 'OPERATIONAL'
      ) {
        ship.supportRadius = 200.0;
        if (!ship.supportActiveTargets) {
          ship.supportActiveTargets = [];
        } else {
          ship.supportActiveTargets.length = 0;
        }
        const aoeRadiusSq = 200.0 * 200.0;

        // THE 70% MOVEMENT PENALTY:
        // If a support ship is moving (velocity > 0), replenishment/repair drops by 70% (30% speed).
        // When stationary (cold stop), it operates at 100% speed.
        const supportSpeed = Math.hypot(ship.velocity.x, ship.velocity.y);
        const isMoving = supportSpeed > 0.05;
        const rateMultiplier = isMoving ? 0.30 : 1.0;

        for (const recipient of this.ships) {
          if (
            recipient.faction === ship.faction &&
            recipient.id !== ship.id &&
            recipient.hullState !== 'DESTROYED'
          ) {
            const dSq = distSq(recipient.pos, ship.pos);
            if (dSq <= aoeRadiusSq) {
              let isServicing = false;

              // 1. Fleet Collier: Restocks missiles to nearby ships at 20 missiles/sec
              if (ship.role === 'COLLIER') {
                if (recipient.missiles < recipient.missilesMax && ship.missiles > 0) {
                  const mAmount = Math.min(
                    dt * 20.0 * rateMultiplier,
                    recipient.missilesMax - recipient.missiles,
                    ship.missiles
                  );
                  if (mAmount > 0) {
                    recipient.missiles += mAmount;
                    ship.missiles -= mAmount;
                    isServicing = true;
                  }
                }
              }

              // 2. Fleet Tanker: Refuels Hydrogen to nearby ships at 25 units/sec
              else if (ship.role === 'TANKER') {
                if (recipient.h2Fuel < recipient.h2FuelMax && ship.h2Fuel > 0) {
                  const fAmount = Math.min(
                    dt * 25.0 * rateMultiplier,
                    recipient.h2FuelMax - recipient.h2Fuel,
                    ship.h2Fuel
                  );
                  if (fAmount > 0) {
                    recipient.h2Fuel += fAmount;
                    ship.h2Fuel -= fAmount;
                    isServicing = true;
                  }
                }
              }

              // 3. Fleet Repair Ship: Restores Hull HP to nearby ships at 10 HP/sec (only heals Hull, does not heal Shields)
              else if (ship.role === 'REPAIR') {
                const maxRep = recipient.maxRepairableHull ?? recipient.hullMax;
                if (recipient.hullHp < maxRep) {
                  const hpAmount = Math.min(
                    dt * 10.0 * rateMultiplier,
                    maxRep - recipient.hullHp
                  );
                  if (hpAmount > 0) {
                    recipient.hullHp += hpAmount;
                    recipient.crippleBar = Math.min(
                      recipient.crippleBarMax,
                      recipient.hullHp
                    );

                    // Transition DISABLED -> CRIPPLED (HP > 12.5% max HP)
                    if (recipient.hullState === 'DISABLED' && recipient.hullHp > 0.125 * recipient.hullMax) {
                      recipient.hullState = 'CRIPPLED';
                      this.addLog(
                        'CRIPPLE',
                        `🛠️ ${recipient.name}: Systems reactivated! Transitioned from DISABLED to CRIPPLED.`,
                        'info'
                      );
                    }

                    // Transition CRIPPLED -> OPERATIONAL (HP > 25% max HP)
                    if (recipient.hullState === 'CRIPPLED' && recipient.hullHp > 0.25 * recipient.hullMax) {
                      recipient.hullState = 'OPERATIONAL';
                      this.addLog(
                        'CRIPPLE',
                        `🛠️ ${recipient.name}: Hull integrity restored above 25%. Vessel is OPERATIONAL!`,
                        'success'
                      );
                    }
                    isServicing = true;
                  }
                }
              }

              if (isServicing) {
                ship.supportActiveTargets.push(recipient.id);
              }
            }
          }
        }
      }
    }

    // Apply basic avoidance scripts when ships move (avoid touching/colliding)
    this.applyShipCollisionAvoidance(dt);

    // Salvage Barge Battlefield Cleanup & Scrap Recovery Logistics
    this.updateScrapSalvageLogistics(dt);

    // Dynamic Sensor Visibility Pass is consolidated in updateSensorsAndFogOfWar at the beginning of the tick

    // Update Counter-Missiles
    for (const cm of this.counterMissiles) {
      if (!cm.alive) continue;
      const step = cm.speed * dt;
      cm.distanceTraveled = (cm.distanceTraveled || 0) + step;

      // Exhaust Trail Sampling with zero-allocation in-place object reuse
      cm.trailSampleTimer = (cm.trailSampleTimer || 0) + dt;
      if (cm.trailSampleTimer >= 0.025) {
        cm.trailSampleTimer = 0;
        if (!cm.trail) cm.trail = [];
        if (cm.trail.length < 12) {
          cm.trail.push({ x: cm.pos.x, y: cm.pos.y });
        } else {
          const oldest = cm.trail.shift()!;
          oldest.x = cm.pos.x;
          oldest.y = cm.pos.y;
          cm.trail.push(oldest);
        }
      }

      // Check max range limit (counter-missiles keep flying until max range when they miss or target dies)
      if (cm.distanceTraveled >= cm.maxRange) {
        cm.alive = false;
        continue;
      }

      const targetM = liveMissileMap.get(cm.targetMissileId);

      // If target warhead was already destroyed or this CM has already missed, keep flying in current heading to max range
      if (!targetM || !targetM.alive || cm.isMissed) {
        cm.pos.x += Math.cos(cm.heading) * step;
        cm.pos.y += Math.sin(cm.heading) * step;
        continue;
      }

      const dx = targetM.pos.x - cm.pos.x;
      const dy = targetM.pos.y - cm.pos.y;
      const dSq = dx * dx + dy * dy;

      // Intercept proximity test
      if (dSq <= CM_INTERCEPT_DIST_SQ) {
        if (cm.willHit) {
          cm.alive = false;
          targetM.alive = false;
          this.benchmark.totalInterceptions++;
          this.addLog('INTERCEPT', `Counter-Missile hard-kill intercept of warhead ${targetM.id}!`, 'success');
        } else {
          // Miss: Counter-missile veers past the warhead and continues flying to its max range!
          cm.isMissed = true;
          cm.heading = Math.atan2(dy, dx) + (Math.random() < 0.5 ? 0.25 : -0.25);
          cm.pos.x += Math.cos(cm.heading) * step;
          cm.pos.y += Math.sin(cm.heading) * step;
          this.addLog(
            'INTERCEPT',
            `Counter-Missile MISSED warhead ${targetM.id}! Continuing flight to max range (${Math.round(cm.maxRange)}km)...`,
            'warn'
          );
        }
        continue;
      }

      // Guide towards target missile
      cm.heading = Math.atan2(dy, dx);
      const inv = 1 / Math.sqrt(dSq);
      cm.pos.x += dx * inv * step;
      cm.pos.y += dy * inv * step;
    }
    // In-place zero-allocation compaction of counterMissiles
    let cmWrite = 0;
    for (let i = 0; i < this.counterMissiles.length; i++) {
      if (this.counterMissiles[i].alive) {
        this.counterMissiles[cmWrite++] = this.counterMissiles[i];
      }
    }
    this.counterMissiles.length = cmWrite;

    // Update Missiles
    for (const m of this.missiles) {
      if (!m.alive) continue;
      m.lifetime += dt;
      if (m.lifetime >= m.maxLifetime) {
        m.alive = false;
        continue;
      }

      // Check for fuel exhaustion / burnout
      // Missiles can only fly under power for so long, which is their range + 10% (maxPoweredDistance).
      // At the end of powered flight, missiles flame out, lose tracking ability, and detonate 1.0s later.
      if (m.underPower && m.distanceTraveled >= m.maxPoweredDistance) {
        m.underPower = false;
        m.fuelExhausted = true;
        m.burnoutTimer = 0;
        this.addLog(
          'ORDNANCE',
          `⚠️ Warhead [${m.id}] fuel depleted (${Math.round(m.distanceTraveled)}km > Range+10%: ${Math.round(m.maxPoweredDistance)}km). Engine flamed out — tracking lost! Detonation in 1.0s.`,
          'warn'
        );
      }

      // 1. Post-burnout ballistic drift & 1-second detonation delay
      // At the end of powered flight, missiles lose tracking ability and detonate 1 second later
      if (m.fuelExhausted) {
        m.burnoutTimer = (m.burnoutTimer || 0) + dt;
        const step = m.speed * dt;
        // Unpowered inertial drift along last heading without any tracking ability
        const driftHeading = m.heading ?? 0;
        m.pos.x += Math.cos(driftHeading) * step;
        m.pos.y += Math.sin(driftHeading) * step;

        // Faint residual smoke puffs with zero-allocation object reuse
        m.trailSampleTimer = (m.trailSampleTimer || 0) + dt;
        if (m.trailSampleTimer >= 0.035) {
          m.trailSampleTimer = 0;
          if (!m.trail) m.trail = [];
          if (m.trail.length < 8) {
            m.trail.push({ x: m.pos.x, y: m.pos.y });
          } else {
            const oldest = m.trail.shift()!;
            oldest.x = m.pos.x;
            oldest.y = m.pos.y;
            m.trail.push(oldest);
          }
        }

        // Direct collision check during unpowered drift
        const target = liveShipMap.get(m.targetId);
        if (target && target.hullState !== 'DESTROYED') {
          const dx = target.pos.x - m.pos.x;
          const dy = target.pos.y - m.pos.y;
          if (dx * dx + dy * dy <= 16.0 * 16.0) {
            m.alive = false;
            this.applyHitToShip(target, m.damage);
            continue;
          }
        }

        // Detonate 1.0 second post-burnout
        if (m.burnoutTimer >= 1.0) {
          m.alive = false;
          this.triggerBurnoutDetonation(m.pos);
          this.addLog(
            'ORDNANCE',
            `💥 Warhead [${m.id}] self-destructed 1.0s post-burnout in empty space (evaded/outranged).`,
            'info'
          );
        }
        continue;
      }

      // 2. E-War Spoofed Runaway Flight & 3.0s Self-Destruct
      // When spoofed, missile breaks lock, flies along runaway tangent vector at max burn speed,
      // and safe-destructs after 3.0 seconds in deep space without dealing damage.
      if (m.status === 'SPOOFED' || m.isSpoofed) {
        m.selfDestructTimer = (m.selfDestructTimer ?? 3.0) - dt;
        m.spoofedTimer = (m.spoofedTimer || 0) + dt;

        const step = m.speed * dt;
        m.distanceTraveled += step;
        const vx = m.runawayVector ? m.runawayVector.x : Math.cos(m.heading ?? 0);
        const vy = m.runawayVector ? m.runawayVector.y : Math.sin(m.heading ?? 0);
        m.pos.x += vx * step;
        m.pos.y += vy * step;

        // Trail sampling along runaway flight path with zero-allocation object reuse
        m.trailSampleTimer = (m.trailSampleTimer || 0) + dt;
        if (m.trailSampleTimer >= 0.025) {
          m.trailSampleTimer = 0;
          if (!m.trail) m.trail = [];
          if (m.trail.length < 20) {
            m.trail.push({ x: m.pos.x, y: m.pos.y });
          } else {
            const oldest = m.trail.shift()!;
            oldest.x = m.pos.x;
            oldest.y = m.pos.y;
            m.trail.push(oldest);
          }
        }

        // When 3.0s timer expires, trigger standard kinetic detonation puff/flash in deep space without dealing target damage
        if (m.selfDestructTimer <= 0) {
          m.alive = false;
          this.triggerHarmlessSpaceDetonation(m.pos);
          this.addLog(
            'JAM',
            `💥 Spoofed warhead [${m.id}] 3.0s self-destruct timer expired: detonated harmlessly in deep space.`,
            'info'
          );
        }
        continue;
      }

      // 3. Ballistic Overflight (Terminal Misses)
      // Missile continues flying along its current high-speed vector past the target for 1.5 seconds before triggering safe kinetic self-destruct.
      if (m.status === 'OVERFLIGHT') {
        m.overflightTimer = (m.overflightTimer ?? 1.5) - dt;
        const step = m.speed * dt;
        m.distanceTraveled += step;
        const vx = m.overflightVector ? m.overflightVector.x : Math.cos(m.heading ?? 0);
        const vy = m.overflightVector ? m.overflightVector.y : Math.sin(m.heading ?? 0);
        m.pos.x += vx * step;
        m.pos.y += vy * step;

        m.trailSampleTimer = (m.trailSampleTimer || 0) + dt;
        if (m.trailSampleTimer >= 0.025) {
          m.trailSampleTimer = 0;
          if (!m.trail) m.trail = [];
          if (m.trail.length < 20) {
            m.trail.push({ x: m.pos.x, y: m.pos.y });
          } else {
            const oldest = m.trail.shift()!;
            oldest.x = m.pos.x;
            oldest.y = m.pos.y;
            m.trail.push(oldest);
          }
        }

        // When 1.5s timer expires, trigger safe kinetic self-destruct
        if (m.overflightTimer <= 0) {
          m.alive = false;
          this.triggerSelfDestruct(m.pos, '[BALLISTIC OVERFLIGHT SELF-DESTRUCT]');
          this.addLog(
            'ORDNANCE',
            `💥 Warhead [${m.id}] safely self-destructed in deep space post-overflight.`,
            'info'
          );
        }
        continue;
      }

      const target = liveShipMap.get(m.targetId);
      if (!target || target.hullState === 'DESTROYED') {
        // Target lost or destroyed: lose tracking and detonate 1.0s later
        m.underPower = false;
        m.fuelExhausted = true;
        m.burnoutTimer = 0;
        continue;
      }

      // FIRE_TO_DISABLE protocol: If target is crippled/disabled, in-flight rounds self-destruct immediately
      if (target.hullState === 'CRIPPLED') {
        const firingShip = liveShipMap.get(m.sourceShipId);
        const isDisable = firingShip ? firingShip.aggressiveDoctrine === 'DISABLE' : m.doctrine === 'DISABLE';
        if (isDisable) {
          m.alive = false;
          this.triggerSelfDestruct(m.pos, `[SELF-DESTRUCT: ${target.name} DISABLED]`);
          this.addLog(
            'ORDNANCE',
            `💥 Missile [${m.id}] self-destructed: Target ${target.name} disabled (FIRE_TO_DISABLE protocol).`,
            'info'
          );
          continue;
        }
      }

      // Broadside Flank Ejection Spline Transition into sustained burn
      if (m.isBroadsideEjection && (m.ejectionTimer ?? 0) > 0) {
        m.ejectionTimer = (m.ejectionTimer ?? 0) - dt;
        m.splineT = Math.min(1.0, (m.splineT ?? 0) + dt / (m.splineDuration || 0.8));

        if (m.splineP0 && m.splineM0 && m.splineP1 && m.splineM1) {
          const nextPos = hermiteInterpolate(m.splineP0, m.splineM0, m.splineP1, m.splineM1, m.splineT);
          const stepDist = Math.hypot(nextPos.x - m.pos.x, nextPos.y - m.pos.y);
          m.distanceTraveled += stepDist;
          m.heading = Math.atan2(nextPos.y - m.pos.y, nextPos.x - m.pos.x);
          m.pos.x = nextPos.x;
          m.pos.y = nextPos.y;
        } else {
          const step = (m.speed * 0.45) * dt;
          m.distanceTraveled += step;
          m.pos.x += Math.cos(m.heading ?? 0) * step;
          m.pos.y += Math.sin(m.heading ?? 0) * step;
        }

        m.trailSampleTimer = (m.trailSampleTimer || 0) + dt;
        if (m.trailSampleTimer >= 0.03) {
          m.trailSampleTimer = 0;
          if (!m.trail) m.trail = [];
          if (m.trail.length < 20) {
            m.trail.push({ x: m.pos.x, y: m.pos.y });
          } else {
            const oldest = m.trail.shift()!;
            oldest.x = m.pos.x;
            oldest.y = m.pos.y;
            m.trail.push(oldest);
          }
        }

        if (m.ejectionTimer <= 0) {
          m.isBroadsideEjection = false;
          m.sustainerActive = true;
        }
        continue;
      }

      const dx = target.pos.x - m.pos.x;
      const dy = target.pos.y - m.pos.y;
      const dSq = dx * dx + dy * dy;
      m.heading = Math.atan2(dy, dx);

      // 4. Early E-War Spoofing (Occurs early, 10% out beyond the range of counter-missiles)
      // Some ships are better than others at spoofing (5% - 25%), with a per-round chance roll mechanic
      const cmRange = this.config.counterMissileRange || 140.0;
      const earlySpoofThreshold = cmRange * 1.10; // 10% beyond counter-missile range (~154 km)
      const earlySpoofThresholdSq = earlySpoofThreshold * earlySpoofThreshold;

      if (dSq <= earlySpoofThresholdSq && !m.ewarTested) {
        m.ewarTested = true;

        // Base ship E-War capability (different ships have different jamming suites)
        const baseEwar = target.ewarJammingRating ?? 0.15;
        // Chance mechanic for bad rounds: slight variance per round, clamped strictly between 5% and 25%
        const roundNoise = (Math.random() - 0.5) * 0.06;
        const roundSpoofChance = Math.min(0.25, Math.max(0.05, baseEwar + roundNoise));

        if (Math.random() < roundSpoofChance) {
          // When an offensive missile's seeker is spoofed by ECM / Penetration-Aid degradation:
          // * Set missile.status = 'SPOOFED'
          m.status = 'SPOOFED';
          m.isSpoofed = true;

          // * Immediately break target lock: pick a randomized tangent deflection angle (+/- 35 to 70 degrees off current heading)
          m.targetId = '';
          const turnSign = Math.random() < 0.5 ? -1 : 1;
          const deflectionAngleDeg = 35 + Math.random() * 35; // 35 to 70 degrees
          const deflectionRad = (deflectionAngleDeg * Math.PI) / 180 * turnSign;
          const currentHeading = m.heading ?? Math.atan2(dy, dx);
          const newHeading = currentHeading + deflectionRad;

          m.heading = newHeading;
          m.spoofedDeflectionDeg = Math.round(deflectionAngleDeg);
          m.spoofedDirection = turnSign > 0 ? 'STARBOARD' : 'PORT';
          m.spoofedBaseHeading = currentHeading;

          // * Lock the missile onto this new runaway vector at maximum burn speed
          m.runawayVector = {
            x: Math.cos(newHeading),
            y: Math.sin(newHeading),
          };
          m.speed = Math.max(m.speed, 260.0); // Maximum burn speed

          // * Set a 3.0-second self-destruct timer on the lost munition
          m.selfDestructTimer = 3.0;
          m.spoofedTimer = 0;

          this.benchmark.totalJammingDeflects++;
          this.addLog(
            'JAM',
            `🛰️ [E-WAR SPOOF]: ${target.name} ECM broke warhead [${m.id}] lock! Munition broke target lock and re-routed onto ${m.spoofedDeflectionDeg}° ${m.spoofedDirection} runaway vector (3.0s self-destruct).`,
            'success'
          );
          continue;
        }
      }

      // 5. Hit Resolution & Ballistic Overflight (Terminal Misses)
      const hitRadius = target.radius ? Math.max(target.radius, 16.0) : 16.0;
      if (dSq <= hitRadius * hitRadius) {
        // If a missile survives Point-Defense intercept but fails its terminal hit roll against hull/shield colliders:
        let terminalHitChance = this.config.missileTerminalAccuracy ?? 0.88;
        if (target.role === 'FRIGATE' || target.role === 'DESTROYER' || target.role === 'MINER') {
          terminalHitChance -= 0.08; // High-agility escorts
        } else if (target.role === 'BATTLESHIP' || target.role === 'DREADNOUGHT' || target.role === 'BASTION' || target.role === 'HQ') {
          terminalHitChance += 0.06; // Massive capital ship signatures
        }
        terminalHitChance = Math.min(0.96, Math.max(0.60, terminalHitChance));

        const hitRoll = Math.random();
        if (hitRoll < terminalHitChance) {
          m.alive = false;
          this.applyHitToShip(target, m.damage);
          continue;
        } else {
          // Terminal Miss: BALLISTIC OVERFLIGHT
          // Do NOT delete the missile instantly.
          // Let the missile continue flying along its current high-speed vector past the target for 1.5 seconds before triggering safe kinetic self-destruct.
          m.status = 'OVERFLIGHT';
          m.isMissed = true;
          m.overflightTimer = 1.5;
          const currentHeading = m.heading ?? Math.atan2(dy, dx);
          m.heading = currentHeading;
          m.overflightVector = {
            x: Math.cos(currentHeading),
            y: Math.sin(currentHeading),
          };
          m.speed = Math.max(m.speed, 250.0);
          m.targetId = '';

          this.addLog(
            'TACTICAL',
            `⚠️ Warhead [${m.id}] evaded hull/shield collider on terminal approach against ${target.name}! Ballistic overflight active for 1.5s...`,
            'warn'
          );
          continue;
        }
      }

      const inv = 1 / Math.sqrt(dSq);
      const step = m.speed * dt;
      m.distanceTraveled += step;
      m.pos.x += dx * inv * step;
      m.pos.y += dy * inv * step;

      // Trail Sampling with zero-allocation object reuse
      m.trailSampleTimer = (m.trailSampleTimer || 0) + dt;
      if (m.trailSampleTimer >= 0.03) {
        m.trailSampleTimer = 0;
        if (!m.trail) m.trail = [];
        const rPos = this.getMissileRenderPos(m, target);
        if (m.trail.length < 16) {
          m.trail.push({ x: rPos.x, y: rPos.y });
        } else {
          const oldest = m.trail.shift()!;
          oldest.x = rPos.x;
          oldest.y = rPos.y;
          m.trail.push(oldest);
        }
      }
    }
    // In-place zero-allocation compaction of missiles
    let mWrite = 0;
    for (let i = 0; i < this.missiles.length; i++) {
      if (this.missiles[i].alive) {
        this.missiles[mWrite++] = this.missiles[i];
      }
    }
    this.missiles.length = mWrite;

    // -------------------------------------------------------------
    // STRUCT OF ARRAYS (SOA) ORDNANCE & KINEMATICS SIMULATION PASS
    // Zero GC allocations, dense memory packing, sub-millisecond tick
    // -------------------------------------------------------------
    if (this.ordnanceSOA.cms.activeCount > 0) {
      updateCounterMissilesSOA(
        this.ordnanceSOA.cms,
        this.ordnanceSOA.missiles,
        dt,
        (mIdx) => {
          this.benchmark.totalInterceptions++;
          this.addLog('INTERCEPT', `Counter-Missile hard-kill intercept of warhead #${mIdx}!`, 'success');
        }
      );
    }

    if (this.ordnanceSOA.missiles.activeCount > 0) {
      updateMissilesSOA(
        this.ordnanceSOA.missiles,
        this.ships,
        dt,
        (missileIdx, targetShip, damage) => {
          if (targetShip && this.applyHitToShip) {
            this.applyHitToShip(targetShip, damage);
          }
        }
      );
    }

    // Fleet group operational maintenance: prune destroyed ships or empty fleets (periodic: every 30 ticks ~ 1s)
    if (this.tickCount % 30 === 0 && this.fleetGroups.size > 0) {
      for (const [fleetId, fleet] of this.fleetGroups.entries()) {
        let aliveCount = 0;
        for (let i = 0; i < fleet.shipIds.length; i++) {
          const s = this.ships.find((ship) => ship.id === fleet.shipIds[i]);
          if (s && s.hullState !== 'DESTROYED') {
            fleet.shipIds[aliveCount++] = fleet.shipIds[i];
          }
        }
        fleet.shipIds.length = aliveCount;
        if (fleet.shipIds.length === 0) {
          this.fleetGroups.delete(fleetId);
        } else if (!fleet.shipIds.includes(fleet.flagshipId)) {
          const remainingShips = this.ships.filter((s) => fleet.shipIds.includes(s.id));
          const newFlagship = determineFlagship(remainingShips);
          if (newFlagship) {
            fleet.flagshipId = newFlagship.id;
          }
        }
      }
    }

    // Advance research synthesis matrix
    const hqEntity = this.getHQ();
    this.researchManager.update(
      dt,
      this.researchStations,
      (cat, msg, lvl) => this.addLog(cat as any, msg, lvl),
      (node) => {
        this.recalculateResearchScalars();
        this.addLog(
          'RESEARCH',
          `🚀 Protocol active: [${node.name}] (${node.code})! Stat hooks and blueprint authorizations updated.`,
          'info'
        );
      },
      hqEntity?.resources,
      (m, o) => {
        if (hqEntity && hqEntity.resources) {
          hqEntity.resources.metallic = Math.max(0, hqEntity.resources.metallic - m);
          hqEntity.resources.organic = Math.max(0, hqEntity.resources.organic - o);
        }
      }
    );

    // Benchmark updates
    const tEnd = performance.now();
    this.benchmark.tickMs = tEnd - t0;
    this.benchmark.missilesCount = this.missiles.length + this.ordnanceSOA.missiles.activeCount;
    this.benchmark.cmCount = this.counterMissiles.length + this.ordnanceSOA.cms.activeCount;
    this.benchmark.shipCount = this.ships.length;
  }

  public getMissileRenderPos(m: MissileEntity, target: ShipEntity): Vec2D {
    if (m.isSpoofed || m.status === 'SPOOFED' || m.status === 'OVERFLIGHT' || m.fuelExhausted) {
      return { x: m.pos.x, y: m.pos.y };
    }

    const totDx = target.pos.x - m.origin.x;
    const totDy = target.pos.y - m.origin.y;
    const totDistSq = totDx * totDx + totDy * totDy;

    const curDx = m.pos.x - m.origin.x;
    const curDy = m.pos.y - m.origin.y;
    const curDistSq = curDx * curDx + curDy * curDy;

    const progress = Math.min(Math.max(Math.sqrt(curDistSq / Math.max(totDistSq, 1.0)), 0), 1);
    const zOffset = -Math.sin(progress * Math.PI) * 25.0;

    return {
      x: m.pos.x,
      y: m.pos.y + zOffset,
    };
  }

  public triggerBurnoutDetonation(pos: Vec2D) {
    this.detonations.push({
      id: `det-${Date.now()}-${Math.random()}`,
      pos: { ...pos },
      timer: 0,
      duration: 0.90,
      maxRadius: 32.0,
      color: '#f97316',
      type: 'FUEL_EXHAUSTION',
      label: '[FUEL EXHAUSTION DETONATION]',
    });
  }

  public triggerHarmlessSpaceDetonation(pos: Vec2D) {
    this.detonations.push({
      id: `det-${Date.now()}-${Math.random()}`,
      pos: { ...pos },
      timer: 0,
      duration: 0.85,
      maxRadius: 28.0,
      color: '#fbbf24',
      type: 'EWAR_HARMLESS',
      label: '[EMPTY SPACE DETONATION]',
    });
  }

  public triggerSelfDestruct(pos: Vec2D, label?: string) {
    this.detonations.push({
      id: `det-${Date.now()}-${Math.random()}`,
      pos: { ...pos },
      timer: 0,
      duration: 0.85,
      maxRadius: 28.0,
      color: '#38bdf8',
      type: 'SELF_DESTRUCT',
      label: label || '[ROUND SELF-DESTRUCT: TARGET DISABLED]',
    });
  }

  public applyHitToShip(ship: ShipEntity, damage: number) {
    if (!ship || ship.hullState === 'DESTROYED') return;
    if (ship.jumpState === 'TRANSIT' || ship.jumpState === 'IN_TRANSIT') return; // Invulnerable while in active subspace warp transit

    // Safety checks for null/undefined/NaN stats
    if (!ship.hullMax || isNaN(ship.hullMax) || ship.hullMax <= 0) {
      ship.hullMax = 500.0;
    }
    if (ship.hullHp === undefined || isNaN(ship.hullHp)) {
      ship.hullHp = (ship as any).hull !== undefined && !isNaN((ship as any).hull) ? (ship as any).hull : ship.hullMax;
    }
    if (ship.shieldHpMax === undefined || isNaN(ship.shieldHpMax)) {
      ship.shieldHpMax = 1000.0;
    }
    if (ship.shieldHp === undefined || isNaN(ship.shieldHp)) {
      ship.shieldHp = (ship as any).shield !== undefined && !isNaN((ship as any).shield) ? (ship as any).shield : ship.shieldHpMax;
    }

    // Headquarters Entity: Infinite health (invulnerable for now)
    if (ship.role === 'HQ') {
      this.benchmark.totalMissileHits++;
      this.addLog('ORDNANCE', `${ship.name}: Citadel fortress armor deflected warhead impact (${damage} dmg). HQ Citadel integrity holds at 100%.`, 'info');
      return;
    }

    this.benchmark.totalMissileHits++;

    // Spool disruption check (Novan has Disruption Immunity)
    const isNovan = ship.factionId === 'NOVAN' || this.playerFaction === 'NOVAN' || (ship as any).isNovan;
    if (!isNovan && ship.microJumpState === 'SPOOLING') {
      ship.microJumpState = 'IDLE';
      ship.microJumpSpoolRemaining = 0;
      ship.microJumpTarget = undefined;
      this.addLog('TACTICAL', `${ship.name}: Micro-jump spool disrupted by incoming weapons fire!`, 'warn');
    }

    // Layer 4: Thermal Deflector Shields
    if (!ship.shieldOverheated && ship.shieldHp > 0) {
      let effectiveDamage = damage;
      if ((ship.shieldHardeningTimer ?? 0) > 0) {
        effectiveDamage *= 0.80; // Novan Hardening 20% flat mitigation
      }
      ship.shieldHp = Math.max(0, ship.shieldHp - effectiveDamage);
      ship.shieldHeat += effectiveDamage * 0.28;
      if (ship.currentShield !== undefined) {
        ship.currentShield = ship.shieldHp;
      }
      if (ship.shieldHeat >= (ship.shieldHeatMax || 100) || ship.shieldHp <= 0) {
        ship.shieldOverheated = true;
        ship.shieldHp = 0;
        if (ship.currentShield !== undefined) ship.currentShield = 0;
        ship.shieldCooldownTimer = 2.5 + Math.random() * 2.0;
        this.addLog('SHIELD_DROP', `${ship.name}: Shield Radiators saturated at 100%! Emergency cooling dump forced.`, 'crit');
      } else {
        this.addLog('ORDNANCE', `${ship.name}: Thermal Shield absorbed ${Math.round(effectiveDamage)} dmg. Radiator heat: ${Math.round(ship.shieldHeat)}%`, 'warn');
      }
      return;
    }

    // Layer 5: Hull Lifecycle (Crippled at 25%, Disabled at 12.5%, Permanent Frame Damage, Scrap on Destruction)
    if (!ship.firstDamageTime) {
      ship.firstDamageTime = this.simulationTime;
    }

    ship.hullHp = Math.max(0, ship.hullHp - damage);
    ship.hull = ship.hullHp;
    const crippleThreshold = 0.25 * ship.hullMax;
    const disabledThreshold = 0.125 * ship.hullMax;
    ship.crippleBarMax = crippleThreshold;
    ship.crippleBar = Math.min(crippleThreshold, Math.max(0, ship.hullHp));

    this.addLog(
      'ORDNANCE',
      `${ship.name}: CRITICAL - Direct hull impact (${damage} dmg)! Hull: ${Math.round(ship.hullHp)}/${ship.hullMax}`,
      'crit'
    );

    // 1. DESTROYED (0 HP)
    if (ship.hullHp <= 0) {
      ship.hullHp = 0;
      ship.hullState = 'DESTROYED';
      ship.splineActive = false;
      ship.velocity = { x: 0, y: 0 };

      // Scrap Generation Calculation based on combat attrition duration
      const combatDuration = Math.max(0, this.simulationTime - (ship.firstDamageTime ?? this.simulationTime));
      // Fast destruction (<= 3s): 10% scrap ratio (reactor catastrophe); Slow attrition (>= 30s): 50% scrap ratio
      const scrapRatio =
        combatDuration <= 3.0
          ? 0.10
          : combatDuration >= 30.0
          ? 0.50
          : 0.10 + Math.min(1.0, (combatDuration - 3.0) / 27.0) * 0.40;

      // Scrap Size Classification (Light = 1 unit, Medium = 2 units, Heavy = 3 units)
      const heavyRoles: string[] = ['CARRIER', 'DREADNOUGHT', 'DN', 'CITY_SHIP', 'LIAAL_HEAVY', 'SY_HEAVY', 'BASTION', 'HQ'];
      const mediumRoles: string[] = ['HEAVY_CRUISER', 'CH', 'BATTLECRUISER', 'BC', 'BATTLESHIP', 'BB', 'LIAAL_MEDIUM', 'SY_MEDIUM'];

      const scrapSize: ScrapSize = heavyRoles.includes(ship.role)
        ? 'HEAVY'
        : mediumRoles.includes(ship.role)
        ? 'MEDIUM'
        : 'LIGHT';
      const scrapUnits: number = scrapSize === 'HEAVY' ? 3 : scrapSize === 'MEDIUM' ? 2 : 1;

      // Resource Value Calculation
      const proto = (SHIP_PROTOTYPES as any)[ship.role] || (STRUCTURE_CATALOG as any)[ship.role];
      const baseCostM = proto?.costMetallic ?? proto?.costM ?? (scrapUnits === 3 ? 28000 : scrapUnits === 2 ? 10000 : 2500);
      const baseCostO = proto?.costOrganic ?? proto?.costO ?? (scrapUnits === 3 ? 6500 : scrapUnits === 2 ? 3000 : 800);

      const scrapMetallic = Math.max(25, Math.round(baseCostM * scrapRatio));
      const scrapOrganic = Math.max(10, Math.round(baseCostO * scrapRatio));

      const scrapEntity: ScrapEntity = {
        id: `scrap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pos: { x: ship.pos.x, y: ship.pos.y },
        heading: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
        size: scrapSize,
        units: scrapUnits,
        metallic: scrapMetallic,
        organic: scrapOrganic,
        sourceShipName: ship.name,
        sourceRole: ship.role,
        createdTime: this.simulationTime,
        systemId: ship.systemId,
      };
      this.scraps.push(scrapEntity);

      this.addLog(
        'DESTROY',
        `💥 ${ship.name}: FRAME SHATTERED. Spawned [${scrapSize} Scrap - ${scrapUnits} unit(s)] (${Math.round(scrapRatio * 100)}% recovery yield: +${scrapMetallic.toLocaleString()} Metallic, +${scrapOrganic.toLocaleString()} Organic).`,
        'crit'
      );

      // FIRE_TO_DISABLE protocol: self-destruct missiles targeting newly destroyed vessel
      for (const m of this.missiles) {
        if (m.alive && m.targetId === ship.id) {
          const firingShip = this.ships.find((s) => s.id === m.sourceShipId);
          const isDisable = firingShip ? firingShip.aggressiveDoctrine === 'DISABLE' : m.doctrine === 'DISABLE';
          if (isDisable) {
            m.alive = false;
            this.triggerSelfDestruct(m.pos, `[SELF-DESTRUCT: ${ship.name} DESTROYED]`);
          }
        }
      }

      if (ship.isStructure) {
        this.updateResearchStationsCount();
      }

      if (ship.role === 'MINER' && (ship.cargoOre || 0) > 0) {
        this.addLog('TACTICAL', `💥 ${ship.name} DESTROYED: ${Math.round(ship.cargoOre!)} Ore cargo permanently lost in vacuum!`, 'crit');
        ship.cargoOre = 0;
      }

      if (ship.id === 'vanguard-01') {
        this.vanguardRespawnTimer = 1.0;
        this.addLog('TACTICAL', '⚠️ Vanguard-01 destroyed! Automated combat test protocol: Deploying new Vanguard Cruiser at primary coordinates (-220, 80) in 1.0s...', 'warn');
      }

      this.purgeDestroyedEntities();
      return;
    }

    // 2. DISABLED (HP <= 12.5% max HP / 50% Crippled Bar)
    if (ship.hullHp <= disabledThreshold) {
      if (ship.hullState !== 'DISABLED') {
        ship.hullState = 'DISABLED';
        ship.splineActive = false;
        ship.velocity = { x: 0, y: 0 };
        ship.commandedSpeed = 0;
        this.addLog('CRIPPLE', `🚨 ${ship.name}: SHIP DISABLED (HP <= 12.5%). Halting completely; weapons, engines & active/passive defenses offline!`, 'crit');

        // FIRE_TO_DISABLE protocol
        for (const m of this.missiles) {
          if (m.alive && m.targetId === ship.id) {
            const firingShip = this.ships.find((s) => s.id === m.sourceShipId);
            const isDisable = firingShip ? firingShip.aggressiveDoctrine === 'DISABLE' : m.doctrine === 'DISABLE';
            if (isDisable) {
              m.alive = false;
              this.triggerSelfDestruct(m.pos, `[SELF-DESTRUCT: ${ship.name} DISABLED]`);
              this.addLog('ORDNANCE', `💥 Missile [${m.id}] self-destructed: Target ${ship.name} disabled (FIRE_TO_DISABLE protocol).`, 'info');
            }
          }
        }
      }

      // Permanent Frame Damage Scaling:
      // At entry (disabledRatio = 1.0): frame cap = 100%
      // At 50% disabled damage (disabledRatio = 0.5): frame cap = 90%
      // At 0% disabled damage (disabledRatio = 0.0): frame cap = 0%
      const disabledRatio = Math.max(0, Math.min(1.0, ship.hullHp / Math.max(1, disabledThreshold)));
      const frameCap = disabledRatio >= 0.5 ? 0.90 + ((disabledRatio - 0.5) / 0.5) * 0.10 : (disabledRatio / 0.5) * 0.90;
      ship.maxRepairableHull = Math.min(ship.maxRepairableHull ?? ship.hullMax, frameCap * ship.hullMax);
      ship.permanentFrameDamageCap = ship.maxRepairableHull / ship.hullMax;
      return;
    }

    // 3. CRIPPLED (HP <= 25% max HP / 100% to 50% Crippled Bar)
    if (ship.hullHp <= crippleThreshold) {
      if (ship.hullState !== 'CRIPPLED') {
        ship.hullState = 'CRIPPLED';
        this.addLog('CRIPPLE', `⚠️ ${ship.name}: HULL CRIPPLED (HP <= 25%). Speed and weapon accuracy degraded!`, 'warn');
      }
      return;
    }

    // 4. OPERATIONAL
    ship.hullState = 'OPERATIONAL';
  }

  /**
   * Comprehensive memory retention & dead entity reference purge:
   * - Dereferences destroyed ships from selection sets, fleet groups, and hostiles
   * - Clears waypoints, path splines, and formation offsets on dead vessels
   * - Disengages targeting locks across all ships and ballistic missiles targeting dead entities
   * - Cleans up dead threat buckets and orphaned caches
   */
  public purgeDestroyedEntities(): void {
    const aliveShipIds = new Set<string>();
    const destroyedShipIds = new Set<string>();

    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s && s.hullState !== 'DESTROYED' && s.hullHp > 0) {
        aliveShipIds.add(s.id);
      } else if (s) {
        destroyedShipIds.add(s.id);
        s.targetEntityId = null;
        s.pdplaActiveBeamTarget = null;
        s.splineActive = false;
        if (s.waypoints && s.waypoints.length > 0) {
          s.waypoints = [];
        }
        s.formationOffset = undefined;
        s.formationFlagshipId = undefined;
      }
    }

    if (destroyedShipIds.size === 0) return;

    // 1. Purge from selection sets
    if (this.selectedShipId && destroyedShipIds.has(this.selectedShipId)) {
      const firstAlive = this.ships.find((s) => s.faction === 'FRIENDLY' && aliveShipIds.has(s.id));
      this.selectedShipId = firstAlive ? firstAlive.id : null;
    }
    if (this.selectedShipIds && this.selectedShipIds.length > 0) {
      this.selectedShipIds = this.selectedShipIds.filter((id) => aliveShipIds.has(id));
    }

    // 2. Purge from fleet groups
    for (const [fId, group] of this.fleetGroups.entries()) {
      group.shipIds = group.shipIds.filter((id) => aliveShipIds.has(id));
      if (group.shipIds.length === 0) {
        this.fleetGroups.delete(fId);
      } else if (group.flagshipId && destroyedShipIds.has(group.flagshipId)) {
        const remaining = this.ships.filter((s) => group.shipIds.includes(s.id) && aliveShipIds.has(s.id));
        const newFlag = determineFlagship(remaining);
        if (newFlag) {
          group.flagshipId = newFlag.id;
        }
      }
    }

    // 3. Purge from targeting registers across all living ships
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.targetEntityId && destroyedShipIds.has(s.targetEntityId)) {
        s.targetEntityId = null;
      }
      if (s.formationFlagshipId && destroyedShipIds.has(s.formationFlagshipId)) {
        s.formationFlagshipId = undefined;
        s.formationOffset = undefined;
      }
    }

    // 4. Purge dead targets from active missiles (switch to unhoming / ballistic)
    for (let m = 0; m < this.missiles.length; m++) {
      const missile = this.missiles[m];
      if (missile.alive && missile.targetId && destroyedShipIds.has(missile.targetId)) {
        missile.targetId = '';
        missile.isSpoofed = true;
      }
    }

    // 5. Threat buckets cleanup - remove any keys that are not alive ships
    for (const targetId of this._threatBuckets.keys()) {
      if (!aliveShipIds.has(targetId)) {
        this._threatBuckets.delete(targetId);
      }
    }
  }

  public generatePatrolWaypoints(
    anchor: Vec2D,
    pattern: 'FIGURE_EIGHT' | 'ELLIPSE_SWEEP' | 'ZIG_ZAG' | 'PERIMETER_BOX',
    radius: number,
    orientation: number = 0
  ): Vec2D[] {
    const waypoints: Vec2D[] = [];
    const cosO = Math.cos(orientation);
    const sinO = Math.sin(orientation);

    const rotatePoint = (x: number, y: number): Vec2D => ({
      x: anchor.x + (x * cosO - y * sinO),
      y: anchor.y + (x * sinO + y * cosO),
    });

    if (pattern === 'FIGURE_EIGHT') {
      // Lemniscate of Bernoulli: 8 continuous waypoints forming an infinity patrol loop
      const count = 8;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const denom = 1 + Math.sin(t) * Math.sin(t);
        const x = (radius * 1.35 * Math.cos(t)) / denom;
        const y = (radius * 1.15 * Math.sin(t) * Math.cos(t)) / denom;
        waypoints.push(rotatePoint(x, y));
      }
    } else if (pattern === 'ZIG_ZAG') {
      // Tactical combat weave: 6 continuous waypoints dog-legging across patrol axis
      const halfSpan = radius * 1.25;
      const lateralOff = radius * 0.55;
      waypoints.push(rotatePoint(-halfSpan, -lateralOff));
      waypoints.push(rotatePoint(-halfSpan * 0.35, lateralOff));
      waypoints.push(rotatePoint(halfSpan * 0.35, -lateralOff));
      waypoints.push(rotatePoint(halfSpan, lateralOff));
      waypoints.push(rotatePoint(halfSpan * 0.5, 0));
      waypoints.push(rotatePoint(-halfSpan * 0.5, 0));
    } else if (pattern === 'PERIMETER_BOX') {
      // Wide perimeter screening circuit: 8 waypoints forming a rounded tactical polygon
      const count = 8;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const r = radius * (1.05 + 0.22 * Math.cos(4 * t));
        const x = r * Math.cos(t);
        const y = r * Math.sin(t);
        waypoints.push(rotatePoint(x, y));
      }
    } else {
      // ELLIPSE_SWEEP: 8 continuous waypoints along an orbital ellipse
      const count = 8;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const x = radius * 1.25 * Math.cos(t);
        const y = radius * 0.85 * Math.sin(t);
        waypoints.push(rotatePoint(x, y));
      }
    }

    return waypoints;
  }

  public initHostilePatrol(ship: ShipEntity) {
    const shipSys = this.getSystemForShip(ship)?.solarSystem || this.solarSystem;
    initNPCPatrolState(ship, shipSys);
    if (!ship.patrolAnchor) {
      ship.patrolAnchor = { ...ship.pos };
    }
    if (!ship.patrolRadius) {
      ship.patrolRadius = ship.npcPatrolState?.patrolRadius ?? (ship.role === 'DESTROYER' ? 360 : 280);
    }
    if (!ship.patrolPattern) {
      if (ship.role === 'DESTROYER') {
        ship.patrolPattern = 'ZIG_ZAG';
        ship.patrolOrientation = 0.6;
      } else if (ship.role === 'BATTLECRUISER') {
        ship.patrolPattern = 'FIGURE_EIGHT';
        ship.patrolOrientation = -0.3;
      } else if (ship.name.includes('01')) {
        ship.patrolPattern = 'PERIMETER_BOX';
        ship.patrolOrientation = 0.2;
      } else {
        ship.patrolPattern = 'ELLIPSE_SWEEP';
        ship.patrolOrientation = 0.9;
      }
    }

    ship.patrolWaypoints = this.generatePatrolWaypoints(
      ship.patrolAnchor,
      ship.patrolPattern,
      ship.patrolRadius,
      ship.patrolOrientation ?? 0
    );
    ship.patrolWaypointIndex = 0;

    // Immediately order movement to first waypoint if wander target not yet assigned
    if (!ship.npcPatrolState?.currentWanderTarget) {
      const pWps = ship.patrolWaypoints ?? [];
      if (pWps.length > 0) {
        this.setAutonomousSplineOrder(ship, pWps[0]);
      }
    }
  }

  public advanceHostilePatrol(ship: ShipEntity) {
    if (!ship || ship.hullState !== 'OPERATIONAL' || ship.faction !== 'HOSTILE' || ship.isStationary) return;

    if (ship.npcPatrolState) {
      handleNPCOnArrival(ship);
      return;
    }

    const pWps = ship.patrolWaypoints ?? [];
    if (pWps.length === 0) {
      this.initHostilePatrol(ship);
      return;
    }

    // Advance to next waypoint index immediately
    ship.patrolWaypointIndex = ((ship.patrolWaypointIndex ?? 0) + 1) % pWps.length;
    let targetPos = pWps[ship.patrolWaypointIndex];

    // For roving pirates: enforce that destination remains strictly in outer system (>= Asteroid Belt min radius)
    if (ship.isRovingPirate && this.solarSystem && targetPos) {
      const dOrigin = Math.hypot(targetPos.x, targetPos.y);
      const minRadius = this.solarSystem.beltRadiusMin + 400;
      if (dOrigin < minRadius) {
        const scale = minRadius / (dOrigin || 1);
        targetPos = { x: targetPos.x * scale, y: targetPos.y * scale };
      }
    }

    if (targetPos) {
      this.setAutonomousSplineOrder(ship, targetPos);
    }
  }

  private updateHostilePatrols(dt: number) {
    for (const ship of this.ships) {
      if (!ship || ship.faction !== 'HOSTILE' || ship.hullState !== 'OPERATIONAL' || ship.isStationary) continue;

      // Inner Planetary Patrol Behavior Loop for moored / anchored hostile and pirate vessels
      if (!ship.targetEntityId && ship.mooredAnchorId) {
        const hostPlanet = this.planets.find((p) => p.id === ship.mooredAnchorId);
        if (hostPlanet) {
          const angle = (this.tickCount * 0.005 + (ship.id.charCodeAt(0) || 0)) % (Math.PI * 2);
          const orbitR = 2200;
          const px = hostPlanet.x ?? hostPlanet.pos?.x ?? hostPlanet.position?.x ?? 0;
          const py = hostPlanet.y ?? hostPlanet.pos?.y ?? hostPlanet.position?.y ?? 0;
          const targetX = px + Math.cos(angle) * orbitR;
          const targetY = py + Math.sin(angle) * orbitR;
          steerTowards(ship, targetX, targetY, dt);
          continue;
        } else if (this.galaxyResult?.allClusters) {
          const hostCluster = this.galaxyResult.allClusters.find((c) => c.id === ship.mooredAnchorId);
          if (hostCluster) {
            const angle = (this.tickCount * 0.005 + (ship.id.charCodeAt(0) || 0)) % (Math.PI * 2);
            const orbitR = 1800;
            const cx = hostCluster.center?.x ?? (hostCluster as any).x ?? 0;
            const cy = hostCluster.center?.y ?? (hostCluster as any).y ?? 0;
            const targetX = cx + Math.cos(angle) * orbitR;
            const targetY = cy + Math.sin(angle) * orbitR;
            steerTowards(ship, targetX, targetY, dt);
            continue;
          }
        }
      }

      // Bound roving pirate ships strictly >= Asteroid Belt minimum radius
      if (ship.isRovingPirate && this.solarSystem) {
        const dOrigin = Math.hypot(ship.pos.x, ship.pos.y);
        const minRadius = this.solarSystem.beltRadiusMin;
        if (dOrigin < minRadius + 300) {
          const scale = (minRadius + 300) / (dOrigin || 1);
          ship.pos.x *= scale;
          ship.pos.y *= scale;
        }
      }

      // Execute NPC Gravity Well Patrol Anchor Engine, Procedural Wandering & 1.5x Leash State Machine
      const shipSys = this.getSystemForShip(ship)?.solarSystem || this.solarSystem;
      updateNPCPatrol(ship, this.ships, dt, shipSys);
    }
  }

  public setAutonomousSplineOrder(ship: ShipEntity, targetPos: Vec2D) {
    if (!ship || ship.hullState !== 'OPERATIONAL') return;

    const cruisingSpeed = Math.max(ship.maxSpeed * (ship.role === 'DESTROYER' ? 0.70 : 0.55), 50.0);
    issueMoveCommand(ship, targetPos, cruisingSpeed);
  }

  private applyShipCollisionAvoidance(dt: number) {
    const MIN_SEPARATION = 68.0; // km
    const MIN_SEPARATION_SQ = MIN_SEPARATION * MIN_SEPARATION;

    for (let i = 0; i < this.ships.length; i++) {
      const shipA = this.ships[i];
      if (shipA.hullState === 'DESTROYED' || shipA.jumpState === 'TRANSIT' || shipA.jumpState === 'IN_TRANSIT') continue;
      // Miners do not collide with anything
      if (isMinerVessel(shipA)) continue;

      for (let j = i + 1; j < this.ships.length; j++) {
        const shipB = this.ships[j];
        if (shipB.hullState === 'DESTROYED' || shipB.jumpState === 'TRANSIT' || shipB.jumpState === 'IN_TRANSIT') continue;
        // Miners do not collide with anything
        if (isMinerVessel(shipB)) continue;

        // Skip collision avoidance between allied friendly formation vessels:
        // Escorts use fixed polar station-keeping offsets relative to the flagship,
        // eliminating the need for inter-escort repulsive force calculations.
        if (shipA.faction === 'FRIENDLY' && shipB.faction === 'FRIENDLY') {
          continue;
        }

        // Interstellar isolation: ships in different star systems cannot collide
        if (shipA.systemId && shipB.systemId && shipA.systemId !== shipB.systemId) {
          continue;
        }

        // Two stationary structures do not push each other
        if (shipA.isStationary && shipB.isStationary) {
          continue;
        }

        const dx = shipB.pos.x - shipA.pos.x;
        const dy = shipB.pos.y - shipA.pos.y;
        const dSq = dx * dx + dy * dy;

        if (dSq < MIN_SEPARATION_SQ && dSq > 0.0001) {
          const dist = Math.sqrt(dSq);
          const overlap = MIN_SEPARATION - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push ships apart to prevent touching / overlapping; stationary entities anchor firmly
          const pushForce = overlap * 0.5 * Math.min(dt * 12.0, 1.0);
          if (shipA.isStationary) {
            shipB.pos.x += nx * pushForce * 2;
            shipB.pos.y += ny * pushForce * 2;
            const dampFactor = 18.0 * dt;
            shipB.velocity.x += nx * dampFactor;
            shipB.velocity.y += ny * dampFactor;
          } else if (shipB.isStationary) {
            shipA.pos.x -= nx * pushForce * 2;
            shipA.pos.y -= ny * pushForce * 2;
            const dampFactor = 18.0 * dt;
            shipA.velocity.x -= nx * dampFactor;
            shipA.velocity.y -= ny * dampFactor;
          } else {
            shipA.pos.x -= nx * pushForce;
            shipA.pos.y -= ny * pushForce;
            shipB.pos.x += nx * pushForce;
            shipB.pos.y += ny * pushForce;

            const dampFactor = 18.0 * dt;
            shipA.velocity.x -= nx * dampFactor;
            shipA.velocity.y -= ny * dampFactor;
            shipB.velocity.x += nx * dampFactor;
            shipB.velocity.y += ny * dampFactor;
          }
        }
      }
    }
  }

  public resetToScenario(scenario: { ships: ShipEntity[]; jumpGate: JumpGateEntity; defaultConfig?: Partial<SimulationConfig> }) {
    this.ships = JSON.parse(JSON.stringify(scenario.ships));
    this.jumpGate = JSON.parse(JSON.stringify(scenario.jumpGate));
    this.missiles = [];
    this.counterMissiles = [];
    if (this.ordnanceSOA) {
      this.ordnanceSOA.missiles.activeCount = 0;
      this.ordnanceSOA.cms.activeCount = 0;
    }
    this.detonations = [];
    this.combatLogs = [];
    this.vanguardRespawnTimer = 0;
    this.researchManager.reset();
    this.selectedShipId = this.ships[0]?.id || null;
    this.selectedShipIds = [];
    this.fleetGroups.clear();
    this._threatBuckets.clear();
    this.asteroidSpatialStore.clear();
    this.purgeDestroyedEntities();
    if (scenario.defaultConfig) {
      this.config = { ...this.config, ...scenario.defaultConfig };
    }

    // Re-initialize procedural solar system & dock HQ/fleet
    this.initSolarSystemAndEntities(this.config.seed);

    // Initialize hostile patrols and reset PD states
    for (const s of this.ships) {
      this.sanitizeShip(s);
      s.pdplaSalvoCount = 0;
      s.pdplaOverheated = false;
      s.pdplaOverheatTimer = 0.0;
      s.pdplaOverheatDuration = 3.0;
      s.pdplaIdleCooldown = 0.0;
      if (s.counterMissilesMax === undefined) {
        s.counterMissilesMax = s.counterMissiles || 50;
      }
      if (s.faction === 'HOSTILE') {
        this.initHostilePatrol(s);
      }
    }
    this.addLog('ORDNANCE', `Simulation scenario loaded. Solar system celestial bodies & orbital networks synchronized.`, 'info');
  }

  public respawnVanguard() {
    const defaultShips = createDefaultShips();
    const defaultVanguard = defaultShips.find((s) => s.id === 'vanguard-01');
    if (!defaultVanguard) return;

    const hq = this.getHQ();
    const spawnPos = hq ? { x: hq.pos.x + 180, y: hq.pos.y - 70 } : { x: -220, y: 80 };

    let vanguard = this.ships.find((s) => s.id === 'vanguard-01');
    if (vanguard) {
      Object.assign(vanguard, {
        pos: { ...spawnPos },
        velocity: { x: 0, y: 0 },
        heading: 0,
        splineActive: false,
        h2Fuel: defaultVanguard.h2FuelMax,
        missiles: defaultVanguard.missilesMax,
        counterMissiles: defaultVanguard.counterMissiles,
        counterMissilesMax: defaultVanguard.counterMissiles,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        combatStance: 'AGGRESSIVE',
        autoFire: true,
        pdplaCooldown: 0.0,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaSalvoCount: 0,
        pdplaOverheated: false,
        pdplaOverheatTimer: 0.0,
        pdplaOverheatDuration: 3.0,
        shieldHp: defaultVanguard.shieldHpMax,
        shieldHeat: 0.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullHp: defaultVanguard.hullMax,
        maxRepairableHull: defaultVanguard.hullMax,
        crippleBar: defaultVanguard.crippleBarMax,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
      });
    } else {
      vanguard = { ...defaultVanguard, pos: { ...spawnPos } };
      this.ships.unshift(this.sanitizeShip(vanguard));
    }

    this.selectedShipId = 'vanguard-01';
    this.addLog('TACTICAL', `🚀 [REINFORCEMENT]: Fresh Vanguard Cruiser deployed in geosynchronous HQ orbit (${Math.round(spawnPos.x)}, ${Math.round(spawnPos.y)}). Systems fully operational!`, 'success');
  }

  // --- FOUNDATIONAL INDUSTRIAL ECONOMY & PRODUCTION QUEUES ---

  public getHQ(): ShipEntity | undefined {
    return this.ships.find((s) => s.role === 'HQ' && s.hullState !== 'DESTROYED');
  }

  public setHomeworldType(type: HomeworldTypeId): void {
    this.homeworldType = type;
    if (this.solarSystem?.primaryHabitablePlanet) {
      applyHomeworldTypeToPlanet(this.solarSystem.primaryHabitablePlanet, type);
    }
  }

  public setHQType(type: HqTypeId): void {
    this.hqType = type;
    const hq = this.ships.find((s) => s.role === 'HQ');
    if (hq) {
      applyHQDefinitionToShip(hq, type, this.playerFaction);
    }
  }

  public getHQDefinition(): HqTypeDefinition {
    return HQ_REGISTRY[this.hqType] || HQ_REGISTRY.NOVAN_COMMAND_SPIRE;
  }

  public getHomeworldDefinition(): HomeworldTypeDefinition {
    return HOMEWORLD_REGISTRY[this.homeworldType] || HOMEWORLD_REGISTRY.TERRAN;
  }

  public getHQResources(): HQResources {
    const hq = this.getHQ();
    if (hq && hq.resources) {
      return hq.resources;
    }
    return {
      ore: 0,
      maxOre: 16000,
      metallic: 0,
      maxMetallic: 100000,
      organic: 0,
      maxOrganic: 100000,
      neridium: 0,
      maxNeridium: 1000,
    };
  }

  public updateAsteroids(dt: number) {
    const astLen = this.asteroids.length;
    const store = this.asteroidSpatialStore;
    const count = Math.min(store.count, astLen);
    const pos = store.positions;
    const rot = store.rotations;

    for (let i = 0; i < count; i++) {
      const ast = this.asteroids[i];
      ast.rotation += ast.rotationSpeed * dt;
      pos[i * 2] = ast.pos.x;
      pos[i * 2 + 1] = ast.pos.y;
      rot[i] = ast.rotation || 0;
    }
    for (let i = count; i < astLen; i++) {
      this.asteroids[i].rotation += this.asteroids[i].rotationSpeed * dt;
    }

    // Replenish neutral field in the main asteroid belt (12k-16k km) if heavily depleted
    if (this.asteroids.length < 20 && Math.random() < 0.08 * dt) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12000 + Math.random() * 4000;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      this.asteroids.push(createAsteroid(`ast-replenish-${Date.now().toString(36)}`, { x, y }));
      this.asteroidSpatialStore.init(this.asteroids, this.galaxyResult?.allClusters || this.solarSystem?.clusters);
    }
  }

  public updateRefinery(dt: number) {
    const hq = this.getHQ();
    if (!hq || !hq.resources) return;

    const nodes = this.researchManager.completedNodes;
    const maxSilMultiplier = this.hqStorageMult || 1.0;

    // Sub-Silo Storage Expansion scaling: 100,000 + (unlockedSiloTier * 15,000)
    const dynamicLimit = calculateStorageLimit(nodes, maxSilMultiplier);
    hq.resources.maxMetallic = dynamicLimit;
    hq.resources.maxOrganic = dynamicLimit;

    // Modular Refinery Track Ore Storage scaling: 16,000 + (unlockedRefineryCount * 4,000)
    const dynamicOreLimit = calculateMaxOreStorage(nodes, maxSilMultiplier);
    hq.resources.maxOre = dynamicOreLimit;

    clampStockpileReserves(hq.resources, nodes, maxSilMultiplier);

    // Passive Organic & Metallic generation from Civilian Biospheres / Nanite Synthesizers
    if (this.passiveOrganicRate > 0) {
      hq.resources.organic = Math.min(hq.resources.maxOrganic, hq.resources.organic + this.passiveOrganicRate * dt);
    }
    if (this.passiveMetallicRate > 0) {
      hq.resources.metallic = Math.min(hq.resources.maxMetallic, hq.resources.metallic + this.passiveMetallicRate * dt);
    }

    // Economic yield extraction from colonized planets (Terran governance)
    if (this.solarSystem && Array.isArray(this.solarSystem.rockyPlanets)) {
      const taxBonus = this.colonyTaxMult || 1.0;
      const rPlanets = this.solarSystem.rockyPlanets;
      for (let pIdx = 0; pIdx < rPlanets.length; pIdx++) {
        const cp = rPlanets[pIdx];
        if (cp && cp.colonized && !cp.isPrimaryHabitable) {
          const yieldMet = (cp.resourceYieldRate?.metallic ?? 25.0) * taxBonus * dt;
          const yieldOrg = (cp.resourceYieldRate?.organic ?? 25.0) * taxBonus * dt;
          hq.resources.metallic = Math.min(hq.resources.maxMetallic, hq.resources.metallic + yieldMet);
          hq.resources.organic = Math.min(hq.resources.maxOrganic, hq.resources.organic + yieldOrg);
        }
      }
    }

    // Modular Refinery Parallel Tracks Processing Rate:
    // Base 10.0 Ore/s + (unlockedRefineryCount * 10.0) boosted by refinery research speed multiplier
    const speedMult = this.refinerySpeedMult || 1.0;
    const processingRate = calculateOreConversionRate(nodes, speedMult);
    hq.refineryRate = processingRate;
    const maxOreToRefine = Math.min(hq.resources.ore, processingRate * dt);

    if (maxOreToRefine <= 0) {
      hq.refineryActive = false;
      return;
    }

    // Stops refining if either metallic or organic storage reaches max
    const availableMetallic = hq.resources.maxMetallic - hq.resources.metallic;
    const availableOrganic = hq.resources.maxOrganic - hq.resources.organic;

    if (availableMetallic <= 0 || availableOrganic <= 0) {
      hq.refineryActive = false;
      return;
    }

    // Ratio: 1 Ore -> (0.52 * conv * yield) Metallic + (0.48 * conv) Organic
    const metRatio = 0.52 * (this.oreConversionMult || 1.0) * (this.refineryYieldMult || 1.0);
    const orgRatio = 0.48 * (this.oreConversionMult || 1.0);

    const oreForMetallic = availableMetallic / metRatio;
    const oreForOrganic = availableOrganic / orgRatio;
    const actualOre = Math.min(maxOreToRefine, oreForMetallic, oreForOrganic);

    if (actualOre > 0) {
      hq.resources.ore -= actualOre;
      hq.resources.metallic = Math.min(hq.resources.maxMetallic, hq.resources.metallic + actualOre * metRatio);
      hq.resources.organic = Math.min(hq.resources.maxOrganic, hq.resources.organic + actualOre * orgRatio);
      hq.refineryActive = true;
      processRefineryOre(this, actualOre);
    } else {
      hq.refineryActive = false;
    }
  }

  public updateAutonomousMiners(dt: number) {
    const hq = this.getHQ();
    const missileRange = this.config.missileRange || 1000.0;
    const threatRadius = 2.0 * missileRange;

    // Cache living hostiles and allied friendly vessels once without allocating in-loop
    const livingHostiles: ShipEntity[] = [];
    const alliedShips: ShipEntity[] = [];
    for (let i = 0; i < this.ships.length; i++) {
      const s = this.ships[i];
      if (s.hullState === 'DESTROYED') continue;
      if (s.faction === 'HOSTILE' && (s.hullHp === undefined || s.hullHp > 0)) {
        livingHostiles.push(s);
      } else if (s.faction === 'FRIENDLY') {
        alliedShips.push(s);
      }
    }

    const threatsInRadarScratch: ShipEntity[] = [];

    for (let sIdx = 0; sIdx < this.ships.length; sIdx++) {
      const ship = this.ships[sIdx];
      if (!isMinerVessel(ship)) continue;

      // Permanent loss check on destruction
      if (ship.hullState === 'DESTROYED') {
        if ((ship.cargoOre || 0) > 0) {
          this.addLog('TACTICAL', `💥 ${ship.name} destroyed: All ${Math.round(ship.cargoOre!)} Ore lost in vacuum!`, 'crit');
          ship.cargoOre = 0;
        }
        unclampMiner(ship);
        continue;
      }
      if (ship.hullState === 'CRIPPLED') {
        unclampMiner(ship);
        continue;
      }

      ship.isMiningVessel = true;
      if (!ship.minerStance) ship.minerStance = 'TIMID';
      if (!ship.minerState) ship.minerState = 'STATE_SEEK';
      if (ship.cargoOre === undefined) ship.cargoOre = 0;
      ship.cargoOreMax = Math.round(1000 * (this.freighterCargoMult || 1.0));

      // --- TIMID STANCE THREAT MONITOR & ESCAPE LOGIC ---
      if (ship.minerStance === 'TIMID') {
        const minerRadarEnvelope = MINER_RADAR_ENVELOPE_KM; // 8400.0 km
        const minerRadarEnvelopeSq = minerRadarEnvelope * minerRadarEnvelope;
        threatsInRadarScratch.length = 0;

        for (let hIdx = 0; hIdx < livingHostiles.length; hIdx++) {
          const h = livingHostiles[hIdx];
          const dx = h.pos.x - ship.pos.x;
          const dy = h.pos.y - ship.pos.y;
          if (dx * dx + dy * dy <= minerRadarEnvelopeSq) {
            threatsInRadarScratch.push(h);
          }
        }

        const isBeingFiredUpon =
          (ship.lastUnderAttackTick !== undefined && this.tickCount - ship.lastUnderAttackTick < 150) ||
          (ship.hullHp !== undefined && ship.hullMax !== undefined && ship.hullHp < ship.hullMax);

        const threatDetected = threatsInRadarScratch.length > 0 || isBeingFiredUpon;

        if (threatDetected) {
          const wasMining = ship.minerClamped || ship.minerState === 'STATE_MINE';
          ship.minerThreatClearTicks = 0;
          if (!ship.minerRetreating || ship.minerState !== 'STATE_EVADING_HOSTILE') {
            ship.minerRetreating = true;
            ship.minerState = 'STATE_EVADING_HOSTILE';
            const nearestThreatName = threatsInRadarScratch.length > 0 ? threatsInRadarScratch[0].name : 'Incoming Fire';
            this.addLog(
              'RESOURCE',
              `⚠️ ${ship.name} [TIMID]: Hostile contact entered active radar envelope (8,400km) or opened fire (${nearestThreatName}). Aborting extraction -> Initiating STATE_EVADING_HOSTILE!`,
              'warn'
            );
          }

          // 1. Immediately abort asteroid docking/mining laser loops
          if (wasMining || ship.splineActive) {
            unclampMiner(ship);
            ship.splineActive = false;
          }

          // 2, 3, 4. Calculate evasion vector opposite to threat vector V_evasion = normalize(P_miner - P_threat)
          // and burn at full thrust toward nearest allied gravity well, orbital refinery, or HQ station
          const evasionVector = computeMinerEvasionVector(ship, threatsInRadarScratch, hq || null, alliedShips, this.solarSystem);
          stepRetreatSteering(ship, evasionVector, dt, hq || null);
        } else if (ship.minerRetreating || ship.minerState === 'STATE_EVADING_HOSTILE') {
          // 5. Hostiles have cleared radar horizon; track clear ticks
          ship.minerThreatClearTicks = (ship.minerThreatClearTicks || 0) + 1;

          if (ship.minerThreatClearTicks > MINER_EVADE_CLEAR_TICKS) {
            // Cleared for > 300 ticks (10 seconds) -> Resume mining operations!
            ship.minerRetreating = false;
            ship.minerThreatClearTicks = 0;
            ship.minerState = (ship.cargoOre || 0) >= (ship.cargoOreMax || 1000) ? 'STATE_RETURN' : 'STATE_SEEK';
            this.addLog(
              'RESOURCE',
              `🛡️ ${ship.name} [TIMID]: Hostiles cleared radar horizon for >10s (300 ticks). Resuming mining operations.`,
              'info'
            );
          } else {
            // Still in hysteresis cooldown: maintain retreat steering toward sanctuary
            const evasionVector = computeMinerEvasionVector(ship, [], hq || null, alliedShips, this.solarSystem);
            stepRetreatSteering(ship, evasionVector, dt, hq || null);
          }
        }
      } else {
        // In CARELESS stance, clear retreating and evasion flags if set previously
        ship.minerRetreating = false;
        ship.minerThreatClearTicks = 0;
        if (ship.minerState === 'STATE_EVADING_HOSTILE') {
          ship.minerState = (ship.cargoOre || 0) >= (ship.cargoOreMax || 1000) ? 'STATE_RETURN' : 'STATE_SEEK';
        }
      }

      // --- 4-STAGE AUTONOMOUS MINER STATE MACHINE ---
      switch (ship.minerState) {
        case 'STATE_EVADING_HOSTILE': {
          // Full-thrust evasive kinematic burn handled directly in TIMID threat avoidance loop
          break;
        }

        case 'STATE_SEEK':
        case 'STATE_TRANSIT_TO_ASTEROID': {
          unclampMiner(ship);

          // If hold is full, transition to RTB
          if (ship.cargoOre >= ship.cargoOreMax) {
            ship.minerState = 'STATE_TRANSIT_TO_HQ';
            if (hq) {
              launchMinerSpline(ship, getHQDockingTarget(ship, hq), ship.cruiseSpeed || ship.maxSpeed);
            }
            break;
          }

          // Evaluate candidate asteroid according to stance:
          // CARELESS: strictly min(distanceSq) across all non-depleted asteroids in absolute space
          // TIMID: nearest safe non-depleted asteroid (> 2.0 * R_missile from hostiles)
          let targetAsteroid = this.asteroids.find(
            (a) => a.id === ship.minerTargetAsteroidId && a.oreRemaining > 0
          );

          if (
            !targetAsteroid ||
            (ship.minerStance === 'TIMID' && isAsteroidThreatened(targetAsteroid, livingHostiles, threatRadius))
          ) {
            const candidate = findCandidateAsteroid(ship, this.asteroids, livingHostiles, missileRange);
            if (candidate.asteroid) {
              targetAsteroid = candidate.asteroid;
              ship.minerTargetAsteroidId = targetAsteroid.id;
              // Launch direct Hermite spline in absolute world space
              launchMinerSpline(ship, targetAsteroid.pos, ship.maxSpeed);
            } else {
              // No valid or safe asteroids available
              ship.minerTargetAsteroidId = null;
              if (ship.cargoOre > 0) {
                ship.minerState = 'STATE_RETURN';
                if (hq) {
                  launchMinerSpline(ship, getHQDockingTarget(ship, hq), ship.maxSpeed);
                }
              } else {
                ship.velocity.x *= 0.95;
                ship.velocity.y *= 0.95;
              }
              break;
            }
          }

          // Evaluate arrival at targeted asteroid
          const dSq = distSq(ship.pos, targetAsteroid.pos);
          const arrivalThreshold = targetAsteroid.radius + 35.0;

          if (
            dSq <= arrivalThreshold * arrivalThreshold ||
            (ship.splineActive && ship.splineT >= 1.0 && dSq <= (arrivalThreshold + 50.0) * (arrivalThreshold + 50.0))
          ) {
            // Arrived at asteroid: clamp tether
            ship.minerState = 'STATE_MINE';
            clampMinerToAsteroid(ship, targetAsteroid);
            this.addLog(
              'RESOURCE',
              `⛏️ ${ship.name}: Clamped tether to asteroid node [${targetAsteroid.tier}]. Boring lasers energized at ${MINER_MINE_RATE} Ore/sec.`,
              'info'
            );
          } else {
            // Under transit thrust in absolute world space
            if (!ship.splineActive) {
              launchMinerSpline(ship, targetAsteroid.pos, ship.maxSpeed);
            } else {
              // If asteroid shifted due to cluster orbit, track moving destination
              const driftSq = distSq(ship.splineP1, targetAsteroid.pos);
              if (driftSq > 60.0 * 60.0) {
                launchMinerSpline(ship, targetAsteroid.pos, ship.maxSpeed);
              }
            }
          }
          break;
        }

        case 'STATE_MINE': {
          const ast = this.asteroids.find(
            (a) => a.id === ship.minerTargetAsteroidId && a.oreRemaining > 0
          );

          if (!ast) {
            unclampMiner(ship);
            if (ship.cargoOre >= ship.cargoOreMax) {
              ship.minerState = 'STATE_RETURN';
              if (hq) launchMinerSpline(ship, getHQDockingTarget(ship, hq), ship.maxSpeed);
            } else {
              ship.minerState = 'STATE_SEEK';
            }
            break;
          }

          // If Timid and threatened, abort extraction immediately
          if (ship.minerStance === 'TIMID' && isAsteroidThreatened(ast, livingHostiles, threatRadius)) {
            unclampMiner(ship);
            ship.minerState = ship.cargoOre > 0 ? 'STATE_RETURN' : 'STATE_SEEK';
            if (ship.minerState === 'STATE_RETURN' && hq) {
              launchMinerSpline(ship, getHQDockingTarget(ship, hq), ship.maxSpeed);
            }
            break;
          }

          // Clamped tether lock:
          // Match cluster / asteroid orbital delta at zero relative velocity
          if (!ship.minerClamped || !ship.minerClampedOffset) {
            clampMinerToAsteroid(ship, ast);
          } else {
            ship.pos.x = ast.pos.x + ship.minerClampedOffset.x;
            ship.pos.y = ast.pos.y + ship.minerClampedOffset.y;
            ship.velocity = { x: 0, y: 0 };
            ship.heading = Math.atan2(-ship.minerClampedOffset.y, -ship.minerClampedOffset.x);
          }

          ship.splineActive = false;
          ship.isMoored = false;
          ship.miningLaserActive = true;
          if (!ship.miningLaserTarget) {
            ship.miningLaserTarget = { x: ast.pos.x, y: ast.pos.y };
          } else {
            ship.miningLaserTarget.x = ast.pos.x;
            ship.miningLaserTarget.y = ast.pos.y;
          }

          // Extract ore at rate boosted by research: MINER_MINE_RATE * minerSpeedMult
          const spaceInCargo = ship.cargoOreMax - ship.cargoOre;
          const currentMineRate = MINER_MINE_RATE * (this.minerSpeedMult || 1.0);
          const oreExtracted = Math.min(ast.oreRemaining, spaceInCargo, currentMineRate * dt);

          if (oreExtracted > 0) {
            ast.oreRemaining -= oreExtracted;
            ship.cargoOre += oreExtracted;
            this.asteroidSpatialStore.updateOre(this.asteroidSpatialStore.getIndexById(ast.id), ast.oreRemaining);
          }

          // Check node depletion
          if (ast.oreRemaining <= 0) {
            ast.oreRemaining = 0;
            this.asteroidSpatialStore.updateOre(this.asteroidSpatialStore.getIndexById(ast.id), 0);
            this.addLog('RESOURCE', `Asteroid node [${ast.tier}] depleted. Removing from orbital radar.`, 'info');
            this.asteroids = this.asteroids.filter((a) => a.id !== ast.id);
            this.asteroidSpatialStore.init(this.asteroids, this.galaxyResult?.allClusters || this.solarSystem?.clusters);
            unclampMiner(ship);

            // Immediately re-enable absolute world-space flight
            if (ship.cargoOre >= ship.cargoOreMax) {
              ship.minerState = 'STATE_TRANSIT_TO_HQ';
              if (hq) launchMinerSpline(ship, getHQDockingTarget(ship, hq), ship.cruiseSpeed || ship.maxSpeed);
            } else {
              ship.minerState = 'STATE_TRANSIT_TO_ASTEROID';
            }
            break;
          }

          // Check cargo hold full (1,000 ore)
          if (ship.cargoOre >= ship.cargoOreMax) {
            ship.cargoOre = ship.cargoOreMax;
            unclampMiner(ship);
            const dropRange = hq?.oreDropOffRange || hq?.dockingRadius || R_TRANSFER;
            this.addLog('RESOURCE', `${ship.name}: Cargo hold full (${ship.cargoOreMax} Ore). Tether unclamped. RTB to HQ silos at ${Math.round(dropRange)}km transfer perimeter.`, 'info');
            ship.minerState = 'STATE_TRANSIT_TO_HQ';
            if (hq) launchMinerSpline(ship, getHQDockingTarget(ship, hq), ship.cruiseSpeed || ship.maxSpeed);
          }
          break;
        }

        case 'STATE_RETURN':
        case 'STATE_TRANSIT_TO_HQ': {
          unclampMiner(ship);

          if (!hq) {
            ship.velocity.x *= 0.95;
            ship.velocity.y *= 0.95;
            break;
          }

          const distToHq = getHQDistance(ship, hq);
          const effectiveTransferRadius = hq.oreDropOffRange || hq.dockingRadius || R_TRANSFER;
          const effectiveApproachRadius = effectiveTransferRadius * 1.5;
          const dockingTarget = getHQDockingTarget(ship, hq);
          const distToDockTarget = Math.hypot(ship.pos.x - dockingTarget.x, ship.pos.y - dockingTarget.y);

          // 1. ARRIVAL THRESHOLD: entered transfer perimeter (+ buffer) or reached docking perimeter target
          const isRing = Boolean(hq.isRingStructure || hq.hqType === 'GARN_RING_CITADEL' || hq.isGarnRing);
          const inTransferPerimeter =
            isWithinHQTransferRange(ship, hq, effectiveTransferRadius) ||
            distToHq <= effectiveTransferRadius + (isRing ? 60.0 : 40.0) ||
            distToDockTarget <= 60.0 ||
            (!ship.splineActive && distToDockTarget <= 120.0);

          if (inTransferPerimeter) {
            engageMinerDockingStationKeeping(ship, hq, effectiveTransferRadius);
            this.addLog(
              'RESOURCE',
              `⚓ ${ship.name}: Entered HQ ore transfer perimeter (${Math.round(distToHq)}km <= ${Math.round(effectiveTransferRadius)}km). Station-keeping hold locked. High-speed offload engaged (3,000 Ore/s).`,
              'info'
            );
            break;
          }

          // 2. APPROACH DECELERATION: within 1.5 * effectiveTransferRadius, clamp thrust & retro-brake
          if (distToHq <= effectiveApproachRadius) {
            applyMinerApproachBraking(ship, hq, dt, effectiveTransferRadius);
          }

          // 3. TRAJECTORY UPDATES TOWARDS HQ DOCKING PERIMETER
          if (!ship.splineActive) {
            launchMinerSpline(ship, dockingTarget, ship.cruiseSpeed || ship.maxSpeed);
          } else {
            // Re-align endpoint smoothly if HQ shifted in orbit
            const dockDriftSq = distSq(ship.splineP1, dockingTarget);
            if (dockDriftSq > 30.0 * 30.0) {
              launchMinerSpline(ship, dockingTarget, ship.commandedSpeed || ship.cruiseSpeed || ship.maxSpeed);
            }
          }
          break;
        }

        case 'STATE_UNLOAD':
        case 'STATE_DOCKING_OFFLOAD':
        case 'STATE_OFFLOAD': {
          unclampMiner(ship);

          if (!hq || !hq.resources) {
            releaseMinerDockingStationKeeping(ship);
            ship.minerState = 'STATE_TRANSIT_TO_ASTEROID';
            break;
          }

          // Maintain synchronized station-keeping hold locked relative to HQ
          updateMinerDockingStationKeeping(ship, hq);

          // High-speed ore transfer into HQ silos (3,000 Ore/s or 100 Ore/tick at 30Hz)
          const { transferred, hqFull, holdEmpty } = stepMinerCargoOffload(
            ship,
            hq,
            dt,
            this.minerTurnaroundSpeedMult || 1.0
          );

          // When cargo hold is completely emptied (cargoOre <= 0)
          if (holdEmpty) {
            ship.cargoOre = 0;
            this.addLog(
              'RESOURCE',
              `📦 ${ship.name}: Cargo completely discharged (Hold: 0/${ship.cargoOreMax} Ore). Releasing station-keeping hold and dispatching return-to-mine traversal.`,
              'info'
            );

            const nextAst = findCandidateAsteroid(ship, this.asteroids, livingHostiles, missileRange);
            if (nextAst.asteroid) {
              dispatchMinerReturnToAsteroids(ship, hq, nextAst.asteroid);
            } else {
              releaseMinerDockingStationKeeping(ship);
              ship.minerState = 'STATE_TRANSIT_TO_ASTEROID';
              ship.velocity = { x: 0, y: 0 };
            }
          }
          break;
        }
      }
    }
  }

  public updateProductionQueues(dt: number) {
    if (!Array.isArray(this.ships)) return;
    for (const station of this.ships) {
      if (!station || station.isUnderConstruction) continue;
      const queue = station.productionQueue ?? [];
      const isShipyard =
        station.role === 'HQ' ||
        station.role === 'SY_LIGHT' ||
        station.role === 'SY_MEDIUM' ||
        station.role === 'SY_HEAVY';
      if (!isShipyard || queue.length === 0) {
        continue;
      }

      const activeItem = queue[0];
      if (!activeItem) continue;

      // Trait: Light Shipyard constructs at 3x build speed compared to HQ baseline slipways
      const isLightYard = station.role === 'SY_LIGHT';
      let speedMult = (isLightYard ? 3.0 : 1.0) * (this.shipyardSpeedMult || 1.0);
      const isCapitalShip =
        activeItem.unitRole === 'BATTLECRUISER' ||
        activeItem.unitRole === 'BATTLESHIP' ||
        activeItem.unitRole === 'DREADNOUGHT' ||
        activeItem.unitRole === 'CARRIER' ||
        activeItem.unitRole === 'SUPER_CARRIER' ||
        activeItem.unitRole === 'CITY_SHIP';
      if (isCapitalShip && this.capitalShipBuildTimeMult < 1.0) {
        speedMult /= this.capitalShipBuildTimeMult;
      }
      activeItem.buildTimeRemaining -= dt * speedMult;

      if (activeItem.buildTimeRemaining <= 0) {
        // Build complete! Remove from queue and spawn unit
        station.productionQueue.shift();
        this.spawnConstructedUnit(
          station,
          activeItem.unitRole,
          activeItem.commissionerFaction,
          activeItem.proxyFaction,
          activeItem.shipClass
        );
        const rallyMsg = station.rallyPoint
          ? ` and rallying to coordinates [${Math.round(station.rallyPoint.x)}, ${Math.round(station.rallyPoint.y)}]`
          : '';
        this.addLog(
          'LOGISTICS',
          `🚀 CONSTRUCTION COMPLETE: [${activeItem.name}] deployed from ${station.name}${rallyMsg}!`,
          'info'
        );
      }
    }
  }

  private spawnConstructedUnit(
    station: ShipEntity,
    unitRole: NavalUnitRole,
    commissionerFaction?: FactionId,
    proxyFaction?: FactionId,
    shipClass?: string
  ) {
    const spawnId = `unit-${unitRole.toLowerCase()}-${Date.now().toString(36)}`;
    const angle = (Math.random() - 0.5) * Math.PI * 0.5;
    const offsetDist = (station.dockingRadius || 65) + 40;
    const spawnPos: Vec2D = {
      x: station.pos.x + Math.cos(angle) * offsetDist,
      y: station.pos.y + Math.sin(angle) * offsetDist,
    };

    let newShip: ShipEntity;

    if (unitRole === 'FRIGATE') {
      newShip = {
        id: spawnId,
        name: `Frigate-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'FRIGATE',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 1800.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 1000.0,
        h2Fuel: 1000.0,
        fuelReserveRule: 0.40,
        missilesMax: 80,
        missiles: 80,
        missileTubes: 2,
        counterMissiles: 30,
        counterMissilesMax: 30,
        counterMissilesPerSalvo: 1,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 900.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.05,
        pdplaRange: 65.0,
        pdplaCooldown: 0.0,
        pdBeams: 1,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 600.0,
        shieldHp: 600.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 1000.0,
        hullHp: 1000.0,
        maxRepairableHull: 1000.0,
        crippleBarMax: 250.0,
        crippleBar: 250.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 30000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'DESTROYER') {
      newShip = {
        id: spawnId,
        name: `Destroyer-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'DESTROYER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 1500.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 1200.0,
        h2Fuel: 1200.0,
        fuelReserveRule: 0.40,
        missilesMax: 150,
        missiles: 150,
        missileTubes: 4,
        counterMissiles: 60,
        counterMissilesMax: 60,
        counterMissilesPerSalvo: 2,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 950.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.10,
        pdplaRange: 65.0,
        pdplaCooldown: 0.0,
        pdBeams: 2,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 1000.0,
        shieldHp: 1000.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 1800.0,
        hullHp: 1800.0,
        maxRepairableHull: 1800.0,
        crippleBarMax: 450.0,
        crippleBar: 450.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 45000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'LIGHT_CRUISER') {
      newShip = {
        id: spawnId,
        name: `LightCruiser-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'LIGHT_CRUISER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 1200.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 1600.0,
        h2Fuel: 1600.0,
        fuelReserveRule: 0.40,
        missilesMax: 220,
        missiles: 220,
        missileTubes: 5,
        counterMissiles: 80,
        counterMissilesMax: 80,
        counterMissilesPerSalvo: 3,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 1000.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.15,
        pdplaRange: 70.0,
        pdplaCooldown: 0.0,
        pdBeams: 2,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 1000.0,
        shieldHp: 1000.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 350.0,
        hullHp: 350.0,
        maxRepairableHull: 350.0,
        crippleBarMax: 280.0,
        crippleBar: 280.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 60000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'HEAVY_CRUISER' || unitRole === 'VANGUARD') {
      newShip = {
        id: spawnId,
        name: `HeavyCruiser-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'HEAVY_CRUISER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 950.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 2000.0,
        h2Fuel: 2000.0,
        fuelReserveRule: 0.40,
        missilesMax: 300,
        missiles: 300,
        missileTubes: 6,
        counterMissiles: 100,
        counterMissilesMax: 100,
        counterMissilesPerSalvo: 4,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 1050.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.20,
        pdplaRange: 75.0,
        pdplaCooldown: 0.0,
        pdBeams: 3,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 1400.0,
        shieldHp: 1400.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 500.0,
        hullHp: 500.0,
        maxRepairableHull: 500.0,
        crippleBarMax: 400.0,
        crippleBar: 400.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 80000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'BATTLECRUISER') {
      newShip = {
        id: spawnId,
        name: `Battlecruiser-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'BATTLECRUISER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 800.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 2400.0,
        h2Fuel: 2400.0,
        fuelReserveRule: 0.40,
        missilesMax: 400,
        missiles: 400,
        missileTubes: 8,
        counterMissiles: 120,
        counterMissilesMax: 120,
        counterMissilesPerSalvo: 4,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 1100.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.22,
        pdplaRange: 80.0,
        pdplaCooldown: 0.0,
        pdBeams: 3,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 1800.0,
        shieldHp: 1800.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 700.0,
        hullHp: 700.0,
        maxRepairableHull: 700.0,
        crippleBarMax: 550.0,
        crippleBar: 550.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 110000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'BATTLESHIP') {
      newShip = {
        id: spawnId,
        name: `Battleship-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'BATTLESHIP',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 650.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 3000.0,
        h2Fuel: 3000.0,
        fuelReserveRule: 0.40,
        missilesMax: 600,
        missiles: 600,
        missileTubes: 10,
        counterMissiles: 160,
        counterMissilesMax: 160,
        counterMissilesPerSalvo: 6,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 1200.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.25,
        pdplaRange: 85.0,
        pdplaCooldown: 0.0,
        pdBeams: 4,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 2400.0,
        shieldHp: 2400.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 1000.0,
        hullHp: 1000.0,
        maxRepairableHull: 1000.0,
        crippleBarMax: 800.0,
        crippleBar: 800.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 150000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'DREADNOUGHT') {
      newShip = {
        id: spawnId,
        name: `Dreadnought-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'DREADNOUGHT',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 500.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 4000.0,
        h2Fuel: 4000.0,
        fuelReserveRule: 0.40,
        missilesMax: 900,
        missiles: 900,
        missileTubes: 14,
        counterMissiles: 240,
        counterMissilesMax: 240,
        counterMissilesPerSalvo: 8,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 1300.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.30,
        pdplaRange: 95.0,
        pdplaCooldown: 0.0,
        pdBeams: 5,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 3500.0,
        shieldHp: 3500.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 1600.0,
        hullHp: 1600.0,
        maxRepairableHull: 1600.0,
        crippleBarMax: 1250.0,
        crippleBar: 1250.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 220000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'CARRIER' || (unitRole as string) === 'CV') {
      newShip = {
        id: spawnId,
        name: `Carrier-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'CARRIER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 550.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 4000.0,
        h2Fuel: 4000.0,
        fuelReserveRule: 0.35,
        missilesMax: 800,
        missiles: 800,
        missileTubes: 8,
        counterMissiles: 200,
        counterMissilesMax: 200,
        counterMissilesPerSalvo: 6,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 1500.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.32,
        pdplaRange: 90.0,
        pdplaCooldown: 0.0,
        pdBeams: 6,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 4500.0,
        shieldHp: 4500.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 1800.0,
        hullHp: 1800.0,
        maxRepairableHull: 1800.0,
        crippleBarMax: 1400.0,
        crippleBar: 1400.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 240000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'SUPER_CARRIER' || (unitRole as string) === 'CVF') {
      newShip = {
        id: spawnId,
        name: `ApexCarrier-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'SUPER_CARRIER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 500.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 5000.0,
        h2Fuel: 5000.0,
        fuelReserveRule: 0.35,
        missilesMax: 1200,
        missiles: 1200,
        missileTubes: 12,
        counterMissiles: 300,
        counterMissilesMax: 300,
        counterMissilesPerSalvo: 8,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 1700.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: false,
        ewarJammingRating: 0.35,
        pdplaRange: 100.0,
        pdplaCooldown: 0.0,
        pdBeams: 8,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 6000.0,
        shieldHp: 6000.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 2600.0,
        hullHp: 2600.0,
        maxRepairableHull: 2600.0,
        crippleBarMax: 2000.0,
        crippleBar: 2000.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 300000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'CITY_SHIP' || (unitRole as string) === 'CS') {
      newShip = {
        id: spawnId,
        name: `CityShip-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        factionId: (this as any).playerFaction || 'YESTIRI',
        role: 'CITY_SHIP',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 420.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 12000.0,
        h2Fuel: 12000.0,
        fuelReserveRule: 0.30,
        missilesMax: 3000,
        missiles: 3000,
        missileTubes: 24,
        counterMissiles: 800,
        counterMissilesMax: 800,
        counterMissilesPerSalvo: 16,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 2200.0,
        combatStance: 'DEFENSIVE',
        aggressiveDoctrine: 'KILL',
        autoFire: true,
        ewarJammingRating: 0.45,
        pdplaRange: 120.0,
        pdplaCooldown: 0.0,
        pdBeams: 12,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 12000.0,
        shieldHp: 12000.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 5000.0,
        hullHp: 5000.0,
        maxRepairableHull: 5000.0,
        crippleBarMax: 4000.0,
        crippleBar: 4000.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 450000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
        renderedLength: 190.0,
        radius: 75.0,
        selectionRadius: 80.0,
        isYestiriRing: true,
      };
    } else if (unitRole === 'COLLIER') {
      newShip = {
        id: spawnId,
        name: `Collier-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'COLLIER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 800.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 3000.0,
        h2Fuel: 3000.0,
        fuelReserveRule: 0.25,
        missilesMax: 2000,
        missiles: 2000,
        missileTubes: 0,
        counterMissiles: 40,
        counterMissilesMax: 40,
        counterMissilesPerSalvo: 2,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 0,
        combatStance: 'PASSIVE',
        autoFire: false,
        ewarJammingRating: 0.08,
        pdplaRange: 65.0,
        pdplaCooldown: 0.0,
        pdBeams: 2,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 1200.0,
        shieldHp: 1200.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 400.0,
        hullHp: 400.0,
        maxRepairableHull: 400.0,
        crippleBarMax: 300.0,
        crippleBar: 300.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 60000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'TANKER') {
      newShip = {
        id: spawnId,
        name: `Tanker-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'TANKER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 850.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 15000.0,
        h2Fuel: 15000.0,
        fuelReserveRule: 0.15,
        missilesMax: 0,
        missiles: 0,
        missileTubes: 0,
        counterMissiles: 40,
        counterMissilesMax: 40,
        counterMissilesPerSalvo: 2,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 0,
        combatStance: 'PASSIVE',
        autoFire: false,
        ewarJammingRating: 0.08,
        pdplaRange: 65.0,
        pdplaCooldown: 0.0,
        pdBeams: 2,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 1100.0,
        shieldHp: 1100.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 380.0,
        hullHp: 380.0,
        maxRepairableHull: 380.0,
        crippleBarMax: 280.0,
        crippleBar: 280.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 55000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'REPAIR' || (unitRole as string) === 'REP_SHIP') {
      newShip = {
        id: spawnId,
        name: `RepairShip-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'REPAIR',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 800.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 3500.0,
        h2Fuel: 3500.0,
        fuelReserveRule: 0.25,
        missilesMax: 0,
        missiles: 0,
        missileTubes: 0,
        counterMissiles: 40,
        counterMissilesMax: 40,
        counterMissilesPerSalvo: 2,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 0,
        combatStance: 'PASSIVE',
        autoFire: false,
        ewarJammingRating: 0.10,
        pdplaRange: 65.0,
        pdplaCooldown: 0.0,
        pdBeams: 2,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 1400.0,
        shieldHp: 1400.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 450.0,
        hullHp: 450.0,
        maxRepairableHull: 450.0,
        crippleBarMax: 350.0,
        crippleBar: 350.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 65000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else if (unitRole === 'SCRAP' || (unitRole as string) === 'SALVAGER') {
      newShip = {
        id: spawnId,
        name: `Salvager-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'SCRAP',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 900.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 3000.0,
        h2Fuel: 3000.0,
        fuelReserveRule: 0.25,
        missilesMax: 0,
        missiles: 0,
        missileTubes: 0,
        counterMissiles: 20,
        counterMissilesMax: 20,
        counterMissilesPerSalvo: 1,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 0,
        combatStance: 'PASSIVE',
        autoFire: false,
        ewarJammingRating: 0.05,
        pdplaRange: 60.0,
        pdplaCooldown: 0.0,
        pdBeams: 1,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: true,
        shieldHpMax: 900.0,
        shieldHp: 900.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 350.0,
        hullHp: 350.0,
        maxRepairableHull: 350.0,
        crippleBarMax: 250.0,
        crippleBar: 250.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 50000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
      };
    } else {
      // MINER
      newShip = {
        id: spawnId,
        name: `Prospector-${spawnId.slice(-3).toUpperCase()}`,
        faction: 'FRIENDLY',
        role: 'MINER',
        pos: spawnPos,
        velocity: { x: 0, y: 0 },
        heading: angle,
        maxSpeed: 900.0,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 2000.0,
        h2Fuel: 2000.0,
        fuelReserveRule: 0.40,
        missilesMax: 0,
        missiles: 0,
        counterMissiles: 0,
        counterMissileCooldown: 0.0,
        missileCooldown: 0.0,
        missileRange: 0.0,
        combatStance: 'PASSIVE',
        autoFire: false,
        ewarJammingRating: 0.02,
        pdplaRange: 0.0,
        pdplaCooldown: 0.0,
        pdBeams: 0,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0.0,
        pdplaBeamHit: false,
        shieldHpMax: 0.0,
        shieldHp: 0.0,
        shieldHeat: 0.0,
        shieldHeatMax: 100.0,
        shieldOverheated: false,
        shieldCooldownTimer: 0.0,
        hullMax: 80.0,
        hullHp: 80.0,
        maxRepairableHull: 80.0,
        crippleBarMax: 60.0,
        crippleBar: 60.0,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 25000.0,
        fmsActive: false,
        fmsMultiplier: 1.5,
        cargoOre: 0,
        cargoOreMax: 1000,
        minerStance: 'TIMID',
        minerState: 'STATE_SEEK',
      };
    }

    // Apply faction designation & proxy enhancements
    newShip.factionId = commissionerFaction || station.factionId || this.playerFaction;
    newShip.proxyFaction = proxyFaction;
    newShip.systemId = station.systemId;

    const effectiveFaction = proxyFaction || newShip.factionId;
    if (effectiveFaction === 'GARN') {
      newShip.hullMax = Math.round(newShip.hullMax * 1.65);
      newShip.hullHp = newShip.hullMax;
      newShip.shieldHpMax = Math.round(newShip.shieldHpMax * 1.35);
      newShip.shieldHp = newShip.shieldHpMax;
      newShip.maxSpeed = Math.round(newShip.maxSpeed * 0.65);
    } else if (effectiveFaction === 'ALDONAH') {
      newShip.hullMax = Math.round(newShip.hullMax * 1.30);
      newShip.hullHp = newShip.hullMax;
      newShip.shieldHpMax = Math.round(newShip.shieldHpMax * 0.90);
      newShip.shieldHp = newShip.shieldHpMax;
      newShip.armorMitigation = 0.30;
      newShip.maxSpeed = Math.round(newShip.maxSpeed * 0.85);
    } else if (effectiveFaction === 'YESTIRI') {
      newShip.shieldHpMax = Math.round(newShip.shieldHpMax * 1.40);
      newShip.shieldHp = newShip.shieldHpMax;
      newShip.maxSpeed = Math.round(newShip.maxSpeed * 0.90);
    } else if (effectiveFaction === 'LIAAL' && !proxyFaction) {
      newShip.hullMax = Math.round(newShip.hullMax * 0.30);
      newShip.hullHp = newShip.hullMax;
      newShip.shieldHpMax = Math.round(newShip.shieldHpMax * 0.30);
      newShip.shieldHp = newShip.shieldHpMax;
      newShip.maxSpeed = Math.round(newShip.maxSpeed * 1.05);
      if (newShip.cargoOreMax) newShip.cargoOreMax = Math.round(newShip.cargoOreMax * 2.0);
    } else if (effectiveFaction === 'KOVAK') {
      newShip.hullMax = Math.round(newShip.hullMax * 0.40);
      newShip.hullHp = newShip.hullMax;
      newShip.maxRepairableHull = newShip.hullMax;
      newShip.crippleBarMax = Math.round(newShip.hullMax * 0.25);
      newShip.crippleBar = newShip.crippleBarMax;
      newShip.shieldHpMax = Math.round(newShip.shieldHpMax * 0.40);
      newShip.shieldHp = newShip.shieldHpMax;
      newShip.maxSpeed = Math.round(newShip.maxSpeed * 1.10);
    }

    applyShipKinematics(newShip, unitRole);
    const sanitized = this.sanitizeShip(newShip);
    this.ships.push(sanitized);

    // If shipyard/HQ has a designated rally point, immediately dispatch the newly commissioned vessel
    if (station.rallyPoint) {
      this.setAutonomousSplineOrder(sanitized, station.rallyPoint);
    }
  }

  /**
   * Sets or clears the tactical rally point for a shipyard or HQ facility
   */
  public setRallyPoint(stationId: string, point: Vec2D | null): boolean {
    const station = this.ships.find((s) => s.id === stationId);
    if (!station) return false;
    station.rallyPoint = point ? { x: point.x, y: point.y } : null;
    if (point) {
      this.addLog(
        'LOGISTICS',
        `🚩 Rally Point designated for ${station.name} at [${Math.round(point.x)}, ${Math.round(point.y)}].`,
        'info'
      );
    } else {
      this.addLog('LOGISTICS', `Rally Point cleared for ${station.name}.`, 'info');
    }
    return true;
  }

  /**
   * Toggles proxy construction permissions on a shipyard slipway
   */
  public toggleShipyardProxyBuild(stationId: string): boolean {
    const station = this.ships.find((s) => s.id === stationId);
    if (!station) return false;
    station.allowProxyBuild = station.allowProxyBuild === undefined ? false : !station.allowProxyBuild;
    this.addLog(
      'LOGISTICS',
      `🔧 [${station.name}] Proxy Construction toggled ${station.allowProxyBuild ? 'ENABLED' : 'DISABLED'}.`,
      station.allowProxyBuild ? 'info' : 'warn'
    );
    return station.allowProxyBuild;
  }

  public queueBuildOrder(stationId: string, unitRole: NavalUnitRole): boolean {
    const station = this.ships.find((s) => s.id === stationId);
    if (!station) return false;

    const res = handleBuildShip(
      station,
      unitRole,
      () => this.getHQResources(),
      (m, o, n) => {
        const hq = this.getHQ();
        if (hq && hq.resources) {
          hq.resources.metallic -= m;
          hq.resources.organic -= o;
          if (n && hq.resources.neridium !== undefined) {
            hq.resources.neridium = Math.max(0, hq.resources.neridium - n);
          }
        }
      },
      (cat, msg, lvl) => this.addLog(cat, msg, lvl),
      this.researchManager.getResearchState()
    );

    return res.success;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    this.addLog('TACTICAL', `Simulation ${this.isPaused ? 'PAUSED' : 'RESUMED'}`, 'info');
    return this.isPaused;
  }

  public holdVector(shipId: string) {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship) return;
    ship.splineActive = false;
    ship.waypoints = [];
    ship.velocity = { x: 0, y: 0 };
    ship.isHoldingVector = true;
    if (isMinerVessel(ship)) {
      unclampMiner(ship);
    }
    this.addLog('TACTICAL', `${ship.name}: Retro-burn executed. Vector held (Full Stop).`, 'info');
  }

  public triggerShieldReboot(shipId: string): boolean {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship) return false;
    const success = triggerShieldReboot(ship);
    if (success) {
      this.addLog(
        'TACTICAL',
        `${ship.name}: COLD REBOOT initiated! Thermal shunts active. Full shield cycle in 4.0s.`,
        'warn'
      );
    }
    return success;
  }

  public initiateMicroJump(shipId: string, targetCoords: Vec2D): boolean {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship) return false;
    const isNovan = ship.factionId === 'NOVAN' || this.playerFaction === 'NOVAN' || (ship as any).isNovan;
    const res = initiateMicroJump(ship, targetCoords, isNovan);
    if (res.success) {
      this.addLog(
        'TACTICAL',
        `${ship.name}: Hyper-velocity micro-jump drive spooled. Target locked.`,
        'info'
      );
    } else if (res.reason) {
      this.addLog('NAV', `${ship.name}: Micro-jump aborted - ${res.reason}`, 'warn');
    }
    return res.success;
  }

  public forceMinerReturn(minerId: string) {
    const miner = this.ships.find((s) => s.id === minerId);
    if (!miner || !isMinerVessel(miner)) return;
    unclampMiner(miner);
    miner.minerState = 'STATE_RETURN';
    const hq = this.getHQ();
    if (hq) {
      launchMinerSpline(miner, getHQDockingTarget(miner, hq), miner.maxSpeed);
    }
    this.addLog('RESOURCE', `⛏️ ${miner.name}: Force return ordered. RTB to HQ for cargo offload.`, 'info');
  }

  public toggleTotMode(shipId: string): boolean {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship) return false;
    ship.totMode = !ship.totMode;
    this.addLog('TACTICAL', `${ship.name}: Time-On-Target (TOT) Mode ${ship.totMode ? 'ENGAGED' : 'DISENGAGED'}.`, 'info');
    return ship.totMode;
  }

  public cyclePdMode(shipId: string): 'AUTO' | 'CONSERVE' | 'FOCUS' {
    const ship = this.ships.find((s) => s.id === shipId);
    if (!ship) return 'AUTO';
    const modes: ('AUTO' | 'CONSERVE' | 'FOCUS')[] = ['AUTO', 'CONSERVE', 'FOCUS'];
    const currentIdx = modes.indexOf(ship.pdMode || 'AUTO');
    ship.pdMode = modes[(currentIdx + 1) % modes.length];
    this.addLog('PDPLA', `${ship.name}: Point-Defense Mode set to ${ship.pdMode}.`, 'info');
    return ship.pdMode;
  }

  public cancelBuildOrder(stationId: string, orderId: string): boolean {
    const station = this.ships.find((s) => s.id === stationId);
    if (!station || !station.productionQueue) return false;

    const idx = station.productionQueue.findIndex((item) => item.id === orderId);
    if (idx === -1) return false;

    const [item] = station.productionQueue.splice(idx, 1);
    const hq = this.getHQ();
    if (hq && hq.resources) {
      hq.resources.metallic = Math.min(hq.resources.maxMetallic, hq.resources.metallic + item.costMetallic);
      hq.resources.organic = Math.min(hq.resources.maxOrganic, hq.resources.organic + item.costOrganic);
    }

    this.addLog(
      'LOGISTICS',
      `Order [${item.name}] cancelled. 100% refund processed (${item.costMetallic} Met, ${item.costOrganic} Org returned to HQ).`,
      'info'
    );
    return true;
  }

  public deployShipyardFromBuilder(builderId: string, shipyardType: StructureType = 'SY_LIGHT'): boolean {
    const builder = this.ships.find((s) => s.id === builderId);
    if (!builder || builder.role !== 'BUILDER' || builder.hullState !== 'OPERATIONAL') return false;

    const isHeavy = shipyardType === 'SY_HEAVY';
    const isMedium = shipyardType === 'SY_MEDIUM';

    const costMet = isHeavy ? 45000 : isMedium ? 18000 : 6000;
    const costOrg = isHeavy ? 12000 : isMedium ? 4500 : 1500;
    const yardName = isHeavy ? 'Heavy Orbital Shipyard' : isMedium ? 'Medium Orbital Shipyard' : 'Light Orbital Shipyard';
    const yardRole: ShipRole = isHeavy ? 'SY_HEAVY' : isMedium ? 'SY_MEDIUM' : 'SY_LIGHT';

    const hasInBuilder = builder.materialsStored && builder.materialsStored.metallic >= costMet && builder.materialsStored.organic >= costOrg;
    const hq = this.getHQ();
    const hasInHQ = hq && hq.resources && hq.resources.metallic >= costMet && hq.resources.organic >= costOrg;

    if (!hasInBuilder && !hasInHQ) {
      this.addLog('LOGISTICS', `Construction Failed: Requires ${costMet.toLocaleString()} Metallic & ${costOrg.toLocaleString()} Organic to deploy ${yardName}.`, 'warn');
      return false;
    }

    const shipyardId = `shipyard-${Date.now().toString(36)}`;
    const angle = builder.heading || 0;
    const deployDist = 110.0;
    const shipyardPos: Vec2D = {
      x: builder.pos.x + Math.cos(angle) * deployDist,
      y: builder.pos.y + Math.sin(angle) * deployDist,
    };

    // Placement Validation: If builder is attempting to deploy in or near an asteroid cluster,
    // enforce the tight 10% operational margin gravity well boundary. Structures cannot be placed
    // hundreds of kilometers out into deep space around a cluster.
    if (this.solarSystem?.clusters) {
      for (const cluster of this.solarSystem.clusters) {
        const clusterWellR = cluster.wellRadius || getClusterGravityWellRadius(cluster);
        const distToCluster = Math.hypot(shipyardPos.x - cluster.center.x, shipyardPos.y - cluster.center.y);
        const builderDistToCluster = Math.hypot(builder.pos.x - cluster.center.x, builder.pos.y - cluster.center.y);
        if (builderDistToCluster <= clusterWellR * 1.5 || distToCluster <= clusterWellR * 1.5) {
          if (!this.isWithinGravityWellBounds(shipyardPos, cluster.center, cluster.radius, true, clusterWellR)) {
            this.addLog(
              'LOGISTICS',
              `Placement Rejected: ${yardName} position (${Math.round(distToCluster)}km) exceeds tight cluster gravity well boundary (${Math.round(clusterWellR)}km). Structures must moor strictly inside the 10% operational margin ring.`,
              'warn'
            );
            return false;
          }
        }
      }
    }

    if (hasInBuilder && builder.materialsStored) {
      builder.materialsStored.metallic -= costMet;
      builder.materialsStored.organic -= costOrg;
    } else if (hq && hq.resources) {
      hq.resources.metallic -= costMet;
      hq.resources.organic -= costOrg;
    }

    const newShipyard: ShipEntity = {
      id: shipyardId,
      name: `${yardName.split(' ')[0]}-Shipyard-${this.ships.filter((s) => s.role === yardRole).length + 1}`,
      faction: 'FRIENDLY',
      role: yardRole,
      structureType: shipyardType,
      pos: shipyardPos,
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 0,
      isStationary: true,
      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,
      h2FuelMax: 5000.0,
      h2Fuel: 5000.0,
      fuelReserveRule: 0.10,
      missilesMax: isHeavy ? 250 : isMedium ? 150 : 100,
      missiles: isHeavy ? 250 : isMedium ? 150 : 100,
      missileTubes: isHeavy ? 8 : isMedium ? 6 : 4,
      counterMissiles: isHeavy ? 120 : isMedium ? 80 : 60,
      counterMissilesMax: isHeavy ? 120 : isMedium ? 80 : 60,
      counterMissilesPerSalvo: isHeavy ? 4 : isMedium ? 3 : 2,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: isHeavy ? 1200.0 : isMedium ? 1000.0 : 850.0,
      combatStance: 'DEFENSIVE',
      autoFire: false,
      ewarJammingRating: isHeavy ? 0.25 : isMedium ? 0.20 : 0.15,
      pdplaRange: isHeavy ? 85.0 : isMedium ? 75.0 : 65.0,
      pdplaCooldown: 0.0,
      pdBeams: isHeavy ? 4 : isMedium ? 3 : 2,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,
      shieldHpMax: isHeavy ? 6000.0 : isMedium ? 4500.0 : 3000.0,
      shieldHp: isHeavy ? 6000.0 : isMedium ? 4500.0 : 3000.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,
      hullMax: isHeavy ? 5000.0 : isMedium ? 3500.0 : 2500.0,
      hullHp: isHeavy ? 5000.0 : isMedium ? 3500.0 : 2500.0,
      maxRepairableHull: isHeavy ? 5000.0 : isMedium ? 3500.0 : 2500.0,
      crippleBarMax: isHeavy ? 4000.0 : isMedium ? 2800.0 : 2000.0,
      crippleBar: isHeavy ? 4000.0 : isMedium ? 2800.0 : 2000.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,
      massRating: isHeavy ? 350000.0 : isMedium ? 220000.0 : 150000.0,
      fmsActive: false,
      fmsMultiplier: 1.0,
      dockingRadius: isHeavy ? 90.0 : isMedium ? 75.0 : 60.0,
      productionQueue: [],
      inGravityWell: builder.inGravityWell,
      gravityWellBody: builder.gravityWellBody,
      capturedReferenceFrame: builder.capturedReferenceFrame
        ? {
            ...builder.capturedReferenceFrame,
            localOffset: {
              x: shipyardPos.x - builder.capturedReferenceFrame.center.x,
              y: shipyardPos.y - builder.capturedReferenceFrame.center.y,
            },
          }
        : undefined,
      isMoored: builder.inGravityWell ? true : false,
    };

    this.ships.push(this.sanitizeShip(newShipyard));
    this.addLog('LOGISTICS', `🏗️ Forge-Builder constructed [${newShipyard.name}] Dedicated Orbital Shipyard!`, 'info');
    return true;
  }

  /**
   * Dispatches a construction order to the Builder ship for one of the 7 specialized static orbital structures.
   * Enforces planetary gravity well spatial restrictions (within 3x planetary radius perimeter).
   * Implements cyclic ferry routine for multi-trip logistics.
   */
  public orderBuilderConstruct(
    builderId: string,
    structureType: StructureType,
    targetPos: Vec2D
  ): boolean {
    const context = {
      ships: this.ships,
      hq: this.getHQ(),
      addLog: (type: CombatLogEntry['type'], message: string, severity?: CombatLogEntry['severity']) => {
        this.addLog(type, message, severity);
      },
      findHostPlanetForPosition: (pos: Vec2D) => this.findHostPlanetForPosition(pos),
    };

    return executeBuilderConstruct(
      builderId,
      structureType,
      targetPos,
      context,
      (type, pos, hostPlanet, bId) => this.sanitizeShip(createGhostStructureEntity(type, pos, hostPlanet, bId))
    );
  }

  public launchBuilderTransit(builder: ShipEntity, targetPos: Vec2D) {
    launchBuilderTransitSpline(builder, targetPos);
  }

  public launchBuilderTransitSpline(builder: ShipEntity, targetPos: Vec2D) {
    this.launchBuilderTransit(builder, targetPos);
  }

  public logCombatEvent(message: string, severity: 'ALERT' | 'INFO' | 'SUCCESS' | 'WARN' = 'INFO') {
    const sevMap: Record<string, 'info' | 'warn' | 'crit' | 'success'> = {
      ALERT: 'crit',
      WARN: 'warn',
      INFO: 'info',
      SUCCESS: 'success',
    };
    this.addLog('TACTICAL', message, sevMap[severity] || 'info');
  }

  public updateBuilderLogic(dt: number) {
    const context = {
      ships: this.ships,
      hq: this.getHQ(),
      addLog: (type: CombatLogEntry['type'], message: string, severity?: CombatLogEntry['severity']) => {
        this.addLog(type, message, severity);
      },
      findHostPlanetForPosition: (pos: Vec2D) => this.findHostPlanetForPosition(pos),
      onStructureCompleted: (structure: ShipEntity) => {
        this.onStructureCompleted(structure);
      },
    };

    updateBuilderLogistics(dt, context);

    // If there are queued scaffolds in the construction backlog, assign any available idle builder
    if (constructionManager.backlog.length > 0) {
      const idleBuilder = this.ships.find(
        (s) =>
          s.role === 'BUILDER' &&
          s.faction === 'FRIENDLY' &&
          s.hullState !== 'DESTROYED' &&
          (s.builderState === 'STATE_BUILDER_IDLE' || s.builderState === 'STATE_IDLE')
      );
      if (idleBuilder) {
        constructionManager.onBuilderFreed(idleBuilder, this);
      }
    }
  }

  public updateRepairBays(dt: number) {
    for (let i = 0; i < this.ships.length; i++) {
      const bay = this.ships[i];
      if (bay.role !== 'REPAIR_BAY' || bay.isUnderConstruction || bay.hullState !== 'OPERATIONAL') continue;

      // Area of Effect: Encompasses the entire host planetary gravity well
      const hostPlanet = this.findHostPlanetForPosition(bay.pos);
      const wellRadius = hostPlanet ? getPlanetaryGravityWellRadius(hostPlanet) : 800.0;
      const wellRadiusSq = wellRadius * wellRadius;
      const wellCenter = hostPlanet ? hostPlanet.pos : bay.pos;

      // Detection envelope: Missile range (850.0) around the Repair Bay
      const engagementRange = bay.missileRange || 850.0;
      const engagementRangeSq = engagementRange * engagementRange;
      let inCombat = false;

      for (let j = 0; j < this.ships.length; j++) {
        const h = this.ships[j];
        if (h.faction === 'HOSTILE' && h.hullState === 'OPERATIONAL') {
          const dx = h.pos.x - bay.pos.x;
          const dy = h.pos.y - bay.pos.y;
          if (dx * dx + dy * dy <= engagementRangeSq) {
            inCombat = true;
            break;
          }
        }
      }

      if (!inCombat) {
        for (let mIdx = 0; mIdx < this.missiles.length; mIdx++) {
          const m = this.missiles[mIdx];
          if (m.alive && m.faction === 'HOSTILE') {
            const dx = m.pos.x - bay.pos.x;
            const dy = m.pos.y - bay.pos.y;
            if (dx * dx + dy * dy <= engagementRangeSq) {
              inCombat = true;
              break;
            }
          }
        }
      }

      bay.repairMode = inCombat ? 'COMBAT' : 'PEACE';

      // Peace Mode: Restores 10 Hull HP/sec and 15 Shield Points/sec.
      // Combat Mode: Operates at degraded 30% effectiveness (3 Hull HP/sec, 4.5 Shield Points/sec).
      const hullRate = inCombat ? 3.0 : 10.0;
      const shieldRate = inCombat ? 4.5 : 15.0;

      // Operational Logic: Repairs 1 damaged friendly ship at a time (prioritizing lowest % HP)
      let bestTarget: ShipEntity | null = null;
      let lowestPctHp = 1.0;

      for (let j = 0; j < this.ships.length; j++) {
        const s = this.ships[j];
        if (s.faction !== 'FRIENDLY' || s.isUnderConstruction || s.hullState === 'DESTROYED') continue;
        const dxW = s.pos.x - wellCenter.x;
        const dyW = s.pos.y - wellCenter.y;
        if (dxW * dxW + dyW * dyW <= wellRadiusSq) {
          const isDamaged =
            s.hullHp < s.hullMax ||
            s.crippleBar < s.crippleBarMax ||
            (s.shieldHp < s.shieldHpMax && !s.shieldOverheated);
          if (isDamaged) {
            const currentTotal = s.hullHp + s.shieldHp;
            const maxTotal = s.hullMax + s.shieldHpMax;
            const pctHp = maxTotal > 0 ? currentTotal / maxTotal : 1.0;
            if (pctHp < lowestPctHp) {
              lowestPctHp = pctHp;
              bestTarget = s;
            }
          }
        }
      }

      if (bestTarget) {
        bay.activeRepairTargetId = bestTarget.id;

        if (bestTarget.hullHp < bestTarget.hullMax) {
          bestTarget.hullHp = Math.min(bestTarget.hullMax, bestTarget.hullHp + hullRate * dt);
        }
        if (bestTarget.crippleBar < bestTarget.crippleBarMax) {
          bestTarget.crippleBar = Math.min(bestTarget.crippleBarMax, bestTarget.crippleBar + hullRate * dt);
        }
        if (bestTarget.shieldHp < bestTarget.shieldHpMax && !bestTarget.shieldOverheated) {
          bestTarget.shieldHp = Math.min(bestTarget.shieldHpMax, bestTarget.shieldHp + shieldRate * dt);
        }
      } else {
        bay.activeRepairTargetId = null;
      }
    }
  }

  public updateOrbitalRefineries(dt: number) {
    const hq = this.getHQ();
    if (!hq || !hq.resources) return;

    // Industrial Processing: Converts raw ore at double HQ throughput (refines 3 Ore every 1.5 seconds = 2.0 Ore/sec)
    // Conversion Yield: Identical 52% Metallic and 48% Organic split (1 Ore = 0.52 Metallic + 0.48 Organic)
    const orePerSec = 3.0 / 1.5; // 2.0 ore/sec
    for (let i = 0; i < this.ships.length; i++) {
      const ref = this.ships[i];
      if (ref.role !== 'ORBITAL_REFINERY' || ref.isUnderConstruction || ref.hullState !== 'OPERATIONAL') continue;
      if (hq.resources.ore > 0) {
        const consumed = Math.min(hq.resources.ore, orePerSec * dt);
        hq.resources.ore -= consumed;
        hq.resources.metallic = Math.min(hq.resources.maxMetallic, hq.resources.metallic + consumed * 0.52);
        hq.resources.organic = Math.min(hq.resources.maxOrganic, hq.resources.organic + consumed * 0.48);
        ref.refineryAccumulator = (ref.refineryAccumulator || 0) + consumed;
        processRefineryOre(this, consumed);
      }
    }
  }

  public updateMissileBatteries(dt: number) {
    for (let i = 0; i < this.ships.length; i++) {
      const bat = this.ships[i];
      if (bat.role !== 'MISSILE_BATTERY' || bat.isUnderConstruction || bat.hullState !== 'OPERATIONAL') continue;

      if (bat.missileCooldown > 0) {
        bat.missileCooldown -= dt;
      }
      if (bat.missileCooldown <= 0 && bat.missiles > 0) {
        let nearestTarget: ShipEntity | null = null;
        let nearestDist = bat.missileRange || 975.0;

        for (let j = 0; j < this.ships.length; j++) {
          const h = this.ships[j];
          if (h.faction !== 'HOSTILE' || h.hullState !== 'OPERATIONAL') continue;
          const d = Math.hypot(h.pos.x - bat.pos.x, h.pos.y - bat.pos.y);
          if (d <= nearestDist) {
            nearestDist = d;
            nearestTarget = h;
          }
        }

        if (nearestTarget) {
          this.fireMissileSalvo(bat, nearestTarget);
          bat.missileCooldown = 6.0 * this.missileReloadMult;
        }
      }
    }
  }

  public fireMissileSalvo(shooter: ShipEntity, target: ShipEntity) {
    runCombatSalvo(shooter, target, this.getCombatState());
  }

  /**
   * Evaluates if a target location or structure placement falls within the valid R_well boundary
   * of a planetary body, lunar body, or asteroid cluster.
   * Enforces surface-offset calculation: R_well = R_body + (2,500 km * G)
   * And annular mooring band: dist > (R_body + 150 km) when checkSurfaceExclusion is true.
   * Asteroid clusters enforce a strict tight-margin envelope: R_cluster_well = R_cluster_envelope * 1.10
   */
  public isWithinGravityWellBounds(
    pos: Vec2D,
    bodyPos: Vec2D,
    bodyRadius: number,
    isCluster: boolean = false,
    clusterWellRadius?: number,
    gravityRating: number = 1.0,
    checkSurfaceExclusion: boolean = false
  ): boolean {
    const wellRadius = isCluster
      ? (clusterWellRadius || getClusterGravityWellRadius(bodyRadius))
      : (bodyRadius + 2500.0 * gravityRating);
    const dx = pos.x - bodyPos.x;
    const dy = pos.y - bodyPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > wellRadius * wellRadius) return false;
    if (checkSurfaceExclusion && !isCluster && bodyRadius > 0) {
      const excl = bodyRadius + 150.0;
      if (distSq <= excl * excl) return false;
    }
    return true;
  }

  public unclampMinerOrder(minerId: string) {
    const miner = this.ships.find((s) => s.id === minerId);
    if (!miner || !isMinerVessel(miner)) return;
    unclampMiner(miner);
    miner.minerState = 'STATE_SEEK';
    this.addLog('RESOURCE', `⛏️ ${miner.name}: Tether manually released. Disengaging from asteroid node.`, 'info');
  }

  public cycleMinerTarget(minerId: string) {
    const miner = this.ships.find((s) => s.id === minerId);
    if (!miner || !isMinerVessel(miner)) return;
    unclampMiner(miner);
    const hostiles = this.ships.filter((s) => s.faction === 'HOSTILE' && s.hullState === 'OPERATIONAL');
    const missileRange = this.config.missileRange || 1000.0;
    const next = findCandidateAsteroid(miner, this.asteroids, hostiles, missileRange);
    if (next.asteroid) {
      miner.minerTargetAsteroidId = next.asteroid.id;
      miner.minerState = 'STATE_SEEK';
      launchMinerSpline(miner, next.asteroid.pos, miner.maxSpeed);
      this.addLog('RESOURCE', `⛏️ ${miner.name}: Vector redirected -> Asteroid node [${next.asteroid.tier}]`, 'info');
    }
  }
}
