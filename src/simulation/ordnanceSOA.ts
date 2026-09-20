/**
 * STRUCT OF ARRAYS (SOA) ORDNANCE & KINEMATICS ENGINE
 * 
 * High-density zero-allocation projectile, ordnance, and trail simulation pipeline.
 * Backed by a single contiguous ArrayBuffer for 8,192 Missiles and 4,096 Counter-Missiles.
 */

export const MAX_MISSILES = 8192;
export const MAX_CMS = 4096;

export const ORDNANCE_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1 << 0,
  GUIDED: 1 << 1,
  BURNING_OUT: 1 << 2,
  DETONATED: 1 << 3,
  INTERCEPTED: 1 << 4
} as const;

export interface MissileStoreSOA {
  activeCount: number;
  capacity: number;
  // Kinematics (Float32Array)
  posX: Float32Array;
  posY: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  originX: Float32Array;
  originY: Float32Array;
  speed: Float32Array;
  range: Float32Array;
  distanceTraveled: Float32Array;
  damage: Float32Array;
  lifetime: Float32Array;
  maxLifetime: Float32Array;
  // Circular Trail Ring Buffer (32 floats per missile: [x0, y0, x1, y1, ... x15, y15])
  trailHistory: Float32Array;
  // Discrete Attributes (Int32Array)
  targetShipIndex: Int32Array;
  sourceShipIndex: Int32Array;
  faction: Int32Array;
  statusBitmask: Int32Array;
  airframeClass: Int32Array;
  trailHead: Int32Array;
}

export interface CounterMissileStoreSOA {
  activeCount: number;
  capacity: number;
  posX: Float32Array;
  posY: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  speed: Float32Array;
  lifetime: Float32Array;
  maxLifetime: Float32Array;
  interceptRadius: Float32Array;
  trailHistory: Float32Array;
  targetMissileIndex: Int32Array;
  sourceShipIndex: Int32Array;
  faction: Int32Array;
  statusBitmask: Int32Array;
  trailHead: Int32Array;
}

export function createOrdnanceBuffers(
  maxMissiles: number = MAX_MISSILES,
  maxCMs: number = MAX_CMS
): { missiles: MissileStoreSOA; cms: CounterMissileStoreSOA; masterBuffer: ArrayBuffer } {
  const BYTES_PER_FLOAT = 4;
  const BYTES_PER_INT = 4;

  const missileFloatChannels = 12;
  const missileTrailFloats = 32;
  const missileIntChannels = 5;
  const missileTrailHeadInts = 1;

  const cmFloatChannels = 8;
  const cmTrailFloats = 16;
  const cmIntChannels = 4;
  const cmTrailHeadInts = 1;

  const missileByteLength =
    maxMissiles * (missileFloatChannels + missileTrailFloats) * BYTES_PER_FLOAT +
    maxMissiles * (missileIntChannels + missileTrailHeadInts) * BYTES_PER_INT;

  const cmByteLength =
    maxCMs * (cmFloatChannels + cmTrailFloats) * BYTES_PER_FLOAT +
    maxCMs * (cmIntChannels + cmTrailHeadInts) * BYTES_PER_INT;

  const masterBuffer = new ArrayBuffer(missileByteLength + cmByteLength);
  let byteOffset = 0;

  function sliceFloat(elements: number): Float32Array {
    const view = new Float32Array(masterBuffer, byteOffset, elements);
    byteOffset += elements * BYTES_PER_FLOAT;
    return view;
  }

  function sliceInt(elements: number): Int32Array {
    const view = new Int32Array(masterBuffer, byteOffset, elements);
    byteOffset += elements * BYTES_PER_INT;
    return view;
  }

  const missiles: MissileStoreSOA = {
    activeCount: 0,
    capacity: maxMissiles,
    posX: sliceFloat(maxMissiles),
    posY: sliceFloat(maxMissiles),
    velX: sliceFloat(maxMissiles),
    velY: sliceFloat(maxMissiles),
    originX: sliceFloat(maxMissiles),
    originY: sliceFloat(maxMissiles),
    speed: sliceFloat(maxMissiles),
    range: sliceFloat(maxMissiles),
    distanceTraveled: sliceFloat(maxMissiles),
    damage: sliceFloat(maxMissiles),
    lifetime: sliceFloat(maxMissiles),
    maxLifetime: sliceFloat(maxMissiles),
    trailHistory: sliceFloat(maxMissiles * 32),
    targetShipIndex: sliceInt(maxMissiles),
    sourceShipIndex: sliceInt(maxMissiles),
    faction: sliceInt(maxMissiles),
    statusBitmask: sliceInt(maxMissiles),
    airframeClass: sliceInt(maxMissiles),
    trailHead: sliceInt(maxMissiles)
  };

  const cms: CounterMissileStoreSOA = {
    activeCount: 0,
    capacity: maxCMs,
    posX: sliceFloat(maxCMs),
    posY: sliceFloat(maxCMs),
    velX: sliceFloat(maxCMs),
    velY: sliceFloat(maxCMs),
    speed: sliceFloat(maxCMs),
    lifetime: sliceFloat(maxCMs),
    maxLifetime: sliceFloat(maxCMs),
    interceptRadius: sliceFloat(maxCMs),
    trailHistory: sliceFloat(maxCMs * 16),
    targetMissileIndex: sliceInt(maxCMs),
    sourceShipIndex: sliceInt(maxCMs),
    faction: sliceInt(maxCMs),
    statusBitmask: sliceInt(maxCMs),
    trailHead: sliceInt(maxCMs)
  };

  return { missiles, cms, masterBuffer };
}

