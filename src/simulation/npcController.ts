/**
 * NPC Tactical Patrol, Kinematic Wandering & Leash Pursuit Controller
 *
 * Implements:
 * 1. Celestial Gravity Well Moored Anchors & Deep Space / Asteroid Belt Pickets
 * 2. 1.50x Leash Radius Pursuit and High-Speed Disengage / Return-to-Base Loop
 * 3. Procedural Uniform Polar Disk Wandering with 90-180 Tick Station-Keeping Dwells
 * 4. Smooth Kinematic Cruise Burns (0.50x v_max) with Clamped Slew Rates
 * 5. Active Radar Envelope (8,400 km) Detection & Offensive Broadside/Bow Orientation
 */

export type NPCBehaviorState = 'PATROL_ROAM' | 'PURSUIT_ENGAGE' | 'RETURNING_TO_PATROL';

export const STATE_PATROL_ROAM = 'PATROL_ROAM' as const;
export const STATE_PURSUIT_ENGAGE = 'PURSUIT_ENGAGE' as const;
export const STATE_RETURNING_TO_PATROL = 'RETURNING_TO_PATROL' as const;

export interface NPCPatrolState {
  anchorX: number;
  anchorY: number;
  patrolRadius: number;       // Radius of gravity well or belt zone
  leashRadius: number;        // Break-off leash boundary: R_body + 1.50 * (R_well - R_body)
  behaviorState: 'PATROL_ROAM' | 'PURSUIT_ENGAGE' | 'RETURNING_TO_PATROL';
  currentWanderTarget: { x: number; y: number } | null;
  dwellTicksRemaining: number;
  targetEntityId: string | null;
  tetherPlanetId?: string;    // Celestial body ID if moored to an orbiting planet/moon
  bodyRadius?: number;        // Physical surface radius R_body of host body
  minPatrolRadius?: number;   // R_min_patrol = R_body + 300 km
  maxPatrolRadius?: number;   // R_max_patrol = R_well - 200 km
}

import { ShipEntity, SolarSystem, Vec2D } from '../types';
import { getPlanetaryGravityWellRadius, getLunarGravityWellRadius } from './solarSystem';
import { issueMoveCommand, clearShipMovement } from './movementController';
import { clampAngularSlew } from './kinematics';
import { BASE_TACTICAL_RANGES } from './sensorController';

export const RADAR_ENVELOPE_KM = 8400.0;
export const DEFAULT_BELT_PATROL_RADIUS = 3000.0;
export const WANDER_CLAMP_RATIO = 0.85;
export const LEASH_MULTIPLIER = 1.50;
export const RESUME_PATROL_RATIO = 0.75;

export interface CelestialWell {
  id?: string;
  name?: string;
  x: number;
  y: number;
  radius: number;
  radiusSq: number;
}

/**
 * Resolve the assigned celestial gravity well for an NPC vessel.
 * Returns the well center coordinates and capture radius.
 */
