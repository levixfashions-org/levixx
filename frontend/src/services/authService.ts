import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

const FRIENDLY_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email. Please register first.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use': 'An account already exists with this email. Try signing in instead.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/unauthorized-domain': 'This website domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled yet in Firebase Authentication.',
  'auth/account-exists-with-different-credential': 'This email is registered with a different sign-in method. Try email & password.',
  'auth/missing-email': 'Please enter your email address.'
};

export function friendlyAuthError(err: any): string {
  const code = err?.code as string | undefined;
  if (code && FRIENDLY_ERRORS[code]) return FRIENDLY_ERRORS[code];
  return err?.message?.replace('Firebase: ', '') || 'Something went wrong. Please try again.';
}

export const authService = {
  async register(email: string, password: string, displayName: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    sendEmailVerification(cred.user).catch(() => undefined);
    // Force a fresh token so the backend sees the new display name.
    await cred.user.getIdToken(true);
    return cred.user;
  },

  async login(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  },

  /** Google sign-in: popup on desktop, falls back to full-page redirect when popups are blocked. */
  async loginWithGoogle(): Promise<User | null> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw err;
    }
  },

  async completeRedirectSignIn(): Promise<User | null> {
    try {
      const result = await getRedirectResult(auth);
      return result?.user ?? null;
    } catch {
      return null;
    }
  },

  async resendVerification(): Promise<void> {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  },

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/login` });
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async getToken(forceRefresh = false): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken(forceRefresh);
    } catch {
      return null;
    }
  }
};
