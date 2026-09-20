import React, { useState } from 'react';
import { SimulationEngine } from '../simulation/engine';
import { RockyPlanet, GasGiant, Vec2D } from '../types';
import { validateColonization } from '../simulation/colonizationManager';
import {
  Globe,
  Orbit,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  X,
  Crosshair,
  TrendingUp,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';

interface PlanetaryCardProps {
  planet: RockyPlanet | GasGiant;
  engine: SimulationEngine;
  onClose: () => void;
  onOpenResearchModal?: () => void;
  onFocusPlanet?: (pos: Vec2D) => void;
}

export const PlanetaryCard: React.FC<PlanetaryCardProps> = ({
  planet,
  engine,
  onClose,
  onOpenResearchModal,
  onFocusPlanet,
}) => {
  const [, setRefreshTick] = useState(0);

  // Validate colonization status against current completed tech nodes
  const validation = validateColonization(planet, engine.researchManager.completedNodes);
  const isGasGiant = !('habitable' in planet);
  const rocky = !isGasGiant ? (planet as RockyPlanet) : null;
  const pClass = validation.planetClass;

  const handleColonize = () => {
    const res = engine.colonizePlanet(planet.id);
    if (res.success) {
      setRefreshTick((t) => t + 1);
    }
  };

  // Biome Badge Styling
  const getBadgeStyle = () => {
    switch (pClass) {
      case 'TERRAN':
        return 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300';
      case 'ICE':
        return 'bg-cyan-950/90 border-cyan-500/80 text-cyan-300';
      case 'VOLCANIC':
        return 'bg-amber-950/90 border-amber-500/80 text-amber-300';
      case 'DESERT':
        return 'bg-orange-950/90 border-orange-500/80 text-orange-300';
      case 'BARREN':
        return 'bg-slate-900/90 border-slate-600/80 text-slate-300';
      case 'GAS_GIANT':
      default:
        return 'bg-purple-950/90 border-purple-500/80 text-purple-300';
    }
  };

  return (
    <div
      id={`planetary-survey-card-${planet.id}`}
      className="absolute top-14 right-3 z-40 w-80 md:w-96 bg-[#070d18]/95 border border-cyan-500/40 rounded-lg p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl text-slate-200 font-mono text-xs select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
    >
      {/* 1. Header with Planet Name, Classification, Focus, and Close */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded border ${
              pClass === 'TERRAN'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                : 'bg-cyan-950/80 border-cyan-500/60 text-cyan-400'
            }`}
          >
            {isGasGiant ? <Orbit className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 text-sm tracking-wide">
                {planet.name.toUpperCase()}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${getBadgeStyle()}`}
              >
                {pClass}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              CELESTIAL SURVEY // ORBITAL SECTOR
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onFocusPlanet && (
            <button
              type="button"
              id="btn-focus-planet"
              onClick={() => onFocusPlanet(planet.pos)}
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition cursor-pointer"
              title="Center Camera on Celestial Body"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            id="btn-close-planet-card"
            onClick={onClose}
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition cursor-pointer"
            title="Deselect Celestial Body [ESC]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Celestial Telemetry Spec Grid */}
      <div className="grid grid-cols-2 gap-2 p-2 rounded bg-slate-950/80 border border-slate-800/80 mb-2.5 text-[10px]">
        <div>
          <span className="text-slate-500">ORBITAL DISTANCE:</span>
          <div className="text-slate-200 font-bold">
            {Math.round(planet.orbitalRadius).toLocaleString()} km
          </div>
        </div>
        <div>
          <span className="text-slate-500">SURFACE GRAVITY:</span>
          <div className="text-slate-200 font-bold">
            {(planet as any).gravityRating ?? 1.0} G
          </div>
        </div>
        <div>
          <span className="text-slate-500">VISIBLE RADIUS:</span>
          <div className="text-slate-200 font-bold">
            {Math.round(planet.radius)} km
          </div>
        </div>
        <div>
          <span className="text-slate-500">NATURAL SATELLITES:</span>
          <div className="text-slate-200 font-bold">
            {rocky?.moons && rocky.moons.length > 0
              ? `${rocky.moons.length} Lunar Body (${rocky.moons.map((m) => m.name).join(', ')})`
              : '0 Moons'}
          </div>
        </div>
      </div>

      {/* 3. COLONIZATION & EXTRACTION DIRECTIVE */}
      <div className="space-y-2">
        {/* CASE A: PRIMARY HABITABLE (SOVEREIGN METROPOLIS) */}
        {rocky?.isPrimaryHabitable && (
          <div className="p-2.5 rounded bg-cyan-950/40 border border-cyan-500/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>SOVEREIGN CAPITAL METROPOLIS</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-400/60 text-cyan-200 text-[9px] font-bold">
                HQ ANCHOR
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              {validation.tooltip}
            </p>
            <div className="text-[9px] text-cyan-400/90 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Capital defense grid active • Primary Fleet Logistics Slipway</span>
            </div>
          </div>
        )}

        {/* CASE B: ALREADY COLONIZED SECONDARY TERRAN WORLD */}
        {!rocky?.isPrimaryHabitable && rocky?.colonized && (
          <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ALLIED TERRAN COLONY</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-400/60 text-emerald-200 text-[9px] font-bold animate-pulse">
                EXTRACTING
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              {validation.tooltip}
            </p>
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-950/60 border border-emerald-600/40 text-[10px]">
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>REVENUE STREAM:</span>
              </span>
              <span className="text-emerald-100 font-bold">
                +25.0 METALLIC/S • +25.0 ORGANIC/S
              </span>
            </div>
          </div>
        )}

        {/* CASE C: TERRAN WORLD READY TO COLONIZE */}
        {!rocky?.colonized && validation.canColonize && (
          <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-500/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                <Globe className="w-3.5 h-3.5" />
                <span>COLONIZATION AUTHORIZED</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-400/60 text-emerald-200 text-[9px] font-bold">
                TERRAN WORLD
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed">
              {validation.tooltip}
            </p>
            <div className="flex items-center justify-between text-[10px] text-emerald-400/90 py-0.5">
              <span>ESTIMATED HARVEST YIELD:</span>
              <span className="font-bold text-emerald-200">+25 MET / +25 ORG PER SEC</span>
            </div>

            <button
              type="button"
              id="btn-establish-planetary-governance"
              onClick={handleColonize}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold rounded border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition cursor-pointer flex items-center justify-center gap-1.5 text-xs tracking-wide"
            >
              <Globe className="w-4 h-4" />
              <span>ESTABLISH PLANETARY GOVERNANCE</span>
            </button>
          </div>
        )}

        {/* CASE D: UNINHABITABLE ENVIRONMENT OR MISSING RESEARCH */}
        {!validation.canColonize && !rocky?.colonized && (
          <div className="p-2.5 rounded bg-rose-950/25 border border-rose-500/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>COLONIZATION RESTRICTED</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-rose-950 border border-rose-500/60 text-rose-300 text-[9px] font-bold">
                BLOCKED
              </span>
            </div>

            {/* Strict standard requirement tooltip */}
            <div
              id="planetary-uninhabitable-tooltip"
              className="p-2 rounded bg-slate-950/90 border border-rose-600/40 text-rose-200 text-[10px] leading-relaxed font-bold"
            >
              {validation.tooltip}
            </div>

            {pClass === 'TERRAN' && onOpenResearchModal && (
              <button
                type="button"
                id="btn-research-terran-standards"
                onClick={onOpenResearchModal}
                className="w-full py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-300 rounded font-bold text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>OPEN RESEARCH MATRIX [TERRAN HABITATION STANDARDS]</span>
              </button>
            )}

            {pClass !== 'TERRAN' && (
              <div className="text-[9px] text-slate-400 italic">
                Notice: Planetary environmental adaptation protocols will be fully unlocked in the upcoming planetary colonization overhaul.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Footer Help Tip */}
      <div className="mt-2.5 pt-2 border-t border-slate-800 text-[9px] text-slate-500 flex items-center justify-between">
        <span>[L-CLICK] Center Camera  •  [ESC] Close</span>
        <span className="text-slate-400">EXPANSION MATRIX</span>
      </div>
    </div>
  );
};
