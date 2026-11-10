import { create } from 'zustand';
import { apiClient } from '../services/api';
import { auth } from '../config/firebase';

const KEY = 'levix_wishlist';

function readLocal(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
function writeLocal(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

interface WishlistState {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => Promise<void>;
  sync: () => Promise<void>;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: readLocal(),
  has: (id) => get().ids.includes(id),
  toggle: async (id) => {
    const before = get().ids;
    const next = before.includes(id) ? before.filter((x) => x !== id) : [id, ...before];
    set({ ids: next });
    writeLocal(next);
    if (auth.currentUser) {
      try {
        const res = await apiClient.post(`/wishlist/${id}`);
        set({ ids: res.data.productIds });
        writeLocal(res.data.productIds);
      } catch {
        set({ ids: before });
        writeLocal(before);
      }
    }
  },
  /** After sign-in: merge saved items from this browser into the account. */
  sync: async () => {
    if (!auth.currentUser) return;
    try {
      const res = await apiClient.post('/wishlist/merge', { productIds: readLocal() });
      set({ ids: res.data.productIds });
      writeLocal(res.data.productIds);
    } catch {
      /* ignore */
    }
  },
  reset: () => {
    set({ ids: [] });
    writeLocal([]);
  }
}));
