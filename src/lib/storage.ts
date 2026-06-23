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
}

export function emptyStats(): UserStats {
  return { currentStreak: 0, longestStreak: 0, lastActiveDay: null, totalDaysActive: 0 };
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
