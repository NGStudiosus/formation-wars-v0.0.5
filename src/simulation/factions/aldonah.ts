import { FactionId } from '../../types';

export const ALDONAH_FACTION_CONFIG = {
  id: 'ALDONAH' as FactionId,
  name: 'Alondahan Monarchy',
  tag: 'AM',
  themeColor: '#eab308',
  accentColor: '#fde047',

  // Faction Doctrine: Heavy Slab Armor, Superheated Smelting & Close-Quarters Brawling
  doctrine: {
    heavySlabArmor: true,
    overclockedSmelting: true,
    brawlerCombatDoctrine: true,
    armorMitigationBonus: 0.30,         // +30% passive kinetic & thermal mitigation
    refineryConversionBonus: 0.50,      // +50% faster ore conversion in refineries
  },

  // Combat & Defensive Modifiers
  combatModifiers: {
    armorHpMultiplier: 1.50,            // 50% higher armor hit points
    hullHpMultiplier: 1.30,             // Reinforced bulkheads
    shieldHpMultiplier: 0.90,           // Lower reliance on energy barrier shielding
    damageMitigation: 0.30,             // 30% flat damage absorption on armor
    pointDefenseAccuracyBonus: 0.10,
    maxVelocityMultiplier: 0.85,        // Heavy momentum
    accelerationMultiplier: 0.80,
  },

  // Logistics & Heavy Foundry Economy
  economy: {
    metallicCostMultiplier: 0.90,       // 10% lower metallic costs due to superior metallurgy
    organicCostMultiplier: 1.20,        // Less biologically integrated
    buildTimeMultiplier: 1.10,          // Heavy forge assembly
    refineryConversionRate: 45.0,       // High throughput smelting
  }
};
