import { FactionId } from '../../types';

export const KOVAK_FACTION_CONFIG = {
  id: 'KOVAK' as FactionId,
  name: 'Kovak Enclave',
  tag: 'KE',
  themeColor: '#ef4444',
  accentColor: '#f87171',

  // Faction Doctrine: Volume Over Quality, Angular Rhomboid Hull Architecture
  doctrine: {
    volumeOverQuality: true,
    angularRhomboidArchitecture: true,
    shipCostMultiplier: 0.50,            // Ships cost 50% Metallic & Organic
    buildTimeMultiplier: 0.50,           // 50% build time / ticks
    strategicMaterialMultiplier: 0.50,   // Half Neridium / strategic costs, rounded to nearest whole unit (min 1 for frigates)
    universalStatsMultiplier: 0.40,      // 40% base positive stats (Hull HP, Shield Max)
    shieldRechargeMultiplier: 0.40,      // Slower shield recharge & volatile regeneration
    shieldRebootDelayMultiplier: 1.50,   // Shields take 50% longer to reboot after collapse
    pdRangeMultiplier: 0.90,             // 10% reduction in Point Defense ranges
  },

  // Combat & Defensive Modifiers
  combatModifiers: {
    hullHpMultiplier: 0.40,              // 40% standard hull integrity
    shieldHpMultiplier: 0.40,            // 40% standard shield capacity
    shieldRegenMultiplier: 0.40,         // Slower recharge
    pdRangeMultiplier: 0.90,             // 10% reduction in PD ranges
    maxVelocityMultiplier: 1.10,         // Agile swarming speed
    accelerationMultiplier: 1.15,
  },

  // Mass Production & Strategic Economy
  economy: {
    metallicCostMultiplier: 0.50,
    organicCostMultiplier: 0.50,
    buildTimeMultiplier: 0.50,
    strategicMaterialCostFormula: (baseCost: number, isFrigate: boolean = false): number => {
      if (baseCost <= 0) return 0;
      const halved = Math.round(baseCost * 0.50);
      return isFrigate ? Math.max(1, halved) : Math.max(0, halved);
    },
  }
};
