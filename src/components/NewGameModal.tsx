import React, { useState } from 'react';

interface NewGameModalProps {
  onStartCampaign: (systemCount: number) => void;
}

export const NewGameModal: React.FC<NewGameModalProps> = ({ onStartCampaign }) => {
  const [selectedSystems, setSelectedSystems] = useState<number>(4);

  return (
    <div
      id="new-game-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 12, 0.94)',
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
        id="new-game-modal-frame"
        style={{
          background: '#0a1017',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.15)',
          padding: '28px 36px',
          width: '540px',
          maxWidth: '92vw',
          color: '#c0d8e8',
        }}
      >
        <div
          id="new-game-modal-title"
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#00f0ff',
            marginBottom: '6px',
            letterSpacing: '1px',
          }}
        >
          NEW CAMPAIGN // SECTOR COMMISSION
        </div>
        <div
          id="new-game-modal-subtitle"
          style={{ fontSize: '12px', color: '#688299', marginBottom: '22px' }}
        >
          Configure sector topology. All systems generate in a continuous spatial plane.
        </div>

        <div style={{ marginBottom: '22px' }}>
          <div
            id="new-game-sector-count-label"
            style={{ fontSize: '11px', color: '#88a0b5', marginBottom: '8px' }}
          >
            SECTOR COUNT: <strong style={{ color: '#00f0ff' }}>{selectedSystems} STAR SYSTEMS</strong>
          </div>
          <div
            id="new-game-system-selector-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}
          >
            {[2, 3, 4, 5, 6, 7, 8].map((count) => {
              const isSelected = selectedSystems === count;
              return (
                <button
                  key={count}
                  type="button"
                  id={`system-count-btn-${count}`}
                  onClick={() => setSelectedSystems(count)}
                  style={{
                    padding: '10px 0',
                    background: isSelected ? 'rgba(0, 240, 255, 0.25)' : 'rgba(15, 25, 35, 0.6)',
                    border: `1px solid ${isSelected ? '#00f0ff' : 'rgba(0, 240, 255, 0.2)'}`,
                    color: isSelected ? '#ffffff' : '#7799aa',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>

        {/* System Configuration Readout */}
        <div
          id="new-game-configuration-readout"
          style={{
            background: 'rgba(0, 240, 255, 0.04)',
            borderLeft: '3px solid #00f0ff',
            padding: '12px 14px',
            fontSize: '11px',
            lineHeight: '1.6',
            marginBottom: '26px',
          }}
        >
          <div>
            <span style={{ color: '#88a0b5' }}>GALAXY SCALE: </span>
            <strong style={{ color: '#00f0ff' }}>
              {selectedSystems} Systems • Sector Span: ~{(selectedSystems * 150000).toLocaleString()} km
            </strong>
          </div>
          <div>
            <span style={{ color: '#88a0b5' }}>HYPERSPACE TRANSIT: </span>
            <span style={{ color: '#c0d8e8' }}>
              ~{(selectedSystems * 18).toFixed(0)}s at 64x Sublight Cruise
            </span>
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ color: '#88a0b5' }}>FACTION PARAMETERS: </span>
            <span style={{ color: '#38bdf8' }}>
              Homeworld: Sol Prime (Terran 1.00G) • Starter Miner &amp; HQ Active
            </span>
          </div>
        </div>

        <button
          type="button"
          id="btn-initialize-theater"
          onClick={() => onStartCampaign(selectedSystems)}
          style={{
            width: '100%',
            padding: '13px',
            background: 'rgba(0, 240, 255, 0.22)',
            border: '1px solid #00f0ff',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '1.5px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            transition: 'background 0.2s, box-shadow 0.2s',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 240, 255, 0.35)';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 240, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 240, 255, 0.22)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.2)';
          }}
        >
          [INITIALIZE THEATER OF OPERATIONS]
        </button>
      </div>
    </div>
  );
};
