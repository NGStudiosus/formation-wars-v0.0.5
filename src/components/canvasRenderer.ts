/**
 * CANVAS RENDERER & RETICLE TELEMETRY
 * Renders celestial gravity well capture zones and telemetry tags:
 * - Capture Zone: Faint dashed hairline ring (1px stroke, rgba(255, 255, 255, 0.15), setLineDash([8, 8]))
 * - Silhouette Telemetry: [NAME] [X.XX G] • GRAVITY WELL: [R_well]km • ORBITAL CAPTURE ZONE
 */

import { Vec2D } from '../types';
import {
  calculateDynamicGravityWellRadius,
  SURFACE_EXCLUSION_ZONE_KM,
} from '../simulation/celestialTypes';

export interface RenderableCelestialBody {
  id?: string;
  name: string;
  pos: Vec2D;
  radius: number;
  gravityRating?: number;
  isAsteroidCluster?: boolean;
  planetClass?: string;
  planetType?: string;
  wellRadius?: number;
  type?: string;
}

/**
 * Renders the faint dashed orbital capture zone hairline ring, the debug surface exclusion zone,
 * and the canonical telemetry tag below the celestial body's silhouette.
 */
export function renderPlanetaryGravityWellCaptureZone(
  ctx: CanvasRenderingContext2D,
  body: RenderableCelestialBody,
  screenPos: [number, number],
  cam: { zoom: number },
  bodyVisualRadiusScreen: number,
  showSurfaceExclusion: boolean = true
): void {
  const [px, py] = screenPos;
  const rWellWorld = body.wellRadius || calculateDynamicGravityWellRadius(body);
  const rWellScreen = rWellWorld * cam.zoom;

  ctx.save();

  // 1. Orbital Capture Zone: Faint, dashed hairline ring at R_well = R_body + (2,500 km * G)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.0;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(px, py, rWellScreen, 0, Math.PI * 2);
  ctx.stroke();

  // Very subtle radial interior tint when zoomed in
  if (rWellScreen > bodyVisualRadiusScreen + 6) {
    const tintGrad = ctx.createRadialGradient(px, py, bodyVisualRadiusScreen, px, py, rWellScreen);
    tintGrad.addColorStop(0, 'rgba(255, 255, 255, 0.025)');
    tintGrad.addColorStop(1, 'rgba(255, 255, 255, 0.00)');
    ctx.fillStyle = tintGrad;
    ctx.beginPath();
    ctx.arc(px, py, rWellScreen, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Debug Surface Exclusion Zone (R_body + 150 km):
  // Renders the safety boundary separating surface exclusion from the valid annular mooring band
  const isCluster = body.isAsteroidCluster || body.type === 'ASTEROID_CLUSTER';
  if (!isCluster && body.radius && body.radius > 0 && showSurfaceExclusion) {
    const rExclusionWorld = body.radius + SURFACE_EXCLUSION_ZONE_KM;
    const rExclusionScreen = rExclusionWorld * cam.zoom;

    if (rExclusionScreen > bodyVisualRadiusScreen * 0.9 && rExclusionScreen < rWellScreen) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(px, py, rExclusionScreen, 0, Math.PI * 2);
      ctx.stroke();

      // Debug telemetry tag when zoomed in
      if (cam.zoom >= 0.025 && rExclusionScreen > 24) {
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
        ctx.textAlign = 'center';
        ctx.fillText(`EXCLUSION ZONE [${Math.round(rExclusionWorld)}KM]`, px, py - rExclusionScreen - 3);
      }
    }
  }

  // 3. Text Tag below the planet silhouette:
  // [NAME] [X.XX G] • GRAVITY WELL: [R_well]km • ORBITAL CAPTURE ZONE
  if (cam.zoom >= 0.012 && bodyVisualRadiusScreen > 2) {
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';

    const gRating =
      body.gravityRating !== undefined ? `${body.gravityRating.toFixed(2)} G` : '1.00 G';
    const nameUpper = body.name.toUpperCase();
    const wellKm = Math.round(rWellWorld);

    let telemetryText: string;
    if (isCluster) {
      telemetryText = `${nameUpper} • GRAVITY WELL: ${wellKm}km • ORBITAL CAPTURE ZONE`;
    } else {
      telemetryText = `${nameUpper} [${gRating}] • GRAVITY WELL: ${wellKm}km • ORBITAL CAPTURE ZONE`;
    }

    const tagOffsetY = bodyVisualRadiusScreen + 16;
    ctx.fillText(telemetryText, px, py + tagOffsetY);
  }

  ctx.restore();
}
