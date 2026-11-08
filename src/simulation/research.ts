import { GameState } from '../types';
import {
  TECH_CATALOG,
  RESEARCH_CATALOG,
  TechNodeDefinition,
  ResearchBranch,
} from './researchCatalog';
import {
  applyTechnologyUnlocks,
  queueResearchNode,
} from './researchManager';

export interface ResearchNodeWithCategory extends TechNodeDefinition {
  category: 'MILITARY' | 'CIVILIAN' | 'EXPANSION' | 'HQ';
}

export const ALL_RESEARCH_NODES: ResearchNodeWithCategory[] = TECH_CATALOG.map((node) => ({
  ...node,
  category: (node.branch === 'HEADQUARTERS' ? 'HQ' : node.branch) as 'MILITARY' | 'CIVILIAN' | 'EXPANSION' | 'HQ',
}));

/**
 * Initiates research on a node. If free research cheat is active, completes instantly.
 */
export function startResearchNode(state: GameState | any, techId: string): void {
  if (!state) return;
  if (!state.research) {
    state.research = {
      completedTechIds: [],
      activeTechId: null,
      progress: 0,
    };
  }

  if (state.debugState?.freeResearch) {
    // Instantly mark completed without deducting resource costs
    if (!state.research.completedTechIds.includes(techId)) {
      state.research.completedTechIds.push(techId);
    }
    state.research.activeTechId = null;
    state.research.progress = 0;

    // Apply to unlockedTechs and researchManager
    applyTechnologyUnlocks(techId, state);
    const node = RESEARCH_CATALOG[techId];
    if (node && state.researchManager?.branches) {
      const upperBranch = node.branch as ResearchBranch;
      if (state.researchManager.branches[upperBranch]) {
        state.researchManager.branches[upperBranch].activeProject = null;
        if (!state.researchManager.branches[upperBranch].completedNodeIds.includes(techId)) {
          state.researchManager.branches[upperBranch].completedNodeIds.push(techId);
        }
      }
    }
    return;
  }

  queueResearchNode(techId, state);
}
