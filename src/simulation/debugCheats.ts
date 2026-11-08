import { GameState } from '../types';
import {
  TECH_CATALOG,
  RESEARCH_CATALOG,
  ResearchBranch,
  getFactionTechCatalog,
} from './researchCatalog';

export function addDebugResources(
  state: GameState | any,
  type: 'ore' | 'metallic' | 'organic' | 'neridium',
  amount: number
): void {
  if (!state) return;

  const hq = state.getHQ?.() || state.ships?.find((s: any) => s.role === 'HQ');
  if (hq) {
    if (!hq.resources) {
      hq.resources = {
        ore: 0,
        maxOre: 16000,
        metallic: 0,
        maxMetallic: 100000,
        organic: 0,
        maxOrganic: 100000,
        neridium: 0,
        maxNeridium: 5000,
      };
    }

    if (type === 'ore') {
      hq.resources.maxOre = Math.max(hq.resources.maxOre || 16000, (hq.resources.ore || 0) + amount);
      hq.resources.ore = (hq.resources.ore || 0) + amount;
    } else if (type === 'metallic') {
      hq.resources.maxMetallic = Math.max(hq.resources.maxMetallic || 100000, (hq.resources.metallic || 0) + amount);
      hq.resources.metallic = (hq.resources.metallic || 0) + amount;
    } else if (type === 'organic') {
      hq.resources.maxOrganic = Math.max(hq.resources.maxOrganic || 100000, (hq.resources.organic || 0) + amount);
      hq.resources.organic = (hq.resources.organic || 0) + amount;
    } else if (type === 'neridium') {
      hq.resources.maxNeridium = Math.max(hq.resources.maxNeridium || 5000, (hq.resources.neridium || 0) + amount);
      hq.resources.neridium = (hq.resources.neridium || 0) + amount;
    }
  }

  // If state has direct resources object
  if (state.resources && typeof state.resources === 'object') {
    if (type === 'ore') state.resources.ore = (state.resources.ore || 0) + amount;
    else if (type === 'metallic') state.resources.metallic = (state.resources.metallic || 0) + amount;
    else if (type === 'organic') state.resources.organic = (state.resources.organic || 0) + amount;
    else if (type === 'neridium') state.resources.neridium = (state.resources.neridium || 0) + amount;
  }

  // Push notification toast if available
  if (state.notifications && Array.isArray(state.notifications)) {
    state.notifications.push({
      id: `CHEAT_RES_${Date.now()}`,
      type: 'INFO',
      message: `CHEAT APPLIED: +${amount.toLocaleString()} ${type.toUpperCase()}`,
      timestamp: state.simulationTick || Date.now(),
    });
  }

  if (typeof state.addLog === 'function') {
    state.addLog('RESOURCE', `⚡ CHEAT APPLIED: +${amount.toLocaleString()} ${type.toUpperCase()}`, 'success');
  }
}

