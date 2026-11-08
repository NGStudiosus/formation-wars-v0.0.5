/**
 * Procedural Hard-Surface Vector Graphics for Orbital Stations, Research Labs, and Shipyard Slipways
 *
 * Implements pure 2D canvas vector path operations:
 * - Military Research Station (MRS): 52px diameter faceted triangular bastion citadel with rotating radar gantry
 * - Civic Research Outpost (CRO): 48px diameter hexagonal biosphere habitat array with glowing biodomes
 * - Expansion Citadel (EXC): 56px diameter cruciform deep-space telemetry relay with twin massive dishes
 * - Light Shipyard (SY_LIGHT): 44px x 32px twin parallel angular scaffold gantries with hazard stripes & welding sparks
 * - Medium Shipyard (SY_MEDIUM): 70px x 48px triple-keel U-cradle frame with fabrication cranes, cargo bays & amber floodlights
 * - Heavy Shipyard (SY_HEAVY): 110px x 74px colossal full-box drydock citadel with interior void shadow & nanite assembly arms
 *
 * Zero texture allocations or raster blits for high-performance 30Hz/60Hz canvas execution.
 */

// Helper to draw a crisp hazard stripe pattern on a quadrilateral/box
function drawHazardStripes(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stripeWidth: number = 4,
  angleRad: number = Math.PI / 4
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Background
  ctx.fillStyle = '#111827';
  ctx.fillRect(x, y, w, h);

  // Diagonal yellow hazard stripes
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = stripeWidth;

  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const step = stripeWidth * 2.2;
  const diag = Math.hypot(w, h) * 1.5;

  for (let offset = -diag; offset < diag; offset += step) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y - 5);
    ctx.lineTo(x + offset + h * cosA, y + h + 5);
    ctx.stroke();
  }

  // Border outline
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/**
 * 1. MILITARY RESEARCH STATION (MRS)
 * Silhouette: Aggressive, faceted triangular bastion citadel.
 * Footprint: 52px diameter (R = 26px).
 * Features:
 *  - Central reinforced telemetry tower.
 *  - Three outward-pointing sensor pylons with dark-slate armor plating (#1e232a).
 *  - Red warning running lights (#ff3344).
 *  - Continuously rotating phased-array radar gantry.
 */
