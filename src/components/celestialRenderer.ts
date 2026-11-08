import {
  SolarSystem,
  CentralStar,
  RockyPlanet,
  GasGiant,
  CometEntity,
  AsteroidCluster,
  AsteroidNode,
  MoonEntity,
  Vec2D,
} from '../types';
import {
  getPlanetaryGravityWellRadius,
  getLunarGravityWellRadius,
  getClusterGravityWellRadius,
} from '../simulation/solarSystem';
import { renderPlanetaryGravityWellCaptureZone } from './canvasRenderer';
import { CanvasLodTier, getCanvasLodTier } from '../simulation/cameraController';

/**
 * Converts a hex color (#rrggbb or #rgb) to an rgba(r, g, b, alpha) string.
 */
export function hexToRgba(hex: string | undefined | null, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(254, 240, 138, ${alpha})`;
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((ch) => ch + ch).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(254, 240, 138, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Fast 2D value noise for procedural planet generation
function createNoise2D(width: number, height: number, seed: number) {
  const perm = new Uint8Array(512);
  let s = seed % 2147483647;
  for (let i = 0; i < 256; i++) {
    s = (s * 16807) % 2147483647;
    perm[i] = s & 255;
    perm[i + 256] = perm[i];
  }

  function grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return function (x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];

    const x1 = grad(aa, xf, yf) * (1 - u) + grad(ba, xf - 1, yf) * u;
    const x2 = grad(ab, xf, yf - 1) * (1 - u) + grad(bb, xf - 1, yf - 1) * u;
    return (x1 * (1 - v) + x2 * v + 1) * 0.5; // Normalized 0.0 to 1.0
  };
}

export const planetCache = new Map<string, HTMLCanvasElement>();

export function getOrCreatePlanetTexture(
  planet: { id: string; type?: 'ROCKY' | 'GAS_GIANT'; isHabitable?: boolean; habitable?: boolean; isHydrogenRich?: boolean; hydrogen?: boolean; radius: number },
  seed: number = 1337
): HTMLCanvasElement {
  const isHabitable = Boolean(planet.isHabitable ?? planet.habitable);
  const isHydrogenRich = Boolean(planet.isHydrogenRich ?? planet.hydrogen);
  const isIce = Boolean((planet as any).planetClass === 'ICE' || (planet as any).planetType === 'ICE' || (planet as any).isIceWorld || String(planet.id).includes('ICE') || ((planet as any).name && (planet as any).name.includes('Kryos')));
  const planetType: 'ROCKY' | 'GAS_GIANT' = planet.type ?? (isHydrogenRich ? 'GAS_GIANT' : 'ROCKY');
  const cacheKey = `${planet.id}_${planetType}_${isHabitable}_${isHydrogenRich}_${isIce}`;
  const existing = planetCache.get(cacheKey);
  if (existing) return existing;

  const size = 384;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.44;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const noise = createNoise2D(size, size, seed);
  const cloudNoise = createNoise2D(size, size, seed + 9999);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq > r * r) continue; // Outside disk

      // Spherical distortion mapping
      const z = Math.sqrt(r * r - distSq);
      const u = (Math.atan2(dx, z) / Math.PI + 1) * 0.5;
      const v = (Math.asin(dy / r) / Math.PI + 0.5);

      const idx = (y * size + x) * 4;
      const sphereRelief = z / r; // 1.0 at center, 0.0 at edge

      if (planetType === 'ROCKY' && isHabitable) {
        // --- TERRAN / HABITABLE WORLD ---
        // Octave elevation noise
        const n1 = noise(u * 6, v * 6);
        const n2 = noise(u * 14, v * 14) * 0.5;
        const elevation = (n1 + n2) / 1.5;

        // Polar ice check
        const isPolar = v < 0.12 || v > 0.88;

        let red = 0, green = 0, blue = 0;

        if (isIce) {
          // --- YESTIRI ICE WORLD (GLACIAL / CRYO-CRYSTALLINE HABITABLE WORLD) ---
          if (elevation < 0.40) {
            // Sub-surface deep azure ocean rifts
            red = 14; green = 80; blue = 145;
          } else if (elevation < 0.52) {
            // Azure glacial shelf
            red = 38; green = 140; blue = 210;
          } else if (elevation < 0.68) {
            // Pack ice & frost plains
            red = 165; green = 225; blue = 250;
          } else {
            // High crystalline glacial mountain ridges
            red = 230; green = 245; blue = 255;
          }
        } else if (isPolar && elevation > 0.38) {
          // Polar Ice Sheets
          red = 220; green = 238; blue = 245;
        } else if (elevation < 0.46) {
          // Deep Abyss & Ocean Trenches
          red = 10; green = 38; blue = 74;
        } else if (elevation < 0.52) {
          // Coastal Continental Shelf
          red = 24; green = 75; blue = 120;
        } else if (elevation < 0.55) {
          // Sandy Beaches / Coastal Plains
          red = 180; green = 160; blue = 110;
        } else if (elevation < 0.72) {
          // Temperate Forest & Plains
          red = 38; green = 98; blue = 52;
        } else {
          // Mountain Ranges & Highlands
          red = 115; green = 95; blue = 75;
        }

        // Atmospheric Swirling Clouds Layer
        const cn = cloudNoise(u * 8 + v * 2, v * 8);
        const cloudThreshold = isIce ? 0.52 : 0.58;
        if (cn > cloudThreshold) {
          const cloudAlpha = Math.min(1.0, (cn - cloudThreshold) * 3.5);
          red = red * (1 - cloudAlpha) + (isIce ? 220 : 245) * cloudAlpha;
          green = green * (1 - cloudAlpha) + (isIce ? 240 : 250) * cloudAlpha;
          blue = blue * (1 - cloudAlpha) + 255 * cloudAlpha;
        }

        // Apply sphere darkening (3D spherical volume shading)
        const shade = Math.pow(sphereRelief, 0.55);
        data[idx] = Math.round(red * shade);
        data[idx + 1] = Math.round(green * shade);
        data[idx + 2] = Math.round(blue * shade);
        data[idx + 3] = 255;

      } else if (planetType === 'ROCKY') {
        // --- BARREN / CRATERED MINERAL WORLD ---
        const n = noise(u * 8, v * 8);
        const crater = noise(u * 22, v * 22);
        const val = n * 0.7 + crater * 0.3;

        const baseR = 120, baseG = 105, baseB = 95;
        const shade = Math.pow(sphereRelief, 0.6) * (0.65 + val * 0.45);

        data[idx] = Math.round(baseR * shade);
        data[idx + 1] = Math.round(baseG * shade);
        data[idx + 2] = Math.round(baseB * shade);
        data[idx + 3] = 255;

      } else {
        // --- GAS GIANT WORLD ---
        const isH2 = Boolean(isHydrogenRich);
        const bandVal = Math.sin(v * 38 + noise(u * 4, v * 8) * 3.5);
        const shade = Math.pow(sphereRelief, 0.5);

        if (isH2) {
          data[idx] = Math.round((45 + bandVal * 25) * shade);
          data[idx + 1] = Math.round((140 + bandVal * 45) * shade);
          data[idx + 2] = Math.round((175 + bandVal * 40) * shade);
        } else {
          data[idx] = Math.round((165 + bandVal * 40) * shade);
          data[idx + 1] = Math.round((95 + bandVal * 30) * shade);
          data[idx + 2] = Math.round((55 + bandVal * 20) * shade);
        }
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  planetCache.set(cacheKey, canvas);
  return canvas;
}

export function drawEnhancedPlanet(
  ctx: CanvasRenderingContext2D,
  planet: any,
  starCenter: { x: number; y: number },
  camera: { x: number; y: number; zoom: number; viewportWidth: number; viewportHeight: number }
): void {
  const planetX = planet.x !== undefined ? planet.x : (planet.pos?.x ?? 0);
  const planetY = planet.y !== undefined ? planet.y : (planet.pos?.y ?? 0);
  const screenX = (planetX - camera.x) * camera.zoom + camera.viewportWidth / 2;
  const screenY = (planetY - camera.y) * camera.zoom + camera.viewportHeight / 2;
  const screenR = Math.max(3.0, planet.radius * camera.zoom);

  // Viewport Frustum Culling
  if (
    screenX + screenR * 3 < 0 || screenX - screenR * 3 > camera.viewportWidth ||
    screenY + screenR * 3 < 0 || screenY - screenR * 3 > camera.viewportHeight
  ) {
    return;
  }

  const isHabitable = Boolean(planet.isHabitable ?? planet.habitable);
  const isHydrogenRich = Boolean(planet.isHydrogenRich ?? planet.hydrogen);
  const planetType = planet.type ?? (planet.bandColors || isHydrogenRich ? 'GAS_GIANT' : 'ROCKY');
  const planetId = String(planet.id || 'planet');
  const seed = Math.abs(planetId.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0));

  // 1. Draw baked 3D spherical texture
  const texture = getOrCreatePlanetTexture({
    id: planetId,
    type: planetType,
    isHabitable,
    isHydrogenRich,
    radius: planet.radius,
  }, seed);
  ctx.drawImage(texture, screenX - screenR, screenY - screenR, screenR * 2, screenR * 2);

  // 2. Solar Terminator (Night-Side Shadow)
  const angleToSun = Math.atan2(starCenter.y - planetY, starCenter.x - planetX);

  ctx.save();
  ctx.beginPath();
  ctx.arc(screenX, screenY, screenR, 0, Math.PI * 2);
  ctx.clip();

  // Draw smooth night side facing away from the star
  ctx.translate(screenX, screenY);
  ctx.rotate(angleToSun + Math.PI);

  const shadowGrad = ctx.createLinearGradient(-screenR * 0.2, 0, screenR, 0);
  shadowGrad.addColorStop(0.0, 'rgba(2, 5, 10, 0.0)');
  shadowGrad.addColorStop(0.35, 'rgba(2, 5, 10, 0.65)');
  shadowGrad.addColorStop(0.85, 'rgba(2, 5, 10, 0.95)');

  ctx.fillStyle = shadowGrad;
  ctx.fillRect(-screenR, -screenR, screenR * 2, screenR * 2);
  ctx.restore();

  // 3. Outward-Blooming Rayleigh Atmospheric Glow (Screen Blend)
  if (isHabitable || planetType === 'GAS_GIANT') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Glow radiates outward from R to 1.35x R
    const glowR = screenR * 1.35;
    const glowGrad = ctx.createRadialGradient(screenX, screenY, screenR * 0.95, screenX, screenY, glowR);
    const isIce = Boolean(planet.planetClass === 'ICE' || planet.planetType === 'ICE' || planet.isIceWorld || String(planet.id).includes('ICE') || (planet.name && planet.name.includes('Kryos')));
    const glowColor = isIce
      ? 'rgba(103, 232, 249,'
      : isHabitable
      ? 'rgba(0, 180, 255,'
      : isHydrogenRich
        ? 'rgba(0, 240, 210,'
        : 'rgba(255, 150, 60,';

    glowGrad.addColorStop(0.0, `${glowColor} 0.55)`);
    glowGrad.addColorStop(0.4, `${glowColor} 0.22)`);
    glowGrad.addColorStop(1.0, `${glowColor} 0.0)`);

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(screenX, screenY, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Procedural Celestial Renderer for TacticalCanvas
 * Implements 3 Level of Detail (LOD) Rendering Tiers:
 * 1. Tactical Close Tier (Z > 0.0015):
 *    - Full procedural textures, Rayleigh scattering, moons, comets, asteroid belts, capture HUDs
 * 2. System Overview Tier (0.0005 < Z <= 0.0015):
 *    - Planetary orbit lines, clean planet icons, high-contrast cyan hairline dashed gravity well circles
 * 3. Galactic Deep-Zoom Tier (Z <= 0.0005):
 *    - High-contrast glowing star beacons with stylized corona (rgba(starColor, 0.4))
 *    - Star system outer boundary / jump limit faint dashed circle with system name tag
 *    - Heavy planet textures, moons, and asteroids suppressed for steady 60 FPS
 */
export function renderSolarSystem(
  ctx: CanvasRenderingContext2D,
  solarSystem: SolarSystem | undefined,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  jumpModeActive: boolean = false,
  systemDescriptor?: any
) {
  if (!solarSystem) return;

  const lodTier = getCanvasLodTier(cam.zoom);
  const now = performance.now() * 0.001;
  const origin = solarSystem.star?.pos || { x: 0, y: 0 };

  // ==========================================
  // TIER 3: GALACTIC DEEP-ZOOM TIER (Z <= 0.0005)
  // ==========================================
  if (lodTier === 'GALACTIC_DEEP_ZOOM') {
    // 1. Star System Outer Boundary / Jump Limit: faint dashed circle with system name tag
    renderGalacticSystemBoundary(ctx, solarSystem, systemDescriptor, origin, cam, width, height, worldToScreen);

    // 2. High-contrast glowing beacon star with stylized corona (rgba(starColor, 0.4))
    renderGalacticStarBeacon(ctx, solarSystem.star, cam, width, height, worldToScreen, now);

    // Suppress fine planet sprites, asteroids, and individual ships to preserve 60 FPS
    return;
  }

  // ==========================================
  // TIER 2: SYSTEM OVERVIEW TIER (0.0005 < Z <= 0.0015)
  // ==========================================
  if (lodTier === 'SYSTEM_OVERVIEW') {
    // 1. Operational Theater Perimeter & Interdiction Hazard Zone
    renderTheaterPerimeter(ctx, solarSystem.arenaRadius, origin, cam, width, height, worldToScreen);
    renderFtlInterdictionZone(ctx, solarSystem.beltRadiusMax || 16000, origin, cam, width, height, worldToScreen, jumpModeActive);

    // 2. Asteroid Belt Annular Zone & Cluster Gravity Wells
    renderAsteroidBeltAnnulus(ctx, solarSystem.beltRadiusMin, solarSystem.beltRadiusMax, solarSystem.asteroidCount, origin, cam, width, height, worldToScreen);
    if (solarSystem.clusters && solarSystem.clusters.length > 0) {
      renderAsteroidClusters(ctx, solarSystem.clusters, cam, width, height, worldToScreen);
    }

    // 3. Planetary Orbital Tracks
    renderOrbitalTracks(ctx, solarSystem, origin, cam, width, height, worldToScreen);

    // 4. Central Star with glowing corona and identifier
    renderCentralStar(ctx, solarSystem.star, cam, width, height, worldToScreen, now);

    // 5. Planet Icons & high-contrast cyan hairline dashed gravity well circles
    for (const planet of solarSystem.rockyPlanets) {
      renderPlanetOverview(ctx, planet, cam, width, height, worldToScreen);
    }
    for (const giant of solarSystem.gasGiants) {
      renderPlanetOverview(ctx, giant, cam, width, height, worldToScreen);
    }

    return;
  }

  // ==========================================
  // TIER 1: TACTICAL CLOSE TIER (Z > 0.0015)
  // ==========================================
  // 1. DEEP SPACE OPERATIONAL THEATER PERIMETER (~30,000 KM)
  renderTheaterPerimeter(ctx, solarSystem.arenaRadius, origin, cam, width, height, worldToScreen);

  // 2. ASTEROID BELT ANNULAR ZONE (~12,000 KM - 16,000 KM)
  renderAsteroidBeltAnnulus(ctx, solarSystem.beltRadiusMin, solarSystem.beltRadiusMax, solarSystem.asteroidCount, origin, cam, width, height, worldToScreen);

  // 2A. ASTEROID BELT FTL INTERDICTION ZONE (~16,000 KM STATIC PERIMETER)
  renderFtlInterdictionZone(ctx, solarSystem.beltRadiusMax || 16000, origin, cam, width, height, worldToScreen, jumpModeActive);

  // 2B. ASTEROID CLUSTER GRAVITY WELL BOUNDARY RINGS (6.0x Radius)
  if (solarSystem.clusters && solarSystem.clusters.length > 0) {
    renderAsteroidClusters(ctx, solarSystem.clusters, cam, width, height, worldToScreen);
  }

  // 3. PLANETARY ORBITAL TRACKS
  renderOrbitalTracks(ctx, solarSystem, origin, cam, width, height, worldToScreen);

  // 4. CENTRAL STAR: Origin [origin.x, origin.y] with radiant corona
  renderCentralStar(ctx, solarSystem.star, cam, width, height, worldToScreen, now);

  // 5. ROCKY PLANETS & LUNAR BODIES (Inner System: 1 to 5)
  for (const planet of solarSystem.rockyPlanets) {
    renderRockyPlanet(ctx, planet, cam, width, height, worldToScreen, now);
  }

  // 6. GAS GIANTS & LUNAR BODIES (Outer System: 1 to 4)
  for (const giant of solarSystem.gasGiants) {
    renderGasGiant(ctx, giant, cam, width, height, worldToScreen, now);
  }

  // 7. HIGH-ECCENTRICITY COMETS (1 to 2) with strictly anti-sunward emissive tail
  for (const comet of solarSystem.comets) {
    renderComet(ctx, comet, cam, width, height, worldToScreen, now);
  }
}

/**
 * Galactic Deep-Zoom Tier: Star System Outer Boundary / Jump Limit
 * Faint dashed circle with tactical system name tag: e.g. SYSTEM 01 [ALPHA CENTAURI]
 */
function renderGalacticSystemBoundary(
  ctx: CanvasRenderingContext2D,
  solarSystem: SolarSystem,
  systemDescriptor: any,
  origin: Vec2D,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  const [ox, oy] = worldToScreen(origin.x, origin.y, width, height);
  const boundaryRadius = solarSystem.arenaRadius || 35000;
  const screenR = boundaryRadius * cam.zoom;

  if (ox + screenR < -80 || ox - screenR > width + 80 || oy + screenR < -80 || oy - screenR > height + 80) {
    return;
  }

  ctx.save();

  // Faint dashed circle jump limit / boundary
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(ox, oy, screenR, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle boundary halo
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(ox, oy, screenR, 0, Math.PI * 2);
  ctx.stroke();

  // System name banner tag: SYSTEM 01 [ALPHA CENTAURI]
  const sysIdx = (systemDescriptor?.systemIndex ?? systemDescriptor?.index ?? 0) + 1;
  const sysName = (systemDescriptor?.name || solarSystem.star.name || 'STAR SYSTEM').toUpperCase();
  const bannerTag = `SYSTEM ${String(sysIdx).padStart(2, '0')} [${sysName}]`;

  ctx.font = 'bold 10px monospace';
  const tagWidth = ctx.measureText(bannerTag).width;
  const tagY = oy - screenR - 10;

  ctx.fillStyle = 'rgba(8, 12, 18, 0.85)';
  ctx.fillRect(ox - tagWidth * 0.5 - 7, tagY - 11, tagWidth + 14, 16);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - tagWidth * 0.5 - 7, tagY - 11, tagWidth + 14, 16);

  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText(bannerTag, ox, tagY + 1);

  ctx.restore();
}

/**
 * Galactic Deep-Zoom Tier: Central Star Glowing Beacon
 * High-contrast glowing beacon with a stylized corona: rgba(starColor, 0.4)
 */
function renderGalacticStarBeacon(
  ctx: CanvasRenderingContext2D,
  star: CentralStar,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  time: number
) {
  const [sx, sy] = worldToScreen(star.pos?.x ?? 0, star.pos?.y ?? 0, width, height);
  const starColor = star.color || '#fef08a';
  const coronaRgba = hexToRgba(starColor, 0.4);

  const beaconRadius = 6.5;
  const coronaRadius = 24;

  if (sx < -coronaRadius || sx > width + coronaRadius || sy < -coronaRadius || sy > height + coronaRadius) {
    return;
  }

  ctx.save();

  // Stylized Corona: rgba(starColor, 0.4)
  const coronaGrad = ctx.createRadialGradient(sx, sy, beaconRadius * 0.5, sx, sy, coronaRadius);
  coronaGrad.addColorStop(0, coronaRgba);
  coronaGrad.addColorStop(0.65, coronaRgba);
  coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(sx, sy, coronaRadius, 0, Math.PI * 2);
  ctx.fill();

  // High-contrast glowing core disc
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(sx, sy, beaconRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = starColor;
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Star Name Sub-Label
  ctx.fillStyle = starColor;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(star.name.toUpperCase(), sx, sy + coronaRadius + 8);

  ctx.restore();
}

/**
 * System Overview Tier: Planet Icon & Dashed Gravity Well Circle
 * Renders dashed gravity well circles in high-contrast cyan hairlines and compact planet icons
 */
function renderPlanetOverview(
  ctx: CanvasRenderingContext2D,
  planet: RockyPlanet | GasGiant,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  const [px, py] = worldToScreen(planet.pos.x, planet.pos.y, width, height);
  if (px < -60 || px > width + 60 || py < -60 || py > height + 60) return;

  const planetWellWorldR = planet.wellRadius || getPlanetaryGravityWellRadius(planet);
  const gwScreenR = planetWellWorldR * cam.zoom;

  ctx.save();

  // 1. Dashed gravity well circle in high-contrast cyan hairlines
  if (gwScreenR > 3) {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.75)'; // High-contrast cyan hairline
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(px, py, gwScreenR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. Planet Icon (crisp high-contrast marker)
  const isPrimary = (planet as RockyPlanet).isPrimaryHabitable;
  const isColony = (planet as RockyPlanet).colonized;
  const isGarnHomeworld = Boolean(
    (planet as any).isHomeworld ||
    (planet as any).hasHQ ||
    (planet as any).isGarnRing ||
    (planet.name && planet.name.toLowerCase().includes('garn'))
  );
  const iconRadius = 4.5;

  // For Garn Homeworld, render the colossal equatorial planetary ring in System Overview LOD
  if (isGarnHomeworld) {
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(px, py, iconRadius * 2.3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(px, py, iconRadius * 2.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = isPrimary ? '#38bdf8' : isColony ? '#34d399' : planet.baseColor || '#94a3b8';
  ctx.beginPath();
  ctx.arc(px, py, iconRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isPrimary ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);
  ctx.stroke();

  // Planet icon label
  ctx.fillStyle = isGarnHomeworld ? '#4ade80' : isPrimary ? '#38bdf8' : isColony ? '#34d399' : '#cbd5e1';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  const labelText = isGarnHomeworld ? `${planet.name.toUpperCase()} [RING HQ]` : planet.name.toUpperCase();
  ctx.fillText(labelText, px, py - iconRadius - (isGarnHomeworld ? 9 : 5));

  ctx.restore();
}

/**
 * Deep Space Operational Theater Boundary
 */
function renderTheaterPerimeter(
  ctx: CanvasRenderingContext2D,
  arenaRadius: number,
  origin: Vec2D,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  const [ox, oy] = worldToScreen(origin.x, origin.y, width, height);
  const screenR = arenaRadius * cam.zoom;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.arc(ox, oy, screenR, 0, Math.PI * 2);
  ctx.stroke();

  // Cardinal Azimuth Reticles
  const cardinals = [
    { rad: 0, label: '000° ALPHA' },
    { rad: Math.PI * 0.5, label: '090° BRAVO' },
    { rad: Math.PI, label: '180° CHARLIE' },
    { rad: Math.PI * 1.5, label: '270° DELTA' },
  ];

  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';

  for (const c of cardinals) {
    const cx = ox + Math.cos(c.rad) * screenR;
    const cy = oy + Math.sin(c.rad) * screenR;
    if (cx >= -50 && cx <= width + 50 && cy >= -50 && cy <= height + 50) {
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
      ctx.fillText(c.label, cx, cy - 7);
    }
  }

  if (cam.zoom <= 0.08) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`DEEP SPACE SECTOR PERIMETER (~${Math.round(arenaRadius / 1000)}K KM)`, ox, oy - screenR - 9);
  }
  ctx.restore();
}

/**
 * Asteroid Belt Annulus (~12,000 - 16,000 KM)
 */
function renderAsteroidBeltAnnulus(
  ctx: CanvasRenderingContext2D,
  minR: number,
  maxR: number,
  asteroidCount: number,
  origin: Vec2D,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  const [ox, oy] = worldToScreen(origin.x, origin.y, width, height);
  const sMin = minR * cam.zoom;
  const sMax = maxR * cam.zoom;

  ctx.save();
  // Annular band wash
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 12]);

  ctx.beginPath();
  ctx.arc(ox, oy, sMin, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(ox, oy, sMax, 0, Math.PI * 2);
  ctx.stroke();

  // Shaded annular corridor
  if (cam.zoom <= 0.08) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.025)';
    ctx.beginPath();
    ctx.arc(ox, oy, sMax, 0, Math.PI * 2);
    ctx.arc(ox, oy, sMin, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MAIN ASTEROID BELT [${asteroidCount} NODES - 12K-16K KM]`, ox, oy + sMin + (sMax - sMin) * 0.5 + 3);
  }
  ctx.restore();
}

