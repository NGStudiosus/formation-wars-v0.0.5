import React, { useEffect, useState } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { FACTION_REGISTRY } from '../simulation/factions/factionRegistry';
import {
  TEAM_COLORS,
  TEAM_NAMES,
  offerAlliance,
  acceptAlliance,
  breakAlliance,
  setPlayerTeam,
  getAlliedFactions,
} from '../simulation/diplomacyController';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Handshake,
  Send,
  Zap,
  Globe,
  Radio,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface DiplomacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: SimulationEngine;
}

export const DiplomacyModal: React.FC<DiplomacyModalProps> = ({
  isOpen,
  onClose,
  engine,
}) => {
  const [, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'd' || e.key === 'D') {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const diplomacy = engine.diplomacyState;
  const players = diplomacy?.players || [];
  const player1 = players.find((p) => p.id === 'player-1');
  const playerFaction = engine.playerFaction || 'NOVAN';
  const alliedFactions = getAlliedFactions(playerFaction, diplomacy);
  const isLiaalPlayer = playerFaction === 'LIAAL';
  const hasLiaalAlly = alliedFactions.includes('LIAAL');

  const handleOffer = (targetId: string) => {
    if (!diplomacy) return;
    offerAlliance(targetId, diplomacy, (cat, msg, lvl) => engine.addLog(cat as any, msg, lvl));
    setRefreshTick((t) => t + 1);
  };

  const handleAccept = (targetId: string) => {
    if (!diplomacy) return;
    acceptAlliance(targetId, diplomacy, (cat, msg, lvl) => engine.addLog(cat as any, msg, lvl));
    setRefreshTick((t) => t + 1);
  };

  const handleBreak = (targetId: string) => {
    if (!diplomacy) return;
    breakAlliance(targetId, diplomacy, (cat, msg, lvl) => engine.addLog(cat as any, msg, lvl));
    setRefreshTick((t) => t + 1);
  };

  const handleCycleTeam = (playerId: string, currentTeam: number) => {
    if (!diplomacy) return;
    const nextTeam = (currentTeam % 8) + 1;
    setPlayerTeam(playerId, nextTeam, diplomacy, (cat, msg, lvl) => engine.addLog(cat as any, msg, lvl));
    setRefreshTick((t) => t + 1);
  };

  return (
    <div
      id="diplomacy-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 14, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      <div
        id="diplomacy-modal-frame"
        style={{
          width: '780px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          background: '#070d18',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 0 40px rgba(0, 240, 255, 0.15)',
          borderRadius: '4px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          color: '#cbd5e1',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Handshake className="w-5 h-5 text-cyan-400" />
            <div>
              <div
                id="diplomacy-modal-title"
                style={{ fontSize: '15px', fontWeight: 'bold', color: '#00f0ff', letterSpacing: '1px' }}
              >
                DIPLOMACY MATRIX // SECTOR ALLIANCES (8 TEAMS)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                CONFIGURE STRATEGIC PACTS, COALITION TEAMS, AND PROXY SHIP COMMISSION PRIVILEGES
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-diplomacy-modal"
            onClick={onClose}
            style={{
              padding: '6px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '3px',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
            title="Close Diplomacy Window [ESC / D]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Proxy Commission Banner (For Liaal or Allies of Liaal) */}
        {(isLiaalPlayer || hasLiaalAlly) && (
          <div
            id="liaal-proxy-status-banner"
            style={{
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid #f97316',
              borderRadius: '4px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px',
              color: '#fed7aa',
            }}
          >
            <Zap className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <div>
              <strong style={{ color: '#fb923c' }}>LIAAL PROXY PROCUREMENT ACTIVE:</strong>{' '}
              {isLiaalPlayer
                ? `Liaal shipyards can construct ALL hulls unlocked by allied sovereign powers (${alliedFactions.filter(f => f !== 'LIAAL').join(', ') || 'No external allies yet'}). Proxy ships inherit native allied research and armor enhancements!`
                : `Allied Liaal Consortium partners can proxy-commission your sovereign blueprints in exchange for bulk resources.`}
            </div>
          </div>
        )}

        {/* 2 to 8 Player Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
            <span>SOVEREIGN COMMAND / FACTION</span>
            <span>TEAM ASSIGNMENT • DIPLOMATIC ACTION</span>
          </div>

          {players.map((p, idx) => {
            const fac = FACTION_REGISTRY[p.factionId] || {
              id: p.factionId,
              name: p.factionId,
              tag: p.factionId,
              primaryColor: '#00f0ff',
              accentColor: '#38bdf8',
              description: '',
              doctrineBrief: '',
            };
            const teamColor = TEAM_COLORS[p.team] || '#00f0ff';
            const isSelf = p.id === 'player-1';
            const isAlliedWithPlayer1 =
              isSelf ||
              p.team === player1?.team ||
              p.relationship === 'ALLIED' ||
              diplomacy?.alliances.has([player1?.id || '', p.id].sort().join('_'));

            return (
              <div
                key={p.id}
                id={`diplomacy-row-${p.id}`}
                style={{
                  background: isSelf ? 'rgba(0, 240, 255, 0.06)' : isAlliedWithPlayer1 ? 'rgba(34, 197, 94, 0.06)' : '#0b1320',
                  border: `1px solid ${isSelf ? 'rgba(0, 240, 255, 0.4)' : isAlliedWithPlayer1 ? 'rgba(34, 197, 94, 0.4)' : '#1e293b'}`,
                  borderRadius: '4px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                {/* Left: Faction Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      background: `${fac.primaryColor}22`,
                      border: `1px solid ${fac.primaryColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '11px',
                      color: fac.primaryColor,
                    }}
                  >
                    {fac.tag}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 'bold', color: fac.primaryColor, fontSize: '12px' }}>
                        {fac.name}
                      </span>
                      {isSelf && (
                        <span style={{ fontSize: '9px', background: '#00f0ff22', color: '#00f0ff', padding: '1px 5px', borderRadius: '2px' }}>
                          YOU
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>
                      {p.systemName || `Sector ${p.systemIndex + 1}`} • {fac.doctrineBrief || fac.description}
                    </span>
                  </div>
                </div>

                {/* Right: Team Tag & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Team Tag Toggle */}
                  <button
                    type="button"
                    id={`btn-toggle-team-${p.id}`}
                    onClick={() => handleCycleTeam(p.id, p.team)}
                    style={{
                      background: `${teamColor}18`,
                      border: `1px solid ${teamColor}`,
                      color: teamColor,
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Click to cycle Team (1-8)"
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: teamColor }} />
                    TEAM {p.team}
                  </button>

                  {/* Relationship Badge / Action */}
                  {isSelf ? (
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#38bdf8',
                        background: '#0f172a',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        border: '1px solid #1e293b',
                      }}
                    >
                      SOVEREIGN
                    </span>
                  ) : isAlliedWithPlayer1 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#4ade80',
                          background: 'rgba(34, 197, 94, 0.15)',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          border: '1px solid #22c55e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ALLIED
                      </span>
                      <button
                        type="button"
                        id={`btn-break-alliance-${p.id}`}
                        onClick={() => handleBreak(p.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid #ef4444',
                          color: '#fca5a5',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        BREAK
                      </button>
                    </div>
                  ) : p.relationship === 'OFFER_SENT' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#fde047',
                          background: 'rgba(234, 179, 8, 0.15)',
                          padding: '4px 8px',
                          borderRadius: '3px',
                          border: '1px solid #eab308',
                        }}
                      >
                        OFFER PENDING
                      </span>
                      <button
                        type="button"
                        id={`btn-accept-pending-${p.id}`}
                        onClick={() => handleAccept(p.id)}
                        style={{
                          background: '#22c55e',
                          color: '#070d16',
                          border: 'none',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '3px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        ACCEPT ALLIANCE
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id={`btn-offer-alliance-${p.id}`}
                      onClick={() => handleOffer(p.id)}
                      style={{
                        background: 'rgba(0, 240, 255, 0.15)',
                        border: '1px solid #00f0ff',
                        color: '#00f0ff',
                        padding: '4px 12px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Send className="w-3 h-3" />
                      OFFER ALLIANCE
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div
          style={{
            borderTop: '1px solid #1e293b',
            paddingTop: '10px',
            fontSize: '10px',
            color: '#64748b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            💡 Factions on the same Team ID are automatic allies. Combat targeting will never engage allied ships.
          </span>
          <span style={{ color: '#00f0ff' }}>[D] or [ESC] to Dismiss</span>
        </div>
      </div>
    </div>
  );
};
