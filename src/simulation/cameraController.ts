import { Vec2D } from '../types';

export type CanvasLodTier = 'TACTICAL_CLOSE' | 'SYSTEM_OVERVIEW' | 'GALACTIC_DEEP_ZOOM';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraBoundsConfig {
  systemCount: number;
  galaxyRadius?: number;
  systemSpacing?: number;
  systems?: { center: Vec2D }[];
}

/**
 * Calculates the dynamic minimum zoom limit (minZoom) based on the number of star systems.
 * - Single System: ~0.0008
 * - Multi-System Galactic: 0.00035 / sqrt(systemCount)
 * Accommodates zooming out across an entire 8-system cluster spanning 1,000,000+ km of space.
 */
export function calculateMinZoom(systemCount: number = 1): number {
  const count = Math.max(1, systemCount);
  if (count <= 1) {
    return 0.0008;
  }
  return 0.00035 / Math.sqrt(count);
}

/**
 * Calculates the dynamic galaxy boundary radius based on system positions or galactic spacing:
 * boundaryRadius = galaxyRadius + 200,000 km
 */
export function calculateGalaxyRadius(
  systemCount: number = 1,
  systemSpacing: number = 250000,
  systems?: { center: Vec2D }[]
): number {
  if (systems && systems.length > 0) {
    let maxDist = 0;
    for (const sys of systems) {
      const d = Math.hypot(sys.center.x, sys.center.y);
      if (d > maxDist) maxDist = d;
    }
    return Math.max(maxDist + 50000, 250000);
  }

  const count = Math.max(1, systemCount);
  if (count <= 1) {
    return 250000;
  }
  return systemSpacing * Math.sqrt(count) * 0.65;
}

export function calculateBoundaryRadius(galaxyRadius: number): number {
  return 300000;
}

/**
 * Determines current rendering Tier according to camera zoom:
 * - Tactical Close Tier: Z > 0.0015
 * - System Overview Tier: 0.0005 < Z <= 0.0015
 * - Galactic Deep-Zoom Tier: Z <= 0.0005
 */
export function getCanvasLodTier(zoom: number): CanvasLodTier {
  if (zoom > 0.0015) {
    return 'TACTICAL_CLOSE';
  }
  if (zoom > 0.0005) {
    return 'SYSTEM_OVERVIEW';
  }
  return 'GALACTIC_DEEP_ZOOM';
}

/**
 * Clamps camera position inside the dynamic world boundary
 */
export function clampCameraPosition(
  pos: { x: number; y: number },
  boundaryRadius: number
): { x: number; y: number } {
  return {
    x: Math.max(-boundaryRadius, Math.min(boundaryRadius, pos.x)),
    y: Math.max(-boundaryRadius, Math.min(boundaryRadius, pos.y)),
  };
}

/**
 * Camera Controller Class managing zoom, panning, viewport coordinate transforms,
 * dynamic zoom limits, and dynamic panning boundaries.
 */
export class CameraController {
  public state: CameraState;
  public minZoom: number = 0.0008;
  public maxZoom: number = 2.5;
  public galaxyRadius: number = 300000;
  public boundaryRadius: number = 300000;

  constructor(initialState?: Partial<CameraState>, config?: CameraBoundsConfig) {
    this.state = {
      x: initialState?.x ?? 0,
      y: initialState?.y ?? 0,
      zoom: initialState?.zoom ?? 0.38,
    };
    if (config) {
      this.updateBounds(config);
    }
  }

  public updateBounds(config: CameraBoundsConfig) {
    const count = Math.max(1, config.systemCount || 1);
    this.minZoom = calculateMinZoom(count);
    this.galaxyRadius =
      config.galaxyRadius ??
      calculateGalaxyRadius(count, config.systemSpacing ?? 250000, config.systems);
    this.boundaryRadius = calculateBoundaryRadius(this.galaxyRadius);

    // Ensure current camera state is clamped
    this.state.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.state.zoom));
    const clampedPos = clampCameraPosition(this.state, this.boundaryRadius);
    this.state.x = clampedPos.x;
    this.state.y = clampedPos.y;
  }

  public getLodTier(): CanvasLodTier {
    return getCanvasLodTier(this.state.zoom);
  }

  public worldToScreen(wX: number, wY: number, width: number, height: number): [number, number] {
    const sX = (wX - this.state.x) * this.state.zoom + width * 0.5;
    const sY = (wY - this.state.y) * this.state.zoom + height * 0.5;
    return [sX, sY];
  }

  public screenToWorld(sX: number, sY: number, width: number, height: number): Vec2D {
    return {
      x: (sX - width * 0.5) / this.state.zoom + this.state.x,
      y: (sY - height * 0.5) / this.state.zoom + this.state.y,
    };
  }

  public pan(dxScreen: number, dyScreen: number) {
    this.state.x -= dxScreen / this.state.zoom;
    this.state.y -= dyScreen / this.state.zoom;
    const clamped = clampCameraPosition(this.state, this.boundaryRadius);
    this.state.x = clamped.x;
    this.state.y = clamped.y;
  }

  public zoomAtWorld(zoomFactor: number, anchorWorld: Vec2D, screenCenterOffset: Vec2D): number {
    const targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.state.zoom * zoomFactor));
    if (targetZoom === this.state.zoom) return this.state.zoom;

    this.state.zoom = targetZoom;
    this.state.x = anchorWorld.x - screenCenterOffset.x / targetZoom;
    this.state.y = anchorWorld.y - screenCenterOffset.y / targetZoom;

    const clamped = clampCameraPosition(this.state, this.boundaryRadius);
    this.state.x = clamped.x;
    this.state.y = clamped.y;
    return this.state.zoom;
  }
}