/**
 * 2A. Asteroid Belt FTL Interdiction Zone (~16,000 KM)
 * Static circular hazard envelope centered at system origin.
 * Prohibits standard FTL and micro-jump initiation within its radius.
 */
function renderFtlInterdictionZone(
  ctx: CanvasRenderingContext2D,
  interdictionRadius: number,
  origin: Vec2D,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  jumpModeActive: boolean
) {
  const [ox, oy] = worldToScreen(origin.x, origin.y, width, height);
  const sR = interdictionRadius * cam.zoom;

  // Don't render if completely off-screen
  if (ox + sR < 0 || ox - sR > width || oy + sR < 0 || oy - sR > height) {
    return;
  }

  ctx.save();

  // Subtle interior hazard shading (more prominent when Jump targeting mode is active)
  if (cam.zoom <= 0.12) {
    const fillAlpha = jumpModeActive ? 0.045 : 0.018;
    const grad = ctx.createRadialGradient(ox, oy, sR * 0.75, ox, oy, sR);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.00)');
    grad.addColorStop(1, `rgba(239, 68, 68, ${fillAlpha})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, sR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Primary Faint Red-Tinted Hazard Boundary Line
  ctx.strokeStyle = jumpModeActive ? 'rgba(239, 68, 68, 0.85)' : 'rgba(239, 68, 68, 0.42)';
  ctx.lineWidth = jumpModeActive ? 2.0 : 1.2;
  ctx.setLineDash([14, 8]);
  ctx.beginPath();
  ctx.arc(ox, oy, sR, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary subtle striped / dashed perimeter (tight concentric interior track)
  ctx.strokeStyle = jumpModeActive ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.20)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(ox, oy, Math.max(0, sR - (jumpModeActive ? 8 : 5)), 0, Math.PI * 2);
  ctx.stroke();

  // Striped Hazard Perimeter Hash Marks at Cardinal & Intercardinal Angles
  if (sR > 120) {
    const numTicks = 36;
    const tickLen = jumpModeActive ? 9 : 6;
    ctx.strokeStyle = jumpModeActive ? 'rgba(239, 68, 68, 0.75)' : 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    for (let i = 0; i < numTicks; i++) {
      const angle = (i * Math.PI * 2) / numTicks;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const x1 = ox + cosA * (sR - tickLen);
      const y1 = oy + sinA * (sR - tickLen);
      const x2 = ox + cosA * (sR + 2);
      const y2 = oy + sinA * (sR + 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Tactical Text HUD Label along boundary
  if (cam.zoom <= 0.08 && sR > 80) {
    ctx.fillStyle = jumpModeActive ? 'rgba(248, 113, 113, 0.95)' : 'rgba(239, 68, 68, 0.55)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    const tagText = jumpModeActive
      ? '⛔ FTL INTERDICTION ZONE [16,000 KM] • INITIATION & TARGETING PROHIBITED'
      : '⚠️ FTL INTERDICTION ENVELOPE [16,000 KM] • SUBSPACE JUMP SUPPRESSED';
    ctx.fillText(tagText, ox, oy - sR - 8);
    ctx.fillText(tagText, ox, oy + sR + 15);
  }

  ctx.restore();
}

/**
 * 2B. Asteroid Cluster Gravity Wells (Tight 10% Margin Envelope)
 * R_cluster_well = R_cluster_envelope * 1.10 (exactly cluster diameter/radius plus 10% operational margin).
 */
export function drawClusterGravityWells(
  ctx: CanvasRenderingContext2D,
  clusters: AsteroidCluster[],
  camera: { x: number; y: number; zoom: number; viewportWidth: number; viewportHeight: number }
) {
  const halfW = (camera.viewportWidth / 2) / camera.zoom;
  const halfH = (camera.viewportHeight / 2) / camera.zoom;
  const minX = camera.x - halfW - 3000;
  const maxX = camera.x + halfW + 3000;
  const minY = camera.y - halfH - 3000;
  const maxY = camera.y + halfH + 3000;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const wellRadius = cluster.gravityWellRadius || cluster.wellRadius || Math.round((cluster.radius || 2200) * 1.10);

    // Bounds check in world space
    if (
      cluster.center.x + wellRadius < minX ||
      cluster.center.x - wellRadius > maxX ||
      cluster.center.y + wellRadius < minY ||
      cluster.center.y - wellRadius > maxY
    ) {
      continue;
    }

    const screenX = (cluster.center.x - camera.x) * camera.zoom + camera.viewportWidth / 2;
    const screenY = (cluster.center.y - camera.y) * camera.zoom + camera.viewportHeight / 2;
    const screenR = wellRadius * camera.zoom;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenR, 0, Math.PI * 2);
    ctx.stroke();

    if (screenR > 20) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ASTEROID CLUSTER WELL [MOORABLE]', screenX, screenY - screenR - 6);
    }
    ctx.restore();
  }
}

/**
 * True world-space culling & rendering for asteroids across all systems.
 */
export function drawAsteroids(
  ctx: CanvasRenderingContext2D,
  asteroidsOrState: AsteroidNode[] | { asteroids?: AsteroidNode[]; asteroidClusters?: AsteroidCluster[]; allClusters?: AsteroidCluster[] },
  camera: { x: number; y: number; zoom: number; viewportWidth: number; viewportHeight: number }
) {
  const asteroids: AsteroidNode[] = Array.isArray(asteroidsOrState)
    ? asteroidsOrState
    : (asteroidsOrState?.asteroids || []);

  const halfW = (camera.viewportWidth / 2) / camera.zoom;
  const halfH = (camera.viewportHeight / 2) / camera.zoom;
  const minX = camera.x - halfW - 200;
  const maxX = camera.x + halfW + 200;
  const minY = camera.y - halfH - 200;
  const maxY = camera.y + halfH + 200;

  for (let i = 0; i < asteroids.length; i++) {
    const ast = asteroids[i];
    if (ast.isDepleted) continue;

    // True world-space culling check
    if (ast.x < minX || ast.x > maxX || ast.y < minY || ast.y > maxY) {
      continue;
    }

    // Render asteroid node
    const screenX = (ast.x - camera.x) * camera.zoom + camera.viewportWidth / 2;
    const screenY = (ast.y - camera.y) * camera.zoom + camera.viewportHeight / 2;
    // Fix: Clamp min screen radius to 1.2px
    const screenR = Math.max(1.2, ast.radius * camera.zoom);

    // Fix: Differentiate cluster nodes vs loose belt nodes
    ctx.fillStyle = ast.clusterId ? '#8ca2b5' : '#556677';
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Render Moorable Gravity Wells for Clusters if state passed
  if (!Array.isArray(asteroidsOrState)) {
    const clusters = asteroidsOrState.asteroidClusters || asteroidsOrState.allClusters;
    if (clusters && clusters.length > 0) {
      drawClusterGravityWells(ctx, clusters, camera);
    }
  }
}

function renderAsteroidClusters(
  ctx: CanvasRenderingContext2D,
  clusters: AsteroidCluster[],
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  for (const cluster of clusters) {
    const [cx, cy] = worldToScreen(cluster.center.x, cluster.center.y, width, height);
    const clusterWellWorldR = cluster.gravityWellRadius || cluster.wellRadius || getClusterGravityWellRadius(cluster);
    const clGwScreenR = clusterWellWorldR * cam.zoom;

    if (cx < -clGwScreenR || cx > width + clGwScreenR || cy < -clGwScreenR || cy > height + clGwScreenR) {
      continue;
    }

    ctx.save();

    // 1. Draw dashed circle (rgba(0, 240, 255, 0.35)) at cluster.center with radius cluster.gravityWellRadius
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, clGwScreenR, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Subtle radial gradient tint representing the gravity well capture zone
    if (clGwScreenR > 20) {
      const innerR = Math.max(0, clGwScreenR * 0.70);
      
      if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(innerR) && Number.isFinite(clGwScreenR)) {
        const wellGrad = ctx.createRadialGradient(
          cx,
          cy,
          innerR,
          cx,
          cy,
          clGwScreenR
        );
        wellGrad.addColorStop(0, 'rgba(0, 240, 255, 0.05)');
        wellGrad.addColorStop(1, 'rgba(0, 0, 0, 0.00)');
        ctx.fillStyle = wellGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, clGwScreenR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Cluster Outer Mesh Envelope Marker
    const envelopeScreenR = Math.max((cluster.envelopeRadius || cluster.radius) * cam.zoom, 4);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.20)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, envelopeScreenR, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Subtle label: ASTEROID CLUSTER WELL [MOORABLE]
    if (clGwScreenR > 20) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        'ASTEROID CLUSTER WELL [MOORABLE]',
        cx,
        cy - clGwScreenR - 6
      );
    }

    ctx.restore();
  }
}

/**
 * Orbital Paths for all celestial bodies
 */
function renderOrbitalTracks(
  ctx: CanvasRenderingContext2D,
  solarSystem: SolarSystem,
  origin: Vec2D,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  const [ox, oy] = worldToScreen(origin.x, origin.y, width, height);

  ctx.save();
  ctx.setLineDash([4, 10]);

  // Rocky Planets orbits (faint cyan/slate)
  for (const p of solarSystem.rockyPlanets) {
    const sR = p.orbitalRadius * cam.zoom;
    ctx.strokeStyle = p.isPrimaryHabitable ? 'rgba(56, 189, 248, 0.22)' : 'rgba(100, 116, 139, 0.15)';
    ctx.lineWidth = p.isPrimaryHabitable ? 1.2 : 0.8;
    ctx.beginPath();
    ctx.arc(ox, oy, sR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Gas Giants orbits (faint amber/violet)
  for (const g of solarSystem.gasGiants) {
    const sR = g.orbitalRadius * cam.zoom;
    ctx.strokeStyle = g.hydrogen ? 'rgba(16, 185, 129, 0.20)' : 'rgba(168, 85, 247, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ox, oy, sR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Comets: high-eccentricity elliptical orbit preview
  for (const c of solarSystem.comets) {
    renderCometOrbitPath(ctx, c, origin, cam, width, height, worldToScreen);
  }

  ctx.restore();
}

/**
 * Draws the high-eccentricity elliptical orbit of a comet
 */
function renderCometOrbitPath(
  ctx: CanvasRenderingContext2D,
  comet: CometEntity,
  origin: Vec2D,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  const a = comet.semiMajorAxis;
  const e = comet.eccentricity;
  const b = a * Math.sqrt(Math.max(0.001, 1 - e * e));
  const cosInc = Math.cos(comet.inclinationAngle);
  const sinInc = Math.sin(comet.inclinationAngle);
  const center = (comet as any).systemCenter || origin;

  ctx.save();
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.20)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 8]);
  ctx.beginPath();

  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const E = (i / steps) * Math.PI * 2;
    const xOrb = a * (Math.cos(E) - e);
    const yOrb = b * Math.sin(E);
    const wx = center.x + (xOrb * cosInc - yOrb * sinInc);
    const wy = center.y + (xOrb * sinInc + yOrb * cosInc);
    const [sx, sy] = worldToScreen(wx, wy, width, height);

    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.restore();
}

const starDiskCache = new Map<string, HTMLCanvasElement>();

export interface StarVisualProfile {
  coreColor: string;
  midColor: string;
  edgeColor: string;
  limbColor: string;
  coronaColor: string;
  rayColor: string;
}

export const STAR_PALETTES: Record<string, StarVisualProfile> = {
  YELLOW_DWARF: {
    coreColor: '#ffffff',
    midColor: '#fff3a8',
    edgeColor: '#ff9e1b',
    limbColor: '#d64000',
    coronaColor: 'rgba(255, 140, 20,',
    rayColor: 'rgba(255, 200, 80,'
  },
  BLUE_GIANT: {
    coreColor: '#ffffff',
    midColor: '#d0ecff',
    edgeColor: '#4ea8de',
    limbColor: '#1d4ed8',
    coronaColor: 'rgba(56, 189, 248,',
    rayColor: 'rgba(125, 211, 252,'
  },
  RED_DWARF: {
    coreColor: '#fff5eb',
    midColor: '#ff8a65',
    edgeColor: '#dc2626',
    limbColor: '#7f1d1d',
    coronaColor: 'rgba(239, 68, 68,',
    rayColor: 'rgba(252, 165, 165,'
  }
};

export function getOrCreateStarDisk(
  starType: string = 'YELLOW_DWARF',
  seed: number = 777
): HTMLCanvasElement {
  const palette = STAR_PALETTES[starType] || STAR_PALETTES['YELLOW_DWARF'];
  const cacheKey = `STAR_DISK_${starType}`;
  const existing = starDiskCache.get(cacheKey);
  if (existing) return existing;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46; // Radius with border padding

  // 1. Base Disk Clipping
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // 2. High-Luminance Photosphere & Severe Limb Darkening
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  coreGrad.addColorStop(0.0, palette.coreColor);
  coreGrad.addColorStop(0.25, palette.midColor);
  coreGrad.addColorStop(0.70, palette.edgeColor);
  coreGrad.addColorStop(0.93, palette.limbColor);
  coreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.95)'); // Sharp chromatic limb drop-off

  ctx.fillStyle = coreGrad;
  ctx.fillRect(0, 0, size, size);

  // 3. Convection Granulation Noise Overlay
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Lightweight pseudo-noise pass for convective cells
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;
      if (distSq > r * r) continue;

      const idx = (y * size + x) * 4;
      const dist = Math.sqrt(distSq);
      const normDist = dist / r;

      // Granular noise frequency modulation
      const noise = (Math.sin(x * 0.18 + seed) * Math.cos(y * 0.18 + seed * 0.5) +
                     Math.sin((x + y) * 0.12)) * 0.5;

      // Limb factor: turbulence fades near the outer edge
      const factor = (1 - normDist * 0.6) * (noise * 22);

      data[idx] = Math.min(255, Math.max(0, data[idx] + factor));
      data[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + factor * 0.8));
      data[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + factor * 0.3));
    }
  }
  ctx.putImageData(imgData, 0, 0);
  ctx.restore();

  starDiskCache.set(cacheKey, canvas);
  return canvas;
}

function drawSolarProminences(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  screenR: number,
  palette: StarVisualProfile,
  tick: number
): void {
  const prominenceCount = 10;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < prominenceCount; i++) {
    const baseAngle = (i / prominenceCount) * Math.PI * 2;
    // Low-frequency cyclic breathing
    const pulse = Math.sin(tick * 0.04 + i * 1.6);
    const flareHeight = screenR * (0.08 + Math.max(0, pulse) * 0.16);

    const angle = baseAngle + Math.sin(tick * 0.015 + i) * 0.08;
    const arcSpread = 0.22;

    const p1x = screenX + Math.cos(angle - arcSpread) * screenR;
    const p1y = screenY + Math.sin(angle - arcSpread) * screenR;

    const p2x = screenX + Math.cos(angle + arcSpread) * screenR;
    const p2y = screenY + Math.sin(angle + arcSpread) * screenR;

    // Outer peak of magnetic loop
    const peakDist = screenR + flareHeight;
    const cpx = screenX + Math.cos(angle) * peakDist;
    const cpy = screenY + Math.sin(angle) * peakDist;

    ctx.strokeStyle = `${palette.coronaColor} ${0.35 + Math.abs(pulse) * 0.45})`;
    ctx.lineWidth = Math.max(1.5, screenR * 0.025);
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.quadraticCurveTo(cpx, cpy, p2x, p2y);
    ctx.stroke();

    // Occasional violent flare ejection
    if (i % 3 === 0 && pulse > 0.4) {
      ctx.fillStyle = palette.coreColor;
      ctx.beginPath();
      ctx.arc(cpx, cpy, Math.max(1.2, screenR * 0.018), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawSolarAtmosphere(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  screenR: number,
  palette: StarVisualProfile,
  tick: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 1. High-Density Inner Chromosphere Ring (capped for performance at deep zoom in)
  const innerCoronaR = Math.min(screenR * 1.45, screenR + 800);
  const innerGrad = ctx.createRadialGradient(screenX, screenY, Math.min(screenR * 0.85, screenR), screenX, screenY, innerCoronaR);
  innerGrad.addColorStop(0.0, `${palette.coronaColor} 0.85)`);
  innerGrad.addColorStop(0.35, `${palette.coronaColor} 0.45)`);
  innerGrad.addColorStop(1.0, `${palette.coronaColor} 0.0)`);

  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(screenX, screenY, innerCoronaR, 0, Math.PI * 2);
  ctx.fill();

  // 2. Wide Radiant Coronal Envelope (capped for performance at deep zoom in)
  const outerCoronaR = Math.min(screenR * 3.8, screenR + 2200);
  const outerGrad = ctx.createRadialGradient(screenX, screenY, Math.min(screenR * 1.1, screenR + 200), screenX, screenY, outerCoronaR);
  outerGrad.addColorStop(0.0, `${palette.coronaColor} 0.28)`);
  outerGrad.addColorStop(0.4, `${palette.coronaColor} 0.08)`);
  outerGrad.addColorStop(1.0, `${palette.coronaColor} 0.0)`);

  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(screenX, screenY, outerCoronaR, 0, Math.PI * 2);
  ctx.fill();

  // 3. Four-Point Anamorphic / Diffraction Rays
  const rayLength = Math.min(screenR * 4.2, 2800);
  const rayWidth = Math.min(Math.max(1.2, screenR * 0.04), 22);
  const slowRotation = tick * 0.0015;

  ctx.strokeStyle = `${palette.rayColor} 0.22)`;
  ctx.lineWidth = rayWidth;

  for (let r = 0; r < 4; r++) {
    const rayAngle = slowRotation + (r * Math.PI) / 2;
    const cos = Math.cos(rayAngle);
    const sin = Math.sin(rayAngle);

    const grad = ctx.createLinearGradient(
      screenX - cos * rayLength, screenY - sin * rayLength,
      screenX + cos * rayLength, screenY + sin * rayLength
    );
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.4, `${palette.rayColor} 0.35)`);
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(0.6, `${palette.rayColor} 0.35)`);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(screenX - cos * rayLength, screenY - sin * rayLength);
    ctx.lineTo(screenX + cos * rayLength, screenY + sin * rayLength);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawEnhancedSystemStar(
  ctx: CanvasRenderingContext2D,
  star: { x?: number; y?: number; pos?: { x: number; y: number }; radius: number; starType?: string; starColor?: string; color?: string },
  camera: { x: number; y: number; zoom: number; viewportWidth: number; viewportHeight: number },
  simulationTick: number = 0
): void {
  const starX = star.x !== undefined ? star.x : (star.pos?.x ?? 0);
  const starY = star.y !== undefined ? star.y : (star.pos?.y ?? 0);
  const screenX = (starX - camera.x) * camera.zoom + camera.viewportWidth / 2;
  const screenY = (starY - camera.y) * camera.zoom + camera.viewportHeight / 2;
  const screenR = Math.max(4.0, (star.radius || 5200) * camera.zoom);

  // Viewport Frustum Culling (accounting for outer corona reach)
  const maxReach = screenR * 4.5;
  if (
    screenX + maxReach < 0 || screenX - maxReach > camera.viewportWidth ||
    screenY + maxReach < 0 || screenY - maxReach > camera.viewportHeight
  ) {
    return;
  }

  let starType = star.starType;
  if (!starType) {
    const col = (star.starColor || star.color || '').toLowerCase();
    if (col.includes('blue') || col.includes('cyan') || col.includes('38bdf8') || col.includes('60a5fa')) {
      starType = 'BLUE_GIANT';
    } else if (col.includes('red') || col.includes('f87171') || col.includes('ef4444')) {
      starType = 'RED_DWARF';
    } else {
      starType = 'YELLOW_DWARF';
    }
  }

  const palette = STAR_PALETTES[starType] || STAR_PALETTES['YELLOW_DWARF'];

  // Pass 1: Additive Multi-Tier Corona & Outer Glow
  drawSolarAtmosphere(ctx, screenX, screenY, screenR, palette, simulationTick);

  // Pass 2: Magnetic Prominence Flares
  if (screenR > 12) {
    drawSolarProminences(ctx, screenX, screenY, screenR, palette, simulationTick);
  }

  // Pass 3: Cached Thermonuclear Photosphere Disk (Sharp edge with limb darkening)
  const diskCanvas = getOrCreateStarDisk(starType);
  ctx.drawImage(
    diskCanvas,
    screenX - screenR,
    screenY - screenR,
    screenR * 2,
    screenR * 2
  );
}

export function drawEnhancedStar(
  ctx: CanvasRenderingContext2D,
  star: { x?: number; y?: number; pos?: { x: number; y: number }; radius: number; starType?: string; starColor?: string; color?: string },
  camera: { x: number; y: number; zoom: number; viewportWidth: number; viewportHeight: number },
  simulationTick: number = 0
): void {
  drawEnhancedSystemStar(ctx, star, camera, simulationTick);
}

export function drawSystemStar(
  ctx: CanvasRenderingContext2D,
  star: { x?: number; y?: number; pos?: { x: number; y: number }; radius: number; starType?: string; color?: string; starColor?: string },
  camera: { x: number; y: number; zoom: number; viewportWidth: number; viewportHeight: number },
  simulationTick: number = 0
): void {
  drawEnhancedSystemStar(ctx, star, camera, simulationTick);
}

/**
 * A. CENTRAL STAR: Origin [star.pos.x, star.pos.y]
 * Large radiant disc with emissive corona rendering
 */
function renderCentralStar(
  ctx: CanvasRenderingContext2D,
  star: CentralStar,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  time: number
) {
  const starX = star.pos?.x ?? 0;
  const starY = star.pos?.y ?? 0;
  const [sx, sy] = worldToScreen(starX, starY, width, height);
  const coreRad = Math.max(star.radius * cam.zoom, 14);
  const coronaRad = coreRad * 4.5;

  if (sx < -coronaRad || sx > width + coronaRad || sy < -coronaRad || sy > height + coronaRad) {
    return;
  }

  const starType = star.spectralClass?.startsWith('B') || star.spectralClass?.startsWith('O')
    ? 'BLUE_GIANT'
    : star.spectralClass?.startsWith('M')
    ? 'RED_DWARF'
    : 'YELLOW_DWARF';

  // Draw enhanced multi-layer stellar corona & photosphere core
  drawEnhancedSystemStar(
    ctx,
    {
      x: starX,
      y: starY,
      radius: star.radius,
      starType,
    },
    {
      x: cam.x,
      y: cam.y,
      zoom: cam.zoom,
      viewportWidth: width,
      viewportHeight: height,
    },
    Math.round(time * 30)
  );

  ctx.save();
  // Star Identification HUD Label
  ctx.fillStyle = '#fbbf24';
  ctx.font = `${Math.max(Math.min(Math.round(11 * cam.zoom * 2), 12), 8.5)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`PRIMARY STAR: ${star.name.toUpperCase()} [${star.spectralClass || 'G2V'}]`, sx, sy + coreRad + 14);

  ctx.restore();
}

