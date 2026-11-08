import { StructureDef } from './structures';

export const GARN_SYSTEM_MISSILE_POD_PROTOTYPE: StructureDef = {
  type: 'GARN_MISSILE_POD',
  name: 'System Defense Missile Pod',
  code: 'SDMP',
  category: 'DEFENSE',
  costMetallic: 18500,
  costOrganic: 4200,
  costOre: 12000,
  neridiumCost: 24,
  hullMax: 35000,
  shieldHpMax: 18000,
  radius: 34,
  description: 'Stationary deep-space theater defense bastion mounting a 64-tube vertical launch array.',
  trait: 'Infinite-range radar-guided missile bombardment across the star system. Firing requires active target radar lock (cannot target passive contacts). Long-range salvos (>8,500 km) suffer a 5% hit clamp.',
  missileInventory: 2500,
  missileTubes: 64,
  salvoCooldownSeconds: 12.0
};