export function removeMissileSOA(m: MissileStoreSOA, index: number): void {
  const last = m.activeCount - 1;
  if (index < 0 || index > last) return;

  if (index !== last) {
    // Copy kinematics
    m.posX[index] = m.posX[last];
    m.posY[index] = m.posY[last];
    m.velX[index] = m.velX[last];
    m.velY[index] = m.velY[last];
    m.originX[index] = m.originX[last];
    m.originY[index] = m.originY[last];
    m.speed[index] = m.speed[last];
    m.range[index] = m.range[last];
    m.distanceTraveled[index] = m.distanceTraveled[last];
    m.damage[index] = m.damage[last];
    m.lifetime[index] = m.lifetime[last];
    m.maxLifetime[index] = m.maxLifetime[last];

    // Copy discrete state
    m.targetShipIndex[index] = m.targetShipIndex[last];
    m.sourceShipIndex[index] = m.sourceShipIndex[last];
    m.faction[index] = m.faction[last];
    m.statusBitmask[index] = m.statusBitmask[last];
    m.airframeClass[index] = m.airframeClass[last];
    m.trailHead[index] = m.trailHead[last];

    // Copy 32-float trail buffer
    const dstOffset = index * 32;
    const srcOffset = last * 32;
    m.trailHistory.copyWithin(dstOffset, srcOffset, srcOffset + 32);
  }

  m.statusBitmask[last] = ORDNANCE_STATUS.INACTIVE;
  m.activeCount--;
}

export function removeCounterMissileSOA(cm: CounterMissileStoreSOA, index: number): void {
  const last = cm.activeCount - 1;
  if (index < 0 || index > last) return;

  if (index !== last) {
    cm.posX[index] = cm.posX[last];
    cm.posY[index] = cm.posY[last];
    cm.velX[index] = cm.velX[last];
    cm.velY[index] = cm.velY[last];
    cm.speed[index] = cm.speed[last];
    cm.lifetime[index] = cm.lifetime[last];
    cm.maxLifetime[index] = cm.maxLifetime[last];
    cm.interceptRadius[index] = cm.interceptRadius[last];

    cm.targetMissileIndex[index] = cm.targetMissileIndex[last];
    cm.sourceShipIndex[index] = cm.sourceShipIndex[last];
    cm.faction[index] = cm.faction[last];
    cm.statusBitmask[index] = cm.statusBitmask[last];
    cm.trailHead[index] = cm.trailHead[last];

    const dstOffset = index * 16;
    const srcOffset = last * 16;
    cm.trailHistory.copyWithin(dstOffset, srcOffset, srcOffset + 16);
  }

  cm.statusBitmask[last] = ORDNANCE_STATUS.INACTIVE;
  cm.activeCount--;
}