export function renderMilitaryResearchStation(
  ctx: CanvasRenderingContext2D,
  r: number = 26,
  timeMs: number = 0
): void {
  ctx.save();
  const baseR = 26; // 52px diameter
  const s = Math.max(0.05, r / baseR);
  ctx.scale(s, s);

  // Three primary pylon apex angles: 0 (forward), 120 deg (lower-left), 240 deg (upper-left)
  const pylonAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

  // 1. Heavy Outer Armor Bastion (Aggressive Faceted Triangle)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.0;
  ctx.beginPath();

  pylonAngles.forEach((ang, idx) => {
    // Pylon tip
    const tipX = Math.cos(ang) * baseR;
    const tipY = Math.sin(ang) * baseR;

    // Pylon shoulder left & right
    const leftAng = ang - 0.28;
    const rightAng = ang + 0.28;
    const shL_X = Math.cos(leftAng) * (baseR * 0.72);
    const shL_Y = Math.sin(leftAng) * (baseR * 0.72);
    const shR_X = Math.cos(rightAng) * (baseR * 0.72);
    const shR_Y = Math.sin(rightAng) * (baseR * 0.72);

    // Recessed bastion curtain wall between pylons
    const midAng = ang + Math.PI / 3;
    const curtainX = Math.cos(midAng) * (baseR * 0.44);
    const curtainY = Math.sin(midAng) * (baseR * 0.44);

    if (idx === 0) {
      ctx.moveTo(shL_X, shL_Y);
    } else {
      ctx.lineTo(shL_X, shL_Y);
    }
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(shR_X, shR_Y);
    ctx.lineTo(curtainX, curtainY);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Faceted Dark-Slate Armor Plating Overlays (#1e232a)
  pylonAngles.forEach((ang) => {
    ctx.save();
    ctx.rotate(ang);

    // Lateral armor slab
    ctx.fillStyle = '#1e232a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.lineTo(19, -6);
    ctx.lineTo(24, 0);
    ctx.lineTo(19, 6);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Longitudinal reinforced seam line
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();

    // Tactical warning chevrons / stripes
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(15, -1.2, 4, 2.4);

    ctx.restore();
  });

  // 3. Central Reinforced Telemetry Tower Base
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const hexAng = (i * Math.PI) / 3;
    const hx = Math.cos(hexAng) * 9.5;
    const hy = Math.sin(hexAng) * 9.5;
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner telemetry citadel core
  ctx.fillStyle = '#1e232a';
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // 4. Rotating Phased-Array Radar Gantry
  const radarAngle = (timeMs * 0.0022) % (Math.PI * 2);
  ctx.save();
  ctx.rotate(radarAngle);

  // Radar gantry boom
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(13, 0);
  ctx.stroke();

  // Counterweight boom
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-5, 0);
  ctx.stroke();
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-7, -2.5, 3, 5);

  // Planar phased-array antenna head
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(13, -7, 3.5, 14);
  ctx.fill();
  ctx.stroke();

  // Antenna sensor grid emitters
  ctx.fillStyle = '#fef2f2';
  for (let yOff = -5; yOff <= 5; yOff += 2.5) {
    ctx.fillRect(15, yOff - 0.5, 1.2, 1.2);
  }

  // Sweeping radar telemetry arc
  ctx.strokeStyle = 'rgba(255, 51, 68, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 18, -0.35, 0.35);
  ctx.stroke();

  ctx.restore();

  // 5. Red Warning Running Lights (#ff3344) at Pylon Tips & Citadel Core
  const pulse = Math.sin(timeMs * 0.008) * 0.5 + 0.5;
  ctx.fillStyle = '#ff3344';
  ctx.shadowColor = '#ff3344';
  ctx.shadowBlur = 6 + pulse * 6;

  pylonAngles.forEach((ang) => {
    const lx = Math.cos(ang) * (baseR - 1.5);
    const ly = Math.sin(ang) * (baseR - 1.5);
    ctx.beginPath();
    ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  // Center beacon
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * 2. CIVIC RESEARCH OUTPOST (CRO)
 * Silhouette: Symmetrical hexagonal biosphere habitat array.
 * Footprint: 48px diameter (R = 24px).
 * Features:
 *  - Central logistical hub.
 *  - Four pressurized laboratory domes with glowing cyan biosphere atmospheres.
 *  - Exposed structural truss walkways (#2d333b).
 *  - Industrial cyan accent lights (#00e5ff).
 *  - Solar/radiator array fins.
 */
export function renderCivicResearchOutpost(
  ctx: CanvasRenderingContext2D,
  r: number = 24,
  timeMs: number = 0
): void {
  ctx.save();
  const baseR = 24; // 48px diameter
  const s = Math.max(0.05, r / baseR);
  ctx.scale(s, s);

  // 1. Symmetrical Hexagonal Outer Perimeter Spine (#2d333b)
  ctx.strokeStyle = '#2d333b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3;
    const hx = Math.cos(ang) * (baseR - 2.5);
    const hy = Math.sin(ang) * (baseR - 2.5);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();

  // 2. Solar / Radiator Array Fins (Extending along top and bottom / vertical axis)
  const finWidth = 14;
  const finHeight = 7.5;
  for (const dir of [-1, 1]) {
    const finY = dir * (baseR - 3);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.rect(-finWidth / 2, dir > 0 ? finY : finY - finHeight, finWidth, finHeight);
    ctx.fill();
    ctx.stroke();

    // Photovoltaic / Radiator Cells
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 0.8;
    const topY = dir > 0 ? finY : finY - finHeight;
    for (let gx = -finWidth / 2 + 2.5; gx < finWidth / 2; gx += 3) {
      ctx.beginPath();
      ctx.moveTo(gx, topY);
      ctx.lineTo(gx, topY + finHeight);
      ctx.stroke();
    }
  }

  // 3. Exposed Structural Truss Walkways (#2d333b) Connecting Center to Labs
  const domeAngles = [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75];
  const domeDist = 14.5;

  ctx.strokeStyle = '#2d333b';
  ctx.lineWidth = 3.2;
  domeAngles.forEach((ang) => {
    const dx = Math.cos(ang) * domeDist;
    const dy = Math.sin(ang) * domeDist;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dx, dy);
    ctx.stroke();
  });

  // Cross-truss internal struts
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  domeAngles.forEach((ang, idx) => {
    const nextAng = domeAngles[(idx + 1) % domeAngles.length];
    const x1 = Math.cos(ang) * domeDist;
    const y1 = Math.sin(ang) * domeDist;
    const x2 = Math.cos(nextAng) * domeDist;
    const y2 = Math.sin(nextAng) * domeDist;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // 4. Central Logistical Command Hub
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Central docking seal airlock
  ctx.fillStyle = '#0e7490';
  ctx.beginPath();
  ctx.arc(0, 0, 4.0, 0, Math.PI * 2);
  ctx.fill();

  // 5. Four Pressurized Laboratory Domes (Atmospheric Cyan Biospheres)
  const domeRadius = 5.2;
  const pulse = Math.sin(timeMs * 0.005) * 0.15 + 0.85;

  domeAngles.forEach((ang) => {
    const dx = Math.cos(ang) * domeDist;
    const dy = Math.sin(ang) * domeDist;

    // Biosphere dome base ring
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#0891b2';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(dx, dy, domeRadius + 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing pressurized translucent dome
    ctx.fillStyle = `rgba(0, 229, 255, ${0.25 * pulse})`;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(dx, dy, domeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Geodesic lattice lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(dx, dy, domeRadius * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  });

  // 6. Industrial Cyan Accent Lights (#00e5ff) Along Trusses
  const ledPulse = Math.sin(timeMs * 0.009) * 0.5 + 0.5;
  ctx.fillStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 5 + ledPulse * 5;

  domeAngles.forEach((ang) => {
    // Outer dome beacon
    const ox = Math.cos(ang) * (domeDist + domeRadius + 0.8);
    const oy = Math.sin(ang) * (domeDist + domeRadius + 0.8);
    ctx.beginPath();
    ctx.arc(ox, oy, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Mid-truss running light
    const mx = Math.cos(ang) * 9.5;
    const my = Math.sin(ang) * 9.5;
    ctx.beginPath();
    ctx.arc(mx, my, 1.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Central hub beacon
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * 3. EXPANSION CITADEL (EXC)
 * Silhouette: Cruciform deep-space telemetry relay.
 * Footprint: 56px diameter (R = 28px).
 * Features:
 *  - Elongated central pylon.
 *  - Twin massive communications dishes flanked along transverse axis.
 *  - Green status arrays (#00ff88).
 *  - Heavy gravitational mooring anchor struts.
 */
export function renderExpansionCitadel(
  ctx: CanvasRenderingContext2D,
  r: number = 28,
  timeMs: number = 0
): void {
  ctx.save();
  const baseR = 28; // 56px diameter
  const s = Math.max(0.05, r / baseR);
  ctx.scale(s, s);

  // 1. Heavy Gravitational Mooring Anchor Struts (4 Outriggers at diagonals)
  const anchorAngles = [-0.68, 0.68, Math.PI - 0.68, Math.PI + 0.68];
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3.0;

  anchorAngles.forEach((ang) => {
    const ax = Math.cos(ang) * (baseR - 2);
    const ay = Math.sin(ang) * (baseR - 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    // Heavy Magnetic Mooring Clamp Footpad
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(ang);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.rect(-3, -4, 6, 8);
    ctx.fill();
    ctx.stroke();

    // Hydraulic piston detail
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-1.5, -2, 3, 4);
    ctx.restore();
  });

  // 2. Elongated Central Pylon Spine (Cruciform Longitudinal Axis: -27 to +27)
  const spineL = 27;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 1.6;

  // Main pylon hull
  ctx.beginPath();
  ctx.moveTo(-spineL + 3, -4.5);
  ctx.lineTo(spineL - 7, -4.5);
  ctx.lineTo(spineL, 0); // Forward needle apex
  ctx.lineTo(spineL - 7, 4.5);
  ctx.lineTo(-spineL + 3, 4.5);
  ctx.lineTo(-spineL, 2);
  ctx.lineTo(-spineL, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Armored longitudinal centerline & panel seams
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-16, -3, 24, 6);

  // Deep-space transceiver mast & antenna spike
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(spineL, 0);
  ctx.lineTo(spineL + 4.5, 0);
  ctx.stroke();

  // 3. Transverse Dish Outriggers (Cruciform Lateral Axis: -20 to +20)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.0;
  ctx.fillRect(-3.5, -19, 7, 38);
  ctx.strokeRect(-3.5, -19, 7, 38);

  // 4. Twin Massive Communications Dishes (Flanked at y = -19 and y = +19)
  for (const dir of [-1, 1]) {
    const dishY = dir * 19;

    ctx.save();
    ctx.translate(0, dishY);
    ctx.scale(1, dir); // Flip upper and lower dishes

    // Parabolic Dish Shell
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 5, 9, Math.PI * 1.08, Math.PI * 1.92, false);
    ctx.stroke();

    // Dish interior reflector bowl fill
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 5, 8.5, Math.PI * 1.1, Math.PI * 1.9, false);
    ctx.lineTo(0, -3.5);
    ctx.closePath();
    ctx.fill();

    // Feed Horn Subreflector Struts
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-6, -1);
    ctx.lineTo(0, -6.5);
    ctx.lineTo(6, -1);
    ctx.stroke();

    // Subreflector Emitter Head
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(0, -6.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // High-gain radiated pulse waves from dishes
    const waveR = 8 + ((timeMs * 0.012) % 6);
    ctx.strokeStyle = `rgba(0, 255, 136, ${0.4 - ((waveR - 8) / 6) * 0.35})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(0, -6.5, waveR, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();

    ctx.restore();
  }

  // 5. Green Status Arrays (#00ff88) Along Pylon Spine & Anchors
  const pulse = Math.sin(timeMs * 0.007) * 0.5 + 0.5;
  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = 6 + pulse * 6;

  // Longitudinal LED status strip
  for (let xPos = -12; xPos <= 14; xPos += 6) {
    ctx.fillRect(xPos, -1.2, 2.5, 2.4);
  }

  // Transceiver apex beacon
  ctx.beginPath();
  ctx.arc(spineL + 4.5, 0, 2.0, 0, Math.PI * 2);
  ctx.fill();

  // Central sovereign relay core
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * 4. LIGHT SHIPYARD (SY_LIGHT)
 * Design: Twin parallel angular scaffold gantries forming an open docking slip.
 * Dimensions: 44px x 32px (width 44, height 32, centered at 0, 0).
 * Detailing: Overhead yellow hazard stripes, micro-welding spark effects at slipway edge.
 */
export function renderLightShipyard(
  ctx: CanvasRenderingContext2D,
  r: number = 38,
  timeMs: number = 0
): void {
  ctx.save();
  const baseDesignR = 22; // 44px width
  const s = Math.max(0.05, r / baseDesignR);
  ctx.scale(s, s);
  const halfW = 22; // 44px width
  const halfH = 16; // 32px height
  const slipwayHalfH = 7.5; // Central open docking slip

  // 1. Aft Structural Spine / Keel (-22 to -14)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.rect(-halfW, -halfH, 8, halfH * 2);
  ctx.fill();
  ctx.stroke();

  // Aft Power Reactor Core
  ctx.fillStyle = '#0369a1';
  ctx.beginPath();
  ctx.arc(-halfW + 4, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 2. Twin Parallel Angular Scaffold Gantries (Upper & Lower)
  for (const dir of [-1, 1]) {
    const top = dir < 0 ? -halfH : slipwayHalfH;
    const gantryH = halfH - slipwayHalfH; // 8.5px height

    // Main scaffold arm body
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-halfW + 8, top);
    ctx.lineTo(halfW - 5, top);
    ctx.lineTo(halfW, top + (dir < 0 ? 3.5 : gantryH - 3.5));
    ctx.lineTo(halfW - 5, top + gantryH);
    ctx.lineTo(-halfW + 8, top + gantryH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Truss structural bracing
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.0;
    for (let x = -halfW + 11; x < halfW - 6; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + 3, top + gantryH);
      ctx.stroke();
    }
  }

  // 3. Overhead Yellow Hazard Stripes Along Scaffold Backing
  drawHazardStripes(ctx, -halfW + 8, -halfH, 18, 3.5, 2.5);
  drawHazardStripes(ctx, -halfW + 8, halfH - 3.5, 18, 3.5, 2.5);

  // 4. Central Open Docking Slipway Laser Alignment Rails
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(-halfW + 8, -slipwayHalfH);
  ctx.lineTo(halfW, -slipwayHalfH);
  ctx.moveTo(-halfW + 8, slipwayHalfH);
  ctx.lineTo(halfW, slipwayHalfH);
  ctx.stroke();
  ctx.setLineDash([]);

  // Docking approach center guide
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-halfW + 8, 0);
  ctx.lineTo(halfW + 6, 0);
  ctx.stroke();

  // 5. Micro-Welding Spark Effects at Slipway Edge
  // Procedural sparks scattering from fabrication points along inner lip
  const sparkPhase = (timeMs * 0.02) % 1;
  const sparkActive = Math.sin(timeMs * 0.015) > -0.2;

  if (sparkActive) {
    const sparkPoints = [
      { x: -halfW + 13 + (Math.sin(timeMs * 0.003) * 6), y: -slipwayHalfH, dir: 1 },
      { x: halfW - 8 - (Math.cos(timeMs * 0.004) * 5), y: slipwayHalfH, dir: -1 },
    ];

    ctx.save();
    sparkPoints.forEach((pt, pIdx) => {
      // Welding intense blue-white arc flash
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fillRect(pt.x - 1, pt.y - 1, 2.5, 2.5);

      // Flying sparks
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 4;
      for (let s = 0; s < 4; s++) {
        const angle = (pIdx * 1.5) + (s * 1.2) + sparkPhase * 3;
        const dist = 3 + s * 2.2 * sparkPhase;
        const sx = pt.x + Math.cos(angle) * dist * 0.8;
        const sy = pt.y + pt.dir * Math.abs(Math.sin(angle)) * dist;
        ctx.fillRect(sx, sy, 1.2, 1.2);
      }
    });
    ctx.restore();
  }

  // 6. Cyan Status Beacons at Gantry Tips
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(halfW - 2, -halfH + 4, 1.5, 0, Math.PI * 2);
  ctx.arc(halfW - 2, halfH - 4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 5. MEDIUM SHIPYARD (SY_MEDIUM)
 * Design: Triple-keel enclosed U-cradle frame with heavy industrial fabrication cranes.
 * Dimensions: 70px x 48px (width 70, height 48, centered at 0, 0).
 * Detailing: Reinforced external bracing ribs, cargo container staging bays, and amber floodlights.
 */
export function renderMediumShipyard(
  ctx: CanvasRenderingContext2D,
  r: number = 46,
  timeMs: number = 0
): void {
  ctx.save();
  const baseDesignR = 35; // 70px width
  const s = Math.max(0.05, r / baseDesignR);
  ctx.scale(s, s);
  const halfW = 35; // 70px width
  const halfH = 24; // 48px height
  const cradleGap = 13.5; // Inner cradle berth half-height

  // 1. Heavy Aft Keel Block & Engineering Section (-35 to -23)
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.rect(-halfW, -halfH + 3, 12, (halfH - 3) * 2);
  ctx.fill();
  ctx.stroke();

  // Central Triple-Keel Spine Runner (Extending down the middle: -23 to +20)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-halfW + 12, -3.2, 38, 6.4);
  ctx.fill();
  ctx.stroke();

  // 2. Reinforced External Bracing Ribs (4 Angled Buttress Outriggers)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;

  const ribXPositions = [-halfW + 16, -halfW + 30, -halfW + 44, halfW - 10];
  ribXPositions.forEach((rx) => {
    for (const dir of [-1, 1]) {
      const baseY = dir * (cradleGap + 3);
      const outerY = dir * halfH;

      ctx.beginPath();
      ctx.moveTo(rx - 3, baseY);
      ctx.lineTo(rx - 5, outerY);
      ctx.lineTo(rx + 5, outerY);
      ctx.lineTo(rx + 3, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hydraulic damper pin
      ctx.fillStyle = '#475569';
      ctx.fillRect(rx - 1.5, (baseY + outerY) * 0.5 - 1.5, 3, 3);
    }
  });

  // 3. Enclosed U-Cradle Gantry Arms (Upper & Lower Hull Bays)
  for (const dir of [-1, 1]) {
    const top = dir < 0 ? -halfH + 3 : cradleGap;
    const armH = halfH - 3 - cradleGap; // ~7.5px

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(-halfW + 12, top);
    ctx.lineTo(halfW - 8, top);
    ctx.lineTo(halfW, top + (dir < 0 ? 4 : armH - 4));
    ctx.lineTo(halfW - 8, top + armH);
    ctx.lineTo(-halfW + 12, top + armH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crane rail slider track
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.0;
    const railY = dir < 0 ? top + armH - 1.2 : top + 1.2;
    ctx.beginPath();
    ctx.moveTo(-halfW + 14, railY);
    ctx.lineTo(halfW - 6, railY);
    ctx.stroke();
  }

  // 4. Cargo Container Staging Bays (Racked Modular Pallets along Aft & Upper Outer Keel)
  const containers = [
    { x: -halfW + 2, y: -halfH + 6, w: 4, h: 6, color: '#d97706' }, // Metallic alloys
    { x: -halfW + 2, y: -halfH + 14, w: 4, h: 6, color: '#0284c7' }, // Electronics
    { x: -halfW + 2, y: halfH - 12, w: 4, h: 6, color: '#475569' }, // Armor slabs
    { x: -halfW + 2, y: halfH - 20, w: 4, h: 6, color: '#10b981' }, // Biosphere stock
    { x: -halfW + 18, y: -halfH + 0.5, w: 7, h: 3, color: '#d97706' },
    { x: -halfW + 32, y: -halfH + 0.5, w: 7, h: 3, color: '#0284c7' },
    { x: -halfW + 18, y: halfH - 3.5, w: 7, h: 3, color: '#d97706' },
    { x: -halfW + 32, y: halfH - 3.5, w: 7, h: 3, color: '#475569' },
  ];

  containers.forEach((c) => {
    ctx.fillStyle = c.color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 0.8;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  });

  // 5. Heavy Industrial Fabrication Cranes (Sliding Gantry Jibs)
  const craneX1 = -halfW + 22 + Math.sin(timeMs * 0.0018) * 8;
  const craneX2 = halfW - 14 - Math.cos(timeMs * 0.0015) * 6;

  // Upper Crane
  ctx.save();
  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.0;
  ctx.fillRect(craneX1 - 2.5, -cradleGap - 3, 5, 4);
  // Crane Jib Arm reaching into cradle
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(craneX1, -cradleGap);
  ctx.lineTo(craneX1 - 3, -cradleGap + 5);
  ctx.stroke();
  ctx.restore();

  // Lower Crane
  ctx.save();
  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.0;
  ctx.fillRect(craneX2 - 2.5, cradleGap - 1, 5, 4);
  // Crane Jib Arm reaching into cradle
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(craneX2, cradleGap);
  ctx.lineTo(craneX2 + 3, cradleGap - 5);
  ctx.stroke();
  ctx.restore();

  // 6. Amber Floodlights (Warm illumination fans casting into berth)
  const floodPulse = Math.sin(timeMs * 0.006) * 0.1 + 0.9;
  ctx.save();
  ctx.fillStyle = `rgba(245, 158, 11, ${0.18 * floodPulse})`;
  for (const dir of [-1, 1]) {
    const fy = dir * (cradleGap + 1);
    ctx.beginPath();
    ctx.moveTo(-halfW + 20, fy);
    ctx.lineTo(halfW - 5, 0);
    ctx.lineTo(-halfW + 20, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 7. Amber Running Floodlight Emitters
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(halfW - 4, -halfH + 6, 1.8, 0, Math.PI * 2);
  ctx.arc(halfW - 4, halfH - 6, 1.8, 0, Math.PI * 2);
  ctx.arc(-halfW + 5, 0, 2.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * 6. HEAVY SHIPYARD (SY_HEAVY)
 * Design: Colossal full-box drydock citadel with quad longitudinal support gantries capable of enclosing a Dreadnought or Carrier.
 * Dimensions: 110px x 74px (width 110, height 74, centered at 0, 0).
 * Detailing: Deep interior void shadow, automated modular nanite fabrication arms, and pulsing docking guide lanes.
 */
export function renderHeavyShipyard(
  ctx: CanvasRenderingContext2D,
  r: number = 56,
  timeMs: number = 0
): void {
  ctx.save();
  const baseDesignR = 55; // 110px width
  const s = Math.max(0.05, r / baseDesignR);
  ctx.scale(s, s);
  const halfW = 55; // 110px width
  const halfH = 37; // 74px height
  const voidHalfH = 20; // Cavernous central fabrication void half-height

  // 1. Deep Interior Void Shadow (Cavernous interior enclosing space)
  ctx.fillStyle = '#030712';
  ctx.fillRect(-halfW + 20, -voidHalfH, halfW * 2 - 20, voidHalfH * 2);

  // Interior construction bay structural floor ribs & keel locks
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.0;
  for (let vx = -halfW + 24; vx < halfW - 4; vx += 8) {
    ctx.beginPath();
    ctx.moveTo(vx, -voidHalfH + 2);
    ctx.lineTo(vx, voidHalfH - 2);
    ctx.stroke();
  }

  // 2. Heavy Aft Fortress Citadel & Command Bridge (-55 to -35)
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 2.4;

  ctx.beginPath();
  ctx.moveTo(-halfW, -halfH + 4);
  ctx.lineTo(-halfW + 20, -halfH + 4);
  ctx.lineTo(-halfW + 20, halfH - 4);
  ctx.lineTo(-halfW, halfH - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Command bridge observation gallery
  ctx.fillStyle = '#1e1b4b';
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-halfW + 4, -9, 10, 18);
  ctx.fillStyle = '#c084fc';
  for (let by = -6; by <= 6; by += 4) {
    ctx.fillRect(-halfW + 11, by, 2, 2.5);
  }

  // 3. Quad Longitudinal Support Gantries (Upper-Outer, Upper-Inner, Lower-Inner, Lower-Outer)
  for (const dir of [-1, 1]) {
    const outerY = dir < 0 ? -halfH : voidHalfH;
    const gantryH = halfH - voidHalfH; // 17px height

    // Longitudinal girder shell
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.0;

    ctx.beginPath();
    ctx.moveTo(-halfW + 20, outerY);
    ctx.lineTo(halfW - 14, outerY);
    ctx.lineTo(halfW, outerY + (dir < 0 ? 6 : gantryH - 6));
    ctx.lineTo(halfW - 14, outerY + gantryH);
    ctx.lineTo(-halfW + 20, outerY + gantryH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Quad longitudinal structural rail lines
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 1.2;
    const midY = outerY + gantryH * 0.5;
    ctx.beginPath();
    ctx.moveTo(-halfW + 22, midY);
    ctx.lineTo(halfW - 10, midY);
    ctx.stroke();

    // Heavy truss diamond cross-bracing
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
    ctx.lineWidth = 1.0;
    for (let tx = -halfW + 24; tx < halfW - 16; tx += 10) {
      ctx.beginPath();
      ctx.moveTo(tx, outerY);
      ctx.lineTo(tx + 5, outerY + gantryH);
      ctx.lineTo(tx + 10, outerY);
      ctx.stroke();
    }
  }

  // 4. Forward Retaining Docking Pylons (+42 to +55)
  for (const dir of [-1, 1]) {
    const pyTop = dir < 0 ? -halfH + 1 : voidHalfH + 2;
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.6;
    ctx.fillRect(halfW - 14, pyTop, 12, 12);
    ctx.strokeRect(halfW - 14, pyTop, 12, 12);
  }

  // 5. Automated Modular Nanite Fabrication Arms (4 Multi-Joint Robotic Assembly Limbs)
  const armPositions = [
    { x: -halfW + 36, dir: -1 },
    { x: halfW - 24, dir: -1 },
    { x: -halfW + 36, dir: 1 },
    { x: halfW - 24, dir: 1 },
  ];

  armPositions.forEach((arm, idx) => {
    ctx.save();
    const baseY = arm.dir * voidHalfH;
    const swing = Math.sin(timeMs * 0.002 + idx * 1.5) * 4;
    const elbowX = arm.x + swing;
    const elbowY = baseY + arm.dir * 7;
    const tipX = arm.x + swing * 1.6;
    const tipY = baseY + arm.dir * 13;

    // Heavy shoulder joint
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(arm.x, baseY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Segment 1 (Base to elbow)
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(arm.x, baseY);
    ctx.lineTo(elbowX, elbowY);
    ctx.stroke();

    // Elbow pivot
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(elbowX, elbowY, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Segment 2 (Elbow to nanite emitter head)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(elbowX, elbowY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Glowing nanite projector nozzle
    ctx.fillStyle = '#e879f9';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Dynamic nanite fabrication energy arc line
    const arcPulse = Math.sin(timeMs * 0.01 + idx) > 0.2;
    if (arcPulse) {
      ctx.strokeStyle = 'rgba(232, 121, 249, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX + (Math.sin(timeMs * 0.02) * 8), 0);
      ctx.stroke();
    }

    ctx.restore();
  });

  // 6. Pulsing Docking Guide Lanes (Sequential runway-style LED chase markers)
  ctx.save();
  const chaseStep = Math.floor((timeMs * 0.006) % 8);
  const laneStartX = halfW - 2;
  const laneEndX = -halfW + 24;
  const laneSpan = laneStartX - laneEndX;

  for (let i = 0; i < 8; i++) {
    const lx = laneStartX - (i / 7) * laneSpan;
    const isLit = (i + chaseStep) % 8 === 0;

    ctx.fillStyle = isLit ? '#38bdf8' : 'rgba(56, 189, 248, 0.25)';
    ctx.shadowColor = isLit ? '#38bdf8' : 'transparent';
    ctx.shadowBlur = isLit ? 6 : 0;

    // Dual chevrons pointing inward toward the aft lock
    ctx.beginPath();
    ctx.moveTo(lx + 2, -2.5);
    ctx.lineTo(lx - 2, 0);
    ctx.lineTo(lx + 2, 2.5);
    ctx.stroke();
    ctx.fillRect(lx - 1, -1, 2, 2);
  }
  ctx.restore();

  // 7. Hazard Markings & Status Beacons
  drawHazardStripes(ctx, halfW - 14, -halfH + 1, 12, 3.5, 2.5);
  drawHazardStripes(ctx, halfW - 14, halfH - 4.5, 12, 3.5, 2.5);

  ctx.fillStyle = '#a855f7';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(halfW - 2, -halfH + 8, 2.2, 0, Math.PI * 2);
  ctx.arc(halfW - 2, halfH - 8, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.restore();
}

/**
 * Main dispatcher to render any procedural deployable structure.
 * Returns true if the structure was recognized and rendered, false otherwise.
 */
export function renderStructureByRoleOrType(
  ctx: CanvasRenderingContext2D,
  identifier: string,
  r: number = 26,
  timeMs: number = 0
): boolean {
  const norm = (identifier || '').toUpperCase();

  if (
    norm === 'MILITARY_RESEARCH' ||
    norm === 'MRS' ||
    norm.includes('MILITARY_RESEARCH') ||
    norm.includes('MRS')
  ) {
    renderMilitaryResearchStation(ctx, r, timeMs);
    return true;
  }

  if (
    norm === 'CIVIC_RESEARCH' ||
    norm === 'CRO' ||
    norm.includes('CIVIC_RESEARCH') ||
    norm.includes('CRO')
  ) {
    renderCivicResearchOutpost(ctx, r, timeMs);
    return true;
  }

  if (
    norm === 'EXPANSION_CITADEL' ||
    norm === 'EXC' ||
    norm.includes('EXPANSION_CITADEL') ||
    norm.includes('EXC')
  ) {
    renderExpansionCitadel(ctx, r, timeMs);
    return true;
  }

  if (
    norm === 'SY_LIGHT' ||
    norm === 'LIGHT_SHIPYARD' ||
    norm.includes('SY_LIGHT') ||
    norm.includes('LIGHT_SHIPYARD')
  ) {
    renderLightShipyard(ctx, r, timeMs);
    return true;
  }

  if (
    norm === 'SY_MEDIUM' ||
    norm === 'MEDIUM_SHIPYARD' ||
    norm.includes('SY_MEDIUM') ||
    norm.includes('MEDIUM_SHIPYARD')
  ) {
    renderMediumShipyard(ctx, r, timeMs);
    return true;
  }

  if (
    norm === 'SY_HEAVY' ||
    norm === 'CAPITAL_SHIPYARD' ||
    norm.includes('SY_HEAVY') ||
    norm.includes('CAPITAL_SHIPYARD')
  ) {
    renderHeavyShipyard(ctx, r, timeMs);
    return true;
  }

  if (
    norm === 'GARN_MISSILE_POD' ||
    norm === 'SDMP' ||
    norm.includes('GARN_MISSILE_POD') ||
    norm.includes('SDMP') ||
    norm.includes('MISSILE_POD')
  ) {
    renderGarnSystemMissilePod(ctx, r, timeMs);
    return true;
  }

  return false;
}

/**
 * GARN SYSTEM DEFENSE MISSILE POD (SDMP)
 * Heavy stationary deep-space defense bastion mounting 64 VLS tubes,
 * emerald/bronze armor, phased-array radar gantry, and tactical indicator arrays.
 */
export function renderGarnSystemMissilePod(
  ctx: CanvasRenderingContext2D,
  r: number = 34,
  timeMs: number = 0
): void {
  ctx.save();
  const s = Math.max(0.4, r / 34.0);

  // Faceted Octagonal Fortress Silhouette
  const baseR = 34 * s;
  const octAngles = 8;

  // 1. Heavy Emerald & Bronze Armor Hull
  ctx.beginPath();
  for (let i = 0; i < octAngles; i++) {
    const ang = (i * Math.PI * 2) / octAngles + Math.PI / 8;
    const px = Math.cos(ang) * baseR;
    const py = Math.sin(ang) * baseR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const hullGrad = ctx.createRadialGradient(0, 0, 4 * s, 0, 0, baseR);
  hullGrad.addColorStop(0, '#064e3b');
  hullGrad.addColorStop(0.65, '#022c22');
  hullGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = hullGrad;
  ctx.fill();

  ctx.strokeStyle = '#b45309'; // Bronze trim
  ctx.lineWidth = 2.4 * s;
  ctx.stroke();

  // 2. Corner Armor Bastions & Pylons
  for (let i = 0; i < octAngles; i++) {
    const ang = (i * Math.PI * 2) / octAngles + Math.PI / 8;
    const bx = Math.cos(ang) * baseR;
    const by = Math.sin(ang) * baseR;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang);

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.2 * s;
    ctx.fillRect(-3.5 * s, -3.5 * s, 7 * s, 7 * s);
    ctx.strokeRect(-3.5 * s, -3.5 * s, 7 * s, 7 * s);

    // Green beacon
    const blink = (timeMs + i * 150) % 500 < 250;
    ctx.fillStyle = blink ? '#4ade80' : '#166534';
    ctx.beginPath();
    ctx.arc(0, 0, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 3. 64-Tube Vertical Launch Array (8x8 VLS Grid)
  const gridSize = 8;
  const cellPitch = 3.6 * s;
  const gridOffset = ((gridSize - 1) * cellPitch) * 0.5;

  ctx.save();
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cx = col * cellPitch - gridOffset;
      const cy = row * cellPitch - gridOffset;

      // Silo tube
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)';
      ctx.lineWidth = 0.6 * s;
      ctx.fillRect(cx - 1.2 * s, cy - 1.2 * s, 2.4 * s, 2.4 * s);
      ctx.strokeRect(cx - 1.2 * s, cy - 1.2 * s, 2.4 * s, 2.4 * s);

      // Tube armed state light
      const tubeArmed = (row * 8 + col + Math.floor(timeMs * 0.003)) % 5 !== 0;
      ctx.fillStyle = tubeArmed ? '#22c55e' : '#f59e0b';
      ctx.fillRect(cx - 0.5 * s, cy - 0.5 * s, 1.0 * s, 1.0 * s);
    }
  }
  ctx.restore();

  // 4. Rotating Phased Array Radar Gantry
  const rotRadar = timeMs * 0.002;
  ctx.save();
  ctx.rotate(rotRadar);

  // Cross antenna spar
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(-baseR * 0.7, 0);
  ctx.lineTo(baseR * 0.7, 0);
  ctx.stroke();

  // Dual radar dishes
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.0 * s;

  ctx.beginPath();
  ctx.arc(baseR * 0.7, 0, 4.0 * s, Math.PI * 0.5, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-baseR * 0.7, 0, 4.0 * s, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 5. Central Telemetry Dome
  ctx.beginPath();
  ctx.arc(0, 0, 4.5 * s, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.2 * s;
  ctx.stroke();

  // Badge / Designation
  ctx.fillStyle = '#4ade80';
  ctx.font = `bold ${Math.max(7, Math.round(8 * s))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SDMP-64', 0, baseR + 10 * s);

  ctx.restore();
}

/**
 * GARN HEGEMONY PLANETARY RING CITADEL (HQ)
 * 
 * Renders the colossal artificial ring encircling the Garn Homeworld:
 * - Grand equatorial ring encircling the entire planet
 * - Orbital docking arms, heavy defensive bastions, and transit spires
 * - Shield grid visual arcs projecting outward along perimeter
 * - Dynamic shadow casting where planet's dark hemisphere eclipses the ring
 */
export function drawGarnPlanetaryRingHQ(
  ctx: CanvasRenderingContext2D,
  hq: any,
  planet: any,
  camera: any
): void {
  const planetPos = planet?.pos || hq?.pos;
  if (!planetPos) return;

  const vpW = camera.viewportWidth ?? (ctx.canvas ? ctx.canvas.width : 1920);
  const vpH = camera.viewportHeight ?? (ctx.canvas ? ctx.canvas.height : 1080);
  const zoom = camera.zoom ?? 1.0;

  // Screen coordinates of the host planet / HQ center
  const px = (planetPos.x - camera.x) * zoom + vpW / 2;
  const py = (planetPos.y - camera.y) * zoom + vpH / 2;

  const rawRadius = (planet?.radius ?? (hq?.ringOuterRadius ? hq.ringOuterRadius / 1.68 : (hq?.radius ? hq.radius / 1.68 : 700)));
  const planetScreenR = Math.max(4.0, rawRadius * zoom);

  // Ring geometry: orbits at 1.40x - 1.68x planet radius, with minimum visible thickness
  const ringInnerR = Math.max(8.0, planetScreenR * 1.40);
  const ringOuterR = Math.max(ringInnerR + Math.max(3.5, 6.0 * zoom), planetScreenR * 1.68);
  const ringMidR = (ringInnerR + ringOuterR) * 0.5;
  const ringWidth = ringOuterR - ringInnerR;

  // Viewport frustum cull
  if (
    px + ringOuterR * 2 < -50 ||
    px - ringOuterR * 2 > vpW + 50 ||
    py + ringOuterR * 2 < -50 ||
    py - ringOuterR * 2 > vpH + 50
  ) {
    return;
  }

  // Star lighting direction (star at 0,0 or planet.starCenter)
  const starX = planet?.starCenter?.x ?? 0;
  const starY = planet?.starCenter?.y ?? 0;
  const sunDirX = starX - planetPos.x;
  const sunDirY = starY - planetPos.y;
  const sunAngle = Math.atan2(sunDirY, sunDirX);
  const shadowAngle = sunAngle + Math.PI; // Opposite direction is in shadow

  ctx.save();
  ctx.translate(px, py);

  // Time-based animations
  const timeMs = Date.now();
  const ringRot = timeMs * 0.0001; // Ponderous planetary orbital rotation

  // 1. BASE EQUATORIAL RING TORUS
  ctx.beginPath();
  ctx.arc(0, 0, ringOuterR, 0, Math.PI * 2, false);
  ctx.arc(0, 0, ringInnerR, 0, Math.PI * 2, true);
  ctx.closePath();

  // Emerald/bronze metallic gradient
  const ringGrad = ctx.createRadialGradient(0, 0, ringInnerR, 0, 0, ringOuterR);
  ringGrad.addColorStop(0, '#064e3b');
  ringGrad.addColorStop(0.3, '#022c22');
  ringGrad.addColorStop(0.7, '#14532d');
  ringGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = ringGrad;
  ctx.fill();

  ctx.strokeStyle = '#b45309'; // Bronze structural reinforcement rails
  ctx.lineWidth = Math.max(1.2, 2.0 * zoom);
  ctx.stroke();

  // Concentric magnetic transit conduits
  ctx.beginPath();
  ctx.arc(0, 0, ringMidR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.75)';
  ctx.lineWidth = Math.max(1.0, 1.5 * zoom);
  ctx.setLineDash([Math.max(4, 8 * zoom), Math.max(2, 4 * zoom)]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. ORBITAL DOCKING ARMS, DEFENSIVE BASTIONS & TRANSIENT SPIRES
  // At close/mid/overview zoom, render perimeter defense bastions with VLS missile blisters
  if (ringOuterR > 10) {
    const nodeCount = ringOuterR > 25 ? 24 : 12;
    for (let i = 0; i < nodeCount; i++) {
      const nodeAng = (i * Math.PI * 2) / nodeCount + ringRot;
      const nx = Math.cos(nodeAng) * ringMidR;
      const ny = Math.sin(nodeAng) * ringMidR;

      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(nodeAng);

      const isBastion = i % 3 === 0;
      if (isBastion) {
        // Heavy Defensive Bastion Node
        const bW = Math.max(4, 16 * zoom);
        const bH = Math.max(6, 22 * zoom);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = Math.max(1.0, 1.5 * zoom);
        ctx.fillRect(-bW * 0.5, -bH * 0.5, bW, bH);
        ctx.strokeRect(-bW * 0.5, -bH * 0.5, bW, bH);

        // Outward defense missile blisters
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(bW * 0.5, -bH * 0.3, Math.max(2, 4 * zoom), bH * 0.6);
      } else {
        // Orbital Docking Arm & Gantry Spire
        const gL = Math.max(3, 12 * zoom);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(1.0, 1.2 * zoom);
        ctx.beginPath();
        ctx.moveTo(0, -ringWidth * 0.4);
        ctx.lineTo(0, ringWidth * 0.4);
        ctx.moveTo(-gL * 0.5, 0);
        ctx.lineTo(gL * 0.5, 0);
        ctx.stroke();

        // Green docking beacon
        const blink = (timeMs + i * 200) % 600 < 300;
        ctx.fillStyle = blink ? '#4ade80' : '#166534';
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1.0, 2.2 * zoom), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // 3. Shield Grid Visual Arcs (Pulsing emerald energy barrier projecting outward)
  const shieldPulse = (Math.sin(timeMs * 0.003) + 1) * 0.5;
  const shieldR = ringOuterR + (Math.max(2, 4 * zoom) + shieldPulse * Math.max(3, 8 * zoom));
  ctx.save();
  ctx.strokeStyle = `rgba(34, 197, 94, ${0.30 + shieldPulse * 0.30})`;
  ctx.lineWidth = Math.max(1.5, 3.0 * zoom);
  ctx.setLineDash([Math.max(8, 16 * zoom), Math.max(6, 12 * zoom)]);
  ctx.beginPath();
  ctx.arc(0, 0, shieldR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Designation HUD Overlay at high/medium zoom
  if (zoom > 0.04 || ringOuterR > 25) {
    ctx.fillStyle = '#4ade80';
    ctx.font = `bold ${Math.max(8, Math.round(11 * zoom))}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('GARN HOMEWORLD RING CITADEL [HQ]', 0, -ringOuterR - Math.max(8, 12 * zoom));
  }

  ctx.restore();
}

/**
 * Local entity fallback renderer for Garn HQ station unit
 */
export function renderGarnHQStructure(
  ctx: CanvasRenderingContext2D,
  r: number = 90,
  timeMs: number = 0
): void {
  ctx.save();
  const s = Math.max(0.35, r / 90.0);

  // Annular Capital Fortress Ring
  const outerR = 85 * s;
  const innerR = 48 * s;
  const coreR = 25 * s;

  // Outer ring torus
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2, false);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.closePath();

  const ringGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
  ringGrad.addColorStop(0, '#064e3b');
  ringGrad.addColorStop(0.5, '#022c22');
  ringGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = ringGrad;
  ctx.fill();

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 3.0 * s;
  ctx.stroke();

  // Spokes to central command core
  const spokes = 6;
  for (let i = 0; i < spokes; i++) {
    const ang = (i * Math.PI * 2) / spokes;
    ctx.save();
    ctx.rotate(ang);
    ctx.fillStyle = '#14532d';
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.8 * s;
    ctx.fillRect(coreR, -4 * s, innerR - coreR, 8 * s);
    ctx.strokeRect(coreR, -4 * s, innerR - coreR, 8 * s);

    // Green conduit
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(coreR, 0);
    ctx.lineTo(innerR, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Heavy Defensive Perimeter Bastions (12 outer pods)
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI * 2) / 12;
    const bx = Math.cos(ang) * outerR;
    const by = Math.sin(ang) * outerR;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(ang);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.4 * s;
    ctx.fillRect(-6 * s, -6 * s, 12 * s, 12 * s);
    ctx.strokeRect(-6 * s, -6 * s, 12 * s, 12 * s);

    // Twin weapon barrels
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(6 * s, -3 * s, 6 * s, 2 * s);
    ctx.fillRect(6 * s, 1 * s, 6 * s, 2 * s);
    ctx.restore();
  }

  // Central Command Citadel
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fillStyle = '#064e3b';
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.5 * s;
  ctx.stroke();

  // Radar gantry
  const rotRadar = timeMs * 0.002;
  ctx.save();
  ctx.rotate(rotRadar);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.0 * s;
  ctx.beginPath();
  ctx.moveTo(-coreR * 0.8, 0);
  ctx.lineTo(coreR * 0.8, 0);
  ctx.stroke();
  ctx.restore();

  // Label
  ctx.fillStyle = '#4ade80';
  ctx.font = `bold ${Math.max(8, Math.round(10 * s))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('GARN RING CITADEL', 0, outerR + 14 * s);

  ctx.restore();
}

/**
 * ALDONAH COLONIAL STAR FORTRESS CITADEL (HQ)
 * Monumental 5-point Trace Italienne colonial star fortress slowly rotating over the volcanic homeworld.
 * Features heavy slab-masonry bastions, detached triangular ravelin outworks, corner bartizans (échauguettes),
 * stepped inner cavaliers, heavy twin siege battery turrets, and a superheated smelting crucible core.
 */
export function renderAldonahForgeCitadel(
  ctx: CanvasRenderingContext2D,
  r: number = 140,
  timeMs: number = 0
): void {
  ctx.save();
  const s = Math.max(0.4, r / 130.0);

  // 1. Slow, majestic planetary orbit rotation (1 revolution every ~70 seconds)
  const rot = (timeMs * 0.00009) % (Math.PI * 2);
  ctx.rotate(rot);

  // Geometric Radii
  const rBastionTip = 135 * s;
  const rBastionShoulder = 98 * s;
  const rBastionFlank = 74 * s;
  const rCurtain = 62 * s;
  const rRavelinTip = 108 * s;
  const rRavelinBase = 72 * s;
  const rInnerFort = 48 * s;
  const rCrucible = 22 * s;

  // -------------------------------------------------------------
  // A. OUTER DEFENSIVE TRENCH & SHIELD MOAT PERIMETER
  // -------------------------------------------------------------
  const pulse = Math.sin(timeMs * 0.0025) * 0.15 + 0.85;
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
  ctx.lineWidth = 2.0 * s;
  ctx.setLineDash([8 * s, 6 * s]);
  ctx.beginPath();
  ctx.arc(0, 0, rBastionTip * 1.14 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // -------------------------------------------------------------
  // B. 5 DETACHED TRIANGULAR RAVELINS / DEMI-LUNES (OUTWORKS)
  // Positioned midway between the 5 main bastion corners
  // -------------------------------------------------------------
  for (let k = 0; k < 5; k++) {
    const midAngle = (k * 2 * Math.PI) / 5 + Math.PI / 5;
    const ravTipX = Math.cos(midAngle) * rRavelinTip;
    const ravTipY = Math.sin(midAngle) * rRavelinTip;
    const spread = 0.20;
    const ravLeftX = Math.cos(midAngle - spread) * rRavelinBase;
    const ravLeftY = Math.sin(midAngle - spread) * rRavelinBase;
    const ravRightX = Math.cos(midAngle + spread) * rRavelinBase;
    const ravRightY = Math.sin(midAngle + spread) * rRavelinBase;
    const ravGorgeX = Math.cos(midAngle) * (rRavelinBase * 0.9);
    const ravGorgeY = Math.sin(midAngle) * (rRavelinBase * 0.9);

    // Ravelin Outer Rampart Shadow
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(ravTipX, ravTipY);
    ctx.lineTo(ravRightX, ravRightY);
    ctx.lineTo(ravGorgeX, ravGorgeY);
    ctx.lineTo(ravLeftX, ravLeftY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ravelin Bronze Battlement Trim & Parapet
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(ravTipX * 0.94, ravTipY * 0.94);
    ctx.lineTo(ravRightX * 0.95, ravRightY * 0.95);
    ctx.lineTo(ravGorgeX * 0.95, ravGorgeY * 0.95);
    ctx.lineTo(ravLeftX * 0.95, ravLeftY * 0.95);
    ctx.closePath();
    ctx.stroke();

    // Embrasures (firing ports) along the ravelin faces
    for (let f = 1; f <= 2; f++) {
      const t = f / 3;
      const lx = ravTipX + (ravLeftX - ravTipX) * t;
      const ly = ravTipY + (ravLeftY - ravTipY) * t;
      const rx = ravTipX + (ravRightX - ravTipX) * t;
      const ry = ravTipY + (ravRightY - ravTipY) * t;

      ctx.fillStyle = '#0c0a09';
      ctx.beginPath();
      ctx.arc(lx, ly, 1.8 * s, 0, Math.PI * 2);
      ctx.arc(rx, ry, 1.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy Kinetic Battery Turret at the Ravelin Tip
    ctx.save();
    ctx.translate(ravTipX, ravTipY);
    ctx.rotate(midAngle);
    ctx.fillStyle = '#292524';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Gun Barrels
    ctx.fillStyle = '#d97706';
    ctx.fillRect(0, -1.6 * s, 7 * s, 1.2 * s);
    ctx.fillRect(0, 0.4 * s, 7 * s, 1.2 * s);
    ctx.restore();
  }

  // -------------------------------------------------------------
  // C. 5-POINT PRIMARY BASTION STAR FORTRESS (TRACE ITALIENNE)
  // Constructed with classic pointed bastions, flanked faces, and curtain walls
  // -------------------------------------------------------------
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const aPoint = (k * 2 * Math.PI) / 5;
    const aShoulderL = aPoint - 0.24;
    const aFlankL = aPoint - 0.16;
    const aCurtainMid = aPoint - Math.PI / 5;
    const aFlankR = aPoint + 0.16;
    const aShoulderR = aPoint + 0.24;

    const ptX = Math.cos(aPoint) * rBastionTip;
    const ptY = Math.sin(aPoint) * rBastionTip;
    const shLX = Math.cos(aShoulderL) * rBastionShoulder;
    const shLY = Math.sin(aShoulderL) * rBastionShoulder;
    const flLX = Math.cos(aFlankL) * rBastionFlank;
    const flLY = Math.sin(aFlankL) * rBastionFlank;
    const shRX = Math.cos(aShoulderR) * rBastionShoulder;
    const shRY = Math.sin(aShoulderR) * rBastionShoulder;
    const flRX = Math.cos(aFlankR) * rBastionFlank;
    const flRY = Math.sin(aFlankR) * rBastionFlank;

    if (k === 0) {
      ctx.moveTo(ptX, ptY);
    } else {
      ctx.lineTo(ptX, ptY);
    }
    ctx.lineTo(shRX, shRY);
    ctx.lineTo(flRX, flRY);

    // Curtain wall to next bastion's left flank
    const nextFlankAngle = ((k + 1) * 2 * Math.PI) / 5 - 0.16;
    const nextCurtainX = Math.cos(aCurtainMid) * rCurtain;
    const nextCurtainY = Math.sin(aCurtainMid) * rCurtain;
    ctx.lineTo(nextCurtainX, nextCurtainY);

    const nextShLAngle = ((k + 1) * 2 * Math.PI) / 5 - 0.24;
    const nextFlLX = Math.cos(nextFlankAngle) * rBastionFlank;
    const nextFlLY = Math.sin(nextFlankAngle) * rBastionFlank;
    ctx.lineTo(nextFlLX, nextFlLY);
    ctx.lineTo(Math.cos(nextShLAngle) * rBastionShoulder, Math.sin(nextShLAngle) * rBastionShoulder);
  }
  ctx.closePath();

  // Heavy Basalt & Slab Masonry Fill
  const fortGrad = ctx.createRadialGradient(0, 0, 15 * s, 0, 0, rBastionTip);
  fortGrad.addColorStop(0, '#292524');
  fortGrad.addColorStop(0.55, '#1c1917');
  fortGrad.addColorStop(1, '#0c0a09');
  ctx.fillStyle = fortGrad;
  ctx.fill();

  // Outer Fort Bronze Retaining Wall / Parapet
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 3.6 * s;
  ctx.stroke();

  // Fine Golden Crenellation Line
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // -------------------------------------------------------------
  // D. STEPPED INNER CAVALIER PLATFORMS & CORNER WATCHTOWERS (BARTIZANS)
  // -------------------------------------------------------------
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    const tipX = Math.cos(a) * rBastionTip;
    const tipY = Math.sin(a) * rBastionTip;
    const cavX = Math.cos(a) * (rBastionTip * 0.72);
    const cavY = Math.sin(a) * (rBastionTip * 0.72);

    // 1. Raised Cavalier Gun Platform (Inner diamond bastion)
    ctx.save();
    ctx.translate(cavX, cavY);
    ctx.rotate(a);
    ctx.fillStyle = '#44403c';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(14 * s, 0);
    ctx.lineTo(0, -10 * s);
    ctx.lineTo(-10 * s, 0);
    ctx.lineTo(0, 10 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin Heavy Colonial Siege Cannon Turret
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(0, 0, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Extended Heavy Cannons with Recoil Housings
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(2 * s, -2.5 * s, 16 * s, 2.0 * s);
    ctx.fillRect(2 * s, 0.5 * s, 16 * s, 2.0 * s);

    // Muzzle flash / laser emitter jewel at cannon tips
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(18 * s, -1.5 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.arc(18 * s, 1.5 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Corner Bartizan Watchtower (Échauguette) perched on each Bastion Salient Point
    ctx.save();
    ctx.translate(tipX, tipY);
    // Cylindrical colonial watchtower base
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Amber Tactical Observation Dome
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 3.0 * s, 0, Math.PI * 2);
    ctx.fill();

    // Navigation beacon flash
    if (Math.sin(timeMs * 0.005 + k * 1.3) > 0.3) {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // -------------------------------------------------------------
  // E. RADIATING MAGNETIC SLAG CONDUITS / DEFENSE GALLERIES
  // -------------------------------------------------------------
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    ctx.save();
    ctx.rotate(a);
    // Trench channel
    ctx.fillStyle = '#7c2d12';
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.2 * s;
    ctx.fillRect(rCrucible, -3.5 * s, rInnerFort - rCrucible + 10 * s, 7 * s);
    ctx.strokeRect(rCrucible, -3.5 * s, rInnerFort - rCrucible + 10 * s, 7 * s);

    // Glowing superheated lava/metal flow down the trench
    const slagPhase = (timeMs * 0.004 + k * 0.4) % 1;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(rCrucible + (rInnerFort - rCrucible) * slagPhase, 0, 2.0 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // -------------------------------------------------------------
  // F. ELEVATED INNER CITADEL COURTYARD (PARADE GROUND KEEP)
  // -------------------------------------------------------------
  ctx.fillStyle = '#1c1917';
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    const cx = Math.cos(a) * rInnerFort;
    const cy = Math.sin(a) * rInnerFort;
    if (k === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Concentric masonry pavers
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k * 2 * Math.PI) / 5;
    const cx = Math.cos(a) * (rInnerFort * 0.65);
    const cy = Math.sin(a) * (rInnerFort * 0.65);
    if (k === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.closePath();
  ctx.stroke();

  // -------------------------------------------------------------
  // G. CENTRAL SUPERHEATED SMELTER CRUCIBLE CORE
  // -------------------------------------------------------------
  const corePulse = Math.sin(timeMs * 0.0035) * 0.15 + 0.85;
  const magmaGrad = ctx.createRadialGradient(0, 0, rCrucible * 0.15, 0, 0, rCrucible * 1.1);
  magmaGrad.addColorStop(0, '#ffffff');
  magmaGrad.addColorStop(0.25, '#fef08a');
  magmaGrad.addColorStop(0.55, '#f97316');
  magmaGrad.addColorStop(0.85, '#dc2626');
  magmaGrad.addColorStop(1.0, '#450a0a');
  ctx.fillStyle = magmaGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rCrucible * corePulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2.2 * s;
  ctx.stroke();

  // -------------------------------------------------------------
  // H. COLONIAL CITADEL OBSERVATION SPIRE & ROTATING RADAR ARMATURE
  // -------------------------------------------------------------
  ctx.save();
  // Central bronze cupola
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rotating brass radar armature / navigation beacon
  const radarRot = timeMs * 0.003;
  ctx.rotate(radarRot);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.moveTo(-11 * s, 0);
  ctx.lineTo(11 * s, 0);
  ctx.moveTo(11 * s, -3 * s);
  ctx.lineTo(11 * s, 3 * s);
  ctx.stroke();

  // Radar dish tip beacon
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(11 * s, 0, 2.0 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // -------------------------------------------------------------
  // I. MILITARY DESIGNATION CALLOUT / TITLE
  // -------------------------------------------------------------
  ctx.save();
  // Counter-rotate text so it stays horizontally readable
  ctx.rotate(-rot);
  ctx.fillStyle = '#fde047';
  ctx.font = `bold ${Math.max(8, Math.round(10 * s))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('ALDONAH STAR FORTRESS [HQ]', 0, rBastionTip * 1.25);
  ctx.restore();

  ctx.restore();
}

/**
 * LIAAL AGRO-CRUCIBLE CITADEL (HQ)
 * Sprawling dual-ring bio-agricultural hub with emerald hydroponic bays and 60-tube swarm missile silos.
 */
export function renderLiaalAgroCitadel(
  ctx: CanvasRenderingContext2D,
  r: number = 105,
  timeMs: number = 0
): void {
  ctx.save();
  const s = Math.max(0.35, r / 105.0);

  const rotAngle = timeMs * 0.0003;
  const outerR = 90 * s;
  const innerR = 55 * s;
  const coreR = 24 * s;

  // 1. Concentric Hydroponic Bio-Rings
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2, false);
  ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
  ctx.closePath();
  const bioGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
  bioGrad.addColorStop(0, '#064e3b');
  bioGrad.addColorStop(0.5, '#047857');
  bioGrad.addColorStop(1, '#065f46');
  ctx.fillStyle = bioGrad;
  ctx.fill();
  ctx.strokeStyle = '#f97316'; // Liaal orange solar lattice
  ctx.lineWidth = 2.4 * s;
  ctx.stroke();

  // Segmented Emerald Bio-Domes along outer ring
  const domeCount = 8;
  for (let d = 0; d < domeCount; d++) {
    const dAng = (d * Math.PI * 2) / domeCount + rotAngle;
    const dx = Math.cos(dAng) * (outerR + innerR) * 0.5;
    const dy = Math.sin(dAng) * (outerR + innerR) * 0.5;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Swarm Missile Silo Clusters (6 surrounding pods)
  for (let m = 0; m < 6; m++) {
    const mAng = (m * Math.PI * 2) / 6 - rotAngle * 0.5;
    const mx = Math.cos(mAng) * (outerR + 8 * s);
    const my = Math.sin(mAng) * (outerR + 8 * s);
    ctx.save();
    ctx.translate(mx, my);
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5 * s;
    ctx.fillRect(-5 * s, -4 * s, 10 * s, 8 * s);
    ctx.strokeRect(-5 * s, -4 * s, 10 * s, 8 * s);
    // VLS tube cells (3x2 miniature dots)
    ctx.fillStyle = '#ea580c';
    for (let tx = -3 * s; tx <= 3 * s; tx += 3 * s) {
      for (let ty = -2 * s; ty <= 2 * s; ty += 4 * s) {
        ctx.fillRect(tx, ty, 1.5 * s, 1.5 * s);
      }
    }
    ctx.restore();
  }

  // 3. Central Agromony Core & Comm Spire
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.arc(0, 0, coreR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spire beacon
  ctx.fillStyle = '#fb923c';
  ctx.beginPath();
  ctx.arc(0, 0, 6 * s, 0, Math.PI * 2);
  ctx.fill();

  // Label
  ctx.fillStyle = '#fb923c';
  ctx.font = `bold ${Math.max(8, Math.round(10 * s))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('LIAAL AGRO CITADEL', 0, outerR + 18 * s);

  ctx.restore();
}

/**
 * KOVAK RHOMBOID SWARM BASTION (HQ)
 * Angular rhomboid mass-fabricator fortress built from stamped alloys for rapid multi-berth ship staging.
 */
export function renderKovakSwarmBastion(
  ctx: CanvasRenderingContext2D,
  r: number = 95,
  timeMs: number = 0
): void {
  ctx.save();
  const s = Math.max(0.35, r / 95.0);

  const diamondW = 85 * s;
  const diamondH = 85 * s;
  const rotPulse = Math.sin(timeMs * 0.004) * 0.2 + 0.8;

  // 1. Angular Rhomboid Stamped Hull Plating
  ctx.fillStyle = '#1e1b4b';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3.0 * s;
  ctx.beginPath();
  ctx.moveTo(0, -diamondH);
  ctx.lineTo(diamondW, 0);
  ctx.lineTo(0, diamondH);
  ctx.lineTo(-diamondW, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner Rhomboid Armor Step
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 2.0 * s;
  ctx.beginPath();
  ctx.moveTo(0, -diamondH * 0.65);
  ctx.lineTo(diamondW * 0.65, 0);
  ctx.lineTo(0, diamondH * 0.65);
  ctx.lineTo(-diamondW * 0.65, 0);
  ctx.closePath();
  ctx.stroke();

  // 2. 4 Outward Mass-Fabrication Berths
  const berths = [
    { x: 0, y: -diamondH * 0.8 },
    { x: diamondW * 0.8, y: 0 },
    { x: 0, y: diamondH * 0.8 },
    { x: -diamondW * 0.8, y: 0 },
  ];
  for (const b of berths) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 1.4 * s;
    ctx.fillRect(-7 * s, -7 * s, 14 * s, 14 * s);
    ctx.strokeRect(-7 * s, -7 * s, 14 * s, 14 * s);
    // Red indicator running lights
    ctx.fillStyle = `rgba(239, 68, 68, ${rotPulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. Central Stamped Hex-Core Reactor
  ctx.fillStyle = '#7f1d1d';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.arc(0, 0, 22 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pulsing Core Lattice
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-14 * s, 0);
  ctx.lineTo(14 * s, 0);
  ctx.moveTo(0, -14 * s);
  ctx.lineTo(0, 14 * s);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#f87171';
  ctx.font = `bold ${Math.max(8, Math.round(10 * s))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('KOVAK SWARM BASTION', 0, diamondH + 16 * s);

  ctx.restore();
}
