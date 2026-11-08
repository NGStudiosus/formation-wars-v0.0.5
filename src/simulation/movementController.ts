import { ShipEntity, Vec2D } from '../types';
import { clampAngularSlew, computeStoppingDistance, computeApproachDecelerationSpeed } from './kinematics';
import {
  computeDynamicSplineTrajectory,
  evaluateCubicBezier,
  evaluateCubicBezierDerivative,
  getRemainingArcDistance,
  CubicSplineTrajectory,
} from './hermite';

/**
 * MOVEMENT CONTROLLER
 * Dynamic velocity-based Hermite/Bezier spline engine with delta-V turning arcs,
 * quadratic retro-burn braking horizons, and angular slew damping.
 */

/**
 * Clears completed or canceled waypoints immediately;
 * ensures memory references to reached coordinates are dereferenced to prevent memory leaks and orphaned nodes.
 */
export function clearShipMovement(ship: ShipEntity): void {
  ship.splineActive = false;
  ship.splineT = 1.0;
  ship.commandedSpeed = undefined;
  ship.splineTrajectory = undefined;
  ship.splineC1 = undefined;
  ship.splineC2 = undefined;

  // Dereference internal waypoint arrays and spline coordinate objects
  if (ship.waypoints && ship.waypoints.length > 0) {
    ship.waypoints.length = 0;
  }
}

/**
 * Approach Deceleration & Retro-Braking:
 * Clamps maximum thrust and engages retro-braking to bleed off residual velocity
 * as the miner approaches within 1.5 * R_transfer (375 km).
 * Returns true if vessel has crossed the R_transfer (250 km) docking threshold.
 */
export function applyMinerApproachDeceleration(
  miner: ShipEntity,
  targetPos: Vec2D,
  transferRadius: number = 250.0,
  dt: number = 1 / 30
): boolean {
  const dx = targetPos.x - miner.pos.x;
  const dy = targetPos.y - miner.pos.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= transferRadius) {
    return true;
  }

  const approachRadius = 1.5 * transferRadius; // 375 km
  if (dist <= approachRadius) {
    const curSpeed = Math.hypot(miner.velocity.x, miner.velocity.y);
    const aBrake = miner.acceleration ?? 220.0;
    const cruise = miner.cruiseSpeed ?? 600.0;

    const targetSpeed = computeApproachDecelerationSpeed(
      dist,
      transferRadius,
      curSpeed,
      aBrake,
      cruise,
      dt
    );

    if (curSpeed > targetSpeed && curSpeed > 0.001) {
      const scale = targetSpeed / curSpeed;
      miner.velocity.x *= scale;
      miner.velocity.y *= scale;
    }

    if (miner.commandedSpeed !== undefined && miner.commandedSpeed > targetSpeed) {
      miner.commandedSpeed = targetSpeed;
    }
  }

  return false;
}

/**
 * Issues a kinematic dynamic spline move order based on current ship velocity and destination.
 * Computes delta-V turning arcs when moving, or linear trajectories when at rest/low speed.
 */
