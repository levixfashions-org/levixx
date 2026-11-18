import { create } from 'zustand';
import { apiClient } from '../services/api';
import { Cart } from '../types';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  isCartOpen: boolean;
  isSearchOpen: boolean;
  isMobileNavOpen: boolean;
  isSizeGuideOpen: boolean;
  
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  openSearch: () => void;
  closeSearch: () => void;

  openMobileNav: () => void;
  closeMobileNav: () => void;

  sizeGuideKind: 'standard' | 'waffle';
  openSizeGuide: (kind?: 'standard' | 'waffle') => void;
  closeSizeGuide: () => void;

  fetchCart: () => Promise<void>;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  loading: false,
  isCartOpen: false,
  isSearchOpen: false,
  isMobileNavOpen: false,
  isSizeGuideOpen: false,
  sizeGuideKind: 'standard',

  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),

  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),

  openSizeGuide: (kind = 'standard') => set({ isSizeGuideOpen: true, sizeGuideKind: kind }),
  closeSizeGuide: () => set({ isSizeGuideOpen: false }),

  fetchCart: async () => {
    try {
      set({ loading: true });
      const res = await apiClient.get<Cart>('/cart');
      set({ cart: res.data, loading: false });
    } catch (err) {
      console.warn('Failed to fetch cart:', err);
      set({ loading: false });
    }
  },

  addToCart: async (variantId: string, quantity = 1) => {
    try {
      set({ loading: true });
      const res = await apiClient.post<Cart>('/cart/items', { variantId, quantity });
      set({ cart: res.data, loading: false, isCartOpen: true });
    } catch (err: any) {
      set({ loading: false });
      throw err;
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    try {
      set({ loading: true });
      const res = await apiClient.put<Cart>(`/cart/items/${itemId}`, { quantity });
      set({ cart: res.data, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  removeItem: async (itemId: string) => {
    try {
      set({ loading: true });
      const res = await apiClient.delete<Cart>(`/cart/items/${itemId}`);
      set({ cart: res.data, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  }
}));
