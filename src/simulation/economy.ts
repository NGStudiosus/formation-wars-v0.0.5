import { GameState } from '../state/gameState';
import { ResourceInventory, RefineryProgressState } from '../types';

export const ORE_PER_NERIDIUM = 5000;
export const DOUBLE_DROP_CHANCE = 0.01; // 1% chance for double drop

/**
 * Cumulative Refinery Extraction Engine
 * Processes raw Ore ticks and accumulates progress toward rare Neridium extraction.
 * Every 5,000 processed Ore yields 1 Neridium (with a 1% critical double drop yielding 2).
 */
export function processRefineryOre(
  state: GameState | any,
  oreProcessedThisTick: number
): void {
  if (oreProcessedThisTick <= 0) return;

  if (!state.refineryProgress) {
    state.refineryProgress = { oreAccumulator: 0, totalNeridiumExtracted: 0 };
  }

  if (!state.resources) {
    if (typeof state.getHQResources === 'function') {
      state.resources = state.getHQResources();
    } else {
      state.resources = { ore: 0, metallic: 0, organic: 0, neridium: 0 };
    }
  }

  state.refineryProgress.oreAccumulator += oreProcessedThisTick;

  while (state.refineryProgress.oreAccumulator >= ORE_PER_NERIDIUM) {
    state.refineryProgress.oreAccumulator -= ORE_PER_NERIDIUM;

    // Roll 1% chance for double yield
    const isDouble = Math.random() < DOUBLE_DROP_CHANCE;
    const yieldAmount = isDouble ? 2 : 1;

    state.resources.neridium = (state.resources.neridium || 0) + yieldAmount;
    state.refineryProgress.totalNeridiumExtracted += yieldAmount;

    // Keep HQ resources in sync if present
    if (typeof state.getHQ === 'function') {
      const hq = state.getHQ();
      if (hq && hq.resources) {
        hq.resources.neridium = state.resources.neridium;
      }
    }

    // Dispatch telemetry toast/event
    if (state.notifications) {
      state.notifications.push({
        id: `NERIDIUM_DROP_${Date.now()}_${Math.random()}`,
        type: 'STRATEGIC_RESOURCE',
        message: isDouble
          ? 'CRITICAL EXTRACTION: +2 NERIDIUM ISOLATED FROM ORE'
          : 'REFINERY ALERT: +1 NERIDIUM REFINED',
        timestamp: state.simulationTick,
      });
    }

    // Dispatch engine combat/tactical log if available
    if (typeof state.addLog === 'function') {
      state.addLog(
        'RESOURCE',
        isDouble
          ? 'CRITICAL EXTRACTION: +2 NERIDIUM ISOLATED FROM ORE'
          : 'REFINERY ALERT: +1 NERIDIUM REFINED',
        'success'
      );
    }
  }
}
