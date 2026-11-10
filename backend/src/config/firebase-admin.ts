import admin from 'firebase-admin';
import fs from 'fs';
import { env } from './env.js';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialises Firebase Admin.
 * Verifying ID tokens only needs the Firebase project id (Google's public keys are
 * fetched automatically), so a service account is optional.
 */
export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) return firebaseApp;
  if (admin.apps.length > 0 && admin.apps[0]) {
    firebaseApp = admin.apps[0];
    return firebaseApp;
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
    firebaseApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('✓ Firebase Admin initialised with service account file.');
    return firebaseApp;
  }

  const privateKey = (env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const keyLooksValid = privateKey.includes('-----BEGIN PRIVATE KEY-----') && privateKey.length > 1000;
  if (env.FIREBASE_PRIVATE_KEY && !keyLooksValid) {
    console.warn('⚠️ FIREBASE_PRIVATE_KEY looks like a placeholder — ignoring it and verifying tokens with the project id only.');
  }

  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && keyLooksValid) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
    console.log('✓ Firebase Admin initialised with service account credentials.');
    return firebaseApp;
  }

  if (!env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID is not configured — cannot verify sign-in tokens.');
  }

  firebaseApp = admin.initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  console.log(`✓ Firebase Admin initialised for token verification (project: ${env.FIREBASE_PROJECT_ID}).`);
  return firebaseApp;
}

export const adminAuth = () => getFirebaseAdmin().auth();
