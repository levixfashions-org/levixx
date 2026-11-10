import { create } from 'zustand';
import { apiClient, DEFAULT_STORE_SETTINGS, StoreSettings } from '../services/api';

interface SettingsState {
  settings: StoreSettings;
  loaded: boolean;
  fetchSettings: () => Promise<void>;
  setSettings: (s: StoreSettings) => void;
}

const CACHE_KEY = 'levix_settings_cache';

function cached(): StoreSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_STORE_SETTINGS;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: cached(),
  loaded: false,
  fetchSettings: async () => {
    try {
      const res = await apiClient.get<{ settings: StoreSettings }>('/store/settings');
      if (res.data?.settings) {
        set({ settings: { ...DEFAULT_STORE_SETTINGS, ...res.data.settings }, loaded: true });
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(res.data.settings));
        } catch {
          /* ignore */
        }
      }
    } catch {
      set({ loaded: true });
    }
  },
  setSettings: (s) => {
    set({ settings: s });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }
}));
