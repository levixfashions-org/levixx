import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import { env } from './env.js';

let firebaseApp: App | null = null;
let hasServiceAccount = false;

/**
 * Initialises Firebase Admin.
 * Verifying ID tokens only needs the Firebase project id (Google's public keys are
 * fetched automatically), so a service account is optional.
 */
export function getFirebaseAdmin(): App {
  if (firebaseApp) return firebaseApp;
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  // Easiest option on Hostinger: paste the whole downloaded service-account JSON into one variable.
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      if (serviceAccount.private_key) serviceAccount.private_key = String(serviceAccount.private_key).replace(/\\n/g, '\n');
      firebaseApp = initializeApp({ credential: cert(serviceAccount) });
      hasServiceAccount = true;
      console.log('✓ Firebase Admin initialised with service account (JSON variable).');
      return firebaseApp;
    } catch (err: any) {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON could not be read:', err?.message);
    }
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    hasServiceAccount = true;
    console.log('✓ Firebase Admin initialised with service account file.');
    return firebaseApp;
  }

  const privateKey = (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const keyLooksValid = privateKey.includes('-----BEGIN PRIVATE KEY-----') && privateKey.length > 1000;
  if (env.FIREBASE_PRIVATE_KEY && !keyLooksValid) {
    console.warn('⚠️ FIREBASE_PRIVATE_KEY looks like a placeholder — ignoring it and verifying tokens with the project id only.');
  }

  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && keyLooksValid) {
    firebaseApp = initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
    hasServiceAccount = true;
    console.log('✓ Firebase Admin initialised with service account credentials.');
    return firebaseApp;
  }

  if (!env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is not configured — cannot verify sign-in tokens.');
  }

  firebaseApp = initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  console.log(`✓ Firebase Admin initialised for token verification (project: ${env.FIREBASE_PROJECT_ID}).`);
  return firebaseApp;
}

export const adminAuth = () => getAuth(getFirebaseAdmin());

/** True when Admin can do more than verify tokens (needed to create verification / reset links). */
export function firebaseHasServiceAccount(): boolean {
  try {
    getFirebaseAdmin();
  } catch {
    return false;
  }
  return hasServiceAccount;
}
