import { AsteroidEntity, AsteroidCluster, AsteroidTier } from '../types';

/**
 * AsteroidSpatialStore
 *
 * Implements high-performance zero-allocation flat typed buffer storage
 * for both Layer 1 (Ambient Background Ring) and Layer 2 (Dense Super-Clusters).
 *
 * Buffer layout:
 * - positions: Float64Array (2 elements per node: [x, y])
 * - oreRemaining: Int32Array (1 element per node)
 * - oreCapacity: Int32Array (1 element per node)
 * - tierIds: Int32Array (0 = SMALL, 1 = MEDIUM, 2 = LARGE)
 * - clusterIds: Int32Array (-1 = ambient, -2 = rogue, >=0 = cluster index)
 * - radii: Float32Array
 * - rotations: Float32Array
 *
 * Viewport Culling:
 * - Pre-allocated typed index buffers for SMALL, MEDIUM, and LARGE tiers
 * - Direct AABB test avoiding per-frame allocations or object instantiation
 */
export class AsteroidSpatialStore {
  public count: number = 0;

  // Contiguous Flat Typed Buffers
  public positions: Float64Array = new Float64Array(0);
  public oreRemaining: Int32Array = new Int32Array(0);
  public oreCapacity: Int32Array = new Int32Array(0);
  public tierIds: Int32Array = new Int32Array(0);
  public clusterIds: Int32Array = new Int32Array(0);
  public radii: Float32Array = new Float32Array(0);
  public rotations: Float32Array = new Float32Array(0);
  public flags: Int32Array = new Int32Array(0); // bit 0: isAmbient, bit 1: isCluster

  // Pre-allocated Viewport Culling Index Arrays
  public visibleIndicesSmall: Int32Array = new Int32Array(0);
  public visibleIndicesMedium: Int32Array = new Int32Array(0);
  public visibleIndicesLarge: Int32Array = new Int32Array(0);

  public visibleCountSmall: number = 0;
  public visibleCountMedium: number = 0;
  public visibleCountLarge: number = 0;
  public totalVisibleCount: number = 0;

  // Fast ID to index lookup
  private idToIndexMap: Map<string, number> = new Map();
  private entityRef: AsteroidEntity[] = [];

  /**
   * Initialize or re-allocate typed buffers from the asteroid collection.
   */
  public init(asteroids: AsteroidEntity[], clusters?: AsteroidCluster[]): void {
    this.count = asteroids.length;
    this.entityRef = asteroids;
    this.idToIndexMap.clear();

    const clusterIndexMap = new Map<string, number>();
    if (clusters) {
      for (let c = 0; c < clusters.length; c++) {
        clusterIndexMap.set(clusters[c].id, c);
      }
    }

    // Allocate flat typed buffers
    this.positions = new Float64Array(this.count * 2);
    this.oreRemaining = new Int32Array(this.count);
    this.oreCapacity = new Int32Array(this.count);
    this.tierIds = new Int32Array(this.count);
    this.clusterIds = new Int32Array(this.count);
    this.radii = new Float32Array(this.count);
    this.rotations = new Float32Array(this.count);
    this.flags = new Int32Array(this.count);

    // Pre-allocate culling output buffers
    this.visibleIndicesSmall = new Int32Array(this.count);
    this.visibleIndicesMedium = new Int32Array(this.count);
    this.visibleIndicesLarge = new Int32Array(this.count);

    this.visibleCountSmall = 0;
    this.visibleCountMedium = 0;
    this.visibleCountLarge = 0;
    this.totalVisibleCount = 0;

    for (let i = 0; i < this.count; i++) {
      const ast = asteroids[i];
      this.idToIndexMap.set(ast.id, i);

      this.positions[i * 2] = ast.pos.x;
      this.positions[i * 2 + 1] = ast.pos.y;
      this.oreRemaining[i] = Math.round(ast.oreRemaining);
      this.oreCapacity[i] = Math.round(ast.oreCapacity);
      this.radii[i] = ast.radius;
      this.rotations[i] = ast.rotation || 0;

      // Tier ID: 0 = SMALL, 1 = MEDIUM, 2 = LARGE
      let tId = 0;
      if (ast.tier === 'MEDIUM') tId = 1;
      else if (ast.tier === 'LARGE') tId = 2;
      this.tierIds[i] = tId;

      // Cluster ID:
      if (ast.clusterId && clusterIndexMap.has(ast.clusterId)) {
        this.clusterIds[i] = clusterIndexMap.get(ast.clusterId)!;
        this.flags[i] |= 2; // isCluster
      } else if (ast.isAmbient) {
        this.clusterIds[i] = -1; // ambient
        this.flags[i] |= 1; // isAmbient
      } else {
        this.clusterIds[i] = -2; // solitary/rogue
      }
    }
  }

