import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, Auth } from 'firebase/auth';

// On the live site, sign-in runs through our own domain (the server proxies /__/auth/* to Firebase),
// so Google shows "continue to thelevix.shop". Everywhere else (localhost etc.) the default Firebase domain is used.
const SITE_AUTH_DOMAINS = ['thelevix.shop', 'www.thelevix.shop'];
const authDomain =
  typeof window !== 'undefined' && SITE_AUTH_DOMAINS.includes(window.location.hostname)
    ? window.location.hostname
    : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('LEVIX: Firebase web config (VITE_FIREBASE_*) is missing — sign-in will not work.');
}

export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => undefined);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
