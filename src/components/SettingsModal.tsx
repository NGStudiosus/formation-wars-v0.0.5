import React from 'react';
import {
  X,
  Sliders,
  Monitor,
  Eye,
  EyeOff,
  Volume2,
  Crosshair,
  Keyboard,
  RotateCcw,
  Check,
  Layers,
  Factory,
  Compass,
  Zap,
} from 'lucide-react';
import { useSettingsStore, PanelKey } from '../state/settingsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setUiScale, setPanelVisibility, togglePanelVisibility, resetSettings } =
    useSettingsStore();

  if (!isOpen) return null;

  const panelsConfig: Array<{
    key: PanelKey;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'systemHeader',
      label: 'System Header & Silos',
      sublabel: 'Top status bar, benchmark tick telemetry & strategic raw ore/metallic silos',
      icon: <Factory className="w-4 h-4 text-cyan-400" />,
    },
    {
      key: 'shipInspector',
      label: 'Ship Inspector & Stance Matrix',
      sublabel: 'Tactical ship selector, combat stance controller, defense telemetry & sub-systems',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
    },
    {
      key: 'telemetryLog',
      label: 'Combat Telemetry Log',
      sublabel: '5-layer defense ladder stream, missile burns, PDPLA locks & damage tracking',
      icon: <Layers className="w-4 h-4 text-teal-400" />,
    },
    {
      key: 'commandRibbon',
      label: 'Command Ribbon',
      sublabel: 'Docked bottom bar with stance keybinds, manual salvo, micro-jump & FMS controls',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
    },
  ];

  const scalePresets = [1.0, 0.85, 0.75, 0.5, 0.25];

  return (
    <div
      id="modal-settings-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none font-mono"
      onClick={onClose}
    >
      <div
        id="modal-settings-container"
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 tracking-wide uppercase">
                System Configuration & Interface Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Global UI scale (0.25x – 1.0x), modular HUD viewport layout & tactical presets
              </p>
            </div>
          </div>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body with Modular Semantic Sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: DISPLAY & INTERFACE */}
          <section id="settings-display" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Display & Interface Scaling
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 font-semibold">
                DOM OVERLAY TRANSFORM
              </span>
            </div>

            {/* UI Scale Slider Card */}
            <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-200">Global UI Scale</span>
                  <p className="text-xs text-slate-500">
                    Scales all operator panels, badges, and fonts proportionally (0.25x to 1.0x).
                  </p>
                </div>
                <div className="flex items-baseline gap-1 bg-slate-900 px-3 py-1 rounded border border-cyan-500/40">
                  <span className="text-lg font-bold font-mono text-cyan-300">
                    {Math.round(settings.uiScale * 100)}
                  </span>
                  <span className="text-xs text-cyan-400/80">%</span>
                </div>
              </div>

              {/* Slider Input */}
              <div className="space-y-2 pt-1">
                <input
                  id="input-ui-scale-slider"
                  type="range"
                  min="0.25"
                  max="1.00"
                  step="0.05"
                  value={settings.uiScale}
                  onChange={(e) => setUiScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.25x (Compact)</span>
                  <span>0.50x</span>
                  <span>0.75x</span>
                  <span>1.00x (Native Full)</span>
                </div>
              </div>

              {/* Preset Quick Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-semibold">Scale Presets:</span>
                {scalePresets.map((scale) => {
                  const isActive = Math.abs(settings.uiScale - scale) < 0.02;
                  return (
                    <button
                      key={scale}
                      id={`btn-scale-preset-${Math.round(scale * 100)}`}
                      onClick={() => setUiScale(scale)}
                      className={`px-2.5 py-1 text-xs rounded border transition cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      {Math.round(scale * 100)}%
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] text-slate-500 italic bg-slate-900/60 p-2 rounded border border-slate-800/60">
                Notice: HTML5 interactive tactical canvas stays strictly at native 1:1 hardware pixel resolution to guarantee zero blur and sub-pixel pointer raycasting.
              </div>
            </div>

            {/* Modular Panel Visibility Toggles */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Active HUD Panel Visibility
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {panelsConfig.map((p) => {
                  const isVisible = settings.panelsVisible[p.key];
                  return (
                    <div
                      key={p.key}
                      id={`panel-toggle-card-${p.key}`}
                      onClick={() => togglePanelVisibility(p.key)}
                      className={`flex items-start justify-between p-3 rounded-lg border transition cursor-pointer select-none ${
                        isVisible
                          ? 'bg-slate-950/80 border-cyan-800/50 hover:border-cyan-600/70'
                          : 'bg-slate-950/30 border-slate-800/60 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <div className="mt-0.5">{p.icon}</div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-200">{p.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {p.sublabel}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        id={`btn-toggle-switch-${p.key}`}
                        aria-pressed={isVisible}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePanelVisibility(p.key);
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isVisible ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            isVisible ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 2: GAMEPLAY & TACTICAL SENSORS */}
          <section id="settings-gameplay" className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Tactical Sensor & Simulation Rules
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">STANDARDS (REV 1.4)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300">Fog of War Sensor Bubble:</span>
                <p className="text-slate-400 text-[11px]">
                  Visual sensors active out to 3x missile range (~3,150 km). Beyond that, hostile hulls are masked as mass obscurations.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300">Autonomous Defense Grid:</span>
                <p className="text-slate-400 text-[11px]">
                  Point Defense Pulsed Laser (PDPLA) thermal lockout occurs after 5 bursts with a 3.0s convective cooling cycle.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: AUDIO & ACOUSTICS */}
          <section id="settings-audio" className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Acoustic Feedback & Alert Chimes
                </h3>
              </div>
              <span className="text-[11px] text-amber-400/80 font-mono">ACTIVE SYNTH</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">Synthesizer Auditory Chimes</span>
                <p className="text-[11px] text-slate-400">
                  Procedural audio pings for missile launches, PDPLA pulses, shield breaks, and hull buckles.
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-400 font-bold">
                ENABLED
              </span>
            </div>
          </section>

          {/* SECTION 4: CONTROLS & HOTKEY MATRIX */}
          <section id="settings-controls" className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Keyboard Hotkey Reference
                </h3>
              </div>
              <span className="text-[11px] text-indigo-300 font-mono">OPERATOR COMMANDS</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              {[
                { key: 'P', label: 'Passive Stance' },
                { key: 'D', label: 'Defensive Stance' },
                { key: 'A', label: 'Aggressive Stance' },
                { key: 'K', label: 'Kill/Disable Toggle' },
                { key: 'F', label: 'Fire Manual Salvo' },
                { key: 'J', label: 'Micro-Jump 320km' },
                { key: 'H', label: 'Test Hostile Salvo' },
                { key: 'M', label: 'Toggle FMS Blip' },
                { key: 'G', label: 'Toggle Jump Gate' },
                { key: '1-4', label: 'Quick Select Ships' },
                { key: 'R-Click', label: 'Order Spline Move' },
                { key: 'Wheel', label: 'Macro Zoom (0.025-3.5)' },
              ].map((h) => (
                <div
                  key={h.key}
                  className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-800"
                >
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300 font-bold text-[10px]">
                    {h.key}
                  </kbd>
                  <span className="text-[10px] text-slate-300">{h.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-t border-slate-800">
          <button
            id="btn-reset-settings"
            onClick={resetSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Settings</span>
          </button>

          <button
            id="btn-confirm-settings"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded shadow-[0_0_12px_rgba(6,182,212,0.4)] transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
