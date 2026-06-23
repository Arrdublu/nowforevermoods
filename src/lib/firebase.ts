import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function getAppInstance() {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
  }
  return app;
}

export function getAuthService(): Auth {
  if (!auth) {
    auth = getAuth(getAppInstance());
  }
  return auth;
}

export function getDb(): Firestore {
  if (!db) {
     const appInstance = getAppInstance();
     const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
     try {
       // Initialize Firestore with experimental long polling to bypass proxy/iframe WebSocket blockades
       db = initializeFirestore(appInstance, {
         experimentalAutoDetectLongPolling: true
       }, dbId);
     } catch (e) {
       console.warn("Retrying Firestore initialization with fallback...", e);
       try {
         db = getFirestore(appInstance, dbId);
       } catch (err) {
         db = getFirestore(appInstance);
       }
     }
  }
  return db;
}

export function getStorageService(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getAppInstance());
  }
  return storage;
}

// Test connection and handle offline errors as per integration guide
export async function testConnection() {
  try {
    await getDocFromServer(doc(getDb(), 'test', 'connection'));
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

// Helper for safe JSON stringification to avoid circular structure errors
function safeStringify(obj: any): string {
  const cache = new WeakSet();
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        // Avoid serializing huge objects or those with deep internal state likely to be circular
        const constructorName = value.constructor?.name;
        if (
          constructorName === 'Firestore' || 
          constructorName === 'Auth' || 
          constructorName === 'FirebaseAppImpl' ||
          constructorName === 'DocumentReference' || 
          constructorName === 'Query' ||
          constructorName === 'CollectionReference' ||
          constructorName === 'DocumentSnapshot' ||
          constructorName === 'Y' || // Minified name reported by user
          constructorName === 'Ka'   // Minified name reported by user
        ) {
          return `[Firebase ${constructorName}]`;
        }

        if (cache.has(value)) {
          return '[Circular]';
        }
        cache.add(value);

        // Handle possible DOM nodes
        if (typeof value.nodeType === 'number' && typeof value.nodeName === 'string') {
          return `[DOM Node: ${value.nodeName}]`;
        }
        
        // Handle Promises
        if (typeof value.then === 'function') {
          return '[Promise]';
        }
      }
      return value;
    });
  } catch (err) {
    // Ultimate fallback if JSON.stringify still fails
    return '{"error": "Failed to stringify object completely", "details": "Object contained non-serializable or deeply circular data"}';
  }
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null = null): never | void {
  const authUser = getAuthService().currentUser;
  
  let safeErrorMsg = "Unknown error";
  try {
    if (error instanceof Error) {
      safeErrorMsg = error.message;
    } else if (typeof error === 'string') {
      safeErrorMsg = error;
    } else if (error && typeof error === 'object') {
      const possibleMsg = error.message || error.code || error.reason;
      safeErrorMsg = typeof possibleMsg === 'string' ? possibleMsg : String(error);
    } else {
      safeErrorMsg = String(error);
    }
  } catch (e) {
    safeErrorMsg = "Critical error during error handling";
  }

  const isOffline = safeErrorMsg.includes("client is offline") || safeErrorMsg.includes("network-request-failed");

  const info: FirestoreErrorInfo = {
    error: safeErrorMsg,
    operationType: operation,
    path: path ? String(path) : null,
    authInfo: {
      userId: authUser?.uid || 'anonymous',
      email: authUser?.email || '',
      emailVerified: !!authUser?.emailVerified,
      isAnonymous: !!authUser?.isAnonymous,
      providerInfo: Array.isArray(authUser?.providerData) ? authUser.providerData.map(p => ({
        providerId: String(p.providerId || ''),
        displayName: String(p.displayName || ''),
        email: String(p.email || '')
      })) : []
    }
  };

  const serialized = safeStringify(info);
  
  if (isOffline) {
    console.warn('Firestore Offline Error:', serialized);
    return; // Don't throw to avoid crashing the app purely for offline status
  }
  
  console.error('Firestore Error Payload:', serialized);
  throw new Error(serialized);
}
