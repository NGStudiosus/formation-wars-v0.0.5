import React, { useState, useEffect, useRef } from 'react';
import { SimulationEngine } from '../simulation/engine';
import {
  Play,
  Pause,
  Sliders,
  FileCode,
  Settings,
  RotateCcw,
  ChevronDown,
  Clock,
  Compass,
  Handshake,
} from 'lucide-react';
import { OreIcon, MetalIcon, OrganicsIcon, NeridiumIcon } from './ResourceIcons';
import { HUDOverlay } from './HUDOverlay';

interface UpperSystemBarProps {
  engine: SimulationEngine;
  onOpenTestBench: () => void;
  onOpenCodeInspector: () => void;
  onOpenSettings: () => void;
  onResetScenario: () => void;
  onOpenResearchModal?: () => void;
  onOpenDiplomacy?: () => void;
  onFocusCoordinates?: (pos: { x: number; y: number }) => void;
}

// Utility to format strategic resource amounts concisely
function formatCompactResource(val: number): string {
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)}M`;
  }
  if (val >= 100_000) {
    return `${Math.round(val / 1_000)}K`;
  }
  if (val >= 10_000) {
    return `${(val / 1_000).toFixed(1)}K`;
  }
  return Math.round(val).toLocaleString();
}

export const UpperSystemBar: React.FC<UpperSystemBarProps> = ({
  engine,
  onOpenTestBench,
  onOpenCodeInspector,
  onOpenSettings,
  onResetScenario,
  onOpenResearchModal,
  onOpenDiplomacy,
  onFocusCoordinates,
}) => {
  const [isSystemDropdownOpen, setIsSystemDropdownOpen] = useState(false);
  const [, setTick] = useState(0);
  const systemDropdownRef = useRef<HTMLDivElement>(null);

  // Local throttled telemetry refresh (every 6 ticks ~ 5Hz)
  useEffect(() => {
    if (!engine) return;
    const unsubscribe = engine.subscribeTick((tickCount) => {
      if (tickCount % 6 === 0) {
        setTick(tickCount);
      }
    });
    return () => unsubscribe();
  }, [engine]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (
        systemDropdownRef.current &&
        !systemDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSystemDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, []);

  // Deterministic match elapsed time: T_elapsed = tickCount / 30
  const totalSeconds = Math.floor((engine.tickCount || 0) / 30);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formattedClock =
    hours > 0
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const hq = engine.getHQ();
  const hqResources = engine.getHQResources();

  // Dynamic Delta Calculations
  const isRefining = hq?.refineryActive && hqResources.ore >= 1;
  const activeUnloadingMiners = (engine.ships ?? []).filter(
    (s) => s && s.role === 'MINER' && (s as any).minerState === 'STATE_OFFLOAD'
  );
  const isMiningOffload = activeUnloadingMiners.length > 0;
  const oreDeltaRate = (isMiningOffload ? activeUnloadingMiners.length * 250 : 0) - (isRefining ? 30 : 0);
  const metDeltaRate = isRefining ? 15.6 : 0;
  const orgDeltaRate = isRefining ? 14.4 : 0;

  return (
    <header
      id="upper-system-bar"
      className="fixed top-0 left-0 right-0 h-[40px] z-50 bg-[#070b12]/95 backdrop-blur-md border-b border-slate-700/60 shadow-lg px-2 sm:px-3 flex items-center justify-between pointer-events-auto select-none font-mono text-xs text-slate-300"
    >
      {/* 1. LEFT SECTOR: SESSION CLOCK & GALAXY SYSTEM SELECTOR */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Status Beacon */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            engine.isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
          }`}
          title={engine.isPaused ? 'Simulation Paused' : 'Simulation Active'}
        />

        {/* Brand / Game Title Badge */}
        <span className="font-bold text-slate-100 tracking-wider hidden lg:inline uppercase text-[11px]">
          Formation Wars
        </span>

        <span className="text-slate-600 hidden lg:inline">|</span>

        {/* Deterministic Match Clock */}
        <div
          id="session-clock"
          className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/90 border border-slate-700/70 rounded text-slate-200"
          title="Match Elapsed Time (Deterministic Simulation Clock: tickCount / 30)"
        >
          <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
          <span className="font-semibold text-cyan-300 font-mono tracking-wider text-[11px]">
            {formattedClock}
          </span>
        </div>

        {/* Star Systems Galaxy Selector */}
        {engine.systems && engine.systems.length > 0 && (
          <div ref={systemDropdownRef} className="relative">
            <button
              id="star-system-selector-btn"
              onClick={() => setIsSystemDropdownOpen(!isSystemDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/90 hover:bg-slate-800/90 border border-sky-500/50 hover:border-sky-400 rounded text-slate-200 transition text-[11px] cursor-pointer"
              title="Switch Camera Focus Between Star Systems"
            >
              <Compass className="w-3 h-3 text-sky-400 flex-shrink-0" />
              <span className="font-mono text-sky-300 font-bold max-w-[90px] sm:max-w-[120px] truncate">
                {engine.systems.find((s) => s.id === (engine as any).activeSystemId)?.name || engine.systems[0].name}
              </span>
              <span className="text-slate-500 text-[9px] font-mono hidden sm:inline">
                ({engine.systems.length}S)
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {isSystemDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-slate-950/98 border border-sky-500/40 rounded-lg shadow-2xl backdrop-blur-xl z-50 py-1 font-mono text-[11px] animate-in fade-in slide-in-from-top-1">
                <div className="px-2.5 py-1 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Galactic Systems</span>
                  <span className="text-sky-400 font-normal">{engine.systems.length} connected</span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {engine.systems.map((sys) => (
                    <button
                      key={sys.id}
                      onClick={() => {
                        (engine as any).activeSystemId = sys.id;
                        onFocusCoordinates?.(sys.center);
                        setIsSystemDropdownOpen(false);
                        engine.addLog('TACTICAL', `Relocated view to System: ${sys.name} [${sys.starType}]`, 'info');
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-sky-950/50 hover:text-sky-300 flex items-center justify-between transition border-b border-slate-900/60 last:border-b-0 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: sys.starColor || '#f59e0b' }}
                        />
                        <div className="truncate">
                          <div className="font-bold text-slate-200 truncate">{sys.name}</div>
                          <div className="text-[9px] text-slate-400">
                            {sys.planets.length} Planets • {sys.asteroids.length} Nodes
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 flex-shrink-0 ml-1">
                        {String(sys.starType || 'STAR').replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simulation Tick / Engine Benchmark */}
        <div
          id="simulation-tick-indicator"
          className="hidden xl:flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/80 border border-slate-800 rounded text-[10px]"
          title="Simulation Step Latency"
        >
          <span className="text-slate-500 font-bold">TICK:</span>
          <span
            className={`font-semibold ${
              engine.benchmark.tickMs < 8
                ? 'text-emerald-400'
                : engine.benchmark.tickMs < 16
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {engine.benchmark.tickMs.toFixed(1)}ms
          </span>
        </div>
      </div>

      {/* 2. CENTER SECTOR: COMPACT STRATEGIC RESOURCE SILOS WITH CUSTOM ICONS */}
      <div
        id="strategic-stockpile-dock"
        className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 flex-shrink-0"
      >
        {/* RAW ORE SILO */}
        <div
          id="res-silo-ore"
          className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-slate-900/90 hover:bg-slate-900 border border-amber-500/40 hover:border-amber-400/70 rounded shadow-sm transition group cursor-default"
          title={`Raw Asteroid Ore: ${Math.round(hqResources?.ore ?? 0).toLocaleString()} / ${(hqResources?.maxOre ?? 16000).toLocaleString()}\nCapacity: 16,000 units\nRefinery Input: 30 Ore/s`}
        >
          <OreIcon className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-amber-200 font-bold font-mono text-[11px]">
              {formatCompactResource(hqResources?.ore ?? 0)}
            </span>
            <span className="text-slate-500 font-normal text-[9px] hidden md:inline">
              /16K
            </span>
          </div>
          {oreDeltaRate !== 0 && (
            <span
              className={`text-[8.5px] font-bold px-1 py-0 rounded ${
                oreDeltaRate > 0
                  ? 'text-emerald-300 bg-emerald-950/90 border border-emerald-500/40'
                  : 'text-amber-300 bg-amber-950/90 border border-amber-500/40'
              }`}
            >
              {oreDeltaRate > 0 ? `+${oreDeltaRate}` : `${oreDeltaRate}`}
            </span>
          )}
        </div>

        {/* METALLIC SILO */}
        <div
          id="res-silo-metallic"
          className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-slate-900/90 hover:bg-slate-900 border border-sky-500/40 hover:border-sky-400/70 rounded shadow-sm transition group cursor-default"
          title={`Refined Metallic Alloys: ${Math.round(hqResources?.metallic ?? 0).toLocaleString()} / ${(hqResources?.maxMetallic ?? 100000).toLocaleString()}\nCapacity: 100,000 units\nUsed for Hull & Shipyard Construction`}
        >
          <MetalIcon className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-sky-200 font-bold font-mono text-[11px]">
              {formatCompactResource(hqResources?.metallic ?? 0)}
            </span>
            <span className="text-slate-500 font-normal text-[9px] hidden md:inline">
              /100K
            </span>
          </div>
          {metDeltaRate > 0 && (
            <span className="text-[8.5px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-1 py-0 rounded">
              +{Math.round(metDeltaRate)}
            </span>
          )}
        </div>

        {/* ORGANIC SILO */}
        <div
          id="res-silo-organic"
          className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-slate-900/90 hover:bg-slate-900 border border-emerald-500/40 hover:border-emerald-400/70 rounded shadow-sm transition group cursor-default"
          title={`Refined Organic Hydrocarbons: ${Math.round(hqResources?.organic ?? 0).toLocaleString()} / ${(hqResources?.maxOrganic ?? 100000).toLocaleString()}\nCapacity: 100,000 units\nUsed for Crew Habitats & Bio-Polymers`}
        >
          <OrganicsIcon className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-emerald-200 font-bold font-mono text-[11px]">
              {formatCompactResource(hqResources?.organic ?? 0)}
            </span>
            <span className="text-slate-500 font-normal text-[9px] hidden md:inline">
              /100K
            </span>
          </div>
          {orgDeltaRate > 0 && (
            <span className="text-[8.5px] font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-1 py-0 rounded">
              +{Math.round(orgDeltaRate)}
            </span>
          )}
        </div>

        {/* NERIDIUM SILO */}
        <div
          id="res-silo-neridium"
          className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-slate-900/90 hover:bg-slate-900 border border-purple-500/40 hover:border-purple-400/70 rounded shadow-sm transition group cursor-default"
          title={`Refined Neridium Crystals: ${Math.round(hqResources?.neridium ?? 0).toLocaleString()} / ${(hqResources?.maxNeridium ?? 1000).toLocaleString()}\nRare Strategic Material for Capital Warships`}
        >
          <NeridiumIcon className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-purple-200 font-bold font-mono text-[11px]">
              {formatCompactResource(hqResources?.neridium ?? 0)}
            </span>
            <span className="text-slate-500 font-normal text-[9px] hidden md:inline">
              /1K
            </span>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SECTOR: COMPACT UTILITY CONTROLS */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Pause / Play Deterministic Simulation */}
        <button
          id="btn-pause-play-sim"
          onClick={() => engine.togglePause()}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border transition cursor-pointer ${
            engine.isPaused
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse'
              : 'bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300'
          }`}
          title="Pause / Resume Simulation [Spacebar]"
        >
          {engine.isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-[10.5px] hidden sm:inline">RESUME</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-[10.5px] hidden sm:inline">PAUSE</span>
            </>
          )}
        </button>

        {/* Scenarios / Test Bench Trigger */}
        <button
          id="btn-nav-testbench"
          onClick={onOpenTestBench}
          className="flex items-center gap-1 px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 rounded text-cyan-200 text-xs transition cursor-pointer"
          title="Scenarios & Parameter Tuning"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="hidden xl:inline text-[11px]">Scenarios</span>
        </button>

        {/* Code / UE5 Schemas Trigger */}
        <button
          id="btn-nav-code"
          onClick={onOpenCodeInspector}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 rounded text-indigo-200 text-xs transition cursor-pointer"
          title="Python Script & Unreal C++ Schemas"
        >
          <FileCode className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="hidden xl:inline text-[11px]">Code</span>
        </button>

        {/* Diplomacy Matrix Trigger */}
        {onOpenDiplomacy && (
          <button
            id="btn-nav-diplomacy"
            onClick={onOpenDiplomacy}
            className="flex items-center gap-1 px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 rounded text-emerald-200 text-xs transition cursor-pointer"
            title="Diplomacy Matrix & Coalition Teams [Hotkey: D]"
          >
            <Handshake className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="hidden xl:inline text-[11px]">Diplomacy</span>
          </button>
        )}

        {/* Settings Modal (Gear Icon) */}
        <button
          id="btn-nav-settings"
          onClick={onOpenSettings}
          className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
          title="Open System Settings & Display Scaling [Hotkey: O]"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Reset Scenario Button */}
        <button
          id="btn-nav-reset"
          onClick={onResetScenario}
          className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
          title="Reset Simulation Scenario"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Upper Ribbon Beaker Trigger (Research Archive Launch Tab) */}
      {onOpenResearchModal && (
        <HUDOverlay
          onOpenResearchModal={onOpenResearchModal}
          militaryCount={engine.researchStations?.military ?? 0}
          civicCount={engine.researchStations?.civic ?? 0}
          expansionCount={engine.researchStations?.expansion ?? 0}
        />
      )}
    </header>
  );
};

