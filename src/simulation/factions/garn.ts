import { FactionId } from '../../types';

export const GARN_FACTION_CONFIG = {
  id: 'GARN' as FactionId,
  name: 'Garn Hegemony',
  tag: 'GH',
  themeColor: '#22c55e',
  accentColor: '#4ade80',

  // Defensive & Heavy Hull Baseline Modifiers
  combatModifiers: {
    armorHpMultiplier: 1.65,          // 65% thicker passive composite armor
    shieldHpMultiplier: 1.35,         // 35% higher barrier capacity
    pointDefenseAccuracyBonus: 0.25,  // Top-tier screening and interception
    maxVelocityMultiplier: 0.65,       // Ponderous sub-light drive curves
    accelerationMultiplier: 0.60
  },

  // Logistics & High Capital Expense
  economy: {
    capitalMetallicCostMultiplier: 1.50, // 50% more metallic required for BC, BB, DN
    capitalBuildTimeMultiplier: 1.40
  },

  // Infinite-Range Theater Defense System
  systemMissileDefense: {
    longRangeAccuracy: 0.05,          // 5% hit probability beyond standard engagement envelope
    requireActiveRadarLock: true,     // Cannot fire on passive thermal/EM contacts (FULL lock required)
    standardRadarRangeKm: 8500        // Standard weapon lock boundary
  }
};