export function issueMoveCommand(
  ship: ShipEntity,
  targetPos: Vec2D,
  commandedSpeed?: number
): void {
  if (!ship || ship.hullState === 'DESTROYED' || ship.hullState === 'DISABLED' || ship.isStationary) return;

  // Release docking station-keeping if explicit new flight order is issued
  if (ship.isStationKeeping) {
    ship.isStationKeeping = false;
    ship.minerHQOffset = undefined;
    ship.transferBeamActive = false;
    ship.transferBeamTarget = null;
  }

  // Clear runaway spline sub-segment arrays
  if (ship.waypoints && ship.waypoints.length > 0) {
    ship.waypoints.length = 0;
  }

  let speedLimit = commandedSpeed !== undefined ? commandedSpeed : (ship.maxSpeed || 1000.0);
  if (ship.hullState === 'CRIPPLED') {
    const crippleMax = ship.crippleBarMax || (0.25 * ship.hullMax);
    const rCripple = Math.max(0.5, Math.min(1.0, (ship.hullHp || 0) / Math.max(1, crippleMax)));
    const t = (1.0 - rCripple) / 0.5; // 0.0 at 100% cripple -> 1.0 at 50% cripple
    const speedMult = Math.max(0.05, 0.90 - t * 0.90);
    speedLimit *= speedMult;
  }

  ship.commandedSpeed = speedLimit;

  const cruiseSpeed = ship.cruiseSpeed || (ship.maxSpeed ? ship.maxSpeed * 0.7 : 700.0);
  const currentVel = ship.velocity || { x: 0, y: 0 };

  // Calculate dynamic cubic Bezier trajectory scaled to vessel velocity and delta-V
  const traj: CubicSplineTrajectory = computeDynamicSplineTrajectory(
    ship.pos,
    currentVel,
    targetPos,
    cruiseSpeed
  );

  ship.splineTrajectory = traj;
  ship.splineP0 = { x: traj.c0.x, y: traj.c0.y };
  ship.splineP1 = { x: traj.c3.x, y: traj.c3.y };
  ship.splineC1 = { x: traj.c1.x, y: traj.c1.y };
  ship.splineC2 = { x: traj.c2.x, y: traj.c2.y };
  ship.splineM0 = { x: 3.0 * traj.t0.x, y: 3.0 * traj.t0.y };
  ship.splineM1 = { x: 3.0 * traj.t1.x, y: 3.0 * traj.t1.y };
  ship.splineT = 0;

  ship.splineDuration = Math.max(0.5, traj.totalLength / Math.max(speedLimit, 50.0));
  ship.splineActive = true;
  ship.isMoored = false;
  ship.isHoldingVector = false;
}

/**
 * Updates vessel kinematics along its dynamic cubic Hermite/Bezier spline.
 * Evaluates remaining arc distance against deceleration stopping distance (D_brake = v^2 / 2*a_brake),
 * executing retro-burn throttle braking and clamping overshoot for a clean dead stop.
 *
 * Returns true if ship is actively moving, false if idle or reached target.
 */
