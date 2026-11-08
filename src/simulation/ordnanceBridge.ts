import {
  MissileStoreSOA,
  CounterMissileStoreSOA,
  spawnMissileSOA,
  spawnCounterMissileSOA
} from './ordnanceSOA';

/**
 * OrdnanceBridge allows ship combat logic to launch salvos and point-defense
 * without altering ShipEntity internals or allocating JS heap objects.
 * Translates reference objects to numeric indices at the launch boundary.
 */
export class OrdnanceBridge {
  constructor(
    public missiles: MissileStoreSOA,
    public cms: CounterMissileStoreSOA
  ) {}

  public fireSalvo(
    sourceShip: any,
    targetShip: any,
    shipsArray: any[],
    tubeCount: number,
    damagePerMissile: number,
    range: number = 85000,
    speed: number = 620,
    isGarnLongRange: boolean = false
  ): void {
    const sourceIdx = shipsArray.indexOf(sourceShip);
    const targetIdx = shipsArray.indexOf(targetShip);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const sourceX = sourceShip.pos ? sourceShip.pos.x : (sourceShip.x ?? 0);
    const sourceY = sourceShip.pos ? sourceShip.pos.y : (sourceShip.y ?? 0);
    const targetX = targetShip.pos ? targetShip.pos.x : (targetShip.x ?? 0);
    const targetY = targetShip.pos ? targetShip.pos.y : (targetShip.y ?? 0);

    const baseHeading = Math.atan2(targetY - sourceY, targetX - sourceX);

    for (let i = 0; i < tubeCount; i++) {
      const spread = (i - (tubeCount - 1) * 0.5) * 0.12;
      const angle = baseHeading + spread;
    const isGarnRing = Boolean(sourceShip.isGarnRing || (sourceShip.role === 'HQ' && (sourceShip.factionId === 'GARN' || sourceShip.faction === 'GARN')));
    const ringRadius = isGarnRing ? (sourceShip.radius || 700) : 0;
    const spawnOffset = ringRadius > 0 ? ringRadius + 10 : 35;
    const ox = sourceX + Math.cos(angle) * spawnOffset;
    const oy = sourceY + Math.sin(angle) * spawnOffset;

      spawnMissileSOA(
        this.missiles,
        ox,
        oy,
        angle,
        speed,
        range,
        damagePerMissile,
        targetIdx,
        sourceIdx,
        sourceShip.faction === 'PLAYER' ? 1 : 2,
        1,
        isGarnLongRange
      );
    }
  }

  public launchPointDefense(
    sourceShip: any,
    incomingMissileIdx: number,
    shipsArray: any[]
  ): boolean {
    const sourceIdx = shipsArray.indexOf(sourceShip);
    if (sourceIdx === -1) return false;

    let sourceX = sourceShip.pos ? sourceShip.pos.x : (sourceShip.x ?? 0);
    let sourceY = sourceShip.pos ? sourceShip.pos.y : (sourceShip.y ?? 0);

    const isGarnRing = Boolean(sourceShip.isGarnRing || sourceShip.isRingStructure || sourceShip.hqType === 'GARN_RING_CITADEL' || (sourceShip.role === 'HQ' && sourceShip.factionId === 'GARN'));
    if (isGarnRing) {
      const ringRadius = sourceShip.ringOuterRadius || sourceShip.radius || 700;
      let angle = 0;
      if (this.missiles && incomingMissileIdx >= 0) {
        const mx = (this.missiles as any).posX ? (this.missiles as any).posX[incomingMissileIdx] : ((this.missiles as any).x ? (this.missiles as any).x[incomingMissileIdx] : sourceX);
        const my = (this.missiles as any).posY ? (this.missiles as any).posY[incomingMissileIdx] : ((this.missiles as any).y ? (this.missiles as any).y[incomingMissileIdx] : sourceY);
        angle = Math.atan2(my - sourceY, mx - sourceX);
      }
      sourceX += Math.cos(angle) * (ringRadius + 10);
      sourceY += Math.sin(angle) * (ringRadius + 10);
    }

    const res = spawnCounterMissileSOA(
      this.cms,
      sourceX,
      sourceY,
      incomingMissileIdx,
      sourceIdx,
      sourceShip.faction === 'PLAYER' ? 1 : 2
    );

    return res !== -1;
  }
}
