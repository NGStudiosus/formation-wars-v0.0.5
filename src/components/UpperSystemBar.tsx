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
  ChevronUp,
  Factory,
  Radio,
  Clock,
  AlertCircle,
  Zap,
  Target,
  Shield,
  Layers,
  Compass,
  Globe,
} from 'lucide-react';

import { HUDOverlay } from './HUDOverlay';

interface UpperSystemBarProps {
  engine: SimulationEngine;
  onOpenTestBench: () => void;
  onOpenCodeInspector: () => void;
  onOpenSettings: () => void;
  onResetScenario: () => void;
  onOpenResearchModal?: () => void;
  onFocusCoordinates?: (pos: { x: number; y: number }) => void;
}

export const UpperSystemBar: React.FC<UpperSystemBarProps> = ({
  engine,
  onOpenTestBench,
  onOpenCodeInspector,
  onOpenSettings,
  onResetScenario,
  onOpenResearchModal,
  onFocusCoordinates,
}) => {
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [isSystemDropdownOpen, setIsSystemDropdownOpen] = useState(false);
  const logDropdownRef = useRef<HTMLDivElement>(null);
  const systemDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (
        logDropdownRef.current &&
        !logDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLogExpanded(false);
      }
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
  // Refinery converts 30 Ore/s into 15.6 Met/s + 14.4 Org/s
  const isRefining = hq?.refineryActive && hqResources.ore >= 1;
  const activeUnloadingMiners = (engine.ships ?? []).filter(
    (s) => s && s.role === 'MINER' && (s as any).minerState === 'STATE_OFFLOAD'
  );
  const isMiningOffload = activeUnloadingMiners.length > 0;
  const oreDeltaRate = (isMiningOffload ? activeUnloadingMiners.length * 250 : 0) - (isRefining ? 30 : 0);
  const metDeltaRate = isRefining ? 15.6 : 0;
  const orgDeltaRate = isRefining ? 14.4 : 0;

  // Latest combat / telemetry log
  const allLogs = engine.combatLogs ?? [];
  const latestLog = allLogs.length > 0 ? allLogs[allLogs.length - 1] : null;
  const recentHistoricalLogs = allLogs.slice(-10).reverse();

  const getLogCategoryColor = (cat: string) => {
    switch (cat) {
      case 'JAM':
        return 'text-purple-400 border-purple-500/40 bg-purple-950/60';
      case 'PDPLA':
        return 'text-sky-300 border-sky-500/40 bg-sky-950/60';
      case 'INTERCEPT':
        return 'text-teal-300 border-teal-500/40 bg-teal-950/60';
      case 'ORDNANCE':
        return 'text-rose-400 border-rose-500/40 bg-rose-950/60';
      case 'SHIELD_DROP':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/60';
      case 'CRIPPLE':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/60';
      case 'DESTROY':
        return 'text-red-500 border-red-600/40 bg-red-950/70';
      case 'RESOURCE':
        return 'text-amber-300 border-amber-500/40 bg-amber-950/60';
      case 'LOGISTICS':
        return 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60';
      case 'MICROJUMP':
        return 'text-indigo-300 border-indigo-500/40 bg-indigo-950/60';
      case 'UNREP':
        return 'text-cyan-300 border-cyan-500/40 bg-cyan-950/60';
      default:
        return 'text-slate-300 border-slate-600/40 bg-slate-900/60';
    }
  };

  return (
    <header
      id="upper-system-bar"
      className="fixed top-0 left-0 right-0 h-[42px] z-50 bg-[#0a0f18]/92 backdrop-blur-md border-b border-slate-700/60 shadow-lg px-3 flex items-center justify-between pointer-events-auto select-none font-mono text-xs text-slate-300"
      style={{ minWidth: '768px' }}
    >
      {/* 1. LEFT SECTOR: SESSION CLOCK & OPERATIONAL TELEMETRY */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Status Beacon */}
        <div
          className={`w-2 h-2 rounded-full ${
            engine.isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
          }`}
          title={engine.isPaused ? 'Simulation Paused' : 'Simulation Active'}
        />

        {/* Brand / Game Title Badge */}
        <span className="font-bold text-slate-100 tracking-wider hidden sm:inline uppercase text-[11px]">
          Formation Wars
        </span>

        <span className="text-slate-600 hidden sm:inline">|</span>

        {/* Deterministic Match Clock */}
        <div
          id="session-clock"
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/90 border border-slate-700/70 rounded text-slate-200"
          title="Match Elapsed Time (Deterministic Simulation Clock: tickCount / 30)"
        >
          <Clock className="w-3 h-3 text-cyan-400" />
          <span className="font-semibold text-cyan-300 font-mono tracking-wider">
            {formattedClock}
          </span>
        </div>

        {/* Star Systems Galaxy Selector */}
        {engine.systems && engine.systems.length > 0 && (
          <div ref={systemDropdownRef} className="relative">
            <button
              id="star-system-selector-btn"
              onClick={() => setIsSystemDropdownOpen(!isSystemDropdownOpen)}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/90 hover:bg-slate-800/90 border border-sky-500/50 hover:border-sky-400 rounded text-slate-200 transition text-[11px]"
              title="Switch Camera Focus Between Star Systems"
            >
              <Compass className="w-3 h-3 text-sky-400" />
              <span className="font-mono text-sky-300 font-bold hidden sm:inline">
                {engine.systems.find((s) => s.id === (engine as any).activeSystemId)?.name || engine.systems[0].name}
              </span>
              <span className="text-slate-500 text-[9px] font-mono">
                ({engine.systems.length} SYS)
              </span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {isSystemDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-slate-950/95 border border-sky-500/40 rounded shadow-xl backdrop-blur-md z-50 py-1 font-mono text-[11px]">
                <div className="px-2.5 py-1 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Galactic Star Systems</span>
                  <span className="text-sky-400 font-normal">{engine.systems.length} connected</span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {engine.systems.map((sys) => (
                    <button
                      key={sys.id}
                      onClick={() => {
                        (engine as any).activeSystemId = sys.id;
                        onFocusCoordinates?.(sys.center);
                        setIsSystemDropdownOpen(false);
                        engine.addLog('TACTICAL', `Relocated view to System: ${sys.name} [${sys.starType}]`, 'info');
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-sky-950/50 hover:text-sky-300 flex items-center justify-between transition border-b border-slate-900/60 last:border-b-0"
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
                        {sys.starType.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simulation Tick / Engine Health */}
        <div
          id="simulation-tick-indicator"
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-900/90 border border-slate-700/70 rounded text-[11px]"
          title="Active Step Performance Duration"
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
            {engine.benchmark.tickMs.toFixed(2)}ms
          </span>
        </div>
      </div>

      {/* 2. CENTER SECTOR: STRATEGIC RESOURCE STOCKPILE */}
      <div
        id="strategic-stockpile-dock"
        className="flex items-center gap-2 md:gap-3 flex-shrink-0"
      >
        <span className="text-[10px] font-bold text-slate-400 uppercase hidden lg:flex items-center gap-1">
          <Factory className="w-3 h-3 text-cyan-400" />
          HQ SILOS:
        </span>

        {/* RAW ORE SILO */}
        <div
          id="res-silo-ore"
          className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/95 border border-amber-500/40 rounded shadow-sm"
          title={`Raw Ore Silo: ${Math.round(hqResources?.ore ?? 0).toLocaleString()} / ${(hqResources?.maxOre ?? 16000).toLocaleString()} | Capacity 16,000`}
        >
          <span className="text-amber-400 text-[10px] font-bold">ORE:</span>
          <span className="text-amber-200 font-bold font-mono text-[11px]">
            {Math.round(hqResources?.ore ?? 0).toLocaleString()}
            <span className="text-slate-500 font-normal text-[9px]"> / 16K</span>
          </span>
          {oreDeltaRate !== 0 && (
            <span
              className={`text-[9px] font-bold px-1 rounded ${
                oreDeltaRate > 0
                  ? 'text-emerald-300 bg-emerald-950/80'
                  : 'text-amber-300 bg-amber-950/80'
              }`}
            >
              {oreDeltaRate > 0 ? `+${oreDeltaRate}/s` : `${oreDeltaRate}/s`}
            </span>
          )}
        </div>

        {/* METALLIC SILO */}
        <div
          id="res-silo-metallic"
          className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/95 border border-sky-500/40 rounded shadow-sm"
          title={`Refined Metallic: ${Math.round(hqResources?.metallic ?? 0).toLocaleString()} / ${(hqResources?.maxMetallic ?? 100000).toLocaleString()} | Capacity 100,000`}
        >
          <span className="text-sky-400 text-[10px] font-bold">METALLIC:</span>
          <span className="text-sky-200 font-bold font-mono text-[11px]">
            {Math.round(hqResources?.metallic ?? 0).toLocaleString()}
            <span className="text-slate-500 font-normal text-[9px]"> / 100K</span>
          </span>
          {metDeltaRate > 0 && (
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1 rounded">
              +{metDeltaRate}/s
            </span>
          )}
        </div>

        {/* ORGANIC SILO */}
        <div
          id="res-silo-organic"
          className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/95 border border-emerald-500/40 rounded shadow-sm"
          title={`Refined Organic: ${Math.round(hqResources?.organic ?? 0).toLocaleString()} / ${(hqResources?.maxOrganic ?? 100000).toLocaleString()} | Capacity 100,000`}
        >
          <span className="text-emerald-400 text-[10px] font-bold">ORGANIC:</span>
          <span className="text-emerald-200 font-bold font-mono text-[11px]">
            {Math.round(hqResources?.organic ?? 0).toLocaleString()}
            <span className="text-slate-500 font-normal text-[9px]"> / 100K</span>
          </span>
          {orgDeltaRate > 0 && (
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1 rounded">
              +{orgDeltaRate}/s
            </span>
          )}
        </div>
      </div>

      {/* 3. CENTER-RIGHT SECTOR: COMPACT TELEMETRY MARQUEE & EXPANDABLE LOG */}
      <div
        ref={logDropdownRef}
        className="relative flex-1 max-w-sm xl:max-w-md mx-2 hidden md:block"
      >
        <div
          id="telemetry-marquee"
          onClick={() => setIsLogExpanded(!isLogExpanded)}
          className="flex items-center justify-between gap-2 px-2.5 py-0.5 bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/60 rounded cursor-pointer transition text-[11px] overflow-hidden group"
          title="Click to expand/collapse historical combat telemetry"
        >
          {latestLog ? (
            <div className="flex items-center gap-2 truncate">
              <span
                className={`text-[9px] px-1 py-0.2 rounded border font-semibold uppercase flex-shrink-0 ${getLogCategoryColor(
                  latestLog.category || latestLog.type
                )}`}
              >
                {latestLog.category || latestLog.type}
              </span>
              <span className="text-slate-300 truncate group-hover:text-slate-100">
                {latestLog.message || latestLog.text}
              </span>
            </div>
          ) : (
            <span className="text-slate-500 italic">Telemetry stand-by...</span>
          )}

          <button
            type="button"
            id="btn-toggle-log-marquee"
            className="p-0.5 text-slate-400 hover:text-slate-200 flex-shrink-0"
            aria-label="Toggle Log Details"
          >
            {isLogExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Expanded Historical Telemetry Dropdown */}
        {isLogExpanded && (
          <div
            id="telemetry-expanded-dropdown"
            className="absolute top-[38px] left-0 right-0 w-[420px] bg-[#0a0f18]/98 backdrop-blur-xl border border-slate-700/80 rounded-lg shadow-2xl p-2.5 z-50 text-xs font-mono space-y-1.5 max-h-[300px] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-cyan-400" />
                Historical Telemetry (Last 10 Events)
              </span>
              <span className="text-slate-500 font-normal">
                Total: {allLogs.length} events
              </span>
            </div>

            <div className="space-y-1 divide-y divide-slate-800/60">
              {recentHistoricalLogs.length === 0 ? (
                <div className="text-slate-500 py-3 text-center italic">
                  No telemetry events recorded yet.
                </div>
              ) : (
                recentHistoricalLogs.map((log) => (
                  <div key={log.id} className="pt-1 flex items-start gap-2 text-[11px]">
                    <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">
                      {log.time || (log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '')}
                    </span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded border font-semibold uppercase flex-shrink-0 ${getLogCategoryColor(
                        log.category || log.type
                      )}`}
                    >
                      {log.category || log.type}
                    </span>
                    <span
                      className={`flex-1 break-words leading-tight ${
                        log.severity === 'danger' || log.severity === 'crit'
                          ? 'text-rose-400'
                          : log.severity === 'warn'
                          ? 'text-amber-300'
                          : 'text-slate-200'
                      }`}
                    >
                      {log.message || log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. FAR RIGHT SECTOR: UTILITY CONTROLS */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Pause / Play Deterministic Simulation */}
        <button
          id="btn-pause-play-sim"
          onClick={() => engine.togglePause()}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
            engine.isPaused
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse'
              : 'bg-slate-900 border-slate-700/80 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300'
          }`}
          title="Pause / Resume Simulation [Spacebar]"
        >
          {engine.isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">RESUME</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">PAUSE</span>
            </>
          )}
        </button>

        {/* Test Bench Trigger */}
        <button
          id="btn-nav-testbench"
          onClick={onOpenTestBench}
          className="flex items-center gap-1 px-2 py-1 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 rounded text-cyan-200 text-xs transition cursor-pointer"
          title="Scenarios & Parameter Tuning"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline text-[11px]">Scenarios</span>
        </button>

        {/* Code / UE5 Schemas Trigger */}
        <button
          id="btn-nav-code"
          onClick={onOpenCodeInspector}
          className="flex items-center gap-1 px-2 py-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 rounded text-indigo-200 text-xs transition cursor-pointer"
          title="Python Script & Unreal C++ Schemas"
        >
          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline text-[11px]">Code</span>
        </button>

        {/* Settings Modal (Gear Icon) */}
        <button
          id="btn-nav-settings"
          onClick={onOpenSettings}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
          title="Open System Settings & Display Scaling [Hotkey: O]"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Reset Scenario Button */}
        <button
          id="btn-nav-reset"
          onClick={onResetScenario}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded text-slate-400 hover:text-slate-200 transition cursor-pointer"
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
