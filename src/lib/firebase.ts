import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;

let app: any = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function getAppInstance() {
  if (!app) {
    const isPlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'PLACEHOLDER';
    
    if (isPlaceholder) {
      console.warn("Firebase initialization skipped: Missing or placeholder API key.");
      // Return a mock or null during build if needed, 
      // but Next.js might still trace it.
      // If we are in build phase, we might not need a real instance.
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return null; 
      }
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getAuthService(): Auth | null {
  const instance = getAppInstance();
  if (!auth && instance) {
    auth = getAuth(instance);
  }
  return auth;
}

export function getDb(): Firestore | null {
  const instance = getAppInstance();
  if (!db && instance) {
    db = getFirestore(instance, firestoreDatabaseId);
  }
  return db;
}

export function getStorageService(): FirebaseStorage | null {
  const instance = getAppInstance();
  if (!storage && instance) {
    storage = getStorage(instance);
  }
  return storage;
}

// Test connection and handle offline errors as per integration guide
export async function testConnection() {
  const database = getDb();
  if (!database) return;
  try {
    await getDocFromServer(doc(database, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network.");
    }
  }
}

// NOTE: We don't call testConnection immediately on module load anymore.
// It should be called when needed, e.g. in a useEffect, or via a setup hook.

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  const authService = getAuthService();
  const authUser = authService?.currentUser;
  const info: FirestoreErrorInfo = {
    error: error.message || 'Unknown error',
    operationType: operation,
    path: path,
    authInfo: {
      userId: authUser?.uid || 'anonymous',
      email: authUser?.email || '',
      emailVerified: authUser?.emailVerified || false,
      isAnonymous: authUser?.isAnonymous || true,
      providerInfo: authUser?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      })) || []
    }
  };
  throw new Error(JSON.stringify(info));
}
