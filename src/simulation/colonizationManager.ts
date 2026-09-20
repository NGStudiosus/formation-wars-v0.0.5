import { RockyPlanet, GasGiant } from '../types';
import { SimulationEngine } from './engine';

export type PlanetClass = 'TERRAN' | 'DESERT' | 'ICE' | 'VOLCANIC' | 'BARREN' | 'OCEANIC' | 'GAS_GIANT';

/**
 * Maps each celestial planet class to its associated colonization technology node ID
 */
export const PLANET_COLONIZATION_TECHS: Record<PlanetClass, { primaryId: string; aliasId: string; techName: string }> = {
  TERRAN: {
    primaryId: 'exp-t1',
    aliasId: 'EXP_TERRAN_COLONIZATION',
    techName: 'Terran Habitation Standards',
  },
  DESERT: {
    primaryId: 'exp-t2-desert',
    aliasId: 'EXP_DESERT_COLONIZATION',
    techName: 'Desert & Arid World Settlement',
  },
  ICE: {
    primaryId: 'exp-t3-ice',
    aliasId: 'EXP_ICE_COLONIZATION',
    techName: 'Ice & Glacial World Settlement',
  },
  VOLCANIC: {
    primaryId: 'exp-t4-volcanic',
    aliasId: 'EXP_VOLCANIC_COLONIZATION',
    techName: 'Volcanic & Ash World Settlement',
  },
  BARREN: {
    primaryId: 'exp-t6-barren',
    aliasId: 'EXP_BARREN_COLONIZATION',
    techName: 'Barren & Airless Rock Exploitation',
  },
  OCEANIC: {
    primaryId: 'exp-t7',
    aliasId: 'EXP_OCEANIC_COLONIZATION',
    techName: 'Oceanic & Greenhouse Terraforming',
  },
  GAS_GIANT: {
    primaryId: 'exp-t5-gas',
    aliasId: 'EXP_GAS_GIANT_HARVESTING',
    techName: 'Gas Giant Orbital Harvesting',
  },
};

export interface ColonizationValidation {
  allowed: boolean;
  canColonize: boolean;
  status: 'COLONIZABLE' | 'UNINHABITABLE' | 'COLONIZED' | 'PRIMARY' | 'GAS_GIANT';
  tooltip: string;
  reason?: string;
  planetClass: PlanetClass;
}

/**
 * Determines the normalized planet class for a given RockyPlanet or GasGiant.
 */
export function getPlanetClass(planet: RockyPlanet | GasGiant): PlanetClass {
  if ('hydrogen' in planet || 'bandColors' in planet) {
    return 'GAS_GIANT';
  }
  const rocky = planet as RockyPlanet;
  if (rocky.planetClass) return rocky.planetClass;
  if (rocky.planetType) return rocky.planetType;
  if (rocky.habitable || rocky.isPrimaryHabitable) return 'TERRAN';

  // Fallback by baseColor or surface clues if not explicitly tagged
  const color = (rocky.baseColor || '').toLowerCase();
  if (color.includes('15803d') || color.includes('green')) return 'TERRAN';
  if (color.includes('b45309') || color.includes('rust')) return 'DESERT';
  if (color.includes('0e7490') || color.includes('cyan') || color.includes('blue')) return 'ICE';
  if (color.includes('78350f') || color.includes('orange') || color.includes('amber')) return 'VOLCANIC';
  return 'BARREN';
}

/**
 * Checks player research state when inspecting or interacting with a planet.
 * Enforces prompt rules:
 * - If Terran and EXP_TERRAN_COLONIZATION (or exp-t1) is synthesized:
 *   Allows Builder or Colony vessel to establish planetary governance and extract resources.
 * - For all other planet classes (Desert, Ice, Volcanic, Barren):
 *   Blocks colonization and renders tooltip:
 *   "UNINHABITABLE: REQUIRES [TYPE] COLONIZATION RESEARCH (COMING IN PLANETS OVERHAUL)"
 */
