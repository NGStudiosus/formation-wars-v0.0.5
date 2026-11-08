import React, { useEffect, useState, useCallback } from 'react';
import { SimulationEngine } from '../simulation/engine';
import {
  TechNodeDefinition,
  ResearchBranch,
  STATIC_BRANCH_GRIDS,
  getBranchGridForFaction,
  getOperationalLabCounts,
  queueResearchNode,
  calculateResearchTokens,
  ResearchTokens,
} from '../simulation/researchManager';
import {
  X,
  Sparkles,
  Target,
  Cpu,
  Globe,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { ResearchNode } from './ResearchNode';
import { CommandTooltipCard, ActiveTooltipState } from './CommandTooltipCard';
import { ResearchErrorBoundary } from './ResearchErrorBoundary';

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: SimulationEngine;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;
const VALID_BRANCHES: readonly ResearchBranch[] = ['MILITARY', 'CIVILIAN', 'EXPANSION', 'HEADQUARTERS'] as const;

/**
 * Inner modal content component with all React hooks declared unconditionally
 * at the root level before any logic or returns.
 */
const ResearchModalContent: React.FC<ResearchModalProps> = ({
  isOpen,
  onClose,
  engine,
}) => {
  // 1. All hooks declared at root level
  const [, setRefreshTick] = useState(0);
  const [activeTab, setActiveTab] = useState<ResearchBranch>('MILITARY');

  // Single pre-allocated hover tooltip target for zero-allocation performance
  const [activeTooltip, setActiveTooltip] = useState<ActiveTooltipState>({
    visible: false,
    slotIndex: 0,
    actionType: 'RESEARCH_NODE',
    payload: null,
    anchorRect: null,
    anchorX: 0,
    anchorY: 0,
  });

  const handleNodeHover = useCallback((node: TechNodeDefinition, elementOrRect: HTMLElement | DOMRect) => {
    if (!node || !elementOrRect) return;
    try {
      const rect =
        'getBoundingClientRect' in (elementOrRect as any)
          ? (elementOrRect as HTMLElement).getBoundingClientRect()
          : (elementOrRect as DOMRect);

      setActiveTooltip({
        visible: true,
        slotIndex: node.tier ?? 0,
        actionType: 'RESEARCH_NODE',
        payload: {
          node: {
            id: node.id,
            branch: node.branch,
            tier: node.tier,
            name: node.name,
            code: node.code,
            description: node.description,
            effects: node.effects,
            costMetallic: node.costMetallic,
            costOrganic: node.costOrganic,
            costM: node.costMetallic ?? (node as any).costM ?? 0,
            costO: node.costOrganic ?? (node as any).costO ?? 0,
            totalTicks: node.totalTicks,
          },
        },
        anchorRect: rect,
        anchorX: rect.left + rect.width / 2,
        anchorY: rect.top,
      });
    } catch (err) {
      console.warn('Tooltip anchor calculation error:', err);
    }
  }, []);

  const handleNodeHoverEnd = useCallback(() => {
    setActiveTooltip((prev) => (prev.visible ? { ...prev, visible: false, payload: null } : prev));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Immediately update station count on open
    if (typeof engine?.updateResearchStationsCount === 'function') {
      engine.updateResearchStationsCount();
    }

    // Unify research countdown with the deterministic 30Hz simulation tick
    // Throttle UI update to every 2 ticks (~15 fps) for crisp progress bar rendering
    const unsubscribe = engine.subscribeTick((tickCount) => {
      if (tickCount % 2 === 0) {
        engine.updateResearchStationsCount();
        setRefreshTick((t) => t + 1);
      }
    });

    return () => unsubscribe();
  }, [isOpen, engine]);

  // Keyboard hotkeys: Escape/R closes; Space toggles pause
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        engine.togglePause();
        setRefreshTick((t) => t + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, engine]);

  // 2. Safe branch validation and O(1) immutable precomputed branch grid reference
  const safeBranch: ResearchBranch = VALID_BRANCHES.includes(activeTab as ResearchBranch)
    ? (activeTab as ResearchBranch)
    : 'MILITARY';

  const playerFaction = engine?.playerFaction || 'NOVAN';
  const branchCatalog = getBranchGridForFaction
    ? getBranchGridForFaction(safeBranch, playerFaction)
    : STATIC_BRANCH_GRIDS[safeBranch];

  if (!isOpen) return null;

  if (typeof engine?.updateResearchStationsCount === 'function') {
    engine.updateResearchStationsCount();
  }

  // Defensive state extraction with strict fallbacks
  const engineState = (engine && typeof (engine as any).state === 'object' ? (engine as any).state : null) ?? {};

  const unlockedTechs: Set<string> =
    engine?.unlockedTechs ??
    engine?.researchManager?.completedNodes ??
    engineState?.unlockedTechs ??
    new Set<string>();

  const researchStations =
    engine?.researchStations ??
    engineState?.researchStations ??
    { military: 0, civic: 0, expansion: 0 };

  const activeResearch =
    (typeof engine?.researchManager?.getActiveResearch === 'function'
      ? engine.researchManager.getActiveResearch()
      : null) ??
    engineState?.activeResearch ??
    { military: null, civic: null, expansion: null };

  const tokens: ResearchTokens = engine
    ? calculateResearchTokens(engine)
    : { military: 0, civilian: 0, expansion: 0, headquarters: 0 };

  const militaryCount = tokens.military;
  const civicCount = tokens.civilian;
  const expansionCount = tokens.expansion;
  const totalHQTokens = tokens.headquarters;

  const hqResources = typeof engine?.getHQResources === 'function'
    ? engine.getHQResources()
    : {
        ore: 0,
        maxOre: 16000,
        metallic: 0,
        maxMetallic: 100000,
        organic: 0,
        maxOrganic: 100000,
      };

  // Active branch capacity stats (read-only permanent stations, never consumed)
  const isHQ = safeBranch === 'HEADQUARTERS';

  const getBranchStationCount = (branch: ResearchBranch) => {
    switch (branch) {
      case 'MILITARY':
        return militaryCount;
      case 'CIVILIAN':
        return civicCount;
      case 'EXPANSION':
        return expansionCount;
      case 'HEADQUARTERS':
        return totalHQTokens;
      default:
        return 0;
    }
  };

  const currentStations = getBranchStationCount(safeBranch);
  const activeBranchProject =
    (typeof engine?.researchManager?.getActiveProject === 'function'
      ? engine.researchManager.getActiveProject(safeBranch)
      : null) ??
    (safeBranch === 'MILITARY'
      ? activeResearch?.military
      : safeBranch === 'CIVILIAN'
      ? activeResearch?.civic
      : safeBranch === 'EXPANSION'
      ? activeResearch?.expansion
      : (activeResearch as any)?.headquarters ?? (activeResearch as any)?.hq) ??
    null;

  const requiredForActiveTier = activeBranchProject
    ? isHQ
      ? (activeBranchProject.tier ?? 1) * 3
      : (activeBranchProject.tier ?? 1)
    : isHQ
    ? 30
    : 10;

  const currentBranchQueue = (typeof engine?.researchManager?.getQueue === 'function'
    ? engine.researchManager.getQueue(safeBranch)
    : []) ?? [];

  const activeNodeDef = activeBranchProject?.nodeId
    ? (typeof engine?.researchManager?.getNode === 'function'
        ? engine.researchManager.getNode(activeBranchProject.nodeId)
        : null)
    : null;

  const handleInitiateResearch = (nodeId: string) => {
    if (!engine) return;
    if (engine.isPaused) {
      engine.isPaused = false;
      engine.addLog?.('TACTICAL', '⚡ Simulation RESUMED for active research synthesis protocol.', 'info');
    }

    let success = false;
    let error: string | undefined;

    if (typeof engine.initiateResearch === 'function') {
      const res = engine.initiateResearch(nodeId);
      success = res.success;
      error = res.error;
    } else if (engine.researchManager) {
      const res = engine.researchManager.initiateResearch(
        nodeId,
        researchStations,
        hqResources,
        (m, o) => {
          const hq = engine.getHQ?.();
          if (hq && hq.resources) {
            hq.resources.metallic = Math.max(0, hq.resources.metallic - m);
            hq.resources.organic = Math.max(0, hq.resources.organic - o);
          }
        },
        (cat, msg, lvl) => engine.addLog?.(cat as any, msg, lvl)
      );
      success = res.success;
      error = res.error;
    } else {
      success = queueResearchNode(nodeId, engine);
      if (!success) {
        error = 'Station capacity threshold or stockpile solvency not met.';
      }
    }

    if (!success && error) {
      engine.addLog?.('RESEARCH', `⚠️ Initiation blocked: ${error}`, 'warn');
    }
    setRefreshTick((t) => t + 1);
  };

  const handleCancelResearch = (branch: ResearchBranch) => {
    if (!engine) return;
    if (typeof engine.cancelResearch === 'function') {
      engine.cancelResearch(branch);
    } else if (engine.researchManager) {
      engine.researchManager.cancelResearch(
        branch,
        (m, o) => {
          const hq = engine.getHQ?.();
          if (hq && hq.resources) {
            hq.resources.metallic = Math.min(hq.resources.maxMetallic ?? 100000, hq.resources.metallic + m);
            hq.resources.organic = Math.min(hq.resources.maxOrganic ?? 100000, hq.resources.organic + o);
          }
        },
        (cat, msg, lvl) => engine.addLog?.(cat as any, msg, lvl)
      );
    }
    setRefreshTick((t) => t + 1);
  };

  const handleRemoveFromQueue = (nodeId: string) => {
    if (!engine) return;
    if (typeof engine.removeFromResearchQueue === 'function') {
      engine.removeFromResearchQueue(nodeId);
    } else if (engine.researchManager) {
      engine.researchManager.dequeueNode(nodeId, (cat, msg, lvl) => engine.addLog?.(cat as any, msg, lvl));
    }
    setRefreshTick((t) => t + 1);
  };

  const handleClearQueue = (branch: ResearchBranch) => {
    if (!engine) return;
    if (typeof engine.clearResearchQueue === 'function') {
      engine.clearResearchQueue(branch);
    } else if (engine.researchManager) {
      engine.researchManager.clearQueue(branch);
    }
    setRefreshTick((t) => t + 1);
  };

  // Branch Color Themes
  const getBranchTheme = (branch: ResearchBranch) => {
    switch (branch) {
      case 'MILITARY':
        return {
          name: 'MILITARY MATRIX',
          primary: '#ff3344',
          accent: '#ff9900',
          tabActive: 'border-[#ff3344] text-rose-300 bg-rose-950/60 shadow-[0_2px_12px_rgba(255,51,68,0.3)]',
          availableBorder: 'border-rose-500/80 shadow-[0_0_10px_rgba(255,51,68,0.4)]',
          completedBg: 'bg-rose-950/70 border-rose-500/80 shadow-[0_0_12px_rgba(255,51,68,0.35)]',
          barColor: 'bg-gradient-to-r from-rose-500 to-amber-500',
          badge: 'bg-rose-950 text-rose-300 border-rose-500/60',
        };
      case 'CIVILIAN':
        return {
          name: 'CIVILIAN INDUSTRY',
          primary: '#00f0ff',
          accent: '#00b4d8',
          tabActive: 'border-[#00f0ff] text-cyan-300 bg-cyan-950/60 shadow-[0_2px_12px_rgba(0,240,255,0.3)]',
          availableBorder: 'border-cyan-400/80 shadow-[0_0_10px_rgba(0,240,255,0.4)]',
          completedBg: 'bg-cyan-950/70 border-cyan-400/80 shadow-[0_0_12px_rgba(0,240,255,0.35)]',
          barColor: 'bg-gradient-to-r from-cyan-400 to-teal-400',
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-500/60',
        };
      case 'EXPANSION':
        return {
          name: 'EXPANSION & DOMAIN',
          primary: '#00ff88',
          accent: '#10b981',
          tabActive: 'border-[#00ff88] text-emerald-300 bg-emerald-950/60 shadow-[0_2px_12px_rgba(0,255,136,0.3)]',
          availableBorder: 'border-emerald-400/80 shadow-[0_0_10px_rgba(0,255,136,0.4)]',
          completedBg: 'bg-emerald-950/70 border-emerald-400/80 shadow-[0_0_12px_rgba(0,255,136,0.35)]',
          barColor: 'bg-gradient-to-r from-emerald-400 to-emerald-300',
          badge: 'bg-emerald-950 text-emerald-300 border-emerald-500/60',
        };
      case 'HEADQUARTERS':
        return {
          name: 'HEADQUARTERS CITADEL',
          primary: '#ffb700',
          accent: '#e5a93c',
          tabActive: 'border-[#ffb700] text-amber-300 bg-amber-950/60 shadow-[0_2px_12px_rgba(255,183,0,0.3)]',
          availableBorder: 'border-amber-400/80 shadow-[0_0_10px_rgba(255,183,0,0.4)]',
          completedBg: 'bg-amber-950/70 border-amber-400/80 shadow-[0_0_12px_rgba(255,183,0,0.35)]',
          barColor: 'bg-gradient-to-r from-amber-400 to-yellow-300',
          badge: 'bg-amber-950 text-amber-300 border-amber-500/60',
        };
      default:
        return {
          name: 'MILITARY MATRIX',
          primary: '#ff3344',
          accent: '#ff9900',
          tabActive: 'border-[#ff3344] text-rose-300 bg-rose-950/60',
          availableBorder: 'border-rose-500/80',
          completedBg: 'bg-rose-950/70 border-rose-500/80',
          barColor: 'bg-gradient-to-r from-rose-500 to-amber-500',
          badge: 'bg-rose-950 text-rose-300 border-rose-500/60',
        };
    }
  };

  const branchTheme = getBranchTheme(safeBranch);

  return (
    <div
      id="research-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md select-none p-2 sm:p-4"
    >
      {/* 
        Strict No-Scroll Viewport Dimensions:
        width: 94vw; max-width: 1400px; height: 82vh; max-height: 720px; overflow: hidden;
      */}
      <div
        id="research-modal-container"
        style={{
          width: '94vw',
          maxWidth: '1400px',
          height: '82vh',
          maxHeight: '720px',
          overflow: 'hidden',
        }}
        className="relative flex flex-col bg-[#060b13]/98 border border-slate-700/80 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.95)] overflow-hidden font-mono text-slate-200"
      >
        {/* ========================================================= */}
        {/* 1. WINDOW HEADER & HEADER STATUS BAR                      */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#050912] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-xs sm:text-sm tracking-wider">
                  RESEARCH ARCHIVE // TECHNOLOGICAL CODEX
                </h2>
                <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[9px] font-bold hidden sm:inline">
                  HORIZONTAL 10-TIER MATRIX
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {isHQ ? (
                  <>
                    HQ RESEARCH TOKENS: <span className="text-amber-300 font-bold">{totalHQTokens}</span> / <span className="text-slate-300 font-bold">{requiredForActiveTier}</span> (1 TOKEN YIELD PER ACTIVE LAB)
                  </>
                ) : (
                  <>
                    BRANCH CAPACITY: <span className="text-cyan-300 font-bold">{currentStations}</span> / <span className="text-slate-300 font-bold">{requiredForActiveTier}</span> STATIONS ONLINE
                  </>
                )}
                {activeBranchProject && (
                  <span className="inline-flex items-center gap-1.5 ml-2">
                    <span className="text-amber-300 font-bold animate-pulse">
                      • PROJECT ACTIVE ({((activeBranchProject.totalTicks - activeBranchProject.currentTicks) / 30).toFixed(1)}s)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancelResearch(safeBranch)}
                      className="px-1.5 py-0.5 rounded bg-rose-950/90 hover:bg-rose-900 border border-rose-500/80 text-rose-300 text-[9px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                      title="Cancel research project and refund 100% of materials committed"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      CANCEL & REFUND
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-500">HQ RESERVES:</span>
              <span className="text-amber-300 font-bold">
                {Math.floor(hqResources.metallic).toLocaleString()} MET
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-300 font-bold">
                {Math.floor(hqResources.organic).toLocaleString()} ORG
              </span>
            </div>

            <button
              type="button"
              id="btn-close-research-modal"
              onClick={onClose}
              className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-rose-300 transition cursor-pointer"
              title="Close Research Archive [ESC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. TAB NAVIGATION BAR                                     */}
        {/* ========================================================= */}
        <div
          id="research-tab-bar"
          className="flex items-center justify-between px-4 sm:px-6 bg-[#040810] border-b border-slate-800 text-[11px] font-mono gap-2"
        >
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* MILITARY TAB */}
            <button
              type="button"
              id="tab-military-matrix"
              onClick={() => setActiveTab('MILITARY')}
              className={`flex-1 sm:flex-initial px-4 py-2 flex items-center justify-center gap-2 font-mono font-bold text-xs transition cursor-pointer border-b-2 ${
                activeTab === 'MILITARY'
                  ? 'border-[#ff3344] text-rose-300 bg-rose-950/40 shadow-[0_2px_12px_rgba(255,51,68,0.3)]'
                  : 'border-transparent text-slate-400 hover:text-rose-400 hover:bg-slate-900/40'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-rose-400" />
              <span>[MILITARY]</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                {militaryCount}/10
              </span>
            </button>

            {/* CIVILIAN TAB */}
            <button
              type="button"
              id="tab-civilian-industry"
              onClick={() => setActiveTab('CIVILIAN')}
              className={`flex-1 sm:flex-initial px-4 py-2 flex items-center justify-center gap-2 font-mono font-bold text-xs transition cursor-pointer border-b-2 ${
                activeTab === 'CIVILIAN'
                  ? 'border-[#00f0ff] text-cyan-300 bg-cyan-950/40 shadow-[0_2px_12px_rgba(0,240,255,0.3)]'
                  : 'border-transparent text-slate-400 hover:text-cyan-400 hover:bg-slate-900/40'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>[CIVILIAN]</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                {civicCount}/10
              </span>
            </button>

            {/* EXPANSION TAB */}
            <button
              type="button"
              id="tab-expansion-domain"
              onClick={() => setActiveTab('EXPANSION')}
              className={`flex-1 sm:flex-initial px-4 py-2 flex items-center justify-center gap-2 font-mono font-bold text-xs transition cursor-pointer border-b-2 ${
                activeTab === 'EXPANSION'
                  ? 'border-[#00ff88] text-emerald-300 bg-emerald-950/40 shadow-[0_2px_12px_rgba(0,255,136,0.3)]'
                  : 'border-transparent text-slate-400 hover:text-emerald-400 hover:bg-slate-900/40'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>[EXPANSION]</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                {expansionCount}/10
              </span>
            </button>

            {/* HEADQUARTERS TAB */}
            <button
              type="button"
              id="tab-headquarters-citadel"
              onClick={() => setActiveTab('HEADQUARTERS')}
              className={`flex-1 sm:flex-initial px-4 py-2 flex items-center justify-center gap-2 font-mono font-bold text-xs transition cursor-pointer border-b-2 ${
                activeTab === 'HEADQUARTERS'
                  ? 'border-[#ffb700] text-amber-300 bg-amber-950/40 shadow-[0_2px_12px_rgba(255,183,0,0.3)]'
                  : 'border-transparent text-slate-400 hover:text-amber-400 hover:bg-slate-900/40'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>[HEADQUARTERS]</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-slate-400">
                {totalHQTokens}/30
              </span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-400">
            <span className="text-cyan-300 font-bold">TIER-SCALED SYNTHESIS (10s – 300s)</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300 font-bold">QUEUE SUPPORTED</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2.5 ACTIVE SYNTHESIS & RESEARCH QUEUE TRAY                */}
        {/* ========================================================= */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-1.5 bg-[#03060c] border-b border-slate-800/80 text-[10px] font-mono gap-2 min-h-[34px]">
          {/* Active Synthesis Project */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            {activeBranchProject && activeNodeDef ? (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/50 px-2 py-0.5 rounded shadow-xs max-w-md">
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  SYNTHESIZING:
                </span>
                <span className="font-bold text-slate-100 truncate max-w-[140px]" title={activeNodeDef.name}>
                  {activeNodeDef.name}
                </span>
                <span className="text-amber-300 font-mono font-bold">
                  {((activeBranchProject.totalTicks - activeBranchProject.currentTicks) / 30.0).toFixed(1)}s
                </span>
                <div className="w-16 h-1.5 bg-slate-950 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-100"
                    style={{
                      width: `${Math.min(100, Math.max(0, (activeBranchProject.currentTicks / (activeBranchProject.totalTicks || 300)) * 100))}%`,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleCancelResearch(safeBranch)}
                  className="px-1 py-0.2 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/60 text-[8px] font-bold transition cursor-pointer"
                  title="Cancel active project and restore 100% upfront materials"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <div className="text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>BRANCH STATUS: <strong className="text-slate-400">IDLE</strong></span>
                <span className="text-slate-600">• Click an available protocol to initiate</span>
              </div>
            )}
          </div>

          {/* Research Queue Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
              <span>QUEUE:</span>
              <span className={`px-1 py-0.2 rounded text-[8px] font-mono ${currentBranchQueue.length > 0 ? 'bg-amber-950 border border-amber-500/60 text-amber-300 font-bold' : 'bg-slate-900 text-slate-500'}`}>
                {currentBranchQueue.length}
              </span>
            </span>

            {currentBranchQueue.length > 0 ? (
              <>
                {currentBranchQueue.slice(0, 4).map((qId, idx) => {
                  const qNode = typeof engine?.researchManager?.getNode === 'function' ? engine.researchManager.getNode(qId) : null;
                  const durS = (qNode?.totalTicks || 300) / 30;
                  const durText = durS < 60 ? `${durS.toFixed(0)}s` : `${Math.floor(durS / 60)}m ${Math.round(durS % 60)}s`;
                  return (
                    <div
                      key={qId}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/60 border border-amber-500/50 rounded text-amber-200 text-[9px] shadow-xs"
                    >
                      <span className="font-bold text-amber-400">#{idx + 1}</span>
                      <span className="max-w-[100px] truncate text-slate-200" title={qNode?.name || qId}>
                        {qNode?.name || qId}
                      </span>
                      <span className="text-slate-400 text-[8px]">({durText})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(qId)}
                        className="ml-0.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 px-1 py-0.2 rounded cursor-pointer font-bold"
                        title="Remove from research queue"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {currentBranchQueue.length > 4 && (
                  <span className="text-[9px] text-amber-400 font-bold">
                    +{currentBranchQueue.length - 4} more
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleClearQueue(safeBranch)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/60 text-[8px] font-bold transition cursor-pointer"
                  title="Clear all queued research in this branch"
                >
                  CLEAR QUEUE
                </button>
              </>
            ) : (
              <span className="text-slate-500 text-[9px] italic">
                (Click available protocols to queue ahead)
              </span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. TIER COLUMN HEADER TRACK (TIER 1 LEFT -> TIER 10 RIGHT) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-10 px-4 sm:px-5 py-1.5 bg-[#050912]/90 border-b border-slate-800 text-[10px] font-mono select-none">
          {ROMAN_NUMERALS.map((roman, idx) => {
            const tierNum = idx + 1;
            const reqCap = isHQ ? tierNum * 3 : tierNum;
            const isUnlocked = currentStations >= reqCap;
            return (
              <div
                key={tierNum}
                className="flex flex-col items-center justify-center text-center border-r border-dashed border-white/10 last:border-r-0 px-1"
              >
                <div className="flex items-center gap-1 font-bold">
                  <span className={isUnlocked ? 'text-slate-200' : 'text-slate-500'}>
                    TIER {tierNum}
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 font-normal">
                  {isHQ ? `${reqCap} HQ TOKENS` : `${tierNum} LAB${tierNum > 1 ? 'S' : ''}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* 4. HORIZONTAL 10-TIER VIEWPORT-FIT GRID (STRICT NO SCROLL)  */}
        {/* ========================================================= */}
        <div className="relative flex-1 w-full overflow-hidden flex flex-col justify-between">
          {/* Subtle vertical divider tracks separating Tiers 1 through 10 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              padding: '16px 20px',
              gap: '8px 12px',
            }}
          >
            {ROMAN_NUMERALS.map((_, idx) => (
              <div
                key={idx}
                className={`h-full ${
                  idx < 9 ? 'border-r border-dashed border-white/10' : ''
                }`}
              />
            ))}
          </div>

          {/* 
            Strict Column Layout specified in Prompt:
            display: grid;
            grid-template-columns: repeat(10, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 8px 12px;
            height: 100%;
            width: 100%;
            padding: 16px 20px;
            box-sizing: border-box;
            overflow: hidden;
          */}
          <div
            id="research-node-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gridTemplateRows: 'repeat(4, 1fr)',
              gridAutoFlow: 'column',
              gap: '8px 12px',
              height: '100%',
              width: '100%',
              padding: '16px 20px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 10 }).flatMap((_, tierIndex) =>
              Array.from({ length: 4 }).map((_, slotIndex) => {
                const node = branchCatalog?.[tierIndex]?.[slotIndex] ?? null;
                if (!node) {
                  return (
                    <div
                      key={`empty-${tierIndex}-${slotIndex}`}
                      className="research-node-empty flex items-center justify-center w-full h-full relative select-none pointer-events-none"
                    >
                      <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-lg border border-dashed border-slate-800/30 bg-slate-950/20 flex items-center justify-center opacity-25">
                        <span className="text-[9px] font-mono text-slate-700 select-none">--</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <ResearchNode
                    key={node.id || `node-${tierIndex}-${slotIndex}`}
                    node={node}
                    engine={engine}
                    activeTab={safeBranch}
                    onInitiate={handleInitiateResearch}
                    onCancel={(_nodeId, branch) => handleCancelResearch(branch)}
                    onHover={handleNodeHover}
                    onHoverEnd={handleNodeHoverEnd}
                  />
                );
              })
            )}
          </div>

          {/* ========================================================= */}
          {/* BOTTOM LANE: ROMAN NUMERALS I TO X                       */}
          {/* ========================================================= */}
          <div className="grid grid-cols-10 px-4 sm:px-5 py-1.5 bg-[#050912]/80 border-t border-slate-800 text-[11px] font-mono font-bold text-slate-400/90 select-none">
            {ROMAN_NUMERALS.map((roman) => (
              <div
                key={roman}
                className="text-center tracking-wider text-slate-400 border-r border-dashed border-white/10 last:border-r-0"
              >
                {roman}
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. FOOTER STATUS BAR                                      */}
        {/* ========================================================= */}
        <div className="px-4 sm:px-6 py-2 bg-[#050910] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTEM MATRIX SYNCHRONIZED
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="hidden sm:inline">
              MILITARY: {militaryCount}/10 • CIVILIAN: {civicCount}/10 • EXPANSION: {expansionCount}/10 • HQ TOKENS: {totalHQTokens}/30
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500 hidden md:inline">
              HOTKEYS: [SPACE] PAUSE/RUN • [R] OR [ESC] CLOSE
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. DYNAMIC GLOBAL COMMAND TOOLTIP (ZERO-ALLOC PRE-ALLOC)  */}
      {/* ========================================================= */}
      <CommandTooltipCard
        tooltip={activeTooltip}
        engine={engine}
        hqResources={hqResources}
      />
    </div>
  );
};

/**
 * Top-level ResearchModal with localized error boundary protection.
 * Catches and displays localized diagnostics without blanking out the parent canvas.
 */
export const ResearchModal: React.FC<ResearchModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <ResearchErrorBoundary onClose={props.onClose}>
      <ResearchModalContent {...props} />
    </ResearchErrorBoundary>
  );
};

