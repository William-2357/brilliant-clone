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

/** Starting play-chip balance for the Arcade. Chips are for learning, not money. */
export const ARCADE_STARTING_BANKROLL = 1000;

/**
 * Arcade (Apply) progress — play-chip bankroll and lifetime decision quality for
 * the Blackjack trainer. Persisted on `UserStats` so it rides the existing
 * Backend/progress abstraction (localStorage fallback) rather than a bespoke store.
 * Chips are play-only: no real money, no purchases.
 */
export interface ArcadeStats {
  /** Current play-chip balance (resettable). */
  bankroll: number;
  /** Lifetime net play-chips won/lost. */
  netChips: number;
  /** Hands played to completion. */
  handsPlayed: number;
  /** Total graded decisions (hit/stand/double choices). */
  decisionsTotal: number;
  /** Decisions that matched the engine's EV-optimal play. */
  decisionsCorrect: number;
  /** High-water bankroll mark. */
  bestBankroll: number;
}

export function emptyArcade(): ArcadeStats {
  return {
    bankroll: ARCADE_STARTING_BANKROLL,
    netChips: 0,
    handsPlayed: 0,
    decisionsTotal: 0,
    decisionsCorrect: 0,
    bestBankroll: ARCADE_STARTING_BANKROLL,
  };
}

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
  /** Arcade (Apply) bankroll + decision quality. */
  arcade: ArcadeStats;
}

export function emptyStats(): UserStats {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDay: null,
    totalDaysActive: 0,
    dailyActivity: {},
    arcade: emptyArcade(),
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
