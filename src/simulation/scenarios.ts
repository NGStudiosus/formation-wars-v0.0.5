import { ShipEntity, JumpGateEntity, SimulationConfig, FactionId, GameSetupConfig, HqTypeId } from '../types';
import { FACTION_REGISTRY, ALL_FACTION_IDS } from './factions/factionRegistry';
import { K_SCALE } from './systemConstants';
import { applyShipKinematics } from './kinematics';
import { applyHQDefinitionToShip, getDefaultHQForFaction } from './hqRegistry';

export { spawnSystemHostiles, createHostileShip } from './pirates';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  ships: ShipEntity[];
  jumpGate: JumpGateEntity;
  defaultConfig?: Partial<SimulationConfig>;
}

export function createDefaultShips(playerFaction: FactionId = 'NOVAN', hqType?: HqTypeId): ShipEntity[] {
  const ships: ShipEntity[] = [
    {
      id: 'vanguard-01',
      name: 'Vanguard-01',
      faction: 'FRIENDLY',
      role: 'CRUISER',
      pos: { x: -220, y: 80 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 150.0,

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

      // Vanguard-01: 700 HP, 2000 Shield, 8 offensive missile tubes, 5 PD lasers, 6 counter-missiles per salvo
      // 500 offensive missile stowage, 180 defensive counter-missile stowage, 1.05x enemy range band (1102.5 km)
      missilesMax: 500,
      missiles: 500,
      missileTubes: 8,
      counterMissiles: 180,
      counterMissilesMax: 180,
      counterMissilesPerSalvo: 6,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1102.5,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.25,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 5,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 2000.0,
      shieldHp: 2000.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 700.0,
      hullHp: 700.0,
      maxRepairableHull: 700.0,
      crippleBarMax: 600.0,
      crippleBar: 600.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 48000.0,
      fmsActive: false,
      fmsMultiplier: 3.5,
    },
    {
      id: 'atlas-unrep',
      name: 'Atlas-UNREP',
      faction: 'FRIENDLY',
      role: 'COLLIER',
      pos: { x: -360, y: 150 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 110.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 2500.0,
      h2Fuel: 2500.0,
      fuelReserveRule: 0.40,

      missilesMax: 2000,
      missiles: 2000,
      counterMissiles: 120,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 850.0,

      combatStance: 'DEFENSIVE',
      autoFire: false,
      ewarJammingRating: 0.12,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 800.0,
      shieldHp: 800.0,
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

      massRating: 65000.0,
      fmsActive: false,
      fmsMultiplier: 2.0,
      supportRadius: 200.0,
    },
    // Fleet Tanker: Dual elongated cylindrical fuel pods strapped to a central spine
    {
      id: 'aegis-tanker',
      name: 'Aegis-Tanker',
      faction: 'FRIENDLY',
      role: 'TANKER',
      pos: { x: -440, y: 220 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 105.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 6000.0,
      h2Fuel: 6000.0,
      fuelReserveRule: 0.40,

      missilesMax: 50,
      missiles: 50,
      counterMissiles: 80,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 800.0,

      combatStance: 'DEFENSIVE',
      autoFire: false,
      ewarJammingRating: 0.10,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 1000.0,
      shieldHp: 1000.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 550.0,
      hullHp: 550.0,
      maxRepairableHull: 550.0,
      crippleBarMax: 420.0,
      crippleBar: 420.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 78000.0,
      fmsActive: false,
      fmsMultiplier: 2.0,
      supportRadius: 200.0,
    },
    // Fleet Repair Ship: Hull with extended forward crane/gantry arms and faint pulsing green aura
    {
      id: 'hephaestus-repair',
      name: 'Hephaestus-Repair',
      faction: 'FRIENDLY',
      role: 'REPAIR',
      pos: { x: -280, y: 240 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 115.0,

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

      missilesMax: 100,
      missiles: 100,
      counterMissiles: 60,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 850.0,

      combatStance: 'DEFENSIVE',
      autoFire: false,
      ewarJammingRating: 0.20,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 900.0,
      shieldHp: 900.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 480.0,
      hullHp: 480.0,
      maxRepairableHull: 480.0,
      crippleBarMax: 380.0,
      crippleBar: 380.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 54000.0,
      fmsActive: false,
      fmsMultiplier: 2.5,
      supportRadius: 200.0,
    },
    // Scrap Barge: Broad, hollow-centered catamaran hull with placeholder cargo bay markers
    {
      id: 'cyclops-barge',
      name: 'Cyclops-Barge',
      faction: 'FRIENDLY',
      role: 'SCRAP',
      pos: { x: -480, y: 80 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 95.0,

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

      missilesMax: 60,
      missiles: 60,
      counterMissiles: 50,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 800.0,

      combatStance: 'PASSIVE',
      autoFire: false,
      ewarJammingRating: 0.05,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 850.0,
      shieldHp: 850.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 520.0,
      hullHp: 520.0,
      maxRepairableHull: 520.0,
      crippleBarMax: 400.0,
      crippleBar: 400.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 62000.0,
      fmsActive: false,
      fmsMultiplier: 2.0,

      scrapStored: 0,
      scrapCapacity: 5000,
    },
    // Builder Unit: Placeholder for future construction with materials stored internal modifier
    {
      id: 'forge-builder',
      name: 'Forge-Builder',
      faction: 'FRIENDLY',
      role: 'BUILDER',
      pos: { x: -380, y: -60 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 100.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 3500.0,
      h2Fuel: 3500.0,
      fuelReserveRule: 0.40,

      missilesMax: 50,
      missiles: 50,
      counterMissiles: 40,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 800.0,

      combatStance: 'PASSIVE',
      autoFire: false,
      ewarJammingRating: 0.08,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 950.0,
      shieldHp: 950.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 560.0,
      hullHp: 560.0,
      maxRepairableHull: 560.0,
      crippleBarMax: 420.0,
      crippleBar: 420.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 70000.0,
      fmsActive: false,
      fmsMultiplier: 2.0,

      materialsStored: {
        metallic: 5000,
        metallicMax: 5000,
        organic: 5000,
        organicMax: 5000,
        ore: 0,
        oreMax: 5000,
      },
      cargoCapacity: {
        metallic: 5000,
        organic: 5000,
        ore: 5000,
      },
      cargoOre: 0,
      cargoOreMax: 5000,
      builderState: 'STATE_BUILDER_IDLE',
    },
    // Headquarters (HQ) Entity: Stationary circular station, infinite health, defeatOnDestruction, 20 missile mounts, refinery, light shipyard
    {
      id: 'hq-station',
      name: 'Station-01 (HQ)',
      faction: 'FRIENDLY',
      role: 'HQ',
      pos: { x: -540, y: 40 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 0,
      isStationary: true,
      defeatOnDestruction: true,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 10000.0,
      h2Fuel: 10000.0,
      fuelReserveRule: 0.10,

      // Defensive Armament: 20 missile mounts (uses existing missile fire logic)
      missilesMax: 2000,
      missiles: 2000,
      missileTubes: 20,
      counterMissiles: 300,
      counterMissilesMax: 300,
      counterMissilesPerSalvo: 8,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1050.0,

      combatStance: 'AGGRESSIVE',
      autoFire: true,
      ewarJammingRating: 0.30,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 6,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 10000.0,
      shieldHp: 10000.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 10000.0,
      hullHp: 10000.0,
      maxRepairableHull: 10000.0,
      crippleBarMax: 10000.0,
      crippleBar: 10000.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 250000.0,
      fmsActive: false,
      fmsMultiplier: 1.0,

      radius: 80.0, // R_HQ = 2.0 * R_HQ_base (doubled baseline physical dimension & collision footprint)
      dockingRadius: 150.0, // 2.0 * 75.0 (doubled docking perimeter)
      resources: {
        ore: 15000,
        maxOre: 50000,
        metallic: 50000,
        maxMetallic: 150000,
        organic: 50000,
        maxOrganic: 150000,
        neridium: 10,
        maxNeridium: 1000,
      },
      refineryRate: 30.0,
      refineryActive: true,
      productionQueue: [],
    },
    // Dedicated Shipyard Structure: Static orbital construction gantry
    {
      id: 'shipyard-alpha',
      name: 'Light-Shipyard-Alpha',
      faction: 'FRIENDLY',
      role: 'SY_LIGHT',
      structureType: 'SY_LIGHT',
      pos: { x: -440, y: -160 },
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

      missilesMax: 100,
      missiles: 100,
      missileTubes: 4,
      counterMissiles: 60,
      counterMissilesMax: 60,
      counterMissilesPerSalvo: 2,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 850.0,

      combatStance: 'DEFENSIVE',
      autoFire: false,
      ewarJammingRating: 0.15,

      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 2,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      shieldHpMax: 3000.0,
      shieldHp: 3000.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 2500.0,
      hullHp: 2500.0,
      maxRepairableHull: 2500.0,
      crippleBarMax: 2000.0,
      crippleBar: 2000.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 150000.0,
      fmsActive: false,
      fmsMultiplier: 1.0,

      dockingRadius: 60.0,
      productionQueue: [],
    },
    // Autonomous Miner Ship: Minimal defenses, 1,000 ore cargo hold, autonomous harvesting
    {
      id: 'prospector-01',
      name: 'Prospector-01',
      faction: 'FRIENDLY',
      role: 'MINER',
      pos: { x: -460, y: 60 },
      velocity: { x: 0, y: 0 },
      heading: 0,
      maxSpeed: 125.0,

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
      isMiningVessel: true,
    },
    // Cluster 1: Vanguard Intercept Group (Heavy Cruiser & Light Cruiser)
    {
      id: 'goliath-iv',
      name: 'Goliath-IV',
      faction: 'HOSTILE',
      role: 'HEAVY_CRUISER',
      pos: { x: 1450, y: -420 },
      velocity: { x: 0, y: 0 },
      heading: Math.PI,
      maxSpeed: 120.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 1500.0,
      h2Fuel: 1500.0,
      fuelReserveRule: 0.40,

      // Heavy Cruiser: 7 missile tubes, 140 missiles, 5 defense missiles per salvo
      missilesMax: 140,
      missiles: 140,
      missileTubes: 7,
      counterMissiles: 70,
      counterMissilesMax: 70,
      counterMissilesPerSalvo: 5,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1050.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.22,

      // Heavy Cruiser: 3 PD beams
      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 3,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Heavy Cruiser: 800 HP, 1300 shield
      shieldHpMax: 1300.0,
      shieldHp: 1300.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 800.0,
      hullHp: 800.0,
      maxRepairableHull: 800.0,
      crippleBarMax: 650.0,
      crippleBar: 650.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 95000.0,
      fmsActive: false,
      fmsMultiplier: 3.5,

      patrolAnchor: { x: 1450, y: -420 },
      patrolRadius: 280,
      patrolAngle: 0,
      patrolTimer: 0,
    },
    {
      id: 'scythe-02',
      name: 'Scythe-02',
      faction: 'HOSTILE',
      role: 'LIGHT_CRUISER',
      pos: { x: 1620, y: -300 },
      velocity: { x: 0, y: 0 },
      heading: Math.PI,
      maxSpeed: 145.0,

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

      // Light Cruiser: 5 missile tubes, 80 missiles, 4 defense missiles per salvo
      missilesMax: 80,
      missiles: 80,
      missileTubes: 5,
      counterMissiles: 50,
      counterMissilesMax: 50,
      counterMissilesPerSalvo: 4,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1050.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.18,

      // Light Cruiser: 2 PD beams
      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 2,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Light Cruiser: 400 HP, 900 shield
      shieldHpMax: 900.0,
      shieldHp: 900.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 400.0,
      hullHp: 400.0,
      maxRepairableHull: 400.0,
      crippleBarMax: 350.0,
      crippleBar: 350.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 52000.0,
      fmsActive: false,
      fmsMultiplier: 3.5,

      patrolAnchor: { x: 1550, y: -360 },
      patrolRadius: 260,
      patrolAngle: Math.PI * 0.5,
      patrolTimer: 1.5,
    },
    // Cluster 2: Recon Patrol (Destroyer & Frigate Escort)
    {
      id: 'phantom-01',
      name: 'Phantom-01',
      faction: 'HOSTILE',
      role: 'DESTROYER',
      pos: { x: 750, y: 1400 },
      velocity: { x: 0, y: 0 },
      heading: -Math.PI * 0.5,
      maxSpeed: 165.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 800.0,
      h2Fuel: 800.0,
      fuelReserveRule: 0.40,

      // Destroyer: 4 offensive missiles, 48 missiles, 2 counter missiles
      missilesMax: 48,
      missiles: 48,
      missileTubes: 4,
      counterMissiles: 30,
      counterMissilesMax: 30,
      counterMissilesPerSalvo: 2,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1050.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.16,

      // Destroyer: 1 beam defense
      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 1,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Destroyer: 250 HP, 700 shield
      shieldHpMax: 700.0,
      shieldHp: 700.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 250.0,
      hullHp: 250.0,
      maxRepairableHull: 250.0,
      crippleBarMax: 200.0,
      crippleBar: 200.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 35000.0,
      fmsActive: false,
      fmsMultiplier: 4.0,

      patrolAnchor: { x: 750, y: 1400 },
      patrolRadius: 360,
      patrolAngle: 0,
      patrolTimer: 0.5,
    },
    {
      id: 'talon-01',
      name: 'Talon-01',
      faction: 'HOSTILE',
      role: 'FRIGATE',
      pos: { x: 880, y: 1480 },
      velocity: { x: 0, y: 0 },
      heading: -Math.PI * 0.5,
      maxSpeed: 190.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 600.0,
      h2Fuel: 600.0,
      fuelReserveRule: 0.40,

      // Frigate: 2 offensive missiles, 24 missiles, 1 counter missile
      missilesMax: 24,
      missiles: 24,
      missileTubes: 2,
      counterMissiles: 15,
      counterMissilesMax: 15,
      counterMissilesPerSalvo: 1,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 950.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.12,

      // Frigate: 1 PD beam
      pdplaRange: 60.0,
      pdplaCooldown: 0.0,
      pdBeams: 1,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Frigate: 100 HP, 360 shield
      shieldHpMax: 360.0,
      shieldHp: 360.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 100.0,
      hullHp: 100.0,
      maxRepairableHull: 100.0,
      crippleBarMax: 90.0,
      crippleBar: 90.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 18000.0,
      fmsActive: false,
      fmsMultiplier: 4.5,

      patrolAnchor: { x: 750, y: 1400 },
      patrolRadius: 280,
      patrolAngle: Math.PI * 0.4,
      patrolTimer: 0.2,
    },
    // Cluster 3: Deep-Rim Flotilla (Heavy Cruiser, Light Cruiser, Destroyer & Frigate)
    {
      id: 'titan-prime',
      name: 'Titan-Prime',
      faction: 'HOSTILE',
      role: 'HEAVY_CRUISER',
      pos: { x: 2750, y: 220 },
      velocity: { x: 0, y: 0 },
      heading: Math.PI,
      maxSpeed: 120.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 1800.0,
      h2Fuel: 1800.0,
      fuelReserveRule: 0.40,

      // Heavy Cruiser: 7 missile tubes, 140 missiles, 5 defense missiles
      missilesMax: 140,
      missiles: 140,
      missileTubes: 7,
      counterMissiles: 70,
      counterMissilesMax: 70,
      counterMissilesPerSalvo: 5,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1050.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.25,

      // Heavy Cruiser: 3 PD beams
      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 3,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Heavy Cruiser: 800 HP, 1300 shield
      shieldHpMax: 1300.0,
      shieldHp: 1300.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 800.0,
      hullHp: 800.0,
      maxRepairableHull: 800.0,
      crippleBarMax: 650.0,
      crippleBar: 650.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 95000.0,
      fmsActive: false,
      fmsMultiplier: 3.5,

      patrolAnchor: { x: 2750, y: 220 },
      patrolRadius: 320,
      patrolAngle: 0,
      patrolTimer: 2.0,
    },
    {
      id: 'scythe-04',
      name: 'Scythe-04',
      faction: 'HOSTILE',
      role: 'LIGHT_CRUISER',
      pos: { x: 2950, y: 380 },
      velocity: { x: 0, y: 0 },
      heading: Math.PI,
      maxSpeed: 145.0,

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

      // Light Cruiser: 5 missile tubes, 80 missiles, 4 defense missiles
      missilesMax: 80,
      missiles: 80,
      missileTubes: 5,
      counterMissiles: 50,
      counterMissilesMax: 50,
      counterMissilesPerSalvo: 4,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1050.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.18,

      // Light Cruiser: 2 PD beams
      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 2,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Light Cruiser: 400 HP, 900 shield
      shieldHpMax: 900.0,
      shieldHp: 900.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 400.0,
      hullHp: 400.0,
      maxRepairableHull: 400.0,
      crippleBarMax: 350.0,
      crippleBar: 350.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 52000.0,
      fmsActive: false,
      fmsMultiplier: 3.5,

      patrolAnchor: { x: 2850, y: 300 },
      patrolRadius: 300,
      patrolAngle: Math.PI * 0.7,
      patrolTimer: 1.0,
    },
    {
      id: 'viper-01',
      name: 'Viper-01',
      faction: 'HOSTILE',
      role: 'DESTROYER',
      pos: { x: 2600, y: 80 },
      velocity: { x: 0, y: 0 },
      heading: Math.PI,
      maxSpeed: 165.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 800.0,
      h2Fuel: 800.0,
      fuelReserveRule: 0.40,

      // Destroyer: 4 offensive missiles, 48 missiles, 2 counter missiles
      missilesMax: 48,
      missiles: 48,
      missileTubes: 4,
      counterMissiles: 30,
      counterMissilesMax: 30,
      counterMissilesPerSalvo: 2,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 1050.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.15,

      // Destroyer: 1 beam defense
      pdplaRange: 65.0,
      pdplaCooldown: 0.0,
      pdBeams: 1,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Destroyer: 250 HP, 700 shield
      shieldHpMax: 700.0,
      shieldHp: 700.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 250.0,
      hullHp: 250.0,
      maxRepairableHull: 250.0,
      crippleBarMax: 200.0,
      crippleBar: 200.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 35000.0,
      fmsActive: false,
      fmsMultiplier: 4.0,

      patrolAnchor: { x: 2700, y: 150 },
      patrolRadius: 260,
      patrolAngle: Math.PI * 1.3,
      patrolTimer: 0.0,
    },
    {
      id: 'wasp-01',
      name: 'Wasp-01',
      faction: 'HOSTILE',
      role: 'FRIGATE',
      pos: { x: 2500, y: 280 },
      velocity: { x: 0, y: 0 },
      heading: Math.PI,
      maxSpeed: 190.0,

      splineActive: false,
      splineP0: { x: 0, y: 0 },
      splineM0: { x: 0, y: 0 },
      splineP1: { x: 0, y: 0 },
      splineM1: { x: 0, y: 0 },
      splineT: 0,
      splineDuration: 1.0,

      h2FuelMax: 600.0,
      h2Fuel: 600.0,
      fuelReserveRule: 0.40,

      // Frigate: 2 offensive missiles, 24 missiles, 1 counter missile
      missilesMax: 24,
      missiles: 24,
      missileTubes: 2,
      counterMissiles: 15,
      counterMissilesMax: 15,
      counterMissilesPerSalvo: 1,
      counterMissileCooldown: 0.0,
      missileCooldown: 0.0,
      missileRange: 950.0,

      combatStance: 'AGGRESSIVE',
      aggressiveDoctrine: 'KILL',
      autoFire: true,
      ewarJammingRating: 0.12,

      // Frigate: 1 PD beam
      pdplaRange: 60.0,
      pdplaCooldown: 0.0,
      pdBeams: 1,
      pdplaActiveBeamTarget: null,
      pdplaBeamTimer: 0.0,
      pdplaBeamHit: true,

      // Frigate: 100 HP, 360 shield
      shieldHpMax: 360.0,
      shieldHp: 360.0,
      shieldHeat: 0.0,
      shieldHeatMax: 100.0,
      shieldOverheated: false,
      shieldCooldownTimer: 0.0,

      hullMax: 100.0,
      hullHp: 100.0,
      maxRepairableHull: 100.0,
      crippleBarMax: 90.0,
      crippleBar: 90.0,
      hullState: 'OPERATIONAL',
      permanentFrameBuckled: false,

      massRating: 18000.0,
      fmsActive: false,
      fmsMultiplier: 4.5,

      patrolAnchor: { x: 2600, y: 240 },
      patrolRadius: 240,
      patrolAngle: Math.PI * 0.2,
      patrolTimer: 0.0,
    }
  ];

  for (const s of ships) {
    if (s.faction === 'FRIENDLY') {
      s.factionId = playerFaction;
      if (playerFaction === 'LIAAL') {
        // Cargo-heavy expansion doctrine bonus
        if (s.materialsStored) {
          s.materialsStored.metallicMax *= 2;
          s.materialsStored.organicMax *= 2;
          if (s.materialsStored.oreMax) s.materialsStored.oreMax *= 2;
        }
        if (s.scrapCapacity) s.scrapCapacity *= 2;
        if (s.cargoOreMax) s.cargoOreMax *= 2;
      }
    } else if (!s.factionId) {
      s.factionId = 'KOVAK';
    }
    if (s.role !== 'HQ' && !s.isStationary && s.role) {
      applyShipKinematics(s, s.role);
    } else if (s.maxSpeed) {
      s.maxSpeed *= K_SCALE;
    }
    if (s.missileRange) s.missileRange *= K_SCALE;
    if (s.pdplaRange) s.pdplaRange *= K_SCALE;
  }

  // If playing as Liaal, transform the starting lead warship to the Liaal Light Warship (20-missile salvo, 30% durability)
  if (playerFaction === 'LIAAL' && ships[0]) {
    const s = ships[0];
    s.name = 'Liaal-Salvo-01';
    s.role = 'LIAAL_LIGHT';
    s.missilesMax = 600;
    s.missiles = 600;
    s.missileTubes = 20;
    s.totalMissileSalvo = 20;
    s.bowMissileTubes = 8;
    s.broadsideMissileTubesPort = 6;
    s.broadsideMissileTubesStbd = 6;
    s.shieldHpMax = 300.0;
    s.shieldHp = 300.0;
    s.hullMax = 105.0;
    s.hullHp = 105.0;
    s.maxRepairableHull = 105.0;
    s.crippleBarMax = 90.0;
    s.crippleBar = 90.0;
  } else if (playerFaction === 'KOVAK') {
    for (const s of ships) {
      if (s.faction === 'FRIENDLY') {
        s.hullMax = Math.round(s.hullMax * 0.40);
        s.hullHp = Math.round(s.hullHp * 0.40);
        s.maxRepairableHull = s.hullMax;
        s.crippleBarMax = Math.round(s.hullMax * 0.25);
        s.crippleBar = s.crippleBarMax;
        s.shieldHpMax = Math.round(s.shieldHpMax * 0.40);
        s.shieldHp = s.shieldHpMax;
        if (s.pdplaRange) s.pdplaRange *= 0.90;
      }
    }
  }

  // Apply HQ specification dynamically (modifiers, launchers, ore drop off ranges, defenses)
  const hq = ships.find((s) => s.role === 'HQ');
  if (hq) {
    const effectiveHqType: HqTypeId = hqType || getDefaultHQForFaction(playerFaction);
    applyHQDefinitionToShip(hq, effectiveHqType, playerFaction);
  }

  return ships;
}

export function initializeCampaignScenario(config: GameSetupConfig): ScenarioDefinition {
  // Hard clamp: 2 to 8 systems
  const validatedSystemCount = Math.min(8, Math.max(2, config.systemCount || 2));

  // Ensure opponents array matches validatedSystemCount - 1
  const requiredOpponents = validatedSystemCount - 1;
  const opponents: FactionId[] = [];
  const fallbackPool = ALL_FACTION_IDS.filter(f => f !== config.playerFaction);

  for (let i = 0; i < requiredOpponents; i++) {
    if (config.systemOpponents && config.systemOpponents[i]) {
      opponents.push(config.systemOpponents[i]);
    } else {
      opponents.push(fallbackPool[i % fallbackPool.length]);
    }
  }

  const validatedConfig: GameSetupConfig = {
    systemCount: validatedSystemCount,
    playerFaction: config.playerFaction,
    systemOpponents: opponents,
    homeworldType: config.homeworldType,
    hqType: config.hqType,
  };

  return createCampaignScenario(validatedConfig);
}

export function createCampaignScenario(config: GameSetupConfig): ScenarioDefinition {
  const validatedSystemCount = Math.min(8, Math.max(2, config.systemCount || 2));
  const effectiveHqType = config.hqType || getDefaultHQForFaction(config.playerFaction);
  const ships = createDefaultShips(config.playerFaction, effectiveHqType);
  const facName = FACTION_REGISTRY[config.playerFaction]?.name || config.playerFaction;
  return {
    id: `campaign-${config.playerFaction.toLowerCase()}-${validatedSystemCount}`,
    name: `Campaign: ${facName} Sector Command (${validatedSystemCount} Systems)`,
    description: `Multi-system strategic campaign commanding ${facName} fleet across ${validatedSystemCount} systems.`,
    ships,
    jumpGate: {
      pos: { x: 350, y: -250 },
      radius: 38,
      shuttingDown: false,
      shutdownTimer: 0,
      maxShutdownTime: 300,
    }
  };
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'baseline',
    name: 'Milestone 1 Baseline Standoff',
    description: 'Vanguard-01 cruiser and Atlas-UNREP fleet tender confronting Goliath-IV battlecruiser and Scythe-02 escort at 1,050 km envelope.',
    ships: createDefaultShips(),
    jumpGate: {
      pos: { x: 350, y: -250 },
      radius: 38,
      shuttingDown: false,
      shutdownTimer: 0,
      maxShutdownTime: 300,
    }
  },
  {
    id: 'unrep-drill',
    name: 'UNREP Logistics & Underway Resupply',
    description: 'Vanguard-01 operating on critical reserves (12 missiles, 320 H2). Demonstrate Cold-Stop UNREP (100% rate) vs Drifting UNREP (33% rate) from Atlas.',
    ships: (() => {
      const s = createDefaultShips();
      s[0].missiles = 18;
      s[0].h2Fuel = 340; // Under 40% reserve!
      s[0].pos = { x: -300, y: 130 };
      return s;
    })(),
    jumpGate: {
      pos: { x: 350, y: -250 },
      radius: 38,
      shuttingDown: false,
      shutdownTimer: 0,
      maxShutdownTime: 300,
    }
  },
  {
    id: 'saturation-barrage',
    name: 'Heavy Salvo Saturation Test',
    description: 'High-density missile assault testing Layer 2 Counter-Missile grid and Layer 3 PDPLA thermal laser tracking limits under heavy threat volume.',
    ships: (() => {
      const s = createDefaultShips();
      s[0].missiles = 500;
      s[0].combatStance = 'AGGRESSIVE';
      s[0].autoFire = true;
      return s;
    })(),
    jumpGate: {
      pos: { x: 350, y: -250 },
      radius: 38,
      shuttingDown: false,
      shutdownTimer: 0,
      maxShutdownTime: 300,
    },
    defaultConfig: {
      hostileAutoFire: true,
    }
  },
  {
    id: 'beam-knife-fight',
    name: 'Sub-400k Mutual Suicide Beam Range',
    description: 'Cruisers closed to <= 400k km threshold. Thermal Deflector Shields saturate under continuous fire, triggering emergency cooling radiator dumps.',
    ships: (() => {
      const s = createDefaultShips();
      const vg = s.find((ship) => ship.id === 'vanguard-01');
      const goliath = s.find((ship) => ship.id === 'goliath-iv');
      const scythe = s.find((ship) => ship.id === 'scythe-02');
      if (vg) vg.pos = { x: -60, y: 0 };
      if (goliath) goliath.pos = { x: 80, y: 0 };
      if (scythe) scythe.pos = { x: 120, y: 60 };
      return s;
    })(),
    jumpGate: {
      pos: { x: 200, y: -250 },
      radius: 38,
      shuttingDown: false,
      shutdownTimer: 0,
      maxShutdownTime: 300,
    }
  },
  {
    id: 'support-armada',
    name: 'Fleet Logistics & Auxiliary Support Division',
    description: 'Inspect and command procedural support vessels: Atlas Collier (20 missiles/s), Aegis Tanker (25 H2/s), Hephaestus Repair Ship (10 Hull HP/s), Cyclops Scrap Barge (5k capacity), and Forge-Builder unit (5k metallic & 5k organic). 70% movement penalty applies when maneuvering.',
    ships: (() => {
      const s = createDefaultShips();
      const vg = s.find((ship) => ship.id === 'vanguard-01');
      if (vg) {
        vg.pos = { x: -300, y: 120 };
        vg.missiles = 250;
        vg.h2Fuel = 600;
        vg.hullHp = 300;
      }
      return s;
    })(),
    jumpGate: {
      pos: { x: 350, y: -250 },
      radius: 38,
      shuttingDown: false,
      shutdownTimer: 0,
      maxShutdownTime: 300,
    }
  }
];
