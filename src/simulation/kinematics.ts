import { ShipRole, ShipEntity } from '../types';

export interface ShipKinematicsSpec {
  role: ShipRole;
  navalAbbr: string;
  className: string;
  maxSpeed: number;        // km/s (maximum burn velocity v_max)
  cruiseSpeed: number;     // km/s (nominal tactical cruise v_cruise)
  acceleration: number;    // km/s^2 (linear acceleration a_accel)
  angularSlewRate: number; // deg/s (rotational angular slew rate)
}

/**
 * Standard Scaled Kinematic Specifications
 * Rescaled for high-speed tactical space combat across multi-thousand-kilometer sectors.
 */
export const SHIP_KINEMATICS: Record<string, ShipKinematicsSpec> = {
  FRIGATE: {
    role: 'FRIGATE',
    navalAbbr: 'FG',
    className: 'Frigate',
    maxSpeed: 1800.0,
    cruiseSpeed: 1200.0,
    acceleration: 450.0,
    angularSlewRate: 45.0,
  },
  DESTROYER: {
    role: 'DESTROYER',
    navalAbbr: 'DD',
    className: 'Destroyer',
    maxSpeed: 1500.0,
    cruiseSpeed: 1050.0,
    acceleration: 350.0,
    angularSlewRate: 35.0,
  },
  LIGHT_CRUISER: {
    role: 'LIGHT_CRUISER',
    navalAbbr: 'CL',
    className: 'Light Cruiser',
    maxSpeed: 1200.0,
    cruiseSpeed: 800.0,
    acceleration: 260.0,
    angularSlewRate: 25.0,
  },
  CRUISER: {
    role: 'CRUISER',
    navalAbbr: 'CL',
    className: 'Light Cruiser',
    maxSpeed: 1200.0,
    cruiseSpeed: 800.0,
    acceleration: 260.0,
    angularSlewRate: 25.0,
  },
  HEAVY_CRUISER: {
    role: 'HEAVY_CRUISER',
    navalAbbr: 'CH',
    className: 'Heavy Cruiser',
    maxSpeed: 950.0,
    cruiseSpeed: 650.0,
    acceleration: 190.0,
    angularSlewRate: 18.0,
  },
  BATTLECRUISER: {
    role: 'BATTLECRUISER',
    navalAbbr: 'BC',
    className: 'Battlecruiser',
    maxSpeed: 800.0,
    cruiseSpeed: 550.0,
    acceleration: 150.0,
    angularSlewRate: 14.0,
  },
  BATTLESHIP: {
    role: 'BATTLESHIP',
    navalAbbr: 'BB',
    className: 'Battleship',
    maxSpeed: 650.0,
    cruiseSpeed: 450.0,
    acceleration: 110.0,
    angularSlewRate: 10.0,
  },
  DREADNOUGHT: {
    role: 'DREADNOUGHT',
    navalAbbr: 'DN',
    className: 'Dreadnought',
    maxSpeed: 500.0,
    cruiseSpeed: 350.0,
    acceleration: 80.0,
    angularSlewRate: 7.0,
  },
  CITY_SHIP: {
    role: 'CITY_SHIP',
    navalAbbr: 'CS',
    className: 'City Ship',
    maxSpeed: 420.0,
    cruiseSpeed: 280.0,
    acceleration: 60.0,
    angularSlewRate: 5.0,
  },
  LIAAL_LIGHT: {
    role: 'LIAAL_LIGHT',
    navalAbbr: 'L-WS',
    className: 'Liaal Light Warship',
    maxSpeed: 1600.0,
    cruiseSpeed: 1100.0,
    acceleration: 380.0,
    angularSlewRate: 38.0,
  },
  LIAAL_MEDIUM: {
    role: 'LIAAL_MEDIUM',
    navalAbbr: 'M-WS',
    className: 'Liaal Medium Warship',
    maxSpeed: 1250.0,
    cruiseSpeed: 850.0,
    acceleration: 270.0,
    angularSlewRate: 26.0,
  },
  LIAAL_HEAVY: {
    role: 'LIAAL_HEAVY',
    navalAbbr: 'H-WS',
    className: 'Liaal Heavy Warship',
    maxSpeed: 750.0,
    cruiseSpeed: 500.0,
    acceleration: 130.0,
    angularSlewRate: 12.0,
  },
  MINER: {
    role: 'MINER',
    navalAbbr: 'MINER',
    className: 'Autonomous Miner',
    maxSpeed: 900.0,
    cruiseSpeed: 600.0,
    acceleration: 220.0,
    angularSlewRate: 20.0,
  },
  BUILDER: {
    role: 'BUILDER',
    navalAbbr: 'BLD',
    className: 'Forge Builder',
    maxSpeed: 1000.0,
    cruiseSpeed: 700.0,
    acceleration: 250.0,
    angularSlewRate: 25.0,
  },
  COLLIER: {
    role: 'COLLIER',
    navalAbbr: 'COL',
    className: 'Collier Unrep',
    maxSpeed: 750.0,
    cruiseSpeed: 500.0,
    acceleration: 140.0,
    angularSlewRate: 15.0,
  },
  TANKER: {
    role: 'TANKER',
    navalAbbr: 'TNK',
    className: 'Fleet Tanker',
    maxSpeed: 700.0,
    cruiseSpeed: 480.0,
    acceleration: 130.0,
    angularSlewRate: 14.0,
  },
  REPAIR: {
    role: 'REPAIR',
    navalAbbr: 'REP',
    className: 'Fleet Repair Tender',
    maxSpeed: 750.0,
    cruiseSpeed: 500.0,
    acceleration: 140.0,
    angularSlewRate: 15.0,
  },
  SCRAP: {
    role: 'SCRAP',
    navalAbbr: 'SCP',
    className: 'Scrap Recovery Barge',
    maxSpeed: 700.0,
    cruiseSpeed: 480.0,
    acceleration: 120.0,
    angularSlewRate: 12.0,
  },
};

