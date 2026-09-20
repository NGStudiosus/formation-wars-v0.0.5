import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { TechNodeDefinition, ResearchBranch, calculateResearchTokens } from '../simulation/researchManager';
import {
  Target,
  Cpu,
  Globe,
  Anchor,
  Shield,
  ShieldCheck,
  Crosshair,
  Flame,
  Boxes,
  Wrench,
  Atom,
  Radio,
  Orbit,
  Lock,
  Check,
  AlertTriangle,
  Zap,
} from 'lucide-react';

/**
 * Returns an appropriate minimalist icon glyph representing the technology node
 */
export function getTechGlyph(node?: TechNodeDefinition | null) {
  if (!node || !node.name) return Target;
  const name = node.name.toLowerCase();

  if (
    name.includes('dreadnought') ||
    name.includes('battleship') ||
    name.includes('battlecruiser') ||
    name.includes('fleet')
  ) {
    return Anchor;
  }
  if (
    name.includes('cruiser') ||
    name.includes('destroyer') ||
    name.includes('frigate') ||
    name.includes('hull') ||
    name.includes('escort')
  ) {
    return Crosshair;
  }
  if (name.includes('shield') || name.includes('barrier') || name.includes('deflector')) {
    return Shield;
  }
  if (
    name.includes('armor') ||
    name.includes('composite') ||
    name.includes('bulkhead') ||
    name.includes('plating')
  ) {
    return ShieldCheck;
  }
  if (
    name.includes('missile') ||
    name.includes('torpedo') ||
    name.includes('warhead') ||
    name.includes('ordnance') ||
    name.includes('munition')
  ) {
    return Target;
  }
  if (
    name.includes('laser') ||
    name.includes('plasma') ||
    name.includes('coilgun') ||
    name.includes('railgun') ||
    name.includes('beam') ||
    name.includes('ballistic') ||
    name.includes('point defense') ||
    name.includes('pd')
  ) {
    return Zap;
  }
  if (
    name.includes('refin') ||
    name.includes('smelt') ||
    name.includes('extract') ||
    name.includes('min') ||
    name.includes('ore') ||
    name.includes('quarry')
  ) {
    return Flame;
  }
  if (
    name.includes('logistics') ||
    name.includes('freight') ||
    name.includes('cargo') ||
    name.includes('hauler') ||
    name.includes('conveyor') ||
    name.includes('supply')
  ) {
    return Boxes;
  }
  if (
    name.includes('nano') ||
    name.includes('fabricat') ||
    name.includes('assembl') ||
    name.includes('foundry')
  ) {
    return Wrench;
  }
  if (
    name.includes('compute') ||
    name.includes('logic') ||
    name.includes('ai') ||
    name.includes('processor') ||
    name.includes('algorithm') ||
    name.includes('matrix')
  ) {
    return Cpu;
  }
  if (
    name.includes('reactor') ||
    name.includes('fusion') ||
    name.includes('generator') ||
    name.includes('energy') ||
    name.includes('power') ||
    name.includes('core')
  ) {
    return Atom;
  }
  if (
    name.includes('terran') ||
    name.includes('planet') ||
    name.includes('colony') ||
    name.includes('coloniz') ||
    name.includes('biome') ||
    name.includes('biosphere') ||
    name.includes('genesis')
  ) {
    return Globe;
  }
  if (
    name.includes('sensor') ||
    name.includes('radar') ||
    name.includes('tachyon') ||
    name.includes('optics') ||
    name.includes('scan') ||
    name.includes('recon')
  ) {
    return Radio;
  }
  if (
    name.includes('orbit') ||
    name.includes('gravity') ||
    name.includes('jump') ||
    name.includes('slipstream') ||
    name.includes('transit') ||
    name.includes('gateway')
  ) {
    return Orbit;
  }

  // Branch fallbacks
  if (node.branch === 'MILITARY') return Target;
  if (node.branch === 'CIVILIAN') return Cpu;
  return Globe;
}

