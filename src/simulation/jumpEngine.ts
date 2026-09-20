import { ShipEntity, Vec2D, JumpState, JumpTransitData } from '../types';

export const JUMP_CONFIG = {
  spoolDurationSec: 3.0,          // 90 Ticks at 30Hz
  spoolTicks: 90,                 // 90 Ticks = 3.0 Seconds
  cooldownDurationSec: 15.0,      // 15.0s thermal recharge
  transitSpeedMultiplier: 64.0,   // 64x cruise speed
  minSublightBaseSpeed: 50.0,
  defaultSystemDiameter: 60000.0,
};

export {
  type JumpState,
  type JumpTransitData,
};

/**
 * Resolves the closest star system ID to a given world coordinate.
 */
export function resolveSystemIdAt(
  pos: Vec2D,
  systems?: { id: string; center: Vec2D }[]
): string {
  if (!systems || systems.length === 0) return 'system-0';
  let nearestId = systems[0].id;
  let minDistSq = Infinity;
  for (const sys of systems) {
    const dx = pos.x - sys.center.x;
    const dy = pos.y - sys.center.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      nearestId = sys.id;
    }
  }
  return nearestId;
}

/**
 * Calculates Hydrogen Propellant cost based on jump distance across the star system.
 * Baseline: System diameter costs 1,000 Hydrogen.
 * Actual Cost = Math.ceil((targetDistance / systemDiameter) * 1000)
 */
export function calculateJumpCost(
  origin: Vec2D,
  target: Vec2D,
  systemDiameter: number = JUMP_CONFIG.defaultSystemDiameter
): number {
  const dist = Math.hypot(target.x - origin.x, target.y - origin.y);
  return Math.max(1, Math.ceil((dist / Math.max(1000, systemDiameter)) * 1000.0));
}

/**
 * Evaluates whether coordinates fall inside the Asteroid Belt Interdiction Zone.
 */
export function isInsideInterdictionZone(pos: Vec2D, ftlInterdictionRadius: number): boolean {
  return Math.hypot(pos.x, pos.y) <= ftlInterdictionRadius;
}

export interface JumpAuditResult {
  valid: boolean;
  reason?: string;
  fuelCost: number;
  jumpDist: number;
}

/**
 * Audits a ship entity's readiness to engage hyperspace micro-jump.
 * Enforces hardware state, recharge cooldowns, interdiction boundaries, and H2 fuel reserve gates.
 */
export function auditJumpViability(
  ship: ShipEntity,
  targetPos: Vec2D,
  ftlInterdictionRadius: number,
  systemDiameter: number = JUMP_CONFIG.defaultSystemDiameter
): JumpAuditResult {
  const jumpDist = Math.hypot(targetPos.x - ship.pos.x, targetPos.y - ship.pos.y);
  const fuelCost = calculateJumpCost(ship.pos, targetPos, systemDiameter);

  if (!ship || ship.hullState !== 'OPERATIONAL' || ship.isStationary) {
    return { valid: false, reason: 'Stationary, crippled, or invalid vessel', fuelCost, jumpDist };
  }

  if (ship.jumpState === 'SPOOLING') {
    return { valid: false, reason: 'Drive is already spooling', fuelCost, jumpDist };
  }
  if (ship.jumpState === 'IN_TRANSIT' || ship.jumpState === 'TRANSIT') {
    return { valid: false, reason: 'Drive is currently in active translation', fuelCost, jumpDist };
  }
  if (ship.jumpCooldownTimer && ship.jumpCooldownTimer > 0) {
    return { valid: false, reason: `Recharge cooldown (${ship.jumpCooldownTimer.toFixed(1)}s remaining)`, fuelCost, jumpDist };
  }

  // 1. Origin Interdiction Zone Check
  if (isInsideInterdictionZone(ship.pos, ftlInterdictionRadius)) {
    return { valid: false, reason: 'Origin inside Asteroid Belt Interdiction Zone', fuelCost, jumpDist };
  }

  // 2. Target Destination Interdiction Zone Check
  if (isInsideInterdictionZone(targetPos, ftlInterdictionRadius)) {
    return { valid: false, reason: 'Destination inside Asteroid Belt Interdiction Zone', fuelCost, jumpDist };
  }

  // 3. Hydrogen Propellant Gate
  if (ship.h2Fuel < fuelCost) {
    return { valid: false, reason: `Insufficient H2 propellant (${Math.round(ship.h2Fuel)}t available, ${fuelCost}t required)`, fuelCost, jumpDist };
  }

  return { valid: true, fuelCost, jumpDist };
}

