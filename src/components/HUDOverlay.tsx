import React from 'react';
import { FlaskConical } from 'lucide-react';

interface HUDOverlayProps {
  onOpenResearchModal: () => void;
  militaryCount?: number;
  civicCount?: number;
  expansionCount?: number;
}

/**
 * HUDOverlay / Upper Ribbon Beaker Trigger
 * Anchored below center resource stats in the designated upper-center area.
 */
export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  onOpenResearchModal,
  militaryCount = 0,
  civicCount = 0,
  expansionCount = 0,
}) => {
  const totalActiveLabs = militaryCount + civicCount + expansionCount;

  return (
    <div
      id="research-archive-ribbon-trigger"
      onClick={onOpenResearchModal}
      title="ACCESS FACTION RESEARCH ARCHIVE [R]"
      style={{
        position: 'fixed',
        top: '42px',
        left: '54%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 14px',
        background: 'rgba(10, 18, 30, 0.88)',
        border: '1px solid rgba(0, 240, 255, 0.35)',
        borderRadius: '4px',
        cursor: 'pointer',
        zIndex: 45,
        backdropFilter: 'blur(6px)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        pointerEvents: 'auto',
      }}
      className="font-mono text-xs transition-all duration-200 hover:border-[#00f0ff] hover:shadow-[0_0_14px_rgba(0,240,255,0.45)] group select-none"
    >
      {/* Crisp Beaker/Flask SVG Icon */}
      <FlaskConical
        className="w-4 h-4 text-[#00f0ff] group-hover:scale-110 transition-transform flex-shrink-0"
        style={{ color: '#00f0ff' }}
      />

      {/* Monospace Micro-Caption */}
      <span className="font-bold tracking-wider text-cyan-200 group-hover:text-white uppercase text-[11px]">
        RESEARCH ARCHIVE
      </span>

      {/* Active Lab Badge if any stations active */}
      {totalActiveLabs > 0 && (
        <span className="text-[9px] px-1.5 py-0.2 bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 rounded font-bold">
          {totalActiveLabs} LAB{totalActiveLabs > 1 ? 'S' : ''}
        </span>
      )}

      {/* Hotkey Indicator */}
      <span className="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-cyan-500/30 text-cyan-400 rounded font-bold group-hover:border-cyan-400 group-hover:text-cyan-200">
        [R]
      </span>
    </div>
  );
};