export interface ResearchNodeProps {
  node?: TechNodeDefinition | null;
  engine: SimulationEngine;
  activeTab: ResearchBranch;
  onInitiate: (nodeId: string) => void;
  onCancel?: (nodeId: string, branch: ResearchBranch) => void;
  onHover: (node: TechNodeDefinition, elementOrRect: HTMLElement | DOMRect) => void;
  onHoverEnd: () => void;
}

export const ResearchNode: React.FC<ResearchNodeProps> = ({
  node,
  engine,
  activeTab,
  onInitiate,
  onCancel,
  onHover,
  onHoverEnd,
}) => {
  if (!node || !node.id) {
    return (
      <div className="research-node-empty flex items-center justify-center w-full h-full relative select-none pointer-events-none">
        <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-lg border border-dashed border-slate-800/40 bg-slate-950/20" />
      </div>
    );
  }

  const tokens = calculateResearchTokens(engine);
  const hqResources = typeof engine?.getHQResources === 'function'
    ? engine.getHQResources()
    : { metallic: 0, organic: 0 };

  const nodeState = (typeof engine?.researchManager?.getNodeStatus === 'function'
    ? engine.researchManager.getNodeStatus(node, tokens, hqResources)
    : null) ?? {
    status: 'LOCKED' as const,
    progressRatio: 0,
    remainingSeconds: (node.totalTicks ?? 300) / 30.0,
  };
  const GlyphIcon = getTechGlyph(node);

  const costM = node.costMetallic ?? (node as any).costM ?? 0;
  const costO = node.costOrganic ?? (node as any).costO ?? 0;
  const hasMetallicDeficit = costM > (hqResources.metallic ?? 0);
  const hasOrganicDeficit = costO > (hqResources.organic ?? 0);

  const isLocked = nodeState.status === 'LOCKED';
  const isResearching =
    nodeState.status === 'RESEARCHING' || nodeState.status === 'PAUSED_LACKING_CAPACITY';
  const isPausedCapacity = nodeState.status === 'PAUSED_LACKING_CAPACITY';
  const isCompleted = nodeState.status === 'COMPLETED';
  const isInsufficientMaterials =
    (hasMetallicDeficit || hasOrganicDeficit || nodeState.status === 'UNAVAILABLE') &&
    !isCompleted &&
    !isResearching;
  const isAvailable = (nodeState.status === 'AVAILABLE' || (!isLocked && !isCompleted && !isResearching)) && !isInsufficientMaterials;

  // Branch-specific theme classes
  const getBranchClasses = () => {
    switch (activeTab) {
      case 'MILITARY':
        return {
          availableBorder: 'border-rose-500/80 shadow-[0_0_12px_rgba(255,51,68,0.45)]',
          completedBg: 'bg-rose-950/70 border-rose-500/90 shadow-[0_0_14px_rgba(255,51,68,0.4)]',
          barColor: 'bg-gradient-to-r from-rose-500 to-amber-500',
        };
      case 'CIVILIAN':
        return {
          availableBorder: 'border-cyan-400/80 shadow-[0_0_12px_rgba(0,240,255,0.45)]',
          completedBg: 'bg-cyan-950/70 border-cyan-400/90 shadow-[0_0_14px_rgba(0,240,255,0.4)]',
          barColor: 'bg-gradient-to-r from-cyan-400 to-teal-400',
        };
      case 'EXPANSION':
        return {
          availableBorder: 'border-emerald-400/80 shadow-[0_0_12px_rgba(0,255,136,0.45)]',
          completedBg: 'bg-emerald-950/70 border-emerald-400/90 shadow-[0_0_14px_rgba(0,255,136,0.4)]',
          barColor: 'bg-gradient-to-r from-emerald-400 to-emerald-300',
        };
      case 'HEADQUARTERS':
        return {
          availableBorder: 'border-amber-400/80 shadow-[0_0_12px_rgba(255,183,0,0.45)]',
          completedBg: 'bg-amber-950/70 border-amber-400/90 shadow-[0_0_14px_rgba(255,183,0,0.4)]',
          barColor: 'bg-gradient-to-r from-amber-400 to-yellow-300',
        };
      default:
        return {
          availableBorder: 'border-cyan-400/80',
          completedBg: 'bg-cyan-950/70 border-cyan-400/90',
          barColor: 'bg-gradient-to-r from-cyan-400 to-teal-400',
        };
    }
  };

  const branchStyles = getBranchClasses();

  return (
    <div className="flex items-center justify-center w-full h-full relative">
      <button
        type="button"
        id={`tech-icon-${node.id}`}
        aria-label={isInsufficientMaterials ? 'UNAVAILABLE: INSUFFICIENT MATERIALS' : undefined}
        onClick={() => {
          if (isResearching) {
            onCancel?.(node.id, node.branch);
            return;
          }
          if (isAvailable && !isInsufficientMaterials && node.id) {
            onInitiate(node.id);
          }
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseEnter={(e) => {
          if (node && e?.currentTarget) {
            const rect = e.currentTarget.getBoundingClientRect();
            onHover(node, rect);
          }
        }}
        onMouseLeave={() => {
          onHoverEnd();
        }}
        className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-lg flex items-center justify-center transition-all duration-150 select-none ${
          isLocked
            ? 'opacity-25 grayscale cursor-not-allowed bg-slate-950/80 border border-slate-800'
            : isCompleted
            ? `${branchStyles.completedBg} border cursor-default shadow-md`
            : isResearching
            ? isPausedCapacity
              ? 'bg-slate-900 border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-pulse cursor-pointer'
              : `bg-slate-900 border-2 ${branchStyles.availableBorder} cursor-pointer hover:border-rose-400`
            : isInsufficientMaterials
            ? 'bg-slate-950/80 border border-rose-500/60 opacity-60 cursor-not-allowed shadow-[0_0_8px_rgba(255,51,68,0.2)]'
            : isAvailable
            ? `bg-slate-900/90 border ${branchStyles.availableBorder} hover:scale-105 active:scale-95 cursor-pointer hover:bg-slate-800`
            : 'bg-slate-950/70 border border-slate-800 cursor-not-allowed opacity-40'
        }`}
      >
        {/* Centered Minimalist Vector Glyph */}
        <GlyphIcon
          className={`w-5 h-5 transition-colors ${
            isCompleted
              ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]'
              : isResearching
              ? 'text-cyan-300 animate-pulse'
              : isInsufficientMaterials
              ? 'text-rose-400/80'
              : isAvailable
              ? 'text-slate-100'
              : 'text-slate-500'
          }`}
        />

        {/* STATUS 1: LOCKED PADLOCK BADGE */}
        {isLocked && (
          <Lock className="w-2.5 h-2.5 text-slate-400 absolute top-1 right-1" />
        )}

        {/* STATUS 2: COMPLETED CHECKMARK BADGE */}
        {isCompleted && (
          <div className="absolute bottom-1 right-1 bg-slate-950/90 rounded-full p-0.5 border border-emerald-500/80 shadow-xs">
            <Check className="w-2.5 h-2.5 text-emerald-400" />
          </div>
        )}

        {/* STATUS 3: PAUSED ALERT BADGE */}
        {isPausedCapacity && (
          <AlertTriangle className="w-2.5 h-2.5 text-amber-400 absolute top-1 right-1 animate-bounce" />
        )}

        {/* STATUS 4: INSUFFICIENT MATERIALS WARNING DOT */}
        {isInsufficientMaterials && (
          <span
            className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-950 animate-pulse"
            title="UNAVAILABLE: INSUFFICIENT MATERIALS"
          />
        )}

        {/* STATUS 5: RESEARCHING PROGRESS FILL ALONG BOTTOM EDGE */}
        {isResearching && (
          <>
            <span className="absolute top-0.5 right-1 text-[8px] font-mono font-bold text-cyan-200">
              {nodeState.remainingSeconds.toFixed(1)}s
            </span>
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-950/90 overflow-hidden rounded-b-lg">
              <div
                className={`h-full ${
                  isPausedCapacity ? 'bg-amber-500' : branchStyles.barColor
                } transition-all duration-100`}
                style={{ width: `${nodeState.progressRatio * 100}%` }}
              />
            </div>
          </>
        )}
      </button>
    </div>
  );
};
