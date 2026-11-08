import { FactionId } from '../../types';

export const YESTIRI_FACTION_CONFIG = {
  id: 'YESTIRI' as FactionId,
  name: 'Yestiri Sodality',
  tag: 'YS',
  themeColor: '#c084fc',
  accentColor: '#d8b4fe',

  // Faction Hull & Fleet Doctrine
  doctrine: {
    noFrigate: true,                 // Frigates do not exist; fleet begins with Destroyers
    startsAtDestroyer: true,          // Immediate access to Destroyer hull without base tech
    ringShipArchitecture: true,      // All ships share the annular ring hull with open central space
    cityShipNeridiumCost: 100,       // City Ship requires 100 Neridium
    cityShipIsApexUnit: true,
  },

  // Combat & Mobility Modifiers
  combatModifiers: {
    shieldHpMultiplier: 1.40,        // 40% enhanced resonant shielding
    hullHpMultiplier: 1.15,          // Self-contained habitat bulkhead integrity
    maxVelocityMultiplier: 0.90,     // Stately ring hull momentum
    accelerationMultiplier: 0.85,
    rangeMultiplier: 1.20,           // Advanced harmonic beam and torpedo ranges
  },

  // Logistics & Neridium Economy
  economy: {
    cityShipCostMetallic: 52000,
    cityShipCostOrganic: 16000,
    cityShipNeridiumCost: 100,
    cityShipBuildTicks: 140,
  }
};
