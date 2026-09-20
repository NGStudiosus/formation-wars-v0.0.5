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
  if (!ship || ship.hullState === 'DESTROYED' || ship.isStationary) return;

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

  const speedLimit = commandedSpeed !== undefined ? commandedSpeed : (ship.maxSpeed || 1000.0);
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
    ship.jumpState === 'TRANSIT'
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

  if (!ship.splineActive || ship.hullState === 'DESTROYED' || ship.isStationary) {
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

  const accel = ship.acceleration ?? 250.0;
  const aBrake = accel;
  const maxSpd = ship.commandedSpeed ?? ship.maxSpeed ?? 1000.0;
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
  const deriv = evaluateCubicBezierDerivative(traj.c0, traj.c1, traj.c2, traj.c3, ship.splineT);
  const tangentSpeed = Math.hypot(deriv.x, deriv.y);
  const dtParam = (newSpeed * dt) / Math.max(tangentSpeed, 1.0);
  const nextT = Math.min(1.0, ship.splineT + dtParam);

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
  const nextPos = evaluateCubicBezier(traj.c0, traj.c1, traj.c2, traj.c3, nextT);
  ship.pos.x = nextPos.x;
  ship.pos.y = nextPos.y;
  ship.splineT = nextT;

  // 5. ORIENTATION & VELOCITY VECTOR ALIGNMENT
  const targetAngle = Math.atan2(deriv.y, deriv.x);
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
    ship.jumpState === 'EMERGING'
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

