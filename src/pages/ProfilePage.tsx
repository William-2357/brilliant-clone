import { lessons } from '../content/lessons';
import {
  courseStats,
  masteryCurve,
  lessonState,
  lessonProgressFraction,
  isCleared,
  dayKey,
  dayDiff,
} from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate } from '../lib/router';
import LessonIcon, { LockIcon } from '../components/LessonIcon';
import ProgressRing from '../components/ProgressRing';
import MasteryCurve from '../components/MasteryCurve';
import QuestionBar from '../components/QuestionBar';
import type { LessonState } from '../types/lesson';
import type { UserStats } from '../lib/storage';

const STATE_LABEL: Record<LessonState, string> = {
  locked: 'Locked',
  available: 'Not started',
  'in-progress': 'In progress',
  cleared: 'Cleared',
  mastered: 'Mastered',
};

const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeekCell {
  label: string;
  on: boolean;
  today: boolean;
}

/** Last 7 calendar days; a day is "on" if it falls in the current streak window. */
function weekCells(stats: UserStats): WeekCell[] {
  const cells: WeekCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    let on = false;
    if (stats.lastActiveDay && stats.currentStreak > 0) {
      const back = dayDiff(key, stats.lastActiveDay);
      on = back >= 0 && back <= stats.currentStreak - 1;
    }
    cells.push({ label: DAY_INITIAL[d.getDay()], on, today: i === 0 });
  }
  return cells;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfilePage() {
  const progress = useProgress();
  const { user, signOut, backendKind } = useAuth();
  const [theme, setTheme] = useTheme();
  const [unlockAll, setUnlockAll] = useUnlockAll();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const name = user?.name || 'Learner';
  const stats = courseStats(lessons, progress.all);
  const { currentStreak, longestStreak, totalDaysActive } = progress.stats;
  const curve = masteryCurve(lessons, progress.all);
  const cells = weekCells(progress.stats);
  const masteryPct = Math.round(stats.masteryFraction * 100);
  const firstTry =
    stats.problemsResolved > 0
      ? Math.round((stats.problemsGreen / stats.problemsResolved) * 100)
      : null;
  const clearedCount = lessons.filter(
    (l) => l.status === 'built' && isCleared(progress.all[l.id]),
  ).length;

  const tiles = [
    { v: String(currentStreak), l: 'Day streak' },
    { v: String(longestStreak), l: 'Best streak' },
    { v: String(totalDaysActive), l: 'Days active' },
    { v: `${masteryPct}%`, l: 'Course progress' },
    { v: `${stats.lessonsMastered}/${stats.lessonsBuilt}`, l: 'Lessons mastered' },
    { v: `${clearedCount}/${stats.lessonsBuilt}`, l: 'Lessons cleared' },
    { v: `${stats.problemsSolved}/${stats.totalProblems}`, l: 'Problems solved' },
    { v: firstTry === null ? '—' : `${firstTry}%`, l: 'First-try rate' },
    { v: String(stats.questionsAnswered), l: 'Questions answered' },
  ];

  return (
    <div className="page profile-page">
      <header className="page-head">
        <button type="button" className="back-link acct-back" onClick={() => navigate('/learn')}>
          ← Back to course
        </button>
        <p className="page-eyebrow">Account</p>
        <h1 className="page-title">Your profile</h1>
        <p className="page-sub">Your stats, streak, and preferences — all in one place.</p>
      </header>

      <div className="course-grid">
        <div className="course-main">
          <div className="acct-hero">
            <span className="avatar avatar-xl" aria-hidden>
              {initials(name)}
            </span>
            <div className="acct-id">
              <span className="acct-name">{name}</span>
              {user?.email && <span className="acct-email">{user.email}</span>}
            </div>
            <span className="acct-sync">
              {backendKind === 'firebase' ? 'Synced across devices' : 'Saved on this device'}
            </span>
          </div>

          <div className="acct-stats">
            {tiles.map((t) => (
              <div className="acct-stat" key={t.l}>
                <span className="acct-stat-v">{t.v}</span>
                <span className="acct-stat-l">{t.l}</span>
              </div>
            ))}
          </div>

          <div className="panel prog-panel">
            <p className="prog-eyebrow">Course mastery</p>
            <div className="prog-top">
              <span className="prog-pct">
                {masteryPct}
                <small>% complete</small>
              </span>
              <span className="prog-meta">
                {stats.lessonsMastered}/{stats.lessonsBuilt} mastered
              </span>
            </div>
            <MasteryCurve points={curve} />
          </div>

          <div className="panel">
            <p className="panel-title">Lessons</p>
            <ul className="acct-lessons">
              {lessons.map((lesson) => {
                const state = lessonState(lesson, progress.all, unlockAll);
                const locked = state === 'locked';
                const frac =
                  state === 'mastered' ? 1 : lessonProgressFraction(lesson, progress.all);
                const ringColor =
                  state === 'mastered'
                    ? 'var(--good)'
                    : state === 'cleared'
                      ? 'var(--accent-2)'
                      : 'var(--accent)';
                return (
                  <li key={lesson.id} className={`acct-lrow ${locked ? 'locked' : ''}`}>
                    <LessonIcon lessonId={lesson.id} size={24} tile />
                    <div className="acct-lmeta">
                      <span className="acct-ltitle">{lesson.title}</span>
                      <QuestionBar lesson={lesson} progress={progress.all[lesson.id]} />
                    </div>
                    {locked ? (
                      <LockIcon size={16} className="lcard-lock" />
                    ) : (
                      <ProgressRing value={frac} size={30} stroke={3} color={ringColor} />
                    )}
                    <span className={`status-pill pill-${state}`}>{STATE_LABEL[state]}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <aside className="course-aside">
          <div className="panel streak-panel">
            <div className="streak-head">
              <p className="streak-lab">This week</p>
              <span className="streak-meta">
                {currentStreak > 0 ? (
                  <>
                    <b>{currentStreak}-day</b> streak
                  </>
                ) : (
                  'No streak yet'
                )}{' '}
                · best {longestStreak}
              </span>
            </div>
            <div
              className="weekstrip"
              role="img"
              aria-label={`${currentStreak} day streak this week`}
            >
              {cells.map((c, i) => (
                <div key={i} className={`day ${c.on ? 'on' : ''} ${c.today ? 'today' : ''}`}>
                  <i />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <p className="panel-title">Preferences</p>
            <div className="pref-block">
              <span className="pref-label">Appearance</span>
              <div className="theme-seg" role="group" aria-label="Theme">
                <button
                  type="button"
                  className={`theme-opt ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  ☀ Light
                </button>
                <button
                  type="button"
                  className={`theme-opt ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  ☾ Dark
                </button>
              </div>
            </div>
            <label className="unlock-toggle pref-toggle">
              <input
                type="checkbox"
                checked={unlockAll}
                onChange={(e) => setUnlockAll(e.target.checked)}
              />
              <span className="unlock-track" aria-hidden="true" />
              <span className="unlock-text">
                Free navigation
                <span className="unlock-sub">Jump to any lesson without finishing earlier ones</span>
              </span>
            </label>
          </div>

          <button type="button" className="menu-signout acct-signout" onClick={() => void signOut()}>
            Sign out
          </button>
        </aside>
      </div>
    </div>
  );
}