export function getAssignedCelestialWell(
  npc: ShipEntity,
  solarSystem?: SolarSystem
): CelestialWell | null {
  const state = npc.npcPatrolState;
  if (!state) return null;

  if (solarSystem) {
    if (state.tetherPlanetId) {
      const p = solarSystem.rockyPlanets.find((rp) => rp.id === state.tetherPlanetId);
      if (p) {
        const r = getPlanetaryGravityWellRadius(p);
        return { id: p.id, name: p.name, x: p.pos.x, y: p.pos.y, radius: r, radiusSq: r * r };
      }
      const g = solarSystem.gasGiants.find((gg) => gg.id === state.tetherPlanetId);
      if (g) {
        const r = getPlanetaryGravityWellRadius(g);
        return { id: g.id, name: g.name, x: g.pos.x, y: g.pos.y, radius: r, radiusSq: r * r };
      }
      for (const rp of solarSystem.rockyPlanets) {
        const m = rp.moons?.find((moon) => moon.id === state.tetherPlanetId);
        if (m) {
          const r = getLunarGravityWellRadius(m);
          return { id: m.id, name: m.name, x: m.pos.x, y: m.pos.y, radius: r, radiusSq: r * r };
        }
      }
      for (const gg of solarSystem.gasGiants) {
        const m = gg.moons?.find((moon) => moon.id === state.tetherPlanetId);
        if (m) {
          const r = getLunarGravityWellRadius(m);
          return { id: m.id, name: m.name, x: m.pos.x, y: m.pos.y, radius: r, radiusSq: r * r };
        }
      }
    }

    // Check proximity to celestial bodies at anchor coordinates
    for (const p of solarSystem.rockyPlanets) {
      const r = getPlanetaryGravityWellRadius(p);
      const d = Math.hypot(state.anchorX - p.pos.x, state.anchorY - p.pos.y);
      if (d <= 50.0) {
        return { id: p.id, name: p.name, x: p.pos.x, y: p.pos.y, radius: r, radiusSq: r * r };
      }
    }
    for (const g of solarSystem.gasGiants) {
      const r = getPlanetaryGravityWellRadius(g);
      const d = Math.hypot(state.anchorX - g.pos.x, state.anchorY - g.pos.y);
      if (d <= 50.0) {
        return { id: g.id, name: g.name, x: g.pos.x, y: g.pos.y, radius: r, radiusSq: r * r };
      }
    }
  }

  // Fallback for moored vessels with tetherPlanetId without solarSystem
  if (state.tetherPlanetId) {
    const r = state.patrolRadius;
    return { id: state.tetherPlanetId, x: state.anchorX, y: state.anchorY, radius: r, radiusSq: r * r };
  }

  return null;
}

/**
 * Strict Gravity Well Infiltration Gate:
 * Evaluates candidate player ships. Player MUST have crossed inside the physical gravity well radius.
 * All player ships outside the well boundary are strictly ignored by moored defenders.
 */
export function evaluateWellDefenseEngagement(
  npc: ShipEntity,
  well: CelestialWell,
  allShips: ShipEntity[]
): ShipEntity | null {
  let closestIntruder: ShipEntity | null = null;
  let minIntruderDistSq = Infinity;

  // Find candidate player ships
  for (let i = 0; i < allShips.length; i++) {
    const playerShip = allShips[i];
    if (
      !playerShip ||
      playerShip.faction === npc.faction ||
      playerShip.hullState === 'DESTROYED' ||
      (playerShip.hullHp !== undefined && playerShip.hullHp <= 0)
    ) {
      continue;
    }

    // Calculate player distance to the center of the NPC's assigned gravity well
    const dx = playerShip.pos.x - well.x;
    const dy = playerShip.pos.y - well.y;
    const distSqToWellCenter = dx * dx + dy * dy;

    // Condition: Player MUST have crossed inside the physical gravity well radius
    if (distSqToWellCenter <= well.radiusSq) {
      const dNpcSq = (playerShip.pos.x - npc.pos.x) ** 2 + (playerShip.pos.y - npc.pos.y) ** 2;
      if (dNpcSq < minIntruderDistSq) {
        minIntruderDistSq = dNpcSq;
        closestIntruder = playerShip;
      }
    }
  }

  return closestIntruder; // Ignore all player ships outside the well boundary
}

/**
 * Deep-Space & Asteroid Belt Picket Engagement Gate:
 * Pickets do not trigger across open space merely because radar detects a ship.
 * An intruder must enter the NPC's designated local patrol sector (D <= R_patrol ~ 3,000 km)
 * before the picket scrambles to engage.
 */
