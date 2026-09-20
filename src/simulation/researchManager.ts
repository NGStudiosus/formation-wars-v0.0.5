import { StructureType } from '../types';
import {
  GameState,
  ResearchTask,
  StructureEntity,
  ResearchTokens,
  calculateResearchTokens,
  getOperationalLabCounts,
} from '../state/gameState';
import {
  ResearchBranch,
  TechNodeDefinition,
  TechNodeStatus,
  ActiveResearchProject,
  ResearchBranchState,
  ResearchStationsCountSnapshot,
  ResearchState,
  HULL_UNLOCK_REQUIREMENTS,
  TECH_CATALOG,
  RESEARCH_CATALOG,
  STATIC_BRANCH_GRIDS,
  isTechUnlocked,
  getTechCost,
  getNodePrereqs,
  getNode,
  isStructureUnlocked as isStructureUnlockedInCatalog,
} from './researchCatalog';

export type {
  ResearchBranch,
  TechNodeDefinition,
  TechNodeStatus,
  ActiveResearchProject,
  ResearchBranchState,
  ResearchStationsCountSnapshot,
  ResearchTokens,
  ResearchState,
  GameState,
  ResearchTask,
  StructureEntity,
};

export {
  calculateResearchTokens,
  getOperationalLabCounts,
  HULL_UNLOCK_REQUIREMENTS,
  TECH_CATALOG,
  RESEARCH_CATALOG,
  STATIC_BRANCH_GRIDS,
  isTechUnlocked,
  getTechCost,
  getNodePrereqs,
  getNode,
};

/**
 * Static lookup table mapping structures to their unlock research tech IDs
 */
export const STRUCTURE_UNLOCK_REQUIREMENTS: Partial<Record<StructureType, string>> = {
  PD_PLATFORM: 'mil-t1-defgrid',
  MISSILE_BATTERY: 'mil-t1-defgrid',
  ORBITAL_REFINERY: 'civ-t2',
  BASTION: 'exp-t6',
};

/**
 * Fast zero-allocation helper for shipyard hull availability checks
 */
export function isHullUnlocked(
  shipClass: string,
  completedNodes?: Set<string> | string[] | null
): boolean {
  if (!shipClass) return false;
  const norm = shipClass.toUpperCase().replace(/\s+/g, '_');
  // Frigate (FG) and Miner (MN) are foundational escort/utility hulls unlocked at baseline
  if (norm === 'FRIGATE' || norm === 'FG' || norm === 'MINER' || norm === 'MN') {
    return true;
  }
  const reqTechId = HULL_UNLOCK_REQUIREMENTS[norm];
  if (!reqTechId) return true;
  if (!completedNodes) return false;

  return completedNodes instanceof Set
    ? completedNodes.has(reqTechId)
    : Array.isArray(completedNodes) ? completedNodes.includes(reqTechId) : false;
}

/**
 * Fast zero-allocation helper for structure blueprint availability checks
 */