export function spawnMissileSOA(
  m: MissileStoreSOA,
  originX: number,
  originY: number,
  initialHeading: number,
  speed: number,
  range: number,
  damage: number,
  targetShipIndex: number,
  sourceShipIndex: number,
  faction: number,
  airframeClass: number
): number {
  if (m.activeCount >= m.capacity) return -1;

  const idx = m.activeCount;
  m.posX[idx] = originX;
  m.posY[idx] = originY;
  m.originX[idx] = originX;
  m.originY[idx] = originY;
  m.velX[idx] = Math.cos(initialHeading) * speed;
  m.velY[idx] = Math.sin(initialHeading) * speed;
  m.speed[idx] = speed;
  m.range[idx] = range;
  m.distanceTraveled[idx] = 0;
  m.damage[idx] = damage;
  m.lifetime[idx] = 0;
  m.maxLifetime[idx] = (range / (speed || 1.0)) * 1.5;

  m.targetShipIndex[idx] = targetShipIndex;
  m.sourceShipIndex[idx] = sourceShipIndex;
  m.faction[idx] = faction;
  m.airframeClass[idx] = airframeClass;
  m.statusBitmask[idx] = ORDNANCE_STATUS.ACTIVE | ORDNANCE_STATUS.GUIDED;

  // Initialize ring buffer with initial point
  const trailOffset = idx * 32;
  for (let t = 0; t < 32; t += 2) {
    m.trailHistory[trailOffset + t] = originX;
    m.trailHistory[trailOffset + t + 1] = originY;
  }
  m.trailHead[idx] = 0;

  m.activeCount++;
  return idx;
}

export function spawnCounterMissileSOA(
  cm: CounterMissileStoreSOA,
  originX: number,
  originY: number,
  targetMissileIndex: number,
  sourceShipIndex: number,
  faction: number,
  speed: number = 750,
  interceptRadius: number = 85
): number {
  if (cm.activeCount >= cm.capacity) return -1;

  const idx = cm.activeCount;
  cm.posX[idx] = originX;
  cm.posY[idx] = originY;
  cm.velX[idx] = 0;
  cm.velY[idx] = 0;
  cm.speed[idx] = speed;
  cm.lifetime[idx] = 0;
  cm.maxLifetime[idx] = 4.0; // 4 second flight window
  cm.interceptRadius[idx] = interceptRadius;

  cm.targetMissileIndex[idx] = targetMissileIndex;
  cm.sourceShipIndex[idx] = sourceShipIndex;
  cm.faction[idx] = faction;
  cm.statusBitmask[idx] = ORDNANCE_STATUS.ACTIVE | ORDNANCE_STATUS.GUIDED;

  const trailOffset = idx * 16;
  for (let t = 0; t < 16; t += 2) {
    cm.trailHistory[trailOffset + t] = originX;
    cm.trailHistory[trailOffset + t + 1] = originY;
  }
  cm.trailHead[idx] = 0;

  cm.activeCount++;
  return idx;
}

