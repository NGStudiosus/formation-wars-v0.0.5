import {
  StarSystemDescriptor,
  PlanetEntity,
  AsteroidNode,
} from '../simulation/celestialTypes';

export interface ResearchTask {

  nodeId: string;
  tier: number;
  branch: string; // 'military' | 'civic' | 'expansion' | 'headquarters'
  currentTicks: number;
  totalTicks: number;
  costPaidM: number;
  costPaidO: number;
  isPaused?: boolean;
  pauseReason?: string;
  status?: string;
}

export interface ResearchTokens {
  military: number;
  civilian: number;
  expansion: number;
  headquarters: number;
}

export interface StructureEntity {
  id?: string;
  type?: string; // 'MRS' | 'CRO' | 'EXC' | etc.
  structureType?: string; // 'MILITARY_RESEARCH' | 'CIVIC_RESEARCH' | 'EXPANSION_CITADEL'
  name?: string;
  isAlive?: boolean;
  hullState?: string;
  constructionProgress?: number; // 0.0 to 1.0 (1.0 = fully built)
  isUnderConstruction?: boolean;
  [key: string]: any;
}

export interface Stockpiles {
  metallic: number;
  organic: number;
  maxMetallic?: number;
  maxOrganic?: number;
}

export type GameStatus = 'SETUP' | 'ACTIVE' | 'VICTORY' | 'DEFEAT';

export interface GravityWellEntity {
  id: string;
  systemId?: string;
  name: string;
  pos: { x: number; y: number };
  radius: number;
  wellRadius: number;
  type: 'PLANET' | 'MOON' | 'GAS_GIANT' | 'ASTEROID_CLUSTER' | 'STAR' | string;
  isMoorable?: boolean;
  [key: string]: any;
}