export function updateShipMovementTick(
  ship: ShipEntity,
  dt: number,
  onArrival?: (ship: ShipEntity) => void
): boolean {
  // Suppress standard flight waypoints and spline updates while in jump spooling/transit
  if (
    ship.jumpState === 'SPOOLING' ||
    ship.jumpState === 'IN_TRANSIT' ||
    ship.jumpState === 'TRANSIT' ||
    ship.microJumpState === 'SPOOLING' ||
    ship.microJumpState === 'IN_TRANSIT'
  ) {
    return false;
  }

  // Suppress standard flight waypoints and spline updates while docking/station-keeping
  if (
    ship.minerState === 'STATE_DOCKING_OFFLOAD' ||
    ship.minerState === 'STATE_UNLOAD' ||
    ship.minerState === 'STATE_OFFLOAD' ||
    ship.isStationKeeping
  ) {
    clearShipMovement(ship);
    ship.velocity.x = 0;
    ship.velocity.y = 0;
    if (ship.angularVelocity !== undefined) ship.angularVelocity = 0;
    return false;
  }

  if (!ship.splineActive || ship.hullState === 'DESTROYED' || ship.hullState === 'DISABLED' || ship.isStationary) {
    if (ship.hullState === 'DISABLED') {
      clearShipMovement(ship);
      ship.velocity.x = 0;
      ship.velocity.y = 0;
    }
    return false;
  }

  const dest = ship.splineP1;
  if (!dest) {
    clearShipMovement(ship);
    return false;
  }

  // Ensure trajectory data is initialized
  let traj = ship.splineTrajectory as CubicSplineTrajectory | undefined;
  if (!traj || !traj.cumDistances) {
    const cruise = ship.cruiseSpeed || (ship.maxSpeed ? ship.maxSpeed * 0.7 : 700.0);
    traj = computeDynamicSplineTrajectory(
      ship.splineP0 || ship.pos,
      ship.velocity || { x: 0, y: 0 },
      dest,
      cruise
    );
    ship.splineTrajectory = traj;
    ship.splineC1 = traj.c1;
    ship.splineC2 = traj.c2;
  }

  // Cripple Speed Penalty:
  // At 100% cripple bar (25% max HP): 10% speed degradation (0.90x).
  // As cripple reaches 50% (12.5% max HP / disabled threshold), slows to halt.
  let speedPenaltyMult = 1.0;
  if (ship.hullState === 'CRIPPLED') {
    const crippleRatio = Math.max(0, Math.min(1.0, ship.hullHp / (0.25 * ship.hullMax)));
    speedPenaltyMult = Math.max(0, (crippleRatio - 0.5) / 0.5 * 0.90);
  }

  const accel = (ship.acceleration ?? 250.0) * speedPenaltyMult;
  const aBrake = accel > 0 ? accel : 250.0;
  const rawMaxSpd = ship.commandedSpeed ?? ship.maxSpeed ?? 1000.0;
  const maxSpd = rawMaxSpd * speedPenaltyMult;
  const curSpeed = Math.hypot(ship.velocity.x, ship.velocity.y);

  // Direct Euclidean distance to destination
  const directDist = Math.hypot(dest.x - ship.pos.x, dest.y - ship.pos.y);

  // Remaining arc distance S(t) along the curve
  const S_t = getRemainingArcDistance(traj, ship.splineT);
  const effectiveRemaining = Math.max(0, Math.min(S_t, directDist));

  // Compute stopping distance: D_brake = |v|^2 / (2 * a_brake)
  const D_brake = computeStoppingDistance(curSpeed, aBrake);

  // 1. ARRIVAL & CLAMP OVERSHOOT (DEAD STOP AT TARGET COORDINATE)
  const arrivalThreshold = Math.max(4.0, curSpeed * dt);
  if (
    directDist <= arrivalThreshold ||
    effectiveRemaining <= arrivalThreshold ||
    (ship.splineT >= 0.995 && directDist <= 25.0)
  ) {
    ship.pos.x = dest.x;
    ship.pos.y = dest.y;
    ship.velocity.x = 0;
    ship.velocity.y = 0;
    ship.splineT = 1.0;
    if (ship.angularVelocity !== undefined) {
      ship.angularVelocity = 0;
    }

    if (onArrival) {
      onArrival(ship);
    } else {
      clearShipMovement(ship);
    }
    return false;
  }

  // 2. THROTTLE CONTROL: ACCELERATION VS RETRO-BURN BRAKING HORIZON
  let newSpeed: number;
  if (effectiveRemaining <= D_brake || directDist <= D_brake) {
    // S(t) <= D_brake: Throttle transitions into retro-burn mode
    const maxSafeSpeed = Math.sqrt(Math.max(0, 2.0 * aBrake * effectiveRemaining));
    newSpeed = Math.max(0, Math.min(curSpeed - aBrake * dt, maxSafeSpeed));
  } else {
    // Standard acceleration burn up to commanded speed
    newSpeed = Math.min(maxSpd, curSpeed + accel * dt);
  }

  // 3. ADVANCE TRAJECTORY PARAMETER t & COMPUTE SPLINE DERIVATIVE
  const t = ship.splineT;
  const oneMinusT = 1.0 - t;
  const mt2 = oneMinusT * oneMinusT;
  const t2 = t * t;
  const c0 = traj.c0;
  const c1 = traj.c1;
  const c2 = traj.c2;
  const c3 = traj.c3;

  const derivX = 3.0 * mt2 * (c1.x - c0.x) + 6.0 * oneMinusT * t * (c2.x - c1.x) + 3.0 * t2 * (c3.x - c2.x);
  const derivY = 3.0 * mt2 * (c1.y - c0.y) + 6.0 * oneMinusT * t * (c2.y - c1.y) + 3.0 * t2 * (c3.y - c2.y);
  const tangentSpeed = Math.hypot(derivX, derivY);
  const dtParam = (newSpeed * dt) / Math.max(tangentSpeed, 1.0);
  const nextT = Math.min(1.0, t + dtParam);

  if (nextT >= 1.0) {
    // Curve completed: halt dead stop at destination
    ship.pos.x = dest.x;
    ship.pos.y = dest.y;
    ship.velocity.x = 0;
    ship.velocity.y = 0;
    ship.splineT = 1.0;
    if (ship.angularVelocity !== undefined) {
      ship.angularVelocity = 0;
    }

    if (onArrival) {
      onArrival(ship);
    } else {
      clearShipMovement(ship);
    }
    return false;
  }

  // 4. UPDATE POSITION ALONG CUBIC HERMITE/BEZIER CURVE
  const nOneMinusT = 1.0 - nextT;
  const nMt2 = nOneMinusT * nOneMinusT;
  const nMt3 = nMt2 * nOneMinusT;
  const nT2 = nextT * nextT;
  const nT3 = nT2 * nextT;

  ship.pos.x = nMt3 * c0.x + 3.0 * nMt2 * nextT * c1.x + 3.0 * nOneMinusT * nT2 * c2.x + nT3 * c3.x;
  ship.pos.y = nMt3 * c0.y + 3.0 * nMt2 * nextT * c1.y + 3.0 * nOneMinusT * nT2 * c2.y + nT3 * c3.y;
  ship.splineT = nextT;

  // 5. ORIENTATION & VELOCITY VECTOR ALIGNMENT
  const targetAngle = Math.atan2(derivY, derivX);
  const maxSlewRateRad = ((ship.angularSlewRate ?? 25.0) * Math.PI) / 180.0;
  ship.heading = clampAngularSlew(ship.heading, targetAngle, maxSlewRateRad, dt);

  ship.velocity.x = Math.cos(ship.heading) * newSpeed;
  ship.velocity.y = Math.sin(ship.heading) * newSpeed;

  return true;
}

