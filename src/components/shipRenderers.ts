import { ShipEntity } from '../types';
import {
  renderMilitaryResearchStation,
  renderCivicResearchOutpost,
  renderExpansionCitadel,
  renderLightShipyard,
  renderMediumShipyard,
  renderHeavyShipyard,
  renderStructureByRoleOrType,
} from './structureRenderer';

/**
 * Military Industrial Color Palette & Detailing System (Halo UNSC / Homeworld Kharak Aesthetic)
 */
export const UNSC_PALETTE = {
  primaryArmorBase: '#2a323d',       // Primary Titanium-A Armor: base plating
  primaryArmorHighlight: '#384352',  // Highlighted upper deck panels
  secondaryArmor: '#1e242c',         // Secondary Armor & Structural Ribs: recessed chasms, keel structures, weapon troughs
  armorChamfer: '#4f5d73',           // Armor Chamfers & Panel Seams: subtle edge highlighters
  engineCowling: '#15191e',          // Engine Cowlings & Vents: blocky dark housings
  exhaustNozzle: '#101419',          // Deep nozzle interior
  ionExhaustGlow: '#00e5ff',         // Glowing rectangular ion exhaust nozzles
  ionExhaustCore: '#38bdf8',         // Inner core nozzle highlight
  deckGuidanceLines: '#e2e8f0',      // Deck & Runway Markings (Carriers): guidance stripes
  deckHazardChevrons: '#f59e0b',     // Deck & Runway Markings (Carriers): flight deck hazard chevrons
  runwayPlate: '#232932',            // Low-reflectivity tarmac surface
  elevatorHatch: '#181d24',          // Recessed elevator pad
};

/**
 * Standard UNSC Style Warship Hull Primitive Drawer
 */
