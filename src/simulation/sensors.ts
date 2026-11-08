import { VisibilityTier, SensorCoverageBubble, EntityDetectionLevel, HostileVisibilityState } from '../types';
import { GameState } from '../state/gameState';

export type { VisibilityTier, SensorCoverageBubble, EntityDetectionLevel, HostileVisibilityState };

/**
 * Calculates active radar and passive detection radii.
 * Active radar scales directly with radarMultiplier.
 * Passive baseline is strictly 3x base radar, scaling independently with passiveMultiplier.
 */
export function calculateEntitySensors(
  baseRadarRadius: number,
  modifiers: { radarMultiplier?: number; passiveMultiplier?: number } = {}
): { activeRadarR: number; passiveSensorR: number } {
  const radarMult = modifiers.radarMultiplier || 1.0;
  const passiveMult = modifiers.passiveMultiplier || 1.0;

  // Active Radar scales directly with radar research
  const activeRadarR = Math.round(baseRadarRadius * radarMult);

  // Passive baseline is strictly 3x base radar, scaling independently with passive research
  const passiveSensorR = Math.round((baseRadarRadius * 3.0) * passiveMult);

  return { activeRadarR, passiveSensorR };
}

/**
 * Canonical base radar radii for vessels, stations, and platforms:
 * - Player HQ Station: 14,000 km (Passive: 42,000 km)
 * - Outpost / Sensor Relay: 16,000 km (Passive: 48,000 km)
 * - Cruiser / Carrier / Capital: 10,000 km (Passive: 30,000 km)
 * - Scout / Corvette: 8,000 km (Passive: 24,000 km)
 * - Miner / Cargo / Escort Frigate: 6,000 km (Passive: 18,000 km)
 */
export function getBaseRadarRadius(entity: any): number {
  if (!entity) return 6000;
  if (typeof entity.baseRadar === 'number' && entity.baseRadar > 0) return entity.baseRadar;
  if (typeof entity.baseRadarRadius === 'number' && entity.baseRadarRadius > 0) return entity.baseRadarRadius;

  const role = (entity.role || entity.class || entity.shipClass || '').toUpperCase();
  const name = (entity.name || entity.id || '').toUpperCase();

  // 1. Player HQ Station: 14,000 km
  if (role === 'HQ' || name.includes('HQ') || entity.id === 'hq-station') {
    return 14000;
  }

  // 2. Outpost / Sensor Relay Platform: 16,000 km
  if (
    role === 'SENSOR_RELAY' ||
    role === 'OUTPOST' ||
    role === 'RELAY' ||
    name.includes('RELAY') ||
    name.includes('OUTPOST')
  ) {
    return 16000;
  }

  // 3. Cruiser / Carrier / Capital: 10,000 km
  if (
    role === 'CRUISER' ||
    role === 'LIGHT_CRUISER' ||
    role === 'HEAVY_CRUISER' ||
    role === 'CARRIER' ||
    role === 'SUPER_CARRIER' ||
    role === 'BATTLECRUISER' ||
    role === 'BATTLESHIP' ||
    role === 'DREADNOUGHT' ||
    role === 'CITY_SHIP' ||
    role === 'CS' ||
    role === 'BASTION' ||
    role === 'CV' ||
    role === 'CVF' ||
    role === 'BB' ||
    role === 'DN' ||
    role === 'BC' ||
    role === 'CA' ||
    role === 'CL'
  ) {
    return 10000;
  }

  // 4. Scout / Corvette: 8,000 km
  if (
    role === 'SCOUT' ||
    role === 'CORVETTE' ||
    role === 'SC' ||
    role === 'FS' ||
    role === 'CT' ||
    name.includes('SCOUT') ||
    name.includes('CORVETTE')
  ) {
    return 8000;
  }

  // 5. Miner / Cargo / Escort Frigate: 6,000 km
  return 6000;
}

interface SensorEmitterData {
  x: number;
  y: number;
  radarR: number;
  passiveR: number;
  systemId?: string;
}

const STATIC_EMITTERS_POOL: SensorEmitterData[] = [];

