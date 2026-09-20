import {
  ShipEntity,
  StructureType,
  Vec2D,
  BuilderState,
  ConstructionScaffold,
  RockyPlanet,
  GasGiant,
  CombatLogEntry,
} from '../types';
import { STRUCTURE_CATALOG } from './structures';
import { issueMoveCommand, clearShipMovement } from './movementController';

export const BUILDER_CARGO_MAX_METALLIC = 5000;
export const BUILDER_CARGO_MAX_ORGANIC = 5000;
export const BUILDER_TOTAL_CARGO_CAPACITY = 10000;
export const BUILDER_FABRICATION_DISTANCE = 120.0; // D <= 120px fabrication distance
export const BUILDER_DOCKING_DISTANCE = 120.0;
export const BUILDER_DEPOSIT_DURATION = 1.8; // Brief welding & nanite assembly phase per deposit

export interface BuilderContext {
  ships: ShipEntity[];
  hq: ShipEntity | null;
  addLog: (type: CombatLogEntry['type'], message: string, severity?: CombatLogEntry['severity']) => void;
  findHostPlanetForPosition: (pos: Vec2D) => RockyPlanet | GasGiant | null;
  onStructureCompleted?: (structure: ShipEntity) => void;
}

/**
 * Helper to compute distance between two 2D points
 */
