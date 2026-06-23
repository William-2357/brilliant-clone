import type { Backend } from './storage';
import { createLocalBackend } from './localBackend';
import { createFirebaseBackend, type FirebaseConfig } from './firebaseBackend';

/**
 * Active persistence/auth backend, selected at startup:
 *
 * - If Firebase env vars are present (`VITE_FIREBASE_*`), use the Firestore +
 *   Firebase Auth backend — real accounts and cross-device progress sync.
 * - Otherwise fall back to the localStorage backend so the app still runs with
 *   zero setup (single device, demo-grade auth).
 *
 * Both implement the same `Backend` interface, so nothing else changes.
 */
function readFirebaseConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (apiKey && authDomain && projectId && appId) {
    return { apiKey, authDomain, projectId, appId };
  }
  return null;
}

function selectBackend(): Backend {
  const config = readFirebaseConfig();
  if (config) {
    try {
      return createFirebaseBackend(config);
    } catch (err) {
      console.error('Firebase backend init failed, falling back to localStorage:', err);
    }
  }
  return createLocalBackend();
}

export const backend: Backend = selectBackend();
