import React from 'react';
import { Lock } from 'lucide-react';

export interface CommandSlotButtonProps {
  id: string;
  index: number;
  label: string;
  subLabel?: string;
  icon: React.ReactNode;
  onClick: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  hoverData?: {
    type: 'ORDER' | 'BUILD_SHIP' | 'BUILD_STRUCTURE' | 'STANCE';
    payload: any;
  };
  onSlotHover: (
    index: number,
    type: 'ORDER' | 'BUILD_SHIP' | 'BUILD_STRUCTURE' | 'STANCE',
    payload: any,
    rect: DOMRect
  ) => void;
  onSlotLeave: () => void;
  shortcut?: string;
  options?: {
    active?: boolean;
    disabled?: boolean;
    badge?: string | number;
    shortcut?: string;
    accentColor?: string;
    pulse?: boolean;
    lockType?: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE';
    costText?: string;
    hasResourceDeficit?: boolean;
  };
}

export const CommandSlotButton: React.FC<CommandSlotButtonProps> = ({
  id,
  index,
  label,
  subLabel,
  icon,
  onClick,
  onRightClick,
  hoverData,
  onSlotHover,
  onSlotLeave,
  shortcut,
  options,
}) => {
  const isAct = options?.active;
  const isDis = options?.disabled;

  // Derive lock classification
  const lockType: 'RESEARCH' | 'SLIPWAY' | 'RESOURCE' | 'NONE' = (() => {
    if (options?.lockType) return options.lockType;
    if (hoverData) {
      const p = hoverData.payload;
      if (p) {
        if (
          p.federationState === 'TECH_LOCKED' ||
          (p.isLocked &&
            (p.lockReason?.includes('Tech') ||
              p.lockReason?.includes('Research') ||
              p.lockReason?.includes('RESEARCH') ||
              p.lockReason?.includes('Prerequisite') ||
              p.lockReason?.includes('Requires')))
        ) {
          return 'RESEARCH';
        }
        if (
          p.federationState === 'NO_LOCAL_SHIPYARD' ||
          p.lockReason?.includes('SLIPWAY') ||
          p.lockReason?.includes('SHIPYARD') ||
          p.badge === 'SLIPWAY' ||
          p.badge === 'REQ SY'
        ) {
          return 'SLIPWAY';
        }
        if (
          p.rejectionReason?.includes('Deficit') ||
          p.rejectionReason?.includes('SHORTFALL') ||
          p.hasResourceDeficit ||
          (p.deficitM && p.deficitM > 0) ||
          (p.deficitO && p.deficitO > 0)
        ) {
          return 'RESOURCE';
        }
      }
    }
    if (options?.badge === 'LOCK') return 'RESEARCH';
    if (options?.badge === 'SLIPWAY' || options?.badge === 'REQ SY') return 'SLIPWAY';
    if (options?.hasResourceDeficit) return 'RESOURCE';
    return 'NONE';
  })();

  const isResearchLocked = lockType === 'RESEARCH';
  const isSlipwayLocked = lockType === 'SLIPWAY';
  const isResourceLocked = lockType === 'RESOURCE';

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (hoverData) {
      onSlotHover(index, hoverData.type, hoverData.payload, rect);
    }
  };

  const handleMouseLeave = () => {
    onSlotLeave();
  };

  // Compute icon filter based on lock state
  const iconFilterStyle: React.CSSProperties = isResearchLocked
    ? { filter: 'grayscale(80%) brightness(0.6)' }
    : isSlipwayLocked
    ? { filter: 'sepia(50%) brightness(0.7)' }
    : {};

  return (
    <button
      id={id}
      type="button"
      aria-disabled={isDis}
      onClick={(e) => {
        if (isDis) {
          e.preventDefault();
          return;
        }
        onClick();
      }}
      onContextMenu={(e) => {
        if (onRightClick) {
          e.preventDefault();
          if (isDis) return;
          onRightClick(e);
        }
      }}
      onKeyDown={(e) => {
        if (isDis && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
        }
      }}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`command-slot-btn group relative select-none overflow-hidden pointer-events-auto ${
        isDis ? 'is-locked locked cursor-not-allowed' : 'available cursor-pointer'
      } ${
        isDis
          ? isResearchLocked
            ? 'bg-rose-950/20 border-rose-900/40 text-slate-500'
            : isSlipwayLocked
            ? 'bg-amber-950/20 border-amber-900/40 text-slate-400'
            : 'bg-slate-950/70 border-slate-800/70 text-slate-600 opacity-60'
          : isAct
          ? '!bg-cyan-950/90 !border-cyan-400 text-cyan-200 shadow-[0_0_14px_rgba(0,240,255,0.4)]'
          : 'text-slate-300'
      } ${options?.pulse ? 'animate-pulse' : ''}`}
    >
      {/* Accent highlight strip */}
      {options?.accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-[2.5px]"
          style={{ backgroundColor: options.accentColor }}
        />
      )}

      {/* Keyboard shortcut tag (Upper-Left Corner) */}
      {shortcut && (
        <span className="command-slot-hotkey leading-none z-10 px-1 py-0.5 rounded bg-black/80 border border-amber-500/60 font-bold shadow-sm">
          {shortcut}
        </span>
      )}

      {/* Padlock Icon Overlay for Research Locked Blueprints (Upper-Right Corner) */}
      {isResearchLocked && (
        <span
          className="absolute top-1.5 right-1.5 p-0.5 rounded bg-black/85 border border-rose-500/80 text-rose-400 shadow-md leading-none z-20"
          title="Technology Research Required"
        >
          <Lock className="w-3 h-3 text-rose-400 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]" />
        </span>
      )}

      {/* Queue Count Badge / Status Badge (Upper-Right Corner when not showing research lock) */}
      {!isResearchLocked && options?.badge !== undefined && options.badge !== '' && (
        <span
          className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] font-mono font-black rounded shadow-md leading-none z-10 ${
            isSlipwayLocked
              ? 'bg-amber-500/90 text-slate-950 border border-amber-400/80'
              : 'bg-cyan-500 text-slate-950'
          }`}
        >
          {options.badge}
        </span>
      )}

      {/* Primary Icon / Glyph with dynamic lock filter */}
      <div
        className="command-slot-icon flex items-center justify-center relative my-0.5 [&_svg]:w-full [&_svg]:h-full pointer-events-none transition-all duration-150"
        style={iconFilterStyle}
      >
        {icon}
      </div>

      {/* Naval Designation / Command Label */}
      <span className="command-slot-label text-center truncate w-[92%] px-0.5 pointer-events-none">
        {label}
      </span>

      {/* Sub-label / Cost display */}
      {(options?.costText || subLabel) && (
        <span
          className={`text-[10px] font-mono font-medium leading-tight text-center truncate w-[92%] mt-0.5 pointer-events-none ${
            isResourceLocked
              ? 'text-rose-400 font-bold drop-shadow-[0_0_3px_rgba(244,63,94,0.5)]'
              : isResearchLocked
              ? 'text-rose-300/70'
              : isSlipwayLocked
              ? 'text-amber-400/90'
              : 'text-slate-400'
          }`}
        >
          {options?.costText || subLabel}
        </span>
      )}
    </button>
  );
};
