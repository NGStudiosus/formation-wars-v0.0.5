import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { ShipEntity, MissileEntity, Vec2D, StructureType, ShipRole, RockyPlanet, GasGiant, SolarSystem } from '../types';
import { STRUCTURE_CATALOG } from '../simulation/structures';
import { placementController } from '../simulation/placementController';
import { constructionManager } from '../simulation/constructionManager';
import { hermiteInterpolate, distSq } from '../simulation/hermite';
import {
  renderProceduralShip,
  renderCherenkovJumpTrail,
  renderCherenkovSpoolGlow,
  renderGalacticJumpConduit,
} from './shipRenderer';
import {
  renderSolarSystem,
  drawSystemStar,
  drawEnhancedStar,
  drawEnhancedSystemStar,
  drawEnhancedPlanet,
} from './celestialRenderer';
import { getShipHullSpec } from '../simulation/shipPrototypes';
import { raycastSelectShip, marqueeSelectShips } from '../simulation/selectionController';
import { PlanetaryCard } from './PlanetaryCard';
import { planetController, validateColonization } from '../simulation/planetController';
import { renderSensorOverlay } from './radarOverlay';
import { BASE_TACTICAL_RANGES, resolveRCSWeight } from '../simulation/sensorController';
import { getBaseRadarRadius, calculateEntitySensors } from '../simulation/sensors';
import { renderTacticalRangeReticles, renderSensorContactBlip, renderFogOfWarContactBlip } from './sensorRenderer';
import { renderOrdnanceBatched } from './ordnanceRenderer';
import {
  calculateMinZoom,
  calculateGalaxyRadius,
  calculateBoundaryRadius,
  getCanvasLodTier,
  CanvasLodTier,
} from '../simulation/cameraController';

interface TacticalCanvasProps {
  engine: SimulationEngine;
  onSelectShip: (shipId: string) => void;
  selectedShipId: string | null;
  selectedShipIds?: string[];
  onSelectShips?: (shipIds: string[]) => void;
  cameraFocusTarget?: Vec2D | null;
  onCameraFocusHandled?: () => void;
  moveModeActive?: boolean;
  onMoveModeHandled?: () => void;
  jumpModeActive?: boolean;
  onJumpModeHandled?: () => void;
  buildStructureType?: StructureType | null;
  onBuildModeHandled?: () => void;
  onOpenResearchModal?: () => void;
}

/**
 * Raycasts against planets and celestial bodies across all star systems
 */
function findPlanetUnderCursor(
  worldPos: Vec2D,
  engine: SimulationEngine,
  zoom: number
): RockyPlanet | GasGiant | null {
  const systemsToScan: SolarSystem[] = [];
  if (engine.systems && engine.systems.length > 0) {
    for (const sys of engine.systems) {
      if (sys.solarSystem) systemsToScan.push(sys.solarSystem);
    }
  } else if (engine.solarSystem) {
    systemsToScan.push(engine.solarSystem);
  }

  for (const sys of systemsToScan) {
    // Check rocky planets first
    for (const planet of sys.rockyPlanets) {
      const d = Math.hypot(worldPos.x - planet.pos.x, worldPos.y - planet.pos.y);
      const screenRadius = Math.max(planet.radius * zoom, 32);
      const worldRadius = screenRadius / zoom;
      if (d <= worldRadius) {
        return planet;
      }
    }

    // Check gas giants
    for (const giant of sys.gasGiants) {
      const d = Math.hypot(worldPos.x - giant.pos.x, worldPos.y - giant.pos.y);
      const screenRadius = Math.max(giant.radius * zoom, 44);
      const worldRadius = screenRadius / zoom;
      if (d <= worldRadius) {
        return giant;
      }
    }
  }

  return null;
}

/**
 * Galactic Deep-Zoom Tier: Grouped Fleet Markers
 * Suppresses fine individual ships to preserve 60 FPS, rendering grouped high-level
 * fleet markers with ship count indicators (e.g., 1ST FLEET (5)).
 */
function renderGalacticFleetMarkers(
  ctx: CanvasRenderingContext2D,
  ships: ShipEntity[],
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  selectedShipIds?: string[]
) {
  const activeShips = (ships || []).filter((s) => s && s.hullState !== 'DESTROYED');
  if (activeShips.length === 0) return;

  // 1. Group friendly ships into spatial clusters (within 160,000 km)
  const friendlies = activeShips.filter((s) => s.faction === 'FRIENDLY');
  const friendlyClusters: ShipEntity[][] = [];

  for (const ship of friendlies) {
    let added = false;
    for (const cluster of friendlyClusters) {
      const lead = cluster[0];
      const dx = ship.pos.x - lead.pos.x;
      const dy = ship.pos.y - lead.pos.y;
      if (Math.hypot(dx, dy) < 160000) {
        cluster.push(ship);
        added = true;
        break;
      }
    }
    if (!added) {
      friendlyClusters.push([ship]);
    }
  }

  // Render Friendly Fleet Markers
  friendlyClusters.forEach((cluster, idx) => {
    let sumX = 0;
    let sumY = 0;
    let hasSelected = false;
    for (const s of cluster) {
      sumX += s.pos.x;
      sumY += s.pos.y;
      if (selectedShipIds && selectedShipIds.includes(s.id)) {
        hasSelected = true;
      }
    }
    const avgX = sumX / cluster.length;
    const avgY = sumY / cluster.length;
    const [fx, fy] = worldToScreen(avgX, avgY, width, height);

    if (fx < -60 || fx > width + 60 || fy < -60 || fy > height + 60) return;

    ctx.save();

    // Selection or beacon bracket
    if (hasSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx, fy, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glowing military diamond chevron emblem
    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 12);
    ctx.lineTo(fx + 12, fy);
    ctx.lineTo(fx, fy + 12);
    ctx.lineTo(fx - 12, fy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Internal chevron
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx - 6, fy + 2);
    ctx.lineTo(fx, fy - 4);
    ctx.lineTo(fx + 6, fy + 2);
    ctx.stroke();

    // High-contrast callout badge: 1ST FLEET (5)
    const fleetName = idx === 0 ? '1ST FLEET' : idx === 1 ? '2ND FLEET' : `${idx + 1}TH FLEET`;
    const labelText = `${fleetName} (${cluster.length})`;

    ctx.font = 'bold 10px monospace';
    const textWidth = ctx.measureText(labelText).width;
    const tagY = fy - 18;

    ctx.fillStyle = 'rgba(8, 12, 18, 0.9)';
    ctx.fillRect(fx - textWidth * 0.5 - 6, tagY - 10, textWidth + 12, 16);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(fx - textWidth * 0.5 - 6, tagY - 10, textWidth + 12, 16);

    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(labelText, fx, tagY + 2);

    ctx.restore();
  });

  // 2. Group hostile ships into spatial clusters
  const hostiles = activeShips.filter((s) => s.faction === 'HOSTILE');
  const hostileClusters: ShipEntity[][] = [];

  for (const ship of hostiles) {
    let added = false;
    for (const cluster of hostileClusters) {
      const lead = cluster[0];
      const dx = ship.pos.x - lead.pos.x;
      const dy = ship.pos.y - lead.pos.y;
      if (Math.hypot(dx, dy) < 160000) {
        cluster.push(ship);
        added = true;
        break;
      }
    }
    if (!added) {
      hostileClusters.push([ship]);
    }
  }

  // Render Hostile Fleet Markers
  hostileClusters.forEach((cluster, idx) => {
    let sumX = 0;
    let sumY = 0;
    for (const s of cluster) {
      sumX += s.pos.x;
      sumY += s.pos.y;
    }
    const avgX = sumX / cluster.length;
    const avgY = sumY / cluster.length;
    const [hx, hy] = worldToScreen(avgX, avgY, width, height);

    if (hx < -60 || hx > width + 60 || hy < -60 || hy > height + 60) return;

    ctx.save();

    // Crimson glowing hostile diamond
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy - 11);
    ctx.lineTo(hx + 11, hy);
    ctx.lineTo(hx, hy + 11);
    ctx.lineTo(hx - 11, hy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hostile callout tag
    const hostileLabel = `HOSTILE FLOTILLA (${cluster.length})`;
    ctx.font = 'bold 9.5px monospace';
    const textWidth = ctx.measureText(hostileLabel).width;
    const tagY = hy - 17;

    ctx.fillStyle = 'rgba(8, 12, 18, 0.9)';
    ctx.fillRect(hx - textWidth * 0.5 - 6, tagY - 10, textWidth + 12, 15);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(hx - textWidth * 0.5 - 6, tagY - 10, textWidth + 12, 15);

    ctx.fillStyle = '#f87171';
    ctx.textAlign = 'center';
    ctx.fillText(hostileLabel, hx, tagY + 2);

    ctx.restore();
  });
}

/**
 * Renders individual vessels engaged in high-speed 64x hyperdrive transit
 * across the galactic map view, including tactical conduits and 300px Cherenkov trails.
 */
