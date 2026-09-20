/**
 * Autoloader Controller
 * Manages modular HQ Missile Volley Autoloaders and rapid reload timing reductions.
 *
 * Scaling Rules:
 * - baseCooldownTicks * (1.0 - reloadReductionScalar)
 * - HQ Autoloader Nodes:
 *   - HQ_MSL_MOD3C: -10% (0.10)
 *   - HQ_MSL_MOD7B: -8%  (0.08, cumulative 0.18)
 *   - HQ_MSL_MOD11X: -8% (0.08, cumulative 0.26)
 *   - HQ_MSL_FEEDER: -10% (0.10, cumulative 0.36)
 * - Military Branch Synergies:
 *   - mil-t4-autoloader: -10% (0.10)
 */

export const AUTOLOADER_NODE_IDS = [
  'HQ_MSL_MOD3C',
  'HQ_MSL_MOD7B',
  'HQ_MSL_MOD11X',
  'HQ_MSL_FEEDER',
] as const;

export const AUTOLOADER_REDUCTIONS: Record<string, number> = {
  HQ_MSL_MOD3C: 0.10,
  HQ_MSL_MOD7B: 0.08,
  HQ_MSL_MOD11X: 0.08,
  HQ_MSL_FEEDER: 0.10,
  'mil-t4-autoloader': 0.10,
};

/**
 * Returns the cumulative missile reload reduction scalar (0.0 to 0.46).
 */
export function calculateMissileReloadReduction(
  completedNodes: Set<string> | readonly string[] | string[]
): number {
  if (!completedNodes) return 0;
  const isSet = completedNodes instanceof Set;
  const has = (id: string) =>
    isSet ? (completedNodes as Set<string>).has(id) : (completedNodes as string[]).includes(id);

  let reduction = 0;
  for (const [nodeId, red] of Object.entries(AUTOLOADER_REDUCTIONS)) {
    if (has(nodeId)) {
      reduction += red;
    }
  }

  return Math.min(0.75, reduction);
}

/**
 * Computes the missile reload multiplier applied to base reload ticks.
 * multiplier = Math.max(0.25, 1.0 - calculateMissileReloadReduction(completedNodes))
 */
export function calculateMissileReloadMultiplier(
  completedNodes: Set<string> | readonly string[] | string[]
): number {
  const reduction = calculateMissileReloadReduction(completedNodes);
  return Math.max(0.25, 1.0 - reduction);
}

/**
 * Computes the effective salvo reload ticks for a vessel or battery:
 * effectiveTicks = Math.max(1, Math.round(baseCooldownTicks * (1.0 - reloadReductionScalar)))
 */
export function calculateEffectiveReloadTicks(
  baseCooldownTicks: number,
  completedNodes: Set<string> | readonly string[] | string[]
): number {
  const mult = calculateMissileReloadMultiplier(completedNodes);
  return Math.max(1, Math.round(baseCooldownTicks * mult));
}
