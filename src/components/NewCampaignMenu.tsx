import React, { useState } from 'react';
import { FactionId, GameSetupConfig, HomeworldTypeId, HqTypeId } from '../types';
import { FACTION_REGISTRY, ALL_FACTION_IDS } from '../simulation/factions/factionRegistry';
import { TEAM_COLORS, TEAM_NAMES } from '../simulation/diplomacyController';
import {
  HOMEWORLD_REGISTRY,
  HQ_REGISTRY,
  getDefaultHomeworldForFaction,
  getDefaultHQForFaction,
} from '../simulation/hqRegistry';

interface Props {
  initialSystemCount?: number;
  onLaunchCampaign: (config: GameSetupConfig) => void;
  onCancel?: () => void;
}

export const NewCampaignMenu: React.FC<Props> = ({
  initialSystemCount = 2,
  onLaunchCampaign,
  onCancel
}) => {
  const [step, setStep] = useState<'SYSTEMS' | 'PLAYER_FACTION' | 'OPPONENTS'>('SYSTEMS');
  const [systemCount, setSystemCount] = useState<number>(() => {
    return Math.min(8, Math.max(2, initialSystemCount));
  });
  const [playerFaction, setPlayerFaction] = useState<FactionId>('NOVAN');
  const [playerTeam, setPlayerTeam] = useState<number>(1);
  const [homeworldType, setHomeworldType] = useState<HomeworldTypeId>(() => getDefaultHomeworldForFaction('NOVAN'));
  const [hqType, setHqType] = useState<HqTypeId>(() => getDefaultHQForFaction('NOVAN'));
  const [opponents, setOpponents] = useState<FactionId[]>(() => {
    const available = ALL_FACTION_IDS.filter(f => f !== 'NOVAN');
    const clampedInitial = Math.min(8, Math.max(2, initialSystemCount));
    return Array.from({ length: Math.max(1, clampedInitial - 1) }, (_, i) => available[i % available.length]);
  });
  const [opponentTeams, setOpponentTeams] = useState<number[]>(() => {
    const clampedInitial = Math.min(8, Math.max(2, initialSystemCount));
    return Array.from({ length: Math.max(1, clampedInitial - 1) }, (_, i) => ((i + 1) % 8) + 1);
  });

  const handleSystemCountChange = (count: number) => {
    const clamped = Math.min(8, Math.max(2, count));
    setSystemCount(clamped);
    const needed = Math.max(1, clamped - 1);
    const pool = ALL_FACTION_IDS.filter(f => f !== playerFaction);
    setOpponents(Array.from({ length: needed }, (_, i) => pool[i % pool.length]));
    setOpponentTeams(Array.from({ length: needed }, (_, i) => ((i + 1) % 8) + 1));
  };

  const handlePlayerFactionSelect = (fac: FactionId) => {
    setPlayerFaction(fac);
    const hw = getDefaultHomeworldForFaction(fac);
    const hq = getDefaultHQForFaction(fac);
    setHomeworldType(hw);
    setHqType(hq);
    const pool = ALL_FACTION_IDS.filter(f => f !== fac);
    setOpponents(prev => prev.map((_, i) => pool[i % pool.length]));
  };

  const setOpponentForSystem = (index: number, fac: FactionId) => {
    setOpponents(prev => {
      const next = [...prev];
      next[index] = fac;
      return next;
    });
  };

  const cycleOpponentTeam = (index: number) => {
    setOpponentTeams(prev => {
      const next = [...prev];
      const cur = next[index] || 2;
      next[index] = (cur % 8) + 1;
      return next;
    });
  };

  const cyclePlayerTeam = () => {
    setPlayerTeam(prev => (prev % 8) + 1);
  };

  const activeHomeworld = HOMEWORLD_REGISTRY[homeworldType];
  const activeHQ = HQ_REGISTRY[hqType];

  return (
    <div
      id="new-campaign-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 14, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        fontFamily: 'monospace',
        color: '#e2e8f0'
      }}
    >
      <div
        id="new-campaign-menu-frame"
        style={{
          width: '920px',
          maxHeight: '92vh',
          background: '#070d16',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '4px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 0 35px rgba(0, 0, 0, 0.85)',
          overflowY: 'auto'
        }}
      >
        {/* Header & Steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <div>
            <div
              id="new-campaign-header-title"
              style={{ fontSize: '18px', fontWeight: 'bold', color: '#00f0ff', letterSpacing: '1px' }}
            >
              STRATEGIC CAMPAIGN INITIALIZATION
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              CONFIGURE GALAXY SCALE, FACTION DOCTRINE, SOVEREIGN HOMEWORLD, AND CITADEL HQ
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <span id="step-tab-sectors" style={{ color: step === 'SYSTEMS' ? '#00f0ff' : '#475569', fontWeight: step === 'SYSTEMS' ? 'bold' : 'normal' }}>
              [1. SECTORS]
            </span>
            <span id="step-tab-player-faction" style={{ color: step === 'PLAYER_FACTION' ? '#00f0ff' : '#475569', fontWeight: step === 'PLAYER_FACTION' ? 'bold' : 'normal' }}>
              [2. FACTION & CITADEL]
            </span>
            <span id="step-tab-opponents" style={{ color: step === 'OPPONENTS' ? '#00f0ff' : '#475569', fontWeight: step === 'OPPONENTS' ? 'bold' : 'normal' }}>
              [3. OPPONENTS]
            </span>
          </div>
        </div>

        {/* STEP 1: GALAXY SCALE (STRICT 2 TO 8 SECTORS) */}
        {step === 'SYSTEMS' && (
          <div id="step-panel-systems" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '340px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              SELECT THE NUMBER OF STAR SYSTEMS IN THIS THEATER (MINIMUM 2, MAXIMUM 8):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
              {[2, 3, 4, 5, 6, 7, 8].map(count => (
                <button
                  key={count}
                  id={`btn-system-count-${count}`}
                  onClick={() => handleSystemCountChange(count)}
                  style={{
                    padding: '16px 8px',
                    background: systemCount === count ? 'rgba(0, 240, 255, 0.15)' : '#0f172a',
                    border: `1px solid ${systemCount === count ? '#00f0ff' : '#1e293b'}`,
                    color: systemCount === count ? '#00f0ff' : '#cbd5e1',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{count}</span>
                  <span style={{ fontSize: '9px', color: '#64748b', textAlign: 'center' }}>
                    {count === 2 ? 'BINARY SECTORS' : `${count} SYSTEMS`}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ background: '#0b1320', padding: '14px', borderRadius: '4px', border: '1px solid #1e293b', fontSize: '11px', color: '#94a3b8' }}>
              Each star system features independent planetary orbits, asteroid clusters, tactical jump gates, and sovereign defense zones. Multi-system theaters permit hyper-velocity jump operations between adjacent sectors.
            </div>
          </div>
        )}

        {/* STEP 2: PLAYER FACTION & SOVEREIGN CITADEL SPECIFICATION */}
        {step === 'PLAYER_FACTION' && (
          <div id="step-panel-player-faction" style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '360px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              DESIGNATE YOUR SPECIES / EMPIRE DOCTRINE (EACH FACTION COMMANDS ITS NATIVE CITADEL HQ):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {ALL_FACTION_IDS.map(facId => {
                const fac = FACTION_REGISTRY[facId];
                const isSelected = playerFaction === facId;
                const defHq = HQ_REGISTRY[getDefaultHQForFaction(facId)];
                return (
                  <div
                    key={facId}
                    id={`card-faction-${facId.toLowerCase()}`}
                    onClick={() => handlePlayerFactionSelect(facId)}
                    style={{
                      padding: '12px',
                      background: isSelected ? 'rgba(0, 240, 255, 0.12)' : '#0b1320',
                      border: `1px solid ${isSelected ? fac.primaryColor : '#1e293b'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      boxShadow: isSelected ? `0 0 12px ${fac.primaryColor}33` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: fac.primaryColor, fontSize: '13px' }}>
                        {fac.name}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>[{fac.tag}]</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', lineHeight: 1.25 }}>
                      {fac.description}
                    </div>
                    <div style={{ fontSize: '9px', color: '#cbd5e1', marginTop: 'auto', borderTop: '1px solid #1e293b', paddingTop: '4px' }}>
                      <span style={{ color: '#64748b' }}>HQ: </span>
                      <span style={{ color: fac.primaryColor, fontWeight: 'bold' }}>{defHq?.name || 'Citadel HQ'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* INTEGRATED CITADEL & HOMEWORLD SPECIFICATION PANEL */}
            <div style={{ background: '#0b1320', border: '1px solid #1e293b', borderRadius: '4px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: FACTION_REGISTRY[playerFaction].primaryColor }}>
                  {FACTION_REGISTRY[playerFaction].name.toUpperCase()} SOVEREIGN COMMAND SPECIFICATION
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>TEAM:</span>
                  <button
                    type="button"
                    id="btn-player-team-toggle"
                    onClick={cyclePlayerTeam}
                    style={{
                      background: `${TEAM_COLORS[playerTeam]}22`,
                      border: `1px solid ${TEAM_COLORS[playerTeam]}`,
                      color: TEAM_COLORS[playerTeam],
                      padding: '2px 8px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                    title="Toggle Player Team (1 to 8)"
                  >
                    TEAM {playerTeam} ({TEAM_NAMES[playerTeam].split(' ')[1] || `T${playerTeam}`})
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                {/* Homeworld Biome */}
                <div style={{ background: '#070d16', padding: '10px', borderRadius: '3px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: activeHomeworld.baseColor,
                        boxShadow: `0 0 6px ${activeHomeworld.baseColor}`
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8' }}>
                      {activeHomeworld.name} ({activeHomeworld.planetClass})
                    </span>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#64748b' }}>
                    Designation: {activeHomeworld.defaultPlanetName}
                  </div>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.25 }}>
                    {activeHomeworld.modifiersSummary}
                  </div>
                </div>

                {/* Sovereign Citadel HQ */}
                <div style={{ background: '#070d16', padding: '10px', borderRadius: '3px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#4ade80' }}>
                      {activeHQ.name}
                    </span>
                    <span style={{ fontSize: '9px', color: '#64748b', background: '#0f172a', padding: '2px 5px', borderRadius: '2px' }}>
                      {activeHQ.isMobile ? 'MOBILE SUPER-VESSEL' : activeHQ.isRingStructure ? 'ANNULAR MEGASTRUCTURE' : 'ORBITAL STATION'}
                    </span>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94a3b8', lineHeight: 1.25 }}>
                    {activeHQ.description}
                  </div>

                  {/* Modifiers Matrix */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', background: '#0f172a', padding: '6px', borderRadius: '3px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: '#64748b' }}>ORE TRANSFER SPACE</span>
                      <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#f59e0b' }}>
                        {activeHQ.isRingStructure ? 'Ring + 250km' : `${Math.round(activeHQ.oreDropOffRange)} km`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: '#64748b' }}>MISSILE TUBES</span>
                      <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#ef4444' }}>
                        {activeHQ.missileLaunchers} tubes
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: '#64748b' }}>HULL / SHIELDS</span>
                      <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#38bdf8' }}>
                        {Math.round(activeHQ.hullMax / 1000)}k / {Math.round(activeHQ.shieldHpMax / 1000)}k
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '8px', color: '#64748b' }}>DEFENSIVE UMBRELLA</span>
                      <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#4ade80' }}>
                        {activeHQ.isRingStructure ? '+600km Beyond Ring' : `${Math.round(activeHQ.pdplaRange)} km`}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '8.5px', color: '#4ade80', borderTop: '1px solid #1e293b', paddingTop: '4px' }}>
                    ⚡ {activeHQ.functionsDescription}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: OPPONENT ROSTER ASSIGNMENT */}
        {step === 'OPPONENTS' && (
          <div id="step-panel-opponents" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '340px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              ASSIGN RIVAL FACTIONS AND COALITION TEAMS TO THEATER SECTORS:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {opponents.map((currentOpp, idx) => {
                const oppTeam = opponentTeams[idx] || ((idx + 1) % 8) + 1;
                const teamColor = TEAM_COLORS[oppTeam] || '#ef4444';
                return (
                  <div
                    key={idx}
                    id={`opponent-sector-row-${idx + 1}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#0f172a',
                      padding: '8px 14px',
                      borderRadius: '4px',
                      border: '1px solid #1e293b'
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                      SECTOR {idx + 2} (SYSTEM {idx + 1}):
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        id={`select-opponent-system-${idx + 1}`}
                        value={currentOpp}
                        onChange={(e) => setOpponentForSystem(idx, e.target.value as FactionId)}
                        style={{
                          background: '#070d16',
                          color: FACTION_REGISTRY[currentOpp].primaryColor,
                          border: `1px solid ${FACTION_REGISTRY[currentOpp].primaryColor}`,
                          padding: '4px 8px',
                          borderRadius: '3px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {ALL_FACTION_IDS.map(f => (
                          <option key={f} value={f}>
                            {FACTION_REGISTRY[f].name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        id={`btn-opponent-team-toggle-${idx + 1}`}
                        onClick={() => cycleOpponentTeam(idx)}
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
                        }}
                        title="Toggle Opponent Team (1 to 8)"
                      >
                        TEAM {oppTeam}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation & Launch Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '14px' }}>
          <div>
            {step !== 'SYSTEMS' && (
              <button
                id="btn-campaign-back"
                onClick={() => {
                  if (step === 'OPPONENTS') setStep('PLAYER_FACTION');
                  else setStep('SYSTEMS');
                }}
                style={{
                  padding: '6px 14px',
                  background: '#1e293b',
                  border: '1px solid #475569',
                  color: '#cbd5e1',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                BACK
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onCancel && (
              <button
                id="btn-campaign-cancel"
                onClick={onCancel}
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#64748b',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                CANCEL
              </button>
            )}

            {step !== 'OPPONENTS' ? (
              <button
                id="btn-campaign-next"
                onClick={() => {
                  if (step === 'SYSTEMS') setStep('PLAYER_FACTION');
                  else setStep('OPPONENTS');
                }}
                style={{
                  padding: '6px 18px',
                  background: '#00f0ff',
                  border: 'none',
                  color: '#070d16',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                NEXT STEP
              </button>
            ) : (
              <button
                id="btn-commission-theater"
                onClick={() => onLaunchCampaign({
                  systemCount,
                  playerFaction,
                  playerTeam,
                  systemOpponents: opponents,
                  systemOpponentTeams: opponentTeams,
                  homeworldType,
                  hqType
                })}
                style={{
                  padding: '6px 22px',
                  background: '#22c55e',
                  border: 'none',
                  color: '#070d16',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  boxShadow: '0 0 12px rgba(34, 197, 94, 0.4)'
                }}
              >
                COMMISSION THEATER
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