export function updateMissilesSOA(
  m: MissileStoreSOA,
  ships: any[], // Standard AoS ShipEntity array
  dt: number,
  onDetonate: (missileIndex: number, targetShip: any, damage: number) => void
): void {
  const count = m.activeCount;
  const {
    posX, posY, velX, velY, speed, range, distanceTraveled,
    damage, lifetime, maxLifetime, trailHistory, targetShipIndex,
    statusBitmask, trailHead
  } = m;

  const shipCount = ships.length;

  for (let i = count - 1; i >= 0; i--) {
    lifetime[i] += dt;

    // 1. Check Lifetime & Range Burnout
    if (lifetime[i] >= maxLifetime[i] || distanceTraveled[i] >= range[i]) {
      statusBitmask[i] &= ~ORDNANCE_STATUS.GUIDED;
      statusBitmask[i] |= ORDNANCE_STATUS.BURNING_OUT;
    }

    if (lifetime[i] >= maxLifetime[i] * 1.25) {
      removeMissileSOA(m, i);
      continue;
    }

    // 2. Guidance Resolution via Direct Integer Index (O(1))
    const tIdx = targetShipIndex[i];
    let targetX = 0;
    let targetY = 0;
    let hasTarget = false;

    if ((statusBitmask[i] & ORDNANCE_STATUS.GUIDED) !== 0 && tIdx >= 0 && tIdx < shipCount) {
      const targetShip = ships[tIdx];
      // Target validation check (hull integrity > 0 & not destroyed)
      const targetHp = targetShip ? (targetShip.hp ?? targetShip.hullHp ?? targetShip.hull ?? 0) : 0;
      const isDestroyed = targetShip?.hullState === 'DESTROYED';
      if (targetShip && targetHp > 0 && !isDestroyed) {
        targetX = targetShip.pos ? targetShip.pos.x : (targetShip.x ?? 0);
        targetY = targetShip.pos ? targetShip.pos.y : (targetShip.y ?? 0);
        hasTarget = true;
      } else {
        // Target destroyed: lose lock, burn forward on ballistic vector
        statusBitmask[i] &= ~ORDNANCE_STATUS.GUIDED;
        targetShipIndex[i] = -1;
      }
    }

    // 3. Steering & Kinematics
    const curX = posX[i];
    const curY = posY[i];
    let vx = velX[i];
    let vy = velY[i];
    const spd = speed[i];

    if (hasTarget) {
      const dx = targetX - curX;
      const dy = targetY - curY;
      const dist = Math.hypot(dx, dy);

      // Detonation threshold (proximity fuse: 40 units)
      if (dist < 40) {
        onDetonate(i, ships[tIdx], damage[i]);
        removeMissileSOA(m, i);
        continue;
      }

      // Proportional navigation steering
      const invDist = 1.0 / (dist || 1.0);
      const desiredVx = dx * invDist * spd;
      const desiredVy = dy * invDist * spd;

      // Turn rate limit
      const turnWeight = 4.5 * dt;
      vx += (desiredVx - vx) * turnWeight;
      vy += (desiredVy - vy) * turnWeight;

      const newSpeed = Math.hypot(vx, vy);
      if (newSpeed > 0.001) {
        vx = (vx / newSpeed) * spd;
        vy = (vy / newSpeed) * spd;
      }
    }

    // Integrate position
    const stepX = vx * dt;
    const stepY = vy * dt;
    const nextX = curX + stepX;
    const nextY = curY + stepY;

    posX[i] = nextX;
    posY[i] = nextY;
    velX[i] = vx;
    velY[i] = vy;
    distanceTraveled[i] += Math.hypot(stepX, stepY);

    // 4. Update Circular Trail Ring Buffer (Zero Allocations)
    // 16 points = 32 floats; head advances and wraps via bitwise & 15
    const head = (trailHead[i] + 1) & 15;
    trailHead[i] = head;
    const trailOffset = i * 32 + (head * 2);
    trailHistory[trailOffset] = nextX;
    trailHistory[trailOffset + 1] = nextY;
  }
}

export function updateCounterMissilesSOA(
  cm: CounterMissileStoreSOA,
  m: MissileStoreSOA,
  dt: number,
  onIntercept: (missileIndex: number, cmIndex: number) => void
): void {
  const count = cm.activeCount;
  const {
    posX, posY, velX, velY, speed, lifetime, maxLifetime,
    interceptRadius, trailHistory, targetMissileIndex, trailHead
  } = cm;

  for (let i = count - 1; i >= 0; i--) {
    lifetime[i] += dt;
    if (lifetime[i] >= maxLifetime[i]) {
      removeCounterMissileSOA(cm, i);
      continue;
    }

    const mIdx = targetMissileIndex[i];
    // Check if target missile is still active
    if (mIdx < 0 || mIdx >= m.activeCount || (m.statusBitmask[mIdx] & ORDNANCE_STATUS.ACTIVE) === 0) {
      removeCounterMissileSOA(cm, i);
      continue;
    }

    const curX = posX[i];
    const curY = posY[i];
    const tx = m.posX[mIdx];
    const ty = m.posY[mIdx];

    const dx = tx - curX;
    const dy = ty - curY;
    const dist = Math.hypot(dx, dy);

    // Hard-kill interception envelope
    if (dist <= interceptRadius[i]) {
      onIntercept(mIdx, i);
      removeMissileSOA(m, mIdx);
      removeCounterMissileSOA(cm, i);
      continue;
    }

    // High-G intercept vector acceleration
    const invDist = 1.0 / (dist || 1.0);
    const spd = speed[i];
    const desiredVx = dx * invDist * spd;
    const desiredVy = dy * invDist * spd;

    velX[i] += (desiredVx - velX[i]) * (12.0 * dt);
    velY[i] += (desiredVy - velY[i]) * (12.0 * dt);

    const nextX = curX + velX[i] * dt;
    const nextY = curY + velY[i] * dt;

    posX[i] = nextX;
    posY[i] = nextY;

    // 8-point trail ring buffer (16 floats); head wraps via bitwise & 7
    const head = (trailHead[i] + 1) & 7;
    trailHead[i] = head;
    const trailOffset = i * 16 + (head * 2);
    trailHistory[trailOffset] = nextX;
    trailHistory[trailOffset + 1] = nextY;
  }
}
