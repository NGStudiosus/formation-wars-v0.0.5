import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SimulationEngine } from './simulation/engine';
import { SCENARIOS, ScenarioDefinition } from './simulation/scenarios';
import { TacticalCanvas } from './components/TacticalCanvas';
import { UpperSystemBar } from './components/UpperSystemBar';
import { FleetRibbon } from './components/FleetRibbon';
import { LowerCommandDeck } from './components/LowerCommandDeck';
import { TestBenchModal } from './components/TestBenchModal';
import { CodeInspectorModal } from './components/CodeInspectorModal';
import { SettingsModal } from './components/SettingsModal';
import { ResearchModal } from './components/ResearchModal';
import { ResearchErrorBoundary } from './components/ResearchErrorBoundary';
import { StructureType, Vec2D } from './types';
import { determineFlagship } from './simulation/fleetController';
import { NewGameModal } from './components/NewGameModal';
import { GameStatus, state as globalState } from './state/gameState';

export default function App() {
  const [currentScenario, setCurrentScenario] = useState<ScenarioDefinition>(SCENARIOS[0]);
  const engineRef = useRef<SimulationEngine>(
    new SimulationEngine(currentScenario.ships, currentScenario.jumpGate, currentScenario.defaultConfig)
  );

  const [gameStatus, setGameStatus] = useState<GameStatus>('SETUP');

  const [selectedShipId, setSelectedShipId] = useState<string | null>(
    engineRef.current.ships[0]?.id || null
  );
  const [selectedShipIds, setSelectedShipIds] = useState<string[]>(
    engineRef.current.ships[0]?.id ? [engineRef.current.ships[0].id] : []
  );
  const [cameraFocusTarget, setCameraFocusTarget] = useState<Vec2D | null>(null);

  const [moveModeActive, setMoveModeActive] = useState(false);
  const [jumpModeActive, setJumpModeActive] = useState(false);
  const [buildStructureType, setBuildStructureType] = useState<StructureType | null>(null);
  const [isTestBenchOpen, setIsTestBenchOpen] = useState(false);
  const [isCodeInspectorOpen, setIsCodeInspectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const wasPausedBeforeResearchRef = useRef(false);

  const handleOpenResearchModal = useCallback(() => {
    wasPausedBeforeResearchRef.current = engineRef.current.isPaused;
    if (!engineRef.current.isPaused) {
      engineRef.current.isPaused = true;
      engineRef.current.addLog('TACTICAL', 'RESEARCH ARCHIVE OPENED — Simulation PAUSED', 'info');
    }
    setIsResearchModalOpen(true);
  }, []);

  const handleCloseResearchModal = useCallback(() => {
    setIsResearchModalOpen(false);
    if (!wasPausedBeforeResearchRef.current) {
      engineRef.current.isPaused = false;
      engineRef.current.addLog('TACTICAL', 'RESEARCH ARCHIVE CLOSED — Simulation RESUMED', 'info');
    }
  }, []);

  const handleToggleResearchModal = useCallback(() => {
    setIsResearchModalOpen((prev) => {
      if (prev) {
        if (!wasPausedBeforeResearchRef.current) {
          engineRef.current.isPaused = false;
          engineRef.current.addLog('TACTICAL', 'RESEARCH ARCHIVE CLOSED — Simulation RESUMED', 'info');
        }
        return false;
      } else {
        wasPausedBeforeResearchRef.current = engineRef.current.isPaused;
        if (!engineRef.current.isPaused) {
          engineRef.current.isPaused = true;
          engineRef.current.addLog('TACTICAL', 'RESEARCH ARCHIVE OPENED — Simulation PAUSED', 'info');
        }
        return true;
      }
    });
  }, []);

  // Sync HUD telemetry strictly with the engine's deterministic simulation tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const engine = engineRef.current;
    // Throttle React HUD updates to every 3 simulation ticks (~10Hz) to prevent redundant React renders
    // while keeping telemetry strictly bounded to deterministic engine time
    const unsubscribe = engine.subscribeTick((tickCount) => {
      if (tickCount % 3 === 0) {
        setTick(tickCount);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSelectShip = useCallback((id: string | null) => {
    engineRef.current.selectedShipId = id;
    setSelectedShipId(id);
    setSelectedShipIds(id ? [id] : []);
    engineRef.current.selectedShipIds = id ? [id] : [];
    setBuildStructureType(null);
  }, []);

  const handleSelectShips = useCallback((ids: string[]) => {
    if (ids.length === 0) {
      engineRef.current.selectedShipId = null;
      engineRef.current.selectedShipIds = [];
      setSelectedShipId(null);
      setSelectedShipIds([]);
      setBuildStructureType(null);
      return;
    }
    setSelectedShipIds(ids);
    engineRef.current.selectedShipIds = [...ids];
    const operational = engineRef.current.ships.filter((s) => ids.includes(s.id));
    const flagship = determineFlagship(operational);
    const primaryId = flagship ? flagship.id : ids[0];
    engineRef.current.selectedShipId = primaryId;
    setSelectedShipId(primaryId);
    setBuildStructureType(null);
  }, []);

  const handleLoadScenario = useCallback((scenario: ScenarioDefinition) => {
    setCurrentScenario(scenario);
    engineRef.current.resetToScenario(scenario);
    const firstId = scenario.ships[0]?.id || null;
    setSelectedShipId(firstId);
    setSelectedShipIds(firstId ? [firstId] : []);
    setMoveModeActive(false);
    setJumpModeActive(false);
    setBuildStructureType(null);
  }, []);

  const handleStartCampaign = useCallback((systemCount: number) => {
    const engine = engineRef.current;
    engine.startCampaign(systemCount, Date.now());

    // Center camera smoothly over System 0 Homeworld
    const homeworld = engine.systems?.[0];
    const targetPos =
      homeworld?.solarSystem?.primaryHabitablePlanet?.pos ||
      homeworld?.center || { x: 0, y: 0 };
    setCameraFocusTarget({ x: targetPos.x, y: targetPos.y });

    // Select flagship or first friendly ship
    const friendly = engine.ships.filter((s) => s.faction === 'FRIENDLY');
    const flagship = determineFlagship(friendly);
    const firstId = flagship ? flagship.id : friendly[0]?.id || null;
    setSelectedShipId(firstId);
    setSelectedShipIds(firstId ? [firstId] : []);
    engine.selectedShipId = firstId;
    engine.selectedShipIds = firstId ? [firstId] : [];

    setGameStatus('ACTIVE');
    globalState.gameStatus = 'ACTIVE';
    engine.gameStatus = 'ACTIVE';
  }, []);

  const handleResetScenario = useCallback(() => {
    engineRef.current.gameStatus = 'SETUP';
    globalState.gameStatus = 'SETUP';
    setGameStatus('SETUP');
    engineRef.current.resetToScenario(currentScenario);
    const firstId = currentScenario.ships[0]?.id || null;
    setSelectedShipId(firstId);
    setSelectedShipIds(firstId ? [firstId] : []);
    setMoveModeActive(false);
    setJumpModeActive(false);
    setBuildStructureType(null);
  }, [currentScenario]);

  // Global Keyboard Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus === 'SETUP') return;
      if (isTestBenchOpen || isCodeInspectorOpen || isSettingsOpen) return;
      // Skip if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      // Prevent duplicate action firing on key repeat
      if (e.repeat) return;

      const engine = engineRef.current;
      const key = e.key.toLowerCase();
      const ship = engine.getSelectedShip();

      // If research modal is open, let the modal handle its own Escape/R/Space hotkeys
      if (isResearchModalOpen) {
        return;
      }

      // Space: Toggle Pause / Resume
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        engine.togglePause();
        return;
      }

      if (key === 'p') {
        if (ship) {
          if (ship.role === 'MINER') {
            const current = (ship as any).minerStance || 'TIMID';
            engine.setMinerStance(ship.id, current === 'TIMID' ? 'CARELESS' : 'TIMID');
          } else {
            engine.setCombatStance(ship.id, 'PASSIVE');
          }
        }
      } else if (key === 'd') {
        if (ship && ship.role !== 'MINER') engine.setCombatStance(ship.id, 'DEFENSIVE');
      } else if (key === 'a') {
        if (ship && ship.role !== 'MINER') {
          const current = ship.combatStance || 'DEFENSIVE';
          const next =
            current === 'PASSIVE'
              ? 'DEFENSIVE'
              : current === 'DEFENSIVE'
              ? 'AGGRESSIVE'
              : 'PASSIVE';
          engine.setCombatStance(ship.id, next);
        }
      } else if (key === 'm') {
        // Toggle Move Order Mode
        setMoveModeActive((prev) => !prev);
      } else if (key === 's') {
        // Retro-Burn / Hold Vector
        if (ship) engine.holdVector(ship.id);
      } else if (key === 'f') {
        // Salvo Fire
        if (ship && ship.faction === 'FRIENDLY') {
          engine.fireManualSalvo(ship.id);
        }
      } else if (key === 't') {
        // TOT Mode Toggle
        if (ship && ship.faction === 'FRIENDLY') {
          engine.toggleTotMode(ship.id);
        }
      } else if (key === 'o') {
        // PD Mode Cycle
        if (ship && ship.faction === 'FRIENDLY') {
          engine.cyclePdMode(ship.id);
        }
      } else if (key === 'r') {
        // Toggle Research Archive Modal [R]
        e.preventDefault();
        handleToggleResearchModal();
        return;
      } else if (key === 'c') {
        // E-War / Jamming Chaff
        engine.toggleFms();
      } else if (key === 'j') {
        // Toggle Subspace Jump Targeting Mode
        if (ship && ship.faction === 'FRIENDLY') {
          setJumpModeActive((prev) => !prev);
          setMoveModeActive(false);
        }
      } else if (key === 'h') {
        engine.fireEnemySalvo();
      } else if (key === 'g') {
        engine.toggleJumpGate();
      } else if (key === 'escape') {
        if (isResearchModalOpen) {
          handleCloseResearchModal();
        } else if (buildStructureType) {
          setBuildStructureType(null);
        } else if (jumpModeActive) {
          setJumpModeActive(false);
        } else if (moveModeActive) {
          setMoveModeActive(false);
        } else {
          setIsSettingsOpen(true);
        }
      } else if (key === ',') {
        setIsSettingsOpen(true);
      } else if (key >= '1' && key <= '9') {
        const slot = parseInt(key, 10);
        if (engine.fleetGroups.has(slot)) {
          const ids = engine.selectFleetGroup(slot);
          if (ids.length > 0) {
            handleSelectShips(ids);
          }
        } else {
          const idx = slot - 1;
          const friendlyShips = (engine.ships ?? []).filter(
            (s) => s.faction === 'FRIENDLY' && s.hullState !== 'DESTROYED'
          );
          if (friendlyShips[idx]) {
            handleSelectShip(friendlyShips[idx].id);
          } else if (engine.ships[idx]) {
            handleSelectShip(engine.ships[idx].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTestBenchOpen,
    isCodeInspectorOpen,
    isSettingsOpen,
    isResearchModalOpen,
    handleSelectShip,
    handleSelectShips,
    handleToggleResearchModal,
    handleCloseResearchModal,
    jumpModeActive,
    moveModeActive,
    buildStructureType,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080c12] select-none">
      {/* 1. Interactive Tactical 2.5D Canvas Viewport */}
      <TacticalCanvas
        engine={engineRef.current}
        onSelectShip={handleSelectShip}
        selectedShipId={selectedShipId}
        selectedShipIds={selectedShipIds}
        onSelectShips={handleSelectShips}
        moveModeActive={moveModeActive}
        onMoveModeHandled={() => setMoveModeActive(false)}
        jumpModeActive={jumpModeActive}
        onJumpModeHandled={() => setJumpModeActive(false)}
        buildStructureType={buildStructureType}
        onBuildModeHandled={() => setBuildStructureType(null)}
        cameraFocusTarget={cameraFocusTarget}
        onCameraFocusHandled={() => setCameraFocusTarget(null)}
        onOpenResearchModal={handleOpenResearchModal}
      />

      {/* 2. Fixed Upper System Bar (42px Top Ribbon) */}
      <UpperSystemBar
        engine={engineRef.current}
        onOpenTestBench={() => setIsTestBenchOpen(true)}
        onOpenCodeInspector={() => setIsCodeInspectorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenResearchModal={handleOpenResearchModal}
        onResetScenario={handleResetScenario}
        onFocusCoordinates={(pos) => setCameraFocusTarget({ ...pos })}
      />

      {/* 2.5 Quick-Select Fleet Binding Ribbon (Directly below top system bar) */}
      <FleetRibbon
        engine={engineRef.current}
        selectedShipIds={selectedShipIds}
        onSelectShip={handleSelectShip}
        onSelectShips={handleSelectShips}
        onFocusCoordinates={(pos) => setCameraFocusTarget({ ...pos })}
      />

      {/* 3. Fixed Lower Command Deck (110px Bottom Ribbon) */}
      <LowerCommandDeck
        engine={engineRef.current}
        onSelectShip={handleSelectShip}
        selectedShipIds={selectedShipIds}
        moveModeActive={moveModeActive}
        onToggleMoveMode={() => {
          setMoveModeActive((prev) => !prev);
          setJumpModeActive(false);
          setBuildStructureType(null);
        }}
        jumpModeActive={jumpModeActive}
        onToggleJumpMode={() => {
          setJumpModeActive((prev) => !prev);
          setMoveModeActive(false);
          setBuildStructureType(null);
        }}
        buildStructureType={buildStructureType}
        onSelectBuildStructure={(st) => {
          setBuildStructureType(st);
          if (st) {
            setMoveModeActive(false);
            setJumpModeActive(false);
          }
        }}
        onOpenResearchModal={handleOpenResearchModal}
      />

      {/* Scenario Benchmark & Tuning Modal */}
      <TestBenchModal
        engine={engineRef.current}
        isOpen={isTestBenchOpen}
        onClose={() => setIsTestBenchOpen(false)}
        onLoadScenario={handleLoadScenario}
      />

      {/* Code & UE5 Schemas Inspector */}
      <CodeInspectorModal
        isOpen={isCodeInspectorOpen}
        onClose={() => setIsCodeInspectorOpen(false)}
      />

      {/* System Settings & Display Scaling Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Faction Research Archive & System Research Matrix Modal */}
      <ResearchErrorBoundary onClose={handleCloseResearchModal}>
        <ResearchModal
          isOpen={isResearchModalOpen}
          onClose={handleCloseResearchModal}
          engine={engineRef.current}
        />
      </ResearchErrorBoundary>

      {/* New Campaign Sector Commission Setup Modal */}
      {gameStatus === 'SETUP' && (
        <NewGameModal onStartCampaign={handleStartCampaign} />
      )}
    </div>
  );
}
