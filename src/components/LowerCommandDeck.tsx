import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { StructureType } from '../types';
import { CommandDeck } from './CommandDeck';
import { Compass } from 'lucide-react';

interface LowerCommandDeckProps {
  engine: SimulationEngine;
  onSelectShip: (id: string) => void;
  selectedShipIds?: string[];
  moveModeActive: boolean;
  onToggleMoveMode: () => void;
  jumpModeActive?: boolean;
  onToggleJumpMode?: () => void;
  buildStructureType?: StructureType | null;
  onSelectBuildStructure?: (type: StructureType | null) => void;
  onOpenResearchModal?: () => void;
}

export const LowerCommandDeck: React.FC<LowerCommandDeckProps> = ({
  engine,
  onSelectShip,
  selectedShipIds = [],
  moveModeActive,
  onToggleMoveMode,
  jumpModeActive = false,
  onToggleJumpMode,
  buildStructureType = null,
  onSelectBuildStructure,
  onOpenResearchModal,
}) => {
  const isMultiSelect = selectedShipIds && selectedShipIds.length > 1;
  const selectedShips = isMultiSelect
    ? (engine.ships ?? []).filter((s) => selectedShipIds.includes(s.id) && s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED')
    : [];
  const flagship = isMultiSelect ? engine.getDesignatedFlagship() : null;
  const selectedShip = isMultiSelect ? (flagship ?? engine.getSelectedShip()) : engine.getSelectedShip();

  // Helper to format role abbreviation and title
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'FRIGATE':
        return { code: 'FG', label: 'Frigate' };
      case 'DESTROYER':
        return { code: 'DD', label: 'Destroyer' };
      case 'LIGHT_CRUISER':
        return { code: 'CL', label: 'Light Cruiser' };
      case 'HEAVY_CRUISER':
      case 'CRUISER':
        return { code: 'CH', label: 'Heavy Cruiser' };
      case 'BATTLECRUISER':
        return { code: 'BC', label: 'Battlecruiser' };
      case 'BATTLESHIP':
        return { code: 'BB', label: 'Battleship' };
      case 'DREADNOUGHT':
        return { code: 'DN', label: 'Dreadnought' };
      case 'MINER':
        return { code: 'MN', label: 'Miner' };
      case 'HQ':
        return { code: 'HQ', label: 'Fleet HQ' };
      case 'SHIPYARD':
        return { code: 'SY', label: 'Orbital Shipyard' };
      case 'BUILDER':
        return { code: 'BLD', label: 'Forge Builder' };
      default:
        return { code: role.slice(0, 2).toUpperCase(), label: role };
    }
  };

  return (
    <div
      id="lower-command-deck"
      className="fixed bottom-0 left-0 right-0 h-[110px] z-50 pointer-events-none select-none font-mono text-xs"
    >
      <div className="w-full h-full px-3 pb-2 flex items-end justify-between gap-3 max-w-[1920px] mx-auto">
        {/* ========================================================= */}
        {/* 1. LEFT MODULE: COMPACT SHIP STATUS CARD / FLEET BATTLEGROUP */}
        {/* ========================================================= */}
        {isMultiSelect ? (
          <div
            id="fleet-battlegroup-card"
            className="pointer-events-auto flex items-center gap-3 bg-[#0a0f18]/94 backdrop-blur-md border border-cyan-500/60 rounded-lg p-2.5 h-[98px] shadow-2xl min-w-[340px] max-w-[450px]"
          >
            <div className="flex flex-col justify-between h-full pr-2 border-r border-slate-800 flex-1 min-w-[150px]">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm tracking-wide text-cyan-300 truncate">
                    FLEET COMMAND
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold border bg-cyan-950/80 border-cyan-400 text-cyan-300">
                    {selectedShips.length} HULLS
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5 truncate">
                  <span className="text-amber-400 font-semibold">FLAG:</span>
                  <span className="text-white font-medium truncate">{flagship?.name || 'Lead Warship'}</span>
                  <span className="text-slate-500">[{flagship?.role || 'DN'}]</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-tight">
                <div>
                  FORMATION:{' '}
                  <strong className="text-cyan-300">
                    {engine.formationDensity}
                  </strong>{' '}
                  <span className="text-slate-500">
                    [{engine.fleetScreenVanguard ? 'VANGUARD' : 'REARGUARD'}]
                  </span>
                </div>
                <div>
                  COHESION:{' '}
                  <span className="text-emerald-300 font-bold">
                    {engine.movementCohesion === 'UNIT' ? 'UNIT (SYNC SPEED)' : 'MAX INDEPENDENT'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fleet Aggregate Telemetry Bars */}
            <div className="flex flex-col justify-between h-full w-[170px] text-[10px]">
              {/* Aggregate Hull */}
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-300">FLEET HULL</span>
                  <span className="text-slate-200">
                    {Math.round(selectedShips.reduce((acc, s) => acc + s.hullHp, 0))} /{' '}
                    {Math.round(selectedShips.reduce((acc, s) => acc + s.hullMax, 0))}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (selectedShips.reduce((acc, s) => acc + s.hullHp, 0) /
                            Math.max(1, selectedShips.reduce((acc, s) => acc + s.hullMax, 0))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Aggregate Shield */}
              <div>
                <div className="flex justify-between text-slate-400 mb-0.5">
                  <span className="font-semibold text-cyan-300">FLEET SHIELDS</span>
                  <span className="text-cyan-200">
                    {Math.round(selectedShips.reduce((acc, s) => acc + s.shieldHp, 0))} /{' '}
                    {Math.round(selectedShips.reduce((acc, s) => acc + s.shieldHpMax, 0))}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          (selectedShips.reduce((acc, s) => acc + s.shieldHp, 0) /
                            Math.max(1, selectedShips.reduce((acc, s) => acc + s.shieldHpMax, 0))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Ordnance Totals */}
              <div className="flex justify-between pt-0.5 text-[9.5px] border-t border-slate-800 text-slate-400">
                <span>
                  MSSL: <strong className="text-amber-300">{selectedShips.reduce((acc, s) => acc + s.missiles, 0)}</strong>
                </span>
                <span>
                  CM: <strong className="text-emerald-300">{selectedShips.reduce((acc, s) => acc + s.counterMissiles, 0)}</strong>
                </span>
              </div>
            </div>
          </div>
        ) : selectedShip ? (
          <div
            id="compact-ship-status-card"
            className="pointer-events-auto flex items-center gap-3 bg-[#0a0f18]/94 backdrop-blur-md border border-slate-700/70 rounded-lg p-2.5 h-[98px] shadow-2xl min-w-[320px] max-w-[420px]"
          >
            {/* Unit Identification & Metadata */}
            <div className="flex flex-col justify-between h-full pr-2 border-r border-slate-800 flex-1 min-w-[140px]">
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-black text-sm tracking-wide truncate ${
                      selectedShip.faction === 'FRIENDLY'
                        ? 'text-cyan-300'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedShip.name}
                  </span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-bold border ${
                      selectedShip.faction === 'FRIENDLY'
                        ? 'bg-cyan-950/60 border-cyan-600/60 text-cyan-300'
                        : 'bg-rose-950/60 border-rose-600/60 text-rose-300'
                    }`}
                  >
                    {selectedShip.faction === 'FRIENDLY' ? 'USN' : 'OPFOR'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <span className="text-slate-200 font-semibold">
                    {getRoleBadge(selectedShip.role).label}
                  </span>
                  <span className="text-slate-600">[{getRoleBadge(selectedShip.role).code}]</span>
                </div>
              </div>

              {/* Vector & Kinematic Readout */}
              <div className="text-[10px] text-slate-400 leading-tight">
                <div>
                  SPD:{' '}
                  <strong className="text-slate-200">
                    {Math.round(
                      Math.hypot(selectedShip.velocity.x, selectedShip.velocity.y)
                    )}{' '}
                    km/s
                  </strong>
                </div>
                <div>
                  H2:{' '}
                  <span className="text-cyan-300 font-bold">
                    {Math.round(selectedShip.h2Fuel)}
                  </span>
                  <span className="text-slate-600">
                    /{Math.round(selectedShip.h2FuelMax)}
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Bar Gauges (Hull, Shield, Missile, CM, PD Overload) */}
            <div className="flex items-center gap-2 h-full py-0.5">
              {/* 1. HULL GAUGE (Bright Green) */}
              <div
                className="flex flex-col items-center h-full justify-between"
                title={`Hull: ${Math.round(selectedShip.hullHp)}/${selectedShip.hullMax} HP`}
              >
                <div className="w-2.5 h-[54px] bg-slate-900/90 border border-slate-700/80 rounded-sm overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full rounded-sm transition-all duration-150"
                    style={{
                      height: `${Math.max(
                        0,
                        Math.min(100, (selectedShip.hullHp / selectedShip.hullMax) * 100)
                      )}%`,
                      backgroundColor: '#00ff88',
                      boxShadow: '0 0 6px rgba(0, 255, 136, 0.4)',
                    }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">HUL</span>
              </div>

              {/* 2. SHIELD GAUGE (Cyan/Blue) */}
              <div
                className="flex flex-col items-center h-full justify-between"
                title={`Shield: ${Math.round(selectedShip.shieldHp)}/${selectedShip.shieldHpMax} HP`}
              >
                <div className="w-2.5 h-[54px] bg-slate-900/90 border border-slate-700/80 rounded-sm overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full rounded-sm transition-all duration-150"
                    style={{
                      height: `${
                        selectedShip.shieldHpMax > 0
                          ? Math.max(
                              0,
                              Math.min(100, (selectedShip.shieldHp / selectedShip.shieldHpMax) * 100)
                            )
                          : 0
                      }%`,
                      backgroundColor: '#00ccff',
                      boxShadow: '0 0 6px rgba(0, 204, 255, 0.4)',
                    }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">SHD</span>
              </div>

              {/* 3. MISSILE ORDNANCE GAUGE (Crimson Red) */}
              <div
                className="flex flex-col items-center h-full justify-between"
                title={`Missiles: ${selectedShip.missiles}/${selectedShip.missilesMax}`}
              >
                <div className="w-2.5 h-[54px] bg-slate-900/90 border border-slate-700/80 rounded-sm overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full rounded-sm transition-all duration-150"
                    style={{
                      height: `${
                        selectedShip.missilesMax > 0
                          ? Math.max(
                              0,
                              Math.min(100, (selectedShip.missiles / selectedShip.missilesMax) * 100)
                            )
                          : 0
                      }%`,
                      backgroundColor: '#ff3344',
                      boxShadow: '0 0 6px rgba(255, 51, 68, 0.4)',
                    }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">MSL</span>
              </div>

              {/* 4. COUNTER-MISSILE GAUGE (Amber Orange) */}
              <div
                className="flex flex-col items-center h-full justify-between"
                title={`Counter-Missiles: ${selectedShip.counterMissiles}/${
                  selectedShip.counterMissilesMax || 50
                }`}
              >
                <div className="w-2.5 h-[54px] bg-slate-900/90 border border-slate-700/80 rounded-sm overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full rounded-sm transition-all duration-150"
                    style={{
                      height: `${
                        (selectedShip.counterMissilesMax || 50) > 0
                          ? Math.max(
                              0,
                              Math.min(
                                100,
                                (selectedShip.counterMissiles /
                                  (selectedShip.counterMissilesMax || 50)) *
                                  100
                              )
                            )
                          : 0
                      }%`,
                      backgroundColor: '#ff9900',
                      boxShadow: '0 0 6px rgba(255, 153, 0, 0.4)',
                    }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">CM</span>
              </div>

              {/* 5. PD CAPACITOR OVERLOAD GAUGE (Segmented 5-Pip Vertical) */}
              <div
                className="flex flex-col items-center h-full justify-between"
                title={`Point-Defense Heat: ${
                  selectedShip.pdplaOverheated
                    ? 'OVERHEATED LOCKOUT (5.0s)'
                    : `${selectedShip.pdplaSalvoCount || 0}/5 Bursts`
                }`}
              >
                <div className="w-2.5 h-[54px] bg-slate-900/90 border border-slate-700/80 rounded-sm overflow-hidden flex flex-col-reverse justify-start p-0.5 gap-0.5">
                  {[1, 2, 3, 4, 5].map((pip) => {
                    const isOverheated = selectedShip.pdplaOverheated;
                    const filled = isOverheated || (selectedShip.pdplaSalvoCount || 0) >= pip;
                    let pipColor = '#1e293b';
                    if (filled) {
                      if (isOverheated || pip >= 4) {
                        pipColor = '#ff2222';
                      } else if (pip === 3) {
                        pipColor = '#ffcc00';
                      } else {
                        pipColor = '#00ff88';
                      }
                    }

                    return (
                      <div
                        key={pip}
                        className={`h-[8px] w-full rounded-xs transition-all ${
                          isOverheated ? 'animate-pulse' : ''
                        }`}
                        style={{
                          backgroundColor: pipColor,
                          boxShadow: filled ? `0 0 4px ${pipColor}` : 'none',
                        }}
                      />
                    );
                  })}
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-0.5">PD</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            id="no-selection-standby-card"
            className="pointer-events-auto flex items-center gap-2 bg-[#0a0f18]/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-2 h-[48px] text-slate-500 text-xs shadow-xl"
          >
            <Compass className="w-4 h-4 text-cyan-400/60" />
            <span>Select a naval craft or orbital facility to open telemetry</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. RIGHT MODULE: 14-SLOT (2x7) COMMAND MATRIX (CommandDeck) */}
        {/* ========================================================= */}
        <CommandDeck
          engine={engine}
          onSelectShip={onSelectShip}
          selectedShipIds={selectedShipIds}
          moveModeActive={moveModeActive}
          onToggleMoveMode={onToggleMoveMode}
          jumpModeActive={jumpModeActive}
          onToggleJumpMode={onToggleJumpMode}
          buildStructureType={buildStructureType}
          onSelectBuildStructure={onSelectBuildStructure}
          onOpenResearchModal={onOpenResearchModal}
        />
      </div>
    </div>
  );
};