function renderGalacticJumpShips(
  ctx: CanvasRenderingContext2D,
  ships: ShipEntity[],
  cam: { x: number; y: number; zoom: number },
  width: number,
  height: number,
  worldToScreen: (wx: number, wy: number, w: number, h: number) => [number, number],
  nowMs: number,
  selectedShipIds?: string[]
) {
  for (const ship of ships) {
    if (!ship || ship.hullState === 'DESTROYED') continue;

    if (ship.jumpState === 'IN_TRANSIT' || ship.jumpState === 'TRANSIT') {
      const orig = ship.jumpTransitData?.departurePoint || ship.jumpOrigin || ship.pos;
      const dest = ship.jumpTransitData?.destinationPoint || ship.jumpTarget || ship.pos;

      const [ox, oy] = worldToScreen(orig.x, orig.y, width, height);
      const [dx, dy] = worldToScreen(dest.x, dest.y, width, height);
      const [sx, sy] = worldToScreen(ship.pos.x, ship.pos.y, width, height);

      // High-speed tactical vector streak connecting origin star to destination star
      renderGalacticJumpConduit(ctx, { x: ox, y: oy }, { x: dx, y: dy }, { x: sx, y: sy }, nowMs);

      // Elongated Cherenkov visual trail extending 300px behind vessel along negative velocity vector
      const heading = Math.atan2(ship.velocity.y, ship.velocity.x) || ship.heading;
      renderCherenkovJumpTrail(ctx, sx, sy, heading, 300, nowMs);

      // Fast-moving tactical vector blip
      ctx.save();
      const isSelected = selectedShipIds && selectedShipIds.includes(ship.id);
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Telemetry callout
      ctx.font = 'bold 8.5px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      const speedKmS = ship.jumpTransitData?.jumpSpeed ? Math.round(ship.jumpTransitData.jumpSpeed) : 6400;
      ctx.fillText(`⚡ ${ship.name} [64x: ${speedKmS} km/s]`, sx, sy - 14);

      ctx.restore();
    } else if (ship.jumpState === 'SPOOLING') {
      const [sx, sy] = worldToScreen(ship.pos.x, ship.pos.y, width, height);
      const progress = Math.max(0, Math.min(1.0, 1.0 - (ship.jumpSpoolTimer ?? 0) / (ship.jumpSpoolDuration || 3.0)));
      renderCherenkovSpoolGlow(ctx, sx, sy, 10, progress, nowMs, false);

      ctx.save();
      ctx.font = 'bold 8.5px monospace';
      ctx.fillStyle = '#60a5fa';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ SPOOLING: ${ship.jumpSpoolTimer?.toFixed(1)}s`, sx, sy - 16);
      ctx.restore();
    }
  }
}

// Module-level or ref-backed scratch canvas to prevent per-frame DOM allocation
let fogCanvas: HTMLCanvasElement | null = null;
let fogCtx: CanvasRenderingContext2D | null = null;

function getFogBuffer(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!fogCanvas) {
    fogCanvas = document.createElement('canvas');
    fogCtx = fogCanvas.getContext('2d');
  }
  if (fogCanvas.width !== width || fogCanvas.height !== height) {
    fogCanvas.width = width;
    fogCanvas.height = height;
  }
  return fogCtx ? { canvas: fogCanvas, ctx: fogCtx } : null;
}

export function drawFogOfWarOverlay(
  mainCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camera: { x: number; y: number; zoom: number },
  playerEmitters: { x: number; y: number; radarR: number }[],
  state?: any
) {
  const buffer = getFogBuffer(width, height);
  if (!buffer) return;
  const { canvas: fCanvas, ctx: fCtx } = buffer;

  // 1. Reset offscreen buffer with ambient FOW darkness
  fCtx.save();
  fCtx.globalCompositeOperation = 'source-over';
  fCtx.clearRect(0, 0, width, height);
  fCtx.fillStyle = 'rgba(2, 6, 14, 0.55)'; // Deep tactical space haze
  fCtx.fillRect(0, 0, width, height);

  // 2. Carve out active radar bubbles strictly from the offscreen fog buffer
  fCtx.globalCompositeOperation = 'destination-out';

  // 2A. Player allied radar bubbles
  for (let i = 0; i < playerEmitters.length; i++) {
    const em = playerEmitters[i];
    const screenX = (em.x - camera.x) * camera.zoom + width / 2;
    const screenY = (em.y - camera.y) * camera.zoom + height / 2;
    const screenRadius = em.radarR * camera.zoom;

    if (screenRadius > 2) {
      const grad = fCtx.createRadialGradient(
        screenX, screenY, screenRadius * 0.7,
        screenX, screenY, screenRadius
      );
      grad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)'); // Full clear
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)'); // Soft edge falloff

      fCtx.fillStyle = grad;
      fCtx.beginPath();
      fCtx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      fCtx.fill();
    }
  }

  // 2B. Stellar illumination cutouts for each star system
  const systems = state?.systems || [];
  const starsToCut: { x: number; y: number; radius: number }[] = [];
  if (systems.length > 0) {
    for (let s = 0; s < systems.length; s++) {
      const sys = systems[s];
      const sx = sys.center ? sys.center.x : (sys.solarSystem?.star?.pos?.x ?? 0);
      const sy = sys.center ? sys.center.y : (sys.solarSystem?.star?.pos?.y ?? 0);
      const sr = sys.starRadius || sys.solarSystem?.star?.radius || 5500;
      starsToCut.push({ x: sx, y: sy, radius: sr });
    }
  } else if (state?.solarSystem?.star) {
    const st = state.solarSystem.star;
    starsToCut.push({ x: st.pos?.x ?? 0, y: st.pos?.y ?? 0, radius: st.radius || 5500 });
  }

  for (let s = 0; s < starsToCut.length; s++) {
    const star = starsToCut[s];
    const screenX = (star.x - camera.x) * camera.zoom + width / 2;
    const screenY = (star.y - camera.y) * camera.zoom + height / 2;

    // Pierce fog out to 3.5x star radius for natural solar glare
    const starRadius = (star.radius || 5500) * camera.zoom;
    const illuminationRadius = Math.max(8, starRadius * 3.5);

    const starHoleGrad = fCtx.createRadialGradient(
      screenX, screenY, starRadius * 0.6,
      screenX, screenY, illuminationRadius
    );
    starHoleGrad.addColorStop(0.0, 'rgba(0, 0, 0, 1.0)');  // 100% fog removal at core
    starHoleGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.85)'); // High clarity through inner corona
    starHoleGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');  // Soft falloff into deep-space haze

    fCtx.fillStyle = starHoleGrad;
    fCtx.beginPath();
    fCtx.arc(screenX, screenY, illuminationRadius, 0, Math.PI * 2);
    fCtx.fill();
  }
  fCtx.restore();

  // 3. Blit the punctured fog mask cleanly onto the main canvas
  mainCtx.save();
  mainCtx.globalCompositeOperation = 'source-over';
  mainCtx.drawImage(fCanvas, 0, 0);
  mainCtx.restore();

  // 4. Subtle cyan boundary line indicating radar coverage
  mainCtx.save();
  mainCtx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  mainCtx.lineWidth = 1;
  mainCtx.setLineDash([6, 6]);
  for (let i = 0; i < playerEmitters.length; i++) {
    const em = playerEmitters[i];
    const screenX = (em.x - camera.x) * camera.zoom + width / 2;
    const screenY = (em.y - camera.y) * camera.zoom + height / 2;
    const screenRadius = em.radarR * camera.zoom;
    if (screenRadius > 4) {
      mainCtx.beginPath();
      mainCtx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      mainCtx.stroke();
    }
  }
  mainCtx.restore();
}

export const TacticalCanvas: React.FC<TacticalCanvasProps> = ({
  engine,
  onSelectShip,
  selectedShipId,
  selectedShipIds = [],
  onSelectShips,
  cameraFocusTarget = null,
  onCameraFocusHandled,
  moveModeActive = false,
  onMoveModeHandled,
  jumpModeActive = false,
  onJumpModeHandled,
  buildStructureType = null,
  onBuildModeHandled,
  onOpenResearchModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Celestial Body (Planet) Selection & Hover State
  const [hoveredPlanet, setHoveredPlanet] = useState<RockyPlanet | GasGiant | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<RockyPlanet | GasGiant | null>(null);
  const hoveredPlanetRef = useRef<RockyPlanet | GasGiant | null>(null);
  const selectedPlanetRef = useRef<RockyPlanet | GasGiant | null>(null);

  // Dynamic Camera Bounds & Zoom Configuration:
  // minZoom = 0.00035 / sqrt(systemCount) (Single system: ~0.0008)
  // boundaryRadius = galaxyRadius + 200,000 km
  const systemCount = (engine as any).systems?.length || 1;
  const minZoom = calculateMinZoom(systemCount);
  const galaxyRadius = calculateGalaxyRadius(
    systemCount,
    (engine as any).config?.systemSpacing ?? 250000,
    (engine as any).systems
  );
  const boundaryRadius = calculateBoundaryRadius(galaxyRadius);
  const MAX_ZOOM = 2.5;

  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 0.38, // Normalized initial framing (0.95 / 2.5)
  });

  const [zoomLevel, setZoomLevel] = useState<number>(0.38);
  const isDraggingRef = useRef(false);
  const dragAnchorRef = useRef({ x: 0, y: 0 });
  const isDraggingMarqueeRef = useRef(false);
  const marqueeStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const marqueeCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseScreenRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseWorldRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const invalidPlacementFlashesRef = useRef<{ x: number; y: number; time: number }[]>([]);

  useEffect(() => {
    if (cameraFocusTarget) {
      cameraRef.current.x = cameraFocusTarget.x;
      cameraRef.current.y = cameraFocusTarget.y;
      onCameraFocusHandled?.();
    }
  }, [cameraFocusTarget, onCameraFocusHandled]);

  // Coordinate Conversion (Screen to World and World to Screen)
  // Maintains exact floating-point precision at all zoom extents:
  // screenX = (worldX - cam.x) * cam.zoom + width * 0.5
  // worldX  = (screenX - width * 0.5) / cam.zoom + cam.x
  const worldToScreen = useCallback((wX: number, wY: number, width: number, height: number): [number, number] => {
    const cam = cameraRef.current;
    const sX = (wX - cam.x) * cam.zoom + width * 0.5;
    const sY = (wY - cam.y) * cam.zoom + height * 0.5;
    return [sX, sY];
  }, []);

  const screenToWorld = useCallback((sX: number, sY: number, width: number, height: number): Vec2D => {
    const cam = cameraRef.current;
    return {
      x: (sX - width * 0.5) / cam.zoom + cam.x,
      y: (sY - height * 0.5) / cam.zoom + cam.y,
    };
  }, []);

  // Main Render Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const dt = Math.min(Math.max((currentTime - lastTime) / 1000, 0.001), 0.1);
      lastTime = currentTime;

      // Step simulation
      engine.update(dt);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawScene(ctx, canvas.width, canvas.height);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [engine, worldToScreen, screenToWorld, selectedShipId]);

  // Canvas Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Scene Drawing Function
  const drawScene = (ctx: CanvasRenderingContext2D, fullW: number, fullH: number) => {
    const dpr = window.devicePixelRatio || 1;
    const width = fullW / dpr;
    const height = fullH / dpr;
    const cam = cameraRef.current;

    // Clear Screen (Tactical Dark Canvas #080c12)
    ctx.fillStyle = '#080c12';
    ctx.fillRect(0, 0, width, height);

    // 1. Dynamic Tactical & Interstellar Void Background Grid Lines
    // Light grid lines spacing: 50,000 km at intermediate zoom, fading to 200,000 km at galactic zoom.
    let worldGridStep = 100;
    let gridStroke = '#0f1722';
    if (cam.zoom <= 0.0008) {
      worldGridStep = 200000; // 200,000 km at galactic zoom
      gridStroke = 'rgba(30, 41, 59, 0.45)';
    } else if (cam.zoom <= 0.003) {
      worldGridStep = 50000; // 50,000 km at intermediate zoom
      gridStroke = 'rgba(30, 41, 59, 0.4)';
    } else if (cam.zoom < 0.015) {
      worldGridStep = 15000;
      gridStroke = '#0f1722';
    } else if (cam.zoom < 0.05) {
      worldGridStep = 4000;
      gridStroke = '#0f1722';
    } else if (cam.zoom < 0.09) {
      worldGridStep = 2000;
      gridStroke = '#0f1722';
    } else if (cam.zoom < 0.16) {
      worldGridStep = 1000;
      gridStroke = '#0f1722';
    } else if (cam.zoom < 0.35) {
      worldGridStep = 500;
      gridStroke = '#0f1722';
    } else if (cam.zoom < 0.75) {
      worldGridStep = 250;
      gridStroke = '#0f1722';
    } else {
      worldGridStep = 100;
      gridStroke = '#0f1722';
    }

    const leftWorld = (0 - width * 0.5) / cam.zoom + cam.x;
    const rightWorld = (width - width * 0.5) / cam.zoom + cam.x;
    const topWorld = (0 - height * 0.5) / cam.zoom + cam.y;
    const bottomWorld = (height - height * 0.5) / cam.zoom + cam.y;

    const startGridX = Math.floor(leftWorld / worldGridStep) * worldGridStep;
    const endGridX = Math.ceil(rightWorld / worldGridStep) * worldGridStep;
    const startGridY = Math.floor(topWorld / worldGridStep) * worldGridStep;
    const endGridY = Math.ceil(bottomWorld / worldGridStep) * worldGridStep;

    ctx.strokeStyle = gridStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = startGridX; gx <= endGridX; gx += worldGridStep) {
      const [sx] = worldToScreen(gx, 0, width, height);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    for (let gy = startGridY; gy <= endGridY; gy += worldGridStep) {
      const [, sy] = worldToScreen(0, gy, width, height);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    if (cam.zoom <= 0.0008) {
      ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      for (let gx = startGridX; gx <= endGridX; gx += worldGridStep) {
        const [sx] = worldToScreen(gx, 0, width, height);
        if (sx >= 10 && sx <= width - 80) {
          ctx.fillText(`[${gx >= 0 ? '+' : ''}${Math.round(gx / 1000)}k km]`, sx + 4, height - 8);
        }
      }
    }

    // Secondary Coordinate Axis Cross at Sector Origin (0, 0)
    const [originX, originY] = worldToScreen(0, 0, width, height);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(originX - 16, originY);
    ctx.lineTo(originX + 16, originY);
    ctx.moveTo(originX, originY - 16);
    ctx.lineTo(originX, originY + 16);
    ctx.stroke();

    // 1.5. PROCEDURAL SOLAR SYSTEM(S) & ENHANCED CELESTIAL PASS
    const systemsToRender = ((engine as any).systems && (engine as any).systems.length > 0)
      ? (engine as any).systems
      : (engine as any).solarSystem
      ? [{
          id: 'SYS_0',
          center: (engine as any).solarSystem.star?.pos || { x: 0, y: 0 },
          starRadius: (engine as any).solarSystem.star?.radius || 5200,
          starColor: (engine as any).solarSystem.star?.color,
          solarSystem: (engine as any).solarSystem,
          planets: [
            ...((engine as any).solarSystem.rockyPlanets || []),
            ...((engine as any).solarSystem.gasGiants || []),
          ],
        }]
      : [];

    const camViewport = {
      x: cam.x,
      y: cam.y,
      zoom: cam.zoom,
      viewportWidth: width,
      viewportHeight: height,
    };

    const currentTick = (engine as any).simulationTick ?? (engine as any).tick ?? Math.round(((engine as any).time || 0) * 30);

    for (const sys of systemsToRender) {
      if (sys.solarSystem) {
        renderSolarSystem(ctx, sys.solarSystem, cam, width, height, worldToScreen, jumpModeActive, sys);
      }
      // Celestial pass: Call drawEnhancedSystemStar for each system's central star
      const starRadius = sys.starRadius || sys.solarSystem?.star?.radius || 5200;
      const starType = sys.starType || (
        sys.solarSystem?.star?.spectralClass?.startsWith('B') || sys.solarSystem?.star?.spectralClass?.startsWith('O')
          ? 'BLUE_GIANT'
          : sys.solarSystem?.star?.spectralClass?.startsWith('M')
          ? 'RED_DWARF'
          : 'YELLOW_DWARF'
      );
      drawEnhancedSystemStar(
        ctx,
        {
          x: sys.center?.x ?? sys.solarSystem?.star?.pos?.x ?? 0,
          y: sys.center?.y ?? sys.solarSystem?.star?.pos?.y ?? 0,
          radius: starRadius,
          starType,
        },
        camViewport,
        currentTick
      );

      // Celestial pass: Call drawEnhancedPlanet for each planet, passing sys.center as starCenter
      const starCenter = sys.center || sys.solarSystem?.star?.pos || { x: 0, y: 0 };
      const systemPlanets = (sys.planets && sys.planets.length > 0)
        ? sys.planets
        : [
            ...(sys.solarSystem?.rockyPlanets || []),
            ...(sys.solarSystem?.gasGiants || []),
          ];
      for (const planet of systemPlanets) {
        drawEnhancedPlanet(ctx, planet, starCenter, camViewport);
      }
    }

    // 2. Jump Gate Structure
    const jg = engine.jumpGate;
    const [jgX, jgY] = worldToScreen(jg.pos.x, jg.pos.y, width, height);
    const jgR = Math.max(jg.radius * cam.zoom, 8);

    ctx.save();
    ctx.strokeStyle = '#78a0dc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(jgX, jgY, jgR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#3c64a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(jgX, jgY, Math.max(jgR * 0.45, 4), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#6e8ca5';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    const jgText = jg.shuttingDown
      ? `JUMP GATE [300s SHUTDOWN: ${Math.round(jg.shutdownTimer)}s]`
      : 'JUMP GATE [ACTIVE / SYMMETRIC]';
    ctx.fillText(jgText, jgX, jgY + jgR + 14);
    ctx.restore();

    // 3. Selective Sensor / Radar Ring Rendering (None / Single / Multi-Lobed Fleet Union)
    const activeSelectedUnits: ShipEntity[] = [];
    if (selectedShipIds && selectedShipIds.length > 0) {
      for (const id of selectedShipIds) {
        const s = (engine.ships ?? []).find((ship) => ship && ship.id === id && ship.hullState !== 'DESTROYED');
        if (s && !activeSelectedUnits.includes(s)) {
          activeSelectedUnits.push(s);
        }
      }
    } else if (selectedShipId) {
      const s = (engine.ships ?? []).find((ship) => ship && ship.id === selectedShipId && ship.hullState !== 'DESTROYED');
      if (s) {
        activeSelectedUnits.push(s);
      }
    }

    // Render sensor envelope according to conditional rules:
    // - 0 selected: 0 rings drawn
    // Multi-lobed fleet sensor envelope (for >1 selected units)
    if (activeSelectedUnits.length > 1) {
      renderSensorOverlay(
        ctx,
        engine,
        activeSelectedUnits,
        width,
        height,
        cam,
        worldToScreen
      );
    }

    // Selected Ship / Fleet Tactical Range Reticles (Sensor Horizon, Missile Envelope, Defense Grid)
    if (activeSelectedUnits.length >= 1 && engine.config.showRangeRings) {
      renderTacticalRangeReticles(
        ctx,
        activeSelectedUnits,
        width,
        height,
        cam,
        worldToScreen,
        engine.combatModifiers
      );
    }

    // Hostile Continuous Patrol Route & Leash Visualization
    const selectedHostile = (activeSelectedUnits.length === 1 ? activeSelectedUnits[0] : engine.getSelectedShip());
    if (selectedHostile && selectedHostile.faction === 'HOSTILE') {
      const [selX, selY] = worldToScreen(selectedHostile.pos.x, selectedHostile.pos.y, width, height);

      // 1. NPC Patrol Anchor & Leash Zone Visualization
      if (selectedHostile.npcPatrolState) {
        const pState = selectedHostile.npcPatrolState;
        const [ancX, ancY] = worldToScreen(pState.anchorX, pState.anchorY, width, height);
        const distToAnchor = Math.hypot(selectedHostile.pos.x - pState.anchorX, selectedHostile.pos.y - pState.anchorY);

        ctx.save();
        // Anchor Marker
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(ancX, ancY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ancX - 7, ancY);
        ctx.lineTo(ancX + 7, ancY);
        ctx.moveTo(ancX, ancY - 7);
        ctx.lineTo(ancX, ancY + 7);
        ctx.stroke();

        // Patrol Radius Ring
        const patrolScreenR = pState.patrolRadius * cam.zoom;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(ancX, ancY, patrolScreenR, 0, Math.PI * 2);
        ctx.stroke();

        // 1.50x Pursuit Leash Ring
        const leashScreenR = pState.leashRadius * cam.zoom;
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(ancX, ancY, leashScreenR, 0, Math.PI * 2);
        ctx.stroke();

        // Current wander target vector
        if (pState.currentWanderTarget) {
          const [twX, twY] = worldToScreen(pState.currentWanderTarget.x, pState.currentWanderTarget.y, width, height);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(selX, selY);
          ctx.lineTo(twX, twY);
          ctx.stroke();
          ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
          ctx.beginPath();
          ctx.arc(twX, twY, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Telemetry Label
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `NPC: ${pState.behaviorState} | LEASH: ${distToAnchor.toFixed(0)}/${pState.leashRadius.toFixed(0)}km`,
          selX,
          selY + 28
        );
        ctx.restore();
      } else {
        // Fallback for waypoints array
        const patrolWps = selectedHostile.patrolWaypoints ?? selectedHostile.waypoints ?? [];
        if (patrolWps.length > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          const [w0x, w0y] = worldToScreen(patrolWps[0].x, patrolWps[0].y, width, height);
          ctx.moveTo(w0x, w0y);
          for (let i = 1; i < patrolWps.length; i++) {
            const [wx, wy] = worldToScreen(patrolWps[i].x, patrolWps[i].y, width, height);
            ctx.lineTo(wx, wy);
          }
          ctx.closePath();
          ctx.stroke();

          // Render patrol waypoint markers
          for (let i = 0; i < patrolWps.length; i++) {
            const [wx, wy] = worldToScreen(patrolWps[i].x, patrolWps[i].y, width, height);
            const isCurrent = i === selectedHostile.patrolWaypointIndex;
            ctx.fillStyle = isCurrent ? '#ef4444' : 'rgba(239, 68, 68, 0.4)';
            ctx.beginPath();
            ctx.arc(wx, wy, isCurrent ? 3.5 : 2, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = 'rgba(239, 68, 68, 0.75)';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`CONTINUOUS PATROL: ${selectedHostile.patrolPattern || 'ACTIVE WEAVE'}`, selX, selY + 28);
          ctx.restore();
        }
      }
    }

    // 3.5. Asteroid Field Deposits & HQ Docking Ring & Ore Transfer Range
    const hqStation = (engine.ships ?? []).find((s) => s && s.role === 'HQ' && s.hullState !== 'DESTROYED');
    if (hqStation) {
      const [hx, hy] = worldToScreen(hqStation.pos.x, hqStation.pos.y, width, height);
      const dockR = (hqStation.dockingRadius || 150.0) * cam.zoom;
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(hx, hy, dockR, 0, Math.PI * 2);
      ctx.stroke();

      // HQ Ore Transfer Boundary Range (R_transfer = 250 km / ~120px)
      const transferR = 250.0 * cam.zoom;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.38)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(hx, hy, transferR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HQ ORE TRANSFER RANGE (250 km)', hx, hy - transferR - 6);
      ctx.restore();
    }

    // 3. Render Asteroids (Zero-Allocation Flat Buffer Viewport Culling & Tier Batching)
    // In Galactic Deep-Zoom Tier (cam.zoom <= 0.0005), suppress fine asteroids to preserve 60 FPS
    const store = engine.asteroidSpatialStore;
    if (cam.zoom > 0.0005 && store && store.count > 0) {
      // Strict Camera Viewport Culling: evaluate AABB bounding box in world space
      const margin = 120 / cam.zoom;
      store.cullViewport(leftWorld, rightWorld, topWorld, bottomWorld, margin);

      if (cam.zoom < 0.08) {
        // Macro-Scale Tactical Blip Optimization: Batch render circular blips by tier
        // SMALL tier blips
        if (store.visibleCountSmall > 0) {
          ctx.fillStyle = '#71717a';
          ctx.beginPath();
          const r = 1.6;
          for (let i = 0; i < store.visibleCountSmall; i++) {
            const idx = store.visibleIndicesSmall[i];
            const [ax, ay] = worldToScreen(store.positions[idx * 2], store.positions[idx * 2 + 1], width, height);
            ctx.moveTo(ax + r, ay);
            ctx.arc(ax, ay, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }

        // MEDIUM tier blips
        if (store.visibleCountMedium > 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          const r = 2.2;
          for (let i = 0; i < store.visibleCountMedium; i++) {
            const idx = store.visibleIndicesMedium[i];
            const [ax, ay] = worldToScreen(store.positions[idx * 2], store.positions[idx * 2 + 1], width, height);
            ctx.moveTo(ax + r, ay);
            ctx.arc(ax, ay, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }

        // LARGE tier blips
        if (store.visibleCountLarge > 0) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          const r = 3.0;
          for (let i = 0; i < store.visibleCountLarge; i++) {
            const idx = store.visibleIndicesLarge[i];
            const [ax, ay] = worldToScreen(store.positions[idx * 2], store.positions[idx * 2 + 1], width, height);
            ctx.moveTo(ax + r, ay);
            ctx.arc(ax, ay, r, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      } else {
        // Full Vector Mesh Rendering: Batched by tier to eliminate context fillStyle / strokeStyle switching
        const tierBatches = [
          {
            tierName: 'SMALL' as const,
            indices: store.visibleIndicesSmall,
            count: store.visibleCountSmall,
            bodyFill: '#18181b',
            strokeColor: '#71717a',
            craterFill: 'rgba(0,0,0,0.4)',
            labelColor: '#a1a1aa',
          },
          {
            tierName: 'MEDIUM' as const,
            indices: store.visibleIndicesMedium,
            count: store.visibleCountMedium,
            bodyFill: '#27272a',
            strokeColor: '#38bdf8',
            craterFill: 'rgba(0,0,0,0.4)',
            labelColor: '#38bdf8',
          },
          {
            tierName: 'LARGE' as const,
            indices: store.visibleIndicesLarge,
            count: store.visibleCountLarge,
            bodyFill: '#334155',
            strokeColor: '#f59e0b',
            craterFill: 'rgba(245, 158, 11, 0.45)',
            labelColor: '#fbbf24',
          },
        ];

        for (const batch of tierBatches) {
          if (batch.count === 0) continue;

          for (let bIdx = 0; bIdx < batch.count; bIdx++) {
            const idx = batch.indices[bIdx];
            const ast = store.getEntity(idx);
            if (!ast || ast.oreRemaining <= 0) continue;

            const wx = store.positions[idx * 2];
            const wy = store.positions[idx * 2 + 1];
            const [ax, ay] = worldToScreen(wx, wy, width, height);
            const rot = store.rotations[idx] || ast.rotation || 0;
            const rad = (store.radii[idx] || ast.radius || 16) * cam.zoom;

            ctx.save();
            ctx.translate(ax, ay);
            ctx.rotate(rot);

            ctx.fillStyle = batch.bodyFill;
            ctx.strokeStyle = batch.strokeColor;
            ctx.lineWidth = 1.6;

            const facets = ast.facets ?? ast.vertices ?? [];
            if (facets.length > 0) {
              ctx.beginPath();
              for (let i = 0; i < facets.length; i++) {
                const pt = facets[i];
                if (!pt) continue;
                const fx = pt.x * cam.zoom;
                const fy = pt.y * cam.zoom;
                if (i === 0) ctx.moveTo(fx, fy);
                else ctx.lineTo(fx, fy);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }

            // Craters / ore veins
            const craters = ast.craters ?? [];
            if (craters.length > 0) {
              ctx.fillStyle = batch.craterFill;
              for (let cIdx = 0; cIdx < craters.length; cIdx++) {
                const c = craters[cIdx];
                if (!c) continue;
                ctx.beginPath();
                ctx.arc(c.x * cam.zoom, c.y * cam.zoom, (c.r || 3) * cam.zoom, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            ctx.restore();

            // Ore Node HUD Tag
            if (cam.zoom >= 0.04) {
              ctx.save();
              ctx.font = 'bold 8px monospace';
              ctx.textAlign = 'center';
              const remaining = store.oreRemaining[idx];
              const capacity = store.oreCapacity[idx] || 1;
              const pct = Math.round((remaining / capacity) * 100);
              ctx.fillStyle = batch.labelColor;
              ctx.fillText(`${batch.tierName} NODE [${remaining} ORE - ${pct}%]`, ax, ay + rad + 13);
              ctx.restore();
            }
          }
        }
      }
    }

    // --- Tactical Sensor Haze & Fog-of-War Pass (Offscreen Buffer Blit) ---
    const radarMult = (engine.radarMultiplier ?? engine.sensorRangeMult ?? 1.0);
    const passiveMult = (engine.passiveMultiplier ?? 1.0);
    const playerEmitters: { x: number; y: number; radarR: number; passiveR: number; systemId?: string }[] = [];
    const hqEmitter = (engine.ships ?? []).find((s) => s && s.role === 'HQ' && s.hullState !== 'DESTROYED') || (engine as any).hq || (engine as any).getHQ?.();
    let hqId: string | undefined;
    if (hqEmitter) {
      hqId = hqEmitter.id;
      const { activeRadarR, passiveSensorR } = calculateEntitySensors(14000, {
        radarMultiplier: radarMult,
        passiveMultiplier: passiveMult,
      });
      playerEmitters.push({
        x: hqEmitter.pos?.x ?? hqEmitter.x ?? 0,
        y: hqEmitter.pos?.y ?? hqEmitter.y ?? 0,
        radarR: hqEmitter.radarRadius || activeRadarR,
        passiveR: hqEmitter.passiveRadius || passiveSensorR,
        systemId: hqEmitter.systemId,
      });
    }
    for (let i = 0; i < (engine.ships ?? []).length; i++) {
      const s = engine.ships[i];
      if (!s || s.hullState === 'DESTROYED') continue;
      if (hqId && s.id === hqId) continue;
      const sFac = s.faction as string;
      if (sFac === 'PLAYER' || sFac === 'PLAYER_MINER' || sFac === 'FRIENDLY') {
        const baseRadar = s.baseRadar || getBaseRadarRadius(s);
        const { activeRadarR, passiveSensorR } = calculateEntitySensors(baseRadar, {
          radarMultiplier: radarMult,
          passiveMultiplier: passiveMult,
        });
        playerEmitters.push({
          x: s.pos?.x ?? s.x ?? 0,
          y: s.pos?.y ?? s.y ?? 0,
          radarR: s.radarRadius || activeRadarR,
          passiveR: s.passiveRadius || passiveSensorR,
          systemId: s.systemId,
        });
      }
    }
    if (Array.isArray((engine as any).structures)) {
      for (const st of (engine as any).structures) {
        if (!st || st.hullState === 'DESTROYED') continue;
        const isAllied = !st.faction || st.faction === 'PLAYER' || st.faction === 'FRIENDLY';
        if (isAllied) {
          const baseRadar = st.type === 'OUTPOST' || st.type === 'SENSOR_RELAY' ? 16000 : 8000;
          const { activeRadarR, passiveSensorR } = calculateEntitySensors(baseRadar, {
            radarMultiplier: radarMult,
            passiveMultiplier: passiveMult,
          });
          playerEmitters.push({
            x: st.pos?.x ?? st.x ?? 0,
            y: st.pos?.y ?? st.y ?? 0,
            radarR: st.radarRadius || activeRadarR,
            passiveR: st.passiveRadius || passiveSensorR,
            systemId: st.systemId,
          });
        }
      }
    }

    drawFogOfWarOverlay(ctx, width, height, cam, playerEmitters, engine);

    // 3.5. Stellar Corona Bloom (Additive Pass over FOW boundary)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const bloomStars: { x: number; y: number; radius: number }[] = [];
    if ((engine as any).systems && (engine as any).systems.length > 0) {
      for (const sys of (engine as any).systems) {
        const sx = sys.center ? sys.center.x : (sys.solarSystem?.star?.pos?.x ?? 0);
        const sy = sys.center ? sys.center.y : (sys.solarSystem?.star?.pos?.y ?? 0);
        const sr = sys.starRadius || sys.solarSystem?.star?.radius || 5500;
        bloomStars.push({ x: sx, y: sy, radius: sr });
      }
    } else if ((engine as any).solarSystem?.star) {
      const st = (engine as any).solarSystem.star;
      bloomStars.push({ x: st.pos?.x ?? 0, y: st.pos?.y ?? 0, radius: st.radius || 5500 });
    }

    for (let i = 0; i < bloomStars.length; i++) {
      const bStar = bloomStars[i];
      const screenX = (bStar.x - cam.x) * cam.zoom + width / 2;
      const screenY = (bStar.y - cam.y) * cam.zoom + height / 2;
      const screenR = Math.max(3.0, bStar.radius * cam.zoom);
      const coronaR = screenR * 4.0;

      if (screenX < -coronaR || screenX > width + coronaR || screenY < -coronaR || screenY > height + coronaR) {
        continue;
      }

      const coronaBloomGrad = ctx.createRadialGradient(screenX, screenY, screenR * 0.75, screenX, screenY, coronaR);
      coronaBloomGrad.addColorStop(0.0, 'rgba(255, 200, 80, 0.65)');
      coronaBloomGrad.addColorStop(0.3, 'rgba(255, 140, 30, 0.30)');
      coronaBloomGrad.addColorStop(0.7, 'rgba(255, 80, 10, 0.08)');
      coronaBloomGrad.addColorStop(1.0, 'rgba(255, 40, 0, 0.0)');

      ctx.fillStyle = coronaBloomGrad;
      ctx.beginPath();
      ctx.arc(screenX, screenY, coronaR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Ships & Vector Meshes
    const friendlies = (engine.ships ?? []).filter((s) => s && s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED');
    const missileLockRange = BASE_TACTICAL_RANGES.missileLockRangeKm * (engine.combatModifiers?.missileRangeMult ?? 1.0);
    const sensorHorizonRange = BASE_TACTICAL_RANGES.sensorRangeKm * (engine.sensorRangeMult ?? engine.combatModifiers?.sensorRangeMult ?? 1.0);
    const missileLockRangeSq = missileLockRange * missileLockRange;
    const sensorHorizonRangeSq = sensorHorizonRange * sensorHorizonRange;

    // 4. Ships & Naval Combat Entities
    // In Galactic Deep-Zoom Tier (Z <= 0.0005), suppress individual ship hulls to preserve 60 FPS,
    // rendering grouped high-level fleet markers with ship count indicators.
    if (cam.zoom <= 0.0005) {
      renderGalacticFleetMarkers(ctx, engine.ships, cam, width, height, worldToScreen, selectedShipIds);
      renderGalacticJumpShips(ctx, engine.ships, cam, width, height, worldToScreen, Date.now(), selectedShipIds);
    } else {
    for (const ship of engine.ships) {
      if (!ship) continue;
      if (ship.visibilityTier === 'NONE') continue;
      const [sx, sy] = worldToScreen(ship.pos.x, ship.pos.y, width, height);
      const hullSpec = getShipHullSpec(ship);
      const baseRadius = ship.radius ?? hullSpec.baseRadius;
      const r = baseRadius * cam.zoom;
      const angle = ship.heading;

      // Two-Tier Tactical Fog-of-War & Sensor Visibility Architecture
      if (ship.faction === 'HOSTILE') {
        let vis = ship.visibilityState;
        if (!vis) {
          let inRadar = false;
          let inPassive = false;
          const rR = BASE_TACTICAL_RANGES.radarRangeKm * (engine.sensorRangeMult ?? 1.0);
          const pR = BASE_TACTICAL_RANGES.passiveRangeKm * (engine.sensorRangeMult ?? 1.0);
          const rRSq = rR * rR;
          const pRSq = pR * pR;
          for (let fIdx = 0, fLen = friendlies.length; fIdx < fLen; fIdx++) {
            const f = friendlies[fIdx];
            const dSq = distSq(f.pos, ship.pos);
            if (dSq <= rRSq) {
              inRadar = true;
              break;
            }
            if (dSq <= pRSq) {
              inPassive = true;
            }
          }
          vis = inRadar ? 'RESOLVED' : inPassive ? 'BLIP_ONLY' : 'HIDDEN';
          ship.visibilityState = vis;
        }

        // 1. Beyond Passive Horizon (25,200 km) -> Completely hidden in deep fog of war
        if (vis === 'HIDDEN') {
          continue;
        }

        // 2. Destroyed Wrecks
        if (ship.hullState === 'DESTROYED') {
          if (vis !== 'RESOLVED') continue; // Hidden unless within active radar resolution
          ctx.strokeStyle = '#4b5055';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx - 10, sy - 10);
          ctx.lineTo(sx + 10, sy + 10);
          ctx.moveTo(sx + 10, sy - 10);
          ctx.lineTo(sx - 10, sy + 10);
          ctx.stroke();

          ctx.fillStyle = '#646e78';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('WRECK [10% SCRAP]', sx, sy + 18);
          continue;
        }

        // 3. Inside Passive Sensor Horizon (25,200 km) but outside Active Radar (8,400 km):
        // Suppress drawing the ship's vector hull geometry, name string, and health/shield bars.
        // Render a distinct tactical sensor blip at the target's world position:
        // Glowing amber/orange radar echo (#ff9900 or #ff7700) with diamond or circular pip,
        // 1px dashed ring pulsing slightly (radius ~10px to 18px), and monospace [CONTACT - UNRESOLVED BLIP].
        if (vis === 'BLIP_ONLY') {
          renderFogOfWarContactBlip(
            ctx,
            sx,
            sy,
            ship.rcsWeight || resolveRCSWeight(ship),
            ship.heading,
            Date.now()
          );
          continue;
        }
      }

      // Kinematic Burn Trajectory Line & Waypoint Marker
      if (ship.splineActive && ship.splineP1) {
        ctx.save();
        ctx.strokeStyle = ship.faction === 'FRIENDLY' ? '#00eba5' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const [px, py] = worldToScreen(ship.pos.x, ship.pos.y, width, height);
        const [destX, destY] = worldToScreen(ship.splineP1.x, ship.splineP1.y, width, height);
        ctx.moveTo(px, py);
        ctx.lineTo(destX, destY);
        ctx.stroke();

        // Target waypoint marker
        ctx.fillStyle = ship.faction === 'FRIENDLY' ? '#00eba5' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(destX, destY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4A. Active Jump Drive 64x Kinematic Transit & 300px Cherenkov Trail
      if (ship.jumpState === 'IN_TRANSIT' || ship.jumpState === 'TRANSIT') {
        const nowMs = Date.now();
        const headingRad = Math.atan2(ship.velocity.y, ship.velocity.x) || angle;

        // Draw elongated Cherenkov visual trail extending 300px along negative velocity vector
        renderCherenkovJumpTrail(ctx, sx, sy, headingRad, 300, nowMs);

        // Projected vector guide to destination
        const dest = ship.jumpTransitData?.destinationPoint || ship.jumpTarget;
        if (dest) {
          const [tx, ty] = worldToScreen(dest.x, dest.y, width, height);
          ctx.save();
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -nowMs * 0.04;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          // Destination target beacon
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(tx, ty, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Forward relativistic bow shock compression cone
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(18 * cam.zoom, 12), headingRad - Math.PI * 0.35, headingRad + Math.PI * 0.35);
        ctx.stroke();

        // HUD badge
        const jSpeed = ship.jumpTransitData?.jumpSpeed ? Math.round(ship.jumpTransitData.jumpSpeed) : 6400;
        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⚡ [64x KINEMATIC TRANSIT: ${jSpeed} km/s]`, sx, sy - 20);
        ctx.restore();
      }

      // 4B. Jump Drive Spool-up (3.0s / 90 ticks sequence): Blue-white Cherenkov charging glow & reticle
      if (ship.jumpState === 'SPOOLING') {
        const progress = Math.max(0, Math.min(1.0, 1.0 - (ship.jumpSpoolTimer ?? 0) / (ship.jumpSpoolDuration || 3.0)));
        const spoolRadius = Math.max(26 * cam.zoom, 18);
        const nowMs = Date.now();
        const isInterdicted = engine.isInsideInterdictionZone(ship.pos);

        renderCherenkovSpoolGlow(ctx, sx, sy, spoolRadius, progress, nowMs, isInterdicted);

        ctx.save();
        // Destination target guide
        if (ship.jumpTarget) {
          const [tx, ty] = worldToScreen(ship.jumpTarget.x, ship.jumpTarget.y, width, height);
          ctx.strokeStyle = isInterdicted ? 'rgba(239, 68, 68, 0.75)' : 'rgba(0, 240, 255, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -nowMs * 0.02;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          ctx.fillStyle = isInterdicted ? '#ef4444' : '#00f0ff';
          ctx.beginPath();
          ctx.arc(tx, ty, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Telemetry warning badge
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        if (isInterdicted) {
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`💥 INTERDICTION VIOLATION! [${ship.jumpSpoolTimer?.toFixed(1)}s]`, sx, sy - spoolRadius - 16);
          ctx.fillStyle = '#fca5a5';
          ctx.fillText(`FATAL BREACH ON SPOOL COMPLETION`, sx, sy - spoolRadius - 6);
        } else {
          ctx.fillStyle = '#00f0ff';
          ctx.fillText(`⚡ CHERENKOV SPOOL: ${ship.jumpSpoolTimer?.toFixed(1)}s [${Math.round(progress * 100)}%]`, sx, sy - spoolRadius - 12);
        }

        ctx.restore();
      }

      // Procedural Vector Ship Renderers or Macro Tactical Contact Reticles
      if (cam.zoom <= 0.0015) {
        // TIER 2: SYSTEM OVERVIEW TIER (0.0005 < Z <= 0.0015)
        // High-contrast ship contact chevron with role callout
        const arrowSize = 8.5;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        const factionColor = ship.faction === 'FRIENDLY' ? '#38bdf8' : '#ef4444';
        ctx.strokeStyle = factionColor;
        ctx.fillStyle = ship.faction === 'FRIENDLY' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(arrowSize + 2, 0);
        ctx.lineTo(-arrowSize, -arrowSize * 0.75);
        ctx.lineTo(-arrowSize * 0.35, 0);
        ctx.lineTo(-arrowSize, arrowSize * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.rotate(-angle);
        ctx.font = 'bold 8.5px monospace';
        ctx.fillStyle = factionColor;
        ctx.textAlign = 'center';
        const roleCode =
          ship.role === 'HQ' ? 'HQ' :
          ship.role === 'MINER' ? 'MNR' :
          ship.role === 'BUILDER' ? 'BLD' :
          ship.role === 'CRUISER' ? 'CRU' :
          ship.role === 'DESTROYER' ? 'DST' : 'FRG';
        ctx.fillText(roleCode, 0, -arrowSize - 3);
        ctx.restore();
      } else if (cam.zoom < 0.25) {
        const iconSize = Math.max(7, Math.round(11 * (cam.zoom / 0.25)));
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        const factionColor = ship.faction === 'FRIENDLY' ? '#38bdf8' : '#ef4444';
        ctx.strokeStyle = factionColor;
        ctx.lineWidth = 1.6;
        ctx.fillStyle = ship.faction === 'FRIENDLY' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.35)';
        ctx.beginPath();
        if (ship.role === 'HQ' || ship.role === 'SY_LIGHT' || ship.role === 'SY_MEDIUM' || ship.role === 'SY_HEAVY') {
          for (let i = 0; i < 6; i++) {
            const hAng = (i * Math.PI) / 3;
            const hx = Math.cos(hAng) * (iconSize + 3);
            const hy = Math.sin(hAng) * (iconSize + 3);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
        } else if (ship.role === 'MINER' || ship.role === 'BUILDER') {
          ctx.moveTo(iconSize + 3, 0);
          ctx.lineTo(-iconSize, -iconSize);
          ctx.lineTo(-iconSize * 0.4, 0);
          ctx.lineTo(-iconSize, iconSize);
          ctx.closePath();
        } else {
          ctx.moveTo(iconSize + 3, 0);
          ctx.lineTo(-iconSize, -iconSize * 0.85);
          ctx.lineTo(-iconSize * 0.35, 0);
          ctx.lineTo(-iconSize, iconSize * 0.85);
          ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        if (ship.isUnderConstruction) {
          ctx.globalAlpha = Math.max(0.15, Math.min(1.0, ship.constructionOpacity ?? 0.15));
        }
        renderProceduralShip(ctx, ship, r, Date.now());
        ctx.restore();

        // Holographic Blueprint Scan Overlay & Fabrication Ring
        if (ship.isUnderConstruction) {
          ctx.save();
          const scanR = Math.max(r * 2.2, 22);
          const rotScan = Date.now() * 0.002;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(sx, sy, scanR, rotScan, rotScan + Math.PI * 1.5);
          ctx.stroke();

          const prog = ship.constructionProgress || 0;
          if (ship.constructionState === 'BUILDING') {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.4;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(sx, sy, scanR + 4, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * prog);
            ctx.stroke();

            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'center';
            const depM = ship.depositedM ?? 0;
            const totM = ship.totalM ?? 0;
            const depO = ship.depositedO ?? 0;
            const totO = ship.totalO ?? 0;
            ctx.fillText(
              `FABRICATING: ${(prog * 100).toFixed(0)}% [${depM}/${totM}M • ${depO}/${totO}O]`,
              sx,
              sy - scanR - 10
            );
          } else if (ship.constructionState === 'PENDING_RESTOCK') {
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#f97316';
            ctx.textAlign = 'center';
            const progPct = (prog * 100).toFixed(0);
            ctx.fillText(`[HQ FERRY TRANCHE • ${progPct}%]`, sx, sy - scanR - 10);
          } else {
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#38bdf8';
            ctx.textAlign = 'center';
            const progPct = (prog * 100).toFixed(0);
            ctx.fillText(`[SCAFFOLD: TRANSLATING • ${progPct}%]`, sx, sy - scanR - 10);
          }
          ctx.restore();
        }
      }

      // Multi-Ship & Single-Ship Selection Reticle System
      const isSelected = selectedShipIds.length > 0
        ? selectedShipIds.includes(ship.id)
        : ship.id === selectedShipId;

      const isMulti = selectedShipIds.length > 1;
      const designatedFlagship = isMulti ? engine.getDesignatedFlagship() : null;
      const isFlagship = isMulti && designatedFlagship?.id === ship.id;

      if (isSelected) {
        ctx.save();
        const reticleRadius = Math.max(r * 2.3, 16);

        if (isMulti) {
          if (isFlagship) {
            // Distinctive Amber/Gold Flagship Corner Brackets
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.0;
            const bSize = reticleRadius + 4;
            const cLen = 7;

            // 4 Corner Brackets
            // TL
            ctx.beginPath();
            ctx.moveTo(sx - bSize, sy - bSize + cLen);
            ctx.lineTo(sx - bSize, sy - bSize);
            ctx.lineTo(sx - bSize + cLen, sy - bSize);
            // TR
            ctx.moveTo(sx + bSize - cLen, sy - bSize);
            ctx.lineTo(sx + bSize, sy - bSize);
            ctx.lineTo(sx + bSize, sy - bSize + cLen);
            // BL
            ctx.moveTo(sx - bSize, sy + bSize - cLen);
            ctx.lineTo(sx - bSize, sy + bSize);
            ctx.lineTo(sx - bSize + cLen, sy + bSize);
            // BR
            ctx.moveTo(sx + bSize - cLen, sy + bSize);
            ctx.lineTo(sx + bSize, sy + bSize);
            ctx.lineTo(sx + bSize, sy + bSize - cLen);
            ctx.stroke();

            // Inner Ring
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(sx, sy, reticleRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Flagship HUD Label
            ctx.font = 'bold 8.5px monospace';
            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'center';
            ctx.fillText('[FLAGSHIP]', sx, sy - bSize - 4);
          } else {
            // Escort Ship: Cyan Corner Brackets
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.4;
            const bSize = reticleRadius + 2;
            const cLen = 5;

            // 4 Corner Brackets
            // TL
            ctx.beginPath();
            ctx.moveTo(sx - bSize, sy - bSize + cLen);
            ctx.lineTo(sx - bSize, sy - bSize);
            ctx.lineTo(sx - bSize + cLen, sy - bSize);
            // TR
            ctx.moveTo(sx + bSize - cLen, sy - bSize);
            ctx.lineTo(sx + bSize, sy - bSize);
            ctx.lineTo(sx + bSize, sy - bSize + cLen);
            // BL
            ctx.moveTo(sx - bSize, sy + bSize - cLen);
            ctx.lineTo(sx - bSize, sy + bSize);
            ctx.lineTo(sx - bSize + cLen, sy + bSize);
            // BR
            ctx.moveTo(sx + bSize - cLen, sy + bSize);
            ctx.lineTo(sx + bSize, sy + bSize);
            ctx.lineTo(sx + bSize, sy + bSize - cLen);
            ctx.stroke();

            // Escort HUD Label
            ctx.font = '7.5px monospace';
            ctx.fillStyle = '#38bdf8';
            ctx.textAlign = 'center';
            ctx.fillText('[ESCORT]', sx, sy - bSize - 3);

            // Tether line connecting Escort to Flagship
            if (designatedFlagship && designatedFlagship.id !== ship.id) {
              const [fx, fy] = worldToScreen(designatedFlagship.pos.x, designatedFlagship.pos.y, width, height);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
              ctx.lineWidth = 1.0;
              ctx.setLineDash([4, 6]);
              ctx.beginPath();
              ctx.moveTo(fx, fy);
              ctx.lineTo(sx, sy);
              ctx.stroke();
            }
          }
        } else {
          // Standard Single-Ship Selection Ring
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, reticleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Fleet Defensive Umbrella Perimeter (PDPLA Range Circle)
      // When in Defensive Stance or Selected, visualize the 65km Point-Defense Umbrella envelope
      if (ship.combatStance === 'DEFENSIVE' || isSelected) {
        ctx.save();
        const pdScreenRadius = ship.pdplaRange * cam.zoom;
        const isDefensive = ship.combatStance === 'DEFENSIVE';
        const isOverheated = ship.pdplaOverheated;

        ctx.strokeStyle = isOverheated
          ? 'rgba(239, 68, 68, 0.25)'
          : isDefensive
          ? 'rgba(56, 189, 248, 0.28)'
          : 'rgba(56, 189, 248, 0.14)';
        ctx.lineWidth = isDefensive ? 1.2 : 0.8;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(sx, sy, pdScreenRadius, 0, Math.PI * 2);
        ctx.stroke();

        if (ship.id === selectedShipId && pdScreenRadius > 30) {
          ctx.font = '8px monospace';
          ctx.fillStyle = isOverheated ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.7)';
          ctx.fillText(
            isOverheated
              ? `[PD OVERHEATED: ${ship.pdplaOverheatTimer?.toFixed(1)}s]`
              : isDefensive
              ? `[FLEET DEFENSIVE UMBRELLA: ${Math.round(ship.pdplaRange)}km]`
              : `[PD RANGE: ${Math.round(ship.pdplaRange)}km]`,
            sx + pdScreenRadius * 0.707 + 4,
            sy - pdScreenRadius * 0.707
          );
        }
        ctx.restore();
      }

      // Thermal Deflector Shield Ring
      if (!ship.shieldOverheated && ship.shieldHp > 0) {
        ctx.save();
        const sRadius = Math.max(r * 1.9, 12);
        const shieldAlpha = 0.25 + 0.45 * (ship.shieldHp / ship.shieldHpMax);
        ctx.strokeStyle = `rgba(100, 200, 255, ${shieldAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, sRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // PDPLA Phased Array Laser Beam
      if (ship.pdplaActiveBeamTarget) {
        const [bx, by] = worldToScreen(ship.pdplaActiveBeamTarget.x, ship.pdplaActiveBeamTarget.y, width, height);
        ctx.save();
        ctx.strokeStyle = '#78dcff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#78dcff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();
      }

      // Direct-Fire Continuous Ruby Lasers
      if (ship.offensiveLaserActive && ship.offensiveLaserTarget) {
        const [lx, ly] = worldToScreen(ship.offensiveLaserTarget.x, ship.offensiveLaserTarget.y, width, height);
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(lx, ly);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(lx, ly);
        ctx.stroke();
        ctx.restore();
      }

      // Direct-Fire Relativistic Heavy Graser Beams
      if (ship.offensiveGraserActive && ship.offensiveGraserTarget) {
        const [gx, gy] = worldToScreen(ship.offensiveGraserTarget.x, ship.offensiveGraserTarget.y, width, height);
        ctx.save();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 4.0;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(gx, gy);
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#93c5fd';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.restore();
      }

      // Builder Nanite Assembly Welding Arc & Contact Sparks
      const isBuilderWelding =
        ship.role === 'BUILDER' &&
        (ship.builderState === 'STATE_CONSTRUCTING' ||
          ship.builderState === 'STATE_BUILDING' ||
          ship.builderState === 'BUILD_DEPOSIT_RESOURCES') &&
        ship.targetStructurePos;

      if (isBuilderWelding && ship.targetStructurePos) {
        const [tx, ty] = worldToScreen(ship.targetStructurePos.x, ship.targetStructurePos.y, width, height);
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 12;

        const jitter = (Math.sin(Date.now() * 0.05) + Math.random() - 0.5) * 6;
        const midX = (sx + tx) * 0.5 + jitter;
        const midY = (sy + ty) * 0.5 + jitter;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(midX, midY, tx, ty);
        ctx.stroke();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Contact Welding Sparks
        for (let s = 0; s < 4; s++) {
          const spAngle = Math.random() * Math.PI * 2;
          const spDist = 4 + Math.random() * 14;
          ctx.fillStyle = s % 2 === 0 ? '#f59e0b' : '#38bdf8';
          ctx.fillRect(tx + Math.cos(spAngle) * spDist, ty + Math.sin(spAngle) * spDist, 2, 2);
        }
        ctx.restore();
      }

      // Builder Logistics Route Vector
      const isHqBoundBuilder =
        ship.role === 'BUILDER' &&
        (ship.builderState === 'STATE_RETURNING_TO_HQ' ||
          ship.builderState === 'STATE_RESTOCK' ||
          ship.builderState === 'BUILD_FERRY_TO_HQ' ||
          ship.builderState === 'BUILD_RESUPPLY_AT_HQ');
      const isSiteBoundBuilder =
        ship.role === 'BUILDER' &&
        (ship.builderState === 'STATE_TRANSIT_TO_SCAFFOLD' ||
          ship.builderState === 'STATE_TRANSIT_SITE' ||
          ship.builderState === 'BUILD_TRANSIT_TO_SITE');

      if (isHqBoundBuilder || isSiteBoundBuilder) {
        const targetCoord = isHqBoundBuilder
          ? (engine.getHQ()?.pos ?? ship.targetStructurePos)
          : ship.targetStructurePos;
        if (targetCoord) {
          const [tx, ty] = worldToScreen(targetCoord.x, targetCoord.y, width, height);
          ctx.save();
          ctx.strokeStyle = isHqBoundBuilder
            ? 'rgba(245, 158, 11, 0.55)'
            : 'rgba(56, 189, 248, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -Date.now() * 0.02;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Repair Bay Restorative Nano-Aura (260px Radius)
      if (ship.role === 'REPAIR_BAY' && !ship.isUnderConstruction && ship.hullState === 'OPERATIONAL') {
        ctx.save();
        const auraScreen = 260.0 * cam.zoom;
        const pulse = Math.sin(Date.now() * 0.003) * 0.06 + 0.14;
        ctx.strokeStyle = `rgba(16, 185, 129, ${pulse * 2.2})`;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(sx, sy, auraScreen, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Support Craft Circular Interaction Field (radius: 200px) & Logistics Replenishment Tether
      if (
        ship.role === 'COLLIER' || ship.role === 'TANKER' || ship.role === 'REPAIR'
      ) {
        ctx.save();
        const fieldRadius = 200.0 * cam.zoom;
        const spd = Math.hypot(ship.velocity.x, ship.velocity.y);
        const isMoving = spd > 0.05;
        const isSelected = ship.id === selectedShipId;

        const fieldColor =
          ship.role === 'COLLIER'
            ? '#f59e0b'
            : ship.role === 'TANKER'
            ? '#0ea5e9'
            : '#10b981';

        // Circular Interaction Field Perimeter (radius: 200px)
        ctx.strokeStyle = fieldColor;
        ctx.lineWidth = isSelected ? 1.4 : 0.8;
        ctx.globalAlpha = isSelected ? 0.35 : 0.18;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(sx, sy, fieldRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Soft radial wash for selected or actively servicing support craft
        const hasActiveSupport = (ship.supportActiveTargets?.length ?? 0) > 0;
        if (isSelected || hasActiveSupport) {
          ctx.globalAlpha = 0.04;
          ctx.fillStyle = fieldColor;
          ctx.fill();
        }

        // Tactical HUD label on interaction field edge
        if (isSelected || hasActiveSupport) {
          ctx.globalAlpha = 0.85;
          ctx.font = '8px monospace';
          ctx.fillStyle = fieldColor;
          const roleLabel =
            ship.role === 'COLLIER'
              ? 'COLLIER AOE (20 MSSL/s)'
              : ship.role === 'TANKER'
              ? 'TANKER AOE (25 H2/s)'
              : 'REPAIR AOE (10 HP/s HULL)';
          const efficiencyLabel = isMoving ? '30% (70% MOVING PENALTY)' : '100% (COLD STOP)';
          ctx.fillText(`[${roleLabel} - ${efficiencyLabel}]`, sx - fieldRadius * 0.707, sy + fieldRadius * 0.707 + 10);
        }

        // Active Replenishment Tethers to nearby friendly hulls within 200px field
        const supportTargets = ship.supportActiveTargets ?? [];
        if (supportTargets.length > 0) {
          const tetherPulse = (Date.now() % 1000) / 1000;
          for (const targetId of supportTargets) {
            const recipient = (engine.ships ?? []).find((s) => s && s.id === targetId);
            if (recipient && recipient.hullState !== 'DESTROYED') {
              const [rx, ry] = worldToScreen(recipient.pos.x, recipient.pos.y, width, height);

              // Tether Energy Line
              ctx.strokeStyle = fieldColor;
              ctx.lineWidth = 1.6;
              ctx.globalAlpha = 0.75;
              ctx.setLineDash([6, 4]);
              ctx.lineDashOffset = -tetherPulse * 20;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(rx, ry);
              ctx.stroke();

              // Energy Transfer Pulses
              const px = sx + (rx - sx) * tetherPulse;
              const py = sy + (ry - sy) * tetherPulse;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(px, py, 2.5, 0, Math.PI * 2);
              ctx.fill();

              // Transfer rate tag above recipient
              ctx.font = 'bold 8px monospace';
              ctx.fillStyle = fieldColor;
              ctx.textAlign = 'center';
              const rateTag =
                ship.role === 'COLLIER'
                  ? `+${isMoving ? '6' : '20'} MSSL/s`
                  : ship.role === 'TANKER'
                  ? `+${isMoving ? '7.5' : '25'} H2/s`
                  : `+${isMoving ? '3' : '10'} HULL/s`;
              ctx.fillText(rateTag, rx, ry - 22);
            }
          }
        }
        ctx.restore();
      }

      // Floating Mini Status Bars
      const barW = 44;
      const barX = sx - barW / 2;
      const barY = sy - r * 2.2;

      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(barX, barY, barW, 4);

      if (ship.hullState === 'OPERATIONAL') {
        const hRatio = Math.max(Math.min(ship.hullHp / ship.hullMax, 1), 0);
        ctx.fillStyle = '#b4c3d2';
        ctx.fillRect(barX, barY, barW * hRatio, 4);
      } else if (ship.hullState === 'CRIPPLED') {
        const cRatio = Math.max(Math.min(ship.crippleBar / ship.crippleBarMax, 1), 0);
        ctx.fillStyle = '#ff3232';
        ctx.fillRect(barX, barY, barW * cRatio, 4);
      }

      // Radiator Heat Bar
      const heatRatio = Math.max(Math.min(ship.shieldHeat / ship.shieldHeatMax, 1), 0);
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(barX, barY + 5, barW, 3);
      ctx.fillStyle = ship.shieldOverheated ? '#ff3c3c' : '#ff781e';
      ctx.fillRect(barX, barY + 5, barW * heatRatio, 3);

      // Point-Defense Overload System: Heat / Cooldown Bar Above Ship While Cooling Down
      if (ship.pdplaOverheated && (ship.pdplaOverheatTimer || 0) > 0) {
        const pdBarW = 40;
        const pdBarX = sx - pdBarW / 2;
        const pdBarY = barY - 17;
        const pdDuration = ship.pdplaOverheatDuration || 3.0;
        const cooldownRatio = Math.max(Math.min((ship.pdplaOverheatTimer || 0) / pdDuration, 1.0), 0.0);

        ctx.save();
        // Background track with red warning outline
        ctx.fillStyle = 'rgba(15, 8, 8, 0.9)';
        ctx.fillRect(pdBarX - 1, pdBarY - 1, pdBarW + 2, 5);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(pdBarX - 1, pdBarY - 1, pdBarW + 2, 5);

        // Pulsing thermal gradient fill
        const isPulse = Math.floor(Date.now() / 100) % 2 === 0;
        const grad = ctx.createLinearGradient(pdBarX, pdBarY, pdBarX + pdBarW * cooldownRatio, pdBarY);
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(1, '#ef4444');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = isPulse ? 6 : 2;
        ctx.fillRect(pdBarX, pdBarY, pdBarW * cooldownRatio, 3);

        // Lockout countdown label
        ctx.shadowBlur = 0;
        ctx.font = 'bold 7.5px monospace';
        ctx.fillStyle = isPulse ? '#fb923c' : '#f87171';
        ctx.textAlign = 'center';
        ctx.fillText(`PD OVERHEAT ${ship.pdplaOverheatTimer?.toFixed(1)}s`, sx, pdBarY - 3);
        ctx.restore();
      } else if ((ship.pdplaSalvoCount || 0) > 0) {
        // Subtle burst indicator pips (1 to 4 bursts) before reaching 5
        const pipsCount = ship.pdplaSalvoCount || 0;
        const pipW = 4;
        const pipGap = 2;
        const totalPipsW = 5 * pipW + 4 * pipGap;
        const pipsStartX = sx - totalPipsW / 2;
        const pipsY = barY - 14;

        ctx.save();
        for (let p = 0; p < 5; p++) {
          const px = pipsStartX + p * (pipW + pipGap);
          if (p < pipsCount) {
            ctx.fillStyle = pipsCount >= 4 ? '#ef4444' : '#f59e0b';
          } else {
            ctx.fillStyle = 'rgba(50, 60, 75, 0.4)';
          }
          ctx.fillRect(px, pipsY, pipW, 2.5);
        }
        ctx.restore();
      }

      // Mini Name Tag
      const labelColor =
        ship.hullState === 'CRIPPLED'
          ? '#ff4444'
          : ship.faction === 'FRIENDLY'
          ? '#38bdf8'
          : '#f43f5e';
      ctx.fillStyle = labelColor;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${ship.name}`, sx, barY - 4);

      // Combat Stance & Role Tactical Indicator Tag
      {
        const stance = ship.combatStance || 'DEFENSIVE';
        const stanceColor =
          stance === 'PASSIVE' ? '#34d399' : stance === 'DEFENSIVE' ? '#60a5fa' : '#f43f5e';
        let extra = '';
        if (ship.role === 'SCRAP') {
          extra = ` SCRAP ${ship.scrapStored ?? 0}/5K`;
        } else if (ship.role === 'BUILDER') {
          extra = ' BUILDER 5K/5K';
        } else if (ship.role === 'COLLIER') {
          extra = ' COLLIER';
        } else if (ship.role === 'TANKER') {
          extra = ' TANKER';
        } else if (ship.role === 'REPAIR') {
          extra = ' REPAIR';
        } else if (ship.role === 'MINER' || (ship as any).isMiningVessel) {
          const stanceMode = ship.minerStance !== 'CARELESS' ? 'TIMID' : 'CARELESS';
          const clampedTag = (ship as any).minerClamped ? ' • TETHERED' : '';
          const retreatTag = (ship as any).minerRetreating ? ' • EVADING' : '';
          extra = ` MINER ${Math.round(ship.cargoOre || 0)}/1K [${ship.minerState?.replace('STATE_', '') || 'IDLE'} | ${stanceMode}${clampedTag}${retreatTag}]`;
        } else if (ship.role === 'HQ') {
          extra = ' HQ CITADEL';
        } else if (ship.role === 'BASTION' || ship.isPirateBastion) {
          extra = ' PIRATE BASTION';
        } else if (ship.isRovingPirate) {
          extra = ' ROVING CORSAIR';
        } else if (ship.role === 'HEAVY_CRUISER') {
          extra = ' CORSAIR CRUISER';
        } else if (ship.role === 'FRIGATE') {
          extra = ' CORSAIR FRIGATE';
        } else if (ship.role === 'SY_LIGHT' || ship.role === 'SY_MEDIUM' || ship.role === 'SY_HEAVY') {
          const qCount = ship.productionQueue?.length || 0;
          extra = ` SHIPYARD${qCount > 0 ? ` [${qCount} QUEUED]` : ''}`;
        }
        if (ship.inGravityWell && ship.gravityWellBody) {
          const isMinerTransit = (ship.role === 'MINER' || (ship as any).isMiningVessel) && !(ship as any).minerClamped;
          if (isMinerTransit) {
            extra += ` • GW: ${ship.gravityWellBody} [TRANSIT-EXEMPT]`;
          } else {
            extra += ` • GW: ${ship.gravityWellBody}${ship.isMoored ? ' [MOORED]' : ' [CAPTURED]'}`;
          }
        }
        const stanceLabel = stance === 'PASSIVE' ? 'PAS' : stance === 'DEFENSIVE' ? 'DEF' : 'AGG';

        ctx.save();
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = stanceColor;
        ctx.fillText(`[${stanceLabel}${extra}]`, sx, barY + 16);
        ctx.restore();
      }

      // Planetary, Lunar & Asteroid Cluster Gravity Well Tagged Status Indicator
      if (ship.inGravityWell) {
        ctx.save();
        ctx.strokeStyle = ship.isMoored ? 'rgba(56, 189, 248, 0.75)' : 'rgba(245, 158, 11, 0.70)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(r * 2.2, 16), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // FTL Jump Cooldown indicator
      if (ship.jumpCooldownTimer && ship.jumpCooldownTimer > 0 && selectedShipId === ship.id) {
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`⏳ JUMP RECHARGE: ${ship.jumpCooldownTimer.toFixed(1)}s`, sx, sy + (r * 2.2) + 20);
        ctx.restore();
      }
    }
    } // End of else (cam.zoom > 0.0005)

    // 4.5. Active Autonomous Mining Laser Beams (Tactical Close Tier: Z > 0.0015)
    if (cam.zoom > 0.0015) {
    for (const ship of (engine.ships ?? [])) {
      if (!ship) continue;
      if (ship.miningLaserActive && ship.miningLaserTarget && ship.hullState === 'OPERATIONAL') {
        const [sx, sy] = worldToScreen(ship.pos.x, ship.pos.y, width, height);
        const [tx, ty] = worldToScreen(ship.miningLaserTarget.x, ship.miningLaserTarget.y, width, height);

        ctx.save();
        // Wide energy corona
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 3.5 * cam.zoom;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Hot focused extraction core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2 * cam.zoom;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Impact spark flare on asteroid
        const sparkPulse = 3 + Math.sin(Date.now() * 0.02) * 2;
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(tx, ty, sparkPulse * cam.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    } // End of if (cam.zoom > 0.0015) mining lasers

    // 4.6. Active Industrial Ore Offload Transfer Conduit / Beam (STATE_DOCKING_OFFLOAD)
    if (cam.zoom > 0.0015) {
    for (const ship of (engine.ships ?? [])) {
      if (!ship) continue;
      if (
        (ship.transferBeamActive || ship.isStationKeeping || ship.minerState === 'STATE_DOCKING_OFFLOAD' || ship.minerState === 'STATE_UNLOAD') &&
        ship.transferBeamTarget &&
        ship.hullState !== 'DESTROYED'
      ) {
        const [sx, sy] = worldToScreen(ship.pos.x, ship.pos.y, width, height);
        const [tx, ty] = worldToScreen(ship.transferBeamTarget.x, ship.transferBeamTarget.y, width, height);

        ctx.save();
        // Pulsing amber/cyan industrial magnetic containment sleeve
        const pulsePhase = (Date.now() * 0.005) % 1;
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
        ctx.lineWidth = 3.5 * cam.zoom;
        ctx.setLineDash([6 * cam.zoom, 4 * cam.zoom]);
        ctx.lineDashOffset = -Date.now() * 0.03;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        // Core high-density ore transfer stream
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8 * cam.zoom;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // High-density particulate flow packets along conduit
        for (let p = 0; p < 4; p++) {
          const t = (pulsePhase + p * 0.25) % 1.0;
          const px = sx + (tx - sx) * t;
          const py = sy + (ty - sy) * t;
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, 2.5 * cam.zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Emitter collar flare on prospector
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5 * cam.zoom, 0, Math.PI * 2);
        ctx.fill();

        // Silo receiver flare on HQ
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(tx, ty, 5.0 * cam.zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
    } // End of if (cam.zoom > 0.0015) transfer beam

    // 5. STRUCT OF ARRAYS (SOA) BATCHED ORDNANCE RENDER PASS
    // Zero-allocation batched draw calls for 10,000+ active missiles & CMs
    if (engine.ordnanceSOA && (engine.ordnanceSOA.missiles.activeCount > 0 || engine.ordnanceSOA.cms.activeCount > 0)) {
      renderOrdnanceBatched(
        ctx,
        engine.ordnanceSOA.missiles,
        engine.ordnanceSOA.cms,
        {
          x: cam.x,
          y: cam.y,
          zoom: cam.zoom,
          viewportWidth: width,
          viewportHeight: height,
        }
      );
    }

    // 5b. Legacy Object-Oriented Missiles (if any remain)
    if (cam.zoom > 0.0005 && Array.isArray(engine.missiles)) {
      for (const m of engine.missiles) {
        if (!m) continue;
        if (m.visibilityTier === 'NONE') continue;
        const target = (engine.ships ?? []).find((s) => s && s.id === m.targetId);
        if (!target && !m.isSpoofed && m.status !== 'SPOOFED' && m.status !== 'OVERFLIGHT' && !m.fuelExhausted) continue;

        // --- 1. COSMETIC SINE-WAVE JINKING PARAMETERS ---
        // Extract numeric missile ID for static phase offset: phi = (missile.id * 137.5) % Math.PI
        const numId = parseInt(m.id.replace(/\D/g, '') || '1', 10);
        const phi = (numId * 137.5) % Math.PI;

        // Angular frequency: rapid weave (omega = 0.25 rad/tick)
        const omega = 0.25;
        const currentTick = engine.tickCount;

        // Amplitude: Light Missiles = 6px; Medium Missiles = 10px; Heavy/Dreadnought Missiles = 16px
        let amplitude = 10;
        if (m.missileClass === 'LIGHT') {
          amplitude = 6;
        } else if (m.missileClass === 'HEAVY') {
          amplitude = 16;
        } else if (m.damage >= 240) {
          amplitude = 16;
        } else if (m.damage <= 120) {
          amplitude = 6;
        }

        // Calculate normal vector (-vy, vx) normalized
        const heading = m.heading ?? (target ? Math.atan2(target.pos.y - m.pos.y, target.pos.x - m.pos.x) : 0);
        const vx = Math.cos(heading);
        const vy = Math.sin(heading);
        const nx = -vy;
        const ny = vx;

        // Cosmetic displacement for the warhead head: scale by (Amplitude * sin(currentTick * omega + phi))
        const headWave = Math.sin(currentTick * omega + phi);
        const headDispX = nx * (amplitude * headWave);
        const headDispY = ny * (amplitude * headWave);

        const rPos = m.isSpoofed || m.status === 'SPOOFED' || m.status === 'OVERFLIGHT' || m.fuelExhausted || !target
          ? m.pos
          : engine.getMissileRenderPos(m, target);
        const [baseSpX, baseSpY] = worldToScreen(rPos.x, rPos.y, width, height);
        const spX = baseSpX + headDispX;
        const spY = baseSpY + headDispY;

        // --- 2. BALLISTIC EXHAUST TRAILS (DISPLACED CORKSCREW PATH) ---
        const mTrail = m.trail ?? [];
        if (mTrail.length >= 1) {
          ctx.save();
          const displacedTrail: { x: number; y: number; factor: number }[] = [];
          for (let i = 0; i < mTrail.length; i++) {
            const p = mTrail[i];
            if (!p) continue;
            const [pBaseX, pBaseY] = worldToScreen(p.x, p.y, width, height);
            const ticksBack = mTrail.length - i;
            const trailTick = currentTick - ticksBack;
            const trailWave = Math.sin(trailTick * omega + phi);
            const ptScreenX = pBaseX + nx * (amplitude * trailWave);
            const ptScreenY = pBaseY + ny * (amplitude * trailWave);
            displacedTrail.push({
              x: ptScreenX,
              y: ptScreenY,
              factor: (i + 1) / (mTrail.length + 1),
            });
          }
          // Final segment connects smoothly to displaced warhead position
          displacedTrail.push({
            x: spX,
            y: spY,
            factor: 1.0,
          });

          for (let i = 0; i < displacedTrail.length - 1; i++) {
            const p1 = displacedTrail[i];
            const p2 = displacedTrail[i + 1];
            const factor = p2.factor;

            if (m.fuelExhausted) {
              // Unpowered coast: faint, smoky residual exhaust trail
              ctx.strokeStyle = `rgba(148, 163, 184, ${0.12 + 0.35 * factor})`;
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 3]);
            } else if (m.status === 'SPOOFED' || m.isSpoofed) {
              // Flickering, faded amber trail along deflected runaway trajectory
              const flicker = (0.25 + 0.35 * Math.sin(Date.now() * 0.04 + i * 1.5)) * factor;
              ctx.strokeStyle = `rgba(245, 158, 11, ${flicker})`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
            } else if (m.status === 'OVERFLIGHT') {
              // High-speed ballistic overflight streak past target
              ctx.strokeStyle = `rgba(56, 189, 248, ${0.25 + 0.65 * factor})`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 2]);
            } else {
              if (m.faction === 'FRIENDLY') {
                ctx.strokeStyle = `rgba(147, 197, 253, ${0.25 + 0.75 * factor})`;
                ctx.lineWidth = factor > 0.5 ? 2 : 1;
              } else {
                ctx.strokeStyle = `rgba(239, 68, 68, ${0.25 + 0.75 * factor})`;
                ctx.lineWidth = factor > 0.5 ? 2 : 1;
              }
              ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // --- 3. Z=0 GROUND SHADOW ---
        const [gX, gY] = worldToScreen(m.pos.x, m.pos.y, width, height);
        ctx.save();
        ctx.strokeStyle = m.fuelExhausted
          ? 'rgba(100, 116, 139, 0.25)'
          : (m.status === 'SPOOFED' || m.isSpoofed)
          ? 'rgba(180, 120, 40, 0.25)'
          : m.status === 'OVERFLIGHT'
          ? 'rgba(56, 189, 248, 0.25)'
          : 'rgba(40, 60, 80, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(spX, spY);
        ctx.lineTo(gX, gY);
        ctx.stroke();

        ctx.fillStyle = m.fuelExhausted
          ? 'rgba(100, 116, 139, 0.35)'
          : (m.status === 'SPOOFED' || m.isSpoofed)
          ? 'rgba(180, 120, 40, 0.35)'
          : m.status === 'OVERFLIGHT'
          ? 'rgba(56, 189, 248, 0.35)'
          : 'rgba(50, 70, 90, 0.6)';
        ctx.beginPath();
        ctx.arc(gX, gY, 2, 0, Math.PI * 2);
        ctx.fill();

        // --- 4. MISSILE WARHEAD HEAD & HUD TELEMETRY BADGES ---
        if (m.fuelExhausted) {
          // Engine flamed out, tracking lost: blinking amber/red alert beacon
          const isBlink = Math.floor(Date.now() / 90) % 2 === 0;
          ctx.fillStyle = isBlink ? '#ef4444' : '#f97316';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = isBlink ? 8 : 2;
          ctx.beginPath();
          ctx.arc(spX, spY, 2.8, 0, Math.PI * 2);
          ctx.fill();

          const remainingSec = Math.max(0, 1.0 - (m.burnoutTimer || 0));
          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = isBlink ? '#f87171' : '#fb923c';
          ctx.fillText(
            `[FLAMEOUT: TRACKING LOST ${remainingSec.toFixed(1)}s]`,
            spX + 6,
            spY - 6
          );
        } else if (m.status === 'SPOOFED' || m.isSpoofed) {
          // E-War Spoofed Runaway Flight: Amber strobe & runaway deflection countdown
          const isBlink = Math.floor(Date.now() / 75) % 2 === 0;
          ctx.fillStyle = isBlink ? '#f59e0b' : 'rgba(245, 158, 11, 0.35)';
          ctx.shadowColor = '#d97706';
          ctx.shadowBlur = isBlink ? 8 : 1;
          ctx.beginPath();
          ctx.arc(spX, spY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          const remainSec = Math.max(0, m.selfDestructTimer ?? (3.0 - (m.spoofedTimer || 0)));
          ctx.font = '8px monospace';
          ctx.fillStyle = isBlink ? '#fbbf24' : '#d97706';
          ctx.fillText(
            `[SPOOFED ${m.spoofedDeflectionDeg ? `${m.spoofedDeflectionDeg}° ` : ''}RUNAWAY ${remainSec.toFixed(1)}s]`,
            spX + 6,
            spY - 6
          );
        } else if (m.status === 'OVERFLIGHT') {
          // Ballistic Overflight: Cyan strobe & 1.5s countdown to safe kinetic self-destruct
          const isBlink = Math.floor(Date.now() / 80) % 2 === 0;
          ctx.fillStyle = isBlink ? '#38bdf8' : '#0284c7';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(spX, spY, 2.8, 0, Math.PI * 2);
          ctx.fill();

          const remainSec = Math.max(0, m.overflightTimer ?? 1.5);
          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = isBlink ? '#7dd3fc' : '#38bdf8';
          ctx.fillText(
            `[OVERFLIGHT: MISS ${remainSec.toFixed(1)}s]`,
            spX + 6,
            spY - 6
          );
        } else {
          // Active tracking warhead
          const isFriendly = m.faction === 'FRIENDLY';
          ctx.fillStyle = isFriendly ? '#93c5fd' : '#ef4444';
          ctx.shadowColor = isFriendly ? '#60a5fa' : '#dc2626';
          ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.arc(spX, spY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Fuel percentage telemetry when zoomed in
          if (cam.zoom > 1.2 && m.maxPoweredDistance > 0) {
            const fuelPct = Math.max(0, Math.round((1 - m.distanceTraveled / m.maxPoweredDistance) * 100));
            ctx.font = '7px monospace';
            ctx.fillStyle = fuelPct < 25 ? '#f87171' : (isFriendly ? 'rgba(147, 197, 253, 0.9)' : 'rgba(248, 113, 113, 0.9)');
            ctx.fillText(`F:${fuelPct}%`, spX + 5, spY + 8);
          }
        }
        ctx.restore();
      }
    }

    // 6. Counter-Missiles
    if (Array.isArray(engine.counterMissiles)) {
      for (const cm of engine.counterMissiles) {
        if (!cm) continue;
        const [cmX, cmY] = worldToScreen(cm.pos.x, cm.pos.y, width, height);
        ctx.save();
        ctx.fillStyle = '#96ffc8';
        ctx.shadowColor = '#50dc8c';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(cmX, cmY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 7. Space Detonations (Harmless E-War & Kinetic Dispersals in empty space)
    if (Array.isArray(engine.detonations)) {
      for (const det of engine.detonations) {
      const [dx, dy] = worldToScreen(det.pos.x, det.pos.y, width, height);
      const progress = Math.min(det.timer / det.duration, 1.0);
      const curRadius = det.maxRadius * (0.15 + 0.85 * Math.sin(progress * Math.PI * 0.5)) * cam.zoom;
      const alpha = Math.max((1.0 - progress) * 0.85, 0);

      const isBurnout = det.type === 'FUEL_EXHAUSTION';
      const ringColor = isBurnout ? `rgba(249, 115, 22, ${alpha})` : `rgba(251, 191, 36, ${alpha})`;
      const coreColor = isBurnout ? `rgba(254, 215, 170, ${alpha * 0.55})` : `rgba(255, 240, 180, ${alpha * 0.45})`;

      ctx.save();
      // Outer expanding shockwave ring
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dx, dy, Math.max(curRadius, 1), 0, Math.PI * 2);
      ctx.stroke();

      // Secondary shock ring
      ctx.strokeStyle = isBurnout ? `rgba(239, 68, 68, ${alpha * 0.6})` : `rgba(245, 158, 11, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(dx, dy, Math.max(curRadius * 0.65, 1), 0, Math.PI * 2);
      ctx.stroke();

      // Core flash
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(dx, dy, Math.max(curRadius * 0.3, 1), 0, Math.PI * 2);
      ctx.fill();

      // HUD telemetry badge
      if (progress < 0.65) {
        ctx.fillStyle = isBurnout ? `rgba(251, 146, 60, ${alpha})` : `rgba(251, 191, 36, ${alpha})`;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(det.label || (isBurnout ? '[FUEL EXHAUSTION DETONATION]' : '[SPACE DETONATION]'), dx, dy - curRadius - 4);
      }
      ctx.restore();
    }
    }

    // 8. JUMP TARGETING HUD & HYDROGEN ESTIMATOR (Interactive Cursor Overlay)
    if (jumpModeActive && selectedShipId) {
      const ship = (engine.ships ?? []).find((s) => s && s.id === selectedShipId);
      if (ship && ship.hullState === 'OPERATIONAL' && !ship.isStationary) {
        const mouseScreen = mouseScreenRef.current;
        const worldMouse = mouseWorldRef.current;
        const [originX, originY] = worldToScreen(ship.pos.x, ship.pos.y, width, height);

        const isOriginInterdicted = engine.isInsideInterdictionZone(ship.pos);
        const isTargetInterdicted = engine.isInsideInterdictionZone(worldMouse);
        const targetDist = Math.hypot(worldMouse.x - ship.pos.x, worldMouse.y - ship.pos.y);
        const fuelCost = engine.calculateJumpCost(ship.pos, worldMouse);
        const hasEnoughFuel = ship.h2Fuel >= fuelCost;
        const isOnCooldown = (ship.jumpCooldownTimer ?? 0) > 0;
        const isSpooling = ship.jumpState === 'SPOOLING' || ship.jumpState === 'TRANSIT';

        const isValid = !isOriginInterdicted && !isTargetInterdicted && hasEnoughFuel && !isOnCooldown && !isSpooling;

        ctx.save();

        // A. Dynamic Targeting Vector Line
        const vectorColor = isValid ? '#38bdf8' : '#ef4444';
        ctx.strokeStyle = vectorColor;
        ctx.lineWidth = isValid ? 2.0 : 1.5;
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -Date.now() * 0.025;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(mouseScreen.x, mouseScreen.y);
        ctx.stroke();

        // Subtle glow along targeting vector
        ctx.strokeStyle = isValid ? 'rgba(56, 189, 248, 0.22)' : 'rgba(239, 68, 68, 0.22)';
        ctx.lineWidth = 6.0;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(mouseScreen.x, mouseScreen.y);
        ctx.stroke();

        // B. Cursor Reticle
        const reticleR = 24;
        ctx.strokeStyle = vectorColor;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(mouseScreen.x, mouseScreen.y, reticleR, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair ticks
        ctx.beginPath();
        ctx.moveTo(mouseScreen.x - reticleR - 6, mouseScreen.y);
        ctx.lineTo(mouseScreen.x - reticleR + 4, mouseScreen.y);
        ctx.moveTo(mouseScreen.x + reticleR - 4, mouseScreen.y);
        ctx.lineTo(mouseScreen.x + reticleR + 6, mouseScreen.y);
        ctx.moveTo(mouseScreen.x, mouseScreen.y - reticleR - 6);
        ctx.lineTo(mouseScreen.x, mouseScreen.y - reticleR + 4);
        ctx.moveTo(mouseScreen.x, mouseScreen.y + reticleR - 4);
        ctx.lineTo(mouseScreen.x, mouseScreen.y + reticleR + 6);
        ctx.stroke();

        if (!isValid) {
          // Warning X or slashed circle inside reticle
          ctx.beginPath();
          ctx.moveTo(mouseScreen.x - 12, mouseScreen.y - 12);
          ctx.lineTo(mouseScreen.x + 12, mouseScreen.y + 12);
          ctx.moveTo(mouseScreen.x + 12, mouseScreen.y - 12);
          ctx.lineTo(mouseScreen.x - 12, mouseScreen.y + 12);
          ctx.stroke();
        } else {
          // Central targeting dot
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(mouseScreen.x, mouseScreen.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // C. Floating Telemetry Tooltip Card
        const cardW = 310;
        const cardH = 125;
        let cardX = mouseScreen.x + 28;
        let cardY = mouseScreen.y + 14;

        // Clamp inside screen viewport
        if (cardX + cardW > width - 12) cardX = mouseScreen.x - cardW - 28;
        if (cardY + cardH > height - 12) cardY = height - cardH - 12;
        if (cardX < 12) cardX = 12;
        if (cardY < 12) cardY = 12;

        // Card background
        ctx.fillStyle = 'rgba(10, 15, 30, 0.95)';
        ctx.strokeStyle = isValid ? 'rgba(56, 189, 248, 0.75)' : 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(cardX, cardY, cardW, cardH, 6);
        } else {
          ctx.rect(cardX, cardY, cardW, cardH);
        }
        ctx.fill();
        ctx.stroke();

        // Card header
        ctx.fillStyle = isValid ? '#38bdf8' : '#f87171';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('[ FTL JUMP TARGETING VECTOR ]', cardX + 12, cardY + 18);

        // Subline: Distance
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`TARGET DISTANCE:`, cardX + 12, cardY + 36);
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${Math.round(targetDist).toLocaleString()} KM`, cardX + 155, cardY + 36);

        // Subline: Hydrogen Cost
        ctx.font = '9px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`REQUIRED PROPELLANT:`, cardX + 12, cardY + 52);
        ctx.fillStyle = hasEnoughFuel ? '#34d399' : '#f87171';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${fuelCost}t H2  (${Math.round(ship.h2Fuel)}t in tanks)`, cardX + 155, cardY + 52);

        // Status Banner
        let statusMsg = '';
        let statusColor = '#34d399';
        if (isOriginInterdicted) {
          statusMsg = '⛔ BLOCKED: Ship in Asteroid Belt (FTL Suppressed)';
          statusColor = '#f87171';
        } else if (isTargetInterdicted) {
          statusMsg = '⛔ BLOCKED: Target inside Asteroid Belt';
          statusColor = '#f87171';
        } else if (!hasEnoughFuel) {
          statusMsg = `⛔ INSUFFICIENT H2 (${fuelCost}t required)`;
          statusColor = '#f87171';
        } else if (isOnCooldown) {
          statusMsg = `⏳ DRIVE RECHARGING (${ship.jumpCooldownTimer?.toFixed(1)}s)`;
          statusColor = '#fbbf24';
        } else if (isSpooling) {
          statusMsg = `⚡ DRIVE CURRENTLY SPOOLING / IN JUMP`;
          statusColor = '#60a5fa';
        } else {
          statusMsg = '✅ VECTOR READY • [L-CLICK] INITIATE JUMP';
          statusColor = '#34d399';
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(cardX + 8, cardY + 63, cardW - 16, 24);
        ctx.fillStyle = statusColor;
        ctx.font = 'bold 9px monospace';
        ctx.fillText(statusMsg, cardX + 14, cardY + 79);

        // Instruction footer
        ctx.fillStyle = '#64748b';
        ctx.font = '8px monospace';
        ctx.fillText('[L-CLICK] Confirm Vector  •  [ESC / J / R-CLICK] Cancel', cardX + 12, cardY + 110);

        ctx.restore();
      }
    }

    // 9. BUILD PLACEMENT GHOST PREVIEW & GRAVITY WELL CONSTRAINT VALIDATOR
    const activeBlueprint = placementController.getActiveBlueprint() || (buildStructureType ? STRUCTURE_CATALOG[buildStructureType] : null);
    if (activeBlueprint) {
      const def = activeBlueprint;
      const mouseScreen = mouseScreenRef.current;
      const worldMouse = mouseWorldRef.current;
      const validation = placementController.validate(worldMouse, engine);
      const isValid = validation.isValid;
      const activeWell = validation.activeWell;

      ctx.save();

      // 1. Highlight all captured/allied gravity wells in the system with subtle cyan dashed envelopes
      const allWells = placementController.getAllWells(engine);
      for (const well of allWells) {
        const isThisActive = activeWell && activeWell.id === well.id;
        const [px, py] = worldToScreen(well.pos.x, well.pos.y, width, height);
        const wellRadiusScreen = well.wellRadius * cam.zoom;

        if (
          wellRadiusScreen > 2 &&
          px + wellRadiusScreen > 0 &&
          px - wellRadiusScreen < width &&
          py + wellRadiusScreen > 0 &&
          py - wellRadiusScreen < height
        ) {
          ctx.strokeStyle = isThisActive
            ? isValid
              ? 'rgba(56, 189, 248, 0.85)'
              : 'rgba(239, 68, 68, 0.85)'
            : well.isAlliedOrCaptured
            ? 'rgba(56, 189, 248, 0.25)'
            : 'rgba(239, 68, 68, 0.2)';
          ctx.lineWidth = isThisActive ? 2.2 : 1.2;
          ctx.setLineDash(isThisActive ? [8, 5] : [4, 6]);
          ctx.beginPath();
          ctx.arc(px, py, wellRadiusScreen, 0, Math.PI * 2);
          ctx.stroke();

          if (isThisActive) {
            ctx.fillStyle = isValid ? 'rgba(56, 189, 248, 0.05)' : 'rgba(239, 68, 68, 0.05)';
            ctx.fill();

            ctx.fillStyle = isValid ? '#38bdf8' : '#ef4444';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              `[${well.name.toUpperCase()} ${well.type.replace('_', ' ')} WELL: ${Math.round(well.wellRadius)}km ${
                well.isAlliedOrCaptured ? 'ALLIED/CAPTURED' : 'CONTESTED'
              }]`,
              px,
              py - wellRadiusScreen - 8
            );
          }
        }
      }

      // 2. Translucent Ghost Blueprint Preview at Cursor
      ctx.save();
      ctx.translate(mouseScreen.x, mouseScreen.y);
      ctx.globalAlpha = isValid ? 0.65 : 0.3;
      const ghostMock: ShipEntity = {
        id: 'ghost-preview',
        name: def.name,
        role: (def.type as unknown as ShipRole) || 'HQ',
        structureType: def.type,
        faction: 'FRIENDLY',
        pos: worldMouse,
        velocity: { x: 0, y: 0 },
        heading: 0,
        maxSpeed: 0,
        isStationary: true,
        splineActive: false,
        splineP0: { x: 0, y: 0 },
        splineM0: { x: 0, y: 0 },
        splineP1: { x: 0, y: 0 },
        splineM1: { x: 0, y: 0 },
        splineT: 0,
        splineDuration: 1.0,
        h2FuelMax: 1000,
        h2Fuel: 1000,
        fuelReserveRule: 0.1,
        missilesMax: 0,
        missiles: 0,
        counterMissiles: 0,
        counterMissilesMax: 0,
        counterMissileCooldown: 0,
        missileCooldown: 0,
        missileRange: 0,
        combatStance: 'PASSIVE',
        autoFire: false,
        ewarJammingRating: 0,
        pdplaRange: 0,
        pdplaCooldown: 0,
        pdBeams: 0,
        pdplaActiveBeamTarget: null,
        pdplaBeamTimer: 0,
        pdplaBeamHit: false,
        shieldHpMax: def.shieldHpMax,
        shieldHp: def.shieldHpMax,
        shieldHeat: 0,
        shieldHeatMax: 100,
        shieldOverheated: false,
        shieldCooldownTimer: 0,
        hullMax: def.hullMax,
        hullHp: def.hullMax,
        maxRepairableHull: def.hullMax,
        crippleBarMax: def.hullMax * 0.8,
        crippleBar: def.hullMax * 0.8,
        hullState: 'OPERATIONAL',
        permanentFrameBuckled: false,
        massRating: 50,
        fmsActive: false,
        fmsMultiplier: 1.0,
        dockingRadius: def.dockingRadius || 60,
        productionQueue: [],
        isUnderConstruction: true,
        constructionOpacity: 0.35,
      };
      renderProceduralShip(ctx, ghostMock, def.radius || 24, Date.now());
      ctx.restore();

      // 3. Reticle Boundary
      const reticleColor = isValid ? '#10b981' : '#ef4444';
      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = 2.0;
      ctx.setLineDash(isValid ? [6, 4] : []);
      ctx.beginPath();
      ctx.arc(mouseScreen.x, mouseScreen.y, 32, 0, Math.PI * 2);
      ctx.stroke();

      if (!isValid) {
        // Red Warning Cross & Halo
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(mouseScreen.x - 16, mouseScreen.y - 16);
        ctx.lineTo(mouseScreen.x + 16, mouseScreen.y + 16);
        ctx.moveTo(mouseScreen.x + 16, mouseScreen.y - 16);
        ctx.lineTo(mouseScreen.x - 16, mouseScreen.y + 16);
        ctx.stroke();

        // Pulsing Red Warning Text at Cursor
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('[REJECTED: OUTSIDE ALLIED WELL]', mouseScreen.x, mouseScreen.y + 48);
      }

      // 4. Floating Telemetry Card
      const cardW = 350;
      const cardH = 150;
      let cardX = mouseScreen.x + 36;
      let cardY = mouseScreen.y + 16;
      if (cardX + cardW > width - 12) cardX = mouseScreen.x - cardW - 36;
      if (cardY + cardH > height - 12) cardY = height - cardH - 12;
      if (cardX < 12) cardX = 12;
      if (cardY < 12) cardY = 12;

      ctx.fillStyle = 'rgba(8, 12, 22, 0.96)';
      ctx.strokeStyle = isValid ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 6);
      else ctx.rect(cardX, cardY, cardW, cardH);
      ctx.fill();
      ctx.stroke();

      // Header
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = isValid ? '#34d399' : '#f87171';
      ctx.textAlign = 'left';
      ctx.fillText(
        isValid ? `[DESIGNATE ORBITAL STRUCTURE: ${def.code}]` : `[RESTRICTED: OUTSIDE GRAVITY WELL]`,
        cardX + 12,
        cardY + 20
      );

      ctx.font = '10px monospace';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(`${def.name} (${def.category})`, cardX + 12, cardY + 36);

      // Cost check against HQ reserves
      const hqRes = engine.getHQResources();
      const needsRestock = hqRes.metallic < def.costMetallic || hqRes.organic < def.costOrganic;

      ctx.font = '9px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(
        `Required: ${(def.costMetallic ?? 0).toLocaleString()} Metallic • ${(def.costOrganic ?? 0).toLocaleString()} Organic`,
        cardX + 12,
        cardY + 54
      );
      ctx.fillText(
        `HQ Reserves: ${Math.round(hqRes.metallic).toLocaleString()} Met • ${Math.round(hqRes.organic).toLocaleString()} Org`,
        cardX + 12,
        cardY + 68
      );

      // Logistics state prediction
      ctx.fillStyle = needsRestock ? '#f59e0b' : '#38bdf8';
      ctx.fillText(
        needsRestock
          ? `⚠️ DEFICIT: HQ lacks full reserves; construction may pause`
          : `✓ READY: Autonomous Builder dispatch on scaffold drop`,
        cardX + 12,
        cardY + 84
      );

      // Constraint note
      ctx.fillStyle = isValid ? '#a7f3d0' : '#ef4444';
      ctx.fillText(
        isValid && activeWell
          ? `Mooring Anchor: [${activeWell.name}] ${activeWell.type} Well (${Math.round(activeWell.wellRadius)}km)`
          : `Invalid: ${validation.reason || 'Must place inside captured gravity well!'}`,
        cardX + 12,
        cardY + 102
      );

      // Controls footer
      ctx.fillStyle = '#64748b';
      ctx.font = '8px monospace';
      ctx.fillText(
        isValid
          ? '[L-CLICK] Moor Scaffold & Dispatch Builder  •  [R-CLICK / ESC] Cancel'
          : '[R-CLICK / ESC] Cancel  •  Move cursor inside planetary/cluster well',
        cardX + 12,
        cardY + 128
      );

      ctx.restore();
    }

      // 18. Render Placement Rejection Shockwave Effects
      const now = Date.now();
      invalidPlacementFlashesRef.current = invalidPlacementFlashesRef.current.filter((f) => now - f.time < 900);
      for (const flash of invalidPlacementFlashesRef.current) {
        const progress = (now - flash.time) / 900;
        const radius = 25 + progress * 60;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.lineWidth = 2.5 * (1 - progress * 0.5);
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(248, 113, 113, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(flash.x - 14, flash.y - 14);
        ctx.lineTo(flash.x + 14, flash.y + 14);
        ctx.moveTo(flash.x + 14, flash.y - 14);
        ctx.lineTo(flash.x - 14, flash.y + 14);
        ctx.stroke();

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.textAlign = 'center';
        ctx.fillText('OUTSIDE GRAVITY WELL - REJECTED', flash.x, flash.y - radius - 6);
        ctx.restore();
      }

      // 19. Tactical Marquee Selection Bounding Box
      if (isDraggingMarqueeRef.current) {
        const p1 = marqueeStartRef.current;
        const p2 = marqueeCurrentRef.current;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);

        if (w > 5 || h > 5) {
          ctx.save();
          // Soft tactical tint fill
          ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
          ctx.fillRect(x, y, w, h);

          // 1px Dashed cyan boundary
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 1.0;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x, y, w, h);

          // High-contrast solid corner reticles
          ctx.setLineDash([]);
          ctx.strokeStyle = '#7dd3fc';
          ctx.lineWidth = 2.2;
          const c = Math.min(8, Math.max(4, Math.min(w, h) * 0.3));

          ctx.beginPath();
          // Top-Left
          ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
          // Top-Right
          ctx.moveTo(x + w - c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + c);
          // Bottom-Left
          ctx.moveTo(x, y + h - c); ctx.lineTo(x, y + h); ctx.lineTo(x + c, y + h);
          // Bottom-Right
          ctx.moveTo(x + w - c, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - c);
          ctx.stroke();

          // Selection Box Dimension HUD badge
          ctx.font = '8px monospace';
          ctx.fillStyle = '#7dd3fc';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(w)}×${Math.round(h)}`, x + w - 2, y + h + 10);

          ctx.restore();
        }
      }

      // 20. Celestial Reticle on Hovered / Selected Planet
      const targetPlanet = selectedPlanetRef.current || hoveredPlanetRef.current;
      if (targetPlanet) {
        const [px, py] = worldToScreen(targetPlanet.pos.x, targetPlanet.pos.y, width, height);
        const pRadiusScreen = Math.max(targetPlanet.radius * cam.zoom, 18);
        const isSelected = selectedPlanetRef.current?.id === targetPlanet.id;

        ctx.save();
        ctx.strokeStyle = isSelected ? '#00f0ff' : 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = isSelected ? 2 : 1.2;
        ctx.setLineDash([5, 4]);

        // Concentric targeting ring
        ctx.beginPath();
        ctx.arc(px, py, pRadiusScreen + 7, 0, Math.PI * 2);
        ctx.stroke();

        // 4 Corner brackets
        ctx.setLineDash([]);
        const tickLen = 7;
        const tickDist = pRadiusScreen + 12;
        ctx.beginPath();
        // Top
        ctx.moveTo(px, py - tickDist); ctx.lineTo(px, py - tickDist - tickLen);
        // Bottom
        ctx.moveTo(px, py + tickDist); ctx.lineTo(px, py + tickDist + tickLen);
        // Left
        ctx.moveTo(px - tickDist, py); ctx.lineTo(px - tickDist - tickLen, py);
        // Right
        ctx.moveTo(px + tickDist, py); ctx.lineTo(px + tickDist + tickLen, py);
        ctx.stroke();

        ctx.restore();
      }
    };

  // Mouse Interactivity
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Space + Left Click or Middle Click = Pan
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      isDraggingRef.current = true;
      dragAnchorRef.current = mouseScreen;
      return;
    }

    // Right Click: Cancel Build Mode, Cancel Jump Mode OR Set Spline / Fleet Trajectory
    const activeBp = placementController.getActiveBlueprint() || (buildStructureType ? STRUCTURE_CATALOG[buildStructureType] : null);

    if (e.button === 2) {
      if (activeBp || buildStructureType) {
        e.preventDefault();
        placementController.clear();
        onBuildModeHandled?.();
        engine.addLog('BUILDER', 'Ghost construction placement cleared.', 'info');
        return;
      }
      if (jumpModeActive) {
        e.preventDefault();
        onJumpModeHandled?.();
        return;
      }

      const worldMouse = screenToWorld(mouseScreen.x, mouseScreen.y, rect.width, rect.height);
      const targetList = [...(engine.ships ?? []), ...((engine as any).structures ?? [])].filter(
        (s) => s && s.visibilityTier !== 'NONE'
      );
      const uniqueTargets = Array.from(new Map(targetList.filter(Boolean).map((s) => [s.id, s])).values()) as ShipEntity[];
      const clickedRight = raycastSelectShip(worldMouse, uniqueTargets, cameraRef.current.zoom, { minScreenTolerancePx: 24 });
      if (clickedRight?.isUnderConstruction) {
        e.preventDefault();
        engine.cancelScaffold(clickedRight.id);
        if (selectedShipId === clickedRight.id) {
          onSelectShip('');
        }
        return;
      }

      if (selectedShipIds && selectedShipIds.length > 1) {
        e.preventDefault();
        engine.setFleetMoveOrder(worldMouse);
        return;
      }
      if (selectedShipId) {
        e.preventDefault();
        const ship = (engine.ships ?? []).find((s) => s && s.id === selectedShipId);
        if (ship?.isUnderConstruction) {
          engine.cancelScaffold(ship.id);
          onSelectShip('');
          return;
        }
        if (ship && ship.faction === 'FRIENDLY') {
          engine.setSplineOrder(ship.id, worldMouse);
        }
        return;
      }
    }

    // Left Click: Build Mode Order, Jump Mode Order, Movement Order, or Selection / Pan
    if (e.button === 0) {
      const worldMouse = screenToWorld(mouseScreen.x, mouseScreen.y, rect.width, rect.height);

      // Handle Global Structure Build Placement Confirmation
      if (activeBp || buildStructureType) {
        const curBlueprint = activeBp || (buildStructureType ? STRUCTURE_CATALOG[buildStructureType] : null);
        const validation = placementController.validate(worldMouse, engine);
        if (validation.isValid && validation.activeWell && curBlueprint) {
          const res = constructionManager.commitPlacement(curBlueprint, worldMouse, validation.activeWell, engine);
          if (res.success) {
            placementController.clear();
            onBuildModeHandled?.();
          }
        } else {
          invalidPlacementFlashesRef.current.push({ x: mouseScreen.x, y: mouseScreen.y, time: Date.now() });
          engine.addLog(
            'LOGISTICS',
            `Placement Rejected: ${validation.reason || 'Outside allied gravity well bounds.'}`,
            'warn'
          );
        }
        return;
      }

      // Handle Jump Mode Confirmation
      if (jumpModeActive && selectedShipId) {
        const res = engine.initiateJump(selectedShipId, worldMouse);
        if (res.success) {
          onJumpModeHandled?.();
        }
        return;
      }

      if (moveModeActive) {
        if (selectedShipIds && selectedShipIds.length > 1) {
          engine.setFleetMoveOrder(worldMouse);
          onMoveModeHandled?.();
          return;
        }
        if (selectedShipId) {
          const ship = (engine.ships ?? []).find((s) => s && s.id === selectedShipId);
          if (ship && ship.faction === 'FRIENDLY') {
            engine.setSplineOrder(ship.id, worldMouse);
            onMoveModeHandled?.();
            return;
          }
        }
      }

      // Centralized Raycasting with explicit entity selection radius and screen-space cushion
      const targetList = [...(engine.ships ?? []), ...((engine as any).structures ?? [])].filter(
        (s) => s && s.visibilityTier !== 'NONE'
      );
      // Deduplicate targets by id
      const uniqueTargets = Array.from(new Map(targetList.filter(Boolean).map((s) => [s.id, s])).values()) as ShipEntity[];
      const clicked = raycastSelectShip(
        worldMouse,
        uniqueTargets,
        cameraRef.current.zoom,
        {
          minScreenTolerancePx: 24,
        }
      );

      if (clicked) {
        // Clear planet selection when selecting a ship/structure
        selectedPlanetRef.current = null;
        setSelectedPlanet(null);
        planetController.selectPlanet(null);

        if (clicked.faction === 'HOSTILE' && (clicked.visibilityState === 'BLIP_ONLY' || engine.isShipObstructedByFog(clicked))) {
          engine.addLog(
            'RADAR',
            `Target ${clicked.name}: Obstructed by Fog of War! Visual telemetry unavailable beyond 8,400km active radar envelope (tracking raw contact echo).`,
            'warn'
          );
        } else {
          onSelectShip(clicked.id);
        }
        return;
      }

      // Check for Planet or Celestial Body selection
      const clickedPlanet = findPlanetUnderCursor(worldMouse, engine, cameraRef.current.zoom);
      if (clickedPlanet) {
        selectedPlanetRef.current = clickedPlanet;
        setSelectedPlanet(clickedPlanet);
        planetController.selectPlanet(clickedPlanet.id);
        onSelectShip(''); // Deselect ships when selecting celestial body

        const val = validateColonization(clickedPlanet, engine.researchManager.completedNodes);
        engine.addLog(
          'RESEARCH',
          `Celestial Focus: [${clickedPlanet.name}] (${(clickedPlanet as any).planetClass || 'GAS GIANT'}) • ${val.tooltip}`,
          'info'
        );
        return;
      }

      // No target clicked: dismiss planet selection and initiate marquee selection drag
      selectedPlanetRef.current = null;
      setSelectedPlanet(null);
      planetController.selectPlanet(null);

      isDraggingMarqueeRef.current = true;
      marqueeStartRef.current = mouseScreen;
      marqueeCurrentRef.current = mouseScreen;
      dragAnchorRef.current = mouseScreen;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    mouseScreenRef.current = mouseScreen;
    mouseWorldRef.current = screenToWorld(mouseScreen.x, mouseScreen.y, rect.width, rect.height);

    // Track hovered celestial body
    const planetUnderCursor = findPlanetUnderCursor(mouseWorldRef.current, engine, cameraRef.current.zoom);
    if (planetUnderCursor?.id !== hoveredPlanetRef.current?.id) {
      hoveredPlanetRef.current = planetUnderCursor;
      setHoveredPlanet(planetUnderCursor);
    }

    const currentBp = placementController.getActiveBlueprint() || (buildStructureType ? STRUCTURE_CATALOG[buildStructureType] : null);
    if (currentBp) {
      const validation = placementController.validate(mouseWorldRef.current, engine);
      canvas.style.cursor = validation.isValid ? 'crosshair' : 'not-allowed';
    } else if (isDraggingRef.current) {
      canvas.style.cursor = 'grabbing';
    } else if (planetUnderCursor) {
      canvas.style.cursor = 'pointer';
    } else {
      canvas.style.cursor = 'default';
    }

    if (isDraggingMarqueeRef.current) {
      marqueeCurrentRef.current = mouseScreen;
      const dx = mouseScreen.x - marqueeStartRef.current.x;
      const dy = mouseScreen.y - marqueeStartRef.current.y;
      if (Math.hypot(dx, dy) > 6) {
        canvas.style.cursor = 'crosshair';
      }
    }

    if (!isDraggingRef.current) return;
    
    // Calculate movement in world space
    const dx = (mouseScreen.x - dragAnchorRef.current.x) / cameraRef.current.zoom;
    const dy = (mouseScreen.y - dragAnchorRef.current.y) / cameraRef.current.zoom;

    // Use dynamic bounds
    const bounds = getGalacticCameraBounds((engine as any).systems);
    
    cameraRef.current.x = Math.max(bounds.minX, Math.min(bounds.maxX, cameraRef.current.x - dx));
    cameraRef.current.y = Math.max(bounds.minY, Math.min(bounds.maxY, cameraRef.current.y - dy));

    dragAnchorRef.current = mouseScreen;
  };

  const handleMouseUp = () => {
    const canvas = canvasRef.current;
    if (isDraggingMarqueeRef.current && canvas) {
      const rect = canvas.getBoundingClientRect();
      const p1 = marqueeStartRef.current;
      const p2 = marqueeCurrentRef.current;
      const dragDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (dragDist >= 10) {
        const w1 = screenToWorld(p1.x, p1.y, rect.width, rect.height);
        const w2 = screenToWorld(p2.x, p2.y, rect.width, rect.height);
        const box = {
          minX: Math.min(w1.x, w2.x),
          minY: Math.min(w1.y, w2.y),
          maxX: Math.max(w1.x, w2.x),
          maxY: Math.max(w1.y, w2.y),
        };

        const friendlyCandidates = (engine.ships ?? []).filter(
          (s) => s && s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED'
        );

        const marqueeSelected = marqueeSelectShips(box, friendlyCandidates, cameraRef.current.zoom, {
          friendlyOnly: true,
        });

        if (marqueeSelected.length > 0) {
          if (onSelectShips) {
            onSelectShips(marqueeSelected.map((s) => s.id));
          } else if (marqueeSelected[0]) {
            onSelectShip(marqueeSelected[0].id);
          }
        } else {
          // Deselect when dragged over empty region
          if (onSelectShips) {
            onSelectShips([]);
          } else {
            onSelectShip('');
          }
        }
      } else {
        // Deselect when clicked on empty space (not dragged)
        if (onSelectShips) {
          onSelectShips([]);
        } else {
          onSelectShip('');
        }
      }
      isDraggingMarqueeRef.current = false;
    }
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Calculate movement in world space
    const dx = (e.clientX - dragAnchorRef.current.x) / cameraRef.current.zoom;
    const dy = (e.clientY - dragAnchorRef.current.y) / cameraRef.current.zoom;

    // Use dynamic bounds
    const bounds = getGalacticCameraBounds((engine as any).systems);
    
    cameraRef.current.x = Math.max(bounds.minX, Math.min(bounds.maxX, cameraRef.current.x - dx));
    cameraRef.current.y = Math.max(bounds.minY, Math.min(bounds.maxY, cameraRef.current.y - dy));

    dragAnchorRef.current = { x: e.clientX, y: e.clientY };
  };

  const getGalacticCameraBounds = (systems: any[] = []): { minX: number; maxX: number; minY: number; maxY: number } => {
    const fallbackRadius = 350000;
    if (!systems || systems.length === 0) {
      return {
        minX: -fallbackRadius,
        maxX: fallbackRadius,
        minY: -fallbackRadius,
        maxY: fallbackRadius
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < systems.length; i++) {
      const sys = systems[i];
      const boundary = sys.deepSpaceBoundaryRadius || 300000;
      
      const left = sys.center.x - boundary;
      const right = sys.center.x + boundary;
      const top = sys.center.y - boundary;
      const bottom = sys.center.y + boundary;

      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    }

    const margin = 150000;
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minY: minY - margin,
      maxY: maxY + margin
    };
  };

  const applyAnchoredZoom = useCallback((zoomFactor: number, mouseCanvasX: number, mouseCanvasY: number, width: number, height: number) => {
    const oldZoom = cameraRef.current.zoom;
    const newZoom = Math.max(Math.min(oldZoom * zoomFactor, MAX_ZOOM), minZoom);

    if (newZoom !== oldZoom) {
      const worldUnderMouse = screenToWorld(mouseCanvasX, mouseCanvasY, width, height);

      // Update camera
      cameraRef.current.zoom = newZoom;
      
      const bounds = getGalacticCameraBounds((engine as any).systems);
      
      // Recalculate camera position to keep worldUnderMouse fixed and clamped
      const newX = worldUnderMouse.x - (mouseCanvasX - width * 0.5) / newZoom;
      const newY = worldUnderMouse.y - (mouseCanvasY - height * 0.5) / newZoom;
      
      cameraRef.current.x = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
      cameraRef.current.y = Math.max(bounds.minY, Math.min(bounds.maxY, newY));
      
      setZoomLevel(newZoom);
    }
  }, [screenToWorld, minZoom, engine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      // 1. Calculate true canvas-relative cursor coordinates, accounting for CSS/DPI scaling
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseCanvasX = (event.clientX - rect.left) * scaleX;
      const mouseCanvasY = (event.clientY - rect.top) * scaleY;

      // 2. Determine zoom delta
      const zoomFactor = event.deltaY < 0 ? 1.15 : 0.85;

      // 3. Dispatch anchored zoom update
      applyAnchoredZoom(zoomFactor, mouseCanvasX, mouseCanvasY, canvas.width, canvas.height);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [applyAnchoredZoom]);

  const handleZoomStep = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerScreen = { x: rect.width * 0.5, y: rect.height * 0.5 };
    const worldUnderCenter = screenToWorld(centerScreen.x, centerScreen.y, rect.width, rect.height);
    const newZoom = Math.max(Math.min(cameraRef.current.zoom * factor, MAX_ZOOM), minZoom);

    if (newZoom !== cameraRef.current.zoom) {
      cameraRef.current.zoom = newZoom;
      cameraRef.current.x = worldUnderCenter.x;
      cameraRef.current.y = worldUnderCenter.y;
      setZoomLevel(newZoom);
    }
  };

  const setMacroView = () => {
    cameraRef.current.zoom = minZoom;
    cameraRef.current.x = 0;
    cameraRef.current.y = 0;
    setZoomLevel(minZoom);
  };

  const resetZoom = () => {
    cameraRef.current.zoom = 0.38;
    const selected = engine.getSelectedShip();
    if (selected) {
      cameraRef.current.x = selected.pos.x;
      cameraRef.current.y = selected.pos.y;
    } else {
      cameraRef.current.x = 0;
      cameraRef.current.y = 0;
    }
    setZoomLevel(0.38);
  };

  // Ensure window mouseup cleans up dragging or marquee state if cursor leaves canvas boundary
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current || isDraggingMarqueeRef.current) {
        handleMouseUp();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      id="tactical-canvas-container"
      className="relative w-full h-full overflow-hidden select-none bg-[#080c12]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        id="tactical-canvas"
        className="w-full h-full cursor-crosshair block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Mini Viewport Legend Overlay with Macro Controls */}
      <div className="absolute bottom-[118px] left-3 pointer-events-auto flex items-center gap-2.5 text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700/70 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-bold">ZOOM:</span>
          <span className="text-cyan-300 font-bold">
            {(zoomLevel * 100).toFixed(zoomLevel < 0.1 ? 1 : 0)}%
          </span>
          {zoomLevel <= 0.04 && (
            <span className="text-[10px] px-1 bg-amber-950/90 border border-amber-600/60 text-amber-300 rounded font-semibold">
              SOLAR SYSTEM
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-1">
          <button
            id="btn-zoom-out"
            onClick={() => handleZoomStep(1 / 1.35)}
            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-200 hover:text-white cursor-pointer text-xs"
            title="Zoom Out"
          >
            -
          </button>
          <button
            id="btn-zoom-in"
            onClick={() => handleZoomStep(1.35)}
            className="w-5 h-5 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-200 hover:text-white cursor-pointer text-xs"
            title="Zoom In"
          >
            +
          </button>
          <button
            id="btn-zoom-macro"
            onClick={setMacroView}
            className="px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900/90 rounded border border-cyan-600/60 text-cyan-300 text-[10px] font-bold cursor-pointer"
            title="Galactic Deep-Zoom: View Entire Sector"
          >
            GALAXY
          </button>
          <button
            id="btn-zoom-system"
            onClick={() => {
              cameraRef.current.zoom = 0.003;
              setZoomLevel(0.003);
            }}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-300 text-[10px] cursor-pointer"
            title="System Overview View (0.003x)"
          >
            SYSTEM
          </button>
          <button
            id="btn-zoom-reset"
            onClick={resetZoom}
            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-300 text-[10px] cursor-pointer"
            title="Reset to 1.0x Tactical Zoom"
          >
            1.0x
          </button>
        </div>

        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 bg-slate-900/80">
          LOD:{' '}
          <span className={zoomLevel <= 0.0005 ? 'text-amber-400 font-bold' : zoomLevel <= 0.0015 ? 'text-sky-400 font-bold' : 'text-emerald-400 font-bold'}>
            {zoomLevel <= 0.0005 ? 'GALACTIC' : zoomLevel <= 0.0015 ? 'SYSTEM' : 'TACTICAL'}
          </span>
        </span>

        <span className="hidden sm:inline text-slate-600">•</span>
        <span className="hidden sm:inline">CAM: ({Math.round(cameraRef.current.x)}, {Math.round(cameraRef.current.y)})</span>
        <span className="hidden md:inline text-slate-600">•</span>
        <span className="hidden md:inline text-sky-400">SENSOR: {BASE_TACTICAL_RANGES.sensorRangeKm}km | LOCK: {BASE_TACTICAL_RANGES.missileLockRangeKm}km</span>
      </div>

      {/* 3. Planetary Survey & Colonization Directive Card */}
      {(selectedPlanet || hoveredPlanet) && (
        <PlanetaryCard
          planet={selectedPlanet || hoveredPlanet!}
          engine={engine}
          onClose={() => {
            selectedPlanetRef.current = null;
            setSelectedPlanet(null);
            planetController.selectPlanet(null);
          }}
          onOpenResearchModal={onOpenResearchModal}
          onFocusPlanet={(pos) => {
            cameraRef.current.x = pos.x;
            cameraRef.current.y = pos.y;
          }}
        />
      )}
    </div>
  );
};
