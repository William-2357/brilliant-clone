import type { LessonProgress } from '../types/lesson';

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
}

export interface AuthAdapter {
  current(): AuthUser | null;
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signUp(name: string, email: string, password: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  /**
   * OAuth sign-in with Google. In the Firebase backend this opens the real Google
   * popup; in the localStorage fallback it signs into a deterministic demo Google
   * account so the zero-config app (and e2e) stays fully usable offline.
   */
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
}

export type ProgressMap = Record<string, LessonProgress>;

/** Per-user habit stats (streaks) — stored once per user, not per lesson. */
export interface UserStats {
  /** Consecutive calendar days with at least one active session. */
  currentStreak: number;
  /** Best streak ever reached. */
  longestStreak: number;
  /** Last active calendar day as a YYYY-MM-DD string (local time), or null. */
  lastActiveDay: string | null;
  /** Total distinct days the learner has been active. */
  totalDaysActive: number;
  /** Problems resolved per local calendar day (YYYY-MM-DD → count) — powers the activity heatmap. */
  dailyActivity: Record<string, number>;
}

export function emptyStats(): UserStats {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDay: null,
    totalDaysActive: 0,
    dailyActivity: {},
  };
}

export interface ProgressAdapter {
  load(uid: string): Promise<ProgressMap>;
  saveLesson(uid: string, lessonId: string, progress: LessonProgress): Promise<void>;
  loadStats(uid: string): Promise<UserStats>;
  saveStats(uid: string, stats: UserStats): Promise<void>;
}

export interface Backend {
  auth: AuthAdapter;
  progress: ProgressAdapter;
  /** 'firebase' when a configured Firestore backend is active, else 'local'. */
  kind: 'firebase' | 'local';
}
