import { lessons } from '../content/lessons';
import {
  courseStats,
  masteryCurve,
  lessonState,
  lessonProgressFraction,
  isCleared,
} from '../store/progress';
import { reviewSummary, REVIEW_INTERVALS_DAYS } from '../store/review';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { useExplainAI } from '../hooks/useExplainAI';
import { navigate } from '../lib/router';
import LessonIcon, { LockIcon } from '../components/LessonIcon';
import ProgressRing from '../components/ProgressRing';
import MasteryCurve from '../components/MasteryCurve';
import QuestionBar from '../components/QuestionBar';
import ActivityHeatmap from '../components/ActivityHeatmap';
import type { LessonState } from '../types/lesson';

const STATE_LABEL: Record<LessonState, string> = {
  locked: 'Locked',
  available: 'Not started',
  'in-progress': 'In progress',
  cleared: 'Cleared',
  mastered: 'Mastered',
};

/** Shared stroke style for the aside-card header glyphs (mirrors the home cards). */
const ICO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

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
  const [explainAI, setExplainAI] = useExplainAI();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const name = user?.name || 'Learner';
  const stats = courseStats(lessons, progress.all);
  const { currentStreak, longestStreak, totalDaysActive } = progress.stats;
  const curve = masteryCurve(lessons, progress.all);
  const masteryPct = Math.round(stats.masteryFraction * 100);
  const firstTry =
    stats.problemsResolved > 0
      ? Math.round((stats.problemsGreen / stats.problemsResolved) * 100)
      : null;
  const clearedCount = lessons.filter(
    (l) => l.status === 'built' && isCleared(progress.all[l.id]),
  ).length;
  const review = reviewSummary(progress.stats, lessons, progress.all, new Date().getTime());
  const maxBucket = Math.max(1, ...review.buckets);

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
          <ActivityHeatmap
            activity={progress.stats.dailyActivity ?? {}}
            currentStreak={currentStreak}
          />

          <div className="panel review-panel">
            <div className="aside-card-head">
              <span className="home-card-ico" style={{ color: 'var(--cyan)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
                  <path d="M5 3v3.5h3.5" />
                  <path d="M12 8v4l2.5 2" />
                </svg>
              </span>
              <div className="aside-card-htext">
                <span className="aside-card-title">Memory strength</span>
                <span className="aside-card-sub">Spaced-repetition schedule</span>
              </div>
            </div>

            {review.eligible === 0 ? (
              <p className="review-empty">
                Clear a lesson to start building spaced-repetition intervals.
              </p>
            ) : (
              <>
                <div className="review-due">
                  <span className="review-due-n">{review.due}</span>
                  <span className="review-due-l">
                    {review.due === 1 ? 'concept due now' : 'concepts due now'}
                  </span>
                  {review.due > 0 && (
                    <button
                      type="button"
                      className="btn btn-primary review-due-btn"
                      onClick={() => navigate('/practice')}
                    >
                      Review →
                    </button>
                  )}
                </div>
                <ul className="review-bars" aria-label="Concepts by review interval">
                  {REVIEW_INTERVALS_DAYS.map((d, i) => (
                    <li key={d} className="review-bar-row">
                      <span className="review-bar-label">{d}d</span>
                      <span className="review-bar-track">
                        <i style={{ width: `${Math.round((review.buckets[i] / maxBucket) * 100)}%` }} />
                      </span>
                      <span className="review-bar-count">{review.buckets[i]}</span>
                    </li>
                  ))}
                </ul>
                <p className="review-foot">
                  {review.scheduled} scheduled · {review.eligible} concept
                  {review.eligible === 1 ? '' : 's'} in rotation
                </p>
              </>
            )}
          </div>

          <div className="panel">
            <div className="aside-card-head">
              <span className="home-card-ico" style={{ color: 'var(--accent)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                  <circle cx="9" cy="8" r="2.4" fill="var(--surface)" />
                  <circle cx="15" cy="16" r="2.4" fill="var(--surface)" />
                </svg>
              </span>
              <div className="aside-card-htext">
                <span className="aside-card-title">Preferences</span>
                <span className="aside-card-sub">Theme &amp; navigation</span>
              </div>
            </div>
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
            <label className="unlock-toggle pref-toggle">
              <input
                type="checkbox"
                checked={explainAI}
                onChange={(e) => setExplainAI(e.target.checked)}
              />
              <span className="unlock-track" aria-hidden="true" />
              <span className="unlock-text">
                AI explanations
                <span className="unlock-sub">
                  Tailor wrong-answer feedback with AI when connected (else uses the written hint)
                </span>
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