/**
 * Initiates single-vessel hyperspace micro-jump spooling sequence.
 * Step 1: Spooling Phase (90 Ticks = 3.0 Seconds).
 * - Ship stops and aligns nose toward destination angle theta_dest.
 * - Deducts hydrogen fuel cost upfront from the jumping vessel.
 * - Initializes JumpTransitData for physical 64x transit.
 */
export function initiateSingleJump(
  ship: ShipEntity,
  targetPos: Vec2D,
  ftlInterdictionRadius: number,
  systemDiameter: number = JUMP_CONFIG.defaultSystemDiameter,
  systems?: { id: string; center: Vec2D }[],
  addLog?: (category: any, text: string, severity?: 'info' | 'warn' | 'crit' | 'success') => void
): { success: boolean; reason?: string } {
  const audit = auditJumpViability(ship, targetPos, ftlInterdictionRadius, systemDiameter);
  if (!audit.valid) {
    addLog?.('MICROJUMP', `⛔ ${ship.name}: Jump Aborted — ${audit.reason}`, 'warn');
    return { success: false, reason: audit.reason };
  }

  const originSystemId = resolveSystemIdAt(ship.pos, systems);
  const targetSystemId = resolveSystemIdAt(targetPos, systems);

  const dx = targetPos.x - ship.pos.x;
  const dy = targetPos.y - ship.pos.y;
  const totalDistance = Math.hypot(dx, dy);
  const transitVector: Vec2D = totalDistance > 0.001
    ? { x: dx / totalDistance, y: dy / totalDistance }
    : { x: 1, y: 0 };

  const cruiseSpeed = ship.cruiseSpeed || (ship.maxSpeed ? ship.maxSpeed * 0.7 : 100.0);
  const jumpSpeed = JUMP_CONFIG.transitSpeedMultiplier * cruiseSpeed; // 64 * cruiseSpeed

  // Deduct hydrogen fuel cost upfront from the jumping vessel
  ship.h2Fuel = Math.max(0, ship.h2Fuel - audit.fuelCost);

  // Initialize JumpTransitData
  ship.jumpTransitData = {
    originSystemId,
    targetSystemId,
    destinationPoint: { x: targetPos.x, y: targetPos.y },
    departurePoint: { x: ship.pos.x, y: ship.pos.y },
    transitVector,
    totalDistance,
    distanceTraveled: 0,
    jumpSpeed,
    spoolTicksRemaining: JUMP_CONFIG.spoolTicks,
    formationOffset: { x: 0, y: 0 },
  };

  ship.jumpState = 'SPOOLING';
  ship.jumpSpoolTimer = JUMP_CONFIG.spoolDurationSec;
  ship.jumpSpoolDuration = JUMP_CONFIG.spoolDurationSec;
  ship.jumpTarget = { x: targetPos.x, y: targetPos.y };
  ship.jumpOrigin = { x: ship.pos.x, y: ship.pos.y };
  ship.jumpFuelCost = audit.fuelCost;
  ship.jumpTransitDistance = totalDistance;

  // Align nose toward destination angle theta_dest and halt sublight drift
  ship.splineActive = false;
  ship.velocity = { x: 0, y: 0 };
  ship.heading = Math.atan2(transitVector.y, transitVector.x);

  const isBelowReserve = (ship.h2Fuel / Math.max(1, ship.h2FuelMax)) < ship.fuelReserveRule;
  addLog?.(
    'MICROJUMP',
    `⚡ ${ship.name}: Jump Drive SPOOL-UP [${JUMP_CONFIG.spoolDurationSec.toFixed(1)}s / 90 Ticks]. Vector: (${Math.round(targetPos.x)}, ${Math.round(targetPos.y)}) [${Math.round(totalDistance)}km]. Upfront H2 Burned: ${audit.fuelCost}t. Speed: 64x (${Math.round(jumpSpeed)} km/s).${isBelowReserve ? ' [CRITICAL: <40% FTL LOCKED]' : ''}`,
    isBelowReserve ? 'crit' : 'info'
  );

  return { success: true };
}

/**
 * SYNCHRONIZED MULTI-SHIP / FLEET HYPERSPACE JUMP
 * Executes simultaneous spool-up and lockstep transit across all participating vessels.
 * Preserves formation offset coordinates at destination and checks hydrogen fuel gates per vessel.
 */
