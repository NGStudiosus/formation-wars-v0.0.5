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
  _r: number = 26,
  timeMs: number = 0
): void {
  ctx.save();
  const baseR = 26; // 52px diameter

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
  _r: number = 24,
  timeMs: number = 0
): void {
  ctx.save();
  const baseR = 24; // 48px diameter

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
  _r: number = 28,
  timeMs: number = 0
): void {
  ctx.save();
  const baseR = 28; // 56px diameter

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
  _r: number = 38,
  timeMs: number = 0
): void {
  ctx.save();
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
  _r: number = 46,
  timeMs: number = 0
): void {
  ctx.save();
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
  _r: number = 56,
  timeMs: number = 0
): void {
  ctx.save();
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

  return false;
}
