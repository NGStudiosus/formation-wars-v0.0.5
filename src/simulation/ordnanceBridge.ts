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
    speed: number = 620
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
      const spawnOffset = 35;
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
        1
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

    const sourceX = sourceShip.pos ? sourceShip.pos.x : (sourceShip.x ?? 0);
    const sourceY = sourceShip.pos ? sourceShip.pos.y : (sourceShip.y ?? 0);

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
