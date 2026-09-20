/**
 * Refinery Controller
 * Manages modular HQ refinery tracks, ore conversion processing rates, and raw ore storage clamps.
 *
 * Scaling Rules:
 * - Base HQ Ore Processing: 10.0 Ore/s
 * - Each Unlocked Refinery Track: +10.0 Ore/s
 *   oreConversionRate = 10.0 + (unlockedRefineryCount * 10.0)
 * - Base HQ Ore Storage: 16,000 Ore
 * - Each Unlocked Refinery Track: +4,000 Ore
 *   maxOreStorage = 16,000 + (unlockedRefineryCount * 4,000)
 */

export const REFINERY_TRACK_NODE_IDS = [
  'HQ_REF_T2',
  'HQ_REF_T4',
  'HQ_REF_T6',
  'HQ_REF_T8',
  'HQ_REF_T10',
] as const;

export const BASE_ORE_CONVERSION_RATE = 30.0;
export const ORE_RATE_PER_TRACK = 10.0;

export const BASE_MAX_ORE_STORAGE = 16000;
export const ORE_STORAGE_PER_TRACK = 4000;

export const SIMULATION_TICK_RATE = 30; // 30Hz

export interface HQRefineryState {
  hq?: {
    oreStockpile: number;
    refineryAccumulator?: number;
    [key: string]: any;
  } | null;
  unlockedRefineryTracks?: number;
  hqStockpiles?: {
    metallic: number;
    organic: number;
    [key: string]: any;
  };
  maxStorageCaps?: {
    metallic: number;
    organic: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Updates HQ Refinery processing rate with a sub-tick fractional accumulator.
 * Enforces baseline 30 Ore/s + 10 Ore/s per unlocked auxiliary refinery track.
 * Distributes processed ore 50/50 to Metallic and Organic stockpiles.
 */
export function updateHQRefinery(state: HQRefineryState | any) {
  const hq = state?.hq;
  if (!hq || hq.oreStockpile <= 0) return;

  // Base: 30 Ore/s + 10 Ore/s per unlocked auxiliary refinery track
  const baseConversionRate = 30.0;
  const bonusRate = (state.unlockedRefineryTracks || 0) * 10.0;
  const totalRatePerSec = baseConversionRate + bonusRate;

  // Calculate ore slice for this simulation tick (1/30th sec)
  const orePerTick = totalRatePerSec / SIMULATION_TICK_RATE;
  hq.refineryAccumulator = (hq.refineryAccumulator || 0) + orePerTick;

  const wholeOreToProcess = Math.floor(hq.refineryAccumulator);
  if (wholeOreToProcess <= 0) return;

  // Clamp to available ore
  const actualOreProcessed = Math.min(wholeOreToProcess, hq.oreStockpile);
  hq.refineryAccumulator -= actualOreProcessed;
  hq.oreStockpile -= actualOreProcessed;

  // Distribute 50/50 to Metallic and Organic stockpiles, clamped to storage caps
  const halfOre = actualOreProcessed / 2;
  const maxM = state.maxStorageCaps?.metallic ?? 100000;
  const maxO = state.maxStorageCaps?.organic ?? 100000;

  if (state.hqStockpiles) {
    state.hqStockpiles.metallic = Math.min(
      maxM,
      state.hqStockpiles.metallic + halfOre
    );
    state.hqStockpiles.organic = Math.min(
      maxO,
      state.hqStockpiles.organic + halfOre
    );
  }
}

/**
 * HQ Ore Transfer Boundaries & High-Speed Offload Pipeline
 * - R_transfer: 250 km (~120px from HQ perimeter/docking collar)
 * - Transfer Rate: 3,000 Ore/s (100 Ore/tick at 30Hz)
 */
export const HQ_ORE_TRANSFER_RANGE_KM = 250.0;
export const R_TRANSFER = 250.0;
export const HQ_ORE_TRANSFER_APPROACH_RANGE_KM = 375.0; // 1.5 * R_transfer
export const MINER_HIGH_SPEED_TRANSFER_RATE_PER_SEC = 3000.0;
export const MINER_HIGH_SPEED_TRANSFER_RATE_PER_TICK = 100.0;

/**
 * Returns available capacity in the HQ ore silos.
 */
export function getAvailableOreStorage(currentOre: number, maxOre: number): number {
  return Math.max(0, maxOre - currentOre);
}

/**
 * Returns the number of unlocked Modular Refinery Tracks (0 to 5).
 */
export function getUnlockedRefineryCount(completedNodes: Set<string> | readonly string[] | string[]): number {
  if (!completedNodes) return 0;
  let count = 0;
  const isSet = completedNodes instanceof Set;

  for (let i = 0; i < REFINERY_TRACK_NODE_IDS.length; i++) {
    const id = REFINERY_TRACK_NODE_IDS[i];
    if (isSet ? (completedNodes as Set<string>).has(id) : (completedNodes as string[]).includes(id)) {
      count++;
    }
  }

  return count;
}

/**
 * Computes live ore conversion rate in Ore/s.
 * oreConversionRate = (10.0 + unlockedRefineryCount * 10.0) * speedMultiplier
 */
export function calculateOreConversionRate(
  completedNodes: Set<string> | readonly string[] | string[],
  speedMultiplier: number = 1.0
): number {
  const count = getUnlockedRefineryCount(completedNodes);
  const baseRate = BASE_ORE_CONVERSION_RATE + count * ORE_RATE_PER_TRACK;
  return baseRate * Math.max(0.1, speedMultiplier);
}

/**
 * Computes maximum Ore storage clamp in units of Ore.
 * maxOreStorage = (16,000 + unlockedRefineryCount * 4,000) * storageMultiplier
 */
export function calculateMaxOreStorage(
  completedNodes: Set<string> | readonly string[] | string[],
  storageMultiplier: number = 1.0
): number {
  const count = getUnlockedRefineryCount(completedNodes);
  const baseStorage = BASE_MAX_ORE_STORAGE + count * ORE_STORAGE_PER_TRACK;
  return Math.round(baseStorage * Math.max(1.0, storageMultiplier));
}

/**
 * Formats ore storage cap for HUD display (e.g. "16K", "20K", "36K").
 */
export function formatOreStorageCapDisplay(maxOre: number): string {
  const inK = Math.round(maxOre / 1000);
  return `${inK}K`;
}
