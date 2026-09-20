import { useSyncExternalStore } from 'react';

export interface EngineSettings {
  uiScale: number; // range: 0.25 to 1.00, step: 0.05, default: 1.00
  panelsVisible: {
    telemetryLog: boolean; // default: true
    shipInspector: boolean; // default: true
    commandRibbon: boolean; // default: true
    systemHeader: boolean; // default: true
  };
}

export type PanelKey = keyof EngineSettings['panelsVisible'];

const STORAGE_KEY = 'formation_wars_engine_settings_v1';

const DEFAULT_SETTINGS: EngineSettings = {
  uiScale: 1.0,
  panelsVisible: {
    telemetryLog: true,
    shipInspector: true,
    commandRibbon: true,
    systemHeader: true,
  },
};

function loadStoredSettings(): EngineSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      uiScale: typeof parsed.uiScale === 'number'
        ? Math.min(1.0, Math.max(0.25, Math.round(parsed.uiScale * 100) / 100))
        : DEFAULT_SETTINGS.uiScale,
      panelsVisible: {
        telemetryLog: parsed.panelsVisible?.telemetryLog !== undefined ? Boolean(parsed.panelsVisible.telemetryLog) : true,
        shipInspector: parsed.panelsVisible?.shipInspector !== undefined ? Boolean(parsed.panelsVisible.shipInspector) : true,
        commandRibbon: parsed.panelsVisible?.commandRibbon !== undefined ? Boolean(parsed.panelsVisible.commandRibbon) : true,
        systemHeader: parsed.panelsVisible?.systemHeader !== undefined ? Boolean(parsed.panelsVisible.systemHeader) : true,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveStoredSettings(settings: EngineSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage write errors (e.g. sandboxed iframe or private browsing)
  }
}

let currentSettings: EngineSettings = loadStoredSettings();
const listeners = new Set<() => void>();

function notify() {
  saveStoredSettings(currentSettings);
  listeners.forEach((listener) => listener());
}

export const settingsStore = {
  getSnapshot(): EngineSettings {
    return currentSettings;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setUiScale(scale: number) {
    const clamped = Math.min(1.0, Math.max(0.25, Math.round(scale * 100) / 100));
    if (Math.abs(currentSettings.uiScale - clamped) > 0.001) {
      currentSettings = {
        ...currentSettings,
        uiScale: clamped,
      };
      notify();
    }
  },

  setPanelVisibility(panel: PanelKey, visible: boolean) {
    if (currentSettings.panelsVisible[panel] !== visible) {
      currentSettings = {
        ...currentSettings,
        panelsVisible: {
          ...currentSettings.panelsVisible,
          [panel]: visible,
        },
      };
      notify();
    }
  },

  togglePanelVisibility(panel: PanelKey) {
    currentSettings = {
      ...currentSettings,
      panelsVisible: {
        ...currentSettings.panelsVisible,
        [panel]: !currentSettings.panelsVisible[panel],
      },
    };
    notify();
  },

  resetSettings() {
    currentSettings = {
      uiScale: 1.0,
      panelsVisible: {
        telemetryLog: true,
        shipInspector: true,
        commandRibbon: true,
        systemHeader: true,
      },
    };
    notify();
  },
};

export function useSettingsStore() {
  const settings = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    () => DEFAULT_SETTINGS
  );

  return {
    settings,
    setUiScale: settingsStore.setUiScale,
    setPanelVisibility: settingsStore.setPanelVisibility,
    togglePanelVisibility: settingsStore.togglePanelVisibility,
    resetSettings: settingsStore.resetSettings,
  };
}