export function updateSensorVisibility(state: GameState | any): void {
  if (!state || !state.ships) return;

  const passiveMult = state.modifiers?.passiveMultiplier || 1.0;
  const radarMult = state.modifiers?.radarMultiplier || 1.0;

  let emitterCount = 0;
  const setEmitter = (x: number, y: number, radarR: number, passiveR: number, systemId?: string) => {
    if (emitterCount < STATIC_EMITTERS_POOL.length) {
      const em = STATIC_EMITTERS_POOL[emitterCount];
      em.x = x;
      em.y = y;
      em.radarR = radarR;
      em.passiveR = passiveR;
      em.systemId = systemId;
    } else {
      STATIC_EMITTERS_POOL.push({ x, y, radarR, passiveR, systemId });
    }
    emitterCount++;
  };

  // 1. HQ Station Emitter
  const hq = state.hq ?? (typeof state.getHQ === 'function' ? state.getHQ() : undefined) ??
    (state.ships.find((s: any) => s && (s.role === 'HQ' || s.id === 'hq-station') && s.hullState !== 'DESTROYED'));

  let hqId: string | undefined;
  if (hq && hq.hullState !== 'DESTROYED') {
    hqId = hq.id;
    const hqX = hq.x ?? hq.pos?.x ?? 0;
    const hqY = hq.y ?? hq.pos?.y ?? 0;
    hq.x = hqX;
    hq.y = hqY;
    const baseRadar = 14000;
    const activeRadarR = Math.round(baseRadar * radarMult);
    const passiveSensorR = Math.round((baseRadar * 3.0) * passiveMult);

    hq.radarRadius = activeRadarR;
    hq.radarRange = activeRadarR;
    hq.sensorRange = activeRadarR;
    hq.passiveRadius = passiveSensorR;
    hq.passiveRange = passiveSensorR;

    setEmitter(hqX, hqY, activeRadarR, passiveSensorR, hq.systemId);
  }

  // 2. Allied Ships, Platforms & Structures
  const ships = state.ships;
  const shipsLen = ships.length;
  for (let i = 0; i < shipsLen; i++) {
    const s = ships[i];
    if (!s || s.hullState === 'DESTROYED') continue;
    if (hqId && s.id === hqId) continue; // Already added as HQ emitter

    // Synchronize coordinates prioritizing live pos vector
    if (s.pos) {
      s.x = s.pos.x;
      s.y = s.pos.y;
    } else if (s.x !== undefined && s.y !== undefined) {
      s.pos = { x: s.x, y: s.y };
    }

    const isAllied = s.faction === 'PLAYER' || s.faction === 'PLAYER_MINER' || s.faction === 'FRIENDLY' || !s.faction;
    if (isAllied) {
      const baseRadar = s.baseRadar || getBaseRadarRadius(s);
      const { activeRadarR, passiveSensorR } = calculateEntitySensors(baseRadar, {
        radarMultiplier: radarMult,
        passiveMultiplier: passiveMult,
      });

      s.radarRadius = activeRadarR;
      s.radarRange = activeRadarR;
      s.sensorRange = activeRadarR;
      s.passiveRadius = passiveSensorR;
      s.passiveRange = passiveSensorR;

      setEmitter(
        s.pos?.x ?? s.x ?? 0,
        s.pos?.y ?? s.y ?? 0,
        activeRadarR,
        passiveSensorR,
        s.systemId
      );
    }
  }

  // 3. Evaluate non-allied entities
  if (state.debugState?.revealAllMap || (state as any).state?.debugState?.revealAllMap) {
    // Force all hostiles and neutral entities to full tactical recognition
    for (let i = 0; i < shipsLen; i++) {
      const s = ships[i];
      if (!s) continue;
      s.visibilityTier = 'RADAR';
      s.visibilityState = 'RESOLVED';
      s.radarIdentified = true;
    }
  } else {
    for (let i = 0; i < shipsLen; i++) {
      const target = ships[i];
      if (!target) continue;

      const isAllied = target.faction === 'PLAYER' || target.faction === 'PLAYER_MINER' || target.faction === 'FRIENDLY';
      if (isAllied) {
        target.visibilityTier = 'RADAR';
        target.visibilityState = 'RESOLVED';
        continue;
      }

      // Prioritize live physical position object
      const tx = target.pos ? target.pos.x : (target.x ?? 0);
      const ty = target.pos ? target.pos.y : (target.y ?? 0);
      target.x = tx;
      target.y = ty;

      let detectedTier: VisibilityTier = 'NONE';
      for (let j = 0; j < emitterCount; j++) {
        const em = STATIC_EMITTERS_POOL[j];
        if (target.systemId && em.systemId && target.systemId !== em.systemId) continue;

        const dx = tx - em.x;
        const dy = ty - em.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= em.radarR * em.radarR) {
          detectedTier = 'RADAR';
          break; // Full radar overrides passive
        } else if (distSq <= em.passiveR * em.passiveR) {
          detectedTier = 'PASSIVE';
        }
      }

      target.visibilityTier = detectedTier;
      target.visibilityState = detectedTier === 'RADAR' ? 'RESOLVED' : detectedTier === 'PASSIVE' ? 'BLIP_ONLY' : 'HIDDEN';
    }
  }

  // 4. Evaluate visibility for missiles and torpedoes
  if (state.missiles) {
    const misLen = state.missiles.length;
    for (let i = 0; i < misLen; i++) {
      const m = state.missiles[i];
      if (!m) continue;

      if (m.pos) {
        if (m.x === undefined) m.x = m.pos.x;
        if (m.y === undefined) m.y = m.pos.y;
      } else if (m.x !== undefined && m.y !== undefined) {
        m.pos = { x: m.x, y: m.y };
      }

      const isAllied = m.faction === 'PLAYER' || m.faction === 'FRIENDLY';
      if (isAllied) {
        m.visibilityTier = 'RADAR';
        continue;
      }

      const mx = m.x ?? m.pos?.x ?? 0;
      const my = m.y ?? m.pos?.y ?? 0;

      let mTier: VisibilityTier = 'NONE';
      for (let j = 0; j < emitterCount; j++) {
        const em = STATIC_EMITTERS_POOL[j];
        if (m.systemId && em.systemId && m.systemId !== em.systemId) continue;

        const dx = mx - em.x;
        const dy = my - em.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= em.radarR * em.radarR) {
          mTier = 'RADAR';
          break;
        } else if (distSq <= em.passiveR * em.passiveR) {
          mTier = 'PASSIVE';
        }
      }
      m.visibilityTier = mTier;
    }
  }
}

// Named alias to maintain compatibility
export function updateSensors(state: any): void {
  updateSensorVisibility(state);
}
