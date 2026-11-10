import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authService } from '../services/authService';
import { apiClient } from '../services/api';
import { UserProfile } from '../types';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
  refreshProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }
    try {
      const res = await apiClient.get<{ user: UserProfile }>('/auth/profile');
      setProfile(res.data?.user ?? null);
    } catch (err) {
      console.warn('Could not load profile:', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    // Finish a Google redirect sign-in if one is in progress.
    authService.completeRedirectSignIn();

    let lastUid: string | null = null;
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.uid !== lastUid) {
          lastUid = currentUser.uid;
          await fetchProfile();
          // Merge any guest bag + saved items into the account.
          useCartStore.getState().fetchCart();
          useWishlistStore.getState().sync();
        }
      } else {
        if (lastUid) useCartStore.getState().fetchCart();
        lastUid = null;
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchProfile]);

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        // The server decides who is admin (verified owner email). This only controls what the UI shows.
        isAdmin: profile?.role === 'ADMIN',
        logout,
        refreshProfile: fetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
