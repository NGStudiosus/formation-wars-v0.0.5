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

export function updateSensorVisibility(state: GameState | any): void {
  if (!state || !state.ships) return;

  const passiveMult = state.modifiers?.passiveMultiplier || 1.0;
  const radarMult = state.modifiers?.radarMultiplier || 1.0;

  const playerEmitters: { x: number; y: number; radarR: number; passiveR: number; systemId?: string }[] = [];

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

    playerEmitters.push({
      x: hqX,
      y: hqY,
      radarR: activeRadarR,
      passiveR: passiveSensorR,
      systemId: hq.systemId,
    });
  }

  // 2. Allied Ships & Platforms
  for (let i = 0; i < state.ships.length; i++) {
    const s = state.ships[i];
    if (!s || s.hullState === 'DESTROYED') continue;
    if (hqId && s.id === hqId) continue; // Already added as HQ emitter

    // Synchronize coordinates
    if (s.pos) {
      if (s.x === undefined) s.x = s.pos.x;
      if (s.y === undefined) s.y = s.pos.y;
    } else if (s.x !== undefined && s.y !== undefined) {
      s.pos = { x: s.x, y: s.y };
    }

    const isAllied = s.faction === 'PLAYER' || s.faction === 'PLAYER_MINER' || s.faction === 'FRIENDLY';
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

      playerEmitters.push({
        x: s.x ?? s.pos?.x ?? 0,
        y: s.y ?? s.pos?.y ?? 0,
        radarR: activeRadarR,
        passiveR: passiveSensorR,
        systemId: s.systemId,
      });
    }
  }

  // 2B. Allied Structures (Sensor Relays, Defense Platforms, Refineries)
  if (Array.isArray(state.structures)) {
    for (let i = 0; i < state.structures.length; i++) {
      const st = state.structures[i];
      if (!st || st.hullState === 'DESTROYED') continue;
      const isAllied = !st.faction || st.faction === 'PLAYER' || st.faction === 'FRIENDLY';
      if (isAllied) {
        const baseRadar = st.type === 'OUTPOST' || st.type === 'SENSOR_RELAY' ? 16000 : 8000;
        const { activeRadarR, passiveSensorR } = calculateEntitySensors(baseRadar, {
          radarMultiplier: radarMult,
          passiveMultiplier: passiveMult,
        });
        st.radarRadius = activeRadarR;
        st.passiveRadius = passiveSensorR;

        playerEmitters.push({
          x: st.pos?.x ?? st.x ?? 0,
          y: st.pos?.y ?? st.y ?? 0,
          radarR: activeRadarR,
          passiveR: passiveSensorR,
          systemId: st.systemId,
        });
      }
    }
  }

  // 3. Evaluate non-allied entities
  for (let i = 0; i < state.ships.length; i++) {
    const target = state.ships[i];
    if (!target) continue;

    const isAllied = target.faction === 'PLAYER' || target.faction === 'PLAYER_MINER' || target.faction === 'FRIENDLY';
    if (isAllied) {
      target.visibilityTier = 'RADAR';
      target.visibilityState = 'RESOLVED';
      continue;
    }

    const tx = target.x ?? target.pos?.x ?? 0;
    const ty = target.y ?? target.pos?.y ?? 0;

    let detectedTier: VisibilityTier = 'NONE';
    for (let j = 0; j < playerEmitters.length; j++) {
      const em = playerEmitters[j];
      if (target.systemId && em.systemId && target.systemId !== em.systemId) continue;

      const distSq = (tx - em.x) ** 2 + (ty - em.y) ** 2;
      if (distSq <= em.radarR ** 2) {
        detectedTier = 'RADAR';
        break; // Full radar overrides passive
      } else if (distSq <= em.passiveR ** 2) {
        detectedTier = 'PASSIVE';
      }
    }

    target.visibilityTier = detectedTier;
    target.visibilityState = detectedTier === 'RADAR' ? 'RESOLVED' : detectedTier === 'PASSIVE' ? 'BLIP_ONLY' : 'HIDDEN';
  }

  // 4. Evaluate visibility for missiles and torpedoes
  if (state.missiles) {
    for (let i = 0; i < state.missiles.length; i++) {
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
      for (let j = 0; j < playerEmitters.length; j++) {
        const em = playerEmitters[j];
        if (m.systemId && em.systemId && m.systemId !== em.systemId) continue;

        const distSq = (mx - em.x) ** 2 + (my - em.y) ** 2;
        if (distSq <= em.radarR ** 2) {
          mTier = 'RADAR';
          break;
        } else if (distSq <= em.passiveR ** 2) {
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
