import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { Vec2D } from '../types';

interface FleetRibbonProps {
  engine: SimulationEngine;
  selectedShipIds: string[];
  onSelectShip: (id: string) => void;
  onSelectShips: (ids: string[]) => void;
  onFocusCoordinates: (pos: Vec2D) => void;
}

export const FleetRibbon: React.FC<FleetRibbonProps> = ({
  engine,
  selectedShipIds,
  onSelectShip,
  onSelectShips,
  onFocusCoordinates,
}) => {
  // Purge any fleet groups whose ships are all destroyed
  const slotsToPurge: number[] = [];
  engine.fleetGroups.forEach((group, slot) => {
    const operational = (engine.ships ?? []).filter(
      (s) => group.shipIds.includes(s.id) && s.hullState !== 'DESTROYED'
    );
    if (operational.length === 0) {
      slotsToPurge.push(slot);
    } else if (operational.length !== group.shipIds.length) {
      group.shipIds = operational.map((s) => s.id);
    }
  });
  slotsToPurge.forEach((slot) => engine.fleetGroups.delete(slot));

  const activeFleets: [number, typeof engine.fleetGroups extends Map<number, infer G> ? G : any][] = [];
  engine.fleetGroups.forEach((group, slot) => {
    activeFleets.push([slot, group]);
  });
  activeFleets.sort(([a], [b]) => a - b);
  const hasSelectedShips = selectedShipIds.length > 0;

  const handleSelectGroup = (slot: number) => {
    const ids = engine.selectFleetGroup(slot);
    if (ids.length > 0) {
      onSelectShips(ids);
      const group = engine.fleetGroups.get(slot);
      const flagship = engine.ships.find((s) => s.id === group?.flagshipId);
      if (flagship) {
        onSelectShip(flagship.id);
      }
    }
  };

  const handleDoubleClickGroup = (slot: number) => {
    const group = engine.fleetGroups.get(slot);
    if (!group) return;
    const flagship =
      engine.ships.find((s) => s.id === group.flagshipId) ??
      engine.ships.find((s) => s.id === group.shipIds[0]);
    if (flagship) {
      onFocusCoordinates({ ...flagship.pos });
    }
  };

  const handleDisbandGroup = (e: React.MouseEvent, slot: number) => {
    e.preventDefault();
    engine.disbandFleetGroup(slot);
  };

  const handleCreateGroup = () => {
    const group = engine.formFleetGroup(selectedShipIds);
    if (group) {
      onSelectShips(group.shipIds);
    }
  };

  return (
    <div
      id="fleet-quick-select-ribbon"
      style={{
        position: 'fixed',
        top: '48px',
        left: '16px',
        display: 'flex',
        gap: '6px',
        zIndex: 40,
      }}
      className="items-center select-none font-mono text-xs"
    >
      {/* Ribbon Header Tag */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-[#090d16]/90 backdrop-blur-md border border-[#1e293b]/80 rounded shadow-xl text-[10px] tracking-wider text-slate-400 font-semibold uppercase">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>FLEET TABS</span>
      </div>

      {activeFleets.length === 0 && !hasSelectedShips && (
        <div className="px-2.5 py-1 bg-[#090d16]/80 backdrop-blur-md border border-slate-800/80 rounded text-[10.5px] text-slate-400 italic shadow-lg">
          No fleets bound. Drag-select ships &amp; click &apos;Form Fleet&apos;
        </div>
      )}

      {/* Render active 1-9 Fleet Tabs */}
      {activeFleets.map(([slot, group]) => {
        const isSelected =
          selectedShipIds.length > 0 &&
          group.shipIds.length === selectedShipIds.length &&
          group.shipIds.every((id) => selectedShipIds.includes(id));

        const flagship = engine.ships.find((s) => s.id === group.flagshipId);
        const flagshipName = flagship?.name ?? 'Lead Vessel';
        const densityLabel = group.density[0];
        const cohesionLabel = group.cohesion === 'UNIT' ? 'U' : 'M';

        return (
          <button
            key={slot}
            id={`fleet-tab-slot-${slot}`}
            type="button"
            onClick={() => handleSelectGroup(slot)}
            onDoubleClick={() => handleDoubleClickGroup(slot)}
            onContextMenu={(e) => handleDisbandGroup(e, slot)}
            title={`[${slot}] ${group.name} (${group.shipIds.length} vessels)\nFlagship: ${flagshipName}\nDensity: ${group.density} | Speed: ${group.cohesion}\n\n• Left-Click: Select Fleet (Hotkey ${slot})\n• Double-Click: Focus Camera on Flagship\n• Right-Click: Disband Fleet Group`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all cursor-pointer backdrop-blur-md shadow-lg ${
              isSelected
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                : 'bg-[#090d16]/85 border-slate-700/80 hover:border-cyan-400/70 text-slate-300 hover:text-white hover:bg-[#0f172a]/90'
            }`}
          >
            <span className="font-bold tracking-tight text-[11px] text-cyan-400">
              [ {slot} ]
            </span>
            <span className="text-[11px] font-semibold text-white/90">
              {slot} ({group.shipIds.length})
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              [{densityLabel}/{cohesionLabel}]
            </span>
          </button>
        );
      })}

      {/* Quick-Bind Selection Button */}
      {hasSelectedShips && (
        <button
          id="fleet-bind-action-btn"
          type="button"
          onClick={handleCreateGroup}
          title="Bind currently selected ships into a new Fleet Group (auto-assigns slot 1–9)"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-[11px] font-medium transition-all shadow-lg cursor-pointer backdrop-blur-md"
        >
          <span className="font-bold text-amber-400">+</span>
          <span>FORM FLEET ({selectedShipIds.length})</span>
        </button>
      )}
    </div>
  );
};
