import { FactionId } from '../../types';

export const NOVAN_FACTION_CONFIG = {
  id: 'NOVAN' as FactionId,
  name: 'Novan Republic',
  tag: 'NR',
  themeColor: '#00f0ff',
  accentColor: '#38bdf8',

  // Demographic & Economic Bottlenecks
  demographics: {
    growthRateMultiplier: 0.60,      // Slow demographic maturation
    crewDemandMultiplier: 2.20,       // Elite workforce bottleneck
    maintenanceOrganicMultiplier: 1.40 // Higher life-support & medical allocation
  },

  // Tactical Micro-Jump Overdrive
  microJump: {
    spoolTimeSeconds: 3.5,           // Standard is 12.0s
    cooldownSeconds: 16.0,           // Standard is 50.0s
    scatterRadiusKm: 75,             // Standard is 1200km
    inTransitVelocityKmS: 65000,     // Standard is 25000km/s
    disruptionImmunity: true,        // Jump coils cannot be interrupted by incoming weapons fire
    reactorDrainPct: 0.15            // Low capacitor drain
  },

  // Cold Shield Reboot Mechanics
  shieldReboot: {
    vulnerabilityWindowSeconds: 4.0, // Full shield collapse during cycle
    cooldownSeconds: 32.0,           // Cooldown before another cycle can be triggered
    hardeningDurationSeconds: 1.0,   // Post-restoration hardening window
    hardeningMitigationBonus: 0.20   // +20% flat damage mitigation while hardened
  }
};
