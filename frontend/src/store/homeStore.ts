import { create } from 'zustand';
import { apiClient } from '../services/api';
import { HomeData } from '../types';
import { useSettingsStore } from './settingsStore';

interface HomeState {
  data: HomeData | null;
  loading: boolean;
  error: string | null;
  fetchHome: (force?: boolean) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const useHomeStore = create<HomeState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  fetchHome: async (force = false) => {
    if (inflight) return inflight;
    if (get().data && !force) return;
    set({ loading: true, error: null });
    inflight = apiClient
      .get('/store/home')
      .then((res) => {
        const { settings, ...rest } = res.data || {};
        if (settings) useSettingsStore.getState().setSettings({ ...useSettingsStore.getState().settings, ...settings });
        set({ data: rest as HomeData, loading: false });
      })
      .catch((err) => set({ loading: false, error: err.message || 'Could not load the store' }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }
}));