export function isStructureUnlocked(
  structureType: StructureType,
  completedNodes?: Set<string> | string[] | null
): boolean {
  if (!structureType) return false;
  const safeNodes = completedNodes ?? new Set<string>();
  const hasNode = (id: string) =>
    safeNodes instanceof Set
      ? safeNodes.has(id)
      : Array.isArray(safeNodes)
      ? safeNodes.includes(id)
      : false;

  if (structureType === 'PD_PLATFORM' || structureType === 'MISSILE_BATTERY') {
    return hasNode('mil-t1-defgrid') || hasNode('mil-t1');
  }
  if (structureType === 'SY_MEDIUM') {
    const nodeList = safeNodes instanceof Set ? Array.from(safeNodes) : safeNodes;
    for (const id of nodeList) {
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
    const nodeList = safeNodes instanceof Set ? Array.from(safeNodes) : safeNodes;
    for (const id of nodeList) {
      if (id.startsWith('mil-t')) {
        const tier = parseInt(id.slice(5), 10);
        if (!isNaN(tier) && tier >= 7) return true;
      }
    }
    return false;
  }
  const reqTechId = STRUCTURE_UNLOCK_REQUIREMENTS[structureType];
  if (!reqTechId) return true;

  return hasNode(reqTechId);
}

export class ResearchManager {
  public branches: Record<ResearchBranch, ResearchBranchState> = {
    MILITARY: { activeProject: null, completedNodeIds: [] },
    CIVILIAN: { activeProject: null, completedNodeIds: [] },
    EXPANSION: { activeProject: null, completedNodeIds: [] },
    HEADQUARTERS: { activeProject: null, completedNodeIds: [] },
  };

  /**
   * Flat set of completed tech node IDs for zero-allocation lookup
   */
  public completedNodes: Set<string> = new Set<string>();

  /**
   * Returns active project for branch
   */
  public getActiveProject(branch: ResearchBranch): ActiveResearchProject | null {
    if (!this.branches || !branch || !this.branches[branch]) return null;
    return this.branches[branch].activeProject ?? null;
  }

  /**
   * Returns snapshot of active research projects across all branches
   */
  public getActiveResearch(): {
    military: ActiveResearchProject | null;
    civic: ActiveResearchProject | null;
    expansion: ActiveResearchProject | null;
  } {
    return {
      military: this.getActiveProject('MILITARY'),
      civic: this.getActiveProject('CIVILIAN'),
      expansion: this.getActiveProject('EXPANSION'),
    };
  }

  /**
   * Returns definition by node ID using O(1) dictionary lookup
   */
  public getNode(nodeId: string): TechNodeDefinition | undefined {
    if (!nodeId) return undefined;
    return RESEARCH_CATALOG[nodeId];
  }

  /**
   * Checks if a warship hull is unlocked
   */
  public isHullUnlocked(shipClass: string): boolean {
    return isHullUnlocked(shipClass, this.completedNodes ?? new Set<string>());
  }

  /**
   * Checks if a structure blueprint is unlocked
   */
  public isStructureUnlocked(structureType: StructureType): boolean {
    return isStructureUnlocked(structureType, this.completedNodes ?? new Set<string>());
  }

  /**
   * Returns a set of all unlocked hull roles and codes
   */
  public getUnlockedHulls(): Set<string> {
    const set = new Set<string>(['FRIGATE', 'FG', 'MINER', 'MN']);
    const completed = this.completedNodes ?? new Set<string>();
    if (completed.has('mil-t1')) { set.add('DESTROYER'); set.add('DD'); }
    if (completed.has('mil-t2')) { set.add('LIGHT_CRUISER'); set.add('CL'); }
    if (completed.has('mil-t4')) { set.add('HEAVY_CRUISER'); set.add('CH'); }
    if (completed.has('mil-t6')) { set.add('BATTLECRUISER'); set.add('BC'); }
    if (completed.has('mil-t8')) { set.add('BATTLESHIP'); set.add('BB'); }
    if (completed.has('mil-t10')) { set.add('DREADNOUGHT'); set.add('DN'); }
    return set;
  }

  /**
   * Returns complete snapshot of research unlocks for shipyard and building controllers
   */
  public getResearchState(): ResearchState {
    const completed = this.completedNodes ?? new Set<string>();
    const baseStructures: StructureType[] = [
      'SY_LIGHT',
      'SY_MEDIUM',
      'SY_HEAVY',
      'REPAIR_BAY',
      'MILITARY_RESEARCH',
      'CIVIC_RESEARCH',
      'EXPANSION_CITADEL',
      'POST_SENSOR_SM',
      'POST_SENSOR_MD',
      'POST_SENSOR_LG',
    ];
    if (completed.has('mil-t1-defgrid') || completed.has('mil-t1')) {
      baseStructures.push('PD_PLATFORM', 'MISSILE_BATTERY');
    }
    if (completed.has('civ-t2')) {
      baseStructures.push('ORBITAL_REFINERY');
    }
    if (completed.has('exp-t6')) {
      baseStructures.push('BASTION');
    }

    return {
      completedNodes: new Set(completed),
      unlockedHulls: this.getUnlockedHulls(),
      unlockedStructures: new Set(baseStructures),
    };
  }

  /**
   * Helper to get stations count or token capability for a specific branch
   */
  public getStationCapacity(
    branch: ResearchBranch,
    stations?: ResearchStationsCountSnapshot | ResearchTokens | null
  ): number {
    if (!stations) return 0;
    const st = stations as any;
    switch (branch) {
      case 'MILITARY':
        return st.military ?? 0;
      case 'CIVILIAN':
        return st.civilian ?? st.civic ?? 0;
      case 'EXPANSION':
        return st.expansion ?? 0;
      case 'HEADQUARTERS':
        return st.headquarters ?? ((st.military ?? 0) + (st.civilian ?? st.civic ?? 0) + (st.expansion ?? 0));
      default:
        return 0;
    }
  }

  /**
   * Calculates status for any node in the catalog
   */
  public getNodeStatus(
    node: TechNodeDefinition,
    stations?: ResearchStationsCountSnapshot | ResearchTokens | null,
    hqResources?: { metallic: number; organic: number } | null
  ): {
    status: TechNodeStatus;
    reason?: string;
    progressRatio: number;
    remainingSeconds: number;
  } {
    if (!node) {
      return {
        status: 'LOCKED',
        progressRatio: 0,
        remainingSeconds: 10,
      };
    }

    const safeStations = stations ?? {
      military: 0,
      civic: 0,
      civilian: 0,
      expansion: 0,
      headquarters: 0,
    };
    const completedNodes = this.completedNodes ?? new Set<string>();
    const branchKey = node.branch || 'MILITARY';
    const isHQ = branchKey === 'HEADQUARTERS';
    const branchState = this.branches?.[branchKey] ?? {
      activeProject: null,
      completedNodeIds: [],
    };

    // 1. Check if completed
    const isCompleted =
      (completedNodes instanceof Set
        ? completedNodes.has(node.id)
        : Array.isArray(completedNodes)
        ? (completedNodes as any).includes(node.id)
        : false) ||
      (Array.isArray(branchState.completedNodeIds) &&
        branchState.completedNodeIds.includes(node.id));

    if (isCompleted) {
      return {
        status: 'COMPLETED',
        progressRatio: 1.0,
        remainingSeconds: 0,
      };
    }

    // 2. Check if currently active project
    if (branchState.activeProject && branchState.activeProject.nodeId === node.id) {
      const p = branchState.activeProject;
      const progressRatio = Math.min(
        Math.max((p.currentTicks ?? 0) / Math.max(p.totalTicks ?? 300, 1), 0),
        1
      );
      const remainingTicks = Math.max(0, (p.totalTicks ?? 300) - (p.currentTicks ?? 0));
      const remainingSeconds = remainingTicks / 30.0;
      const requiredCap = isHQ ? (node.tier ?? 1) * 3 : (node.tier ?? 1);

      return {
        status: p.status ?? 'RESEARCHING',
        reason:
          p.status === 'PAUSED_LACKING_CAPACITY'
            ? isHQ
              ? `PAUSED: HQ Research Tokens dropped below required ${requiredCap} tokens`
              : `PAUSED: Station capacity dropped below Tier ${node.tier ?? 1}`
            : undefined,
        progressRatio,
        remainingSeconds,
      };
    }

    // 3. Node Prerequisites Gate
    if (node.prereqs && node.prereqs.length > 0) {
      for (const reqId of node.prereqs) {
        const isReqCompleted =
          (completedNodes instanceof Set
            ? completedNodes.has(reqId)
            : Array.isArray(completedNodes)
            ? (completedNodes as any).includes(reqId)
            : false) ||
          (Array.isArray(branchState.completedNodeIds) &&
            branchState.completedNodeIds.includes(reqId));
        if (!isReqCompleted) {
          const prereqDef = this.getNode(reqId);
          return {
            status: 'LOCKED',
            reason: `REQUIRES: [${prereqDef?.name || reqId}]`,
            progressRatio: 0,
            remainingSeconds: (node.totalTicks ?? 300) / 30.0,
          };
        }
      }
    }

    // 4. Station Capacity & Token Gate:
    // For specialized branches: Tier N requires >= N branch tokens / stations
    // For Headquarters branch: Tier N requires >= N * 3 HQ research tokens (dual-emitted from all labs)
    const branchCapacity = this.getStationCapacity(branchKey, safeStations);
    const requiredCapacity = isHQ ? (node.tier ?? 1) * 3 : (node.tier ?? 1);
    if (branchCapacity < requiredCapacity) {
      const stationName = isHQ
        ? 'HQ Research Tokens'
        : branchKey === 'MILITARY'
        ? 'Military Research Station [MRS]'
        : branchKey === 'CIVILIAN'
        ? 'Civic Research Outpost [CRO]'
        : 'Expansion Citadel [EXC]';

      return {
        status: 'LOCKED',
        reason: isHQ
          ? `REQUIRES: ${requiredCapacity} HQ Research Tokens (${branchCapacity}/${requiredCapacity} generated across all labs)`
          : `REQUIRES: Tier ${requiredCapacity} ${stationName} (${branchCapacity}/${requiredCapacity} active)`,
        progressRatio: 0,
        remainingSeconds: (node.totalTicks ?? 300) / 30.0,
      };
    }

    // 5. If this branch is currently researching another project
    if (branchState.activeProject) {
      const activeDef = this.getNode(branchState.activeProject.nodeId);
      return {
        status: 'LOCKED',
        reason: `BRANCH BUSY: Researching [${activeDef?.name || 'Active Project'}]`,
        progressRatio: 0,
        remainingSeconds: (node.totalTicks ?? 300) / 30.0,
      };
    }

    // 6. Upfront Solvency Gate: Verify against HQ Stockpiles
    if (hqResources) {
      const costM = node.costMetallic ?? node.costM ?? 0;
      const costO = node.costOrganic ?? node.costO ?? 0;
      if (hqResources.metallic < costM || hqResources.organic < costO) {
        return {
          status: 'UNAVAILABLE',
          reason: 'UNAVAILABLE: INSUFFICIENT MATERIALS',
          progressRatio: 0,
          remainingSeconds: (node.totalTicks ?? 300) / 30.0,
        };
      }
    }

    // 7. Available to initiate
    return {
      status: 'AVAILABLE',
      progressRatio: 0,
      remainingSeconds: (node.totalTicks ?? 300) / 30.0,
    };
  }

  /**
   * Initiates research on a node if valid.
   * Atomically verifies and consumes 100% upfront cost from HQ stockpiles.
   */
  public initiateResearch(
    nodeId: string,
    stations?: ResearchStationsCountSnapshot | null,
    hqResources?: { metallic: number; organic: number } | null,
    deductResources?: (metallic: number, organic: number) => void,
    addLog?: (category: string, message: string, level?: 'info' | 'warn' | 'crit' | 'success') => void
  ): { success: boolean; error?: string } {
    const node = this.getNode(nodeId);
    if (!node) {
      return { success: false, error: 'Unknown technology node.' };
    }

    const safeStations: ResearchStationsCountSnapshot = stations ?? { military: 0, civic: 0, expansion: 0 };
    const safeHqResources = hqResources ?? { metallic: 0, organic: 0 };
    const safeLog = addLog ?? (() => {});
    const safeDeduct = deductResources ?? (() => {});

    const { status, reason } = this.getNodeStatus(node, safeStations);
    if (status === 'COMPLETED') {
      return { success: false, error: 'Protocol already fully synthesized.' };
    }
    if (status === 'RESEARCHING' || status === 'PAUSED_LACKING_CAPACITY') {
      return { success: false, error: 'Technology already in active synthesis matrix.' };
    }
    if (status === 'LOCKED') {
      return { success: false, error: reason || 'Technology locked.' };
    }

    const costM = node.costMetallic ?? node.costM ?? 0;
    const costO = node.costOrganic ?? node.costO ?? 0;

    // Upfront Solvency Verification Against HQ Reserves
    if (safeHqResources.metallic < costM || safeHqResources.organic < costO) {
      const deficitMet = Math.max(0, costM - safeHqResources.metallic);
      const deficitOrg = Math.max(0, costO - safeHqResources.organic);
      const err = `Insufficient HQ resources. Deficit: ${deficitMet > 0 ? `${deficitMet.toLocaleString()} Metallic ` : ''}${deficitOrg > 0 ? `${deficitOrg.toLocaleString()} Organic` : ''}`;
      safeLog('RESEARCH', `Research initialization failed for [${node.name}]: ${err}`, 'warn');
      return { success: false, error: err };
    }

    // Atomic Upfront 100% Resource Deduction
    if (deductResources) {
      safeDeduct(costM, costO);
    } else {
      safeHqResources.metallic -= costM;
      safeHqResources.organic -= costO;
    }

    // Set active project for this branch with committed cost values for full refundability
    if (this.branches && node.branch && this.branches[node.branch]) {
      this.branches[node.branch].activeProject = {
        nodeId: node.id,
        branch: node.branch,
        tier: node.tier,
        currentTicks: 0,
        totalTicks: node.totalTicks || 300,
        status: 'RESEARCHING',
        costPaidM: costM,
        costPaidO: costO,
        costM: costM,
        costO: costO,
      };
    }

    safeLog(
      'RESEARCH',
      `🔬 Initiated Tier ${node.tier} [${node.branch}] Research: [${node.name}] (${node.code}). Committed: -${costM.toLocaleString()} M / -${costO.toLocaleString()} O. ETA: ${(node.totalTicks / 30.0).toFixed(1)}s`,
      'success'
    );

    return { success: true };
  }

  /**
   * Cancels an in-progress research project and restores 100% of committed costs.
   */
  public cancelResearch(
    branchOrNodeId: string,
    refundResources?: (metallic: number, organic: number) => void,
    addLog?: (category: string, message: string, level?: 'info' | 'warn' | 'crit' | 'success') => void
  ): { success: boolean; error?: string } {
    let branch: ResearchBranch | null = null;
    const upper = (branchOrNodeId || '').toUpperCase();
    if (upper === 'MILITARY' || upper === 'CIVILIAN' || upper === 'EXPANSION' || upper === 'HEADQUARTERS') {
      branch = upper as ResearchBranch;
    } else if (upper === 'CIVIC') {
      branch = 'CIVILIAN';
    } else if (upper === 'HQ') {
      branch = 'HEADQUARTERS';
    } else {
      const node = this.getNode(branchOrNodeId);
      if (node) {
        branch = node.branch;
      }
    }

    if (!branch || !this.branches[branch]) {
      return { success: false, error: 'Unknown research branch.' };
    }

    const branchState = this.branches[branch];
    const project = branchState.activeProject;
    if (!project) {
      return { success: false, error: 'No active research in progress to cancel.' };
    }

    const node = this.getNode(project.nodeId);
    const costPaidM = project.costPaidM ?? project.costM ?? node?.costMetallic ?? 0;
    const costPaidO = project.costPaidO ?? project.costO ?? node?.costOrganic ?? 0;

    // Refund 100% of committed costPaidM and costPaidO back to HQ silo stockpiles
    if (refundResources) {
      refundResources(costPaidM, costPaidO);
    }

    // Clear active research slot and reset currentTicks to 0
    project.currentTicks = 0;
    branchState.activeProject = null;

    const safeLog = addLog ?? (() => {});
    safeLog(
      'RESEARCH',
      `↩️ Research project [${node?.name || project.nodeId}] CANCELLED. 100% refund restored (+${costPaidM.toLocaleString()} M, +${costPaidO.toLocaleString()} O).`,
      'info'
    );

    return { success: true };
  }

  /**
   * Deterministic 30Hz simulation loop step.
   * Increments research progress ticks by dt * 30.
   * Checks branch station capacity in real time.
   */
  public update(
    dt: number,
    stations: ResearchStationsCountSnapshot,
    addLog: (category: string, message: string, level?: 'info' | 'warn' | 'crit' | 'success') => void,
    onNodeCompleted?: (node: TechNodeDefinition) => void
  ): void {
    const branches: ResearchBranch[] = ['MILITARY', 'CIVILIAN', 'EXPANSION', 'HEADQUARTERS'];

    for (const b of branches) {
      const branchState = this.branches[b];
      const project = branchState.activeProject;
      if (!project) continue;

      const node = this.getNode(project.nodeId);
      if (!node) {
        branchState.activeProject = null;
        continue;
      }

      // Check current station capacity for this branch
      const capacity = this.getStationCapacity(b, stations);
      const isHQ = b === 'HEADQUARTERS';
      const requiredCapacity = isHQ ? project.tier * 3 : project.tier;

      if (capacity < requiredCapacity) {
        // Flag state as PAUSED_LACKING_CAPACITY. Accrued ticks are preserved!
        if (project.status !== 'PAUSED_LACKING_CAPACITY') {
          project.status = 'PAUSED_LACKING_CAPACITY';
          addLog(
            'RESEARCH',
            `⚠️ [${b}] Research paused for [${node.name}]: ${
              isHQ ? 'HQ Research Tokens' : 'Station capacity'
            } (${capacity}) dropped below required ${
              isHQ ? `${requiredCapacity} tokens` : `Tier ${project.tier}`
            }!`,
            'warn'
          );
        }
        // Do not advance ticks while paused!
        continue;
      } else {
        // Capacity restored / available
        if (project.status === 'PAUSED_LACKING_CAPACITY') {
          project.status = 'RESEARCHING';
          addLog(
            'RESEARCH',
            `⚡ [${b}] ${isHQ ? 'HQ token quota' : 'Station capacity'} restored (${capacity} >= ${requiredCapacity}). Resuming synthesis of [${node.name}].`,
            'info'
          );
        }
      }

      // Increment progress ticks deterministically
      const tickStep = dt * 30.0;
      project.currentTicks += tickStep;

      // Completion check
      if (project.currentTicks >= project.totalTicks) {
        project.currentTicks = project.totalTicks;
        const newSet = new Set(this.completedNodes);
        newSet.add(node.id);
        if (node.id === 'exp-t1') {
          newSet.add('EXP_TERRAN_COLONIZATION');
        } else if (node.id === 'exp-t2-desert') {
          newSet.add('EXP_DESERT_COLONIZATION');
        } else if (node.id === 'exp-t3-ice') {
          newSet.add('EXP_ICE_COLONIZATION');
        } else if (node.id === 'exp-t4-volcanic') {
          newSet.add('EXP_VOLCANIC_COLONIZATION');
        } else if (node.id === 'exp-t6-barren') {
          newSet.add('EXP_BARREN_COLONIZATION');
        } else if (node.id === 'exp-t7') {
          newSet.add('EXP_OCEANIC_COLONIZATION');
        } else if (node.id === 'exp-t5-gas') {
          newSet.add('EXP_GAS_GIANT_HARVESTING');
        }
        this.completedNodes = newSet;

        if (!branchState.completedNodeIds.includes(node.id)) {
          branchState.completedNodeIds = [...branchState.completedNodeIds, node.id];
        }
        branchState.activeProject = null;

        addLog(
          'RESEARCH',
          `✅ BREAKTHROUGH COMPLETE: [${node.name}] (${node.code}) synthesized! Active protocol permanent bonus enabled.`,
          'success'
        );

        onNodeCompleted?.(node);
      }
    }
  }

  /**
   * Resets all progress (e.g. on scenario reset)
   */
  public reset(): void {
    this.completedNodes.clear();
    this.branches = {
      MILITARY: { activeProject: null, completedNodeIds: [] },
      CIVILIAN: { activeProject: null, completedNodeIds: [] },
      EXPANSION: { activeProject: null, completedNodeIds: [] },
      HEADQUARTERS: { activeProject: null, completedNodeIds: [] },
    };
  }
}

export const researchManager = new ResearchManager();

/**
 * Accesses HQ stockpile resource inventory from simulation or game state
 */
export function getHQStockpiles(state: any): { metallic: number; organic: number; maxMetallic?: number; maxOrganic?: number } {
  if (!state) return { metallic: 0, organic: 0 };
  if (state.hqStock) return state.hqStock;
  if (state.hqResources) return state.hqResources;
  if (typeof state.getHQ === 'function') {
    const hq = state.getHQ();
    if (hq && hq.resources) return hq.resources;
  }
  if (typeof state.getHQResources === 'function') {
    return state.getHQResources();
  }
  if (Array.isArray(state.ships)) {
    const hq = state.ships.find((s: any) => s.role === 'HQ' && s.hullState !== 'DESTROYED');
    if (hq && hq.resources) return hq.resources;
  }
  if (state.resources) return state.resources;
  return state;
}

/**
 * 2. UNIFY UPFRONT ATOMIC COST DEDUCTION (ALL 4 BRANCHES)
 * Labs are read-only thresholds, never consumables.
 * Unifies Military, Civic, Expansion, and Headquarters research under upfront atomic transactions.
 */
export function queueResearchNode(nodeId: string, state: GameState | any): boolean {
  if (!state) return false;
  const node = RESEARCH_CATALOG[nodeId];
  if (!node) return false;

  const rawBranch = node.branch.toLowerCase();
  const branchKey = rawBranch === 'civilian' ? 'civic' : rawBranch; // 'military' | 'civic' | 'expansion' | 'headquarters'
  const labs = getOperationalLabCounts(state);

  const requiredLabs = (node as any).requiredLabs ?? node.tier;
  const costM = node.costM ?? node.costMetallic ?? 0;
  const costO = node.costO ?? node.costOrganic ?? 0;

  // 1. Validate Station Capacity Threshold
  if (branchKey === 'headquarters') {
    const requiredTotalLabs = node.tier * 3;
    if (labs.total < requiredTotalLabs) {
      console.warn(`[RESEARCH] HQ Tier ${node.tier} requires ${requiredTotalLabs} total labs. Found: ${labs.total}`);
      return false;
    }
  } else {
    const branchLabs = labs[branchKey as 'military' | 'civic' | 'expansion'] ?? 0;
    if (branchLabs < requiredLabs) {
      console.warn(`[RESEARCH] ${node.branch} Tier ${node.tier} requires ${requiredLabs} labs. Found: ${branchLabs}`);
      return false;
    }
  }

  // 2. Validate Stockpile Solvency
  let hqStock = state.hqStockpiles;
  if (!hqStock) {
    hqStock = getHQStockpiles(state);
    state.hqStockpiles = hqStock;
  }
  if (!hqStock || hqStock.metallic < costM || hqStock.organic < costO) {
    console.warn(`[RESEARCH] Insufficient materials for ${node.name}`);
    return false;
  }

  // 3. 100% Upfront Atomic Deduction
  hqStock.metallic -= costM;
  hqStock.organic -= costO;

  // 4. Register Active Research Task (Zero ongoing drain)
  if (!state.activeResearch) {
    state.activeResearch = {};
  }
  const totalTicks = node.researchTicks ?? node.totalTicks ?? 300;
  const task: ResearchTask = {
    nodeId: node.id,
    tier: node.tier,
    branch: branchKey,
    currentTicks: 0,
    totalTicks: totalTicks, // 10.0 seconds test duration
    costPaidM: costM,
    costPaidO: costO,
    status: 'RESEARCHING',
  };
  state.activeResearch[branchKey] = task;
  if (branchKey === 'civic') {
    state.activeResearch['civilian'] = task;
  }

  if (state.researchManager) {
    const upperBranch = node.branch as ResearchBranch;
    if (state.researchManager.branches && state.researchManager.branches[upperBranch]) {
      state.researchManager.branches[upperBranch].activeProject = {
        nodeId: node.id,
        branch: upperBranch,
        tier: node.tier,
        currentTicks: 0,
        totalTicks: totalTicks,
        status: 'RESEARCHING',
        costPaidM: costM,
        costPaidO: costO,
        costM: costM,
        costO: costO,
      };
    }
  }

  if (typeof state.addLog === 'function') {
    state.addLog(
      'RESEARCH',
      `🔬 Initiated Tier ${node.tier} [${node.branch}] Research: [${node.name}] (${node.code}). Paid upfront: -${costM.toLocaleString()} M, -${costO.toLocaleString()} O. ETA: ${(totalTicks / 30.0).toFixed(1)}s`,
      'success'
    );
  }

  return true;
}

/**
 * START_RESEARCH action handler:
 * Alias to queueResearchNode for backwards compatibility.
 */
export function initiateResearch(nodeId: string, state: any): boolean {
  return queueResearchNode(nodeId, state);
}

/**
 * Applies unlocked technology permanent bonuses, authorizations, and colonization tokens
 */
export function applyTechnologyUnlocks(nodeId: string, state: GameState | any): void {
  if (!state) return;

  const newUnlocked = new Set<string>(state.unlockedTechs ?? []);
  newUnlocked.add(nodeId);

  const addBonus = (token: string) => {
    newUnlocked.add(token);
  };
  if (nodeId === 'exp-t1') addBonus('EXP_TERRAN_COLONIZATION');
  else if (nodeId === 'exp-t2-desert') addBonus('EXP_DESERT_COLONIZATION');
  else if (nodeId === 'exp-t3-ice') addBonus('EXP_ICE_COLONIZATION');
  else if (nodeId === 'exp-t4-volcanic') addBonus('EXP_VOLCANIC_COLONIZATION');
  else if (nodeId === 'exp-t6-barren') addBonus('EXP_BARREN_COLONIZATION');
  else if (nodeId === 'exp-t7') addBonus('EXP_OCEANIC_COLONIZATION');
  else if (nodeId === 'exp-t5-gas') addBonus('EXP_GAS_GIANT_HARVESTING');

  state.unlockedTechs = newUnlocked;

  if (state.researchManager) {
    const rmSet = new Set<string>(state.researchManager.completedNodes ?? []);
    for (const item of newUnlocked) {
      rmSet.add(item);
    }
    state.researchManager.completedNodes = rmSet;
  }

  if (typeof state.recalculateResearchScalars === 'function') {
    state.recalculateResearchScalars();
  }

  const node = RESEARCH_CATALOG[nodeId];
  if (typeof state.addLog === 'function') {
    state.addLog(
      'RESEARCH',
      `✅ BREAKTHROUGH COMPLETE: [${node?.name || nodeId}] synthesized! Active protocol permanent bonus enabled.`,
      'success'
    );
  }
}

/**
 * 3. RESEARCH TICK EVALUATION & PAUSE CONDITIONS
 * During 30Hz simulation:
 * - Do not drain any resources from storage
 * - Advance currentTicks++
 * - Check lab operational status strictly to detect physical facility destruction
 */
export function updateResearchTick(state: GameState | any): void {
  if (!state || !state.activeResearch) return;
  const branches = ['military', 'civic', 'expansion', 'headquarters'] as const;
  const labs = getOperationalLabCounts(state);

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const task = state.activeResearch[branch] || (branch === 'civic' ? state.activeResearch['civilian'] : null);
    if (!task) continue;

    // Verify facilities have not been destroyed by enemy action
    let hasSufficientLabs = false;
    if (branch === 'headquarters') {
      hasSufficientLabs = labs.total >= task.tier * 3;
    } else {
      hasSufficientLabs = (labs[branch as 'military' | 'civic' | 'expansion'] ?? 0) >= task.tier;
    }

    if (!hasSufficientLabs) {
      // Pause progress if physical stations were destroyed below threshold
      task.isPaused = true;
      task.pauseReason = 'INSUFFICIENT_LAB_CAPACITY';
      task.status = 'PAUSED_LACKING_CAPACITY';
      continue;
    }

    task.isPaused = false;
    task.pauseReason = undefined;
    task.status = 'RESEARCHING';
    task.currentTicks++;

    // Complete Research Node
    if (task.currentTicks >= task.totalTicks) {
      if (!state.unlockedTechs) {
        state.unlockedTechs = new Set<string>();
      }
      if (state.unlockedTechs instanceof Set) {
        state.unlockedTechs.add(task.nodeId);
      }
      applyTechnologyUnlocks(task.nodeId, state);
      state.activeResearch[branch] = null;
      if (branch === 'civic') {
        state.activeResearch['civilian'] = null;
      }
    }
  }
}