/**
 * Hard Sublight Perimeter Interdiction Gate:
 * Evaluates the vessel's Euclidean distance from its local star system center:
 * D_star = sqrt((x - x_star)^2 + (y - y_star)^2)
 * If D_star >= R_system_boundary:
 * - Clamps outward velocity along the radial normal to 0.
 * - Clamps position to the boundary surface.
 * - Halts waypoints and active spline trajectory.
 * - Emits a tactical HUD alert:
 *   '[NAVIGATION REJECTED]: SECTOR BOUNDARY REACHED. INTERSTELLAR TRANSIT REQUIRES FTL JUMP DRIVE.'
 *
 * Vessels with jumpState === 'IN_TRANSIT' or 'TRANSIT' or 'SPOOLING' or 'EMERGING'
 * bypass the boundary clamp, traversing the interstellar void at governed 64x jump speed.
 */
export function checkSublightPerimeterInterdiction(
  ship: ShipEntity,
  systemStarCenter: Vec2D,
  boundaryRadius: number = 130000,
  onBoundaryAlert?: (message: string) => void
): boolean {
  if (
    ship.jumpState === 'IN_TRANSIT' ||
    ship.jumpState === 'TRANSIT' ||
    ship.jumpState === 'SPOOLING' ||
    ship.jumpState === 'EMERGING' ||
    ship.microJumpState === 'IN_TRANSIT' ||
    ship.microJumpState === 'SPOOLING'
  ) {
    return false;
  }

  const dx = ship.pos.x - systemStarCenter.x;
  const dy = ship.pos.y - systemStarCenter.y;
  const dist = Math.hypot(dx, dy);

  if (dist >= boundaryRadius) {
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);

    // Compute outward radial velocity component
    const vOut = ship.velocity.x * nx + ship.velocity.y * ny;
    if (vOut > 0) {
      ship.velocity.x -= vOut * nx;
      ship.velocity.y -= vOut * ny;
    }
    if (Math.hypot(ship.velocity.x, ship.velocity.y) < 0.05) {
      ship.velocity.x = 0;
      ship.velocity.y = 0;
    }

    // Clamp ship position right at the boundary surface
    ship.pos.x = systemStarCenter.x + nx * (boundaryRadius - 1.0);
    ship.pos.y = systemStarCenter.y + ny * (boundaryRadius - 1.0);

    // Clear waypoints and active spline trajectory
    clearShipMovement(ship);

    if (onBoundaryAlert) {
      onBoundaryAlert(
        '[NAVIGATION REJECTED]: SECTOR BOUNDARY REACHED. INTERSTELLAR TRANSIT REQUIRES FTL JUMP DRIVE.'
      );
    }
    return true;
  }

  return false;
}

export { steerTowards, updateInnerPlanetaryPatrol } from './pirates';

/**
 * Novan Tactical Micro-Jump Initiation
 * Spools the hyper-velocity micro-jump drive towards target coordinates.
 */