export interface GameState {
  gameStatus?: GameStatus;
  systems?: StarSystemDescriptor[];
  planets?: PlanetEntity[];
  asteroids?: AsteroidNode[];
  asteroidClusters?: any[];
  allClusters?: any[];
  simulationTick?: number;
  asteroidBlacklist?: Map<string, number>;
  gravityWells?: GravityWellEntity[];
  systemMap?: Map<string, StarSystemDescriptor>;
  planetMap?: Map<string, PlanetEntity>;
  asteroidMap?: Map<string, AsteroidNode>;
  structures?: StructureEntity[];
  ships?: any[];
  hqStockpiles?: Stockpiles;
  activeResearch?: {
    military?: ResearchTask | null;
    civic?: ResearchTask | null;
    civilian?: ResearchTask | null;
    expansion?: ResearchTask | null;
    headquarters?: ResearchTask | null;
    [branch: string]: ResearchTask | null | undefined;
  };
  unlockedTechs?: Set<string>;
  researchStations?: {
    military: number;
    civic: number;
    civilian?: number;
    expansion: number;
    headquarters?: number;
  };
  modifiers?: {
    radarMultiplier?: number;
    passiveMultiplier?: number;
    radarRangeMult?: number;
    passiveRangeMult?: number;
    sensorRangeMult?: number;
    missileRangeMult?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface GlobalGameState extends GameState {
  researchStations: {
    military: number;
    civic: number;
    civilian?: number;
    expansion: number;
    headquarters?: number;
  };
}

/**
 * Dual-Token Emission Calculator:
 * Every constructed, operational research laboratory generates exactly two distinct research tokens:
 * - Military Research Station (MRS): 1 Military Token + 1 HQ Token
 * - Civic Research Outpost (CRO): 1 Civilian Token + 1 HQ Token
 * - Expansion Citadel (EXC): 1 Expansion Token + 1 HQ Token
 * 
 * Labs are permanent physical structures and are NEVER consumed, decremented, or locked into a busy state.
 */
export function calculateResearchTokens(state: GameState | any): ResearchTokens {
  let military = 0;
  let civilian = 0;
  let expansion = 0;

  if (!state) {
    return { military: 0, civilian: 0, expansion: 0, headquarters: 0 };
  }

  const structures: any[] = Array.isArray(state.structures)
    ? state.structures
    : Array.isArray(state.ships)
    ? state.ships.filter((s: any) => s && (s.isStructure || s.structureType || s.type || s.role))
    : [];

  for (let i = 0; i < structures.length; i++) {
    const s = structures[i];
    if (!s) continue;

    // Check if structure is operational and alive
    const isAlive = s.isAlive !== undefined ? !!s.isAlive : s.hullState !== 'DESTROYED';
    const constructionProgress =
      s.constructionProgress !== undefined
        ? s.constructionProgress
        : s.isUnderConstruction
        ? 0
        : 1.0;

    if (!isAlive || constructionProgress < 1.0) continue;

    const type = s.type || s.structureType || s.role || s.code || '';
    if (type === 'MRS' || type === 'MILITARY_RESEARCH') military++;
    else if (type === 'CRO' || type === 'CIVIC_RESEARCH' || type === 'CIVILIAN_RESEARCH') civilian++;
    else if (type === 'EXC' || type === 'EXPANSION_CITADEL') expansion++;
  }

  // HQ tokens pool 1:1 from all constructed laboratories (dual emission)
  const headquarters = military + civilian + expansion;

  return { military, civilian, expansion, headquarters };
}

/**
 * Deterministic Read-Only Lab Counters (Backward Compatibility Wrapper)
 */
export function getOperationalLabCounts(state: GameState | any) {
  const tokens = calculateResearchTokens(state);
  return {
    military: tokens.military,
    civic: tokens.civilian,
    civilian: tokens.civilian,
    expansion: tokens.expansion,
    headquarters: tokens.headquarters,
    total: tokens.headquarters,
  };
}

export const state: GameState = {
  gameStatus: 'SETUP',
  systems: [],
  planets: [],
  asteroids: [],
  ships: [],
  systemMap: new Map<string, StarSystemDescriptor>(),
  planetMap: new Map<string, PlanetEntity>(),
  asteroidMap: new Map<string, AsteroidNode>(),
  structures: [],
  hqStockpiles: {
    metallic: 50000,
    organic: 20000,
    maxMetallic: 100000,
    maxOrganic: 100000,
  },
  activeResearch: {
    military: null,
    civic: null,
    expansion: null,
    headquarters: null,
  },
  unlockedTechs: new Set<string>(),
  researchStations: {
    military: 0,
    civic: 0,
    expansion: 0,
    headquarters: 0,
  },
};

/**
 * Updates the global multi-system galaxy state and builds fast indexed lookup maps.
 */
export function setGlobalGalaxyData(
  systems: StarSystemDescriptor[],
  planets: PlanetEntity[],
  asteroids: AsteroidNode[],
  gravityWells?: GravityWellEntity[]
): void {
  state.systems = systems;
  state.planets = planets;
  state.asteroids = asteroids;

  let wells: GravityWellEntity[] = [];
  if (gravityWells && gravityWells.length > 0) {
    wells = gravityWells;
  } else {
    for (const sys of systems) {
      if (sys.planets) {
        for (const p of sys.planets) {
          wells.push({
            id: p.id,
            systemId: sys.id,
            name: p.name,
            pos: p.position || p.pos || { x: 0, y: 0 },
            radius: p.radius,
            wellRadius: p.gravityWellRadius || p.wellRadius || 4000,
            type: p.type || 'PLANET',
            isMoorable: true,
          });
        }
      }
      if (sys.clusters) {
        for (const c of sys.clusters) {
          wells.push({
            id: c.id,
            systemId: sys.id,
            name: c.name || `${sys.name} Cluster ${c.id}`,
            pos: c.center,
            radius: c.radius,
            wellRadius: c.gravityWellRadius || c.wellRadius || 2500,
            type: 'ASTEROID_CLUSTER',
            isMoorable: c.isMoorable !== false,
          });
        }
      }
    }
  }
  state.gravityWells = wells;

  const sysMap = new Map<string, StarSystemDescriptor>();
  for (let i = 0; i < systems.length; i++) {
    sysMap.set(systems[i].id, systems[i]);
  }
  state.systemMap = sysMap;

  const pMap = new Map<string, PlanetEntity>();
  for (let i = 0; i < planets.length; i++) {
    pMap.set(planets[i].id, planets[i]);
  }
  state.planetMap = pMap;

  const aMap = new Map<string, AsteroidNode>();
  for (let i = 0; i < asteroids.length; i++) {
    aMap.set(asteroids[i].id, asteroids[i]);
  }
  state.asteroidMap = aMap;
}

/**
 * Fast lookup for star system by ID
 */
export function getStarSystemById(id: string): StarSystemDescriptor | undefined {
  if (state.systemMap) {
    return state.systemMap.get(id);
  }
  return state.systems?.find((s) => s.id === id);
}

/**
 * Fast lookup for star system enclosing a world position
 */
export function getStarSystemForPosition(
  pos: { x: number; y: number },
  customRadius?: number
): StarSystemDescriptor | null {
  if (!state.systems || state.systems.length === 0) return null;

  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    const dx = pos.x - sys.center.x;
    const dy = pos.y - sys.center.y;
    const r = customRadius ?? sys.arenaRadius ?? 160000;
    if (dx * dx + dy * dy <= r * r) {
      return sys;
    }
  }
  return null;
}

/**
 * Find nearest star system to any world coordinate
 */
export function getNearestStarSystem(pos: { x: number; y: number }): StarSystemDescriptor | null {
  if (!state.systems || state.systems.length === 0) return null;
  let nearest: StarSystemDescriptor | null = null;
  let minDistSq = Infinity;
  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    const dx = pos.x - sys.center.x;
    const dy = pos.y - sys.center.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      nearest = sys;
    }
  }
  return nearest;
}

/**
 * Fast lookup for planet by ID
 */
export function getPlanetById(id: string): PlanetEntity | undefined {
  if (state.planetMap) {
    return state.planetMap.get(id);
  }
  return state.planets?.find((p) => p.id === id);
}

/**
 * Fast lookup for asteroid by ID
 */
export function getAsteroidById(id: string): AsteroidNode | undefined {
  if (state.asteroidMap) {
    return state.asteroidMap.get(id);
  }
  return state.asteroids?.find((a) => a.id === id);
}

if (typeof window !== 'undefined') {
  (window as any).state = state;
}


