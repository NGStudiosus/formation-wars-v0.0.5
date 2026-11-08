import { GameState } from '../state/gameState';
import { getShipNeridiumCost } from './shipPrototypes';
import {
  SHIP_CONFIGS,
  validateShipBuild,
  canQueueShip,
  handleBuildShip,
  queueProduction,
  type ShipyardBuildSpec,
  type BuildValidationResult,
  type ResearchState,
} from './shipyardController';

export {
  SHIP_CONFIGS,
  validateShipBuild,
  canQueueShip,
  handleBuildShip,
  queueProduction,
  type ShipyardBuildSpec,
  type BuildValidationResult,
  type ResearchState,
};

/**
 * Validates whether an order can be queued under state resource constraints.
 * Strictly enforces that ONLY ships consume Neridium.
 * Stations, platforms, ammo, repairs, and research nodes strictly require 0 Neridium.
 */
export function canQueueOrder(
  state: GameState | any,
  prototype: any
): { allowed: boolean; reason?: string } {
  if (!state || !prototype) return { allowed: false, reason: 'INVALID STATE OR PROTOTYPE' };

  // Faction Restriction Guard (e.g., Novan Fleet Carrier)
  const isNovanExclusive =
    prototype.id === 'NOVAN_FLEET_CARRIER' ||
    prototype.classification === 'FLEET_CARRIER' ||
    prototype.factionRestriction === 'NOVAN';

  if (isNovanExclusive) {
    const ownerFaction =
      prototype.ownerFaction ||
      state.playerFaction ||
      state.factionId ||
      'NOVAN';
    if (ownerFaction !== 'NOVAN') {
      return {
        allowed: false,
        reason: 'UNSUPPORTED SHIP CHASSIS FOR CURRENT EMPIRE',
      };
    }
  }

  if (!state.resources) {
    state.resources = {
      ore: state.hqStockpiles?.ore ?? 0,
      metallic: state.hqStockpiles?.metallic ?? 0,
      organic: state.hqStockpiles?.organic ?? 0,
      neridium: 10,
    };
  }

  const cost = prototype.cost || {
    ore: prototype.costOre || 0,
    metallic: prototype.costM || prototype.metallic || 0,
    organic: prototype.costO || prototype.organic || 0,
  };

  const neridiumCost =
    prototype.neridiumCost !== undefined
      ? prototype.neridiumCost
      : getShipNeridiumCost(prototype.role || prototype.code || prototype.name || prototype.id);

  if ((state.resources.ore || 0) < (cost.ore || 0)) {
    return { allowed: false, reason: 'INSUFFICIENT ORE' };
  }
  if ((state.resources.metallic || 0) < (cost.metallic || 0)) {
    return { allowed: false, reason: 'INSUFFICIENT METALLIC' };
  }
  if ((state.resources.organic || 0) < (cost.organic || 0)) {
    return { allowed: false, reason: 'INSUFFICIENT ORGANIC' };
  }

  // Strict ship-only check: only ships consume Neridium
  const isShipEntity =
    prototype.category === 'SHIP' ||
    prototype.isShip === true ||
    (prototype.role && !prototype.isStructure && !prototype.structureType && !prototype.isStationary);

  if (isShipEntity) {
    const currentNeridium = state.resources.neridium ?? 0;
    if (currentNeridium < neridiumCost) {
      return {
        allowed: false,
        reason: `INSUFFICIENT NERIDIUM (${currentNeridium}/${neridiumCost})`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Executes queue order and deducts resources, deducting Neridium exclusively for ships.
 */
export function executeQueueOrder(state: GameState | any, prototype: any): boolean {
  const check = canQueueOrder(state, prototype);
  if (!check.allowed) return false;

  const cost = prototype.cost || {
    ore: prototype.costOre || 0,
    metallic: prototype.costM || prototype.metallic || 0,
    organic: prototype.costO || prototype.organic || 0,
  };

  // Deduct standard costs
  state.resources.ore = Math.max(0, (state.resources.ore || 0) - (cost.ore || 0));
  state.resources.metallic = Math.max(0, (state.resources.metallic || 0) - (cost.metallic || 0));
  state.resources.organic = Math.max(0, (state.resources.organic || 0) - (cost.organic || 0));

  // Deduct Neridium exclusively for ships
  const isShipEntity =
    prototype.category === 'SHIP' ||
    prototype.isShip === true ||
    (prototype.role && !prototype.isStructure && !prototype.structureType && !prototype.isStationary);

  if (isShipEntity) {
    const nCost =
      prototype.neridiumCost !== undefined
        ? prototype.neridiumCost
        : getShipNeridiumCost(prototype.role || prototype.code || prototype.name || prototype.id);

    if (nCost > 0) {
      state.resources.neridium = Math.max(0, (state.resources.neridium || 0) - nCost);
    }
  }

  // Synchronize with HQ stockpiles and station
  if (state.hqStockpiles) {
    state.hqStockpiles.metallic = state.resources.metallic;
    state.hqStockpiles.organic = state.resources.organic;
  }
  if (typeof state.getHQ === 'function') {
    const hq = state.getHQ();
    if (hq && hq.resources) {
      hq.resources.metallic = state.resources.metallic;
      hq.resources.organic = state.resources.organic;
      hq.resources.neridium = state.resources.neridium;
    }
  }

  return true;
}

/**
 * Aliases for shipyard entity construction contracts.
 */
export function canBuildEntity(
  state: GameState | any,
  prototype: any
): { allowed: boolean; reason?: string } {
  return canQueueOrder(state, prototype);
}

export function queueShipyardOrder(state: GameState | any, prototype: any): boolean {
  return executeQueueOrder(state, prototype);
}

/**
 * Decommissioning / Scrapping:
 * When a ship is voluntarily decommissioned at an allied shipyard, refund 100% of its
 * Neridium cost back to state.resources.neridium.
 * (Note: When a ship is destroyed in combat, Neridium is permanently lost; no refund is called).
 */
export function decommissionShip(
  state: GameState | any,
  ship: any
): { refundedNeridium: number; success: boolean } {
  if (!ship) return { refundedNeridium: 0, success: false };

  const neridiumCost =
    ship.neridiumCost !== undefined
      ? ship.neridiumCost
      : getShipNeridiumCost(ship.role || ship.code || ship.type || ship.class || ship.name);

  if (!state.resources) {
    state.resources = {
      ore: 0,
      metallic: 0,
      organic: 0,
      neridium: 10,
    };
  }

  if (neridiumCost > 0) {
    state.resources.neridium = (state.resources.neridium || 0) + neridiumCost;

    if (typeof state.getHQ === 'function') {
      const hq = state.getHQ();
      if (hq && hq.resources) {
        hq.resources.neridium = state.resources.neridium;
      }
    }

    if (typeof state.addLog === 'function') {
      state.addLog(
        'LOGISTICS',
        `Decommissioned [${ship.name || ship.role}]: +${neridiumCost} Neridium refunded to strategic reserves.`,
        'info'
      );
    }
  }

  return { refundedNeridium: neridiumCost, success: true };
}
