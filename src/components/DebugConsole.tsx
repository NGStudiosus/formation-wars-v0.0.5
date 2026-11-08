import React, { useState } from 'react';
import { GameState } from '../types';
import {
  addDebugResources,
  unlockResearch,
  toggleFreeResearch,
  toggleRevealMap,
} from '../simulation/debugCheats';
import { Terminal, X, Zap, Eye, Database, FlaskConical, Check, ShieldAlert, Globe, Castle, Radio } from 'lucide-react';
import { OreIcon, MetalIcon, OrganicsIcon, NeridiumIcon } from './ResourceIcons';
import { useSettingsStore } from '../state/settingsStore';
import { HomeworldTypeId, HqTypeId } from '../types';
import {
  HOMEWORLD_REGISTRY,
  ALL_HOMEWORLD_TYPES,
  HQ_REGISTRY,
  ALL_HQ_TYPES,
} from '../simulation/hqRegistry';

interface DebugConsoleProps {
  state: GameState | any;
  onStateModified?: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ state, onStateModified }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { settings, toggleInfoStreamMode } = useSettingsStore();

  const isFreeResearch = Boolean(state?.debugState?.freeResearch);
  const isRevealMap = Boolean(state?.debugState?.revealAllMap);
  const infoStreamMode = settings?.infoStreamMode ?? 'DEFAULT';

  const handleAddResource = (type: 'ore' | 'metallic' | 'organic' | 'neridium', amount: number) => {
    if (!state) return;
    addDebugResources(state, type, amount);
    onStateModified?.();
  };

  const handleUnlockResearch = (discipline?: 'MILITARY' | 'CIVILIAN' | 'EXPANSION' | 'HQ' | 'ALL') => {
    if (!state) return;
    unlockResearch(state, discipline);
    onStateModified?.();
  };

  const handleToggleFreeResearch = () => {
    if (!state) return;
    toggleFreeResearch(state);
    onStateModified?.();
  };

  const handleToggleRevealMap = () => {
    if (!state) return;
    toggleRevealMap(state);
    onStateModified?.();
  };

  return (
    <>
      {/* 1. Launcher Pill Button (Docked top-left under primary ribbon) */}
      <button
        id="debug-console-launcher-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed top-[52px] left-[16px] z-[9999] flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono tracking-wider transition-all duration-150 border ${
          isOpen
            ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-bold'
            : isFreeResearch || isRevealMap
            ? 'bg-amber-950/80 text-amber-300 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)] animate-pulse'
            : 'bg-black/80 text-amber-400/90 border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/40 hover:text-amber-200'
        }`}
        title="Toggle Developer Cheat Matrix & Tactical Console"
      >
        <Terminal className="w-3.5 h-3.5" />
        <span>[DEBUG]</span>
        {(isFreeResearch || isRevealMap) && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_4px_#34d399]" />
        )}
      </button>

      {/* 2. Cheat Matrix Modal / Docked Panel */}
      {isOpen && (
        <div
          id="debug-console-matrix-panel"
          className="fixed top-[84px] left-[16px] z-[9999] w-[320px] bg-[#050811]/95 border border-amber-500/40 rounded shadow-2xl backdrop-blur-md text-slate-200 font-mono text-xs overflow-hidden flex flex-col select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-amber-950/40 border-b border-amber-500/30">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold tracking-wide">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>DEV CHEAT MATRIX</span>
            </div>
            <button
              id="debug-console-close-btn"
              onClick={() => setIsOpen(false)}
              className="text-amber-400/70 hover:text-amber-200 hover:bg-amber-900/40 p-0.5 rounded transition-colors"
              title="Close Matrix"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            {/* Section A: Resource Injections */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-400/80 tracking-widest border-b border-amber-500/20 pb-1">
                <Database className="w-3 h-3" />
                <span>Resource Stockpile Injection</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  id="debug-add-ore-btn"
                  onClick={() => handleAddResource('ore', 5000)}
                  className="flex flex-col items-center justify-center p-1.5 bg-slate-900/80 hover:bg-amber-950/80 text-amber-300 border border-amber-500/40 hover:border-amber-400 rounded text-[10px] font-mono transition-all text-center gap-1 cursor-pointer"
                  title="Inject +5,000 Raw Ore"
                >
                  <OreIcon className="w-3.5 h-3.5" />
                  <span>+5K ORE</span>
                </button>
                <button
                  id="debug-add-metallic-btn"
                  onClick={() => handleAddResource('metallic', 10000)}
                  className="flex flex-col items-center justify-center p-1.5 bg-slate-900/80 hover:bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded text-[10px] font-mono transition-all text-center gap-1 cursor-pointer"
                  title="Inject +10,000 Metallic Elements"
                >
                  <MetalIcon className="w-3.5 h-3.5" />
                  <span>+10K MET</span>
                </button>
                <button
                  id="debug-add-organic-btn"
                  onClick={() => handleAddResource('organic', 10000)}
                  className="flex flex-col items-center justify-center p-1.5 bg-slate-900/80 hover:bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 rounded text-[10px] font-mono transition-all text-center gap-1 cursor-pointer"
                  title="Inject +10,000 Organic Polymers"
                >
                  <OrganicsIcon className="w-3.5 h-3.5" />
                  <span>+10K ORG</span>
                </button>
                <button
                  id="debug-add-neridium-btn"
                  onClick={() => handleAddResource('neridium', 500)}
                  className="flex flex-col items-center justify-center p-1.5 bg-slate-900/80 hover:bg-purple-950/80 text-purple-300 border border-purple-500/40 hover:border-purple-400 rounded text-[10px] font-mono transition-all text-center gap-1 cursor-pointer"
                  title="Inject +500 Neridium Crystals"
                >
                  <NeridiumIcon className="w-3.5 h-3.5" />
                  <span>+500 NER</span>
                </button>
              </div>
            </div>

            {/* Section B: Targeted Research Unlocks */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-400/80 tracking-widest border-b border-amber-500/20 pb-1">
                <FlaskConical className="w-3 h-3" />
                <span>Targeted Research Unlocks</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  id="debug-unlock-mil-btn"
                  onClick={() => handleUnlockResearch('MILITARY')}
                  className="px-2 py-1 bg-slate-900/80 hover:bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:border-rose-400 rounded text-[10px] transition-all text-center"
                  title="Unlock all Military Protocols"
                >
                  [MILITARY]
                </button>
                <button
                  id="debug-unlock-civ-btn"
                  onClick={() => handleUnlockResearch('CIVILIAN')}
                  className="px-2 py-1 bg-slate-900/80 hover:bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded text-[10px] transition-all text-center"
                  title="Unlock all Civic Protocols"
                >
                  [CIVILIAN]
                </button>
                <button
                  id="debug-unlock-exp-btn"
                  onClick={() => handleUnlockResearch('EXPANSION')}
                  className="px-2 py-1 bg-slate-900/80 hover:bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 rounded text-[10px] transition-all text-center"
                  title="Unlock all Expansion Protocols"
                >
                  [EXPANSION]
                </button>
                <button
                  id="debug-unlock-hq-btn"
                  onClick={() => handleUnlockResearch('HQ')}
                  className="px-2 py-1 bg-slate-900/80 hover:bg-amber-950/80 text-amber-300 border border-amber-500/40 hover:border-amber-400 rounded text-[10px] transition-all text-center"
                  title="Unlock all Headquarters Protocols"
                >
                  [HQ CITADEL]
                </button>
              </div>

              <button
                id="debug-unlock-all-btn"
                onClick={() => handleUnlockResearch('ALL')}
                className="w-full mt-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/50 hover:to-amber-500/40 text-amber-200 border border-amber-500/60 hover:border-amber-400 rounded text-[10px] font-bold tracking-wider transition-all flex items-center justify-center gap-1.5"
                title="Synthesize and Unlock Entire Tech Tree (All Disciplines)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>UNLOCK ALL RESEARCH</span>
              </button>
            </div>

            {/* Section C: Simulation Toggles */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-400/80 tracking-widest border-b border-amber-500/20 pb-1">
                <Zap className="w-3 h-3" />
                <span>Simulation Toggles</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {/* Free Research Toggle */}
                <button
                  id="debug-toggle-free-research-btn"
                  onClick={handleToggleFreeResearch}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-[10px] font-mono transition-all ${
                    isFreeResearch
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                      : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                  title="Toggle Instant Zero-Cost Research Completion"
                >
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Free Research Mode</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isFreeResearch ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isFreeResearch ? 'ACTIVE' : 'OFF'}
                  </span>
                </button>

                {/* Reveal All Map Toggle */}
                <button
                  id="debug-toggle-reveal-map-btn"
                  onClick={handleToggleRevealMap}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-[10px] font-mono transition-all ${
                    isRevealMap
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                      : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                  title="Bypass Fog of War & Full Sensor Identification"
                >
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal All Map (FOW Bypass)</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      isRevealMap ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isRevealMap ? 'ACTIVE' : 'OFF'}
                  </span>
                </button>

                {/* Info Stream Mode: Default (Player Only) vs Debug (All Units) */}
                <button
                  id="debug-toggle-info-stream-btn"
                  onClick={toggleInfoStreamMode}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded border text-[10px] font-mono transition-all cursor-pointer ${
                    infoStreamMode === 'DEBUG'
                      ? 'bg-amber-950/90 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.35)]'
                      : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                  title="Toggle Info Stream filter mode: Default (Player Units only) vs Debug (All Units: player, hostile, pirate, defender, neutral)"
                >
                  <span className="flex items-center gap-1.5">
                    <Radio className={`w-3.5 h-3.5 ${infoStreamMode === 'DEBUG' ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span>Info Stream Filter</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      infoStreamMode === 'DEBUG'
                        ? 'bg-amber-500 text-black font-extrabold'
                        : 'bg-cyan-900/80 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {infoStreamMode === 'DEBUG' ? 'DEBUG (ALL UNITS)' : 'DEFAULT (PLAYER ONLY)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Section D: Homeworld & HQ Citadel Modifier Controls */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-400/80 tracking-widest border-b border-amber-500/20 pb-1">
                <Castle className="w-3 h-3 text-cyan-400" />
                <span>Homeworld & HQ Modifiers</span>
              </div>

              {/* Homeworld Type Selector */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>Homeworld Biome:</span>
                  </span>
                  <span className="font-bold text-emerald-300">
                    {state?.homeworldType || 'TERRAN'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {ALL_HOMEWORLD_TYPES.map((hwId) => (
                    <button
                      key={hwId}
                      onClick={() => {
                        if (typeof state?.setHomeworldType === 'function') {
                          state.setHomeworldType(hwId);
                          onStateModified?.();
                        }
                      }}
                      className={`px-1.5 py-1 rounded text-[8.5px] font-mono border transition-all ${
                        state?.homeworldType === hwId
                          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {hwId}
                    </button>
                  ))}
                </div>
              </div>

              {/* HQ Citadel Type Selector */}
              <div className="space-y-1 pt-1.5">
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Castle className="w-3 h-3 text-amber-400" />
                    <span>HQ Citadel:</span>
                  </span>
                  <span className="font-bold text-amber-300">
                    {state?.hqType || 'NOVAN_COMMAND_SPIRE'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {ALL_HQ_TYPES.map((hqId) => {
                    const hqDef = HQ_REGISTRY[hqId];
                    return (
                      <button
                        key={hqId}
                        onClick={() => {
                          if (typeof state?.setHQType === 'function') {
                            state.setHQType(hqId);
                            onStateModified?.();
                          }
                        }}
                        className={`px-1.5 py-1 rounded text-[8px] font-mono border transition-all text-left flex flex-col ${
                          state?.hqType === hqId
                            ? 'bg-amber-950/80 border-amber-400 text-amber-200'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-bold truncate">{hqDef?.name || hqId}</span>
                        <span className="text-[7.5px] opacity-70">
                          {Math.round(hqDef?.oreDropOffRange || 0)}km • {hqDef?.missileLaunchers || 0} tubes
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-black/60 border-t border-amber-500/20 text-[9px] text-amber-400/60 flex items-center justify-between">
            <span>DETERMINISTIC SIM INJECTION</span>
            <span>30Hz TICK</span>
          </div>
        </div>
      )}
    </>
  );
};