export function unlockResearch(
  state: GameState | any,
  discipline?: 'MILITARY' | 'CIVILIAN' | 'CIVIC' | 'EXPANSION' | 'HQ' | 'HEADQUARTERS' | 'ALL'
): void {
  if (!state) return;

  const discUpper = (discipline || 'ALL').toUpperCase();
  const targetBranch: ResearchBranch | 'ALL' =
    discUpper === 'HQ' || discUpper === 'HEADQUARTERS'
      ? 'HEADQUARTERS'
      : discUpper === 'CIVIC' || discUpper === 'CIVILIAN'
      ? 'CIVILIAN'
      : discUpper === 'MILITARY'
      ? 'MILITARY'
      : discUpper === 'EXPANSION'
      ? 'EXPANSION'
      : 'ALL';

  // Gather all nodes from global catalog and active faction catalog
  const playerFaction = state.playerFaction || 'NOVAN';
  const factionCatalog = getFactionTechCatalog(playerFaction);
  const catalogPool = [...TECH_CATALOG, ...factionCatalog];
  const seenIds = new Set<string>();

  const nodesToUnlock = catalogPool.filter((node) => {
    if (seenIds.has(node.id)) return false;
    seenIds.add(node.id);
    if (targetBranch === 'ALL') return true;
    return node.branch === targetBranch;
  });

  // Ensure research state structures exist
  if (!state.research) {
    state.research = {
      completedTechIds: [],
      activeTechId: null,
      progress: 0,
    };
  }
  if (!state.unlockedTechs || !(state.unlockedTechs instanceof Set)) {
    state.unlockedTechs = new Set<string>();
  }

  const rm = state.researchManager;
  if (rm) {
    if (!rm.completedNodes || !(rm.completedNodes instanceof Set)) {
      rm.completedNodes = new Set<string>();
    }
  }

  for (const node of nodesToUnlock) {
    // 1. Add to state.research.completedTechIds
    if (!state.research.completedTechIds.includes(node.id)) {
      state.research.completedTechIds.push(node.id);
    }

    // 2. Add to state.unlockedTechs (if Set)
    if (state.unlockedTechs instanceof Set) {
      state.unlockedTechs.add(node.id);
    }

    // 3. Add to rm.completedNodes (the authority for engine.unlockedTechs)
    if (rm?.completedNodes instanceof Set) {
      rm.completedNodes.add(node.id);
    }

    // 4. Special colonization tokens and HQ expansions
    if (node.id === 'exp-t1') {
      state.unlockedTechs?.add?.('EXP_TERRAN_COLONIZATION');
      rm?.completedNodes?.add?.('EXP_TERRAN_COLONIZATION');
    } else if (node.id === 'exp-t2-desert') {
      state.unlockedTechs?.add?.('EXP_DESERT_COLONIZATION');
      rm?.completedNodes?.add?.('EXP_DESERT_COLONIZATION');
    } else if (node.id === 'exp-t3-ice') {
      state.unlockedTechs?.add?.('EXP_ICE_COLONIZATION');
      rm?.completedNodes?.add?.('EXP_ICE_COLONIZATION');
    } else if (node.id === 'exp-t4-volcanic') {
      state.unlockedTechs?.add?.('EXP_VOLCANIC_COLONIZATION');
      rm?.completedNodes?.add?.('EXP_VOLCANIC_COLONIZATION');
    } else if (node.id === 'exp-t6-barren') {
      state.unlockedTechs?.add?.('EXP_BARREN_COLONIZATION');
      rm?.completedNodes?.add?.('EXP_BARREN_COLONIZATION');
    } else if (node.id === 'exp-t7') {
      state.unlockedTechs?.add?.('EXP_OCEANIC_COLONIZATION');
      rm?.completedNodes?.add?.('EXP_OCEANIC_COLONIZATION');
    } else if (node.id === 'exp-t5-gas') {
      state.unlockedTechs?.add?.('EXP_GAS_GIANT_HARVESTING');
      rm?.completedNodes?.add?.('EXP_GAS_GIANT_HARVESTING');
    } else if (node.id === 'HQ_BUILDINGS_EXPANSION') {
      const hq = (state.ships || []).find((s: any) => s.role === 'HQ');
      if (hq) {
        hq.maxMountedModules = 6;
      }
    }

    // 5. Update researchManager branch states
    const branchKey = node.branch as ResearchBranch;
    if (rm?.branches?.[branchKey]) {
      if (!rm.branches[branchKey].completedNodeIds.includes(node.id)) {
        rm.branches[branchKey].completedNodeIds.push(node.id);
      }
      if (rm.branches[branchKey].activeProject?.nodeId === node.id) {
        rm.branches[branchKey].activeProject = null;
      }
    }

    // 6. Clear queue item for this node if present
    if (rm?.queues?.[branchKey] && Array.isArray(rm.queues[branchKey])) {
      const idx = rm.queues[branchKey].indexOf(node.id);
      if (idx !== -1) {
        rm.queues[branchKey].splice(idx, 1);
      }
    }
  }

  // Clear active projects across branches if completed
  if (state.research.activeTechId && state.research.completedTechIds.includes(state.research.activeTechId)) {
    state.research.activeTechId = null;
    state.research.progress = 0;
  }

  if (state.activeResearch) {
    for (const key of Object.keys(state.activeResearch)) {
      const task = state.activeResearch[key];
      if (task && state.research.completedTechIds.includes(task.nodeId)) {
        state.activeResearch[key] = null;
      }
    }
  }

  // Recalculate engine scalars and stations
  if (typeof state.recalculateResearchScalars === 'function') {
    state.recalculateResearchScalars();
  }
  if (typeof state.updateResearchStationsCount === 'function') {
    state.updateResearchStationsCount();
  }

  if (typeof state.addLog === 'function') {
    state.addLog(
      'RESEARCH',
      `⚡ CHEAT UNLOCKED: [${discipline || 'ALL'}] Protocols (${nodesToUnlock.length} tech nodes synthesized instantly)!`,
      'success'
    );
  }
}

export function toggleFreeResearch(state: GameState | any): boolean {
  if (!state) return false;
  if (!state.debugState) {
    state.debugState = { revealAllMap: false, freeResearch: false };
  }
  state.debugState.freeResearch = !state.debugState.freeResearch;
  if ((state as any).state?.debugState) {
    (state as any).state.debugState.freeResearch = state.debugState.freeResearch;
  }
  if (typeof state.addLog === 'function') {
    state.addLog(
      'TACTICAL',
      `⚡ CHEAT: Free Research Mode is now ${state.debugState.freeResearch ? 'ACTIVE (Instant 0-Cost Synthesis)' : 'DEACTIVATED'}`,
      state.debugState.freeResearch ? 'success' : 'info'
    );
  }
  return state.debugState.freeResearch;
}

export function toggleRevealMap(state: GameState | any): boolean {
  if (!state) return false;
  if (!state.debugState) {
    state.debugState = { revealAllMap: false, freeResearch: false };
  }
  state.debugState.revealAllMap = !state.debugState.revealAllMap;
  if ((state as any).state?.debugState) {
    (state as any).state.debugState.revealAllMap = state.debugState.revealAllMap;
  }
  if (typeof state.addLog === 'function') {
    state.addLog(
      'TACTICAL',
      `⚡ CHEAT: Reveal All Map (FOW Sensor Bypass) is now ${state.debugState.revealAllMap ? 'ACTIVE (Full Radar Grid)' : 'DEACTIVATED'}`,
      state.debugState.revealAllMap ? 'success' : 'info'
    );
  }
  return state.debugState.revealAllMap;
}
