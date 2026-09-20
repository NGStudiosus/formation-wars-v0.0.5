/**
 * Storage Manager
 * Manages modular Sub-Silo Storage Expansions, dynamic storage capacity caps, and HUD display formatting.
 *
 * Scaling Rules:
 * - Base HQ Metallic & Organic Storage Cap: 100,000
 * - Sequential Sub-Silo Tiers 1-10: Each tier increases capacity by +15,000 M / +15,000 O
 *   storageLimit = 100,000 + (unlockedSiloTier * 15,000)
 */

export const SILO_TIER_NODE_IDS = [
  'HQ_SILO_T1',
  'HQ_SILO_T2',
  'HQ_SILO_T3',
  'HQ_SILO_T4',
  'HQ_SILO_T5',
  'HQ_SILO_T6',
  'HQ_SILO_T7',
  'HQ_SILO_T8',
  'HQ_SILO_T9',
  'HQ_SILO_T10',
] as const;

export const BASE_RESOURCE_STORAGE_CAPACITY = 100000;
export const STORAGE_CAPACITY_PER_SILO_TIER = 15000;

/**
 * Returns the highest unlocked Sub-Silo expansion tier (0 to 10).
 */
export function getUnlockedSiloTier(completedNodes: Set<string> | readonly string[] | string[]): number {
  if (!completedNodes) return 0;
  let unlockedTier = 0;
  const isSet = completedNodes instanceof Set;

  for (let i = 0; i < SILO_TIER_NODE_IDS.length; i++) {
    const id = SILO_TIER_NODE_IDS[i];
    if (isSet ? (completedNodes as Set<string>).has(id) : (completedNodes as string[]).includes(id)) {
      unlockedTier = Math.max(unlockedTier, i + 1);
    }
  }

  return unlockedTier;
}

/**
 * Computes live storage limit for Metallic and Organic stockpiles.
 * storageLimit = (100,000 + unlockedSiloTier * 15,000) * storageMultiplier
 */
export function calculateStorageLimit(
  completedNodes: Set<string> | readonly string[] | string[],
  storageMultiplier: number = 1.0
): number {
  const tier = getUnlockedSiloTier(completedNodes);
  const baseLimit = BASE_RESOURCE_STORAGE_CAPACITY + tier * STORAGE_CAPACITY_PER_SILO_TIER;
  return Math.round(baseLimit * Math.max(1.0, storageMultiplier));
}

/**
 * Evaluates storage caps and clamps live resource reserves to their configured maximums.
 */
export function clampStockpileReserves(
  resources: {
    metallic: number;
    organic: number;
    ore?: number;
    maxMetallic?: number;
    maxOrganic?: number;
    maxOre?: number;
  },
  completedNodes: Set<string> | readonly string[] | string[],
  storageMultiplier: number = 1.0
): void {
  const dynamicCap = calculateStorageLimit(completedNodes, storageMultiplier);
  resources.maxMetallic = dynamicCap;
  resources.maxOrganic = dynamicCap;

  if (resources.metallic > dynamicCap) {
    resources.metallic = dynamicCap;
  }
  if (resources.organic > dynamicCap) {
    resources.organic = dynamicCap;
  }
  if (resources.maxOre !== undefined && resources.ore !== undefined && resources.ore > resources.maxOre) {
    resources.ore = resources.maxOre;
  }
}

/**
 * Formats resource storage cap for HUD display (e.g. "100K", "115K", "250K").
 */
export function formatStorageCapDisplay(limit: number): string {
  const inK = Math.round(limit / 1000);
  return `${inK}K`;
}