export function initiateMicroJump(
  ship: ShipEntity,
  targetCoords: Vec2D,
  isNovan: boolean = true
): { success: boolean; reason?: string } {
  if (!ship || ship.hullState === 'DESTROYED') {
    return { success: false, reason: 'VESSEL DESTROYED' };
  }

  if (ship.microJumpState && ship.microJumpState !== 'IDLE') {
    return { success: false, reason: `JUMP DRIVE BUSY (${ship.microJumpState})` };
  }

  const shipX = ship.pos?.x ?? ship.x ?? 0;
  const shipY = ship.pos?.y ?? ship.y ?? 0;
  const dx = targetCoords.x - shipX;
  const dy = targetCoords.y - shipY;
  const dist = Math.hypot(dx, dy);

  const MIN_JUMP_DIST = 2500; // km
  if (dist < MIN_JUMP_DIST) {
    return {
      success: false,
      reason: `TARGET BELOW MINIMUM DISTANCE THRESHOLD (${Math.round(dist)}km < ${MIN_JUMP_DIST}km)`,
    };
  }

  // Calculate destination with Novan scatter factor (75km radius) vs standard (1200km radius)
  const scatterRadius = isNovan ? 75 : 1200;
  const scatterAngle = Math.random() * Math.PI * 2;
  const scatterDist = Math.random() * scatterRadius;
  const destX = targetCoords.x + Math.cos(scatterAngle) * scatterDist;
  const destY = targetCoords.y + Math.sin(scatterAngle) * scatterDist;

  ship.microJumpTarget = { x: destX, y: destY };
  ship.microJumpState = 'SPOOLING';
  ship.microJumpSpoolRemaining = isNovan ? 105 : 360; // 3.5s (105 ticks) vs 12.0s (360 ticks) at 30 ticks/sec

  // Halt conventional engines during spool-up
  ship.splineActive = false;
  ship.velocity.x = 0;
  ship.velocity.y = 0;

  return { success: true };
}

/**
 * Novan Tactical Micro-Jump Kinematic Evolution (30Hz evaluation)
 */
export function updateMicroJumpKinematics(ship: ShipEntity, dtTicks: number = 1): void {
  if (!ship.microJumpState || ship.microJumpState === 'IDLE') return;

  // 1. SPOOLING Phase
  if (ship.microJumpState === 'SPOOLING') {
    ship.microJumpSpoolRemaining = (ship.microJumpSpoolRemaining ?? 105) - dtTicks;
    if (ship.microJumpSpoolRemaining <= 0) {
      ship.microJumpState = 'IN_TRANSIT';
    }
    return;
  }

  // 2. IN_TRANSIT Phase
  if (ship.microJumpState === 'IN_TRANSIT') {
    if (!ship.microJumpTarget) {
      ship.microJumpState = 'COOLDOWN';
      ship.microJumpCooldownRemaining = 480;
      return;
    }

    const shipX = ship.pos?.x ?? ship.x ?? 0;
    const shipY = ship.pos?.y ?? ship.y ?? 0;
    const tx = ship.microJumpTarget.x;
    const ty = ship.microJumpTarget.y;
    const dx = tx - shipX;
    const dy = ty - shipY;
    const dist = Math.hypot(dx, dy);

    // Speed: 65,000 km/s -> at 30 ticks/sec, dist per tick = 65000 / 30 = 2166.67 km
    const stepDist = (65000 / 30) * dtTicks;

    if (dist <= stepDist) {
      // Arrived at destination boundary: Snap coordinates, transition to COOLDOWN
      if (ship.pos) {
        ship.pos.x = tx;
        ship.pos.y = ty;
      }
      ship.x = tx;
      ship.y = ty;
      ship.velocity.x = 0;
      ship.velocity.y = 0;
      ship.microJumpState = 'COOLDOWN';
      ship.microJumpCooldownRemaining = 480; // 16.0s at 30 ticks/sec (16 * 30)
      ship.microJumpTarget = undefined;
    } else {
      const moveX = (dx / dist) * stepDist;
      const moveY = (dy / dist) * stepDist;
      if (ship.pos) {
        ship.pos.x += moveX;
        ship.pos.y += moveY;
      }
      ship.x = (ship.x ?? shipX) + moveX;
      ship.y = (ship.y ?? shipY) + moveY;
    }
    return;
  }

  // 3. COOLDOWN Phase
  if (ship.microJumpState === 'COOLDOWN') {
    ship.microJumpCooldownRemaining = (ship.microJumpCooldownRemaining ?? 480) - dtTicks;
    if (ship.microJumpCooldownRemaining <= 0) {
      ship.microJumpState = 'IDLE';
    }
  }
}


