/**
 * Nixcord Settings Store
 * Persistent key-value store with plugin namespacing.
 * Uses localStorage on web, electron-store bridge on desktop.
 */

type SettingValue = string | number | boolean | null | SettingValue[] | { [k: string]: SettingValue };

interface NixcordSettings {
  plugins: Record<string, Record<string, SettingValue>>;
  themes: {
    enabled: string[];
    customCSS: string;
  };
  general: {
    devMode: boolean;
    updateBranch: string;
    autoUpdate: boolean;
    lastUpdateCheck: number;
  };
}

const STORAGE_KEY = "nixcord_settings";

const defaults: NixcordSettings = {
  plugins: {},
  themes: {
    enabled: [],
    customCSS: ""
  },
  general: {
    devMode: false,
    updateBranch: "main",
    autoUpdate: true,
    lastUpdateCheck: 0
  }
};

class SettingsStore {
  private data: NixcordSettings;
  private listeners: Map<string, Set<(val: unknown) => void>> = new Map();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): NixcordSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaults);
      return this.deepMerge(structuredClone(defaults), JSON.parse(raw));
    } catch {
      return structuredClone(defaults);
    }
  }

  private deepMerge<T extends object>(target: T, source: Partial<T>): T {
    for (const key in source) {
      const sv = source[key];
      const tv = target[key];
      if (sv && typeof sv === "object" && !Array.isArray(sv) && tv && typeof tv === "object") {
        this.deepMerge(tv as object, sv as object);
      } else if (sv !== undefined) {
        (target as Record<string, unknown>)[key] = sv;
      }
    }
    return target;
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (err) {
        console.error("[Nixcord] Failed to persist settings:", err);
      }
    }, 300);
  }

  get<K extends keyof NixcordSettings>(key: K): NixcordSettings[K] {
    return this.data[key];
  }

  set<K extends keyof NixcordSettings>(key: K, value: NixcordSettings[K]) {
    this.data[key] = value;
    this.emit(key as string, value);
    this.scheduleSave();
  }

  getPlugin(pluginId: string): Record<string, SettingValue> {
    if (!this.data.plugins[pluginId]) this.data.plugins[pluginId] = {};
    return this.data.plugins[pluginId];
  }

  setPlugin(pluginId: string, key: string, value: SettingValue) {
    if (!this.data.plugins[pluginId]) this.data.plugins[pluginId] = {};
    this.data.plugins[pluginId][key] = value;
    this.emit(`plugin:${pluginId}:${key}`, value);
    this.scheduleSave();
  }

  getPluginSetting<T extends SettingValue>(pluginId: string, key: string, fallback: T): T {
    const val = this.data.plugins[pluginId]?.[key];
    return val !== undefined ? (val as T) : fallback;
  }

  on(key: string, handler: (val: unknown) => void): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(handler);
    return () => this.listeners.get(key)?.delete(handler);
  }

  private emit(key: string, val: unknown) {
    this.listeners.get(key)?.forEach(h => {
      try { h(val); } catch { /* ignore listener errors */ }
    });
  }

  reset() {
    this.data = structuredClone(defaults);
    localStorage.removeItem(STORAGE_KEY);
  }

  export(): string {
    return JSON.stringify(this.data, null, 2);
  }

  import(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      this.data = this.deepMerge(structuredClone(defaults), parsed);
      this.scheduleSave();
    } catch (err) {
      throw new Error(`Invalid settings JSON: ${err}`);
    }
  }
}

export const Settings = new SettingsStore();
export type { NixcordSettings, SettingValue };
