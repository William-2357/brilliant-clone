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

/**
 * Browser-only fallback backend. It makes the full MVP runnable without any
 * cloud setup. It is NOT cross-device (that requires the Firebase backend) and
 * its "password hashing" is demo-grade only. Swappable behind the Backend
 * interface for the Firestore implementation.
 */

const USERS_KEY = 'bb:users';
const SESSION_KEY = 'bb:session';
const PROGRESS_KEY = (uid: string) => `bb:progress:${uid}`;
const STATS_KEY = (uid: string) => `bb:stats:${uid}`;

interface StoredUser extends AuthUser {
  passwordHash: string;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function readUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, StoredUser>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

class LocalAuth implements AuthAdapter {
  private listeners = new Set<(u: AuthUser | null) => void>();

  current(): AuthUser | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }

  private emit() {
    const u = this.current();
    this.listeners.forEach((cb) => cb(u));
  }

  onChange(cb: (u: AuthUser | null) => void): () => void {
    this.listeners.add(cb);
    cb(this.current());
    return () => this.listeners.delete(cb);
  }

  async signUp(name: string, email: string, password: string): Promise<AuthUser> {
    const key = email.trim().toLowerCase();
    if (!name.trim()) throw new Error('Please enter your name.');
    if (!key) throw new Error('Please enter an email.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const users = readUsers();
    if (users[key]) throw new Error('An account with that email already exists.');
    const user: StoredUser = {
      uid: `local-${hash(key)}`,
      name: name.trim(),
      email: key,
      passwordHash: hash(password),
    };
    users[key] = user;
    writeUsers(users);
    const session: AuthUser = { uid: user.uid, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.emit();
    return session;
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const key = email.trim().toLowerCase();
    const users = readUsers();
    const user = users[key];
    if (!user || user.passwordHash !== hash(password)) {
      throw new Error('Incorrect email or password.');
    }
    const session: AuthUser = { uid: user.uid, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.emit();
    return session;
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    this.emit();
  }
}

class LocalProgress implements ProgressAdapter {
  async load(uid: string): Promise<ProgressMap> {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY(uid)) ?? '{}');
    } catch {
      return {};
    }
  }

  async saveLesson(uid: string, lessonId: string, progress: LessonProgress): Promise<void> {
    const all = await this.load(uid);
    all[lessonId] = progress;
    localStorage.setItem(PROGRESS_KEY(uid), JSON.stringify(all));
  }

  async loadStats(uid: string): Promise<UserStats> {
    try {
      const raw = localStorage.getItem(STATS_KEY(uid));
      return raw ? { ...emptyStats(), ...(JSON.parse(raw) as UserStats) } : emptyStats();
    } catch {
      return emptyStats();
    }
  }

  async saveStats(uid: string, stats: UserStats): Promise<void> {
    localStorage.setItem(STATS_KEY(uid), JSON.stringify(stats));
  }
}

export function createLocalBackend(): Backend {
  return { auth: new LocalAuth(), progress: new LocalProgress(), kind: 'local' };
}