export function initiateSynchronizedFleetJump(
  flagship: ShipEntity,
  escorts: ShipEntity[],
  targetPos: Vec2D,
  ftlInterdictionRadius: number,
  systemDiameter: number = JUMP_CONFIG.defaultSystemDiameter,
  systems?: { id: string; center: Vec2D }[],
  addLog?: (category: any, text: string, severity?: 'info' | 'warn' | 'crit' | 'success') => void
): { success: boolean; jumpedCount: number; abortedCount: number; reason?: string } {
  // Flagship must pass viability checks
  const flagAudit = auditJumpViability(flagship, targetPos, ftlInterdictionRadius, systemDiameter);
  if (!flagAudit.valid) {
    addLog?.(
      'MICROJUMP',
      `⛔ Fleet Jump Aborted: Flagship ${flagship.name} cannot jump — ${flagAudit.reason}`,
      'warn'
    );
    return { success: false, jumpedCount: 0, abortedCount: escorts.length + 1, reason: flagAudit.reason };
  }

  let jumpedCount = 0;
  let abortedCount = 0;

  // 1. Spool Flagship
  const flagRes = initiateSingleJump(flagship, targetPos, ftlInterdictionRadius, systemDiameter, systems, addLog);
  if (flagRes.success) {
    jumpedCount++;
  } else {
    return { success: false, jumpedCount: 0, abortedCount: escorts.length + 1, reason: flagRes.reason };
  }

  // 2. Compute arrival target for each escort with formation preservation
  for (let i = 0; i < escorts.length; i++) {
    const escort = escorts[i];
    if (!escort || escort.hullState === 'DESTROYED') continue;

    let formationOffset: Vec2D = { x: 0, y: 0 };
    if (escort.formationOffset) {
      formationOffset = { x: escort.formationOffset.x, y: escort.formationOffset.y };
    } else if (escort.formationCosAlpha !== undefined && escort.formationRadius !== undefined) {
      formationOffset = {
        x: escort.formationCosAlpha * escort.formationRadius,
        y: (escort.formationSinAlpha ?? 0) * escort.formationRadius,
      };
    } else {
      // Offset relative to flagship
      formationOffset = {
        x: escort.pos.x - flagship.pos.x,
        y: escort.pos.y - flagship.pos.y,
      };
    }

    const escortTargetPos: Vec2D = {
      x: targetPos.x + formationOffset.x,
      y: targetPos.y + formationOffset.y,
    };

    // Hydrogen fuel gate and interdiction audit per escort
    const escortAudit = auditJumpViability(escort, escortTargetPos, ftlInterdictionRadius, systemDiameter);
    if (!escortAudit.valid) {
      abortedCount++;
      addLog?.(
        'MICROJUMP',
        `⚠️ ${escort.name} (Escort): JUMP ABORTED — ${escortAudit.reason}. Escort remains in sublight space.`,
        'warn'
      );
      continue;
    }

    const escortOriginSys = resolveSystemIdAt(escort.pos, systems);
    const escortTargetSys = resolveSystemIdAt(escortTargetPos, systems);
    const edx = escortTargetPos.x - escort.pos.x;
    const edy = escortTargetPos.y - escort.pos.y;
    const eDist = Math.hypot(edx, edy);
    const eTv: Vec2D = eDist > 0.001 ? { x: edx / eDist, y: edy / eDist } : { x: 1, y: 0 };
    const eCruise = escort.cruiseSpeed || (escort.maxSpeed ? escort.maxSpeed * 0.7 : 100.0);
    const eJumpSpeed = JUMP_CONFIG.transitSpeedMultiplier * eCruise;

    // Deduct fuel upfront
    escort.h2Fuel = Math.max(0, escort.h2Fuel - escortAudit.fuelCost);

    escort.jumpTransitData = {
      originSystemId: escortOriginSys,
      targetSystemId: escortTargetSys,
      destinationPoint: { x: targetPos.x, y: targetPos.y },
      departurePoint: { x: escort.pos.x, y: escort.pos.y },
      transitVector: eTv,
      totalDistance: eDist,
      distanceTraveled: 0,
      jumpSpeed: eJumpSpeed,
      spoolTicksRemaining: JUMP_CONFIG.spoolTicks,
      formationOffset,
    };

    escort.jumpState = 'SPOOLING';
    escort.jumpSpoolTimer = JUMP_CONFIG.spoolDurationSec;
    escort.jumpSpoolDuration = JUMP_CONFIG.spoolDurationSec;
    escort.jumpTarget = escortTargetPos;
    escort.jumpOrigin = { x: escort.pos.x, y: escort.pos.y };
    escort.jumpFuelCost = escortAudit.fuelCost;
    escort.jumpTransitDistance = eDist;
    escort.splineActive = false;
    escort.velocity = { x: 0, y: 0 };
    escort.heading = Math.atan2(eTv.y, eTv.x);
    jumpedCount++;
  }

  addLog?.(
    'MICROJUMP',
    `⚡ SYNCHRONIZED FLEET JUMP: ${jumpedCount} vessels spooling simultaneously [${JUMP_CONFIG.spoolDurationSec.toFixed(1)}s]. Formation preservation locked for arrival at (${Math.round(targetPos.x)}, ${Math.round(targetPos.y)}).${abortedCount > 0 ? ` (${abortedCount} escorts aborted due to fuel/interdiction)` : ''}`,
    'success'
  );

  return { success: true, jumpedCount, abortedCount };
}