/**
 * Resolves standard kinematic specification for any ship role or key.
 */
export function getShipKinematics(roleOrKey: string): ShipKinematicsSpec {
  if (SHIP_KINEMATICS[roleOrKey]) {
    return SHIP_KINEMATICS[roleOrKey];
  }
  switch (roleOrKey) {
    case 'FG':
    case 'FRIGATE':
      return SHIP_KINEMATICS.FRIGATE;
    case 'DD':
    case 'DESTROYER':
      return SHIP_KINEMATICS.DESTROYER;
    case 'CL':
    case 'LIGHT_CRUISER':
    case 'CRUISER':
      return SHIP_KINEMATICS.LIGHT_CRUISER;
    case 'CH':
    case 'HEAVY_CRUISER':
      return SHIP_KINEMATICS.HEAVY_CRUISER;
    case 'BC':
    case 'BATTLECRUISER':
      return SHIP_KINEMATICS.BATTLECRUISER;
    case 'BB':
    case 'BATTLESHIP':
      return SHIP_KINEMATICS.BATTLESHIP;
    case 'DN':
    case 'DREADNOUGHT':
      return SHIP_KINEMATICS.DREADNOUGHT;
    case 'CS':
    case 'CITY_SHIP':
      return SHIP_KINEMATICS.CITY_SHIP;
    case 'LIAAL_LIGHT':
    case 'L-WS':
    case 'L_WS':
      return SHIP_KINEMATICS.LIAAL_LIGHT;
    case 'LIAAL_MEDIUM':
    case 'M-WS':
    case 'M_WS':
      return SHIP_KINEMATICS.LIAAL_MEDIUM;
    case 'LIAAL_HEAVY':
    case 'H-WS':
    case 'H_WS':
      return SHIP_KINEMATICS.LIAAL_HEAVY;
    case 'MN':
    case 'MINER':
      return SHIP_KINEMATICS.MINER;
    case 'BLD':
    case 'BUILDER':
      return SHIP_KINEMATICS.BUILDER;
    default:
      return SHIP_KINEMATICS.FRIGATE;
  }
}

/**
 * Applies kinematic specifications to a ship entity.
 */
export function applyShipKinematics(ship: Partial<ShipEntity>, role: string): void {
  const kin = getShipKinematics(role);
  ship.maxSpeed = kin.maxSpeed;
  ship.cruiseSpeed = kin.cruiseSpeed;
  ship.acceleration = kin.acceleration;
  ship.angularSlewRate = kin.angularSlewRate;
}

/**
 * Direct wrapped radians ([-PI, PI]) with simple slew clamping.
 * Clamps angular orientation change to maxSlewRate * dt.
 */
export function clampAngularSlew(
  currentAngle: number,
  targetAngle: number,
  maxSlewRateRad: number,
  dt: number
): number {
  let diff = targetAngle - currentAngle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return currentAngle + Math.sign(diff) * Math.min(Math.abs(diff), maxSlewRateRad * dt);
}

/**
 * Computes deceleration stopping distance based on reverse thruster limit a_brake:
 * D_brake = |v|^2 / (2 * a_brake)
 */
export function computeStoppingDistance(currentSpeed: number, aBrake: number): number {
  if (aBrake <= 0) return 0;
  return (currentSpeed * currentSpeed) / (2.0 * aBrake);
}

/**
 * Approach Deceleration Clamping & Retro-Braking:
 * Within 1.5 * R_transfer (375 km for 250 km boundary), clamps maximum permissible thrust
 * and applies retro-braking deceleration to smoothly bleed off residual velocity before crossing R_transfer.
 */
export function computeApproachDecelerationSpeed(
  distanceToTarget: number,
  transferRadius: number,
  currentSpeed: number,
  aBrake: number,
  maxCruiseSpeed: number,
  dt: number
): number {
  const approachThreshold = 1.5 * transferRadius;
  if (distanceToTarget > approachThreshold) {
    return Math.min(maxCruiseSpeed, currentSpeed + aBrake * dt);
  }

  // Linear approach corridor from 1.5 * R_transfer down to R_transfer:
  // At 1.5 * R_transfer: ratio = 1.0 (cruise / approach speed)
  // At 1.0 * R_transfer: ratio = 0.0 (dead stop target)
  const corridorDepth = approachThreshold - transferRadius;
  const distAboveBoundary = Math.max(0, distanceToTarget - transferRadius);
  const corridorFraction = Math.min(1.0, Math.max(0.0, distAboveBoundary / Math.max(corridorDepth, 1.0)));

  // Clamped max speed based on stopping distance to transfer boundary
  const safeApproachSpeed = Math.min(
    maxCruiseSpeed * Math.max(0.05, corridorFraction * 0.65),
    Math.sqrt(Math.max(0, 2.0 * aBrake * distAboveBoundary))
  );

  // Apply retro-braking deceleration
  const retroBurnSpeed = Math.max(0, currentSpeed - aBrake * 1.5 * dt);
  return Math.max(0, Math.min(retroBurnSpeed, safeApproachSpeed));
}
