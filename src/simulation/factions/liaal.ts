import { FactionId } from '../../types';

export const LIAAL_FACTION_CONFIG = {
  id: 'LIAAL' as FactionId,
  name: 'Liaal Consortium',
  tag: 'LAC',
  themeColor: '#f97316',
  accentColor: '#fb923c',

  // Faction Doctrine: 3 Warships Only, Extreme Missile Salvos, Fragile Durability & Proxy Buying Powers
  doctrine: {
    threeWarshipsOnly: true,         // Only fields native Light, Medium, and Heavy warships
    warshipClasses: ['LIAAL_LIGHT', 'LIAAL_MEDIUM', 'LIAAL_HEAVY'],
    lightWarshipSalvo: 20,          // 20 missiles per salvo
    mediumWarshipSalvo: 45,         // 45 missiles per salvo
    heavyWarshipSalvo: 100,         // 100 missiles per salvo
    durabilityScalar: 0.30,         // 30% of standard hull and shield capacity
    cargoHeavy: true,               // Specialized in high-capacity cargo holds & bulk transport
    terraformingHeavy: true,        // Advanced planetary bio-domes & atmospheric transformation
    hasProxyBuyPowers: true,        // Can commission/buy any and all hulls unlocked by allied factions
    proxyResearchEnhancements: true // Inherits allied faction research and design modifiers on proxy builds
  },

  // Combat & Defensive Modifiers
  combatModifiers: {
    hullHpMultiplier: 0.30,         // Fragile lightweight composite frames
    shieldHpMultiplier: 0.30,       // 30% standard shield barrier strength
    missileSalvoVolleyBonus: 1.0,   // Massive salvo density
    missileRangeMultiplier: 1.15,   // 15% extended guidance range
    maxVelocityMultiplier: 1.05,    // Agile sublight repositioning
  },

  // Logistics & Planetary Expansion Economy
  economy: {
    cargoCapacityMultiplier: 2.0,   // 200% cargo hold storage for miners and logistics
    freighterCapacityMultiplier: 2.5,
    colonyGrowthMultiplier: 1.50,   // 50% faster population growth
    terraformingCostDiscount: 0.30, // 30% lower resource cost to colonize and develop worlds
    proxyBrokerDiscount: 0.0,       // Standard resource conversion for proxy contracts
  }
};