  /**
   * Fast position synchronization without memory allocations.
   * Called during kinematics steps.
   */
  public syncPositions(asteroids: AsteroidEntity[]): void {
    const len = Math.min(this.count, asteroids.length);
    for (let i = 0; i < len; i++) {
      const ast = asteroids[i];
      this.positions[i * 2] = ast.pos.x;
      this.positions[i * 2 + 1] = ast.pos.y;
      this.rotations[i] = ast.rotation || 0;
    }
  }

  /**
   * Update ore value directly for a single asteroid.
   */
  public updateOre(index: number, remaining: number): void {
    if (index >= 0 && index < this.count) {
      this.oreRemaining[index] = Math.max(0, Math.round(remaining));
    }
  }

  /**
   * Synchronize all ore levels from entities.
   */
  public syncOre(asteroids: AsteroidEntity[]): void {
    const len = Math.min(this.count, asteroids.length);
    for (let i = 0; i < len; i++) {
      this.oreRemaining[i] = Math.max(0, Math.round(asteroids[i].oreRemaining));
    }
  }

  /**
   * Strict Camera Viewport Culling.
   *
   * Evaluates world-space AABB bounds:
   * [leftWorld - margin, rightWorld + margin] x [topWorld - margin, bottomWorld + margin]
   * Categorizes visible asteroids directly into pre-allocated typed index buffers by tier.
   * Dispatches zero Canvas2D path calls for culled nodes and introduces ZERO heap allocations.
   */
  public cullViewport(
    leftWorld: number,
    rightWorld: number,
    topWorld: number,
    bottomWorld: number,
    margin: number = 80.0
  ): void {
    this.visibleCountSmall = 0;
    this.visibleCountMedium = 0;
    this.visibleCountLarge = 0;
    this.totalVisibleCount = 0;

    const minX = leftWorld - margin;
    const maxX = rightWorld + margin;
    const minY = topWorld - margin;
    const maxY = bottomWorld + margin;

    const total = this.count;
    const pos = this.positions;
    const ore = this.oreRemaining;
    const tiers = this.tierIds;

    const visSmall = this.visibleIndicesSmall;
    const visMed = this.visibleIndicesMedium;
    const visLrg = this.visibleIndicesLarge;

    let cntS = 0;
    let cntM = 0;
    let cntL = 0;

    for (let i = 0; i < total; i++) {
      // Depleted asteroids are culled
      if (ore[i] <= 0) continue;

      const px = pos[i * 2];
      const py = pos[i * 2 + 1];

      // AABB Viewport Check
      if (px < minX || px > maxX || py < minY || py > maxY) {
        continue;
      }

      // Categorize by tier for batch rendering
      const t = tiers[i];
      if (t === 0) {
        visSmall[cntS++] = i;
      } else if (t === 1) {
        visMed[cntM++] = i;
      } else {
        visLrg[cntL++] = i;
      }
    }

    this.visibleCountSmall = cntS;
    this.visibleCountMedium = cntM;
    this.visibleCountLarge = cntL;
    this.totalVisibleCount = cntS + cntM + cntL;
  }

  public getEntity(index: number): AsteroidEntity | undefined {
    return this.entityRef[index];
  }

  public getIndexById(id: string): number {
    return this.idToIndexMap.get(id) ?? -1;
  }

  public clear(): void {
    this.count = 0;
    this.idToIndexMap.clear();
    this.entityRef = [];
    this.visibleCountSmall = 0;
    this.visibleCountMedium = 0;
    this.visibleCountLarge = 0;
    this.totalVisibleCount = 0;
  }
}
