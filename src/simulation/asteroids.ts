import { AsteroidEntity, AsteroidTier, Vec2D } from '../types';

/**
 * Procedural faceted asteroid generator
 * - Small Asteroid (60% spawn chance): 250 ore capacity, radius 14-17px
 * - Medium Asteroid (25% spawn chance): 670 ore capacity, radius 22-26px
 * - Large Asteroid (15% spawn chance): 1,500 ore capacity, radius 32-38px
 */

export function createAsteroid(id: string, pos: Vec2D, forcedTier?: AsteroidTier): AsteroidEntity {
  let tier: AsteroidTier = forcedTier || 'SMALL';
  if (!forcedTier) {
    const roll = Math.random();
    if (roll < 0.60) {
      tier = 'SMALL';
    } else if (roll < 0.85) {
      tier = 'MEDIUM';
    } else {
      tier = 'LARGE';
    }
  }

  let oreCapacity = 250;
  let baseRadius = 16;
  let vertexCount = 8;

  if (tier === 'MEDIUM') {
    oreCapacity = 670;
    baseRadius = 24;
    vertexCount = 10;
  } else if (tier === 'LARGE') {
    oreCapacity = 1500;
    baseRadius = 35;
    vertexCount = 13;
  }

  // Generate irregular faceted polygon vertices
  const vertices: Vec2D[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2 + (Math.random() - 0.5) * (Math.PI / vertexCount * 0.7);
    const rad = baseRadius * (0.75 + Math.random() * 0.5);
    vertices.push({
      x: Math.cos(angle) * rad,
      y: Math.sin(angle) * rad,
    });
  }

  // Generate 2-4 craters / ore veins
  const craters: { x: number; y: number; r: number }[] = [];
  const craterCount = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < craterCount; i++) {
    const cDist = Math.random() * (baseRadius * 0.55);
    const cAngle = Math.random() * Math.PI * 2;
    craters.push({
      x: Math.cos(cAngle) * cDist,
      y: Math.sin(cAngle) * cDist,
      r: (baseRadius * 0.12) + Math.random() * (baseRadius * 0.18),
    });
  }

  return {
    id,
    pos: { ...pos },
    tier,
    oreCapacity,
    oreRemaining: oreCapacity,
    radius: baseRadius,
    vertices,
    facets: [...vertices],
    craters,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.08, // Slow majestic axial rotation
  };
}

/**
 * Creates the initial neutral asteroid field across central space
 */
export function createDefaultAsteroidBelt(count: number = 22): AsteroidEntity[] {
  const asteroids: AsteroidEntity[] = [];

  // Cluster 1: Neutral Belt Center-North
  // Cluster 2: Neutral Belt Center-South
  // Cluster 3: Flanking Scatter
  const clusters = [
    { cx: -50, cy: -220, rx: 200, ry: 160, share: 0.35 },
    { cx: 50, cy: 180, rx: 220, ry: 170, share: 0.35 },
    { cx: 100, cy: -20, rx: 180, ry: 240, share: 0.30 },
  ];

  let idCounter = 1;
  for (const c of clusters) {
    const clusterCount = Math.round(count * c.share);
    for (let i = 0; i < clusterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random());
      const x = c.cx + Math.cos(angle) * dist * c.rx;
      const y = c.cy + Math.sin(angle) * dist * c.ry;

      asteroids.push(createAsteroid(`ast-${idCounter++}`, { x, y }));
    }
  }

  return asteroids;
}
