/**
 * Firestore + Firebase Auth backend (PRD FR-7) — the real cross-device,
 * real-auth implementation. It is only constructed when Firebase config is
 * present (see `backend.ts`); initialization is lazy so merely importing this
 * module has no side effects and the localStorage build path is unaffected.
 *
 * Data layout:
 *   users/{uid}/progress/{lessonId}  -> LessonProgress
 *   users/{uid}/meta/stats           -> UserStats (streaks)
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  onAuthStateChanged,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  type Firestore,
} from 'firebase/firestore';
import type {
  AuthAdapter,
  AuthUser,
  Backend,
  ProgressAdapter,
  ProgressMap,
  UserStats,
} from './storage';
import { emptyStats } from './storage';
import type { LessonProgress } from '../types/lesson';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function init(config: FirebaseConfig): { auth: Auth; db: Firestore } {
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  }
  return { auth: authInstance!, db: dbInstance! };
}

class FirebaseAuth implements AuthAdapter {
  private auth: Auth;

  constructor(auth: Auth) {
    this.auth = auth;
  }

  current(): AuthUser | null {
    const u = this.auth.currentUser;
    return u ? { uid: u.uid, name: u.displayName ?? '', email: u.email ?? '' } : null;
  }

  onChange(cb: (u: AuthUser | null) => void): () => void {
    return onAuthStateChanged(this.auth, (u) =>
      cb(u ? { uid: u.uid, name: u.displayName ?? '', email: u.email ?? '' } : null),
    );
  }

  async signUp(name: string, email: string, password: string): Promise<AuthUser> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    return { uid: cred.user.uid, name, email };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return {
      uid: cred.user.uid,
      name: cred.user.displayName ?? '',
      email: cred.user.email ?? '',
    };
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.auth);
  }
}

class FirebaseProgress implements ProgressAdapter {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async load(uid: string): Promise<ProgressMap> {
    const snap = await getDocs(collection(this.db, 'users', uid, 'progress'));
    const map: ProgressMap = {};
    snap.forEach((d) => {
      map[d.id] = d.data() as LessonProgress;
    });
    return map;
  }

  async saveLesson(uid: string, lessonId: string, progress: LessonProgress): Promise<void> {
    await setDoc(doc(this.db, 'users', uid, 'progress', lessonId), progress);
  }

  async loadStats(uid: string): Promise<UserStats> {
    const snap = await getDoc(doc(this.db, 'users', uid, 'meta', 'stats'));
    return snap.exists() ? { ...emptyStats(), ...(snap.data() as UserStats) } : emptyStats();
  }

  async saveStats(uid: string, stats: UserStats): Promise<void> {
    await setDoc(doc(this.db, 'users', uid, 'meta', 'stats'), stats);
  }
}

export function createFirebaseBackend(config: FirebaseConfig): Backend {
  const { auth, db } = init(config);
  return { auth: new FirebaseAuth(auth), progress: new FirebaseProgress(db), kind: 'firebase' };
}