export function evaluateBeltDefenseEngagement(
  npc: ShipEntity,
  allShips: ShipEntity[]
): ShipEntity | null {
  const state = npc.npcPatrolState;
  if (!state) return null;

  const patrolRadiusSq = state.patrolRadius * state.patrolRadius;
  let closestIntruder: ShipEntity | null = null;
  let minIntruderDistSq = Infinity;

  for (let i = 0; i < allShips.length; i++) {
    const playerShip = allShips[i];
    if (
      !playerShip ||
      playerShip.faction === npc.faction ||
      playerShip.hullState === 'DESTROYED' ||
      (playerShip.hullHp !== undefined && playerShip.hullHp <= 0)
    ) {
      continue;
    }

    // Distance to assigned anchor point
    const dx = playerShip.pos.x - state.anchorX;
    const dy = playerShip.pos.y - state.anchorY;
    const distSqToAnchor = dx * dx + dy * dy;

    // Condition: Intruder must enter designated local patrol sector (D <= R_patrol)
    if (distSqToAnchor <= patrolRadiusSq) {
      const dNpcSq = (playerShip.pos.x - npc.pos.x) ** 2 + (playerShip.pos.y - npc.pos.y) ** 2;
      if (dNpcSq < minIntruderDistSq) {
        minIntruderDistSq = dNpcSq;
        closestIntruder = playerShip;
      }
    }
  }

  return closestIntruder;
}

/**
 * Procedural Uniform Polar Disk / Annular Wander Generator
 * For planetary tethered vessels:
 * Generates waypoints within annular band [R_min_patrol, R_max_patrol]:
 * R_min_patrol = R_body + 300 km
 * R_max_patrol = R_well - 200 km
 * For deep space & asteroid belt pickets:
 * Generates within [0, 0.85 * R_patrol]
 */
export function generateWanderWaypoint(
  anchorX: number,
  anchorY: number,
  patrolRadius: number,
  minPatrolRadius?: number,
  maxPatrolRadius?: number
): { x: number; y: number } {
  const theta_rand = Math.random() * 2 * Math.PI;

  let r_rand: number;
  if (minPatrolRadius !== undefined && maxPatrolRadius !== undefined && maxPatrolRadius > minPatrolRadius) {
    // Uniform sampling over annular region: r = sqrt(r_min^2 + u * (r_max^2 - r_min^2))
    const minSq = minPatrolRadius * minPatrolRadius;
    const maxSq = maxPatrolRadius * maxPatrolRadius;
    r_rand = Math.sqrt(minSq + Math.random() * (maxSq - minSq));
  } else {
    // r_rand = R_patrol * sqrt(random() * 0.85)
    const raw_r = patrolRadius * Math.sqrt(Math.random() * WANDER_CLAMP_RATIO);
    r_rand = Math.min(raw_r, patrolRadius * WANDER_CLAMP_RATIO);
  }

  const W_X = anchorX + r_rand * Math.cos(theta_rand);
  const W_Y = anchorY + r_rand * Math.sin(theta_rand);

  return { x: W_X, y: W_Y };
}

/**
 * 1. ANCHOR INITIALIZATION & PATROL RADII
 * - Gravity Well Moored: (X_anchor, Y_anchor) = (X_body, Y_body); R_patrol clamped to R_well.
 * - Deep Space & Belt: Assigned spawn coordinate or tactical center; R_patrol default to 3,000 km.
 * - Pursuit Leash Radius: R_leash = 1.50 * R_patrol.
 */
