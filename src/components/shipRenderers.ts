import { ShipEntity } from '../types';
import { FACTION_REGISTRY } from '../simulation/factions/factionRegistry';
import {
  renderMilitaryResearchStation,
  renderCivicResearchOutpost,
  renderExpansionCitadel,
  renderLightShipyard,
  renderMediumShipyard,
  renderHeavyShipyard,
  renderStructureByRoleOrType,
  renderGarnSystemMissilePod,
  renderGarnHQStructure,
  renderAldonahForgeCitadel,
  renderLiaalAgroCitadel,
  renderKovakSwarmBastion,
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
 * Resolves dynamic primary, accent, and chamfer colors based on ship.factionId
 */
export function getShipFactionColors(
  ship: any,
  isHostile: boolean,
  isCrippled: boolean = false
): { primaryColor: string; accentColor: string; chamferColor: string } {
  if (isCrippled) {
    return {
      primaryColor: '#ff2222',
      accentColor: '#ef4444',
      chamferColor: '#6b434a',
    };
  }

  if (ship?.factionId && FACTION_REGISTRY[ship.factionId]) {
    const meta = FACTION_REGISTRY[ship.factionId];
    return {
      primaryColor: meta.primaryColor,
      accentColor: meta.accentColor,
      chamferColor: isHostile ? meta.accentColor : UNSC_PALETTE.armorChamfer,
    };
  }

  return {
    primaryColor: isHostile ? '#f43f5e' : '#00f0ff',
    accentColor: isHostile ? '#fb7185' : '#38bdf8',
    chamferColor: isHostile ? '#6b434a' : UNSC_PALETTE.armorChamfer,
  };
}

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
 * Evaluates whether an entity is a Citadel (HQ Citadel starbases, Expansion Citadels, Pirate Bastions).
 * Scale must NOT be modified (strictly 1:1 scale).
 */
export function isCitadelEntity(ship: any): boolean {
  if (!ship) return false;
  const role = (ship.role || '').toUpperCase();
  const sType = ((ship.structureType || '') as string).toUpperCase();
  const sCode = ((ship.code || '') as string).toUpperCase();
  const id = ((ship.id || '') as string).toLowerCase();
  const hqType = (ship.hqType || '').toUpperCase();

  // 1. Headquarters Stations & Citadel Megastructures
  if (
    role === 'HQ' ||
    id.includes('hq') ||
    hqType === 'GARN_RING_CITADEL' ||
    hqType === 'ALDONAH_FORGE_CITADEL' ||
    hqType === 'LIAAL_AGRO_CITADEL' ||
    hqType === 'KOVAK_SWARM_BASTION' ||
    hqType === 'YESTIRI_CITY_SHIP' ||
    ship.isGarnRing ||
    (ship.isCityShip && (role === 'HQ' || id.includes('hq') || !role))
  ) {
    return true;
  }

  // 2. Expansion Citadels (EXC)
  if (
    role === 'EXPANSION_CITADEL' ||
    role === 'EXC' ||
    sType === 'EXPANSION_CITADEL' ||
    sType === 'EXC' ||
    sCode === 'EXC' ||
    id.includes('expansion_citadel') ||
    id.includes('exc')
  ) {
    return true;
  }

  // 3. Pirate Bastion Strongholds
  if (
    ship.isPirateBastion ||
    role === 'BASTION' ||
    sType === 'BASTION' ||
    sCode === 'BST' ||
    sCode === 'BAS' ||
    id.includes('bastion')
  ) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether an entity is an Orbital Structure (Shipyards, Research Stations, Defense Platforms, Sensor Posts).
 */
export function isOrbitalStructureEntity(ship: any): boolean {
  if (!ship || isCitadelEntity(ship)) return false;
  const role = (ship.role || '').toUpperCase();
  const sType = ((ship.structureType || '') as string).toUpperCase();
  const sCode = ((ship.code || '') as string).toUpperCase();
  const id = ((ship.id || '') as string).toLowerCase();

  return (
    role === 'SY_LIGHT' || role === 'LIGHT_SHIPYARD' || sType === 'SY_LIGHT' || sType === 'LIGHT_SHIPYARD' || sCode === 'SY-L' || id.includes('sy_light') || id.includes('light_shipyard') || id.includes('light-shipyard') ||
    role === 'SY_MEDIUM' || role === 'MEDIUM_SHIPYARD' || sType === 'SY_MEDIUM' || sType === 'MEDIUM_SHIPYARD' || sCode === 'SY-M' || id.includes('sy_medium') || id.includes('medium_shipyard') || id.includes('medium-shipyard') ||
    role === 'SY_HEAVY' || role === 'CAPITAL_SHIPYARD' || sType === 'SY_HEAVY' || sType === 'CAPITAL_SHIPYARD' || sCode === 'SY-H' || id.includes('sy_heavy') || id.includes('capital_shipyard') || id.includes('capital-shipyard') || id.includes('heavy_shipyard') || id.includes('heavy-shipyard') ||
    id.includes('shipyard') ||
    role === 'MILITARY_RESEARCH' || sType === 'MILITARY_RESEARCH' || sCode === 'MRS' || id.includes('mrs') || id.includes('military_research') ||
    role === 'CIVIC_RESEARCH' || sType === 'CIVIC_RESEARCH' || sCode === 'CRO' || id.includes('cro') || id.includes('civic_research') ||
    role === 'MISSILE_BATTERY' || sType === 'MISSILE_BATTERY' || sCode === 'MSB' || sCode === 'BAT' || id.includes('missile_battery') ||
    role === 'PD_PLATFORM' || sType === 'PD_PLATFORM' || sCode === 'PDP' || id.includes('pd_platform') ||
    role === 'GARN_MISSILE_POD' || sType === 'GARN_MISSILE_POD' || sCode === 'SDMP' || id.includes('sdmp') || id.includes('garn_missile') || id.includes('garn-missile') ||
    role === 'REPAIR_BAY' || sType === 'REPAIR_BAY' || sCode === 'RPB' || sCode === 'R-BAY' || id.includes('repair_bay') ||
    role === 'ORBITAL_REFINERY' || sType === 'ORBITAL_REFINERY' || sCode === 'REF' || id.includes('refinery') ||
    role.startsWith('POST_SENSOR') || sType.startsWith('POST_SENSOR') || sCode.startsWith('POST-') || id.includes('post_sensor') || id.includes('post-') ||
    Boolean(ship.isStationary) ||
    Boolean(ship.isStructure)
  );
}

/**
 * Returns visual scale multiplier (3:1 visual scale for movable ships and orbital structures, 1:1 for planetary citadels and celestial bodies).
 */
export function getShipVisualScaleMultiplier(ship: any): number {
  if (!ship) return 1.0;
  if (isCitadelEntity(ship)) return 1.0;
  return 3.0; // Unified 3:1 tactical scale for all ships and orbital structures
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

  const sType = ((ship as any).structureType || '').toUpperCase();
  const rUpper = (role as string || '').toUpperCase();
  const sCode = ((ship as any).code || '').toUpperCase();

  // Garn System Defense Missile Pod (SDMP)
  if (
    rUpper === 'GARN_MISSILE_POD' ||
    sType === 'GARN_MISSILE_POD' ||
    sCode === 'SDMP' ||
    id.includes('sdmp') ||
    id.includes('garn_missile') ||
    id.includes('garn-missile')
  ) {
    renderGarnSystemMissilePod(ctx, r, timeMs);
    return;
  }

  // Friendly & Orbital Structures
  if (role === 'HQ' || id.includes('hq')) {
    const hqType = ship.hqType;
    if (hqType === 'GARN_RING_CITADEL' || ship.isGarnRing || ship.factionId === 'GARN' || (ship.faction as any) === 'GARN') {
      renderGarnHQStructure(ctx, r, timeMs);
    } else if (hqType === 'ALDONAH_FORGE_CITADEL' || ship.factionId === 'ALDONAH' || (ship.faction as any) === 'ALDONAH') {
      renderAldonahForgeCitadel(ctx, Math.max(r, 140), timeMs);
    } else if (hqType === 'LIAAL_AGRO_CITADEL' || ship.factionId === 'LIAAL' || (ship.faction as any) === 'LIAAL') {
      renderLiaalAgroCitadel(ctx, r, timeMs);
    } else if (hqType === 'KOVAK_SWARM_BASTION' || ship.factionId === 'KOVAK' || (ship.faction as any) === 'KOVAK') {
      renderKovakSwarmBastion(ctx, r, timeMs);
    } else if (hqType === 'YESTIRI_CITY_SHIP' || ship.isCityShip || ship.factionId === 'YESTIRI' || (ship.faction as any) === 'YESTIRI') {
      // Yestiri HQ is a mobile City Ship citadel!
      drawYestiriShip(ctx, ship, Math.max(r, 75), timeMs, isHostile, true);
    } else {
      renderHQStation(ctx, r, timeMs);
    }
    return;
  }

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

  // Garn Hegemony Annular Warships
  if (
    ship.factionId === 'GARN' ||
    (ship.faction as any) === 'GARN' ||
    (ship as any).isGarnAnnular ||
    (ship as any).isGarnLongRange ||
    id.includes('garn')
  ) {
    drawGarnAnnularShip(ctx, ship, r, timeMs, isHostile);
    return;
  }

  // Yestiri Sodality Ring Ships (Carbon copies at different scales, up to the massive City Ship)
  if (
    ship.factionId === 'YESTIRI' ||
    (ship.faction as any) === 'YESTIRI' ||
    (role as string) === 'CITY_SHIP' ||
    (role as string) === 'CS' ||
    (ship as any).isYestiriRing ||
    id.includes('city-ship') ||
    id.includes('city_ship') ||
    (id.includes('yestiri') && !id.includes('station'))
  ) {
    const isCityShip = (role as string) === 'CITY_SHIP' || (role as string) === 'CS' || id.includes('city');
    drawYestiriShip(ctx, ship, isCityShip ? Math.max(r, 70) : r, timeMs, isHostile, isCityShip);
    return;
  }

  // Liaal Specialized Warships: 3 Warships only (Light 20-salvo, Medium 45-salvo, Heavy 100-salvo)
  if (
    ship.factionId === 'LIAAL' ||
    (ship.faction as any) === 'LIAAL' ||
    role === 'LIAAL_LIGHT' ||
    role === 'LIAAL_MEDIUM' ||
    role === 'LIAAL_HEAVY' ||
    id.includes('l-ws') ||
    id.includes('m-ws') ||
    id.includes('h-ws') ||
    id.includes('liaal')
  ) {
    const isHeavy = role === 'LIAAL_HEAVY' || id.includes('h-ws') || id.includes('heavy');
    const isMedium = role === 'LIAAL_MEDIUM' || id.includes('m-ws') || id.includes('medium');
    const tier = isHeavy ? 'HEAVY' : isMedium ? 'MEDIUM' : 'LIGHT';
    drawLiaalShip(ctx, ship, r, timeMs, isHostile, tier);
    return;
  }

  // Kovak Enclave Warships: Angular Rhomboid Hull Architecture (Volume over quality)
  if (
    ship.factionId === 'KOVAK' ||
    (ship.faction as any) === 'KOVAK' ||
    id.includes('kovak') ||
    (ship as any).isKovakRhomboid
  ) {
    drawKovakShip(ctx, ship, r, timeMs, isHostile);
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
  if ((role as string) === 'CRUISER' || id.includes('cruiser') || id.includes('vanguard')) {
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: factionColor, chamferColor } = getShipFactionColors(ship, isHostile, isCrippled);
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
  const { primaryColor: trimColor } = getShipFactionColors(ship, false, isCrippled);

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
  const { primaryColor: strokeColor } = getShipFactionColors(ship, true, isCrippled);
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

/**
 * GARN HEGEMONY ANNULAR WARSHIP RENDERER
 * 
 * Annular torus configuration:
 * - Outer and inner concentric rings (torus profile) with faceted emerald/bronze hull plating seams
 * - 4 structural radiating spokes connecting outer ring to central command core
 * - Central command hub with glowing tactical green telemetry dome
 * - Perimeter weapon nacelles, laser blisters, and missile launch bays arrayed radially
 * - Recessed stern thruster blocks on the rear arc with emerald/cyan drive flares
 * - Green tactical running lights (#22c55e, #4ade80, #166534)
 */
/**
 * ============================================================================
 * GARN HEGEMONY ANNULAR WARSHIPS
 * ============================================================================
 * Authentic top-down vector realization of the canonical Garn annular warship:
 * - Elongated, slender, faceted armored fuselage along the heading axis
 * - Prominent circular annular warp/habitat drive ring encircling the midsection
 * - Symmetrical structural bridge pylons and magnetic conduit struts connecting ring to hull
 * - Forward hull: Layered faceted armor deck, tapered prow with twin forward projector
 *   nacelles (Frigate/Destroyer) or faceted wedge prow with VLS missile blisters (Cruiser/Capital)
 * - Aft hull: Stepped horizontal cooling radiator grids / heat sinks along dorsal spine
 * - Stern: Heavy armored engine block with dual/quad plasma thrusters and emerald ion plumes
 * - Garn emerald-and-bronze armor palette (#064e3b, #042f24, #14532d, #b45309, #f59e0b, #4ade80)
 */
export function drawGarnAnnularShip(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  const isCrippled = ship.hullState === 'CRIPPLED';
  const role = ((ship.role as string) || '').toUpperCase();
  const id = (ship.id || '').toLowerCase();
  const isFrigateOrDestroyer =
    role === 'FRIGATE' ||
    role === 'DESTROYER' ||
    role === 'CORVETTE' ||
    role === 'SCOUT' ||
    id.includes('frigate') ||
    id.includes('destroyer') ||
    id.includes('escort') ||
    r <= 20;

  const isCapital =
    role === 'BATTLECRUISER' ||
    role === 'BATTLESHIP' ||
    role === 'DREADNOUGHT' ||
    id.includes('battle') ||
    id.includes('dread') ||
    r >= 36;

  const scale = Math.max(0.4, r / 16.0);

  // Garn emerald & bronze military palette
  const armorBase = isHostile ? '#161d19' : '#042f24';
  const armorMid = isHostile ? '#222d26' : '#064e3b';
  const armorLight = isHostile ? '#2f3e35' : '#0f5132';
  const armorFacet = isHostile ? '#3e5246' : '#14532d';
  const armorHighlight = isHostile ? '#526d5c' : '#15803d';
  const bronzeTrim = isHostile ? '#78350f' : '#b45309';
  const bronzeBright = isHostile ? '#b45309' : '#f59e0b';
  const emeraldGlow = '#10b981';
  const emeraldLight = '#4ade80';
  const deepGreen = '#059669';

  // Geometry dimensions
  const len = r * 2.45;
  const bowX = len * 0.52;
  const sternX = -len * 0.48;
  const ringX = -len * 0.05; // Placed at mid-to-aft section
  const hw = r * 0.36; // Hull half-width

  // Annular drive ring dimensions
  const ringOuterR = Math.max(3.0, r * 0.92);
  const ringInnerR = Math.max(1.5, ringOuterR * 0.65);
  const ringWidth = ringOuterR - ringInnerR;
  const ringLongitudinalBreadth = Math.max(2.5, r * 0.30);

  const isBurning = (ship.maxSpeed || 0) > 0 && ((ship.velocity && (ship.velocity.x !== 0 || ship.velocity.y !== 0)) || ship.splineActive);

  // -------------------------------------------------------------------------
  // 1. ENGINE EXHAUST PLUMES (Aft of Stern)
  // -------------------------------------------------------------------------
  if (isFrigateOrDestroyer) {
    // Twin main thruster exhausts
    const plumePositions = [-hw * 0.45, hw * 0.45];
    for (const py of plumePositions) {
      ctx.save();
      renderThrusterPlume(
        ctx,
        sternX - 2.5 * scale,
        py,
        3.5 * scale,
        (isBurning ? 20 : 10) * scale,
        isBurning || false,
        '#10b981',
        timeMs
      );
      ctx.restore();
    }
  } else {
    // Quad heavy capital thruster exhausts
    const plumePositions = [-hw * 0.65, -hw * 0.22, hw * 0.22, hw * 0.65];
    for (const py of plumePositions) {
      ctx.save();
      renderThrusterPlume(
        ctx,
        sternX - 2.5 * scale,
        py,
        3.0 * scale,
        (isBurning ? 22 : 12) * scale,
        isBurning || false,
        '#10b981',
        timeMs
      );
      ctx.restore();
    }
  }

  // -------------------------------------------------------------------------
  // 2. AFT SPINE RADIATOR HEAT SINK GRIDS (Stepped Horizontal Ribbed Grille)
  // -------------------------------------------------------------------------
  const radiatorStartX = ringX - ringLongitudinalBreadth * 0.55;
  const radiatorEndX = -len * 0.36;
  const radiatorWidth = hw * 0.52;
  const radiatorSteps = isCapital ? 7 : 5;

  // Recessed radiator trough
  ctx.fillStyle = '#021811';
  ctx.fillRect(radiatorEndX, -radiatorWidth * 0.5, radiatorStartX - radiatorEndX, radiatorWidth);
  ctx.strokeStyle = bronzeTrim;
  ctx.lineWidth = 0.9 * scale;
  ctx.strokeRect(radiatorEndX, -radiatorWidth * 0.5, radiatorStartX - radiatorEndX, radiatorWidth);

  // Ribbed heat dissipator slats
  const stepDist = (radiatorStartX - radiatorEndX) / radiatorSteps;
  for (let s = 1; s < radiatorSteps; s++) {
    const rx = radiatorEndX + s * stepDist;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.65)';
    ctx.lineWidth = 1.0 * scale;
    ctx.beginPath();
    ctx.moveTo(rx, -radiatorWidth * 0.45);
    ctx.lineTo(rx, radiatorWidth * 0.45);
    ctx.stroke();

    // Bronze connector clips
    ctx.fillStyle = bronzeBright;
    ctx.fillRect(rx - 0.6 * scale, -radiatorWidth * 0.48, 1.2 * scale, 1.6 * scale);
    ctx.fillRect(rx - 0.6 * scale, radiatorWidth * 0.48 - 1.6 * scale, 1.2 * scale, 1.6 * scale);
  }

  // -------------------------------------------------------------------------
  // 3. MAIN FUSELAGE HULL (Lower / Base Armored Body)
  // -------------------------------------------------------------------------
  ctx.beginPath();
  // Stern
  ctx.moveTo(sternX, -hw * 0.72);
  ctx.lineTo(sternX, hw * 0.72);
  // Engine bay flare
  ctx.lineTo(-len * 0.36, hw * 0.88);
  // Ring waist clearance
  ctx.lineTo(ringX - ringLongitudinalBreadth * 0.6, hw * 0.95);
  ctx.lineTo(ringX + ringLongitudinalBreadth * 0.6, hw * 0.95);
  // Forward midsection
  ctx.lineTo(len * 0.18, hw * 0.82);
  // Forward prow taper
  ctx.lineTo(len * 0.38, hw * 0.55);
  if (isFrigateOrDestroyer) {
    // Twin forward projector prow chamfers
    ctx.lineTo(len * 0.48, hw * 0.38);
    ctx.lineTo(bowX, hw * 0.38);
    ctx.lineTo(bowX, hw * 0.08);
    ctx.lineTo(len * 0.48, 0);
    ctx.lineTo(bowX, -hw * 0.08);
    ctx.lineTo(bowX, -hw * 0.38);
    ctx.lineTo(len * 0.48, -hw * 0.38);
  } else {
    // Capital wedge prow
    ctx.lineTo(len * 0.48, hw * 0.32);
    ctx.lineTo(bowX, hw * 0.12);
    ctx.lineTo(bowX, -hw * 0.12);
    ctx.lineTo(len * 0.48, -hw * 0.32);
  }
  ctx.lineTo(len * 0.38, -hw * 0.55);
  ctx.lineTo(len * 0.18, -hw * 0.82);
  ctx.lineTo(ringX + ringLongitudinalBreadth * 0.6, -hw * 0.95);
  ctx.lineTo(ringX - ringLongitudinalBreadth * 0.6, -hw * 0.95);
  ctx.lineTo(-len * 0.36, -hw * 0.88);
  ctx.closePath();

  // Hull base gradient
  const hullGrad = ctx.createLinearGradient(sternX, 0, bowX, 0);
  hullGrad.addColorStop(0, armorBase);
  hullGrad.addColorStop(0.35, armorMid);
  hullGrad.addColorStop(0.7, armorFacet);
  hullGrad.addColorStop(1, armorHighlight);
  ctx.fillStyle = hullGrad;
  ctx.fill();

  ctx.strokeStyle = bronzeTrim;
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();

  // -------------------------------------------------------------------------
  // 4. UPPER DECK ARMOR PLATING & FACETED CHINES
  // -------------------------------------------------------------------------
  // Lateral armored flank bevels (Port & Starboard)
  ctx.fillStyle = armorMid;
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
  ctx.lineWidth = 0.8 * scale;

  // Starboard Upper Plate
  ctx.beginPath();
  ctx.moveTo(ringX + ringLongitudinalBreadth * 0.6, hw * 0.75);
  ctx.lineTo(len * 0.22, hw * 0.65);
  ctx.lineTo(len * 0.42, hw * 0.38);
  ctx.lineTo(len * 0.42, hw * 0.18);
  ctx.lineTo(len * 0.18, hw * 0.25);
  ctx.lineTo(ringX + ringLongitudinalBreadth * 0.6, hw * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Port Upper Plate
  ctx.beginPath();
  ctx.moveTo(ringX + ringLongitudinalBreadth * 0.6, -hw * 0.75);
  ctx.lineTo(len * 0.22, -hw * 0.65);
  ctx.lineTo(len * 0.42, -hw * 0.38);
  ctx.lineTo(len * 0.42, -hw * 0.18);
  ctx.lineTo(len * 0.18, -hw * 0.25);
  ctx.lineTo(ringX + ringLongitudinalBreadth * 0.6, -hw * 0.30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Center Raised Dorsal Armor Spine (matching the raised faceted spine in the 3D model)
  ctx.beginPath();
  ctx.moveTo(ringX + ringLongitudinalBreadth * 0.5, -hw * 0.32);
  ctx.lineTo(len * 0.28, -hw * 0.28);
  ctx.lineTo(len * 0.45, -hw * 0.15);
  ctx.lineTo(len * 0.48, 0);
  ctx.lineTo(len * 0.45, hw * 0.15);
  ctx.lineTo(len * 0.28, hw * 0.28);
  ctx.lineTo(ringX + ringLongitudinalBreadth * 0.5, hw * 0.32);
  ctx.closePath();

  const spineGrad = ctx.createLinearGradient(ringX, 0, len * 0.48, 0);
  spineGrad.addColorStop(0, armorLight);
  spineGrad.addColorStop(0.6, armorFacet);
  spineGrad.addColorStop(1, armorHighlight);
  ctx.fillStyle = spineGrad;
  ctx.fill();

  ctx.strokeStyle = bronzeBright;
  ctx.lineWidth = 1.1 * scale;
  ctx.stroke();

  // Longitudinal Spine Crease
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.75)';
  ctx.lineWidth = 0.9 * scale;
  ctx.beginPath();
  ctx.moveTo(ringX + ringLongitudinalBreadth * 0.5, 0);
  ctx.lineTo(len * 0.48, 0);
  ctx.stroke();

  // -------------------------------------------------------------------------
  // 5. CLASS-SPECIFIC FORWARD WEAPONS & SENSORS
  // -------------------------------------------------------------------------
  if (isFrigateOrDestroyer) {
    // Twin Forward Projector Barrels / Nacelles at Prow Tip (as in lower wireframe)
    const barrelYPositions = [-hw * 0.23, hw * 0.23];
    for (const by of barrelYPositions) {
      // Cylindrical projector housing
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = bronzeBright;
      ctx.lineWidth = 1.0 * scale;
      ctx.beginPath();
      ctx.arc(bowX - 1.5 * scale, by, 3.2 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing emitter aperture
      ctx.fillStyle = emeraldLight;
      ctx.beginPath();
      ctx.arc(bowX - 1.5 * scale, by, 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lateral Mid-Forward Cylindrical Sensor Pods (matching lower wireframe flanks)
    const podYPositions = [-hw * 0.88, hw * 0.88];
    for (const py of podYPositions) {
      ctx.fillStyle = '#064e3b';
      ctx.strokeStyle = bronzeTrim;
      ctx.lineWidth = 0.9 * scale;
      ctx.beginPath();
      ctx.arc(len * 0.08, py, 2.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(len * 0.18, py, 2.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Heavy Capital Forward Graser Emitter & VLS Blister Cells
    ctx.fillStyle = '#021811';
    ctx.strokeStyle = bronzeBright;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.arc(bowX - 2 * scale, 0, 3.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = emeraldLight;
    ctx.beginPath();
    ctx.arc(bowX - 2 * scale, 0, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // VLS Missile Cell Blisters along mid-deck
    const vlsCols = 3;
    for (let c = 0; c < vlsCols; c++) {
      const vx = len * 0.12 + c * 4.5 * scale;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(vx, -hw * 0.5, 3.0 * scale, 2.0 * scale);
      ctx.fillRect(vx, hw * 0.5 - 2.0 * scale, 3.0 * scale, 2.0 * scale);
      ctx.strokeStyle = bronzeTrim;
      ctx.lineWidth = 0.7 * scale;
      ctx.strokeRect(vx, -hw * 0.5, 3.0 * scale, 2.0 * scale);
      ctx.strokeRect(vx, hw * 0.5 - 2.0 * scale, 3.0 * scale, 2.0 * scale);
    }
  }

  // -------------------------------------------------------------------------
  // 6. ANNULAR WARP / HABITAT DRIVE RING (The Canonical Garn Ring Collar)
  // -------------------------------------------------------------------------
  // Symmetrical Bridge Pylons (connecting central fuselage to inner ring)
  const pylonAngles = [Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.25, -Math.PI * 0.75];
  for (const pAng of pylonAngles) {
    const px = ringX + Math.cos(pAng) * (ringInnerR * 0.45);
    const py = Math.sin(pAng) * ringInnerR;

    ctx.save();
    ctx.strokeStyle = bronzeTrim;
    ctx.fillStyle = armorFacet;
    ctx.lineWidth = 1.2 * scale;

    ctx.beginPath();
    ctx.moveTo(ringX, Math.sign(py) * hw * 0.85);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Glowing conduit line inside pylon
    ctx.strokeStyle = emeraldGlow;
    ctx.lineWidth = 0.8 * scale;
    ctx.beginPath();
    ctx.moveTo(ringX, Math.sign(py) * hw * 0.85);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.restore();
  }

  // Horizontal Structural Pylon Spans
  const horizPylons = [-1, 1];
  for (const side of horizPylons) {
    ctx.fillStyle = armorLight;
    ctx.strokeStyle = bronzeBright;
    ctx.lineWidth = 1.0 * scale;
    const pW = ringLongitudinalBreadth * 0.65;
    const pH = Math.max(0.5, ringInnerR - hw * 0.85);
    const pY = side > 0 ? hw * 0.85 : -(hw * 0.85 + pH);

    ctx.fillRect(ringX - pW * 0.5, pY, pW, pH);
    ctx.strokeRect(ringX - pW * 0.5, pY, pW, pH);

    // Glowing conduits in pylon
    ctx.strokeStyle = emeraldLight;
    ctx.lineWidth = 0.9 * scale;
    ctx.beginPath();
    ctx.moveTo(ringX, side > 0 ? hw * 0.85 : -hw * 0.85);
    ctx.lineTo(ringX, side * ringInnerR);
    ctx.stroke();
  }

  // Annular Torus Ring (Top-Down Elliptical Projection of the Vertical Circular Ring)
  // Outer Ring Torus
  ctx.save();
  ctx.translate(ringX, 0);

  const rxOuter = Math.max(0.5, ringLongitudinalBreadth * 0.85);
  const ryOuter = Math.max(0.5, ringOuterR);
  const rxInner = Math.max(0.2, ringLongitudinalBreadth * 0.45);
  const ryInner = Math.max(0.2, ringInnerR);
  const rxMid = Math.max(0.3, ringLongitudinalBreadth * 0.65);
  const ryMid = Math.max(0.3, (ringInnerR + ringOuterR) * 0.5);

  ctx.beginPath();
  ctx.ellipse(0, 0, rxOuter, ryOuter, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 0, rxInner, ryInner, 0, 0, Math.PI * 2, true);
  ctx.closePath();

  // Torus Gradient Shading
  const ringTorusGrad = ctx.createRadialGradient(0, 0, ryInner, 0, 0, ryOuter);
  ringTorusGrad.addColorStop(0, armorLight);
  ringTorusGrad.addColorStop(0.4, armorMid);
  ringTorusGrad.addColorStop(0.8, armorBase);
  ringTorusGrad.addColorStop(1, armorHighlight);
  ctx.fillStyle = ringTorusGrad;
  ctx.fill();

  ctx.strokeStyle = bronzeBright;
  ctx.lineWidth = 1.6 * scale;
  ctx.stroke();

  // Concentric Inner Energy Conduit Track
  const pulseOffset = Math.sin(timeMs * 0.003);
  ctx.beginPath();
  ctx.ellipse(0, 0, rxMid, ryMid, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(74, 222, 128, ${0.7 + pulseOffset * 0.25})`;
  ctx.lineWidth = 1.2 * scale;
  ctx.setLineDash([4 * scale, 3 * scale]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Outer Perimeter Armor Ring Rim
  ctx.beginPath();
  ctx.ellipse(0, 0, rxOuter, ryOuter, 0, 0, Math.PI * 2);
  ctx.strokeStyle = bronzeTrim;
  ctx.lineWidth = 1.2 * scale;
  ctx.stroke();

  // Segmented Field Emitter Blocks on Outer Ring Lobes
  const emitterNodeAngles = [
    Math.PI * 0.35, Math.PI * 0.5, Math.PI * 0.65,
    -Math.PI * 0.35, -Math.PI * 0.5, -Math.PI * 0.65
  ];
  for (const nAng of emitterNodeAngles) {
    const ex = Math.cos(nAng) * (ringLongitudinalBreadth * 0.85);
    const ey = Math.sin(nAng) * ringOuterR;

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(nAng);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = bronzeBright;
    ctx.lineWidth = 0.9 * scale;
    ctx.fillRect(-1.5 * scale, -2.5 * scale, 3.0 * scale, 5.0 * scale);
    ctx.strokeRect(-1.5 * scale, -2.5 * scale, 3.0 * scale, 5.0 * scale);

    // Glowing diode
    ctx.fillStyle = emeraldLight;
    ctx.beginPath();
    ctx.arc(0, 0, 1.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Dorsal Arch Overlap & Shadow (Creating 3D perspective over fuselage)
  ctx.fillStyle = 'rgba(2, 44, 34, 0.4)';
  ctx.fillRect(-ringLongitudinalBreadth * 0.7, -hw * 0.85, ringLongitudinalBreadth * 1.4, hw * 1.7);

  ctx.restore(); // Exit ring translation

  // -------------------------------------------------------------------------
  // 7. TACTICAL RUNNING LIGHTS & STATUS INDICATORS
  // -------------------------------------------------------------------------
  const blink = (Math.sin(timeMs * 0.006) + 1) * 0.5 > 0.4;
  ctx.fillStyle = blink ? emeraldLight : deepGreen;

  // Forward Bow Navigation Lights
  ctx.beginPath();
  ctx.arc(bowX - 3 * scale, -hw * 0.3, 1.1 * scale, 0, Math.PI * 2);
  ctx.arc(bowX - 3 * scale, hw * 0.3, 1.1 * scale, 0, Math.PI * 2);
  // Flank Navigation Lights
  ctx.arc(ringX, -ringOuterR + 2 * scale, 1.1 * scale, 0, Math.PI * 2);
  ctx.arc(ringX, ringOuterR - 2 * scale, 1.1 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Stern Thruster Rim Details
  ctx.fillStyle = bronzeTrim;
  ctx.strokeStyle = bronzeBright;
  ctx.lineWidth = 1.0 * scale;
  if (isFrigateOrDestroyer) {
    ctx.fillRect(sternX - 1.5 * scale, -hw * 0.65, 2.0 * scale, hw * 0.4);
    ctx.fillRect(sternX - 1.5 * scale, hw * 0.25, 2.0 * scale, hw * 0.4);
    ctx.strokeRect(sternX - 1.5 * scale, -hw * 0.65, 2.0 * scale, hw * 0.4);
    ctx.strokeRect(sternX - 1.5 * scale, hw * 0.25, 2.0 * scale, hw * 0.4);
  } else {
    ctx.fillRect(sternX - 1.5 * scale, -hw * 0.82, 2.0 * scale, hw * 0.35);
    ctx.fillRect(sternX - 1.5 * scale, -hw * 0.38, 2.0 * scale, hw * 0.35);
    ctx.fillRect(sternX - 1.5 * scale, hw * 0.03, 2.0 * scale, hw * 0.35);
    ctx.fillRect(sternX - 1.5 * scale, hw * 0.47, 2.0 * scale, hw * 0.35);
  }

  // -------------------------------------------------------------------------
  // 8. DAMAGE & CRIPPLED STATE PARTICLES
  // -------------------------------------------------------------------------
  if (isCrippled) {
    const smokeFlicker = Math.sin(timeMs * 0.03) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + smokeFlicker * 0.4})`;
    ctx.beginPath();
    ctx.arc(ringX, ringOuterR * 0.4, 3.5 * scale, 0, Math.PI * 2);
    ctx.arc(len * 0.2, -hw * 0.3, 2.8 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Electrical discharge arcs
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(ringX - 4 * scale, ringInnerR * 0.8);
    ctx.lineTo(ringX + 2 * scale, ringInnerR * 0.5);
    ctx.lineTo(ringX - 1 * scale, ringInnerR * 0.2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * ============================================================================
 * YESTIRI SODALITY RING WARSHIPS & MOBILE CITY SHIP CITADEL
 * ============================================================================
 * Nomadic ring-hull architecture:
 * - Pure circular torus (ring) with completely open central circular space.
 * - Pearlescent ceramic off-white / silver titanium composite armor plating.
 * - Distinctive gold / bronze structural inlays, perimeter seams, and panel divides.
 * - Forward bridge featuring an inward-projecting arm with a tall vertical monolith spire.
 * - Observational dome flanked by stepped sensor wings with glowing cyan aperture slits.
 * - Inner-rim terraced habitat city amphitheaters with glittering urban window lights.
 * - Aft swept outrigger stabilizer fins and recessed multi-manifold ion thrusters.
 * - Carbon copies at different scales: Destroyers up to the colossal City Ship (2nd largest unit in the game).
 */
export function drawYestiriShip(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean,
  isCityShip: boolean = false
): void {
  ctx.save();

  const isCrippled = ship.hullState === 'CRIPPLED';
  // Compute scale based on radius, City Ship is colossal
  const baseScale = Math.max(0.5, r / 14.0);
  const scale = isCityShip ? Math.max(baseScale, 4.8) : baseScale;

  // Geometry dimensions
  const outerR = 18.0 * scale;
  const innerR = 9.5 * scale;
  const midR = (outerR + innerR) * 0.5;
  const voidR = 8.5 * scale;

  // Color Palette
  const armorBase = isHostile ? '#334155' : '#f8fafc';
  const armorShade = isHostile ? '#1e293b' : '#cbd5e1';
  const armorDark = isHostile ? '#0f172a' : '#94a3b8';
  const goldTrim = isHostile ? '#9a3412' : '#d97706';
  const goldHighlight = isHostile ? '#ea580c' : '#f59e0b';
  const cyanGlow = isHostile ? '#f43f5e' : '#38bdf8';
  const cyanCore = isHostile ? '#fda4af' : '#e0f2fe';
  const cityLightAmber = '#fef08a';
  const cityLightCyan = '#7dd3fc';

  const isMoving = (ship.maxSpeed || 0) > 0 &&
    ((ship.velocity && (ship.velocity.x !== 0 || ship.velocity.y !== 0)) || ship.splineActive);

  // --------------------------------------------------------------------------
  // 1. Aft Swept Outrigger Stabilizer Fins (Port & Starboard)
  // --------------------------------------------------------------------------
  const outriggerAngles = [Math.PI * 0.76, -Math.PI * 0.76]; // ~137° & -137°

  for (const oAng of outriggerAngles) {
    const isPort = oAng > 0;
    const sign = isPort ? 1 : -1;
    const rootX = Math.cos(oAng) * outerR;
    const rootY = Math.sin(oAng) * outerR;

    ctx.save();
    ctx.beginPath();
    // Base attachment
    ctx.moveTo(rootX + 2 * scale, rootY - sign * 2 * scale);
    // Swept tip extending outwards and backwards
    const tipX = rootX - 9 * scale;
    const tipY = rootY + sign * 8 * scale;
    ctx.lineTo(tipX, tipY);
    // Trailing edge notch
    ctx.lineTo(tipX + 2.5 * scale, tipY - sign * 3.5 * scale);
    ctx.lineTo(rootX - 3 * scale, rootY);
    ctx.closePath();

    ctx.fillStyle = armorBase;
    ctx.fill();

    // Gold leading edge border
    ctx.strokeStyle = goldHighlight;
    ctx.lineWidth = 1.4 * Math.min(scale, 2.5);
    ctx.beginPath();
    ctx.moveTo(rootX + 2 * scale, rootY - sign * 2 * scale);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Outrigger navigation strobe
    const navBlink = (Math.sin(timeMs * 0.007 + (isPort ? 0 : Math.PI)) + 1) * 0.5;
    if (navBlink > 0.5) {
      ctx.fillStyle = isPort ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 1.2 * Math.min(scale, 2.0), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 2. Aft Thruster Nozzles & Ion Exhaust Plumes
  // --------------------------------------------------------------------------
  const thrusterArcs = [-0.25, 0, 0.25];
  for (const arcOffset of thrusterArcs) {
    const tAng = Math.PI + arcOffset;
    const nx = Math.cos(tAng) * outerR;
    const ny = Math.sin(tAng) * outerR;

    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(tAng);

    // Recessed dark nozzle block
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1.5 * scale, -2.0 * scale, 3.5 * scale, 4.0 * scale);
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = 1.0 * Math.min(scale, 2.0);
    ctx.strokeRect(-1.5 * scale, -2.0 * scale, 3.5 * scale, 4.0 * scale);

    // Ion plume when burning
    if (isMoving) {
      const flumeLength = (6.0 + Math.sin(timeMs * 0.04 + arcOffset * 8) * 2.5) * scale;
      const grad = ctx.createLinearGradient(0, 0, flumeLength, 0);
      grad.addColorStop(0, cyanCore);
      grad.addColorStop(0.3, cyanGlow);
      grad.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(1.5 * scale, -1.8 * scale);
      ctx.lineTo(flumeLength, 0);
      ctx.lineTo(1.5 * scale, 1.8 * scale);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 3. Main Armored Torus (Ring Body)
  // --------------------------------------------------------------------------
  ctx.save();

  // Create donut path with counter-clockwise inner cutout
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2, false);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.closePath();

  // Cylindrical metallic ring shading gradient
  const ringGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
  ringGrad.addColorStop(0.0, armorDark);
  ringGrad.addColorStop(0.25, armorBase);
  ringGrad.addColorStop(0.70, armorShade);
  ringGrad.addColorStop(1.0, armorDark);

  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Outer and Inner Gold Trim Rims
  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 1.6 * Math.min(scale, 2.5);
  ctx.stroke();

  // Mid-ring Concentric Panel Seam
  ctx.beginPath();
  ctx.arc(0, 0, midR, 0, Math.PI * 2);
  ctx.strokeStyle = goldHighlight;
  ctx.lineWidth = 1.0 * Math.min(scale, 2.0);
  ctx.stroke();

  // Radial Gold Panel Divider Lines (every 30 degrees)
  const sectorCount = isCityShip ? 24 : 12;
  const stepRad = (Math.PI * 2) / sectorCount;
  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 0.9 * Math.min(scale, 2.0);

  for (let i = 0; i < sectorCount; i++) {
    const ang = i * stepRad;
    const x1 = Math.cos(ang) * innerR;
    const y1 = Math.sin(ang) * innerR;
    const x2 = Math.cos(ang) * outerR;
    const y2 = Math.sin(ang) * outerR;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();

  // --------------------------------------------------------------------------
  // 4. Terraced Inner Habitat City Decks (Glittering Metropolis facing central void)
  // --------------------------------------------------------------------------
  const habitatArcs = [
    { start: 0.35, end: 2.65 },  // Starboard flank
    { start: -2.65, end: -0.35 } // Port flank
  ];

  for (const hArc of habitatArcs) {
    const numSubSectors = isCityShip ? 14 : 6;
    const arcSpan = hArc.end - hArc.start;
    const subStep = arcSpan / numSubSectors;

    for (let s = 0; s < numSubSectors; s++) {
      const theta = hArc.start + s * subStep + subStep * 0.5;
      const habRadius1 = innerR + 1.2 * scale;
      const habRadius2 = innerR + 2.8 * scale;

      const px1 = Math.cos(theta) * habRadius1;
      const py1 = Math.sin(theta) * habRadius1;
      const px2 = Math.cos(theta) * habRadius2;
      const py2 = Math.sin(theta) * habRadius2;

      // Small glowing city habitat window cluster
      const isAmber = (s % 2 === 0);
      ctx.fillStyle = isAmber ? cityLightAmber : cityLightCyan;
      ctx.beginPath();
      ctx.arc(px1, py1, 0.9 * Math.min(scale, 2.2), 0, Math.PI * 2);
      ctx.fill();

      if (isCityShip) {
        ctx.fillStyle = isAmber ? cityLightCyan : cityLightAmber;
        ctx.beginPath();
        ctx.arc(px2, py2, 0.8 * Math.min(scale, 2.0), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. Central Void Energy Resonance Field (City Ship & Mobile HQ)
  // --------------------------------------------------------------------------
  if (isCityShip) {
    const pulse = (Math.sin(timeMs * 0.003) + 1) * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, voidR * 0.75, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.15 + pulse * 0.25})`;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    // Subtle faint gravitic containment lattice
    ctx.beginPath();
    ctx.arc(0, 0, voidR * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 + pulse * 0.2})`;
    ctx.lineWidth = 1.0 * scale;
    ctx.stroke();
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 6. Forward Command Bridge & Inward-Projecting Monolith Spire Arm
  // --------------------------------------------------------------------------
  // The bridge sits at the forward arc (+X).
  // An arm extends INWARD into the open central space towards x = 0.
  // Mounted atop this arm is the distinctive vertical monolith spire.
  // (A) Bridge module base straddling the forward ring
  const bridgeWidth = 10.0 * scale;
  const bridgeDepth = 7.5 * scale;
  ctx.fillStyle = armorBase;
  ctx.beginPath();
  ctx.moveTo(outerR - 1 * scale, -bridgeWidth * 0.5);
  ctx.lineTo(outerR + bridgeDepth * 0.6, -bridgeWidth * 0.35);
  ctx.lineTo(outerR + bridgeDepth * 0.6, bridgeWidth * 0.35);
  ctx.lineTo(outerR - 1 * scale, bridgeWidth * 0.5);
  ctx.lineTo(innerR + 1 * scale, bridgeWidth * 0.35);
  ctx.lineTo(innerR + 1 * scale, -bridgeWidth * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = goldHighlight;
  ctx.lineWidth = 1.5 * Math.min(scale, 2.5);
  ctx.stroke();

  // (B) Inward-Projecting Structural Arm (Reaching into central void)
  const armWidth = 4.2 * scale;
  const armTipX = innerR * 0.15; // Extends deep into central ring
  ctx.beginPath();
  ctx.moveTo(innerR + 1 * scale, -armWidth * 0.5);
  ctx.lineTo(innerR * 0.5, -armWidth * 0.45);
  ctx.lineTo(armTipX, 0); // Pointed faceted prow facing the center
  ctx.lineTo(innerR * 0.5, armWidth * 0.45);
  ctx.lineTo(innerR + 1 * scale, armWidth * 0.5);
  ctx.closePath();

  ctx.fillStyle = armorBase;
  ctx.fill();
  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 1.3 * Math.min(scale, 2.2);
  ctx.stroke();

  // (C) Vertical Command Monolith Spire (Rendered with 3D drop-shading)
  const spireX = innerR * 0.55;
  const spireLen = 6.0 * scale;
  const spireW = 2.2 * scale;

  // Shadow casting on the arm
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.beginPath();
  ctx.moveTo(spireX - spireLen * 0.5, -spireW * 0.5);
  ctx.lineTo(spireX + spireLen * 0.5, -spireW * 0.5 - 1.5 * scale);
  ctx.lineTo(spireX + spireLen * 0.5 + 2 * scale, 0);
  ctx.lineTo(spireX - spireLen * 0.5, 0);
  ctx.closePath();
  ctx.fill();

  // Main spire blade
  ctx.fillStyle = armorShade;
  ctx.beginPath();
  ctx.moveTo(spireX - spireLen * 0.5, -spireW * 0.5);
  ctx.lineTo(spireX + spireLen * 0.5, -spireW * 0.2);
  ctx.lineTo(spireX + spireLen * 0.5, spireW * 0.2);
  ctx.lineTo(spireX - spireLen * 0.5, spireW * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = goldHighlight;
  ctx.lineWidth = 1.2 * Math.min(scale, 2.0);
  ctx.stroke();

  // Beacon at spire apex
  const beaconBlink = (Math.sin(timeMs * 0.01) + 1) * 0.5;
  ctx.fillStyle = beaconBlink > 0.4 ? cyanCore : cyanGlow;
  ctx.beginPath();
  ctx.arc(spireX + spireLen * 0.5, 0, 1.4 * Math.min(scale, 2.2), 0, Math.PI * 2);
  ctx.fill();

  // (D) Forward Shaded Dome (Observatory / Shield Projector Orb)
  const domeX = outerR * 0.88;
  const domeR = 2.8 * scale;
  const domeGrad = ctx.createRadialGradient(
    domeX - domeR * 0.3, -domeR * 0.3, domeR * 0.1,
    domeX, 0, domeR
  );
  domeGrad.addColorStop(0, '#ffffff');
  domeGrad.addColorStop(0.35, isHostile ? '#fda4af' : '#7dd3fc');
  domeGrad.addColorStop(0.8, isHostile ? '#9f1239' : '#0369a1');
  domeGrad.addColorStop(1.0, '#0c4a6e');

  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(domeX, 0, domeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = goldTrim;
  ctx.lineWidth = 1.0 * Math.min(scale, 2.0);
  ctx.stroke();

  // (E) Flanking Stepped Sensor Wings with Glowing Cyan Apertures (3 per side)
  const sensorWingYOffsets = [-5.2 * scale, 5.2 * scale];
  for (const sY of sensorWingYOffsets) {
    ctx.save();
    ctx.translate(outerR * 0.82, sY);

    // Sensor housing
    ctx.fillStyle = armorDark;
    ctx.fillRect(-1.5 * scale, -1.8 * scale, 3.0 * scale, 3.6 * scale);
    ctx.strokeStyle = goldTrim;
    ctx.lineWidth = 0.8 * Math.min(scale, 1.8);
    ctx.strokeRect(-1.5 * scale, -1.8 * scale, 3.0 * scale, 3.6 * scale);

    // 3 glowing cyan slit apertures
    ctx.fillStyle = cyanGlow;
    ctx.fillRect(-1.0 * scale, -1.2 * scale, 2.0 * scale, 0.6 * scale);
    ctx.fillRect(-1.0 * scale, -0.3 * scale, 2.0 * scale, 0.6 * scale);
    ctx.fillRect(-1.0 * scale, 0.6 * scale, 2.0 * scale, 0.6 * scale);

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // 7. Tactical Hardpoint Turrets along Outer Rim
  // --------------------------------------------------------------------------
  const turretAngles = [
    Math.PI * 0.25, -Math.PI * 0.25,
    Math.PI * 0.5, -Math.PI * 0.5
  ];
  for (const tAng of turretAngles) {
    const tx = Math.cos(tAng) * (outerR - 1.5 * scale);
    const ty = Math.sin(tAng) * (outerR - 1.5 * scale);

    ctx.fillStyle = goldTrim;
    ctx.beginPath();
    ctx.arc(tx, ty, 1.4 * Math.min(scale, 2.2), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(tx, ty, 0.8 * Math.min(scale, 1.8), 0, Math.PI * 2);
    ctx.fill();
  }

  // --------------------------------------------------------------------------
  // 8. Mounted Research Orbital Modules (Dynamic Visual Upgrades on Hull)
  // --------------------------------------------------------------------------
  const mountedModules = ship.mountedResearchModules || [];
  if (mountedModules.length > 0) {
    // 6 hardpoint sockets distributed symmetrically across port & starboard flanks
    const socketAngles = [
      Math.PI * 0.28,  // Starboard forward-mid
      -Math.PI * 0.28, // Port forward-mid
      Math.PI * 0.52,  // Starboard beam
      -Math.PI * 0.52, // Port beam
      Math.PI * 0.68,  // Starboard aft-mid
      -Math.PI * 0.68, // Port aft-mid
    ];

    mountedModules.forEach((modType, idx) => {
      if (idx >= socketAngles.length) return;
      const mAng = socketAngles[idx];
      const mx = Math.cos(mAng) * outerR;
      const my = Math.sin(mAng) * outerR;

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(mAng + Math.PI * 0.5);

      const modScale = Math.min(scale, 2.5);

      if (modType === 'MILITARY_RESEARCH') {
        // Military Research Station: Angular red/slate armored ordnance pod
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-2.2 * modScale, -1.5 * modScale, 4.4 * modScale, 3.0 * modScale);
        ctx.fillStyle = '#e11d48';
        ctx.fillRect(-1.4 * modScale, -2.2 * modScale, 2.8 * modScale, 1.2 * modScale);
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-2.2 * modScale, -1.5 * modScale, 4.4 * modScale, 3.0 * modScale);
        // Blinking red laser sensor
        const blink = (Math.sin(timeMs * 0.008 + idx) + 1) * 0.5;
        ctx.fillStyle = blink > 0.4 ? '#f43f5e' : '#881337';
        ctx.beginPath();
        ctx.arc(0, -2.6 * modScale, 1.0 * modScale, 0, Math.PI * 2);
        ctx.fill();
      } else if (modType === 'CIVIC_RESEARCH') {
        // Civic Research Outpost: Glowing cyan bio-observation dome
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-2.0 * modScale, -1.2 * modScale, 4.0 * modScale, 2.4 * modScale);
        const domeGrad = ctx.createRadialGradient(0, -1.2 * modScale, 0.2 * modScale, 0, -1.2 * modScale, 2.0 * modScale);
        domeGrad.addColorStop(0, '#e0f2fe');
        domeGrad.addColorStop(0.5, '#06b6d4');
        domeGrad.addColorStop(1, '#0e7490');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(0, -1.2 * modScale, 1.8 * modScale, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else {
        // Expansion Citadel: Stepped gold/amber modular spire
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-2.4 * modScale, -1.2 * modScale, 4.8 * modScale, 2.4 * modScale);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-1.5 * modScale, -2.4 * modScale, 3.0 * modScale, 1.4 * modScale);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(-0.8 * modScale, -3.2 * modScale, 1.6 * modScale, 1.0 * modScale);
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-2.4 * modScale, -1.2 * modScale, 4.8 * modScale, 2.4 * modScale);
      }

      ctx.restore();
    });
  }

  // Crippled fire/smoke if damaged
  if (isCrippled) {
    const smokeFlicker = Math.sin(timeMs * 0.035) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + smokeFlicker * 0.4})`;
    ctx.beginPath();
    ctx.arc(outerR * 0.4, outerR * 0.35, 4.0 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * ============================================================================
 * LIAAL SPECIALIZED WARSHIP RENDERER (LIGHT, MEDIUM, HEAVY)
 * ============================================================================
 * Cargo & Terraforming Heavy Doctrine:
 * - Light Warship (L-WS): 20 missiles / salvo, hexagonal side cargo pods, 4x5 missile grid
 * - Medium Warship (M-WS): 45 missiles / salvo, twin terraforming biodomes, 5x9 missile grid
 * - Heavy Warship (H-WS): 100 missiles / salvo, cataclysm titan, 10x10 VLS grid, atmospheric processing spires
 * - Warm terracotta, industrial copper/brass armor, glowing bio-emerald life-synthesis conduits
 */
export function drawLiaalShip(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean,
  tier: 'LIGHT' | 'MEDIUM' | 'HEAVY' = 'LIGHT'
): void {
  ctx.save();

  const isCrippled = ship.hullState === 'CRIPPLED';
  const scale = tier === 'HEAVY'
    ? Math.max(1.8, r / 12.0)
    : tier === 'MEDIUM'
    ? Math.max(1.2, r / 12.0)
    : Math.max(0.75, r / 12.0);

  // Liaal Earthy / Terracotta & Copper / Bio-Emerald Palette
  const armorBase = isHostile ? '#431407' : '#9a3412';
  const armorShade = isHostile ? '#270d04' : '#7c2d12';
  const armorHighlight = isHostile ? '#78350f' : '#ea580c';
  const copperTrim = isHostile ? '#78350f' : '#d97706';
  const brassAccent = isHostile ? '#b45309' : '#f59e0b';
  const emeraldGlow = isHostile ? '#f43f5e' : '#10b981';
  const emeraldCore = isHostile ? '#fda4af' : '#6ee7b7';
  const cargoBoxColor = isHostile ? '#334155' : '#047857';

  const isMoving = (ship.maxSpeed || 0) > 0 &&
    ((ship.velocity && (ship.velocity.x !== 0 || ship.velocity.y !== 0)) || ship.splineActive);

  if (tier === 'LIGHT') {
    // ------------------------------------------------------------------------
    // LIGHT WARSHIP (L-WS): 20 Missiles Per Salvo (4x5 VLS grid)
    // ------------------------------------------------------------------------
    const length = 28 * scale;
    const halfW = 12 * scale;

    // 1. Dual Aft Thruster Exhausts
    const thrusterY = [-halfW * 0.45, halfW * 0.45];
    for (const ty of thrusterY) {
      renderThrusterPlume(ctx, -length * 0.45, ty, 3.5 * scale, 14 * scale, isMoving, '#f59e0b', timeMs);
    }

    // 2. Primary Wedge/Wider Hull with Faceted Chamfers
    ctx.fillStyle = armorBase;
    ctx.strokeStyle = copperTrim;
    ctx.lineWidth = 1.4 * Math.min(scale, 2.0);
    ctx.beginPath();
    ctx.moveTo(length * 0.52, 0); // Forward sharp prow
    ctx.lineTo(length * 0.25, -halfW * 0.6);
    ctx.lineTo(-length * 0.1, -halfW); // Broad cargo sponsons
    ctx.lineTo(-length * 0.48, -halfW * 0.75); // Stern left
    ctx.lineTo(-length * 0.48, halfW * 0.75); // Stern right
    ctx.lineTo(-length * 0.1, halfW);
    ctx.lineTo(length * 0.25, halfW * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Flanking Hexagonal Cargo / Terraforming Reagent Canisters (2 on each side)
    const canisterX = [-length * 0.15, length * 0.05];
    for (const cx of canisterX) {
      for (const side of [-1, 1]) {
        const cy = side * (halfW * 0.75);
        ctx.fillStyle = cargoBoxColor;
        ctx.strokeStyle = brassAccent;
        ctx.lineWidth = 0.9 * Math.min(scale, 1.8);
        ctx.fillRect(cx - 2.5 * scale, cy - 2.0 * scale, 5.0 * scale, 4.0 * scale);
        ctx.strokeRect(cx - 2.5 * scale, cy - 2.0 * scale, 5.0 * scale, 4.0 * scale);

        // Bio-fluid level light
        ctx.fillStyle = emeraldGlow;
        ctx.fillRect(cx - 1.8 * scale, cy - 0.5 * scale, 3.6 * scale, 1.0 * scale);
      }
    }

    // 4. Central 20-Tube Honeycomb VLS Matrix (4 columns x 5 rows)
    const cols = 4;
    const rows = 5;
    const cellW = 1.8 * scale;
    const cellH = 1.5 * scale;
    const gridStartX = -length * 0.18;
    const gridStartY = -((rows - 1) * cellH * 1.3) * 0.5;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(gridStartX - 2 * scale, gridStartY - 2 * scale, cols * cellW * 1.35 + 2 * scale, rows * cellH * 1.35 + 2 * scale);
    ctx.strokeStyle = brassAccent;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(gridStartX - 2 * scale, gridStartY - 2 * scale, cols * cellW * 1.35 + 2 * scale, rows * cellH * 1.35 + 2 * scale);

    for (let c = 0; c < cols; c++) {
      for (let rIdx = 0; rIdx < rows; rIdx++) {
        const mx = gridStartX + c * cellW * 1.35;
        const my = gridStartY + rIdx * cellH * 1.35;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(mx, my, cellW, cellH);

        // Armed missile cap indicator (Red / Amber glowing warhead)
        ctx.fillStyle = (c * 5 + rIdx + Math.floor(timeMs * 0.005)) % 4 === 0 ? '#ef4444' : '#f59e0b';
        ctx.fillRect(mx + 0.3 * scale, my + 0.3 * scale, cellW - 0.6 * scale, cellH - 0.6 * scale);
      }
    }

    // 5. Forward Terraforming Dispersal Emitter Lens
    const pulse = (Math.sin(timeMs * 0.008) + 1) * 0.5;
    ctx.fillStyle = pulse > 0.4 ? emeraldCore : emeraldGlow;
    ctx.beginPath();
    ctx.arc(length * 0.45, 0, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = brassAccent;
    ctx.lineWidth = 1.0;
    ctx.stroke();

  } else if (tier === 'MEDIUM') {
    // ------------------------------------------------------------------------
    // MEDIUM WARSHIP (M-WS): 45 Missiles Per Salvo (5x9 VLS grid)
    // ------------------------------------------------------------------------
    const length = 48 * scale;
    const halfW = 20 * scale;

    // 1. Quad Aft Thrusters
    const thrusterY = [-halfW * 0.6, -halfW * 0.25, halfW * 0.25, halfW * 0.6];
    for (const ty of thrusterY) {
      renderThrusterPlume(ctx, -length * 0.48, ty, 4.0 * scale, 20 * scale, isMoving, '#ea580c', timeMs);
    }

    // 2. Heavy Twin-Catamaran Sponson Hull
    ctx.fillStyle = armorBase;
    ctx.strokeStyle = copperTrim;
    ctx.lineWidth = 1.6 * Math.min(scale, 2.2);
    ctx.beginPath();
    ctx.moveTo(length * 0.50, 0);
    ctx.lineTo(length * 0.35, -halfW * 0.4);
    ctx.lineTo(length * 0.15, -halfW * 0.85); // Port catamaran prow
    ctx.lineTo(-length * 0.45, -halfW * 0.85); // Port stern
    ctx.lineTo(-length * 0.45, -halfW * 0.35);
    ctx.lineTo(-length * 0.35, 0);             // Center recessed stern
    ctx.lineTo(-length * 0.45, halfW * 0.35);
    ctx.lineTo(-length * 0.45, halfW * 0.85);  // Stbd stern
    ctx.lineTo(length * 0.15, halfW * 0.85);   // Stbd catamaran prow
    ctx.lineTo(length * 0.35, halfW * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Twin Pressurized Terraforming Bio-Domes (Port & Stbd Sponsons)
    for (const side of [-1, 1]) {
      const domeX = -length * 0.05;
      const domeY = side * (halfW * 0.62);
      const domeR = 5.5 * scale;

      const domeGrad = ctx.createRadialGradient(
        domeX - domeR * 0.3, domeY - domeR * 0.3, domeR * 0.1,
        domeX, domeY, domeR
      );
      domeGrad.addColorStop(0, '#ecfdf5');
      domeGrad.addColorStop(0.4, '#10b981');
      domeGrad.addColorStop(0.8, '#047857');
      domeGrad.addColorStop(1.0, '#064e3b');

      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(domeX, domeY, domeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = brassAccent;
      ctx.lineWidth = 1.2 * Math.min(scale, 2.0);
      ctx.stroke();
    }

    // 4. Central 45-Tube Honeycomb VLS Matrix (9 columns x 5 rows = 45 tubes)
    const cols = 9;
    const rows = 5;
    const cellW = 1.9 * scale;
    const cellH = 1.6 * scale;
    const gridStartX = -length * 0.22;
    const gridStartY = -((rows - 1) * cellH * 1.3) * 0.5;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(gridStartX - 2 * scale, gridStartY - 2 * scale, cols * cellW * 1.32 + 2 * scale, rows * cellH * 1.32 + 2 * scale);
    ctx.strokeStyle = brassAccent;
    ctx.lineWidth = 1.0;
    ctx.strokeRect(gridStartX - 2 * scale, gridStartY - 2 * scale, cols * cellW * 1.32 + 2 * scale, rows * cellH * 1.32 + 2 * scale);

    for (let c = 0; c < cols; c++) {
      for (let rIdx = 0; rIdx < rows; rIdx++) {
        const mx = gridStartX + c * cellW * 1.32;
        const my = gridStartY + rIdx * cellH * 1.32;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(mx, my, cellW, cellH);

        const isArmed = (c * 5 + rIdx + Math.floor(timeMs * 0.006)) % 3 !== 0;
        ctx.fillStyle = isArmed ? '#f97316' : '#ef4444';
        ctx.fillRect(mx + 0.3 * scale, my + 0.3 * scale, cellW - 0.6 * scale, cellH - 0.6 * scale);
      }
    }

    // 5. Forward Command Deck & Atmospheric Synthesis Spire
    ctx.fillStyle = armorHighlight;
    ctx.beginPath();
    ctx.moveTo(length * 0.35, -halfW * 0.25);
    ctx.lineTo(length * 0.52, 0);
    ctx.lineTo(length * 0.35, halfW * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = brassAccent;
    ctx.lineWidth = 1.2;
    ctx.stroke();

  } else {
    // ------------------------------------------------------------------------
    // HEAVY WARSHIP (H-WS): 100 Missiles Per Salvo (10x10 Cataclysm Grid)
    // ------------------------------------------------------------------------
    const length = 82 * scale;
    const halfW = 34 * scale;

    // 1. 6 Heavy Fusion Exhaust Manifolds
    const thrusterY = [-halfW * 0.7, -halfW * 0.42, -halfW * 0.15, halfW * 0.15, halfW * 0.42, halfW * 0.7];
    for (const ty of thrusterY) {
      renderThrusterPlume(ctx, -length * 0.50, ty, 5.0 * scale, 28 * scale, isMoving, '#f97316', timeMs);
    }

    // 2. Colossal Citadel Superstructure
    ctx.fillStyle = armorShade;
    ctx.strokeStyle = copperTrim;
    ctx.lineWidth = 2.0 * Math.min(scale, 2.5);
    ctx.beginPath();
    ctx.moveTo(length * 0.52, 0);              // Massive forward ram
    ctx.lineTo(length * 0.38, -halfW * 0.35);
    ctx.lineTo(length * 0.22, -halfW * 0.88);  // Port forward outrigger
    ctx.lineTo(-length * 0.46, -halfW * 0.88); // Port aft
    ctx.lineTo(-length * 0.50, -halfW * 0.45);
    ctx.lineTo(-length * 0.40, 0);             // Center keel notch
    ctx.lineTo(-length * 0.50, halfW * 0.45);
    ctx.lineTo(-length * 0.46, halfW * 0.88);  // Stbd aft
    ctx.lineTo(length * 0.22, halfW * 0.88);   // Stbd forward outrigger
    ctx.lineTo(length * 0.38, halfW * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Tiered Terraforming Biospheres & Atmospheric Cracking Spires (4 Bio-Domes)
    const domeCoords = [
      { x: length * 0.05, y: -halfW * 0.65 },
      { x: -length * 0.22, y: -halfW * 0.65 },
      { x: length * 0.05, y: halfW * 0.65 },
      { x: -length * 0.22, y: halfW * 0.65 },
    ];

    domeCoords.forEach((dc) => {
      const domeR = 6.8 * scale;
      const domeGrad = ctx.createRadialGradient(
        dc.x - domeR * 0.3, dc.y - domeR * 0.3, domeR * 0.1,
        dc.x, dc.y, domeR
      );
      domeGrad.addColorStop(0, '#ecfdf5');
      domeGrad.addColorStop(0.3, '#34d399');
      domeGrad.addColorStop(0.7, '#059669');
      domeGrad.addColorStop(1.0, '#022c22');

      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(dc.x, dc.y, domeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = brassAccent;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });

    // 4. Cataclysm 100-Tube VLS Grid (10 columns x 10 rows = 100 tubes)
    const cols = 10;
    const rows = 10;
    const cellW = 1.9 * scale;
    const cellH = 1.6 * scale;
    const gridStartX = -length * 0.28;
    const gridStartY = -((rows - 1) * cellH * 1.25) * 0.5;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(gridStartX - 2.5 * scale, gridStartY - 2.5 * scale, cols * cellW * 1.25 + 3 * scale, rows * cellH * 1.25 + 3 * scale);
    ctx.strokeStyle = brassAccent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(gridStartX - 2.5 * scale, gridStartY - 2.5 * scale, cols * cellW * 1.25 + 3 * scale, rows * cellH * 1.25 + 3 * scale);

    for (let c = 0; c < cols; c++) {
      for (let rIdx = 0; rIdx < rows; rIdx++) {
        const mx = gridStartX + c * cellW * 1.25;
        const my = gridStartY + rIdx * cellH * 1.25;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(mx, my, cellW, cellH);

        const tubeIndex = c * 10 + rIdx;
        const isFiring = (tubeIndex + Math.floor(timeMs * 0.008)) % 5 === 0;
        ctx.fillStyle = isFiring ? '#f43f5e' : (tubeIndex % 2 === 0 ? '#f59e0b' : '#ea580c');
        ctx.fillRect(mx + 0.3 * scale, my + 0.3 * scale, cellW - 0.6 * scale, cellH - 0.6 * scale);
      }
    }

    // 5. Grand Forward Planetary Seed Ram & Core Sensor Array
    ctx.fillStyle = armorHighlight;
    ctx.beginPath();
    ctx.moveTo(length * 0.32, -halfW * 0.3);
    ctx.lineTo(length * 0.54, 0);
    ctx.lineTo(length * 0.32, halfW * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = brassAccent;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Central core beacon
    const titanPulse = (Math.sin(timeMs * 0.006) + 1) * 0.5;
    ctx.fillStyle = titanPulse > 0.4 ? emeraldCore : emeraldGlow;
    ctx.beginPath();
    ctx.arc(length * 0.46, 0, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crippled smoke/fire effect
  if (isCrippled) {
    const smokeFlicker = Math.sin(timeMs * 0.035) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + smokeFlicker * 0.4})`;
    ctx.beginPath();
    ctx.arc(-10 * scale, 4 * scale, 5.0 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * ============================================================================
 * KOVAK ENCLAVE ANGULAR RHOMBOID WARSHIP RENDERER
 * ============================================================================
 * Volume over Quality & Industrial Swarm Architecture:
 * - Aggressive diamond / angular rhomboid silhouette with sharp faceted plating
 * - Steely dark gunmetal & crimson armor panels (#1c1917, #7f1d1d, #dc2626, #ef4444)
 * - Central spine crease with recessed kinetic / missile troughs
 * - Symmetrical lateral rhomboid outrigger sponsons
 * - Multi-port aft angular drive thrusters with hot crimson / orange engine flares
 * - Red tactical running lights and glowing weapon hardpoint blisters
 */
export function drawKovakShip(
  ctx: CanvasRenderingContext2D,
  ship: ShipEntity,
  r: number,
  timeMs: number,
  isHostile: boolean
): void {
  ctx.save();

  const isCrippled = ship.hullState === 'CRIPPLED';
  const role = (ship.role || '').toUpperCase();
  const isCapital = role.includes('BATTLE') || role.includes('DREAD') || role.includes('CARRIER');
  const isCruiser = role.includes('CRUISER');
  const isFrigate = role === 'FRIGATE' || role === 'MINER';

  const scale = isCapital
    ? Math.max(1.6, r / 14.0)
    : isCruiser
    ? Math.max(1.1, r / 14.0)
    : Math.max(0.65, r / 14.0);

  const length = isCapital ? 72 * scale : isCruiser ? 44 * scale : 26 * scale;
  const halfW = isCapital ? 30 * scale : isCruiser ? 18 * scale : 11 * scale;

  // Kovak Industrial Crimson & Gunmetal Palette
  const armorBase = isHostile ? '#2d0606' : '#450a0a';
  const armorPlate = isHostile ? '#450a0a' : '#7f1d1d';
  const armorHighlight = isHostile ? '#7f1d1d' : '#991b1b';
  const steelTrim = isHostile ? '#57534e' : '#78716c';
  const redGlow = isHostile ? '#ef4444' : '#f87171';
  const hotCore = isHostile ? '#fca5a5' : '#fee2e2';
  const amberAccent = '#f59e0b';

  const isMoving = (ship.maxSpeed || 0) > 0 &&
    ((ship.velocity && (ship.velocity.x !== 0 || ship.velocity.y !== 0)) || ship.splineActive);

  // 1. Aft Thruster Exhausts (Faceted Rhomboid Nozzle Housings)
  const thrusterCount = isCapital ? 4 : 2;
  const thrusterY = thrusterCount === 4
    ? [-halfW * 0.55, -halfW * 0.20, halfW * 0.20, halfW * 0.55]
    : [-halfW * 0.35, halfW * 0.35];

  for (const ty of thrusterY) {
    renderThrusterPlume(
      ctx,
      -length * 0.48,
      ty,
      (isCapital ? 4.5 : 3.2) * scale,
      (isCapital ? 24 : 15) * scale,
      isMoving,
      '#ef4444',
      timeMs
    );
  }

  // 2. Primary Angular Rhomboid Hull (Diamond Silhouette with Chamfered Prow & Sponsons)
  ctx.fillStyle = armorBase;
  ctx.strokeStyle = steelTrim;
  ctx.lineWidth = 1.5 * Math.min(scale, 2.2);
  ctx.beginPath();
  ctx.moveTo(length * 0.52, 0);                 // Forward sharp diamond nose
  ctx.lineTo(length * 0.22, -halfW * 0.45);      // Forward-port diamond chamfer
  ctx.lineTo(0, -halfW);                         // Port widest rhomboid apex
  ctx.lineTo(-length * 0.35, -halfW * 0.75);     // Aft-port taper
  ctx.lineTo(-length * 0.48, -halfW * 0.35);     // Port engine block
  ctx.lineTo(-length * 0.42, 0);                 // Center stern notch
  ctx.lineTo(-length * 0.48, halfW * 0.35);      // Stbd engine block
  ctx.lineTo(-length * 0.35, halfW * 0.75);      // Aft-stbd taper
  ctx.lineTo(0, halfW);                          // Stbd widest rhomboid apex
  ctx.lineTo(length * 0.22, halfW * 0.45);       // Forward-stbd diamond chamfer
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Faceted Raised Rhomboid Armor Slabs (Layered Symmetrical Sponsons)
  ctx.fillStyle = armorPlate;
  ctx.strokeStyle = armorHighlight;
  ctx.lineWidth = 1.2 * Math.min(scale, 2.0);

  // Port Rhomboid Armor Slab
  ctx.beginPath();
  ctx.moveTo(length * 0.18, -halfW * 0.35);
  ctx.lineTo(0, -halfW * 0.85);
  ctx.lineTo(-length * 0.26, -halfW * 0.62);
  ctx.lineTo(-length * 0.10, -halfW * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Starboard Rhomboid Armor Slab
  ctx.beginPath();
  ctx.moveTo(length * 0.18, halfW * 0.35);
  ctx.lineTo(0, halfW * 0.85);
  ctx.lineTo(-length * 0.26, halfW * 0.62);
  ctx.lineTo(-length * 0.10, halfW * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Central Spine & Longitudinal Recessed Weapons Trench
  ctx.fillStyle = '#0c0a09';
  ctx.fillRect(-length * 0.30, -1.8 * scale, length * 0.62, 3.6 * scale);
  ctx.strokeStyle = steelTrim;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-length * 0.30, -1.8 * scale, length * 0.62, 3.6 * scale);

  // Diamond centerline seam highlight
  ctx.strokeStyle = armorHighlight;
  ctx.lineWidth = 1.0 * Math.min(scale, 1.8);
  ctx.beginPath();
  ctx.moveTo(length * 0.48, 0);
  ctx.lineTo(-length * 0.38, 0);
  ctx.stroke();

  // 5. Kovak Mass-Production Chevron Markings & Weapon Hardpoints
  ctx.fillStyle = redGlow;
  // Forward prow chevron
  ctx.beginPath();
  ctx.moveTo(length * 0.35, -2.5 * scale);
  ctx.lineTo(length * 0.44, 0);
  ctx.lineTo(length * 0.35, 2.5 * scale);
  ctx.lineTo(length * 0.30, 2.5 * scale);
  ctx.lineTo(length * 0.38, 0);
  ctx.lineTo(length * 0.30, -2.5 * scale);
  ctx.closePath();
  ctx.fill();

  // Lateral hardpoint turrets / blisters
  const hardpoints = [
    { x: length * 0.12, y: -halfW * 0.4 },
    { x: -length * 0.12, y: -halfW * 0.45 },
    { x: length * 0.12, y: halfW * 0.4 },
    { x: -length * 0.12, y: halfW * 0.45 },
  ];

  hardpoints.forEach((hp) => {
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 1.8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = redGlow;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Hot firing emitter / sensor diode
    ctx.fillStyle = redGlow;
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 0.8 * scale, 0, Math.PI * 2);
    ctx.fill();
  });

  // 6. Tactical Red Running / Strobe Lights
  const blink = (Math.sin(timeMs * 0.009) + 1) * 0.5;
  ctx.fillStyle = blink > 0.4 ? hotCore : redGlow;

  // Wingtip strobe nodes (at the rhomboid apexes)
  ctx.beginPath();
  ctx.arc(0, -halfW + 1 * scale, 1.4 * Math.min(scale, 2.0), 0, Math.PI * 2);
  ctx.arc(0, halfW - 1 * scale, 1.4 * Math.min(scale, 2.0), 0, Math.PI * 2);
  ctx.fill();

  // Crippled smoke/fire effect
  if (isCrippled) {
    const smokeFlicker = Math.sin(timeMs * 0.035) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(239, 68, 68, ${0.4 + smokeFlicker * 0.4})`;
    ctx.beginPath();
    ctx.arc(-8 * scale, 3 * scale, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}


