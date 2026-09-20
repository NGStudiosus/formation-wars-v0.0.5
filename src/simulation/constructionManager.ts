import {
  ShipEntity,
  StructureType,
  Vec2D,
  ConstructionScaffold,
} from '../types';
import { SimulationEngine } from './engine';
import { StructureDef, createGhostStructureEntity, STRUCTURE_CATALOG } from './structures';
import { CelestialGravityWell } from './placementController';
import {
  ensureBuilderHold,
  launchBuilderTransit,
  syncScaffoldEntity,
} from './builderController';

export interface ConstructionManagerResult {
  success: boolean;
  scaffold?: ConstructionScaffold;
  ghostEntity?: ShipEntity;
  builderId?: string | null;
  error?: string;
}

export class ConstructionManager {
  public scaffolds: ConstructionScaffold[] = [];
  public backlog: string[] = []; // FIFO Queue of Scaffold IDs waiting for Builder availability

  /**
   * Commits a valid structure placement:
   * 1. Spawns and moors ConstructionScaffold entity locked to the target gravity well's orbital reference frame.
   * 2. Adds the translucent ghost blueprint ship entity into the simulation engine.
   * 3. Executes automated Builder task allocation:
   *    - 1st Priority: Idle builder (STATE_IDLE)
   *    - 2nd Priority: Returning builder without critical target (BUILD_FERRY_TO_HQ)
   *    - 3rd Priority: Queued in global construction backlog if all builders busy.
   */
  public commitPlacement(
    blueprint: StructureDef,
    worldPos: Vec2D,
    activeWell: CelestialGravityWell,
    engine: SimulationEngine
  ): ConstructionManagerResult {
    const costM = blueprint.costMetallic;
    const costO = blueprint.costOrganic;

    // Deduct new 80%-discounted amounts from HQ silos upon scaffold placement
    const hq = engine.ships.find((s) => s.role === 'HQ' && s.faction === 'FRIENDLY');
    if (hq && hq.resources) {
      if (hq.resources.metallic < costM || hq.resources.organic < costO) {
        engine.addLog(
          'LOGISTICS',
          `❌ Scaffold Placement Rejected: Insufficient HQ stockpiles for [${blueprint.name}] (Requires ${costM.toLocaleString()} M, ${costO.toLocaleString()} O; Available: ${Math.floor(hq.resources.metallic).toLocaleString()} M, ${Math.floor(hq.resources.organic).toLocaleString()} O).`,
          'warn'
        );
        return {
          success: false,
          error: `Insufficient HQ stockpiles for [${blueprint.name}]`,
        };
      }
      hq.resources.metallic = Math.max(0, hq.resources.metallic - costM);
      hq.resources.organic = Math.max(0, hq.resources.organic - costO);
      engine.addLog(
        'LOGISTICS',
        `💰 Silo Allocation: Deducted ${costM.toLocaleString()} Met, ${costO.toLocaleString()} Org from HQ for [${blueprint.name}].`,
        'info'
      );
    }

    const timestamp = Date.now();
    const scaffoldId = `scaffold_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;

    // 1. Instantiate ConstructionScaffold moored to that gravity well's orbital reference frame
    const scaffold: ConstructionScaffold = {
      id: scaffoldId,
      structureType: blueprint.type,
      worldX: worldPos.x,
      worldY: worldPos.y,
      depositedM: 0,
      totalM: costM,
      depositedO: 0,
      totalO: costO,
      costPaidM: costM,
      costPaidO: costO,
      buildTicks: blueprint.buildTicks || 150,
      assignedBuilderId: null,
      orbitalParentId: activeWell.id,
      progressRatio: 0.0,
    };
    this.scaffolds.push(scaffold);

    // 2. Create physical ShipEntity for the ghost structure blueprint
    const ghostEntity = createGhostStructureEntity(
      blueprint.type,
      worldPos,
      {
        id: activeWell.id,
        name: activeWell.name,
        pos: activeWell.pos,
        type: activeWell.type,
      },
      '',
      this.scaffolds.length
    );

    ghostEntity.id = scaffoldId;
    ghostEntity.scaffold = scaffold;
    ghostEntity.depositedM = 0;
    ghostEntity.totalM = costM;
    ghostEntity.depositedO = 0;
    ghostEntity.totalO = costO;
    ghostEntity.costPaidM = costM;
    ghostEntity.costPaidO = costO;
    ghostEntity.buildTicks = blueprint.buildTicks || 150;
    ghostEntity.constructionDuration = blueprint.buildDurationSeconds || 5.0;
    ghostEntity.constructionProgress = 0.0;
    ghostEntity.constructionOpacity = 0.15;
    ghostEntity.constructionState = 'PENDING';
    ghostEntity.isUnderConstruction = true;
    ghostEntity.hostPlanetId = activeWell.id;
    ghostEntity.gravityWellBody = activeWell.name;
    ghostEntity.inGravityWell = true;
    ghostEntity.isMoored = true;
    ghostEntity.capturedReferenceFrame = {
      id: activeWell.id,
      name: activeWell.name,
      type: activeWell.type,
      center: activeWell.pos,
      localOffset: {
        x: worldPos.x - activeWell.pos.x,
        y: worldPos.y - activeWell.pos.y,
      },
    };

    engine.ships.push(ghostEntity);

    // 3. Automated Builder Task Allocation
    const assignedBuilder = this.allocateBuilderForScaffold(scaffold, ghostEntity, engine);

    engine.addLog(
      'LOGISTICS',
      `📐 Scaffold deployed: [${blueprint.name}] anchored in ${activeWell.name} gravity well. ${
        assignedBuilder
          ? `Autonomous Builder [${assignedBuilder.name}] dispatched!`
          : 'All builders engaged. Scaffold queued in global construction backlog.'
      }`,
      'info'
    );

    return {
      success: true,
      scaffold,
      ghostEntity,
      builderId: assignedBuilder ? assignedBuilder.id : null,
    };
  }

  /**
   * Cancels a construction scaffold before completion:
   * 1. 100% refund of the deducted costs returned directly to HQ silos.
   * 2. Frees assigned builder, resetting it to STATE_BUILDER_IDLE.
   * 3. Removes scaffold entity and backlog queue references.
   */
  public cancelScaffold(scaffoldId: string, engine: SimulationEngine): boolean {
    const sIndex = this.scaffolds.findIndex((s) => s.id === scaffoldId);
    const scaffold = sIndex !== -1 ? this.scaffolds[sIndex] : null;

    // Remove from backlog if present
    this.backlog = this.backlog.filter((id) => id !== scaffoldId);

    // Find ghost entity
    const ghostIndex = engine.ships.findIndex((s) => s.id === scaffoldId);
    const ghostEntity = ghostIndex !== -1 ? engine.ships[ghostIndex] : null;

    if (!scaffold && !ghostEntity) {
      return false;
    }

    const structureName = ghostEntity?.name || scaffold?.structureType || 'Structure';

    // Calculate refund from recorded costPaidM / costPaidO or totalM / totalO
    const refundM = scaffold?.costPaidM ?? ghostEntity?.costPaidM ?? scaffold?.totalM ?? ghostEntity?.totalM ?? 0;
    const refundO = scaffold?.costPaidO ?? ghostEntity?.costPaidO ?? scaffold?.totalO ?? ghostEntity?.totalO ?? 0;

    // Restore 100% of discounted cost to HQ silos
    const hq = engine.ships.find((s) => s.role === 'HQ' && s.faction === 'FRIENDLY');
    if (hq && hq.resources) {
      hq.resources.metallic += refundM;
      hq.resources.organic += refundO;
    }

    // Free assigned builder
    const builderId = scaffold?.assignedBuilderId || ghostEntity?.assignedBuilderId;
    if (builderId) {
      const builder = engine.ships.find((s) => s.id === builderId);
      if (builder) {
        builder.targetStructureId = null;
        builder.targetStructureType = undefined;
        builder.targetStructurePos = null;
        builder.builderState = 'STATE_BUILDER_IDLE';
        builder.builderStatusTag = undefined;
      }
    }

    // Also check if any builder had this scaffold targeted
    for (const b of engine.ships) {
      if (b.role === 'BUILDER' && b.targetStructureId === scaffoldId) {
        b.targetStructureId = null;
        b.targetStructureType = undefined;
        b.targetStructurePos = null;
        b.builderState = 'STATE_BUILDER_IDLE';
        b.builderStatusTag = undefined;
      }
    }

    // Remove scaffold and ghost entity
    if (sIndex !== -1) {
      this.scaffolds.splice(sIndex, 1);
    }
    if (ghostIndex !== -1) {
      engine.ships.splice(ghostIndex, 1);
    }

    engine.addLog(
      'LOGISTICS',
      `↩️ Scaffold [${structureName}] cancelled. 100% refund processed (+${refundM.toLocaleString()} Met, +${refundO.toLocaleString()} Org returned to HQ silos).`,
      'info'
    );

    return true;
  }

  /**
   * Allocates an allied Builder vessel to the scaffold following strict priority:
   * 1st: An idle Builder (state === 'STATE_IDLE' or unassigned)
   * 2nd: A Builder returning to HQ without an active critical assignment
   * 3rd: Queue in backlog
   */
  public allocateBuilderForScaffold(
    scaffold: ConstructionScaffold,
    ghostEntity: ShipEntity,
    engine: SimulationEngine
  ): ShipEntity | null {
    const alliedBuilders = (engine.ships || []).filter(
      (s) =>
        s.role === 'BUILDER' &&
        s.faction === 'FRIENDLY' &&
        s.hullState === 'OPERATIONAL'
    );

    if (alliedBuilders.length === 0) {
      this.backlog.push(scaffold.id);
      return null;
    }

    // 1st Priority: Idle Builder
    let selectedBuilder: ShipEntity | null = null;
    for (const b of alliedBuilders) {
      const bState = b.builderState;
      if (!bState || bState === 'STATE_BUILDER_IDLE' || bState === 'STATE_IDLE' || (!b.targetStructureId && !b.splineActive)) {
        selectedBuilder = b;
        break;
      }
    }

    // 2nd Priority: Builder returning to HQ without active critical assignment
    if (!selectedBuilder) {
      for (const b of alliedBuilders) {
        if ((b.builderState === 'STATE_RETURNING_TO_HQ' || b.builderState === 'BUILD_FERRY_TO_HQ') && !b.targetStructureId) {
          selectedBuilder = b;
          break;
        }
      }
    }

    // 3rd Priority: All builders busy -> Queue in global backlog
    if (!selectedBuilder) {
      this.backlog.push(scaffold.id);
      return null;
    }

    // Assign builder
    this.assignBuilderToScaffold(selectedBuilder, scaffold, ghostEntity, engine);
    return selectedBuilder;
  }

  /**
   * Transitions builder state machine and launches transit/resupply loop
   */
  public assignBuilderToScaffold(
    builder: ShipEntity,
    scaffold: ConstructionScaffold,
    ghostEntity: ShipEntity,
    engine: SimulationEngine
  ): void {
    scaffold.assignedBuilderId = builder.id;
    ghostEntity.assignedBuilderId = builder.id;

    builder.targetStructureId = ghostEntity.id;
    builder.targetStructureType = ghostEntity.structureType || (scaffold.structureType as StructureType);
    builder.targetStructurePos = { ...ghostEntity.pos };
    builder.builderStatusTag = undefined;

    const hold = ensureBuilderHold(builder);
    const hasRequisiteMaterials = (hold.metallic > 0 || hold.organic > 0);

    const hq = engine.ships.find((s) => s.role === 'HQ' && s.faction === 'FRIENDLY');
    const hqPos = hq ? hq.pos : { x: 0, y: 0 };

    if (hasRequisiteMaterials) {
      // Builder is already carrying materials -> Plot transit directly to the remote site
      builder.builderState = 'STATE_TRANSIT_TO_SCAFFOLD';
      ghostEntity.constructionState = 'TRANSITING';
      launchBuilderTransit(builder, ghostEntity.pos);
    } else {
      // Builder hold is empty -> Resupply at HQ first
      builder.builderState = 'STATE_RETURNING_TO_HQ';
      ghostEntity.constructionState = 'PENDING_RESTOCK';

      const distToHq = Math.hypot(builder.pos.x - hqPos.x, builder.pos.y - hqPos.y);
      if (distToHq > 180.0) {
        launchBuilderTransit(builder, hqPos);
      }
    }

    syncScaffoldEntity(ghostEntity);
  }

  /**
   * Called when a Builder completes construction or becomes available.
   * If there are pending scaffolds in the backlog, dispatches the newly freed builder.
   */
  public onBuilderFreed(builder: ShipEntity, engine: SimulationEngine): boolean {
    if (this.backlog.length === 0) return false;

    // Pop the next queued scaffold ID
    while (this.backlog.length > 0) {
      const scaffoldId = this.backlog.shift();
      if (!scaffoldId) continue;

      const scaffold = this.scaffolds.find((s) => s.id === scaffoldId);
      const ghostEntity = engine.ships.find((s) => s.id === scaffoldId && s.isUnderConstruction);

      if (scaffold && ghostEntity) {
        this.assignBuilderToScaffold(builder, scaffold, ghostEntity, engine);
        engine.addLog(
          'LOGISTICS',
          `🏗️ Builder [${builder.name}] assigned to queued backlog scaffold [${scaffold.id}].`,
          'info'
        );
        return true;
      }
    }

    return false;
  }
}

export const constructionManager = new ConstructionManager();