export function initNPCPatrolState(
  ship: ShipEntity,
  solarSystem?: SolarSystem,
  customAnchor?: Vec2D,
  customRadius?: number
): NPCPatrolState {
  // Strict Builder Entity Isolation: The Builder belongs strictly to the player's economic/logistics layer.
  // Explicitly blacklist Builder from all NPC behavior trees, gravity well anchors, orbital wander loops, and combat engagement.
  if (ship.class === 'BUILDER' || ship.role === 'BUILDER') {
    if (ship.npcPatrolState) {
      delete ship.npcPatrolState;
    }
    return {} as NPCPatrolState;
  }

  // Strict Faction Scoping: Strip NPC behavior from player combat vessels
  if (ship.faction === 'FRIENDLY' || (ship.faction as string) === 'PLAYER') {
    if (ship.class !== 'MINER' && ship.role !== 'MINER') {
      if (ship.npcPatrolState) {
        delete ship.npcPatrolState;
      }
      return {} as NPCPatrolState;
    }
  }

  let anchorX = ship.pos.x;
  let anchorY = ship.pos.y;
  let patrolRadius = customRadius ?? ship.patrolRadius ?? DEFAULT_BELT_PATROL_RADIUS;
  let tetherPlanetId: string | undefined = ship.gravityWellTetherPlanetId;

  // 1. Gravity Well Moored Patrols (Planets, Moons, Major Outposts)
  if (solarSystem) {
    // If tether planet is already defined or ship is near a celestial body
    let tetheredBody: { id: string; name: string; pos: Vec2D; radius: number; isMoon?: boolean } | null = null;

    if (tetherPlanetId) {
      const p = solarSystem.rockyPlanets.find((rp) => rp.id === tetherPlanetId);
      if (p) tetheredBody = p;
      if (!tetheredBody) {
        const g = solarSystem.gasGiants.find((gg) => gg.id === tetherPlanetId);
        if (g) tetheredBody = g;
      }
      if (!tetheredBody) {
        for (const rp of solarSystem.rockyPlanets) {
          const m = rp.moons?.find((moon) => moon.id === tetherPlanetId);
          if (m) {
            tetheredBody = { ...m, isMoon: true };
            break;
          }
        }
      }
      if (!tetheredBody) {
        for (const gg of solarSystem.gasGiants) {
          const m = gg.moons?.find((moon) => moon.id === tetherPlanetId);
          if (m) {
            tetheredBody = { ...m, isMoon: true };
            break;
          }
        }
      }
    } else if (ship.patrolAnchor) {
      // Check if patrolAnchor is near a planet or moon
      for (const p of solarSystem.rockyPlanets) {
        const d = Math.hypot(ship.patrolAnchor.x - p.pos.x, ship.patrolAnchor.y - p.pos.y);
        const rWell = getPlanetaryGravityWellRadius(p);
        if (d <= rWell * 1.25) {
          tetheredBody = p;
          tetherPlanetId = p.id;
          break;
        }
      }
      if (!tetheredBody) {
        for (const g of solarSystem.gasGiants) {
          const d = Math.hypot(ship.patrolAnchor.x - g.pos.x, ship.patrolAnchor.y - g.pos.y);
          const rWell = getPlanetaryGravityWellRadius(g);
          if (d <= rWell * 1.25) {
            tetheredBody = g;
            tetherPlanetId = g.id;
            break;
          }
        }
      }
    }

    if (tetheredBody) {
      // Anchor Point: exact center coordinates of assigned celestial body's gravity well
      anchorX = tetheredBody.pos.x;
      anchorY = tetheredBody.pos.y;
      const rWell = tetheredBody.isMoon
        ? getLunarGravityWellRadius(tetheredBody)
        : getPlanetaryGravityWellRadius(tetheredBody);
      const rBody = tetheredBody.radius || 0;

      // NPC Well Defenders:
      // Minimum patrol distance from center: R_min_patrol = R_body + 300 km
      // Maximum: R_max_patrol = R_well - 200 km
      // Leash break-off boundary: R_leash = R_body + 1.50 * (R_well - R_body)
      const minPatrol = rBody > 0 ? rBody + 300.0 : 0;
      const maxPatrol = rBody > 0 ? Math.max(minPatrol + 100.0, rWell - 200.0) : rWell * 0.85;
      const calculatedLeash = rBody > 0 ? rBody + 1.50 * (rWell - rBody) : rWell * 1.50;

      patrolRadius = maxPatrol;
      tetherPlanetId = tetheredBody.id;
      ship.gravityWellTetherPlanetId = tetheredBody.id;

      const state: NPCPatrolState = {
        anchorX,
        anchorY,
        patrolRadius,
        leashRadius: calculatedLeash,
        behaviorState: STATE_PATROL_ROAM,
        currentWanderTarget: null,
        dwellTicksRemaining: Math.floor(Math.random() * 60), // Slight initial phase desynchronization
        targetEntityId: null,
        tetherPlanetId,
        bodyRadius: rBody,
        minPatrolRadius: minPatrol,
        maxPatrolRadius: maxPatrol,
      };

      ship.npcPatrolState = state;
      ship.patrolAnchor = { x: anchorX, y: anchorY };
      ship.patrolRadius = patrolRadius;

      return state;
    } else if (customAnchor || ship.patrolAnchor) {
      // Deep Space & Asteroid Belt Patrols
      const anchor = customAnchor || ship.patrolAnchor!;
      anchorX = anchor.x;
      anchorY = anchor.y;
      patrolRadius = customRadius ?? ship.patrolRadius ?? DEFAULT_BELT_PATROL_RADIUS;
    } else {
      anchorX = ship.pos.x;
      anchorY = ship.pos.y;
      patrolRadius = customRadius ?? ship.patrolRadius ?? DEFAULT_BELT_PATROL_RADIUS;
    }
  } else if (customAnchor || ship.patrolAnchor) {
    const anchor = customAnchor || ship.patrolAnchor!;
    anchorX = anchor.x;
    anchorY = anchor.y;
    patrolRadius = customRadius ?? ship.patrolRadius ?? DEFAULT_BELT_PATROL_RADIUS;
  }

  // Pursuit Leash Radius: R_leash = 1.50 * R_patrol for deep space / belt
  const leashRadius = patrolRadius * LEASH_MULTIPLIER;

  const state: NPCPatrolState = {
    anchorX,
    anchorY,
    patrolRadius,
    leashRadius,
    behaviorState: STATE_PATROL_ROAM,
    currentWanderTarget: null,
    dwellTicksRemaining: Math.floor(Math.random() * 60), // Slight initial phase desynchronization
    targetEntityId: null,
    tetherPlanetId,
  };

  ship.npcPatrolState = state;
  ship.patrolAnchor = { x: anchorX, y: anchorY };
  ship.patrolRadius = patrolRadius;

  return state;
}