export function drawUNSCStyleWarship(
  ctx: CanvasRenderingContext2D,
  ship: any,
  points: [number, number][],
  trenchPoints?: [number, number][],
  factionColor: string = '#00f0ff'
) {
  ctx.save();
  if (ship.x !== undefined && ship.y !== undefined && ship.heading !== undefined) {
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.heading);
  }

  // 1. Base Armor Hull Polygon
  ctx.fillStyle = UNSC_PALETTE.primaryArmorBase;
  ctx.strokeStyle = UNSC_PALETTE.armorChamfer;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Recessed Weapon / Spinal Trough
  if (trenchPoints && trenchPoints.length > 0) {
    ctx.fillStyle = UNSC_PALETTE.secondaryArmor;
    ctx.beginPath();
    ctx.moveTo(trenchPoints[0][0], trenchPoints[0][1]);
    for (let j = 1; j < trenchPoints.length; j++) {
      ctx.lineTo(trenchPoints[j][0], trenchPoints[j][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 3. Faction Accent Plate / Identification Chevrons
  ctx.fillStyle = factionColor;
  ctx.fillRect(-points[0][0] * 0.2, -3, 6, 6);

  // 4. Rectangular Angular Drive Nozzles
  ctx.fillStyle = UNSC_PALETTE.exhaustNozzle;
  const sternX = points[Math.floor(points.length / 2)][0];
  ctx.fillRect(sternX - 2, -6, 4, 4);
  ctx.fillRect(sternX - 2, 2, 4, 4);

  // Engine Flare
  const isSpeeding = (ship.speed && ship.speed > 5) || ship.fmsActive || (ship.velocity && Math.hypot(ship.velocity.x, ship.velocity.y) > 0.05);
  if (isSpeeding) {
    ctx.fillStyle = UNSC_PALETTE.ionExhaustGlow;
    ctx.fillRect(sternX - 8, -5, 6, 2);
    ctx.fillRect(sternX - 8, 3, 6, 2);
  }

  ctx.restore();
}

/**
 * Procedural Vector Ship Renderers
 * 
 * Replaces wireframe triangles with distinct high-fidelity vector geometry:
 * - The Collier: Flat, elongated rectangular gray hull with 6 colorful cargo boxes (red, blue, yellow, green).
 * - The Vanguard: Sleek half-oval / bullet-shaped craft with smooth curved nose, tapering sides, and flat stern.
 * - Enemy Ships: Asymmetric, angular, blocky silhouettes with jagged armor plates and antenna greebles.
 * - Fleet Tanker: Dual elongated cylindrical fuel pods strapped to a central spine.
 * - Fleet Repair Ship: Hull with extended forward crane/gantry arms and faint pulsing green aura.
 * - Scrap Barge: Broad, hollow-centered catamaran hull with placeholder cargo bay markers.
 */

export function renderProceduralShip(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number
): void {
  if (ship.visibilityTier === 'NONE') {
    return;
  }

  // Determine role & category
  const isHostile = ship.faction === 'HOSTILE';
  const role = ship.role;
  const id = (ship.id || '').toLowerCase();

  // Pirate Bastion Stronghold (Exactly half diameter of player HQ station)
  if (
    ship.isPirateBastion ||
    role === 'BASTION' ||
    id.includes('bastion') ||
    (role === 'HQ' && isHostile)
  ) {
    renderPirateBastion(ctx, r, timeMs);
    return;
  }

  // Friendly & Orbital Structures
  if (role === 'HQ' || id.includes('hq')) {
    renderHQStation(ctx, r, timeMs);
    return;
  }

  const sType = ((ship as any).structureType || '').toUpperCase();
  const rUpper = (role as string || '').toUpperCase();
  const sCode = ((ship as any).code || '').toUpperCase();

  // Procedural Research Labs & Citadels (MRS, CRO, EXC)
  if (
    rUpper === 'MILITARY_RESEARCH' ||
    sType === 'MILITARY_RESEARCH' ||
    sCode === 'MRS' ||
    id.includes('mrs') ||
    id.includes('military_research')
  ) {
    renderMilitaryResearchStation(ctx, r, timeMs);
    return;
  }
  if (
    rUpper === 'CIVIC_RESEARCH' ||
    sType === 'CIVIC_RESEARCH' ||
    sCode === 'CRO' ||
    id.includes('cro') ||
    id.includes('civic_research')
  ) {
    renderCivicResearchOutpost(ctx, r, timeMs);
    return;
  }
  if (
    rUpper === 'EXPANSION_CITADEL' ||
    sType === 'EXPANSION_CITADEL' ||
    sCode === 'EXC' ||
    id.includes('exc') ||
    id.includes('expansion_citadel')
  ) {
    renderExpansionCitadel(ctx, r, timeMs);
    return;
  }

  // Procedural Shipyard Slipways (SY_LIGHT, SY_MEDIUM, SY_HEAVY)
  if (
    rUpper === 'SY_LIGHT' ||
    rUpper === 'LIGHT_SHIPYARD' ||
    sType === 'SY_LIGHT' ||
    sType === 'LIGHT_SHIPYARD' ||
    sCode === 'SY-L' ||
    id.includes('sy_light') ||
    id.includes('light_shipyard') ||
    id.includes('light-shipyard')
  ) {
    renderLightShipyard(ctx, r, timeMs);
    return;
  }
  if (
    rUpper === 'SY_MEDIUM' ||
    rUpper === 'MEDIUM_SHIPYARD' ||
    sType === 'SY_MEDIUM' ||
    sType === 'MEDIUM_SHIPYARD' ||
    sCode === 'SY-M' ||
    id.includes('sy_medium') ||
    id.includes('medium_shipyard') ||
    id.includes('medium-shipyard')
  ) {
    renderMediumShipyard(ctx, r, timeMs);
    return;
  }
  if (
    rUpper === 'SY_HEAVY' ||
    rUpper === 'CAPITAL_SHIPYARD' ||
    sType === 'SY_HEAVY' ||
    sType === 'CAPITAL_SHIPYARD' ||
    sCode === 'SY-H' ||
    id.includes('sy_heavy') ||
    id.includes('capital_shipyard') ||
    id.includes('capital-shipyard') ||
    id.includes('heavy_shipyard') ||
    id.includes('heavy-shipyard')
  ) {
    renderHeavyShipyard(ctx, r, timeMs);
    return;
  }

  // Defensive & Support Stations
  if (role === 'MISSILE_BATTERY' || sType === 'MISSILE_BATTERY' || id.includes('missile_battery')) {
    renderMissileBattery(ctx, r, timeMs);
    return;
  }
  if (role === 'PD_PLATFORM' || sType === 'PD_PLATFORM' || id.includes('pd_platform')) {
    renderPdPlatform(ctx, r, timeMs);
    return;
  }
  if (role === 'REPAIR_BAY' || sType === 'REPAIR_BAY' || id.includes('repair_bay')) {
    renderRepairBay(ctx, r, timeMs);
    return;
  }
  if (role === 'ORBITAL_REFINERY' || sType === 'ORBITAL_REFINERY' || id.includes('refinery')) {
    renderOrbitalRefinery(ctx, r, timeMs);
    return;
  }

  // General fallback for shipyard roles
  if (
    role === 'SY_LIGHT' ||
    role === 'SY_MEDIUM' ||
    role === 'SY_HEAVY' ||
    id.includes('shipyard')
  ) {
    if (id.includes('heavy') || id.includes('capital') || role === 'SY_HEAVY') {
      renderHeavyShipyard(ctx, r, timeMs);
    } else if (id.includes('medium') || role === 'SY_MEDIUM') {
      renderMediumShipyard(ctx, r, timeMs);
    } else {
      renderLightShipyard(ctx, r, timeMs);
    }
    return;
  }

  // Structure catalog fallback check
  if (sType && renderStructureByRoleOrType(ctx, sType, r, timeMs)) {
    return;
  }
  if (rUpper && renderStructureByRoleOrType(ctx, rUpper, r, timeMs)) {
    return;
  }

  // Logistics & Auxiliary Craft
  if (role === 'MINER' || id.includes('miner') || id.includes('prospector')) {
    renderAutonomousMiner(ctx, ship, r, timeMs);
    return;
  }
  if (role === 'BUILDER' || id.includes('builder')) {
    renderBuilderUnit(ctx, r, timeMs);
    return;
  }
  if (role === 'COLLIER' || id === 'atlas-unrep') {
    renderCollier(ctx, r);
    return;
  }
  if (role === 'TANKER' || id.includes('tanker')) {
    renderFleetTanker(ctx, r);
    return;
  }
  if (role === 'REPAIR' || role === 'REP_SHIP' || id.includes('repair')) {
    renderRepairShip(ctx, r, timeMs);
    return;
  }
  if (role === 'SCRAP' || role === 'SALVAGER' || id.includes('scrap') || id.includes('barge')) {
    renderScrapBarge(ctx, r);
    return;
  }

  // Procedural Hard-Surface Combatant Silhouettes (Both Friendly & Hostile)
  if (role === 'FRIGATE' || id.includes('fg') || id.includes('frigate')) {
    drawFrigate(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'DESTROYER' || id.includes('dd') || id.includes('destroyer')) {
    drawDestroyer(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'LIGHT_CRUISER' || id.includes('cl') || id.includes('light-cruiser')) {
    drawLightCruiser(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'HEAVY_CRUISER' || id.includes('ch') || id.includes('heavy-cruiser')) {
    drawHeavyCruiser(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'BATTLECRUISER' || id.includes('bc') || id.includes('battlecruiser')) {
    drawBattlecruiser(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'BATTLESHIP' || id.includes('bb') || id.includes('battleship')) {
    drawBattleship(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'DREADNOUGHT' || id.includes('dn') || id.includes('dreadnought')) {
    drawDreadnought(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'CARRIER' || role === 'SUPER_CARRIER' || id.includes('carrier') || id.includes('cv')) {
    drawCarrier(ctx, ship, r, timeMs, isHostile);
    return;
  }
  if (role === 'CRUISER' || id.includes('cruiser') || id.includes('vanguard')) {
    drawLightCruiser(ctx, ship, r, timeMs, isHostile);
    return;
  }

  // Fallbacks
  if (isHostile) {
    renderEnemyShip(ctx, ship, r, timeMs);
  } else {
    renderVanguard(ctx, ship, r);
  }
}

/**
 * Shared Thruster Directional Plume Renderer
 * Draws bright cyan/amber directional plumes at engine ports during active burns
 */
function renderThrusterPlume(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  length: number,
  isBurn: boolean,
  color: string,
  timeMs: number
) {
  if (!isBurn) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(x - 1.5, y, width * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  const flicker = 0.85 + Math.sin(timeMs * 0.045 + x * 2.1 + y * 3.7) * 0.15;
  const l = length * flicker;

  // Outer plume glow
  const grad = ctx.createLinearGradient(x, y, x - l, y);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(x, y - width * 0.5);
  ctx.lineTo(x - l, y);
  ctx.lineTo(x, y + width * 0.5);
  ctx.closePath();
  ctx.fill();

  // Core white lance
  const coreGrad = ctx.createLinearGradient(x, y, x - l * 0.55, y);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, color);
  coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(x, y - width * 0.25);
  ctx.lineTo(x - l * 0.55, y);
  ctx.lineTo(x, y + width * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 1. FRIGATE (FG) - Charon / Paris Class UNSC Profile
 * - Distinct twin-boom split prow with recessed central MAC barrel channel
 * - Angled midship bridge collar, stepped armor collar
 * - Wide, low-profile twin engine block with dual rectangular drive thrusters
 * - Dimensions: ~38px long by 16px wide
 */
export function drawFrigate(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Frigate is 4.0; scale s allows smooth tactical zoom
  const s = Math.max(0.2, r / 4.0);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Primary Titanium-A Twin-Boom Armor Hull
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 1.4 * s);

  ctx.beginPath();
  // Starboard forward boom tip
  ctx.moveTo(19.0 * s, 3.2 * s);
  ctx.lineTo(19.0 * s, 6.8 * s);
  ctx.lineTo(14.0 * s, 8.0 * s);  // Chamfered bow shoulder
  ctx.lineTo(2.0 * s, 7.5 * s);   // Midship flank
  ctx.lineTo(0.0 * s, 6.2 * s);   // Stepped armor collar
  ctx.lineTo(-7.0 * s, 6.2 * s);  // Waist
  ctx.lineTo(-9.0 * s, 7.5 * s);  // Engine block shoulder step
  ctx.lineTo(-19.0 * s, 6.5 * s); // Stern corner starboard
  // Flat Stern
  ctx.lineTo(-19.0 * s, -6.5 * s);// Stern corner port
  // Port flank
  ctx.lineTo(-9.0 * s, -7.5 * s);
  ctx.lineTo(-7.0 * s, -6.2 * s);
  ctx.lineTo(0.0 * s, -6.2 * s);
  ctx.lineTo(2.0 * s, -7.5 * s);
  ctx.lineTo(14.0 * s, -8.0 * s);
  ctx.lineTo(19.0 * s, -6.8 * s); // Port forward boom tip
  ctx.lineTo(19.0 * s, -3.2 * s); // Port inner MAC notch
  // Recessed central MAC trough opening
  ctx.lineTo(5.0 * s, -2.2 * s);
  ctx.lineTo(5.0 * s, 2.2 * s);
  ctx.lineTo(19.0 * s, 3.2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Recessed Magnetic Accelerator Cannon (MAC) Barrel Channel
  ctx.fillStyle = trenchColor;
  ctx.fillRect(-2.0 * s, -2.4 * s, 20.0 * s, 4.8 * s);
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.0 * s);
  ctx.strokeRect(-2.0 * s, -2.4 * s, 20.0 * s, 4.8 * s);

  // Spinal MAC Rail Bore & Field Coils
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.fillRect(-1.0 * s, -1.0 * s, 19.5 * s, 2.0 * s);
  // Coils
  ctx.fillStyle = engineGlow;
  for (let c = 0; c < 4; c++) {
    ctx.fillRect((2.0 + c * 4.0) * s, -1.4 * s, 1.2 * s, 2.8 * s);
  }

  // 3. Stepped Midship Bridge Armor Collar & Upper Deck Plating
  ctx.fillStyle = plateHighlight;
  ctx.beginPath();
  ctx.moveTo(1.0 * s, -4.8 * s);
  ctx.lineTo(1.0 * s, 4.8 * s);
  ctx.lineTo(-8.0 * s, 4.8 * s);
  ctx.lineTo(-8.0 * s, -4.8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tactical Bridge Visor Slit
  ctx.fillStyle = factionColor;
  ctx.fillRect(-2.0 * s, -1.5 * s, 2.4 * s, 3.0 * s);

  // Panel Seams / Chamfer Accent Marks
  ctx.strokeStyle = chamferColor;
  ctx.beginPath();
  ctx.moveTo(13.0 * s, -7.5 * s);
  ctx.lineTo(6.0 * s, -2.4 * s);
  ctx.moveTo(13.0 * s, 7.5 * s);
  ctx.lineTo(6.0 * s, 2.4 * s);
  ctx.stroke();

  // 4. Low-Profile Twin Engine Block Cowlings & Drive Exhausts
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.fillRect(-19.0 * s, -5.5 * s, 3.5 * s, 3.4 * s);
  ctx.fillRect(-19.0 * s, 2.1 * s, 3.5 * s, 3.4 * s);
  ctx.strokeRect(-19.0 * s, -5.5 * s, 3.5 * s, 3.4 * s);
  ctx.strokeRect(-19.0 * s, 2.1 * s, 3.5 * s, 3.4 * s);

  // Glowing Rectangular Ion Exhaust Nozzles
  ctx.fillStyle = UNSC_PALETTE.exhaustNozzle;
  ctx.fillRect(-19.4 * s, -5.0 * s, 1.0 * s, 2.4 * s);
  ctx.fillRect(-19.4 * s, 2.6 * s, 1.0 * s, 2.4 * s);
  ctx.fillStyle = engineGlow;
  ctx.fillRect(-19.2 * s, -4.6 * s, 0.8 * s, 1.6 * s);
  ctx.fillRect(-19.2 * s, 3.0 * s, 0.8 * s, 1.6 * s);

  // Engine Plumes
  renderThrusterPlume(ctx, -19.4 * s, -3.8 * s, 3.0 * s, 12.0 * s, isBurn, engineGlow, timeMs);
  renderThrusterPlume(ctx, -19.4 * s, 3.8 * s, 3.0 * s, 12.0 * s, isBurn, engineGlow, timeMs);

  ctx.restore();
}

export const renderFrigate = drawFrigate;

/**
 * 2. DESTROYER (DD) - UNSC Industrial Wedge Profile
 * - Aggressive, heavily armored wedge with notched forward snout
 * - 45° chamfered prow corners, stepped armored dorsal plate
 * - Reinforced lateral missile blister pods on slab-sided sponsons
 * - Heavy tri-cluster engine exhaust cowlings
 * - Dimensions: ~48px long by 20px wide
 */
export function drawDestroyer(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Destroyer is 6.33
  const s = Math.max(0.2, r / 6.33);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Primary Titanium-A Heavy Wedge Hull
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 1.5 * s);

  ctx.beginPath();
  // Notched snout
  ctx.moveTo(24.0 * s, 1.5 * s);
  ctx.lineTo(24.0 * s, 4.0 * s);
  ctx.lineTo(20.0 * s, 7.0 * s);  // 45° chamfered forward corner
  ctx.lineTo(7.0 * s, 7.0 * s);   // Forward waist
  // Lateral Missile Blister Sponson (Starboard)
  ctx.lineTo(6.0 * s, 10.0 * s);  // Outward step
  ctx.lineTo(-8.0 * s, 10.0 * s); // Sponson flank
  ctx.lineTo(-10.0 * s, 7.5 * s); // Inset
  ctx.lineTo(-20.0 * s, 7.5 * s); // Aft flank
  ctx.lineTo(-24.0 * s, 6.0 * s); // Stern corner
  // Flat Stern
  ctx.lineTo(-24.0 * s, -6.0 * s);
  // Port flank
  ctx.lineTo(-20.0 * s, -7.5 * s);
  ctx.lineTo(-10.0 * s, -7.5 * s);
  // Lateral Missile Blister Sponson (Port)
  ctx.lineTo(-8.0 * s, -10.0 * s);
  ctx.lineTo(6.0 * s, -10.0 * s);
  ctx.lineTo(7.0 * s, -7.0 * s);
  ctx.lineTo(20.0 * s, -7.0 * s); // 45° chamfered forward corner
  ctx.lineTo(24.0 * s, -4.0 * s);
  ctx.lineTo(24.0 * s, -1.5 * s);
  // Central snout notch
  ctx.lineTo(22.0 * s, 0.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Lateral Missile Silo Cells (4 hatches per sponson)
  ctx.fillStyle = trenchColor;
  ctx.fillRect(-7.0 * s, -9.4 * s, 12.0 * s, 2.0 * s);
  ctx.fillRect(-7.0 * s, 7.4 * s, 12.0 * s, 2.0 * s);
  ctx.fillStyle = isHostile ? '#7f1d1d' : '#0369a1';
  for (let m = 0; m < 4; m++) {
    const mx = (-6.0 + m * 3.0) * s;
    ctx.fillRect(mx, -9.0 * s, 2.0 * s, 1.2 * s);
    ctx.fillRect(mx, 7.8 * s, 2.0 * s, 1.2 * s);
  }

  // 3. Stepped Armored Dorsal Plate & Command Citadel
  ctx.fillStyle = plateHighlight;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.2 * s);
  ctx.beginPath();
  ctx.moveTo(14.0 * s, -3.8 * s);
  ctx.lineTo(14.0 * s, 3.8 * s);
  ctx.lineTo(-12.0 * s, 4.5 * s);
  ctx.lineTo(-12.0 * s, -4.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Elevated Bridge Conning Tower
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.fillRect(-2.0 * s, -2.5 * s, 6.0 * s, 5.0 * s);
  ctx.fillStyle = factionColor;
  ctx.fillRect(1.5 * s, -1.8 * s, 1.8 * s, 3.6 * s);

  // Spinal Recessed Armor Trough
  ctx.fillStyle = trenchColor;
  ctx.fillRect(14.0 * s, -1.2 * s, 7.0 * s, 2.4 * s);

  // 4. Heavy Tri-Cluster Engine Exhaust Cowlings
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;
  // Center large drive
  ctx.fillRect(-24.5 * s, -2.0 * s, 3.5 * s, 4.0 * s);
  ctx.strokeRect(-24.5 * s, -2.0 * s, 3.5 * s, 4.0 * s);
  // Port / Starboard secondary drives
  ctx.fillRect(-24.0 * s, -5.5 * s, 3.0 * s, 2.8 * s);
  ctx.strokeRect(-24.0 * s, -5.5 * s, 3.0 * s, 2.8 * s);
  ctx.fillRect(-24.0 * s, 2.7 * s, 3.0 * s, 2.8 * s);
  ctx.strokeRect(-24.0 * s, 2.7 * s, 3.0 * s, 2.8 * s);

  // Exhaust Nozzle Glows
  ctx.fillStyle = engineGlow;
  ctx.fillRect(-24.8 * s, -1.4 * s, 0.8 * s, 2.8 * s);
  ctx.fillRect(-24.3 * s, -5.0 * s, 0.8 * s, 1.8 * s);
  ctx.fillRect(-24.3 * s, 3.2 * s, 0.8 * s, 1.8 * s);

  // Plumes
  renderThrusterPlume(ctx, -24.8 * s, 0, 3.6 * s, 15.0 * s, isBurn, engineGlow, timeMs);
  renderThrusterPlume(ctx, -24.3 * s, -4.1 * s, 2.5 * s, 10.0 * s, isBurn, engineGlow, timeMs);
  renderThrusterPlume(ctx, -24.3 * s, 4.1 * s, 2.5 * s, 10.0 * s, isBurn, engineGlow, timeMs);

  ctx.restore();
}

export const renderDestroyer = drawDestroyer;

/**
 * 3. LIGHT CRUISER (CL) - Angular Chisel Hull
 * - Long trapezoidal nose tapering into faceted lateral armor belts
 * - Recessed dorsal trench running 60% of hull length with cross-bulkhead ribs
 * - High-mounted angular command citadel positioned aft
 * - Twin main rectangular thrusters + auxiliary outriggers
 * - Dimensions: ~62px long by 22px wide
 */
export function drawLightCruiser(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Light Cruiser is 9.33
  const s = Math.max(0.2, r / 9.33);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Primary Long Trapezoidal Chisel Hull
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 1.6 * s);

  ctx.beginPath();
  // Chisel Nose
  ctx.moveTo(31.0 * s, -2.5 * s);
  ctx.lineTo(31.0 * s, 2.5 * s);
  ctx.lineTo(20.0 * s, 6.5 * s);  // Forward taper
  ctx.lineTo(6.0 * s, 8.5 * s);   // Waist
  // Stepped flank armor belt
  ctx.lineTo(4.0 * s, 11.0 * s);  // Outward step
  ctx.lineTo(-16.0 * s, 11.0 * s);// Flank armor run
  ctx.lineTo(-22.0 * s, 8.5 * s); // Chamfer to engine block
  ctx.lineTo(-31.0 * s, 7.0 * s); // Stern corner starboard
  // Flat Stern
  ctx.lineTo(-31.0 * s, -7.0 * s);// Stern corner port
  // Port flank
  ctx.lineTo(-22.0 * s, -8.5 * s);
  ctx.lineTo(-16.0 * s, -11.0 * s);
  ctx.lineTo(4.0 * s, -11.0 * s);
  ctx.lineTo(6.0 * s, -8.5 * s);
  ctx.lineTo(20.0 * s, -6.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Recessed Dorsal Trench Running 60% of Hull Length
  ctx.fillStyle = trenchColor;
  ctx.fillRect(-16.0 * s, -2.5 * s, 38.0 * s, 5.0 * s);
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.0 * s);
  ctx.strokeRect(-16.0 * s, -2.5 * s, 38.0 * s, 5.0 * s);

  // Cross-Bulkhead Ribs in Trench
  ctx.strokeStyle = chamferColor;
  for (let b = 0; b < 6; b++) {
    const bx = (-12.0 + b * 5.5) * s;
    ctx.beginPath();
    ctx.moveTo(bx, -2.5 * s);
    ctx.lineTo(bx, 2.5 * s);
    ctx.stroke();
  }

  // Central Optical / Plasma Waveguide
  ctx.fillStyle = engineGlow;
  ctx.fillRect(-14.0 * s, -0.6 * s, 34.0 * s, 1.2 * s);

  // 3. High-Mounted Angular Command Citadel Positioned Aft
  ctx.fillStyle = plateHighlight;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.3 * s);
  ctx.beginPath();
  ctx.moveTo(-4.0 * s, -5.5 * s);
  ctx.lineTo(-4.0 * s, 5.5 * s);
  ctx.lineTo(-15.0 * s, 6.0 * s);
  ctx.lineTo(-15.0 * s, -6.0 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Command Bridge Visor Glass
  ctx.fillStyle = factionColor;
  ctx.fillRect(-6.0 * s, -2.0 * s, 2.4 * s, 4.0 * s);

  // 4. Stepped Flank Armor Highlight Strips
  ctx.fillStyle = plateHighlight;
  ctx.fillRect(-14.0 * s, -10.2 * s, 16.0 * s, 2.4 * s);
  ctx.fillRect(-14.0 * s, 7.8 * s, 16.0 * s, 2.4 * s);

  // 5. Dual Main Rectangular Thrusters & Auxiliary Vernier Outriggers
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;
  // Main Dual Thrusters
  ctx.fillRect(-31.5 * s, -5.5 * s, 4.0 * s, 4.0 * s);
  ctx.strokeRect(-31.5 * s, -5.5 * s, 4.0 * s, 4.0 * s);
  ctx.fillRect(-31.5 * s, 1.5 * s, 4.0 * s, 4.0 * s);
  ctx.strokeRect(-31.5 * s, 1.5 * s, 4.0 * s, 4.0 * s);

  // Outrigger Verniers
  ctx.fillRect(-27.0 * s, -8.5 * s, 2.5 * s, 2.0 * s);
  ctx.fillRect(-27.0 * s, 6.5 * s, 2.5 * s, 2.0 * s);

  // Exhaust Nozzles
  ctx.fillStyle = engineGlow;
  ctx.fillRect(-31.8 * s, -4.8 * s, 0.8 * s, 2.6 * s);
  ctx.fillRect(-31.8 * s, 2.2 * s, 0.8 * s, 2.6 * s);

  // Plumes
  renderThrusterPlume(ctx, -31.8 * s, -3.5 * s, 3.5 * s, 18.0 * s, isBurn, engineGlow, timeMs);
  renderThrusterPlume(ctx, -31.8 * s, 3.5 * s, 3.5 * s, 18.0 * s, isBurn, engineGlow, timeMs);

  ctx.restore();
}

export const renderLightCruiser = drawLightCruiser;
export const drawCruiser = drawLightCruiser;

/**
 * 4. HEAVY CRUISER (CA/CH) - Halcyon / Autumn Class UNSC Profile
 * - Massive, brutalist, octagonal cross-section hull with dense cellular honeycomb armor plating
 * - Heavy rectangular blunt prow with beveled outer breakwaters
 * - Deep-set spinal MAC barrel with magnetic accelerator coils
 * - Stepped bridge tower set directly forward of a massive blocky triple-thruster engine block
 * - Deep longitudinal panel grooves indicating layered ablative armor belts
 * - Dimensions: ~78px long by 28px wide
 */
export function drawHeavyCruiser(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Heavy Cruiser is 13.0
  const s = Math.max(0.2, r / 13.0);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Brutalist Octagonal Cross-Section Main Hull with Blunt Prow
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 1.8 * s);

  ctx.beginPath();
  // Blunt Prow Face (Starboard)
  ctx.moveTo(39.0 * s, 2.5 * s);
  ctx.lineTo(39.0 * s, 6.0 * s);
  ctx.lineTo(32.0 * s, 11.0 * s); // Beveled outer breakwater
  ctx.lineTo(18.0 * s, 13.0 * s); // Forward armor collar
  // Layered Ablative Armor Belt Flank
  ctx.lineTo(14.0 * s, 14.0 * s); // Maximum beam shoulder
  ctx.lineTo(-22.0 * s, 14.0 * s);// Heavy flank armor
  ctx.lineTo(-28.0 * s, 12.0 * s);// Stepped engine transition
  ctx.lineTo(-39.0 * s, 10.5 * s);// Stern corner starboard
  // Flat Engine Gantry Stern
  ctx.lineTo(-39.0 * s, -10.5 * s);
  // Port flank
  ctx.lineTo(-28.0 * s, -12.0 * s);
  ctx.lineTo(-22.0 * s, -14.0 * s);
  ctx.lineTo(14.0 * s, -14.0 * s);
  ctx.lineTo(18.0 * s, -13.0 * s);
  ctx.lineTo(32.0 * s, -11.0 * s);
  ctx.lineTo(39.0 * s, -6.0 * s);
  ctx.lineTo(39.0 * s, -2.5 * s); // Blunt Prow Face (Port)
  // Deep-Set Spinal MAC Barrel Notch
  ctx.lineTo(24.0 * s, -2.5 * s);
  ctx.lineTo(24.0 * s, 2.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Deep-Set Spinal MAC Barrel & Magnetic Accelerator Rings
  ctx.fillStyle = trenchColor;
  ctx.fillRect(16.0 * s, -3.0 * s, 23.0 * s, 6.0 * s);
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.0 * s);
  ctx.strokeRect(16.0 * s, -3.0 * s, 23.0 * s, 6.0 * s);

  // Heavy Rail Bore & Field Coils
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.fillRect(16.0 * s, -1.2 * s, 23.0 * s, 2.4 * s);
  ctx.fillStyle = engineGlow;
  for (let k = 0; k < 5; k++) {
    ctx.fillRect((18.0 + k * 4.2) * s, -1.8 * s, 1.4 * s, 3.6 * s);
  }

  // 3. Dense Cellular Honeycomb Armor Belts & Longitudinal Grooves
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.1 * s);
  // Upper & Lower Longitudinal Grooves
  ctx.beginPath();
  ctx.moveTo(16.0 * s, -9.0 * s);
  ctx.lineTo(-24.0 * s, -9.0 * s);
  ctx.moveTo(16.0 * s, 9.0 * s);
  ctx.lineTo(-24.0 * s, 9.0 * s);
  // Transverse Cellular Armor Seams
  for (let c = 0; c < 5; c++) {
    const cx = (10.0 - c * 7.0) * s;
    ctx.moveTo(cx, -13.5 * s);
    ctx.lineTo(cx, -9.0 * s);
    ctx.moveTo(cx, 9.0 * s);
    ctx.lineTo(cx, 13.5 * s);
  }
  ctx.stroke();

  // 4. Stepped Command Bridge Tower Set Directly Forward of Engines
  ctx.fillStyle = plateHighlight;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.4 * s);
  ctx.beginPath();
  ctx.moveTo(2.0 * s, -5.5 * s);
  ctx.lineTo(2.0 * s, 5.5 * s);
  ctx.lineTo(-14.0 * s, 6.5 * s);
  ctx.lineTo(-14.0 * s, -6.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bridge Conning Tower & Armored Deflector Breakwaters
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.fillRect(-6.0 * s, -3.2 * s, 8.0 * s, 6.4 * s);
  ctx.fillStyle = factionColor;
  ctx.fillRect(-1.0 * s, -2.0 * s, 2.5 * s, 4.0 * s);

  // 5. Massive Blocky Triple-Thruster Engine Block
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;

  // Center Colossal Thruster
  ctx.fillRect(-39.5 * s, -3.8 * s, 5.0 * s, 7.6 * s);
  ctx.strokeRect(-39.5 * s, -3.8 * s, 5.0 * s, 7.6 * s);
  // Flanking Heavy Thrusters
  ctx.fillRect(-39.0 * s, -9.5 * s, 4.5 * s, 4.5 * s);
  ctx.strokeRect(-39.0 * s, -9.5 * s, 4.5 * s, 4.5 * s);
  ctx.fillRect(-39.0 * s, 5.0 * s, 4.5 * s, 4.5 * s);
  ctx.strokeRect(-39.0 * s, 5.0 * s, 4.5 * s, 4.5 * s);

  // Glowing Rectangular Nozzles
  ctx.fillStyle = engineGlow;
  ctx.fillRect(-39.8 * s, -2.8 * s, 1.0 * s, 5.6 * s);
  ctx.fillRect(-39.3 * s, -8.5 * s, 0.8 * s, 2.5 * s);
  ctx.fillRect(-39.3 * s, 6.0 * s, 0.8 * s, 2.5 * s);

  // Plumes
  renderThrusterPlume(ctx, -39.8 * s, 0, 6.0 * s, 24.0 * s, isBurn, engineGlow, timeMs);
  renderThrusterPlume(ctx, -39.3 * s, -7.2 * s, 4.0 * s, 16.0 * s, isBurn, engineGlow, timeMs);
  renderThrusterPlume(ctx, -39.3 * s, 7.2 * s, 4.0 * s, 16.0 * s, isBurn, engineGlow, timeMs);

  ctx.restore();
}

export const renderHeavyCruiser = drawHeavyCruiser;

/**
 * 5. BATTLECRUISER (BC) - Needle-Sharp Industrial Wedge
 * - Long, needle-sharp industrial wedge with tiered dorsal turret barbettes
 * - Sharp faceted bow with stepped armor shoulders
 * - Extended midship battery deck with 3 angular turret mounts along spine
 * - Narrow armored engine trench with quad exhausts
 * - Dimensions: ~94px long by 30px wide
 */
export function drawBattlecruiser(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Battlecruiser is 16.67
  const s = Math.max(0.2, r / 16.67);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Long Needle-Sharp Industrial Wedge Hull
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 1.9 * s);

  ctx.beginPath();
  // Chisel Needle Bow Tip
  ctx.moveTo(47.0 * s, -1.8 * s);
  ctx.lineTo(47.0 * s, 1.8 * s);
  ctx.lineTo(36.0 * s, 6.5 * s);  // Faceted bow flare
  ctx.lineTo(24.0 * s, 10.0 * s); // Stepped shoulder
  ctx.lineTo(22.0 * s, 13.0 * s); // Shoulder step
  ctx.lineTo(8.0 * s, 14.5 * s);  // Forward strake
  ctx.lineTo(0.0 * s, 15.0 * s);  // Maximum beam
  ctx.lineTo(-22.0 * s, 15.0 * s);// Midship battery belt
  ctx.lineTo(-30.0 * s, 12.0 * s);// Aft taper
  ctx.lineTo(-47.0 * s, 9.0 * s); // Stern corner starboard
  // Flat Stern
  ctx.lineTo(-47.0 * s, -9.0 * s);
  // Port flank
  ctx.lineTo(-30.0 * s, -12.0 * s);
  ctx.lineTo(-22.0 * s, -15.0 * s);
  ctx.lineTo(0.0 * s, -15.0 * s);
  ctx.lineTo(8.0 * s, -14.5 * s);
  ctx.lineTo(22.0 * s, -13.0 * s);
  ctx.lineTo(24.0 * s, -10.0 * s);
  ctx.lineTo(36.0 * s, -6.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Central Structural Trench Flanking Barbettes
  ctx.fillStyle = trenchColor;
  ctx.fillRect(-28.0 * s, -3.2 * s, 60.0 * s, 6.4 * s);
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.0 * s);
  ctx.strokeRect(-28.0 * s, -3.2 * s, 60.0 * s, 6.4 * s);

  // 3. Tiered Dorsal Turret Battery Deck & Barbettes
  ctx.fillStyle = plateHighlight;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.3 * s);
  ctx.fillRect(-24.0 * s, -6.5 * s, 48.0 * s, 13.0 * s);
  ctx.strokeRect(-24.0 * s, -6.5 * s, 48.0 * s, 13.0 * s);

  // 3 Heavy Angular Main Battery Turret Barbettes
  const turretX = [18.0, 0.0, -16.0];
  turretX.forEach((tx) => {
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    ctx.strokeStyle = chamferColor;
    // Octagonal Barbette
    ctx.beginPath();
    ctx.moveTo((tx + 3.2) * s, -2.5 * s);
    ctx.lineTo((tx + 3.2) * s, 2.5 * s);
    ctx.lineTo((tx - 2.0) * s, 3.2 * s);
    ctx.lineTo((tx - 3.2) * s, 2.0 * s);
    ctx.lineTo((tx - 3.2) * s, -2.0 * s);
    ctx.lineTo((tx - 2.0) * s, -3.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin Heavy Gun Barrels
    ctx.fillStyle = isHostile ? '#7f1d1d' : '#38bdf8';
    ctx.fillRect((tx + 2.8) * s, -1.8 * s, 5.0 * s, 1.0 * s);
    ctx.fillRect((tx + 2.8) * s, 0.8 * s, 5.0 * s, 1.0 * s);
  });

  // Centerline Flagship Bridge
  ctx.fillStyle = UNSC_PALETTE.primaryArmorHighlight;
  ctx.fillRect(-8.0 * s, -2.0 * s, 5.0 * s, 4.0 * s);
  ctx.fillStyle = factionColor;
  ctx.fillRect(-5.0 * s, -1.2 * s, 1.8 * s, 2.4 * s);

  // 4. Narrow Armored Engine Trench with Quad Exhausts
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;
  const bY = [-6.5, -2.2, 2.2, 6.5];
  bY.forEach((offsetY) => {
    ctx.fillRect(-47.5 * s, (offsetY - 1.5) * s, 4.0 * s, 3.0 * s);
    ctx.strokeRect(-47.5 * s, (offsetY - 1.5) * s, 4.0 * s, 3.0 * s);
    ctx.fillStyle = engineGlow;
    ctx.fillRect(-47.8 * s, (offsetY - 1.0) * s, 0.8 * s, 2.0 * s);
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    renderThrusterPlume(ctx, -47.8 * s, offsetY * s, 2.8 * s, 16.0 * s, isBurn, engineGlow, timeMs);
  });

  ctx.restore();
}

export const renderBattlecruiser = drawBattlecruiser;

/**
 * 6. BATTLESHIP (BB) - UNSC Epoch / Valiant Class Industrial Battleship
 * - Towering, heavily tiered industrial hull with stepped bow bulwarks
 * - Dual parallel spinal MAC bores in deep centerline armor trench
 * - Stepped broadside missile batteries with recessed armored doors
 * - Elevated command citadel flanked by point-defense and sensor towers
 * - Massive quad-box thruster engine block with integrated radiator cowlings
 * - Dimensions: ~108px long by 36px wide
 */
export function drawBattleship(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Battleship is 20.0
  const s = Math.max(0.2, r / 20.0);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Heavy Stepped Industrial Hull
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 2.0 * s);

  ctx.beginPath();
  // Blunt Prow (Starboard)
  ctx.moveTo(54.0 * s, 3.0 * s);
  ctx.lineTo(54.0 * s, 8.0 * s);
  ctx.lineTo(44.0 * s, 14.0 * s); // Forward bulwark chamfer
  ctx.lineTo(28.0 * s, 14.0 * s); // Forward armor waist
  // Stepped Broadside Pod Starboard
  ctx.lineTo(24.0 * s, 18.0 * s); // Step out
  ctx.lineTo(-24.0 * s, 18.0 * s);// Heavy broadside flank
  ctx.lineTo(-28.0 * s, 15.0 * s);// Step in
  ctx.lineTo(-44.0 * s, 15.0 * s);// Engine block flank
  ctx.lineTo(-54.0 * s, 12.0 * s);// Stern corner starboard
  // Flat Engine Stern
  ctx.lineTo(-54.0 * s, -12.0 * s);
  // Port flank
  ctx.lineTo(-44.0 * s, -15.0 * s);
  ctx.lineTo(-28.0 * s, -15.0 * s);
  ctx.lineTo(-24.0 * s, -18.0 * s);
  ctx.lineTo(28.0 * s, -14.0 * s);
  ctx.lineTo(44.0 * s, -14.0 * s);
  ctx.lineTo(54.0 * s, -8.0 * s);
  ctx.lineTo(54.0 * s, -3.0 * s); // Blunt Prow (Port)
  // Deep Central Bow Recess
  ctx.lineTo(38.0 * s, -3.0 * s);
  ctx.lineTo(38.0 * s, 3.0 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Dual Parallel Spinal MAC Bores in Recessed Armor Trench
  ctx.fillStyle = trenchColor;
  ctx.fillRect(18.0 * s, -4.5 * s, 36.0 * s, 9.0 * s);
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.0 * s);
  ctx.strokeRect(18.0 * s, -4.5 * s, 36.0 * s, 9.0 * s);

  // Twin MAC Tubes with Accelerator Rails
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.fillRect(20.0 * s, -3.5 * s, 34.0 * s, 2.2 * s);
  ctx.fillRect(20.0 * s, 1.3 * s, 34.0 * s, 2.2 * s);
  ctx.fillStyle = engineGlow;
  for (let c = 0; c < 6; c++) {
    const cx = (22.0 + c * 5.2) * s;
    ctx.fillRect(cx, -3.2 * s, 1.2 * s, 1.6 * s);
    ctx.fillRect(cx, 1.6 * s, 1.2 * s, 1.6 * s);
  }

  // 3. Multi-Tiered Citadel Frame & Turret Battery Plating
  ctx.fillStyle = plateHighlight;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.4 * s);
  ctx.beginPath();
  ctx.moveTo(16.0 * s, -8.0 * s);
  ctx.lineTo(16.0 * s, 8.0 * s);
  ctx.lineTo(-22.0 * s, 9.5 * s);
  ctx.lineTo(-22.0 * s, -9.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Heavy Dorsal Turrets (Forward & Aft Barbettes)
  const barbettes = [8.0, -14.0];
  barbettes.forEach((bx) => {
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    ctx.strokeStyle = chamferColor;
    ctx.beginPath();
    ctx.arc(bx * s, 0, 4.0 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Heavy Triple Guns
    ctx.fillStyle = isHostile ? '#7f1d1d' : '#38bdf8';
    ctx.fillRect((bx + 3.0) * s, -2.2 * s, 7.0 * s, 1.1 * s);
    ctx.fillRect((bx + 3.0) * s, -0.55 * s, 7.0 * s, 1.1 * s);
    ctx.fillRect((bx + 3.0) * s, 1.1 * s, 7.0 * s, 1.1 * s);
  });

  // Center Elevated Command Bridge
  ctx.fillStyle = UNSC_PALETTE.primaryArmorHighlight;
  ctx.fillRect(-6.0 * s, -3.5 * s, 9.0 * s, 7.0 * s);
  ctx.fillStyle = factionColor;
  ctx.fillRect(1.5 * s, -2.0 * s, 2.0 * s, 4.0 * s);

  // Stepped Broadside Missile Cell Arrays (6 cells per side)
  ctx.fillStyle = trenchColor;
  ctx.fillRect(-18.0 * s, -17.2 * s, 36.0 * s, 2.4 * s);
  ctx.fillRect(-18.0 * s, 14.8 * s, 36.0 * s, 2.4 * s);
  ctx.fillStyle = isHostile ? '#991b1b' : '#0284c7';
  for (let m = 0; m < 6; m++) {
    const mx = (-16.0 + m * 5.8) * s;
    ctx.fillRect(mx, -16.8 * s, 3.6 * s, 1.6 * s);
    ctx.fillRect(mx, 15.2 * s, 3.6 * s, 1.6 * s);
  }

  // 4. Massive Quad-Box Engine Block
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;
  const engineY = [-8.5, -3.0, 3.0, 8.5];
  engineY.forEach((ey) => {
    ctx.fillRect(-54.5 * s, (ey - 2.2) * s, 5.0 * s, 4.4 * s);
    ctx.strokeRect(-54.5 * s, (ey - 2.2) * s, 5.0 * s, 4.4 * s);
    ctx.fillStyle = engineGlow;
    ctx.fillRect(-54.8 * s, (ey - 1.5) * s, 1.0 * s, 3.0 * s);
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    renderThrusterPlume(ctx, -54.8 * s, ey * s, 4.2 * s, 20.0 * s, isBurn, engineGlow, timeMs);
  });

  ctx.restore();
}

export const renderBattleship = drawBattleship;

/**
 * 7. DREADNOUGHT (DN) - Infinity Class Super-Heavy UNSC Fortress Profile
 * - Colossal, monolithic industrial warship chassis with multi-layered armor belts
 * - Massive slab prow with heavy chamfered corners and quad spinal Super-MAC bores
 * - Stepped broadside armor bastions flanked by secondary missile and point-defense trenches
 * - Elevated command fortress citadel with sensor arrays and communications masts
 * - Colossal 5-engine propulsion gantry (1 massive central fusion drive + 4 auxiliary drive cowlings)
 * - Dimensions: ~130px long by 44px wide
 */
export function drawDreadnought(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Dreadnought is 23.33
  const s = Math.max(0.2, r / 23.33);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Colossal Monolithic Industrial Hull with Broad Slab Prow
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 2.2 * s);

  ctx.beginPath();
  // Starboard Slab Prow Face
  ctx.moveTo(65.0 * s, 4.0 * s);
  ctx.lineTo(65.0 * s, 10.0 * s);
  ctx.lineTo(52.0 * s, 18.0 * s); // Prow 45° chamfer
  ctx.lineTo(34.0 * s, 18.0 * s); // Forward shoulder
  // Heavy Outrigger Armor Bastion (Starboard)
  ctx.lineTo(30.0 * s, 22.0 * s); // Step out
  ctx.lineTo(-32.0 * s, 22.0 * s);// Bastion flank
  ctx.lineTo(-38.0 * s, 18.0 * s);// Step in
  ctx.lineTo(-54.0 * s, 18.0 * s);// Engine block flank
  ctx.lineTo(-65.0 * s, 15.0 * s);// Stern corner starboard
  // Flat Engine Stern Gantry
  ctx.lineTo(-65.0 * s, -15.0 * s);
  // Port flank
  ctx.lineTo(-54.0 * s, -18.0 * s);
  ctx.lineTo(-38.0 * s, -18.0 * s);
  ctx.lineTo(-32.0 * s, -22.0 * s);
  ctx.lineTo(30.0 * s, -22.0 * s);
  ctx.lineTo(34.0 * s, -18.0 * s);
  ctx.lineTo(52.0 * s, -18.0 * s);
  ctx.lineTo(65.0 * s, -10.0 * s);
  ctx.lineTo(65.0 * s, -4.0 * s); // Port Slab Prow Face
  // Central Super-MAC Recessed Notch
  ctx.lineTo(46.0 * s, -4.0 * s);
  ctx.lineTo(46.0 * s, 4.0 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Central Super-MAC Recessed Trench (Quad Accelerator Arrays)
  ctx.fillStyle = trenchColor;
  ctx.fillRect(20.0 * s, -5.5 * s, 44.0 * s, 11.0 * s);
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.2 * s);
  ctx.strokeRect(20.0 * s, -5.5 * s, 44.0 * s, 11.0 * s);

  // Quad Heavy MAC Bores
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  const macY = [-3.8, -1.3, 1.3, 3.8];
  macY.forEach((my) => {
    ctx.fillRect(22.0 * s, (my - 0.7) * s, 42.0 * s, 1.4 * s);
  });
  // Electromagnetic Coils
  ctx.fillStyle = engineGlow;
  for (let k = 0; k < 7; k++) {
    const kx = (25.0 + k * 5.6) * s;
    macY.forEach((my) => {
      ctx.fillRect(kx, (my - 0.9) * s, 1.4 * s, 1.8 * s);
    });
  }

  // 3. Multi-Layered Dorsal Citadel Deck
  ctx.fillStyle = plateHighlight;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(18.0 * s, -11.0 * s);
  ctx.lineTo(18.0 * s, 11.0 * s);
  ctx.lineTo(-28.0 * s, 12.5 * s);
  ctx.lineTo(-28.0 * s, -12.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Elevated Command Citadel Fortress
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;
  ctx.fillRect(-12.0 * s, -5.0 * s, 14.0 * s, 10.0 * s);
  ctx.strokeRect(-12.0 * s, -5.0 * s, 14.0 * s, 10.0 * s);
  ctx.fillStyle = factionColor;
  ctx.fillRect(0.0 * s, -3.0 * s, 2.5 * s, 6.0 * s);

  // Heavy Barbette Turrets
  const dnTurrets = [8.0, -18.0];
  dnTurrets.forEach((tx) => {
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    ctx.strokeStyle = chamferColor;
    ctx.beginPath();
    ctx.arc(tx * s, 0, 5.0 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isHostile ? '#7f1d1d' : '#38bdf8';
    ctx.fillRect((tx + 3.5) * s, -2.5 * s, 8.5 * s, 1.4 * s);
    ctx.fillRect((tx + 3.5) * s, 1.1 * s, 8.5 * s, 1.4 * s);
  });

  // Outrigger Missile Pods & Longitudinal Trenches
  ctx.fillStyle = trenchColor;
  ctx.fillRect(-26.0 * s, -21.2 * s, 48.0 * s, 3.2 * s);
  ctx.fillRect(-26.0 * s, 18.0 * s, 48.0 * s, 3.2 * s);
  ctx.fillStyle = isHostile ? '#991b1b' : '#0284c7';
  for (let m = 0; m < 8; m++) {
    const mx = (-24.0 + m * 6.0) * s;
    ctx.fillRect(mx, -20.8 * s, 3.8 * s, 2.4 * s);
    ctx.fillRect(mx, 18.4 * s, 3.8 * s, 2.4 * s);
  }

  // 4. Massive 5-Nozzle Aft Engine Gantry
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;

  // Central Colossal Drive Bell
  ctx.fillRect(-65.8 * s, -4.5 * s, 6.0 * s, 9.0 * s);
  ctx.strokeRect(-65.8 * s, -4.5 * s, 6.0 * s, 9.0 * s);
  ctx.fillStyle = engineGlow;
  ctx.fillRect(-66.2 * s, -3.5 * s, 1.2 * s, 7.0 * s);

  // 4 Flanking Heavy Auxiliary Thrusters
  const auxY = [-11.0, -6.5, 6.5, 11.0];
  auxY.forEach((ay) => {
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    ctx.fillRect(-65.2 * s, (ay - 2.0) * s, 5.0 * s, 4.0 * s);
    ctx.strokeRect(-65.2 * s, (ay - 2.0) * s, 5.0 * s, 4.0 * s);
    ctx.fillStyle = engineGlow;
    ctx.fillRect(-65.5 * s, (ay - 1.3) * s, 0.9 * s, 2.6 * s);
    renderThrusterPlume(ctx, -65.5 * s, ay * s, 3.5 * s, 18.0 * s, isBurn, engineGlow, timeMs);
  });

  // Central Thruster Plume
  renderThrusterPlume(ctx, -66.2 * s, 0, 7.5 * s, 32.0 * s, isBurn, engineGlow, timeMs);

  ctx.restore();
}

export const renderDreadnought = drawDreadnought;

/**
 * 8. CARRIER (CV / CVF) - UNSC Industrial Flat-Top Flight Deck
 * - Rugged asymmetrical flat-top flight deck inspired by modern naval supercarriers
 *   and Homeworld: Deserts of Kharak heavy industrial landships
 * - Starboard offset island superstructure (command citadel, phased radar arrays, sensor spire)
 * - Wide, flat Titanium-A flight deck with recessed launch catapult troughs & angled recovery lane
 * - High-contrast flight deck markings: white guidance lines (#e2e8f0) and amber hazard chevrons (#f59e0b)
 * - Recessed aircraft elevator pits on starboard waist and port flank
 * - Heavy industrial sponsons with point-defense turrets
 * - Blocky quad-thruster engine housing with armored radiator cowlings
 * - Dimensions: ~78-90px long by 36-44px wide
 */
export function drawCarrier(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  // Canonical base radius for Carrier is 25.0
  const s = Math.max(0.2, r / 25.0);
  const isCrippled = ship.hullState === 'CRIPPLED';
  const baseArmor = isHostile ? '#272329' : UNSC_PALETTE.primaryArmorBase;
  const plateHighlight = isHostile ? '#3a2b32' : UNSC_PALETTE.primaryArmorHighlight;
  const deckSurface = isHostile ? '#1c1f24' : '#222831';
  const trenchColor = UNSC_PALETTE.secondaryArmor;
  const chamferColor = isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer;
  const factionColor = isCrippled ? '#ff2222' : isHostile ? '#f43f5e' : '#00f0ff';
  const engineGlow = isHostile ? '#ff7700' : UNSC_PALETTE.ionExhaustGlow;
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Heavy Asymmetrical Industrial Hull Chassis
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(1.0, 2.0 * s);

  ctx.beginPath();
  // Asymmetric Prow (Starboard bow corner)
  ctx.moveTo(42.0 * s, -10.0 * s);
  ctx.lineTo(44.0 * s, -6.0 * s);
  ctx.lineTo(44.0 * s, 12.0 * s); // Port bow flare
  ctx.lineTo(38.0 * s, 18.0 * s); // Port forward angled deck overhang
  ctx.lineTo(12.0 * s, 18.0 * s); // Port forward deck
  // Port waist elevator sponsor
  ctx.lineTo(8.0 * s, 20.0 * s);  // Step out
  ctx.lineTo(-14.0 * s, 20.0 * s); // Sponson flank
  ctx.lineTo(-18.0 * s, 18.0 * s); // Step in
  ctx.lineTo(-38.0 * s, 18.0 * s); // Port aft angled recovery deck overhang
  ctx.lineTo(-44.0 * s, 12.0 * s); // Port stern corner
  // Flat Engine Stern
  ctx.lineTo(-44.0 * s, -14.0 * s);
  // Starboard flank
  ctx.lineTo(-38.0 * s, -18.0 * s);
  ctx.lineTo(-12.0 * s, -18.0 * s); // Starboard aft
  ctx.lineTo(-8.0 * s, -20.0 * s);  // Starboard island sponson
  ctx.lineTo(16.0 * s, -20.0 * s);  // Island base flank
  ctx.lineTo(20.0 * s, -18.0 * s);  // Step in
  ctx.lineTo(34.0 * s, -18.0 * s);  // Starboard forward sponson
  ctx.lineTo(38.0 * s, -14.0 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Rugged Flat-Top Flight Deck Surface
  ctx.fillStyle = deckSurface;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.2 * s);
  ctx.beginPath();
  ctx.moveTo(41.0 * s, -8.0 * s);
  ctx.lineTo(41.0 * s, 10.0 * s);
  ctx.lineTo(36.0 * s, 16.0 * s);
  ctx.lineTo(-16.0 * s, 16.0 * s);
  ctx.lineTo(-36.0 * s, 16.0 * s);
  ctx.lineTo(-41.0 * s, 10.0 * s);
  ctx.lineTo(-41.0 * s, -10.0 * s);
  ctx.lineTo(-20.0 * s, -10.0 * s);
  ctx.lineTo(-8.0 * s, -8.0 * s);
  ctx.lineTo(22.0 * s, -8.0 * s);
  ctx.lineTo(34.0 * s, -8.0 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Launch Catapult Troughs (Starboard & Port Axial Tracks)
  ctx.fillStyle = trenchColor;
  ctx.fillRect(8.0 * s, -4.0 * s, 31.0 * s, 2.2 * s);
  ctx.fillRect(8.0 * s, 3.0 * s, 31.0 * s, 2.2 * s);
  // Catapult Shuttle Guide Tracks
  ctx.fillStyle = engineGlow;
  ctx.fillRect(10.0 * s, -3.2 * s, 28.0 * s, 0.6 * s);
  ctx.fillRect(10.0 * s, 3.8 * s, 28.0 * s, 0.6 * s);

  // 4. Flight Deck Markings: Runway Guidance Stripes & Hazard Chevrons
  // Centerline Dashed Runway Guidance
  ctx.strokeStyle = UNSC_PALETTE.deckGuidanceLines;
  ctx.lineWidth = Math.max(0.8, 1.4 * s);
  ctx.setLineDash([4.0 * s, 3.0 * s]);
  ctx.beginPath();
  ctx.moveTo(-38.0 * s, 7.0 * s);
  ctx.lineTo(36.0 * s, 7.0 * s);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Angled Recovery Deck Boundary Stripe
  ctx.strokeStyle = UNSC_PALETTE.deckGuidanceLines;
  ctx.lineWidth = Math.max(0.8, 1.2 * s);
  ctx.beginPath();
  ctx.moveTo(-38.0 * s, -6.0 * s);
  ctx.lineTo(4.0 * s, 15.0 * s);
  ctx.stroke();

  // Amber Hazard Chevrons at Stern Recovery Threshold & Catapult Blast Doors
  ctx.fillStyle = UNSC_PALETTE.deckHazardChevrons;
  for (let c = 0; c < 3; c++) {
    const cx = (-39.0 + c * 3.0) * s;
    ctx.beginPath();
    ctx.moveTo(cx, 1.0 * s);
    ctx.lineTo((cx + 1.8) * s, 6.0 * s);
    ctx.lineTo(cx, 11.0 * s);
    ctx.lineTo((cx - 1.2) * s, 11.0 * s);
    ctx.lineTo((cx + 0.6) * s, 6.0 * s);
    ctx.lineTo((cx - 1.2) * s, 1.0 * s);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Aircraft Elevator Pits (Recessed Mechanical Platforms)
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.0 * s);
  // Starboard Aft Elevator
  ctx.fillRect(-26.0 * s, -14.0 * s, 10.0 * s, 5.0 * s);
  ctx.strokeRect(-26.0 * s, -14.0 * s, 10.0 * s, 5.0 * s);
  // Port Forward Elevator
  ctx.fillRect(10.0 * s, 14.5 * s, 10.0 * s, 5.0 * s);
  ctx.strokeRect(10.0 * s, 14.5 * s, 10.0 * s, 5.0 * s);

  // 6. Starboard Offset Island Superstructure (Command Citadel & Sensor Spire)
  ctx.fillStyle = plateHighlight;
  ctx.strokeStyle = chamferColor;
  ctx.lineWidth = Math.max(0.8, 1.4 * s);
  ctx.beginPath();
  ctx.moveTo(14.0 * s, -17.5 * s);
  ctx.lineTo(14.0 * s, -10.5 * s);
  ctx.lineTo(-4.0 * s, -10.5 * s);
  ctx.lineTo(-8.0 * s, -13.0 * s);
  ctx.lineTo(-8.0 * s, -17.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Island Flight Operations Bridge Visor
  ctx.fillStyle = factionColor;
  ctx.fillRect(8.0 * s, -12.5 * s, 4.5 * s, 1.8 * s);

  // Phased Array Radar Panels & Comms Mast on Island
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.fillRect(1.0 * s, -16.5 * s, 5.0 * s, 4.5 * s);
  ctx.fillStyle = isHostile ? '#7f1d1d' : '#0284c7';
  ctx.fillRect(2.0 * s, -15.5 * s, 3.0 * s, 2.5 * s);

  // 7. Flank Sponsons with Point-Defense Turrets
  const pdSponsons = [
    { x: 30.0, y: -16.0 },
    { x: -30.0, y: -16.0 },
    { x: 26.0, y: 16.0 },
    { x: -26.0, y: 16.0 },
  ];
  pdSponsons.forEach((pos) => {
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    ctx.strokeStyle = chamferColor;
    ctx.beginPath();
    ctx.arc(pos.x * s, pos.y * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Dual PD Barrels
    ctx.fillStyle = factionColor;
    ctx.fillRect((pos.x + 1.5) * s, (pos.y - 0.6) * s, 3.0 * s, 1.2 * s);
  });

  // 8. Massive Quad-Thruster Engine Housing with Armored Radiator Cowlings
  ctx.fillStyle = UNSC_PALETTE.engineCowling;
  ctx.strokeStyle = chamferColor;
  const carrierEnginesY = [-9.5, -4.0, 4.0, 9.5];
  carrierEnginesY.forEach((ey) => {
    ctx.fillRect(-44.5 * s, (ey - 2.0) * s, 4.5 * s, 4.0 * s);
    ctx.strokeRect(-44.5 * s, (ey - 2.0) * s, 4.5 * s, 4.0 * s);
    ctx.fillStyle = engineGlow;
    ctx.fillRect(-44.8 * s, (ey - 1.2) * s, 0.9 * s, 2.4 * s);
    ctx.fillStyle = UNSC_PALETTE.engineCowling;
    renderThrusterPlume(ctx, -44.8 * s, ey * s, 3.8 * s, 18.0 * s, isBurn, engineGlow, timeMs);
  });

  ctx.restore();
}

export const renderCarrier = drawCarrier;

/**
 * The Collier:
 * - Flat, elongated rectangular gray hull
 * - Grid of 6 colorful cargo boxes on top deck (red, blue, yellow, green) with dark borders
 * - Aft bridge superstructure & engine nozzles
 */
function renderCollier(ctx: CanvasRenderingContext2D, r: number) {
  // 1. Flat elongated rectangular gray hull with subtle chamfered bow
  ctx.save();

  // Outer Hull Shadow/Bevel
  ctx.fillStyle = '#334155'; // Dark slate gray base
  ctx.strokeStyle = '#94a3b8'; // Light gray armor trim
  ctx.lineWidth = 1.8;

  ctx.beginPath();
  // Flat stern
  ctx.moveTo(-1.35 * r, -0.6 * r);
  // Port side to bow
  ctx.lineTo(1.15 * r, -0.6 * r);
  // Chamfered bow
  ctx.lineTo(1.35 * r, -0.38 * r);
  ctx.lineTo(1.35 * r, 0.38 * r);
  ctx.lineTo(1.15 * r, 0.6 * r);
  // Starboard side to stern
  ctx.lineTo(-1.35 * r, 0.6 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Recessed Cargo Deck (Dark inner well)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(-0.95 * r, -0.48 * r, 1.85 * r, 0.96 * r);
  ctx.fill();
  ctx.stroke();

  // 3. Grid of 6 Colorful Cargo Boxes (2 rows x 3 columns)
  // Colors: bright red, blue, yellow, and green container squares with dark borders
  const boxW = 0.48 * r;
  const boxH = 0.38 * r;
  const gapX = 0.1 * r;
  const gapY = 0.08 * r;
  const startX = -0.88 * r;
  const startY = -0.42 * r;

  const containerColors = [
    ['#ef4444', '#3b82f6', '#eab308'], // Row 0: Red, Blue, Yellow
    ['#22c55e', '#ef4444', '#3b82f6'], // Row 1: Green, Red, Blue
  ];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const bx = startX + col * (boxW + gapX);
      const by = startY + row * (boxH + gapY);
      const color = containerColors[row][col];

      // Cargo container body
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, boxW, boxH);

      // Dark border
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(bx, by, boxW, boxH);

      // Corrugated container seam ribs
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + boxW * 0.33, by + 1);
      ctx.lineTo(bx + boxW * 0.33, by + boxH - 1);
      ctx.moveTo(bx + boxW * 0.66, by + 1);
      ctx.lineTo(bx + boxW * 0.66, by + boxH - 1);
      ctx.stroke();

      // Top edge highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(bx + 1, by + 1);
      ctx.lineTo(bx + boxW - 1, by + 1);
      ctx.stroke();
    }
  }

  // 4. Aft Bridge & Engineering Superstructure
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-1.32 * r, -0.38 * r, 0.34 * r, 0.76 * r);
  ctx.fill();
  ctx.stroke();

  // Bridge Command Viewport
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-1.18 * r, -0.22 * r, 0.08 * r, 0.44 * r);

  // Aft Sublight Thruster Nozzles with Cyan glow
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-1.42 * r, -0.45 * r, 0.09 * r, 0.28 * r);
  ctx.fillRect(-1.42 * r, 0.17 * r, 0.09 * r, 0.28 * r);

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(-1.42 * r, -0.31 * r, 0.08 * r, 0, Math.PI * 2);
  ctx.arc(-1.42 * r, 0.31 * r, 0.08 * r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * The Vanguard (Light Patrol Corvette / Fast Scout):
 * - Angular chisel-nosed UNSC industrial patrol hull
 * - Sharp faceted armor glacis with stepped flank sponsons
 * - Flat stern with recessed dual ion drives
 */
function renderVanguard(ctx: CanvasRenderingContext2D, ship: ShipEntity, r: number) {
  ctx.save();

  const isCrippled = ship.hullState === 'CRIPPLED';
  const trimColor = isCrippled ? '#f43f5e' : '#38bdf8';

  // 1. Angular Chisel Hull Silhouette (Polygonal lineTo)
  ctx.beginPath();
  // Chisel Nose
  ctx.moveTo(1.65 * r, -0.15 * r);
  ctx.lineTo(1.65 * r, 0.15 * r);
  ctx.lineTo(1.0 * r, 0.45 * r);
  ctx.lineTo(0.2 * r, 0.55 * r);
  ctx.lineTo(-0.8 * r, 0.55 * r);
  ctx.lineTo(-1.35 * r, 0.42 * r);
  // Flat Stern
  ctx.lineTo(-1.35 * r, -0.42 * r);
  ctx.lineTo(-0.8 * r, -0.55 * r);
  ctx.lineTo(0.2 * r, -0.55 * r);
  ctx.lineTo(1.0 * r, -0.45 * r);
  ctx.closePath();

  // Dark metallic blue-gray fill
  ctx.fillStyle = '#1e242c';
  ctx.fill();

  // Crisp sleek outer contour
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 2. Interior Armor Plates & Panel Facets
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Upper facet
  ctx.moveTo(-0.8 * r, -0.32 * r);
  ctx.lineTo(0.5 * r, -0.28 * r);
  ctx.lineTo(1.1 * r, 0);
  // Lower facet
  ctx.lineTo(0.5 * r, 0.28 * r);
  ctx.lineTo(-0.8 * r, 0.32 * r);
  ctx.stroke();

  // 3. Angular Centerline Dorsal Spine & Bridge
  ctx.fillStyle = '#2a323d';
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0.8 * r, -0.12 * r);
  ctx.lineTo(0.8 * r, 0.12 * r);
  ctx.lineTo(-0.85 * r, 0.14 * r);
  ctx.lineTo(-0.85 * r, -0.14 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing bridge visor slit
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(0.25 * r, -0.06 * r, 0.3 * r, 0.12 * r);

  // 4. Flat Stern Recessed Drive Nozzles
  ctx.fillStyle = '#07121e';
  ctx.fillRect(-1.42 * r, -0.32 * r, 0.09 * r, 0.18 * r);
  ctx.fillRect(-1.42 * r, 0.14 * r, 0.09 * r, 0.18 * r);

  // Glowing Ion Exhaust
  ctx.fillStyle = trimColor;
  ctx.fillRect(-1.44 * r, -0.28 * r, 0.05 * r, 0.1 * r);
  ctx.fillRect(-1.44 * r, 0.18 * r, 0.05 * r, 0.1 * r);

  ctx.restore();
}

/**
 * Enemy Ships:
 * - Asymmetric, angular, blocky silhouettes
 * - Jagged armor plates
 * - Antenna greebles to look industrial and weathered
 * - Weathered rust / charcoal palette with crimson warning accents
 */
function renderEnemyShip(ctx: CanvasRenderingContext2D, ship: ShipEntity, r: number, timeMs: number) {
  ctx.save();

  const isCrippled = ship.hullState === 'CRIPPLED';
  const strokeColor = isCrippled ? '#ff2222' : '#f43f5e';
  const role = ship.role;

  // 1. Tailored Asymmetric Blocky Silhouettes
  if (role === 'BATTLECRUISER' || role === 'HEAVY_CRUISER') {
    // Heavy Asymmetric Dreadnought: Massive blocky hull, jagged armor prow, offset bridge, antenna greebles
    ctx.fillStyle = '#261717'; // Weathered charcoal-rust
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    // Asymmetric jagged prow: port side protrudes forward aggressively
    ctx.moveTo(1.75 * r, -0.35 * r);
    ctx.lineTo(1.45 * r, -0.65 * r);
    ctx.lineTo(0.7 * r, -0.85 * r);
    ctx.lineTo(0.4 * r, -1.05 * r); // Asymmetric sensor shoulder
    ctx.lineTo(-0.2 * r, -0.9 * r);
    ctx.lineTo(-0.6 * r, -0.75 * r);
    ctx.lineTo(-1.35 * r, -0.75 * r); // Flat blocky stern port
    // Jagged notched stern
    ctx.lineTo(-1.15 * r, 0);
    ctx.lineTo(-1.35 * r, 0.65 * r); // Flat blocky stern starboard
    // Starboard side: recessed weapons battery trench
    ctx.lineTo(-0.5 * r, 0.65 * r);
    ctx.lineTo(-0.1 * r, 0.85 * r);
    ctx.lineTo(0.5 * r, 0.75 * r);
    ctx.lineTo(0.9 * r, 0.55 * r);
    ctx.lineTo(1.3 * r, 0.25 * r);
    ctx.lineTo(1.75 * r, -0.35 * r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Jagged Overlapping Armor Slabs (stepped plates)
    ctx.fillStyle = '#382020';
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(1.1 * r, -0.2 * r);
    ctx.lineTo(0.3 * r, -0.5 * r);
    ctx.lineTo(-0.4 * r, -0.45 * r);
    ctx.lineTo(-0.4 * r, 0.35 * r);
    ctx.lineTo(0.4 * r, 0.35 * r);
    ctx.lineTo(0.9 * r, 0.1 * r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Offset Conning Citadel (Bridge tower positioned on port side)
    ctx.fillStyle = '#170e0e';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(-0.25 * r, -0.65 * r, 0.45 * r, 0.3 * r);
    ctx.fillRect(-0.25 * r, -0.65 * r, 0.45 * r, 0.3 * r);

    // Weathered Red Sensor Slit
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0.05 * r, -0.58 * r, 0.12 * r, 0.16 * r);

    // Antenna Greebles: Outrigger sensor spikes & needle antennas
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0.8 * r, 0.55 * r);
    ctx.lineTo(1.6 * r, 0.85 * r);
    ctx.moveTo(1.3 * r, 0.65 * r);
    ctx.lineTo(1.2 * r, 0.85 * r);
    ctx.moveTo(1.55 * r, 0.75 * r);
    ctx.lineTo(1.45 * r, 0.95 * r);
    ctx.moveTo(-1.1 * r, -0.7 * r);
    ctx.lineTo(-1.5 * r, -0.95 * r);
    ctx.stroke();

    // Blinking Sensor Greeble Beacon
    const blink = Math.sin(timeMs * 0.005) > 0.2;
    if (blink) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(1.6 * r, 0.85 * r, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (role === 'DESTROYER') {
    // Agile Jagged Raider Dart: Angular asymmetric knife with serrated armor edges
    ctx.fillStyle = '#221515';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.moveTo(1.85 * r, -0.1 * r);
    ctx.lineTo(0.8 * r, -0.45 * r);
    ctx.lineTo(0.2 * r, -0.7 * r);
    ctx.lineTo(0.1 * r, -0.35 * r);
    ctx.lineTo(-0.8 * r, -0.55 * r);
    ctx.lineTo(-1.3 * r, -0.35 * r);
    ctx.lineTo(-1.05 * r, 0);
    ctx.lineTo(-1.25 * r, 0.45 * r);
    ctx.lineTo(-0.6 * r, 0.35 * r);
    ctx.lineTo(0.2 * r, 0.55 * r);
    ctx.lineTo(1.2 * r, 0.2 * r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Jagged Armor Plate Ribbing
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0.9 * r, 0);
    ctx.lineTo(-0.2 * r, -0.3 * r);
    ctx.moveTo(0.5 * r, 0.15 * r);
    ctx.lineTo(-0.5 * r, 0.25 * r);
    ctx.stroke();

    // Forward Needle Antenna Greebles
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0.6 * r, -0.4 * r);
    ctx.lineTo(1.6 * r, -0.6 * r);
    ctx.stroke();

  } else if (role === 'FRIGATE') {
    // Fast Raider Picket / Skiff: Compact swept dagger with dual engine pods and forward prow spike
    ctx.fillStyle = '#241414';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(1.9 * r, 0); // Needle prow spike
    ctx.lineTo(0.9 * r, -0.4 * r);
    ctx.lineTo(0.2 * r, -0.55 * r);
    ctx.lineTo(-0.7 * r, -0.65 * r); // Port engine pod shoulder
    ctx.lineTo(-1.2 * r, -0.45 * r);
    ctx.lineTo(-0.95 * r, 0); // Stern recess
    ctx.lineTo(-1.2 * r, 0.45 * r); // Starboard engine pod shoulder
    ctx.lineTo(-0.7 * r, 0.65 * r);
    ctx.lineTo(0.2 * r, 0.45 * r);
    ctx.lineTo(0.9 * r, 0.35 * r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red Cockpit / Sensor Eye
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0.4 * r, -0.05 * r, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Dual Outrigger Antenna spikes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0.2 * r, -0.55 * r);
    ctx.lineTo(0.9 * r, -0.85 * r);
    ctx.moveTo(0.2 * r, 0.45 * r);
    ctx.lineTo(0.9 * r, 0.75 * r);
    ctx.stroke();

  } else {
    // Cruiser (e.g. Scythe): Asymmetric blocky knife with serrated armor flanks
    ctx.fillStyle = '#281717';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.moveTo(1.7 * r, 0.15 * r); // Offset sharp prow
    ctx.lineTo(1.1 * r, -0.55 * r);
    ctx.lineTo(0.3 * r, -0.4 * r);
    ctx.lineTo(-0.2 * r, -0.85 * r); // Asymmetric armor shoulder
    ctx.lineTo(-0.7 * r, -0.5 * r);
    ctx.lineTo(-1.3 * r, -0.55 * r);
    ctx.lineTo(-1.0 * r, 0);
    ctx.lineTo(-1.3 * r, 0.65 * r);
    ctx.lineTo(-0.4 * r, 0.55 * r);
    ctx.lineTo(0.4 * r, 0.75 * r);
    ctx.lineTo(1.2 * r, 0.45 * r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Weathered Plate Facets
    ctx.fillStyle = '#3a2020';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0.8 * r, 0.05 * r);
    ctx.lineTo(0.1 * r, -0.3 * r);
    ctx.lineTo(-0.5 * r, -0.2 * r);
    ctx.lineTo(-0.5 * r, 0.3 * r);
    ctx.lineTo(0.2 * r, 0.4 * r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Greeble Antenna Spike
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-0.2 * r, -0.85 * r);
    ctx.lineTo(0.3 * r, -1.25 * r);
    ctx.lineTo(0.45 * r, -1.2 * r);
    ctx.stroke();
  }

  // Industrial Warning Chevron / Hazard Seam
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-0.8 * r, -0.15 * r);
  ctx.lineTo(-0.65 * r, 0);
  ctx.lineTo(-0.8 * r, 0.15 * r);
  ctx.stroke();

  ctx.restore();
}

/**
 * Fleet Tanker:
 * - Dual elongated cylindrical fuel pods strapped to a central spine
 * - Forward command pod and aft heavy engine manifold
 * - Structural strapping brackets & propellant sight gauges
 */
function renderFleetTanker(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();

  // 1. Central Structural Spine / Keel
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.6;

  // Spine beam
  ctx.beginPath();
  ctx.rect(-1.35 * r, -0.16 * r, 2.7 * r, 0.32 * r);
  ctx.fill();
  ctx.stroke();

  // Forward Command Module
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(1.05 * r, -0.25 * r);
  ctx.lineTo(1.45 * r, -0.12 * r);
  ctx.lineTo(1.5 * r, 0);
  ctx.lineTo(1.45 * r, 0.12 * r);
  ctx.lineTo(1.05 * r, 0.25 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Aft Main Propulsion Manifold
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#64748b';
  ctx.fillRect(-1.42 * r, -0.28 * r, 0.2 * r, 0.56 * r);
  ctx.strokeRect(-1.42 * r, -0.28 * r, 0.2 * r, 0.56 * r);

  // 2. Dual Elongated Cylindrical Fuel Pods
  const podW = 1.7 * r;
  const podH = 0.52 * r;
  const podStartX = -0.85 * r;

  const podYs = [
    -0.78 * r, // Starboard Pod (Top)
    0.26 * r,  // Port Pod (Bottom)
  ];

  for (const py of podYs) {
    // Cylindrical capsule body
    ctx.fillStyle = '#1e3852'; // Cryogenic fuel pod metallic blue
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;

    // Draw Capsule (rounded end caps)
    const capR = podH / 2;
    ctx.beginPath();
    // Aft end cap (left)
    ctx.arc(podStartX + capR, py + capR, capR, Math.PI * 0.5, Math.PI * 1.5);
    // Top cylinder line
    ctx.lineTo(podStartX + podW - capR, py);
    // Forward end cap (right)
    ctx.arc(podStartX + podW - capR, py + capR, capR, Math.PI * 1.5, Math.PI * 0.5);
    // Bottom cylinder line
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Propellant Level Sight Glass (Glowing cyan/amber longitudinal gauge)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(podStartX + capR * 1.2, py + capR);
    ctx.lineTo(podStartX + podW - capR * 1.2, py + capR);
    ctx.stroke();

    // Pressure Bulkhead Rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(podStartX + podW * 0.35, py);
    ctx.lineTo(podStartX + podW * 0.35, py + podH);
    ctx.moveTo(podStartX + podW * 0.65, py);
    ctx.lineTo(podStartX + podW * 0.65, py + podH);
    ctx.stroke();
  }

  // 3. Structural Strapping Clamps / Reinforcement Brackets
  // Strapping both pods tightly across the central spine
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#f59e0b'; // Industrial amber warning trim
  ctx.lineWidth = 1.4;

  const strapXs = [-0.5 * r, 0, 0.5 * r];
  for (const sx of strapXs) {
    ctx.fillRect(sx - 0.08 * r, -0.84 * r, 0.16 * r, 1.68 * r);
    ctx.strokeRect(sx - 0.08 * r, -0.84 * r, 0.16 * r, 1.68 * r);
  }

  // Cyan Thruster Glow at stern
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(-1.42 * r, -0.15 * r, 0.08 * r, 0, Math.PI * 2);
  ctx.arc(-1.42 * r, 0.15 * r, 0.08 * r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Fleet Repair Ship:
 * - Hull with extended forward crane/gantry arms
 * - Faint pulsing green aura around the repair gantry
 * - Articulated manipulator claws and scaffolding
 */
function renderRepairShip(ctx: CanvasRenderingContext2D, r: number, timeMs: number) {
  ctx.save();

  // 1. Crisp Vector Engineering Gantry Ring around forward dock
  const pulseAlpha = 0.25 + 0.15 * Math.sin(timeMs * 0.004);
  ctx.strokeStyle = `rgba(34, 197, 94, ${pulseAlpha})`;
  ctx.lineWidth = 1.0;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(1.1 * r, 0, 0.9 * r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Main Workshop & Engineering Hull
  ctx.fillStyle = '#162e26'; // Deep industrial sea-green slate
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.8;

  ctx.beginPath();
  ctx.moveTo(-1.3 * r, -0.55 * r);
  ctx.lineTo(0.35 * r, -0.55 * r);
  ctx.lineTo(0.45 * r, -0.35 * r);
  ctx.lineTo(0.45 * r, 0.35 * r);
  ctx.lineTo(0.35 * r, 0.55 * r);
  ctx.lineTo(-1.3 * r, 0.55 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Engineering Workshop Deck Hatch / Grating
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(-0.85 * r, -0.35 * r, 1.05 * r, 0.7 * r);
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-0.85 * r, -0.35 * r, 1.05 * r, 0.7 * r);

  // 3. Extended Forward Crane / Gantry Arms
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.0;

  // Upper Crane Arm
  ctx.beginPath();
  ctx.moveTo(0.35 * r, -0.45 * r);
  ctx.lineTo(1.55 * r, -0.6 * r); // Extended forward arm
  ctx.lineTo(1.68 * r, -0.15 * r); // Articulated claw head pointing inward
  ctx.stroke();

  // Lower Crane Arm
  ctx.beginPath();
  ctx.moveTo(0.35 * r, 0.45 * r);
  ctx.lineTo(1.55 * r, 0.6 * r);  // Extended forward arm
  ctx.lineTo(1.68 * r, 0.15 * r);  // Articulated claw head pointing inward
  ctx.stroke();

  // Lattice Gantry Cross-Bracing
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  // Upper truss
  ctx.moveTo(0.7 * r, -0.49 * r);
  ctx.lineTo(0.9 * r, -0.52 * r);
  ctx.moveTo(1.15 * r, -0.55 * r);
  ctx.lineTo(1.35 * r, -0.58 * r);
  // Lower truss
  ctx.moveTo(0.7 * r, 0.49 * r);
  ctx.lineTo(0.9 * r, 0.52 * r);
  ctx.moveTo(1.15 * r, 0.55 * r);
  ctx.lineTo(1.35 * r, 0.58 * r);
  ctx.stroke();

  // Welder Arc Nodes at Claws
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.arc(1.68 * r, -0.15 * r, 2.5, 0, Math.PI * 2);
  ctx.arc(1.68 * r, 0.15 * r, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Active Nanite Spark Arc between tips
  const sparkAnim = Math.sin(timeMs * 0.01) > 0.3;
  if (sparkAnim) {
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(1.68 * r, -0.15 * r);
    ctx.lineTo(1.55 * r, 0);
    ctx.lineTo(1.68 * r, 0.15 * r);
    ctx.stroke();
  }

  // Aft Thruster
  ctx.fillStyle = '#065f46';
  ctx.fillRect(-1.38 * r, -0.3 * r, 0.09 * r, 0.6 * r);
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(-1.38 * r, 0, 0.12 * r, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Scrap Barge:
 * - Broad, hollow-centered catamaran hull
 * - Placeholder cargo bay markers in the hollow central bay
 * - Heavy aft recovery superstructure
 */
function renderScrapBarge(ctx: CanvasRenderingContext2D, r: number) {
  ctx.save();

  // 1. Broad Catamaran Twin Hulls (Port & Starboard Pontoons)
  ctx.fillStyle = '#334155'; // Industrial slate
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.8;

  // Starboard Pontoon (Top)
  ctx.beginPath();
  ctx.moveTo(-1.35 * r, -0.88 * r);
  ctx.lineTo(1.15 * r, -0.88 * r);
  ctx.lineTo(1.4 * r, -0.65 * r); // Wedge bow
  ctx.lineTo(1.15 * r, -0.42 * r);
  ctx.lineTo(-1.35 * r, -0.42 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Port Pontoon (Bottom)
  ctx.beginPath();
  ctx.moveTo(-1.35 * r, 0.42 * r);
  ctx.lineTo(1.15 * r, 0.42 * r);
  ctx.lineTo(1.4 * r, 0.65 * r);  // Wedge bow
  ctx.lineTo(1.15 * r, 0.88 * r);
  ctx.lineTo(-1.35 * r, 0.88 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Aft Bridge & Recovery Superstructure (Cross-Deck joining pontoons at stern)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(-1.35 * r, -0.75 * r, 0.5 * r, 1.5 * r);
  ctx.fill();
  ctx.stroke();

  // Crane Turret Base on aft deck
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(-1.05 * r, 0, 0.22 * r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Hollow-Centered Cargo Well & Placeholder Cargo Bay Markers
  // The hollow central salvage cradle
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.fillRect(-0.85 * r, -0.4 * r, 2.05 * r, 0.8 * r);

  // Dotted / Dashed Placeholder Cargo Bay Markers
  ctx.strokeStyle = '#fbbf24'; // Yellow cargo bay outline
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 3]);

  // BAY 01
  ctx.strokeRect(-0.75 * r, -0.32 * r, 0.58 * r, 0.64 * r);
  // BAY 02
  ctx.strokeRect(-0.08 * r, -0.32 * r, 0.58 * r, 0.64 * r);
  // BAY 03 (Front loading cradle)
  ctx.strokeRect(0.58 * r, -0.32 * r, 0.58 * r, 0.64 * r);

  ctx.setLineDash([]); // Reset line dash

  // Text labels inside placeholder bays
  ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
  ctx.font = `${Math.max(Math.round(6.5 * (r / 18)), 6)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BAY 1', -0.46 * r, 0);
  ctx.fillText('BAY 2', 0.21 * r, 0);
  ctx.fillText('BAY 3', 0.87 * r, 0);

  // Yellow & Black Hazard Stripes on Forward Pontoons
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0.85 * r, -0.85 * r);
  ctx.lineTo(0.98 * r, -0.45 * r);
  ctx.moveTo(1.02 * r, -0.85 * r);
  ctx.lineTo(1.15 * r, -0.45 * r);

  ctx.moveTo(0.85 * r, 0.45 * r);
  ctx.lineTo(0.98 * r, 0.85 * r);
  ctx.moveTo(1.02 * r, 0.45 * r);
  ctx.lineTo(1.15 * r, 0.85 * r);
  ctx.stroke();

  ctx.restore();
}

/**
 * The Builder Unit:
 * - Robust hexagonal industrial fabrication platform
 * - Port & Starboard material silos: Metallic storage (slate/cyan) and Organic storage (emerald)
 * - Central construction bay with pulsing fabrication arc
 * - Forward robotic fabrication gantries & amber hazard chevrons
 */
function renderBuilderUnit(ctx: CanvasRenderingContext2D, r: number, timeMs: number) {
  ctx.save();

  // 1. Heavy Industrial Hexagonal Base Hull
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.8;

  ctx.beginPath();
  ctx.moveTo(-1.2 * r, -0.6 * r);
  ctx.lineTo(-0.4 * r, -0.9 * r);
  ctx.lineTo(0.8 * r, -0.9 * r);
  ctx.lineTo(1.3 * r, -0.4 * r);
  ctx.lineTo(1.3 * r, 0.4 * r);
  ctx.lineTo(0.8 * r, 0.9 * r);
  ctx.lineTo(-0.4 * r, 0.9 * r);
  ctx.lineTo(-1.2 * r, 0.6 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Port Material Silo: Metallic Storage (5k Metallic) - Cyan / Steel
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-0.7 * r, -0.82 * r, 1.2 * r, 0.32 * r, 3);
  ctx.fill();
  ctx.stroke();

  // Silo level bars
  ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.fillRect(-0.65 * r, -0.78 * r, 1.1 * r, 0.24 * r);

  // Silo label
  ctx.font = `${Math.max(Math.round(5.5 * (r / 18)), 5)}px monospace`;
  ctx.fillStyle = '#e0f2fe';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('METALLIC 5K', -0.1 * r, -0.66 * r);

  // 3. Starboard Material Silo: Organic Storage (5k Organic) - Emerald / Green
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-0.7 * r, 0.5 * r, 1.2 * r, 0.32 * r, 3);
  ctx.fill();
  ctx.stroke();

  // Silo level bars
  ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
  ctx.fillRect(-0.65 * r, 0.54 * r, 1.1 * r, 0.24 * r);

  // Silo label
  ctx.fillStyle = '#d1fae5';
  ctx.fillText('ORGANIC 5K', -0.1 * r, 0.66 * r);

  // 4. Central Fabrication Chamber & Pulsing Core Arc
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(-0.5 * r, -0.32 * r, 1.1 * r, 0.64 * r);
  ctx.fill();
  ctx.stroke();

  const pulse = Math.sin(timeMs * 0.005) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(56, 189, 248, ${0.25 + pulse * 0.5})`;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 6 + pulse * 6;
  ctx.beginPath();
  ctx.arc(0.05 * r, 0, 0.22 * r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 5. Forward Robotic Fabrication Gantries / Extender Arms
  ctx.strokeStyle = '#f59e0b'; // Amber caution
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  // Upper manipulator
  ctx.moveTo(0.8 * r, -0.35 * r);
  ctx.lineTo(1.45 * r, -0.35 * r);
  ctx.lineTo(1.6 * r, -0.15 * r);
  // Lower manipulator
  ctx.moveTo(0.8 * r, 0.35 * r);
  ctx.lineTo(1.45 * r, 0.35 * r);
  ctx.lineTo(1.6 * r, 0.15 * r);
  ctx.stroke();

  // Aft Sublight Thrusters
  ctx.fillStyle = '#0284c7';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 5;
  ctx.fillRect(-1.3 * r, -0.35 * r, 0.15 * r, 0.22 * r);
  ctx.fillRect(-1.3 * r, 0.13 * r, 0.15 * r, 0.22 * r);
  ctx.shadowBlur = 0;

  ctx.restore();
}

/**
 * Headquarters (HQ) Station:
 * - Doubled visual radius: stationR = (r * 2.2) * 2.0 = r * 4.4
 * - 20 missile mounts arranged around outer perimeter ring
 * - Rotating structural spoke gantry & docking collar with 4 radial docking berths
 * - High-capacity refinery silos (metallic cyan & organic emerald) with catalytic cracking furnace
 * - Central command citadel with pulsing fusion core
 */
function renderHQStation(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  ctx.save();
  // Double the outer rendering radius of the central station ring, docking berths, and refinery silo graphics
  const stationR = r * 4.4; // Doubled baseline visual radius (was r * 2.2)
  const rotAngle = timeMs * 0.0002;

  // 1. Outer Heavy Armor Ring
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 4.0;
  ctx.beginPath();
  ctx.arc(0, 0, stationR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Outer Armor Segment Crenellations
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.8;
  const segments = 12;
  for (let s = 0; s < segments; s++) {
    const sAng = (s / segments) * Math.PI * 2 + rotAngle * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, stationR + 1.5, sAng, sAng + (Math.PI * 2) / segments * 0.65);
    ctx.stroke();
  }

  // Secondary Inner Trench
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 5.0;
  ctx.beginPath();
  ctx.arc(0, 0, stationR * 0.85, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Twenty (20) Perimeter Missile Mounts
  const tubeCount = 20;
  for (let i = 0; i < tubeCount; i++) {
    const angle = (i / tubeCount) * Math.PI * 2 + rotAngle;
    const px = Math.cos(angle) * stationR;
    const py = Math.sin(angle) * stationR;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.4;
    ctx.fillRect(-5, -6, 10, 12);
    ctx.strokeRect(-5, -6, 10, 12);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(2, -3, 4, 6);
    ctx.restore();
  }

  // 3. Rotating Structural Spokes & Solar/Radiator Trusses
  const spokeCount = 6;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.4;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2 + rotAngle;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (stationR * 0.35), Math.sin(angle) * (stationR * 0.35));
    ctx.lineTo(Math.cos(angle) * (stationR * 0.85), Math.sin(angle) * (stationR * 0.85));
    ctx.stroke();

    const midR = stationR * 0.68;
    const midX = Math.cos(angle) * midR;
    const midY = Math.sin(angle) * midR;
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(midX - 3, midY - 3, 6, 6);
  }

  // 4. Middle Transit & Docking Collar Ring
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, stationR * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4B. Four (4) Heavy Radial Docking Berths / Gantry Slips
  const berthCount = 4;
  for (let b = 0; b < berthCount; b++) {
    const bAngle = (b / berthCount) * Math.PI * 2 + rotAngle + Math.PI / 4;
    const bStartR = stationR * 0.48;
    const bEndR = stationR * 0.76;
    const bMidR = (bStartR + bEndR) * 0.5;

    ctx.save();
    ctx.rotate(bAngle);

    // Gantry corridor body
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.fillRect(bStartR, -5, bEndR - bStartR, 10);
    ctx.strokeRect(bStartR, -5, bEndR - bStartR, 10);

    // Docking Berth Clamp Head & Guidance Lights
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.4;
    ctx.fillRect(bEndR - 4, -9, 8, 18);
    ctx.strokeRect(bEndR - 4, -9, 8, 18);

    // Mooring latch beacon
    const beaconOn = (timeMs + b * 250) % 600 < 300;
    ctx.fillStyle = beaconOn ? '#10b981' : '#047857';
    ctx.fillRect(bEndR + 2, -3, 3, 6);

    ctx.restore();
  }

  // 5. Refinery Silo Graphics (Metallic Silo, Organic Silo & Catalytic Ore Hopper)
  // Mounted orthogonally on the gantry spoke axis (scaled with doubled station radius)
  ctx.save();
  ctx.rotate(rotAngle);

  const siloDist = stationR * 0.65;
  const siloRadius = stationR * 0.12;

  // A. Metallic Refinery Silo (Cyan-accented pressurized sphere)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(-siloDist, 0, siloRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Metallic level ribbing
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-siloDist, 0, siloRadius * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-siloDist - 3, -2, 6, 4);

  // B. Organic Refinery Silo (Emerald-accented bio-dome)
  ctx.fillStyle = '#064e3b';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(siloDist, 0, siloRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Organic bio-ring
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(siloDist, 0, siloRadius * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#10b981';
  ctx.fillRect(siloDist - 3, -2, 6, 4);

  // C. Catalytic Furnace Chamber (Amber glowing catalytic cracker in vertical spoke slot)
  const furnaceFlare = Math.sin(timeMs * 0.008) * 0.35 + 0.65;
  ctx.fillStyle = `rgba(245, 158, 11, ${furnaceFlare})`;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.rect(-siloRadius * 0.8, -siloDist - siloRadius * 0.8, siloRadius * 1.6, siloRadius * 1.6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-siloRadius * 0.8, -siloDist - siloRadius * 0.8, siloRadius * 1.6, siloRadius * 1.6);

  ctx.restore();

  // 6. Central Command Citadel Hub
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(0, 0, stationR * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glowing Reactor Core
  const pulse = Math.sin(timeMs * 0.003) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(56, 189, 248, ${0.45 + pulse * 0.45})`;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 14 + pulse * 10;
  ctx.beginPath();
  ctx.arc(0, 0, stationR * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Cardinal Navigation Beacons
  const blink = Math.sin(timeMs * 0.008) > 0;
  if (blink) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-stationR - 4, -4, 8, 8);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(stationR - 4, -4, 8, 8);
  }

  ctx.restore();
}

/**
 * Pirate Bastion Deep-Space Stronghold:
 * - Exactly half the diameter of the player HQ station: bastionR = (r * 2.2) * 0.5 = r * 1.1
 * - Fortified octagonal/circular citadel with jagged corsair armor battlements
 * - 10 heavy missile mounts spaced around outer perimeter
 * - Tripled capacitor cooling vents & pulsing scarlet reactor core
 * - Faint crimson rotating shield harmonic ring
 */
export function renderPirateBastion(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  ctx.save();
  // Exactly half the diameter of the player HQ station
  const bastionR = (r * 2.2) * 0.5;
  const rotAngle = -timeMs * 0.00025;

  // 1. Heavy Weathered Charcoal & Crimson Armored Hull (Octagonal Fortress)
  ctx.fillStyle = '#1a0d0d'; // Deep black-red charcoal
  ctx.strokeStyle = '#dc2626'; // Vivid crimson perimeter armor trim
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  const octCount = 8;
  for (let i = 0; i < octCount; i++) {
    const ang = (i / octCount) * Math.PI * 2 + rotAngle;
    const px = Math.cos(ang) * bastionR;
    const py = Math.sin(ang) * bastionR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Secondary Inner Trench with Dark Inset
  ctx.strokeStyle = '#450a0a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, bastionR * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Ten (10) Heavy Perimeter Missile Mounts
  const tubeCount = 10;
  for (let i = 0; i < tubeCount; i++) {
    const angle = (i / tubeCount) * Math.PI * 2 + rotAngle;
    const px = Math.cos(angle) * bastionR;
    const py = Math.sin(angle) * bastionR;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    // Armor pod
    ctx.fillStyle = '#2d1212';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
    ctx.fillRect(-2.5, -3.5, 5, 7);
    ctx.strokeRect(-2.5, -3.5, 5, 7);

    // Heavy missile tube aperture
    ctx.fillStyle = '#0a0505';
    ctx.fillRect(0.5, -1.8, 2.5, 3.6);
    ctx.restore();
  }

  // 3. Spoke Struts & Overload Radiator Trusses (Tripled capacitor heat management)
  const spokeCount = 6;
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2 + rotAngle;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (bastionR * 0.38), Math.sin(angle) * (bastionR * 0.38));
    ctx.lineTo(Math.cos(angle) * (bastionR * 0.82), Math.sin(angle) * (bastionR * 0.82));
    ctx.stroke();

    const midR = bastionR * 0.6;
    const midX = Math.cos(angle) * midR;
    const midY = Math.sin(angle) * midR;
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(midX - 2, midY - 2, 4, 4);
  }

  // 4. Middle Armored Citadel Collar
  ctx.fillStyle = '#261111';
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, bastionR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5. Central Reactor Core & Thermal Overload Capacitor Hub
  ctx.fillStyle = '#3b1212';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, bastionR * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glowing Crimson Thermal Core
  const pulse = Math.sin(timeMs * 0.004) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(239, 68, 68, ${0.45 + pulse * 0.45})`;
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 8 + pulse * 8;
  ctx.beginPath();
  ctx.arc(0, 0, bastionR * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Outer Crimson Warning Beacons
  const blink = Math.sin(timeMs * 0.007) > 0;
  if (blink) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-bastionR - 2, -2, 4, 4);
    ctx.fillRect(bastionR - 2, -2, 4, 4);
  }

  ctx.restore();
}

/**
 * Dedicated Orbital Shipyard Structure:
 * - Stationary twin-gantry drydock framework
 * - Yellow caution hazard stripes
 * - Active automated fabrication welding sparks
 */
function renderOrbitalShipyard(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  ctx.save();
  const yardR = r * 1.8;

  // 1. Central Backbone Spine
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.rect(-yardR * 0.9, -yardR * 0.35, yardR * 0.7, yardR * 0.7);
  ctx.fill();
  ctx.stroke();

  // 2. Twin Forward Fabrication Arms / Drydock Gantry Slips
  // Top Arm
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-yardR * 0.3, -yardR * 0.75);
  ctx.lineTo(yardR * 1.0, -yardR * 0.75);
  ctx.lineTo(yardR * 1.1, -yardR * 0.5);
  ctx.lineTo(yardR * 0.8, -yardR * 0.35);
  ctx.lineTo(-yardR * 0.3, -yardR * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bottom Arm
  ctx.beginPath();
  ctx.moveTo(-yardR * 0.3, yardR * 0.75);
  ctx.lineTo(yardR * 1.0, yardR * 0.75);
  ctx.lineTo(yardR * 1.1, yardR * 0.5);
  ctx.lineTo(yardR * 0.8, yardR * 0.35);
  ctx.lineTo(-yardR * 0.3, yardR * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Hazard Chevrons
  ctx.fillStyle = '#f59e0b';
  for (let x = -yardR * 0.1; x < yardR * 0.8; x += 14) {
    ctx.fillRect(x, -yardR * 0.70, 6, 6);
    ctx.fillRect(x, yardR * 0.64, 6, 6);
  }

  // 3. Central Slipway Void & Active Fabrication Welding Sparks
  const sparkPhase = Math.sin(timeMs * 0.015);
  if (sparkPhase > 0.2) {
    const sparkX = yardR * 0.3 + Math.sin(timeMs * 0.03) * 15;
    const sparkY = Math.cos(timeMs * 0.04) * 8;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#67e8f9';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(sparkX, -yardR * 0.35);
    ctx.lineTo(sparkX, sparkY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 4. Habitat Pylon & Antenna Greeble
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-yardR * 0.6, -yardR * 0.35);
  ctx.lineTo(-yardR * 0.6, -yardR * 0.95);
  ctx.lineTo(-yardR * 0.5, -yardR * 0.95);
  ctx.stroke();

  ctx.restore();
}

/**
 * Autonomous Miner (MINER):
 * - Asymmetric industrial catamaran frame
 * - Forward-facing cutting/harvester gantry
 * - Exposed rectangular ore hopper with dynamic fill level
 */
function renderAutonomousMiner(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number
): void {
  ctx.save();

  const baseArmor = '#22272e';
  const plateColor = '#2d333b';
  const trenchColor = '#14171b';
  const highlightColor = '#768390';
  const thrusterColor = '#ff9900'; // Industrial amber
  const isBurn = ship.fmsActive || ship.splineActive || Math.hypot(ship.velocity?.x || 0, ship.velocity?.y || 0) > 0.05;

  // 1. Asymmetric Industrial Catamaran Frame
  // Port hull sponson is elongated (reaches 1.35*r), starboard is shorter (reaches 0.95*r)
  ctx.fillStyle = baseArmor;
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = 1.6;

  // Port Hull Sponson (Long)
  ctx.beginPath();
  ctx.moveTo(1.35 * r, -0.65 * r);
  ctx.lineTo(1.15 * r, -0.35 * r);
  ctx.lineTo(-1.25 * r, -0.35 * r);
  ctx.lineTo(-1.25 * r, -0.75 * r);
  ctx.lineTo(0.9 * r, -0.75 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Starboard Hull Sponson (Short)
  ctx.beginPath();
  ctx.moveTo(0.95 * r, 0.35 * r);
  ctx.lineTo(0.75 * r, 0.65 * r);
  ctx.lineTo(-1.25 * r, 0.65 * r);
  ctx.lineTo(-1.25 * r, 0.28 * r);
  ctx.lineTo(0.75 * r, 0.28 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Structural Cross-Gantries connecting Catamaran Hulls
  ctx.fillStyle = plateColor;
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = 1.2;
  // Forward structural beam
  ctx.fillRect(0.15 * r, -0.45 * r, 0.35 * r, 0.9 * r);
  ctx.strokeRect(0.15 * r, -0.45 * r, 0.35 * r, 0.9 * r);
  // Aft structural beam
  ctx.fillRect(-1.15 * r, -0.45 * r, 0.3 * r, 0.9 * r);
  ctx.strokeRect(-1.15 * r, -0.45 * r, 0.3 * r, 0.9 * r);

  // 2. Forward-Facing Cutting / Harvester Gantry
  ctx.fillStyle = trenchColor;
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.4;
  // Robotic boom projecting from port sponson toward centerline
  ctx.beginPath();
  ctx.moveTo(1.15 * r, -0.45 * r);
  ctx.lineTo(1.55 * r, -0.1 * r);
  ctx.lineTo(1.4 * r, 0.08 * r);
  ctx.lineTo(0.9 * r, -0.35 * r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rotary cutting / drill head
  const isMining = ship.miningLaserActive || false;
  ctx.fillStyle = isMining ? '#38bdf8' : '#334155';
  ctx.strokeStyle = isMining ? '#00f0ff' : '#64748b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(1.58 * r, -0.05 * r, 0.22 * r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cutting head spinning cutter teeth
  const rotTeeth = timeMs * (isMining ? 0.015 : 0.003);
  ctx.strokeStyle = isMining ? '#ffffff' : '#94a3b8';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const a = rotTeeth + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(1.58 * r, -0.05 * r);
    ctx.lineTo(1.58 * r + Math.cos(a) * 0.24 * r, -0.05 * r + Math.sin(a) * 0.24 * r);
    ctx.stroke();
  }

  // Laser emitter core
  if (isMining) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(1.58 * r, -0.05 * r, 0.08 * r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Exposed Rectangular Ore Hopper
  const fillPct = Math.min(1.0, (ship.cargoOre || 0) / Math.max(1, ship.cargoOreMax || 1000));
  // Hopper well
  ctx.fillStyle = trenchColor;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.fillRect(-0.75 * r, -0.32 * r, 0.85 * r, 0.64 * r);
  ctx.strokeRect(-0.75 * r, -0.32 * r, 0.85 * r, 0.64 * r);

  // Hazard warning striping along hopper rim
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.0;
  for (let hx = -0.7 * r; hx <= 0.05 * r; hx += 0.15 * r) {
    ctx.beginPath();
    ctx.moveTo(hx, -0.32 * r);
    ctx.lineTo(hx + 0.06 * r, -0.25 * r);
    ctx.moveTo(hx, 0.25 * r);
    ctx.lineTo(hx + 0.06 * r, 0.32 * r);
    ctx.stroke();
  }

  // Live Ore Fill Indicator
  if (fillPct > 0) {
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-0.72 * r, -0.28 * r, 0.79 * r * fillPct, 0.56 * r);
    // Raw sparkling ore texture
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-0.72 * r, -0.2 * r, 0.75 * r * fillPct, 0.15 * r);
  }

  // 4. Cockpit Visor on Port Sponson
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0.4 * r, -0.68 * r, 0.25 * r, 0.15 * r);

  // 5. Aft Heavy Propulsor Thrusters on Catamaran Sterns
  ctx.fillStyle = '#0a0d12';
  ctx.strokeRect(-1.32 * r, -0.68 * r, 0.15 * r, 0.25 * r);
  ctx.fillRect(-1.32 * r, -0.68 * r, 0.15 * r, 0.25 * r);
  ctx.strokeRect(-1.32 * r, 0.35 * r, 0.15 * r, 0.25 * r);
  ctx.fillRect(-1.32 * r, 0.35 * r, 0.15 * r, 0.25 * r);

  renderThrusterPlume(ctx, -1.32 * r, -0.55 * r, 0.2 * r, 1.0 * r, isBurn, thrusterColor, timeMs);
  renderThrusterPlume(ctx, -1.32 * r, 0.48 * r, 0.2 * r, 1.0 * r, isBurn, thrusterColor, timeMs);

  ctx.restore();
}

// Re-export modern procedural shipyard slipways & lab geometries from structureRenderer
export {
  renderLightShipyard,
  renderMediumShipyard,
  renderHeavyShipyard,
  renderMilitaryResearchStation,
  renderCivicResearchOutpost,
  renderExpansionCitadel,
  renderStructureByRoleOrType,
};

export function renderCapitalShipyard(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  renderHeavyShipyard(ctx, r, timeMs);
}

/**
 * 4. MISSILE BATTERY (MSB):
 * Hexagonal armored citadel mounting 10 automated VLS missile tubes with +15% range.
 */
export function renderMissileBattery(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  ctx.save();
  const battR = r * 1.4;

  // Hexagonal Armored Fortress
  ctx.fillStyle = '#1e1e24';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const hx = Math.cos(angle) * battR;
    const hy = Math.sin(angle) * battR;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 10 VLS Silo Hatches (arranged in dual rows)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 1.2;
  const rows = [-battR * 0.35, battR * 0.35];
  for (let rowIdx = 0; rowIdx < 2; rowIdx++) {
    const y = rows[rowIdx];
    for (let col = 0; col < 5; col++) {
      const x = -battR * 0.6 + col * (battR * 0.3);
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.strokeRect(x - 3, y - 3, 6, 6);
    }
  }

  // Central Radar Dish (rotates slowly)
  const dishAngle = timeMs * 0.002;
  ctx.save();
  ctx.rotate(dishAngle);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, battR * 0.22, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(battR * 0.25, 0);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MISSILE BATTERY', 0, battR * 1.15);

  ctx.restore();
}

/**
 * 5. POINT-DEFENSE (PD) PLATFORM (PDP):
 * Circular defense hub with 15 CM vertical launchers and 10 rotating PD intercept lasers (+50% envelope).
 */
export function renderPdPlatform(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  ctx.save();
  const pdR = r * 1.35;

  // Armored Perimeter Disk
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, pdR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 15 CM Vertical Launch Tubes (perimeter ring)
  const tubeCount = 15;
  for (let i = 0; i < tubeCount; i++) {
    const angle = (i / tubeCount) * Math.PI * 2;
    const tx = Math.cos(angle) * (pdR * 0.72);
    const ty = Math.sin(angle) * (pdR * 0.72);
    ctx.fillStyle = '#047857';
    ctx.fillRect(tx - 2, ty - 2, 4, 4);
  }

  // 10 Rotating PD Intercept Laser Emitters
  const turretCount = 10;
  const rotTurret = timeMs * 0.0015;
  for (let i = 0; i < turretCount; i++) {
    const angle = (i / turretCount) * Math.PI * 2 + rotTurret;
    const lx = Math.cos(angle) * (pdR * 0.42);
    const ly = Math.sin(angle) * (pdR * 0.42);
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Radar Dome
  ctx.fillStyle = '#065f46';
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, pdR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PD PLATFORM', 0, pdR * 1.2);

  ctx.restore();
}

/**
 * 6. REPAIR BAY (RPB):
 * Open-cradle orbital drydock with 4 nano-assembler repair arms and restorative energy emitters.
 */
export function renderRepairBay(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  ctx.save();
  const bayR = r * 1.5;

  // Open Circular Ring Cradle
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.arc(0, 0, bayR * 0.85, Math.PI * 0.2, Math.PI * 1.8);
  ctx.stroke();

  // 4 Nano-Assembler Articulated Arms
  const armAngles = [Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.8;
  for (const a of armAngles) {
    const baseAx = Math.cos(a) * (bayR * 0.85);
    const baseAy = Math.sin(a) * (bayR * 0.85);
    const midAx = Math.cos(a) * (bayR * 0.55) + Math.sin(timeMs * 0.003 + a) * 4;
    const midAy = Math.sin(a) * (bayR * 0.55) - Math.cos(timeMs * 0.003 + a) * 4;
    ctx.beginPath();
    ctx.moveTo(baseAx, baseAy);
    ctx.lineTo(midAx, midAy);
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.arc(midAx, midAy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pulsing Restorative Nano-Field in center
  const pulse = Math.sin(timeMs * 0.005) * 0.5 + 0.5;
  ctx.fillStyle = `rgba(16, 185, 129, ${0.15 + pulse * 0.3})`;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 10 + pulse * 8;
  ctx.beginPath();
  ctx.arc(0, 0, bayR * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#d1fae5';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('REPAIR BAY', 0, bayR * 1.15);

  ctx.restore();
}

/**
 * 7. ORBITAL REFINERY (REF):
 * Industrial refinery station with catalytic cracking chambers, dual spherical silos, and flare vents.
 */
export function renderOrbitalRefinery(ctx: CanvasRenderingContext2D, r: number, timeMs: number): void {
  ctx.save();
  const refR = r * 1.55;

  // Central Industrial Processing Spine
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.rect(-refR * 0.7, -refR * 0.3, refR * 1.4, refR * 0.6);
  ctx.fill();
  ctx.stroke();

  // Dual Spherical Silos (Metallic: Left Cyan-Silver, Organic: Right Emerald)
  // Metallic Silo (left)
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-refR * 0.55, 0, refR * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Organic Silo (right)
  ctx.fillStyle = '#064e3b';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(refR * 0.55, 0, refR * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Central Catalytic Furnace Chamber (Amber/Orange flame glow)
  const flare = Math.sin(timeMs * 0.01) * 0.4 + 0.6;
  ctx.fillStyle = `rgba(245, 158, 11, ${flare})`;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 10;
  ctx.fillRect(-refR * 0.15, -refR * 0.15, refR * 0.3, refR * 0.3);
  ctx.shadowBlur = 0;

  // Top Exhaust Stack with Flare Tip
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(0, -refR * 0.3);
  ctx.lineTo(0, -refR * 0.75);
  ctx.stroke();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(0, -refR * 0.8, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ORBITAL REFINERY', 0, refR * 1.15);

  ctx.restore();
}
