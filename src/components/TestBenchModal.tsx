import React from 'react';
import { SimulationEngine } from '../simulation/engine';
import { SCENARIOS, ScenarioDefinition } from '../simulation/scenarios';
import { X, Check, Activity, Sliders, ShieldCheck, Target, RefreshCw } from 'lucide-react';

interface TestBenchModalProps {
  engine: SimulationEngine;
  isOpen: boolean;
  onClose: () => void;
  onLoadScenario: (scenario: ScenarioDefinition) => void;
}

export const TestBenchModal: React.FC<TestBenchModalProps> = ({
  engine,
  isOpen,
  onClose,
  onLoadScenario,
}) => {
  if (!isOpen) return null;

  const totalThreatsHandled =
    engine.benchmark.totalInterceptions +
    engine.benchmark.totalPdplaHits +
    engine.benchmark.totalJammingDeflects +
    engine.benchmark.totalMissileHits;

  const interceptionRate =
    totalThreatsHandled > 0
      ? (
          ((engine.benchmark.totalInterceptions +
            engine.benchmark.totalPdplaHits +
            engine.benchmark.totalJammingDeflects) /
            totalThreatsHandled) *
          100
        ).toFixed(1)
      : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-mono select-none">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-950 border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Tactical Test Bench & Parameter Tuning
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 1. SCENARIO SELECTOR */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Combat Verification Scenarios
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCENARIOS.map((scenario) => (
                <div
                  key={scenario.id}
                  className="p-3 bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-lg flex flex-col justify-between space-y-2 transition"
                >
                  <div>
                    <h4 className="font-bold text-cyan-300 text-sm">{scenario.name}</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed mt-1">{scenario.description}</p>
                  </div>
                  <button
                    onClick={() => {
                      onLoadScenario(scenario);
                      onClose();
                    }}
                    className="self-start px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/60 rounded text-cyan-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Load Scenario
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. LIVE DEFENSE BENCHMARK METRICS */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              5-Layer Combat Effectiveness Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">DEFENSE RATIO</div>
                <div className="text-emerald-400 text-lg font-bold mt-0.5">{interceptionRate}%</div>
                <div className="text-slate-500 text-[10px]">Threats Negated</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">E-WAR JAMMED</div>
                <div className="text-indigo-400 text-lg font-bold mt-0.5">
                  {engine.benchmark.totalJammingDeflects}
                </div>
                <div className="text-slate-500 text-[10px]">Layer 1 Soft-Kill</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">CM INTERCEPTS</div>
                <div className="text-teal-400 text-lg font-bold mt-0.5">
                  {engine.benchmark.totalInterceptions}
                </div>
                <div className="text-slate-500 text-[10px]">Layer 2 Hard-Kill</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">PDPLA LASER KILLS</div>
                <div className="text-cyan-400 text-lg font-bold mt-0.5">
                  {engine.benchmark.totalPdplaHits}
                </div>
                <div className="text-slate-500 text-[10px]">Layer 3 Phased Array</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">DIRECT IMPACTS</div>
                <div className="text-rose-400 text-lg font-bold mt-0.5">
                  {engine.benchmark.totalMissileHits}
                </div>
                <div className="text-slate-500 text-[10px]">Shield / Hull Absorbed</div>
              </div>
            </div>
          </div>

          {/* 3. SIMULATION BALANCE SLIDERS */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Defense Ladder Tuning & Parameters
            </h3>
            <div className="space-y-4 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
              {/* Counter-Missile Accuracy */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Counter-Missile Intercept Accuracy (Default 80%):</span>
                  <span className="text-teal-400 font-bold">
                    {(((engine.config.counterMissileAccuracy ?? 0.80) * 100)).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.30"
                  max="1.0"
                  step="0.05"
                  value={engine.config.counterMissileAccuracy ?? 0.80}
                  onChange={(e) => {
                    engine.config.counterMissileAccuracy = parseFloat(e.target.value);
                  }}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Point-Defense Phased Array Laser (PDPLA) Accuracy */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Point-Defense Beam Accuracy (Default 90%):</span>
                  <span className="text-sky-400 font-bold">
                    {(((engine.config.pdplaAccuracy ?? 0.90) * 100)).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.40"
                  max="1.0"
                  step="0.05"
                  value={engine.config.pdplaAccuracy ?? 0.90}
                  onChange={(e) => {
                    engine.config.pdplaAccuracy = parseFloat(e.target.value);
                  }}
                  className="w-full accent-sky-400"
                />
              </div>

              {/* Counter-Missile Speed */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Counter-Missile Speed (Half-speed: 245 km/s):</span>
                  <span className="text-teal-300 font-bold">
                    {Math.round(engine.config.counterMissileSpeed ?? 245)} km/s
                  </span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="490"
                  step="25"
                  value={engine.config.counterMissileSpeed ?? 245}
                  onChange={(e) => {
                    engine.config.counterMissileSpeed = parseFloat(e.target.value);
                  }}
                  className="w-full accent-teal-300"
                />
              </div>

              {/* Counter-Missile Salvo Reload Interval */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Counter-Missile Salvo Reload Cooldown (Default 2.0s):</span>
                  <span className="text-teal-400 font-bold">
                    {(engine.config.counterMissileReload ?? 2.0).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={engine.config.counterMissileReload ?? 2.0}
                  onChange={(e) => {
                    engine.config.counterMissileReload = parseFloat(e.target.value);
                  }}
                  className="w-full accent-teal-400"
                />
              </div>

              {/* Point-Defense Laser Salvo Overload Threshold */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">PD Laser Max Bursts Before Overheat:</span>
                  <span className="text-sky-400 font-bold">
                    {engine.config.pdplaMaxBursts ?? 5} Bursts
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={engine.config.pdplaMaxBursts ?? 5}
                  onChange={(e) => {
                    engine.config.pdplaMaxBursts = parseInt(e.target.value, 10);
                  }}
                  className="w-full accent-sky-400"
                />
              </div>

              {/* Point-Defense Overheat Lockout Duration */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">PD Overheat Lockout Duration:</span>
                  <span className="text-rose-400 font-bold">
                    {(engine.config.pdplaOverheatDuration ?? 3.0).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={engine.config.pdplaOverheatDuration ?? 3.0}
                  onChange={(e) => {
                    engine.config.pdplaOverheatDuration = parseFloat(e.target.value);
                  }}
                  className="w-full accent-rose-400"
                />
              </div>

              {/* Shield Cooling Rate */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-300">Thermal Deflector Radiator Cooling Rate:</span>
                  <span className="text-amber-400 font-bold">{engine.config.shieldCoolRate}% / s</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="30"
                  step="1"
                  value={engine.config.shieldCoolRate}
                  onChange={(e) => {
                    engine.config.shieldCoolRate = parseFloat(e.target.value);
                  }}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={engine.config.hostileAutoFire}
                    onChange={(e) => {
                      engine.config.hostileAutoFire = e.target.checked;
                    }}
                    className="accent-cyan-400 rounded"
                  />
                  <span className="text-slate-300">Autonomous Hostile Counter-Battery Fire</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={engine.config.showRangeRings}
                    onChange={(e) => {
                      engine.config.showRangeRings = e.target.checked;
                    }}
                    className="accent-cyan-400 rounded"
                  />
                  <span className="text-slate-300">Render Weapon & Sensor Range Rings</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Apply & Return to Sim
          </button>
        </div>
      </div>
    </div>
  );
};