/**
 * Arrival callback hook called when an NPC ship completes its kinematic path
 */
export function handleNPCOnArrival(ship: ShipEntity): void {
  const state = ship.npcPatrolState;
  if (!state) return;

  if (state.behaviorState === STATE_PATROL_ROAM) {
    // 1. Enter brief dwell timer (90 to 180 ticks / 3.0 to 6.0 seconds) holding station with zero burn
    state.currentWanderTarget = null;
    state.dwellTicksRemaining = Math.floor(90 + Math.random() * 91); // 90 to 180 ticks
    clearShipMovement(ship);
  } else if (state.behaviorState === STATE_RETURNING_TO_PATROL) {
    const distToAnchor = Math.hypot(ship.pos.x - state.anchorX, ship.pos.y - state.anchorY);
    if (distToAnchor <= RESUME_PATROL_RATIO * state.patrolRadius) {
      state.behaviorState = STATE_PATROL_ROAM;
      state.currentWanderTarget = null;
      state.dwellTicksRemaining = Math.floor(30 + Math.random() * 60);
      clearShipMovement(ship);
      ship.combatStance = 'AGGRESSIVE';
    }
  }
}

/**
 * Updates the NPC Patrol, Procedural Wandering & Leash Pursuit State Machine (30Hz Tick)
 */
