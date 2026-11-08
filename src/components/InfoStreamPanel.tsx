import React, { useState, useEffect, useRef } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { useSettingsStore } from '../state/settingsStore';
import {
  Radio,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
  Filter,
  Shield,
  Zap,
  Target,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface InfoStreamPanelProps {
  engine: SimulationEngine;
}

export const InfoStreamPanel: React.FC<InfoStreamPanelProps> = ({ engine }) => {
  const { settings, toggleInfoStreamMode } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const infoStreamMode = settings?.infoStreamMode ?? 'DEFAULT';

  // Subscribe to engine ticks for smooth, throttled telemetry updates (30Hz -> 5Hz)
  useEffect(() => {
    if (!engine) return;
    const unsubscribe = engine.subscribeTick((tickCount) => {
      if (tickCount % 6 === 0) {
        setTick(tickCount);
      }
    });
    return () => unsubscribe();
  }, [engine]);

  // Click-outside listener to collapse expanded historical log
  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDownOutside);
    return () => {
      window.removeEventListener('mousedown', handlePointerDownOutside);
    };
  }, []);

  if (settings.panelsVisible?.telemetryLog === false) {
    return null;
  }

  const allRawLogs = engine.combatLogs ?? [];
  // In DEFAULT mode, only stream logs originating from or directly involving player-owned units.
  // In DEBUG mode, stream everything from any and all units (NPCs, pirates, defenders, neutrals).
  const modeFilteredLogs =
    infoStreamMode === 'DEBUG'
      ? allRawLogs
      : allRawLogs.filter((l) => l.isPlayerOwned !== false);

  const filteredLogs = filterCategory
    ? modeFilteredLogs.filter((l) => (l.category || l.type) === filterCategory)
    : modeFilteredLogs;
  const latestLog = modeFilteredLogs.length > 0 ? modeFilteredLogs[modeFilteredLogs.length - 1] : null;
  const recentLogs = filteredLogs.slice(-15).reverse();

  const getLogCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'JAM':
        return {
          color: 'text-purple-300 border-purple-500/50 bg-purple-950/70',
          dot: 'bg-purple-400',
        };
      case 'PDPLA':
        return {
          color: 'text-sky-300 border-sky-500/50 bg-sky-950/70',
          dot: 'bg-sky-400',
        };
      case 'INTERCEPT':
        return {
          color: 'text-teal-300 border-teal-500/50 bg-teal-950/70',
          dot: 'bg-teal-400',
        };
      case 'ORDNANCE':
        return {
          color: 'text-rose-300 border-rose-500/50 bg-rose-950/70',
          dot: 'bg-rose-400',
        };
      case 'SHIELD_DROP':
        return {
          color: 'text-blue-300 border-blue-500/50 bg-blue-950/70',
          dot: 'bg-blue-400',
        };
      case 'CRIPPLE':
        return {
          color: 'text-amber-300 border-amber-500/50 bg-amber-950/70',
          dot: 'bg-amber-400',
        };
      case 'DESTROY':
        return {
          color: 'text-red-400 border-red-500/60 bg-red-950/80',
          dot: 'bg-red-500 animate-ping',
        };
      case 'RESOURCE':
      case 'SALVAGE':
        return {
          color: 'text-amber-300 border-amber-500/50 bg-amber-950/70',
          dot: 'bg-amber-400',
        };
      case 'LOGISTICS':
        return {
          color: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/70',
          dot: 'bg-emerald-400',
        };
      case 'MICROJUMP':
        return {
          color: 'text-indigo-300 border-indigo-500/50 bg-indigo-950/70',
          dot: 'bg-indigo-400',
        };
      case 'UNREP':
        return {
          color: 'text-cyan-300 border-cyan-500/50 bg-cyan-950/70',
          dot: 'bg-cyan-400',
        };
      default:
        return {
          color: 'text-slate-300 border-slate-700/60 bg-slate-900/70',
          dot: 'bg-slate-400',
        };
    }
  };

  const categories = ['ORDNANCE', 'PDPLA', 'CRIPPLE', 'DESTROY', 'SALVAGE', 'LOGISTICS'];

  return (
    <div
      ref={panelRef}
      id="info-stream-second-level-panel"
      style={{
        position: 'fixed',
        top: '48px',
        right: '16px',
        zIndex: 42,
      }}
      className="select-none font-mono text-xs pointer-events-auto"
    >
      {/* Minimized Pill View */}
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#090d16]/92 hover:bg-[#0f172a]/95 backdrop-blur-md border border-cyan-500/40 hover:border-cyan-400 rounded-lg shadow-xl text-slate-200 transition-all cursor-pointer group"
          title="Restore Tactical Info Stream Marquee"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <Radio className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">
            INFO STREAM
          </span>
          <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-white" />
        </button>
      ) : (
        /* Standard Stream Marquee Card */
        <div className="flex flex-col items-end">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 bg-[#090d16]/92 backdrop-blur-md border transition-all duration-150 rounded-lg shadow-2xl max-w-[440px] md:max-w-[480px] ${
              isExpanded
                ? 'border-cyan-400/80 shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                : 'border-slate-700/80 hover:border-slate-600'
            }`}
          >
            {/* Live Beacon Indicator */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="text-[10px] font-bold text-cyan-400/90 tracking-wider hidden sm:inline">
                LIVE
              </span>
            </div>

            <span className="text-slate-600 flex-shrink-0">|</span>

            {/* Marquee Content Body (Clickable to expand) */}
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 truncate flex-1 cursor-pointer group"
              title="Click to expand full historical combat & logistics telemetry"
            >
              {latestLog ? (
                <>
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded border font-bold uppercase flex-shrink-0 ${
                      getLogCategoryMeta(latestLog.category || latestLog.type).color
                    }`}
                  >
                    {latestLog.category || latestLog.type}
                  </span>
                  <span className="text-slate-200 text-[11px] truncate group-hover:text-cyan-200 transition-colors leading-tight">
                    {latestLog.message || latestLog.text}
                  </span>
                </>
              ) : (
                <span className="text-slate-500 italic text-[11px]">Telemetry listening...</span>
              )}
            </div>

            {/* Action Buttons: Expand & Minimize */}
            <div className="flex items-center gap-1 flex-shrink-0 pl-1 border-l border-slate-800">
              <button
                type="button"
                id="btn-toggle-info-stream-expanded"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition cursor-pointer"
                title={isExpanded ? 'Collapse Telemetry History' : 'Expand Telemetry History'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                id="btn-minimize-info-stream"
                onClick={() => {
                  setIsMinimized(true);
                  setIsExpanded(false);
                }}
                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition cursor-pointer"
                title="Minimize Info Stream to Pill"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Historical Telemetry Dropdown / Drawer */}
          {isExpanded && (
            <div
              id="historical-telemetry-drawer"
              className="mt-1.5 w-[440px] md:w-[500px] max-h-[340px] bg-[#090d16]/98 backdrop-blur-xl border border-cyan-500/50 rounded-lg shadow-2xl p-3 z-50 text-xs flex flex-col space-y-2 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              {/* Header with Title & Filters */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[10px] gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-300 uppercase">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Feed ({filteredLogs.length})</span>
                  <button
                    type="button"
                    id="btn-info-stream-mode-badge"
                    onClick={toggleInfoStreamMode}
                    className={`ml-1 px-1.5 py-0.2 rounded border text-[8.5px] font-mono tracking-wider font-bold transition cursor-pointer ${
                      infoStreamMode === 'DEBUG'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                        : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60'
                    }`}
                    title={`Click to toggle Info Stream Mode (Currently: ${infoStreamMode === 'DEBUG' ? 'DEBUG: ALL UNITS' : 'DEFAULT: PLAYER UNITS ONLY'})`}
                  >
                    {infoStreamMode === 'DEBUG' ? '[DEBUG: ALL UNITS]' : '[PLAYER ONLY]'}
                  </button>
                </div>

                {/* Quick Filter Pill Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterCategory(null)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                      filterCategory === null
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ALL
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition ${
                        filterCategory === cat
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Logs List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[260px] divide-y divide-slate-800/60">
                {recentLogs.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 italic text-[11px]">
                    No matching telemetry logs in buffer.
                  </div>
                ) : (
                  recentLogs.map((log) => {
                    const meta = getLogCategoryMeta(log.category || log.type);
                    return (
                      <div key={log.id} className="pt-1.5 flex items-start gap-2 text-[11px]">
                        <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono mt-0.5">
                          {log.time ||
                            (log.timestamp
                              ? new Date(log.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : '')}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase flex-shrink-0 mt-0.5 ${meta.color}`}
                        >
                          {log.category || log.type}
                        </span>
                        <span
                          className={`flex-1 break-words leading-tight ${
                            log.severity === 'danger' || log.severity === 'crit'
                              ? 'text-rose-400 font-semibold'
                              : log.severity === 'warn'
                              ? 'text-amber-300'
                              : 'text-slate-200'
                          }`}
                        >
                          {log.message || log.text}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