/**
 * B. ROCKY PLANETS (Inner System: 1 to 5)
 * Day/night illumination facing star [0,0], oceans, continents, atmospheres
 */
function renderRockyPlanet(
  ctx: CanvasRenderingContext2D,
  planet: RockyPlanet,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  time: number
) {
  const [px, py] = worldToScreen(planet.pos.x, planet.pos.y, width, height);
  const rad = Math.max(planet.radius * cam.zoom, 4);

  // Culling
  if (px < -rad * 4 || px > width + rad * 4 || py < -rad * 4 || py > height + rad * 4) {
    return;
  }

  ctx.save();

  // Angle towards the star
  const starCenter = (planet as any).systemCenter || { x: 0, y: 0 };

  // 1. Organic Procedural Planet Texture, Solar Shadow Terminator & Atmospheric Rim
  drawEnhancedPlanet(
    ctx,
    planet,
    starCenter,
    {
      x: cam.x,
      y: cam.y,
      zoom: cam.zoom,
      viewportWidth: width,
      viewportHeight: height,
    }
  );

  // Stationary High-Lateral Anchor Guide for Primary Habitable Planet (Upper Quadrant HQ Anchor)
  if (planet.isPrimaryHabitable) {
    const planetWellWorldR = planet.wellRadius || getPlanetaryGravityWellRadius(planet);
    const gwScreenR = planetWellWorldR * cam.zoom;
    const hqScreenX = px + 0.45 * gwScreenR;
    const hqScreenY = py - 0.45 * gwScreenR;

    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(hqScreenX, hqScreenY);
    ctx.stroke();

    // High-lateral anchor beacon ring in upper quadrant
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(hqScreenX, hqScreenY, 6 * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (planet.colonized) {
    // Orbital Colony Governance Beacon for colonized secondary planets
    const planetWellWorldR = planet.wellRadius || getPlanetaryGravityWellRadius(planet);
    const gwScreenR = planetWellWorldR * cam.zoom;
    const beaconScreenX = px + 0.5 * gwScreenR;
    const beaconScreenY = py - 0.5 * gwScreenR;

    ctx.save();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(beaconScreenX, beaconScreenY);
    ctx.stroke();

    // Colony Outpost Beacon Ring
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(beaconScreenX, beaconScreenY, 5 * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Standardized Dynamic Planetary Gravity Well Capture Zone & Silhouette Telemetry
  renderPlanetaryGravityWellCaptureZone(ctx, planet, [px, py], cam, rad);

  // Lunar Bodies rendering
  if (planet.moons && planet.moons.length > 0) {
    renderLunarBodies(ctx, planet.moons, planet.pos, cam, width, height, worldToScreen);
  }

  // Planet Telemetry HUD Tag
  ctx.fillStyle = planet.isPrimaryHabitable
    ? '#38bdf8'
    : planet.colonized
    ? '#34d399'
    : planet.habitable
    ? '#6ee7b7'
    : '#94a3b8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';

  const colonyTag = planet.isPrimaryHabitable
    ? ' [PRIMARY HABITABLE - HQ ANCHOR]'
    : planet.colonized
    ? ' [TERRAN COLONY - +25 MET/+25 ORG]'
    : planet.habitable
    ? ' [TERRAN WORLD - HABITABLE]'
    : ` [${(planet as any).planetClass || 'PLANET'} - ${planet.gravityRating}G]`;

  ctx.fillText(`${planet.name.toUpperCase()}${colonyTag}`, px, py - rad - 6);

  ctx.restore();
}

/**
 * E. GAS GIANTS (Outer System: 1 to 4)
 * Banded atmospheres, optional ring systems, hydrogen-rich tags
 */
function renderGasGiant(
  ctx: CanvasRenderingContext2D,
  giant: GasGiant,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  time: number
) {
  const [gx, gy] = worldToScreen(giant.pos.x, giant.pos.y, width, height);
  const rad = Math.max(giant.radius * cam.zoom, 8);

  if (gx < -rad * 4 || gx > width + rad * 4 || gy < -rad * 4 || gy > height + rad * 4) {
    return;
  }

  ctx.save();
  const starCenter = (giant as any).systemCenter || { x: 0, y: 0 };
  const toStarAngle = Math.atan2(starCenter.y - giant.pos.y, starCenter.x - giant.pos.x);

  // Ring System: Behind the planet (top half)
  if (giant.ringSystem && rad >= 10) {
    renderRings(ctx, gx, gy, rad * 1.35, rad * 2.2, giant.ringSystem.color, giant.ringSystem.opacity, true);
  }

  // Organic Procedural Gas Giant Texture, Great Storm Oval, Terminator & Hydrogen/Methane Rim
  drawEnhancedPlanet(
    ctx,
    giant,
    starCenter,
    {
      x: cam.x,
      y: cam.y,
      zoom: cam.zoom,
      viewportWidth: width,
      viewportHeight: height,
    }
  );

  // Ring System: In front of planet (bottom half)
  if (giant.ringSystem && rad >= 10) {
    renderRings(ctx, gx, gy, rad * 1.35, rad * 2.2, giant.ringSystem.color, giant.ringSystem.opacity, false);
  }

  // Standardized Dynamic Planetary Gravity Well Capture Zone & Silhouette Telemetry
  renderPlanetaryGravityWellCaptureZone(ctx, giant, [gx, gy], cam, rad);

  // Lunar Bodies rendering
  if (giant.moons && giant.moons.length > 0) {
    renderLunarBodies(ctx, giant.moons, giant.pos, cam, width, height, worldToScreen);
  }

  // Telemetry HUD Tag
  ctx.fillStyle = giant.hydrogen ? '#34d399' : '#c084fc';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';

  const h2Tag = giant.hydrogen ? ' [HYDROGEN-RICH (30% ROLL)]' : ' [GAS GIANT]';
  ctx.fillText(`${giant.name.toUpperCase()}${h2Tag}`, gx, gy - rad - 8);

  ctx.restore();
}

/**
 * Lunar Bodies & Lunar Gravity Wells (6.0x Radius)
 */
function renderLunarBodies(
  ctx: CanvasRenderingContext2D,
  moons: MoonEntity[],
  parentPos: Vec2D,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number]
) {
  const [px, py] = worldToScreen(parentPos.x, parentPos.y, width, height);

  for (const moon of moons) {
    const [mx, my] = worldToScreen(moon.pos.x, moon.pos.y, width, height);
    const moonScreenR = Math.max(moon.radius * cam.zoom, 3.5);
    const moonWellWorldR = getLunarGravityWellRadius(moon);
    const moonGwScreenR = moonWellWorldR * cam.zoom;

    // 1. Lunar Orbit Track around parent body
    const orbitScreenR = moon.orbitalRadius * cam.zoom;
    if (orbitScreenR > 15 && px >= -orbitScreenR && px <= width + orbitScreenR) {
      ctx.save();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.18)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(px, py, orbitScreenR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (mx < -moonGwScreenR || mx > width + moonGwScreenR || my < -moonGwScreenR || my > height + moonGwScreenR) {
      continue;
    }

    ctx.save();

    // 2. Lunar Gravity Well Ring (Surface-Offset Formula: R_well = R_body + 2,500 km * G)
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.32)';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(mx, my, moonGwScreenR, 0, Math.PI * 2);
    ctx.stroke();

    // Surface Exclusion Zone (R_body + 150 km)
    const moonExclWorldR = moon.radius + 150.0;
    const moonExclScreenR = moonExclWorldR * cam.zoom;
    if (moonExclScreenR > moonScreenR * 0.95 && moonExclScreenR < moonGwScreenR) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(mx, my, moonExclScreenR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle gravity well gradient tint
    if (moonGwScreenR > 18) {
      const wellGrad = ctx.createRadialGradient(mx, my, moonScreenR, mx, my, moonGwScreenR);
      wellGrad.addColorStop(0, 'rgba(203, 213, 225, 0.04)');
      wellGrad.addColorStop(1, 'rgba(203, 213, 225, 0.00)');
      ctx.fillStyle = wellGrad;
      ctx.beginPath();
      ctx.arc(mx, my, moonGwScreenR, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Moon Solid Body Sphere
    ctx.fillStyle = moon.color || '#cbd5e1';
    ctx.beginPath();
    ctx.arc(mx, my, moonScreenR, 0, Math.PI * 2);
    ctx.fill();

    // Terminator shadow
    const starCenter = (moon as any).systemCenter || { x: 0, y: 0 };
    const toStarAngle = Math.atan2(starCenter.y - moon.pos.y, starCenter.x - moon.pos.x);
    const mLightX = mx + Math.cos(toStarAngle) * (moonScreenR * 0.4);
    const mLightY = my + Math.sin(toStarAngle) * (moonScreenR * 0.4);
    const mShadowGrad = ctx.createRadialGradient(mLightX, mLightY, moonScreenR * 0.1, mx, my, moonScreenR * 1.1);
    mShadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    mShadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    mShadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = mShadowGrad;
    ctx.beginPath();
    ctx.arc(mx, my, moonScreenR, 0, Math.PI * 2);
    ctx.fill();

    // 4. Moon HUD & Gravity Well Label
    if (cam.zoom >= 0.04 && moonGwScreenR > 20) {
      ctx.fillStyle = 'rgba(203, 213, 225, 0.65)';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`LUNAR WELL [${Math.round(moonWellWorldR)}KM]`, mx, my - moonGwScreenR - 3);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 7.5px monospace';
      ctx.fillText(`${moon.name.toUpperCase()} [${moon.gravityRating}G]`, mx, my - moonScreenR - 4);
    }

    ctx.restore();
  }
}

/**
 * Tilted Planetary Rings Helper
 */
function renderRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  color: string,
  opacity: number,
  behind: boolean
) {
  if (outerR <= 0.1 || innerR < 0 || !isFinite(outerR) || !isFinite(innerR)) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  const startAngle = behind ? Math.PI : 0;
  const endAngle = behind ? Math.PI * 2 : Math.PI;

  const safeOuterR = Math.max(0.1, outerR);
  const safeInnerR = Math.max(0.1, innerR);
  ctx.ellipse(cx, cy, safeOuterR, Math.max(0.1, safeOuterR * 0.38), -0.35, startAngle, endAngle);
  ctx.ellipse(cx, cy, safeInnerR, Math.max(0.1, safeInnerR * 0.38), -0.35, endAngle, startAngle, true);
  ctx.closePath();

  ctx.fillStyle = `rgba(217, 119, 6, ${opacity * 0.75})`;
  ctx.fill();

  ctx.strokeStyle = `rgba(254, 243, 199, ${opacity})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/**
 * F. HIGH-ECCENTRICITY COMETS (1 to 2)
 * Moving continuously along eccentric elliptical orbits.
 * Small solid nucleus with visible emissive tail pointing strictly anti-sunward (directly away from origin [0,0]).
 */
function renderComet(
  ctx: CanvasRenderingContext2D,
  comet: CometEntity,
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  time: number
) {
  const [cx, cy] = worldToScreen(comet.pos.x, comet.pos.y, width, height);

  // Vector from star center through comet gives strictly anti-sunward vector!
  const starCenter = (comet as any).systemCenter || { x: 0, y: 0 };
  const dx = comet.pos.x - starCenter.x;
  const dy = comet.pos.y - starCenter.y;
  const distFromStar = Math.sqrt(dx * dx + dy * dy);
  if (distFromStar === 0) return;

  // Anti-sunward unit vector: points directly away from parent star
  const antiSunX = dx / distFromStar;
  const antiSunY = dy / distFromStar;

  // Tail expands and lengthens as comet gets closer to star (sublimation)
  const proximityBoost = Math.max(0, (26000 - distFromStar) / 26000);
  const tailWorldLen = comet.tailLength * (1.0 + proximityBoost * 2.5);
  const tailScreenLen = Math.max(tailWorldLen * cam.zoom, 45);

  // Perpendicular vector for tail flare width
  const perpX = -antiSunY;
  const perpY = antiSunX;
  const tailEndWidth = Math.max(tailScreenLen * 0.28, 14);

  // Screen coordinates of tail tip
  const tailEndX = cx + antiSunX * tailScreenLen;
  const tailEndY = cy + antiSunY * tailScreenLen;

  ctx.save();

  // 1. Broad Outer Dust Coma & Tail
  const dustGrad = ctx.createLinearGradient(cx, cy, tailEndX, tailEndY);
  dustGrad.addColorStop(0, 'rgba(165, 243, 252, 0.65)'); // Ice Cyan
  dustGrad.addColorStop(0.35, 'rgba(34, 211, 238, 0.35)');
  dustGrad.addColorStop(0.75, 'rgba(6, 182, 212, 0.12)');
  dustGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = dustGrad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tailEndX + perpX * (tailEndWidth * 0.5), tailEndY + perpY * (tailEndWidth * 0.5));
  ctx.lineTo(tailEndX - perpX * (tailEndWidth * 0.5), tailEndY - perpY * (tailEndWidth * 0.5));
  ctx.closePath();
  ctx.fill();

  // 2. High-energy Narrow Ion Beam Core (Straight anti-sunward ion stream)
  const ionGrad = ctx.createLinearGradient(cx, cy, tailEndX * 0.85, tailEndY * 0.85);
  ionGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
  ionGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.55)');
  ionGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.strokeStyle = ionGrad;
  ctx.lineWidth = Math.max(3 * cam.zoom, 2.0);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + antiSunX * (tailScreenLen * 0.85), cy + antiSunY * (tailScreenLen * 0.85));
  ctx.stroke();

  // 3. Comet Nucleus (Small solid icy core)
  const nucleusRad = Math.max(comet.nucleusRadius * cam.zoom, 3.5);

  // Emissive Coma Halo around nucleus
  const comaGrad = ctx.createRadialGradient(cx, cy, nucleusRad * 0.2, cx, cy, nucleusRad * 2.8);
  comaGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  comaGrad.addColorStop(0.45, 'rgba(103, 232, 249, 0.65)');
  comaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = comaGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, nucleusRad * 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Solid nucleus core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, nucleusRad, 0, Math.PI * 2);
  ctx.fill();

  // Comet Telemetry HUD Label
  ctx.fillStyle = '#67e8f9';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${comet.name.toUpperCase()} [MYSTERY ANOMALY - e=${comet.eccentricity}]`, cx, cy - nucleusRad - 7);

  ctx.restore();
}