export function updateNPCPatrol(
  ship: ShipEntity,
  allShips: ShipEntity[],
  dt: number,
  solarSystem?: SolarSystem
): void {
  if (!ship || ship.hullState === 'DESTROYED' || ship.isStationary) return;

  // Strict Builder Entity Isolation: The Builder belongs strictly to the player's economic/logistics layer.
  // Explicitly blacklist Builder from all NPC behavior trees, gravity well anchors, orbital wander loops, and combat passes.
  if (ship.class === 'BUILDER' || ship.role === 'BUILDER') {
    if (ship.npcPatrolState) {
      delete ship.npcPatrolState;
    }
    return;
  }

  // Strict Faction Scoping: Strip NPC behavior from player combat vessels
  if (ship.faction === 'FRIENDLY' || (ship.faction as string) === 'PLAYER') {
    // Player combat vessels MUST NEVER execute NPC wander, anchor drift, or pursuit leashing.
    // Player ships strictly obey player-issued waypoints, fleet formation station-keeping, and user-selected stance.
    if (ship.class !== 'MINER' && ship.role !== 'MINER') {
      if (ship.npcPatrolState) {
        delete ship.npcPatrolState;
      }
      return;
    }
  }

  // Initialize patrol state if missing
  let state = ship.npcPatrolState;
  if (!state) {
    state = initNPCPatrolState(ship, solarSystem);
  }

  // Synchronize anchor with orbiting celestial body if tethered
  if (state.tetherPlanetId && solarSystem) {
    const planet =
      solarSystem.rockyPlanets.find((p) => p.id === state.tetherPlanetId) ||
      solarSystem.gasGiants.find((g) => g.id === state.tetherPlanetId);
    if (planet) {
      const dx = planet.pos.x - state.anchorX;
      const dy = planet.pos.y - state.anchorY;
      if (dx !== 0 || dy !== 0) {
        state.anchorX = planet.pos.x;
        state.anchorY = planet.pos.y;
        if (ship.patrolAnchor) {
          ship.patrolAnchor.x = planet.pos.x;
          ship.patrolAnchor.y = planet.pos.y;
        }
        if (state.currentWanderTarget) {
          state.currentWanderTarget.x += dx;
          state.currentWanderTarget.y += dy;
        }
        if (ship.splineP1 && ship.splineActive) {
          ship.splineP1.x += dx;
          ship.splineP1.y += dy;
        }
        if (ship.splineP0 && ship.splineActive) {
          ship.splineP0.x += dx;
          ship.splineP0.y += dy;
        }
        ship.pos.x += dx;
        ship.pos.y += dy;
      }
    }
  }

  // Live Euclidean distance to assigned anchor
  const distToAnchor = Math.hypot(ship.pos.x - state.anchorX, ship.pos.y - state.anchorY);

  // --------------------------------------------------------------------------
  // 4. LEASH EVALUATION DURING STATE_PURSUIT_ENGAGE
  // --------------------------------------------------------------------------
  if (state.behaviorState === STATE_PURSUIT_ENGAGE) {
    // Leash Exceeded Condition: distToAnchor > R_leash (1.50 * R_patrol)
    if (distToAnchor > state.leashRadius) {
      // 1. Drop target lock
      ship.targetEntityId = null;
      state.targetEntityId = null;

      // 2. Cease all offensive forward propulsion toward the enemy
      ship.offensiveLaserActive = false;
      ship.offensiveGraserActive = false;
      clearShipMovement(ship);

      // 3. Set state to STATE_RETURNING_TO_PATROL
      state.behaviorState = STATE_RETURNING_TO_PATROL;

      // 4. Plot a high-speed retro/burn vector directly toward the anchor coordinate (X_anchor, Y_anchor)
      const retroSpeed = ship.maxSpeed || 1000.0;
      issueMoveCommand(ship, { x: state.anchorX, y: state.anchorY }, retroSpeed);

      // 5. Defensive weapons remain fully active to screen against pursuit fire during transit
      ship.combatStance = 'DEFENSIVE';
      return;
    }

    // Still within leash: evaluate active locked target
    let activeTarget: ShipEntity | null = null;
    if (state.targetEntityId) {
      for (let i = 0; i < allShips.length; i++) {
        const candidate = allShips[i];
        if (
          candidate.id === state.targetEntityId &&
          candidate.faction !== ship.faction &&
          candidate.hullState !== 'DESTROYED' &&
          (candidate.hullHp === undefined || candidate.hullHp > 0)
        ) {
          activeTarget = candidate;
          break;
        }
      }
    }

    // Check if current target has fled beyond the leash boundary (1.50 * R_patrol / R_well from anchor)
    if (activeTarget) {
      const targetDistToAnchor = Math.hypot(activeTarget.pos.x - state.anchorX, activeTarget.pos.y - state.anchorY);
      if (targetDistToAnchor > state.leashRadius) {
        // Intruder has fled beyond the leash boundary!
        activeTarget = null;
      }
    }

    // If target destroyed or fled beyond leash, scan for another candidate intruder inside the well / patrol sector
    if (!activeTarget) {
      const assignedWell = getAssignedCelestialWell(ship, solarSystem);
      const nextIntruder = assignedWell
        ? evaluateWellDefenseEngagement(
            ship,
            { ...assignedWell, radius: state.leashRadius, radiusSq: state.leashRadius * state.leashRadius },
            allShips
          )
        : evaluateBeltDefenseEngagement(ship, allShips);

      if (nextIntruder) {
        activeTarget = nextIntruder;
        state.targetEntityId = nextIntruder.id;
        ship.targetEntityId = nextIntruder.id;
      } else {
        // Intrusion cleared / target escaped / all hostiles outside leash: disengage immediately
        state.targetEntityId = null;
        ship.targetEntityId = null;
        ship.offensiveLaserActive = false;
        ship.offensiveGraserActive = false;
        clearShipMovement(ship);

        state.behaviorState = STATE_RETURNING_TO_PATROL;
        issueMoveCommand(ship, { x: state.anchorX, y: state.anchorY }, ship.maxSpeed || 1000.0);
        ship.combatStance = 'DEFENSIVE';
        return;
      }
    }

    // Slew vessel heading directly toward target
    const dx = activeTarget.pos.x - ship.pos.x;
    const dy = activeTarget.pos.y - ship.pos.y;
    const targetAngle = Math.atan2(dy, dx);
    const maxSlewRateRad = ((ship.angularSlewRate ?? 25.0) * Math.PI) / 180.0;
    ship.heading = clampAngularSlew(ship.heading, targetAngle, maxSlewRateRad, dt);

    // Engage offensive missile tubes and laser/graser arrays according to standard combat range tables
    ship.targetEntityId = activeTarget.id;
    ship.combatStance = 'AGGRESSIVE';
    ship.autoFire = true;

    // Kinematic pursuit vector: keep closing in to effective engagement range (~600km)
    const targetDist = Math.hypot(dx, dy);
    if (targetDist > 600.0) {
      if (!ship.splineActive || Math.random() < 0.05) {
        issueMoveCommand(ship, activeTarget.pos, (ship.maxSpeed || 1000.0) * 0.75);
      }
    }
    return;
  }

  // --------------------------------------------------------------------------
  // STATE_RETURNING_TO_PATROL: High-speed retro-burn back to anchor
  // --------------------------------------------------------------------------
  if (state.behaviorState === STATE_RETURNING_TO_PATROL) {
    // Resuming Patrol: When returning NPC reaches within 0.75 * R_patrol of anchor
    if (distToAnchor <= RESUME_PATROL_RATIO * state.patrolRadius) {
      state.behaviorState = STATE_PATROL_ROAM;
      ship.combatStance = 'AGGRESSIVE';
      state.targetEntityId = null;
      ship.targetEntityId = null;

      // Generate a new random wander waypoint within the origin perimeter and resume normal patrol duties
      const wp = generateWanderWaypoint(
        state.anchorX,
        state.anchorY,
        state.patrolRadius,
        state.minPatrolRadius,
        state.maxPatrolRadius
      );
      state.currentWanderTarget = wp;
      state.dwellTicksRemaining = 0;
      const cruiseSpeed = 0.50 * (ship.maxSpeed || 1000.0);
      issueMoveCommand(ship, wp, cruiseSpeed);
      return;
    }

    // Ensure ship is actively burning toward anchor at high speed
    if (!ship.splineActive) {
      issueMoveCommand(ship, { x: state.anchorX, y: state.anchorY }, ship.maxSpeed || 1000.0);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 3. GRAVITY WELL INFILTRATION & BELT PICKET ENGAGEMENT TRIGGER
  // --------------------------------------------------------------------------
  if (state.behaviorState === STATE_PATROL_ROAM) {
    // Purge open-space radar triggers:
    // - Moored well defenders ONLY engage if player crossed inside physical gravity well boundary
    // - Belt pickets ONLY engage if player entered local patrol sector (D <= R_patrol ~ 3,000 km)
    const assignedWell = getAssignedCelestialWell(ship, solarSystem);
    const intruder = assignedWell
      ? evaluateWellDefenseEngagement(ship, assignedWell, allShips)
      : evaluateBeltDefenseEngagement(ship, allShips);

    if (intruder) {
      // 1. Interrupt STATE_PATROL_ROAM
      clearShipMovement(ship);
      state.currentWanderTarget = null;
      state.dwellTicksRemaining = 0;

      // 2. Switch state to STATE_PURSUIT_ENGAGE
      state.behaviorState = STATE_PURSUIT_ENGAGE;

      // 3. Lock targetEntityId = intruder.id
      state.targetEntityId = intruder.id;
      ship.targetEntityId = intruder.id;

      // 4. Slew vessel heading directly toward intruder
      const tDx = intruder.pos.x - ship.pos.x;
      const tDy = intruder.pos.y - ship.pos.y;
      const targetAngle = Math.atan2(tDy, tDx);
      const maxSlewRateRad = ((ship.angularSlewRate ?? 25.0) * Math.PI) / 180.0;
      ship.heading = clampAngularSlew(ship.heading, targetAngle, maxSlewRateRad, dt);

      // 5. Engage offensive missile tubes and laser/graser arrays according to standard combat range tables
      ship.combatStance = 'AGGRESSIVE';
      ship.autoFire = true;

      // Plot pursuit burn
      issueMoveCommand(ship, intruder.pos, (ship.maxSpeed || 1000.0) * 0.75);
      return;
    }

    // ------------------------------------------------------------------------
    // 2. SMOOTH ROAMING & PROCEDURAL WANDERING PIPELINE
    // ------------------------------------------------------------------------
    // Holding station during dwell timer (zero burn)
    if (state.dwellTicksRemaining > 0) {
      state.dwellTicksRemaining--;
      ship.velocity.x = 0;
      ship.velocity.y = 0;
      ship.splineActive = false;
      return;
    }

    // If vessel has reached its current waypoint or has no active order, plot new wander burn
    if (!ship.splineActive || !state.currentWanderTarget) {
      // Generate uniform random polar coordinate within patrol boundary
      const wp = generateWanderWaypoint(
        state.anchorX,
        state.anchorY,
        state.patrolRadius,
        state.minPatrolRadius,
        state.maxPatrolRadius
      );
      state.currentWanderTarget = wp;

      // Plot a smooth kinematic cruise burn directly to (W_X, W_Y) using unit's standard slew rate
      // and cruise acceleration curve (v_cruise = 0.50 * v_max)
      const cruiseSpeed = 0.50 * (ship.maxSpeed || 1000.0);
      issueMoveCommand(ship, wp, cruiseSpeed);
    }
  }
}

/**
 * Alias for updateNPCPatrol to match interface naming conventions
 */
export const updateNPCPatrolStateMachine = updateNPCPatrol;