/**
 * Advances jump drive kinematics per simulation tick (30Hz).
 * Manages:
 * 1. Thermal recharge cooldown countdown
 * 2. Spool-up phase (90 ticks = 3.0s) with lethal interdiction enforcement
 * 3. Continuous physical cruise along straight-line vector at 64x cruise speed
 * 4. Emergence & Formation arrival: clamps coordinates to P_dest + O_formation, drops back to v_cruise, clears JumpTransitData
 */
export function stepShipJumpDrive(
  ship: ShipEntity,
  dt: number,
  ftlInterdictionRadius: number,
  systemDiameter: number = JUMP_CONFIG.defaultSystemDiameter,
  triggerCatastrophicBreach: (pos: Vec2D, name: string) => void,
  addLog?: (category: any, text: string, severity?: 'info' | 'warn' | 'crit' | 'success') => void
): boolean {
  // A. Cooldown & Thermal Recharge
  if (ship.jumpCooldownTimer && ship.jumpCooldownTimer > 0) {
    ship.jumpCooldownTimer -= dt;
    if (ship.jumpCooldownTimer <= 0) {
      ship.jumpCooldownTimer = 0;
      if (ship.jumpState === 'COOLDOWN') {
        ship.jumpState = 'IDLE';
        addLog?.('MICROJUMP', `🟢 ${ship.name}: Jump drive capacitors recharged. FTL ready.`, 'info');
      }
    }
  }

  // B. Step 1: Spooling Phase (90 Ticks = 3.0 Seconds)
  if (ship.jumpState === 'SPOOLING') {
    ship.jumpSpoolTimer = (ship.jumpSpoolTimer ?? JUMP_CONFIG.spoolDurationSec) - dt;
    if (ship.jumpTransitData) {
      ship.jumpTransitData.spoolTicksRemaining = Math.max(0, Math.round(ship.jumpSpoolTimer * 30));
    }

    // Keep vessel stationary and nose pointed along departure angle
    ship.velocity = { x: 0, y: 0 };
    ship.splineActive = false;
    if (ship.jumpTransitData) {
      ship.heading = Math.atan2(ship.jumpTransitData.transitVector.y, ship.jumpTransitData.transitVector.x);
    }

    if (ship.jumpSpoolTimer <= 0) {
      // Check lethal interdiction breach
      if (isInsideInterdictionZone(ship.pos, ftlInterdictionRadius)) {
        ship.hullHp = 0;
        ship.shieldHp = 0;
        ship.crippleBar = 0;
        ship.hullState = 'DESTROYED';
        ship.jumpState = 'IDLE';
        ship.jumpSpoolTimer = 0;
        ship.jumpTransitData = undefined;
        ship.splineActive = false;
        ship.velocity = { x: 0, y: 0 };
        triggerCatastrophicBreach(ship.pos, ship.name);
        addLog?.(
          'DESTROY',
          `💥 CATASTROPHIC FTL DRIVE FAILURE: ${ship.name} breached Asteroid Belt Interdiction Zone during spool-up! Subspace resonance destroyed the vessel!`,
          'crit'
        );
        return false;
      }

      // Transition to IN_TRANSIT (Step 2: 64x High-Speed Physical Cruise)
      ship.jumpState = 'IN_TRANSIT';
      ship.jumpSpoolTimer = 0;
      if (ship.jumpTransitData) {
        ship.jumpTransitData.spoolTicksRemaining = 0;
      }
      ship.splineActive = false;

      const jSpeed = ship.jumpTransitData?.jumpSpeed ?? (64.0 * Math.max(ship.cruiseSpeed || 100.0, 50.0));
      addLog?.(
        'MICROJUMP',
        `⚡ ${ship.name}: Spool complete. Hyperspace translation engaged [64x sublight vector: ${Math.round(jSpeed)} km/s].`,
        'info'
      );
    }
    return false;
  }

  // C. Step 2 & 3: Active Kinematic Physical Cruise (64x Sublight Vector) & Emergence
  if (ship.jumpState === 'IN_TRANSIT' || ship.jumpState === 'TRANSIT') {
    // If jumpTransitData is missing, reconstruct it
    if (!ship.jumpTransitData && ship.jumpTarget) {
      const dx = ship.jumpTarget.x - ship.pos.x;
      const dy = ship.jumpTarget.y - ship.pos.y;
      const totalDist = Math.hypot(dx, dy);
      const tv = totalDist > 0.001 ? { x: dx / totalDist, y: dy / totalDist } : { x: 1, y: 0 };
      const cSpeed = ship.cruiseSpeed || (ship.maxSpeed ? ship.maxSpeed * 0.7 : 100.0);
      ship.jumpTransitData = {
        originSystemId: 'system-0',
        targetSystemId: 'system-0',
        destinationPoint: { x: ship.jumpTarget.x, y: ship.jumpTarget.y },
        departurePoint: { x: ship.jumpOrigin?.x ?? ship.pos.x, y: ship.jumpOrigin?.y ?? ship.pos.y },
        transitVector: tv,
        totalDistance: totalDist,
        distanceTraveled: 0,
        jumpSpeed: 64.0 * cSpeed,
        spoolTicksRemaining: 0,
        formationOffset: { x: 0, y: 0 },
      };
    }

    const data = ship.jumpTransitData;
    if (!data) {
      ship.jumpState = 'IDLE';
      return false;
    }

    const jumpSpeed = data.jumpSpeed || (64.0 * Math.max(ship.cruiseSpeed || 100.0, 50.0));
    const deltaD = jumpSpeed * dt;

    const destX = data.destinationPoint.x + data.formationOffset.x;
    const destY = data.destinationPoint.y + data.formationOffset.y;
    const dx = destX - ship.pos.x;
    const dy = destY - ship.pos.y;
    const distRemaining = Math.hypot(dx, dy);

    // Step 3: Emergence & Formation Arrival
    if (distRemaining <= deltaD || distRemaining < 4.0) {
      ship.jumpState = 'EMERGING';
      // Clamp coordinates directly to P_dest + O_formation
      ship.pos.x = destX;
      ship.pos.y = destY;

      // Drop speed back to sublight cruise speed (v_cruise)
      const cruiseSpeed = ship.cruiseSpeed || (ship.maxSpeed ? ship.maxSpeed * 0.7 : 100.0);
      ship.velocity = {
        x: data.transitVector.x * cruiseSpeed,
        y: data.transitVector.y * cruiseSpeed,
      };
      ship.heading = Math.atan2(data.transitVector.y, data.transitVector.x);

      // Clear JumpTransitData
      ship.jumpTransitData = undefined;

      // Enter thermal cooldown
      ship.jumpState = 'COOLDOWN';
      ship.jumpCooldownTimer = JUMP_CONFIG.cooldownDurationSec;
      ship.jumpCooldownDuration = JUMP_CONFIG.cooldownDurationSec;

      addLog?.(
        'MICROJUMP',
        `⚓ ${ship.name}: Emergence complete. In formation at (${Math.round(destX)}, ${Math.round(destY)}). Sublight cruise restored [${Math.round(cruiseSpeed)} km/s]. Drive cooling for ${JUMP_CONFIG.cooldownDurationSec.toFixed(0)}s.`,
        'success'
      );
      return false;
    }

    // Physical straight-line position progression: ΔD = v_jump * Δt
    const tv = data.transitVector;
    ship.pos.x += tv.x * deltaD;
    ship.pos.y += tv.y * deltaD;
    data.distanceTraveled += deltaD;

    // Physical transit velocity & heading
    ship.velocity = { x: tv.x * jumpSpeed, y: tv.y * jumpSpeed };
    ship.heading = Math.atan2(tv.y, tv.x);

    return true;
  }

  // Emergence state cleanup if reached
  if (ship.jumpState === 'EMERGING') {
    ship.jumpState = 'IDLE';
    ship.jumpTransitData = undefined;
    return false;
  }

  return false;
}