function dist(a: Vec2D, b: Vec2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Launches dynamic Hermite/Bezier spline transit for a Builder ship towards a target position
 */
export function launchBuilderTransit(
  builder: ShipEntity,
  targetPos: Vec2D,
  speedBoost = 1.0
): void {
  const speed = Math.max(builder.maxSpeed * speedBoost, 140.0);
  issueMoveCommand(builder, targetPos, speed);
}

/**
 * Synchronizes scaffold progress fields and moored coordinates
 */
export function syncScaffoldEntity(ghost: ShipEntity): void {
  ghost.worldX = ghost.pos.x;
  ghost.worldY = ghost.pos.y;

  if (!ghost.scaffold) {
    ghost.scaffold = {
      id: ghost.id,
      structureType: ghost.structureType || ghost.role,
      worldX: ghost.pos.x,
      worldY: ghost.pos.y,
      depositedM: ghost.depositedM ?? 0,
      totalM: ghost.totalM ?? 1,
      depositedO: ghost.depositedO ?? 0,
      totalO: ghost.totalO ?? 1,
      assignedBuilderId: ghost.assignedBuilderId || null,
    };
  } else {
    ghost.scaffold.worldX = ghost.pos.x;
    ghost.scaffold.worldY = ghost.pos.y;
    ghost.scaffold.depositedM = ghost.depositedM ?? ghost.scaffold.depositedM;
    ghost.scaffold.totalM = ghost.totalM ?? ghost.scaffold.totalM;
    ghost.scaffold.depositedO = ghost.depositedO ?? ghost.scaffold.depositedO;
    ghost.scaffold.totalO = ghost.totalO ?? ghost.scaffold.totalO;
    ghost.scaffold.assignedBuilderId = ghost.assignedBuilderId ?? ghost.scaffold.assignedBuilderId;
  }
}

/**
 * Checks builder materials stored and initializes safe defaults if needed
 */
export function ensureBuilderHold(builder: ShipEntity): {
  metallic: number;
  organic: number;
  maxM: number;
  maxO: number;
  maxTotal: number;
} {
  if (!builder.materialsStored) {
    builder.materialsStored = {
      metallic: 5000,
      metallicMax: 5000,
      organic: 5000,
      organicMax: 5000,
      ore: 0,
      oreMax: 5000,
    };
  }

  const maxM = builder.materialsStored.metallicMax || BUILDER_CARGO_MAX_METALLIC;
  const maxO = builder.materialsStored.organicMax || BUILDER_CARGO_MAX_ORGANIC;
  const maxTotal = BUILDER_TOTAL_CARGO_CAPACITY;

  return {
    metallic: builder.materialsStored.metallic,
    organic: builder.materialsStored.organic,
    maxM,
    maxO,
    maxTotal,
  };
}

/**
 * Dispatches a construction order to the Builder ship for one of the 7 specialized static orbital structures.
 * Implements Immediate Initial Departure logic.
 */
export function orderBuilderConstruct(
  builderId: string,
  structureType: StructureType,
  targetPos: Vec2D,
  context: BuilderContext,
  createGhostFn: (
    type: StructureType,
    pos: Vec2D,
    hostPlanet: RockyPlanet | GasGiant,
    builderId: string
  ) => ShipEntity
): boolean {
  const builder = context.ships.find((s) => s.id === builderId);
  if (!builder || builder.role !== 'BUILDER' || builder.hullState !== 'OPERATIONAL') {
    context.addLog('LOGISTICS', 'Construction rejected: Builder unit offline or unavailable.', 'warn');
    return false;
  }

  // Validation: Structures CAN ONLY be designated inside a Planetary Gravity Well (within 3x planetary radius perimeter).
  const hostPlanet = context.findHostPlanetForPosition(targetPos);
  if (!hostPlanet) {
    context.addLog(
      'LOGISTICS',
      'Placement Rejected: Orbital structures can only be anchored within a planetary gravity well (within 3x planetary radius)!',
      'warn'
    );
    return false;
  }

  const def = STRUCTURE_CATALOG[structureType];
  if (!def) return false;

  // Check builder internal materials
  const hold = ensureBuilderHold(builder);
  const heldM = hold.metallic;
  const heldO = hold.organic;

  const hq = context.hq;
  const hqMet = hq?.resources?.metallic || 0;
  const hqOrg = hq?.resources?.organic || 0;

  // If system has 0 materials everywhere and can't even supply 1 unit
  if (heldM === 0 && heldO === 0 && hqMet === 0 && hqOrg === 0) {
    context.addLog(
      'LOGISTICS',
      `Construction Order Queued with Warning: Zero materials in Builder hold and HQ vault. Builder will moor at HQ awaiting refinery output.`,
      'warn'
    );
  }

  // Create ghost blueprint structure / scaffold entity
  const ghost = createGhostFn(structureType, targetPos, hostPlanet, builder.id);
  ghost.depositedM = 0;
  ghost.totalM = def.costMetallic;
  ghost.depositedO = 0;
  ghost.totalO = def.costOrganic;
  ghost.worldX = ghost.pos.x;
  ghost.worldY = ghost.pos.y;
  ghost.assignedBuilderId = builder.id;
  syncScaffoldEntity(ghost);

  context.ships.push(ghost);

  builder.targetStructureId = ghost.id;
  builder.targetStructureType = structureType;
  builder.targetStructurePos = { ...ghost.pos };
  builder.builderStatusTag = undefined;

  // 1. Immediate Initial Departure:
  // The Builder immediately transits to the site (STATE_TRANSIT_TO_SCAFFOLD) using initial held resources.
  // If hold is completely empty, it sets STATE_RETURNING_TO_HQ to restock before proceeding.
  if (heldM > 0 || heldO > 0) {
    builder.builderState = 'STATE_TRANSIT_TO_SCAFFOLD';
    ghost.constructionState = 'TRANSITING';
    launchBuilderTransit(builder, ghost.pos);
    context.addLog(
      'LOGISTICS',
      `📐 Blueprint projected: [${def.name}] scaffold anchored at ${hostPlanet.name} orbit. Forge-Builder en route with initial cargo (${heldM} Met, ${heldO} Org).`,
      'info'
    );
  } else {
    builder.builderState = 'STATE_RETURNING_TO_HQ';
    ghost.constructionState = 'PENDING_RESTOCK';

    const hqPos = hq ? hq.pos : { x: 0, y: 0 };
    const distToHq = dist(builder.pos, hqPos);
    const dockingThreshold = (hq?.dockingRadius || 150.0) + 70.0;

    if (distToHq <= dockingThreshold) {
      // Already at HQ: Attempt initial cargo load immediately
      executeHqResupplyTranche(builder, ghost, context);
    } else {
      launchBuilderTransit(builder, hqPos);
      context.addLog(
        'LOGISTICS',
        `🔄 Hold empty: Builder ferrying to HQ for initial cargo tranche before site transit.`,
        'info'
      );
    }
  }

  return true;
}

/**
 * Executes a cargo transfer tranche from HQ into the Builder hold, capped by remaining capacity.
 * Follows Section 2.4 mathematical specification.
 */
export function executeHqResupplyTranche(
  builder: ShipEntity,
  scaffold: ShipEntity,
  context: BuilderContext
): boolean {
  const hq = context.hq;
  if (!hq || !hq.resources) return false;

  const hold = ensureBuilderHold(builder);

  const totalM = scaffold.totalM ?? 0;
  const totalO = scaffold.totalO ?? 0;
  const depM = scaffold.depositedM ?? 0;
  const depO = scaffold.depositedO ?? 0;

  // remM = scaffold.totalM - scaffold.depositedM - builder.heldM
  // remO = scaffold.totalO - scaffold.depositedO - builder.heldO
  const remM = Math.max(0, totalM - depM - builder.materialsStored!.metallic);
  const remO = Math.max(0, totalO - depO - builder.materialsStored!.organic);

  if (remM <= 0 && remO <= 0) {
    // No further materials needed for this structure!
    if (builder.materialsStored!.metallic > 0 || builder.materialsStored!.organic > 0) {
      builder.builderState = 'STATE_TRANSIT_TO_SCAFFOLD';
      scaffold.constructionState = 'TRANSITING';
      builder.targetStructurePos = { ...scaffold.pos };
      launchBuilderTransit(builder, scaffold.pos);
      return true;
    }
    builder.builderState = 'STATE_BUILDER_IDLE';
    return false;
  }

  // cargoSpace = builder.maxCargo - (builder.heldM + builder.heldO)
  const heldTotal = builder.materialsStored!.metallic + builder.materialsStored!.organic;
  const cargoSpace = Math.max(0, hold.maxTotal - heldTotal);

  const isPrePaid = (scaffold.costPaidM !== undefined && scaffold.costPaidM > 0) ||
                    (scaffold.costPaidO !== undefined && scaffold.costPaidO > 0) ||
                    (scaffold.scaffold?.costPaidM !== undefined && scaffold.scaffold?.costPaidM > 0);

  let transferM = 0;
  let transferO = 0;

  if (isPrePaid) {
    const spaceM = Math.min(cargoSpace, Math.max(0, hold.maxM - builder.materialsStored!.metallic));
    transferM = Math.min(remM, spaceM);

    const remainingSpaceForO = Math.max(0, cargoSpace - transferM);
    const spaceO = Math.min(remainingSpaceForO, Math.max(0, hold.maxO - builder.materialsStored!.organic));
    transferO = Math.min(remO, spaceO);

    if (transferM > 0 || transferO > 0) {
      builder.materialsStored!.metallic += transferM;
      builder.materialsStored!.organic += transferO;
      builder.builderStatusTag = undefined;

      context.addLog(
        'LOGISTICS',
        `📦 ${builder.name}: Loaded pre-allocated tranche +${transferM} Met, +${transferO} Org from HQ silos. Hold: ${builder.materialsStored!.metallic}/${builder.materialsStored!.organic}.`,
        'info'
      );
    }
  } else {
    const spaceM = Math.min(cargoSpace, Math.max(0, hold.maxM - builder.materialsStored!.metallic));
    const hqStockM = Math.floor(Math.max(0, hq.resources.metallic));
    transferM = Math.min(hqStockM, remM, spaceM);

    const remainingSpaceForO = Math.max(0, cargoSpace - transferM);
    const spaceO = Math.min(remainingSpaceForO, Math.max(0, hold.maxO - builder.materialsStored!.organic));
    const hqStockO = Math.floor(Math.max(0, hq.resources.organic));
    transferO = Math.min(hqStockO, remO, spaceO);

    if (transferM > 0 || transferO > 0) {
      builder.materialsStored!.metallic += transferM;
      builder.materialsStored!.organic += transferO;
      hq.resources.metallic -= transferM;
      hq.resources.organic -= transferO;
      builder.builderStatusTag = undefined;

      context.addLog(
        'LOGISTICS',
        `📦 ${builder.name}: Loaded tranche +${transferM} Met, +${transferO} Org from HQ. Hold: ${builder.materialsStored!.metallic}/${builder.materialsStored!.organic}.`,
        'info'
      );
    }
  }

  // Check if builder has materials to deliver
  const currentHeldTotal = builder.materialsStored!.metallic + builder.materialsStored!.organic;
  if (currentHeldTotal > 0) {
    // Automatically set target to the in-progress scaffold and switch state to STATE_TRANSIT_TO_SCAFFOLD
    builder.builderState = 'STATE_TRANSIT_TO_SCAFFOLD';
    scaffold.constructionState = 'TRANSITING';
    builder.targetStructurePos = { ...scaffold.pos };
    builder.builderStatusTag = undefined;
    launchBuilderTransit(builder, scaffold.pos);

    context.addLog(
      'LOGISTICS',
      `🚀 ${builder.name}: Resupply complete. Returning to orbital construction site with materials...`,
      'info'
    );
    return true;
  } else {
    // Deficit Stall Guard:
    // If HQ reserves are currently 0, the builder holds station in STATE_RETURNING_TO_HQ with "AWAITING HQ MATERIALS"
    // tag until HQ stockpiles replenish, holding absolute station (v=0, omega=0)
    builder.builderState = 'STATE_RETURNING_TO_HQ';
    builder.builderStatusTag = 'AWAITING HQ MATERIALS';
    builder.velocity = { x: 0, y: 0 };
    if (builder.angularVelocity !== undefined) {
      builder.angularVelocity = 0;
    }
    builder.splineActive = false;
    scaffold.constructionState = 'PENDING_RESTOCK';
    return false;
  }
}

/**
 * Main update routine for all Builder ships.
 * Runs each frame to advance the cyclic ferry routine.
 */
export function updateBuilderLogistics(dt: number, context: BuilderContext): void {
  for (const builder of context.ships) {
    if (builder.role !== 'BUILDER' || builder.hullState !== 'OPERATIONAL') continue;

    // Normalizing legacy builder state strings
    let state = builder.builderState || 'STATE_BUILDER_IDLE';
    if (state === 'STATE_IDLE') state = 'STATE_BUILDER_IDLE';
    if (state === 'BUILD_TRANSIT_TO_SITE' || state === 'STATE_TRANSIT_SITE' || state === 'STATE_TRANSIT') {
      state = 'STATE_TRANSIT_TO_SCAFFOLD';
    }
    if (state === 'BUILD_DEPOSIT_RESOURCES' || state === 'STATE_BUILDING') {
      state = 'STATE_CONSTRUCTING';
    }
    if (state === 'BUILD_FERRY_TO_HQ' || state === 'BUILD_RESUPPLY_AT_HQ' || state === 'STATE_RESTOCK') {
      state = 'STATE_RETURNING_TO_HQ';
    }
    builder.builderState = state;

    // -------------------------------------------------------------
    // DEDICATED STATE: STATE_BUILDER_IDLE
    // Holds absolute station (v = 0, omega = 0) at current position or HQ mooring dock.
    // -------------------------------------------------------------
    if (state === 'STATE_BUILDER_IDLE') {
      builder.velocity = { x: 0, y: 0 };
      if (builder.angularVelocity !== undefined) {
        builder.angularVelocity = 0;
      }
      builder.splineActive = false;
      builder.isMoored = true;
      builder.isHoldingVector = true;
      builder.builderStatusTag = undefined;
      continue;
    }

    // Verify target structure / scaffold existence if active
    let scaffold: ShipEntity | undefined;
    if (builder.targetStructureId) {
      scaffold = context.ships.find((s) => s.id === builder.targetStructureId);
      if (!scaffold || scaffold.hullState === 'DESTROYED') {
        context.addLog(
          'LOGISTICS',
          `⚠️ ${builder.name}: Construction scaffold lost or demolished. Aborting builder task.`,
          'warn'
        );
        builder.builderState = 'STATE_BUILDER_IDLE';
        builder.targetStructureId = undefined;
        builder.targetStructurePos = undefined;
        builder.targetStructureType = undefined;
        builder.constructionTimer = undefined;
        builder.builderStatusTag = undefined;
        builder.velocity = { x: 0, y: 0 };
        if (builder.angularVelocity !== undefined) {
          builder.angularVelocity = 0;
        }
        builder.splineActive = false;
        continue;
      }

      // Sync moored coordinates: ensure worldX / worldY and targetStructurePos track the orbiting planet
      syncScaffoldEntity(scaffold);
      builder.targetStructurePos = { ...scaffold.pos };

      // If spline is active towards site, track orbiting scaffold coordinates dynamically
      if (builder.splineActive && state === 'STATE_TRANSIT_TO_SCAFFOLD') {
        builder.splineP1.x = scaffold.pos.x;
        builder.splineP1.y = scaffold.pos.y;
      }
    }

    // -------------------------------------------------------------
    // DEDICATED STATE: STATE_TRANSIT_TO_SCAFFOLD
    // Navigates along plotted dynamic spline directly to the target construction site.
    // -------------------------------------------------------------
    if (state === 'STATE_TRANSIT_TO_SCAFFOLD') {
      if (!scaffold) {
        builder.builderState = 'STATE_BUILDER_IDLE';
        builder.velocity = { x: 0, y: 0 };
        if (builder.angularVelocity !== undefined) {
          builder.angularVelocity = 0;
        }
        builder.splineActive = false;
        continue;
      }

      builder.builderStatusTag = 'TRANSIT TO SCAFFOLD';
      const distToSite = dist(builder.pos, scaffold.pos);
      const isArrival =
        distToSite <= BUILDER_FABRICATION_DISTANCE || (!builder.splineActive && distToSite <= 150.0);

      if (isArrival) {
        // Arrived on site within fabrication distance (D <= 120px)! Transition to STATE_CONSTRUCTING
        builder.builderState = 'STATE_CONSTRUCTING';
        builder.constructionTimer = BUILDER_DEPOSIT_DURATION;
        builder.splineActive = false;
        builder.velocity = { x: 0, y: 0 };
        if (builder.angularVelocity !== undefined) {
          builder.angularVelocity = 0;
        }
        builder.heading = Math.atan2(scaffold.pos.y - builder.pos.y, scaffold.pos.x - builder.pos.x);
        scaffold.constructionState = 'BUILDING';

        context.addLog(
          'LOGISTICS',
          `⚡ ${builder.name}: Docked at scaffold within fabrication distance (D <= 120px). Initiating assembly beam cycle...`,
          'info'
        );
      }
    }

    // -------------------------------------------------------------
    // DEDICATED STATE: STATE_CONSTRUCTING
    // Holds stationary position within fabrication distance (D <= 120px) of scaffold while running assembly beam cycle.
    // -------------------------------------------------------------
    else if (state === 'STATE_CONSTRUCTING') {
      if (!scaffold) {
        builder.builderState = 'STATE_BUILDER_IDLE';
        builder.velocity = { x: 0, y: 0 };
        if (builder.angularVelocity !== undefined) {
          builder.angularVelocity = 0;
        }
        builder.splineActive = false;
        continue;
      }

      builder.builderStatusTag = 'CONSTRUCTING';
      builder.velocity = { x: 0, y: 0 };
      if (builder.angularVelocity !== undefined) {
        builder.angularVelocity = 0;
      }
      builder.splineActive = false;
      builder.heading = Math.atan2(scaffold.pos.y - builder.pos.y, scaffold.pos.x - builder.pos.x);

      // Advance assembly deposit timer
      builder.constructionTimer = (builder.constructionTimer ?? BUILDER_DEPOSIT_DURATION) - dt;

      if ((builder.constructionTimer ?? 0) <= 0) {
        const hold = ensureBuilderHold(builder);
        const neededM = Math.max(0, (scaffold.totalM ?? 0) - (scaffold.depositedM ?? 0));
        const neededO = Math.max(0, (scaffold.totalO ?? 0) - (scaffold.depositedO ?? 0));

        const deltaM = Math.min(hold.metallic, neededM);
        const deltaO = Math.min(hold.organic, neededO);

        scaffold.depositedM = (scaffold.depositedM ?? 0) + deltaM;
        scaffold.depositedO = (scaffold.depositedO ?? 0) + deltaO;
        builder.materialsStored!.metallic = Math.max(0, hold.metallic - deltaM);
        builder.materialsStored!.organic = Math.max(0, hold.organic - deltaO);

        const totalReq = (scaffold.totalM ?? 0) + (scaffold.totalO ?? 0);
        const totalDep = (scaffold.depositedM ?? 0) + (scaffold.depositedO ?? 0);
        const progress = Math.min(1.0, totalDep / Math.max(1, totalReq));

        const duration = scaffold.constructionDuration ?? 5.0;
        scaffold.constructionProgress = progress;
        scaffold.constructionOpacity = 0.15 + 0.85 * progress;
        scaffold.constructionTimeRemaining = Math.max(0, duration * (1.0 - progress));
        syncScaffoldEntity(scaffold);

        context.addLog(
          'LOGISTICS',
          `⚡ ${builder.name}: Deposited +${Math.round(deltaM)} Met, +${Math.round(deltaO)} Org into [${scaffold.name}]. Progress: ${(progress * 100).toFixed(0)}% (${scaffold.depositedM}/${scaffold.totalM} Met, ${scaffold.depositedO}/${scaffold.totalO} Org).`,
          'info'
        );

        const isComplete =
          (scaffold.depositedM ?? 0) >= (scaffold.totalM ?? 0) &&
          (scaffold.depositedO ?? 0) >= (scaffold.totalO ?? 0);

        if (isComplete) {
          scaffold.isUnderConstruction = false;
          scaffold.constructionState = 'COMPLETED';
          scaffold.constructionOpacity = 1.0;
          scaffold.constructionProgress = 1.0;
          scaffold.constructionTimeRemaining = 0;
          syncScaffoldEntity(scaffold);

          context.addLog(
            'LOGISTICS',
            `🏗️ CONSTRUCTION COMPLETE: [${scaffold.name}] is now 100% operational in orbital mooring!`,
            'info'
          );

          context.onStructureCompleted?.(scaffold);

          builder.builderState = 'STATE_BUILDER_IDLE';
          builder.targetStructureId = undefined;
          builder.targetStructurePos = undefined;
          builder.targetStructureType = undefined;
          builder.constructionTimer = undefined;
          builder.builderStatusTag = undefined;
          builder.velocity = { x: 0, y: 0 };
          if (builder.angularVelocity !== undefined) {
            builder.angularVelocity = 0;
          }
          builder.splineActive = false;
        } else {
          // Structure requires additional resources: transition to STATE_RETURNING_TO_HQ
          const remM = (scaffold.totalM ?? 0) - (scaffold.depositedM ?? 0);
          const remO = (scaffold.totalO ?? 0) - (scaffold.depositedO ?? 0);

          context.addLog(
            'LOGISTICS',
            `🔄 ${builder.name}: Scaffold tranche fulfilled. Remaining deficit: ${remM} Met, ${remO} Org. Commencing STATE_RETURNING_TO_HQ.`,
            'info'
          );

          builder.builderState = 'STATE_RETURNING_TO_HQ';
          scaffold.constructionState = 'PENDING_RESTOCK';

          const hq = context.hq;
          const hqPos = hq ? hq.pos : { x: 0, y: 0 };
          launchBuilderTransit(builder, hqPos);
        }
      }
    }

    // -------------------------------------------------------------
    // DEDICATED STATE: STATE_RETURNING_TO_HQ
    // Navigates along dynamic spline back to the primary HQ silo to reload materials or hold reserve standby.
    // -------------------------------------------------------------
    else if (state === 'STATE_RETURNING_TO_HQ') {
      const hq = context.hq;
      const hqPos = hq ? hq.pos : { x: 0, y: 0 };
      const distToHq = dist(builder.pos, hqPos);
      const dockingRadius = hq?.dockingRadius || 150.0;
      const dockingThreshold = dockingRadius + 70.0;

      const isHqArrival = distToHq <= dockingThreshold || (!builder.splineActive && distToHq <= dockingRadius + 30.0);

      if (isHqArrival) {
        builder.splineActive = false;
        builder.velocity = { x: 0, y: 0 };
        if (builder.angularVelocity !== undefined) {
          builder.angularVelocity = 0;
        }

        if (scaffold) {
          executeHqResupplyTranche(builder, scaffold, context);
        } else {
          builder.builderState = 'STATE_BUILDER_IDLE';
          builder.builderStatusTag = undefined;
        }
      }
    }
  }
}
