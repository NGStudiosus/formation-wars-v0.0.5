/**
 * System Constants & Macro Spatial Scaling ($K_{scale} = 4.5$)
 * Defines canonical dimensions, orbital bands, gravity well multipliers,
 * camera view constraints, and naval hierarchy proportions.
 */

// Uniform Macro Spatial Multiplier
export const K_SCALE = 4.5;

// Camera Viewport & Zoom Clamp Constraints
export const CAMERA_CONFIG = {
  zoomMin: 0.015 / K_SCALE, // ~0.00333 (Macro View encompasses entire system and outer belt)
  zoomMax: 2.5,             // 2.5 (Micro Inspection View on Dreadnought-to-Frigate hulls)
  zoomInit: 0.95 / 2.5,     // 0.38 (Normalized initial framing)
  maxWorldBound: 38000 * K_SCALE, // 171,000px world pan boundary
};

// Celestial Dimensions & Orbital Envelopes
export const CELESTIAL_SCALE = {
  // Central Star (origin 0,0)
  starRadiusMin: Math.round(460 * K_SCALE),     // 2070px
  starRadiusMax: Math.round(520 * K_SCALE),     // 2340px
  starCoronaMin: Math.round(1550 * K_SCALE),    // 6975px
  starCoronaMax: Math.round(1850 * K_SCALE),    // 8325px

  // Inner Rocky Planetary System
  rockyOrbitMin: Math.round(6222 * K_SCALE),    // ~28,000px
  rockyOrbitMax: Math.round(17777 * K_SCALE),   // ~80,000px
  rockyRadiusMin: Math.round(37 * K_SCALE),     // ~166px (Halved from 75)
  rockyRadiusMax: Math.round(65 * K_SCALE),     // ~292px (Halved from 130)

  // Lunar Bodies
  rockyMoonRadiusMin: Math.round(18 * K_SCALE), // 81px
  rockyMoonRadiusMax: Math.round(26 * K_SCALE), // 117px
  primaryMoonRadius: Math.round(24 * K_SCALE),  // 108px

  // Asteroid Belt Annulus
  beltRadiusMin: Math.round(21111 * K_SCALE),   // ~95,000px
  beltRadiusMax: Math.round(32222 * K_SCALE),   // ~145,000px
  ambientRingCountMin: 200,                     // 200 ambient nodes
  ambientRingCountMax: 350,                     // 350 ambient nodes
  clusterBaseRadius: 420.0 * K_SCALE,           // 1890px physical core spread
  clusterNodeRadius: 70.0 * K_SCALE,            // 315px base node radius

  // Outer System Gas Giants
  gasOrbitMin: Math.round(36666 * K_SCALE),     // ~165,000px
  gasOrbitMax: Math.round(57777 * K_SCALE),     // ~260,000px
  gasRadiusMin: Math.round(130 * K_SCALE),      // ~585px (Halved from 260)
  gasRadiusMax: Math.round(205 * K_SCALE),      // ~922px (Halved from 410)
  gasMoonRadiusMin: Math.round(24 * K_SCALE),   // 108px
  gasMoonRadiusMax: Math.round(38 * K_SCALE),   // 171px

  // Cometary Bodies
  cometSemiMajorMin: Math.round(19500 * K_SCALE), // 87,750px
  cometSemiMajorMax: Math.round(27500 * K_SCALE), // 123,750px
  cometNucleusMin: Math.round(12 * K_SCALE),      // 54px
  cometNucleusMax: Math.round(16 * K_SCALE),      // 72px
  cometTailMin: Math.round(320 * K_SCALE),        // 1440px
  cometTailMax: Math.round(520 * K_SCALE),        // 2340px

  // System Orbital Arena
  arenaRadiusMin: Math.round(66666 * K_SCALE),    // ~300,000px
  arenaRadiusMax: Math.round(66666 * K_SCALE),    // ~300,000px
};

// Gravity Well Multipliers
export const GRAVITY_WELL_RATIOS = {
  planetary: 6.0,  // R_well = R_planet * 6.0
  lunar: 3.0,      // R_well = R_moon * 3.0
  cluster: 1.10,   // R_cluster_well = R_cluster_envelope * 1.10 (strict 10% operational margin)
};

// Headquarters (HQ) Citadel Proportions & Anchoring
export const HQ_PROPORTIONS = {
  planetRadiusRatio: 0.20,       // Exactly 20% of host planet's visual surface radius (18%-22% range)
  dockingRadiusRatio: 1.85,      // Docking perimeter relative to HQ radius (~170px for 90px HQ)
  anchorAngle: -Math.PI / 4,     // -45 degrees (upper-right shoulder mooring)
  standoffOffset: 18.0,          // Standoff offset nestled right on edge of atmospheric haze
  hqRadiusFactorInAnchor: 0.75,  // D_anchor = R_planet + (R_HQ * 0.75) + standoffOffset
};

export const HQ_CONFIG = {
  radius: 90.0,
  dockingRadius: 170.0,
  standoffOffset: 18.0,
  anchorAngle: -Math.PI / 4,
};

// Naval Hull Hierarchy
export const NAVAL_HIERARCHY = {
  dreadnoughtToHqRatio: 0.90,     // Dreadnought length = 90% of HQ radius
  frigateToDreadnoughtRatio: 0.15, // Frigate length = 15% of Dreadnought
};

// Tactical Transit & Weapon Scalar
export const TACTICAL_SPEED_SCALAR = K_SCALE;

export const DEFAULT_MISSILE_SPEED = 230.0 * K_SCALE; // 1035.0 km/s (scaled 4.5x)
export const DEFAULT_CM_SPEED = 245.0 * K_SCALE; // 1102.5 km/s (scaled 4.5x)