export function updateResearchTicks(state: GameState | any, ticks: number = 1): void {
  for (let i = 0; i < ticks; i++) {
    updateResearchTick(state);
  }
}

/**
 * 4. CANCEL & REFUND PIPELINE:
 * If an active research task is canceled before currentTicks >= totalTicks:
 * - Refund 100% of task.costPaidM and task.costPaidO back into state.hqStockpiles.
 * - Delete state.activeResearch[branch].
 * - Confirm that lab counts remain completely unaffected throughout the cancel process.
 */
export function cancelResearchTask(branchOrNodeId: string, state: GameState | any): boolean {
  if (!state) return false;

  let branchKey = (branchOrNodeId || '').toLowerCase();
  let upperBranch: ResearchBranch = 'MILITARY';

  if (branchKey === 'military') {
    upperBranch = 'MILITARY';
  } else if (branchKey === 'civilian' || branchKey === 'civic') {
    branchKey = 'civic';
    upperBranch = 'CIVILIAN';
  } else if (branchKey === 'expansion') {
    upperBranch = 'EXPANSION';
  } else if (branchKey === 'headquarters' || branchKey === 'hq') {
    branchKey = 'headquarters';
    upperBranch = 'HEADQUARTERS';
  } else {
    const node = RESEARCH_CATALOG[branchOrNodeId];
    if (node) {
      const raw = node.branch.toLowerCase();
      branchKey = raw === 'civilian' ? 'civic' : raw;
      upperBranch = node.branch;
    }
  }

  let task: any = state.activeResearch
    ? (state.activeResearch[branchKey] || (branchKey === 'civic' ? state.activeResearch['civilian'] : null))
    : null;

  if (!task && state.researchManager) {
    const proj = state.researchManager.getActiveProject(upperBranch);
    if (proj) {
      task = {
        nodeId: proj.nodeId,
        tier: proj.tier,
        branch: branchKey,
        currentTicks: proj.currentTicks,
        totalTicks: proj.totalTicks,
        costPaidM: proj.costPaidM ?? proj.costM ?? 0,
        costPaidO: proj.costPaidO ?? proj.costO ?? 0,
      };
    }
  }

  if (!task) return false;

  const costM = task.costPaidM ?? task.costM ?? 0;
  const costO = task.costPaidO ?? task.costO ?? 0;

  // 1. Refund 100% of committed costPaidM and costPaidO back into state.hqStockpiles
  let hqStock = state.hqStockpiles;
  if (!hqStock) {
    hqStock = getHQStockpiles(state);
    state.hqStockpiles = hqStock;
  }
  if (hqStock) {
    if (typeof hqStock.metallic === 'number') {
      hqStock.metallic += costM;
      if (typeof hqStock.maxMetallic === 'number' && hqStock.metallic > hqStock.maxMetallic) {
        hqStock.metallic = hqStock.maxMetallic;
      }
    }
    if (typeof hqStock.organic === 'number') {
      hqStock.organic += costO;
      if (typeof hqStock.maxOrganic === 'number' && hqStock.organic > hqStock.maxOrganic) {
        hqStock.organic = hqStock.maxOrganic;
      }
    }
  }

  // 2. Delete state.activeResearch[branch]
  if (state.activeResearch) {
    delete state.activeResearch[branchKey];
    if (branchKey === 'civic') {
      delete state.activeResearch['civilian'];
    }
  }

  if (state.researchManager?.branches?.[upperBranch]) {
    state.researchManager.branches[upperBranch].activeProject = null;
  }

  if (typeof state.addLog === 'function') {
    state.addLog(
      'RESEARCH',
      `↩️ Research [${task.nodeId}] cancelled. 100% refund restored (+${costM.toLocaleString()} Metallic, +${costO.toLocaleString()} Organic).`,
      'info'
    );
  }

  return true;
}

export function cancelResearch(branchOrNodeId: string, state: any): boolean {
  return cancelResearchTask(branchOrNodeId, state);
}