export function validateColonization(
  planet: RockyPlanet | GasGiant,
  unlockedTechs: Set<string>
): ColonizationValidation {
  const pClass = getPlanetClass(planet);

  // 1. Gas Giants
  if (pClass === 'GAS_GIANT') {
    return {
      allowed: false,
      canColonize: false,
      status: 'GAS_GIANT',
      tooltip: 'UNINHABITABLE: REQUIRES GAS GIANT ORBITAL HARVESTING RESEARCH (COMING IN PLANETS OVERHAUL)',
      reason: 'Atmospheric pressure prevents surface governance.',
      planetClass: pClass,
    };
  }

  const rocky = planet as RockyPlanet;

  // 2. Primary Habitable Metropolis (Aegis-IV)
  if (rocky.isPrimaryHabitable) {
    return {
      allowed: false,
      canColonize: false,
      status: 'PRIMARY',
      tooltip: 'SOVEREIGN METROPOLIS: Capital Homeworld & Allied Fleet HQ Anchorage.',
      reason: 'Capital planetary governance is already active.',
      planetClass: pClass,
    };
  }

  // 3. Already Colonized Terran World
  if (rocky.colonized || rocky.colonyGovernance) {
    return {
      allowed: false,
      canColonize: false,
      status: 'COLONIZED',
      tooltip: `TERRAN COLONY: Planetary governance established on [${rocky.name}]. Automated resource extraction active.`,
      reason: 'Planetary governance already active.',
      planetClass: pClass,
    };
  }

  // 4. Terran Habitable World (Settlement Protocol Check)
  if (pClass === 'TERRAN') {
    const hasTerranTech =
      unlockedTechs.has('EXP_TERRAN_COLONIZATION') ||
      unlockedTechs.has('exp-t1') ||
      unlockedTechs.has('EXP-THS');

    if (hasTerranTech) {
      return {
        allowed: true,
        canColonize: true,
        status: 'COLONIZABLE',
        tooltip: `TERRAN HABITABLE WORLD: Habitation standards active. Builder or Colony vessel authorized to establish planetary governance and extract resources.`,
        reason: 'Authorized for sovereign colonization.',
        planetClass: 'TERRAN',
      };
    } else {
      return {
        allowed: false,
        canColonize: false,
        status: 'UNINHABITABLE',
        tooltip: 'UNINHABITABLE: REQUIRES TERRAN COLONIZATION RESEARCH (TERRAN HABITATION STANDARDS)',
        reason: 'Requires Expansion Tier 1 [Terran Habitation Standards] research to authorize colonial landing.',
        planetClass: 'TERRAN',
      };
    }
  }

  // 5. Hostile Non-Terran Planet Classes (Desert, Ice, Volcanic, Barren, Oceanic)
  // Strictly formatted as requested by Prompt 4:
  // "UNINHABITABLE: REQUIRES [TYPE] COLONIZATION RESEARCH (COMING IN PLANETS OVERHAUL)"
  const requiredTypeString = pClass;
  const standardTooltip = `UNINHABITABLE: REQUIRES ${requiredTypeString} COLONIZATION RESEARCH (COMING IN PLANETS OVERHAUL)`;

  return {
    allowed: false,
    canColonize: false,
    status: 'UNINHABITABLE',
    tooltip: standardTooltip,
    reason: standardTooltip,
    planetClass: pClass,
  };
}

/**
 * Establishes planetary governance over a validated Terran world,
 * initiating economic resource extraction for the player.
 */
export function establishPlanetaryGovernance(
  planetId: string,
  engine: SimulationEngine
): { success: boolean; message: string } {
  const rocky = engine.solarSystem.rockyPlanets.find((p) => p.id === planetId);
  if (!rocky) {
    return { success: false, message: `Planet [${planetId}] not found in celestial directory.` };
  }

  const unlocked = engine.researchManager.completedNodes;
  const validation = validateColonization(rocky, unlocked);

  if (!validation.allowed) {
    engine.addLog('RESEARCH', `⛔ Colonization rejected for ${rocky.name}: ${validation.reason || validation.tooltip}`, 'warn');
    return { success: false, message: validation.reason || validation.tooltip };
  }

  // Authorize colony governance
  rocky.colonized = true;
  rocky.colonyGovernance = true;
  rocky.resourceYieldRate = { metallic: 25.0, organic: 25.0 };

  const successMessage = `🌍 Planetary Governance Established on [${rocky.name}]! Extraction yields: +25 Met/s, +25 Org/s.`;
  engine.addLog('RESEARCH', successMessage, 'success');

  // Trigger state update
  engine.recalculateResearchScalars();

  return { success: true, message: successMessage };
}

export class ColonizationManager {
  public validate(planet: RockyPlanet | GasGiant, engine: SimulationEngine): ColonizationValidation {
    return validateColonization(planet, engine.researchManager.completedNodes);
  }

  public colonize(planetId: string, engine: SimulationEngine): { success: boolean; message: string } {
    return establishPlanetaryGovernance(planetId, engine);
  }
}

export const colonizationManager = new ColonizationManager();
