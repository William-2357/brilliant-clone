import { lessons, finalTest, gradableSteps } from '../content/lessons';
import {
  recommendNext,
  courseStats,
  allLessonsCleared,
  lessonState,
  isCleared,
  dayKey,
} from '../store/progress';
import { dailyProblem, dailySim } from '../content/daily';
import { dueCount } from '../store/review';
import { useProgress } from '../hooks/useProgress';
import { useAuth } from '../hooks/useAuth';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate } from '../lib/router';
import { LockIcon } from '../components/LessonIcon';
import ActivityHeatmap from '../components/ActivityHeatmap';

/** Shared stroke style for the small nav-card glyphs. */
const ICO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** A short encouragement line that tracks overall course progress. */
function progressSubtitle(pct: number): string {
  if (pct >= 100) return "You've mastered every lesson — outstanding work.";
  if (pct === 0) return "You're just getting started — keep it up.";
  if (pct < 40) return 'Nice momentum — keep the streak alive.';
  if (pct < 80) return `You're ${pct}% of the way through the course.`;
  return 'Almost there — the finish line is in sight.';
}

const clamp01 = (n: number, d: number) => (d > 0 ? Math.max(0, Math.min(1, n / d)) : 0);

/**
 * A one-line plain-text preview: strips inline KaTeX math spans (`$…$`) from a blurb,
 * tidies whitespace, and truncates on a word boundary near `max` chars with an ellipsis.
 */
function clip(text: string, max = 60): string {
  const plain = text
    .replace(/\$[^$]*\$/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[.,;:!?\s]+$/, '')}…`;
}

export default function HomePage() {
  const progress = useProgress();
  const { user } = useAuth();
  const [unlockAll] = useUnlockAll();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const firstName = (user?.name || 'Learner').trim().split(/\s+/)[0] || 'Learner';
  const greeting = greetingFor(new Date().getHours());
  const next = recommendNext(lessons, progress.all);
  const nextState = next ? lessonState(next, progress.all, unlockAll) : null;
  const stats = courseStats(lessons, progress.all);
  const masteryPct = Math.round(stats.masteryFraction * 100);
  const testUnlocked = unlockAll || allLessonsCleared(lessons, progress.all);
  const testTotal = gradableSteps(finalTest).length;
  const { currentStreak, longestStreak } = progress.stats;
  const reviewsDue = dueCount(progress.stats, lessons, progress.all, new Date().getTime());
  const hasCleared = lessons.some((l) => l.status === 'built' && isCleared(progress.all[l.id]));

  // Today's daily content, pulled from the same date-seeded picks the dedicated
  // pages render so the widget text matches what's behind it.
  const today = dayKey(new Date().getTime());
  const daily = dailyProblem(today);
  const sim = dailySim(today);
  const problemPreview = daily ? clip(daily.step.body, 96) : null;
  const simPreview = clip(sim.blurb, 96);

  // One segment per lesson for the course-progress bar.
  const segments = lessons.map((l) => {
    const st = lessonState(l, progress.all, unlockAll);
    const phase = st === 'mastered' || st === 'cleared' ? 'done' : st === 'in-progress' ? 'doing' : 'todo';
    return { id: l.id, phase };
  });

  const tiles = [
    {
      label: 'Day streak',
      value: String(currentStreak),
      frac: clamp01(Math.min(currentStreak, 7), 7),
      note: `Best ${longestStreak}`,
    },
    {
      label: 'Complete',
      value: `${masteryPct}%`,
      frac: stats.masteryFraction,
      note: 'Course mastery',
    },
    {
      label: 'Lessons mastered',
      value: String(stats.lessonsMastered),
      frac: clamp01(stats.lessonsMastered, stats.lessonsBuilt),
      note:
        stats.lessonsMastered > 0
          ? `of ${stats.lessonsBuilt} lessons`
          : 'Complete a lesson to unlock',
    },
    {
      label: 'Problems solved',
      value: String(stats.problemsSolved),
      frac: clamp01(stats.problemsSolved, stats.totalProblems),
      note: `of ${stats.totalProblems} total`,
    },
  ];

  return (
    <div className="page home">
      <header className="page-head">
        <p className="page-eyebrow">Home</p>
        <h1 className="page-title">
          {greeting}, {firstName}.
        </h1>
        <p className="page-sub">{progressSubtitle(masteryPct)}</p>
      </header>

      <div className="home-grid">
        <div className="home-main">
          {next ? (
            <section className="hero-card">
              <div className="hero-text">
                <p className="hero-eyebrow">
                  Lesson {next.index} of {lessons.length}
                </p>
                <h2 className="hero-title">{next.title}</h2>
                <p className="hero-desc">{next.concept}</p>
              </div>
              <button
                type="button"
                className="hero-cta"
                onClick={() => navigate(`/learn/${next.id}`)}
              >
                {nextState === 'in-progress' ? 'Continue lesson' : 'Start lesson'} →
              </button>
            </section>
          ) : (
            <section className="hero-card">
              <div className="hero-text">
                <p className="hero-eyebrow">Course complete</p>
                <h2 className="hero-title">You've cleared every lesson</h2>
                <p className="hero-desc">
                  Put it all together in the {testTotal}-question final test.
                </p>
              </div>
              <button type="button" className="hero-cta" onClick={() => navigate('/test')}>
                Take the final test →
              </button>
            </section>
          )}

          <div className="home-stats">
            {tiles.map((t) => (
              <div className="home-stat" key={t.label}>
                <span className="home-stat-v">{t.value}</span>
                <span className="home-stat-l">{t.label}</span>
                <span className="home-stat-bar">
                  <i style={{ width: `${Math.round(t.frac * 100)}%` }} />
                </span>
                <span className="home-stat-note">{t.note}</span>
              </div>
            ))}
          </div>

          <section className="course-prog">
            <div className="course-prog-head">
              <h2 className="course-prog-title">Course progress</h2>
              <span className="course-prog-meta">
                {stats.lessonsMastered}/{stats.lessonsBuilt} mastered
              </span>
            </div>
            <div
              className="seg-bar"
              role="img"
              aria-label={`${stats.lessonsMastered} of ${stats.lessonsBuilt} lessons complete`}
            >
              {segments.map((s) => (
                <span key={s.id} className={`seg seg-${s.phase}`} />
              ))}
            </div>
            <div className="seg-legend">
              <span className="legend-item">
                <i className="legend-dot lg-done" /> Completed
              </span>
              <span className="legend-item">
                <i className="legend-dot lg-doing" /> In progress
              </span>
              <span className="legend-item">
                <i className="legend-dot lg-todo" /> Not started
              </span>
            </div>
          </section>

          <div className="home-nav-grid">
            <button type="button" className="home-card" onClick={() => navigate('/learn')}>
              <span className="home-card-ico" style={{ color: 'var(--accent)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <rect x="4" y="4" width="16" height="16" rx="2.5" />
                  <line x1="8" y1="9.5" x2="16" y2="9.5" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                  <line x1="8" y1="16.5" x2="13" y2="16.5" />
                </svg>
              </span>
              <span className="home-card-body">
                <span className="home-card-title">Browse all lessons</span>
                <span className="home-card-sub">The full lesson catalog</span>
              </span>
              <span className="home-card-go" aria-hidden>
                →
              </span>
            </button>

            <button type="button" className="home-card" onClick={() => navigate('/sandbox')}>
              <span className="home-card-ico" style={{ color: 'var(--accent-2)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <path d="M9 3h6" />
                  <path d="M10 3v6.4l-4.3 7.2A2 2 0 0 0 7.4 20h9.2a2 2 0 0 0 1.7-3.1L14 9.4V3" />
                  <line x1="8.5" y1="14" x2="15.5" y2="14" />
                </svg>
              </span>
              <span className="home-card-body">
                <span className="home-card-title">Sandbox</span>
                <span className="home-card-sub">Play with the simulations freely</span>
              </span>
              <span className="home-card-go" aria-hidden>
                →
              </span>
            </button>

            <button type="button" className="home-card" onClick={() => navigate('/practice')}>
              <span className="home-card-ico" style={{ color: 'var(--cyan)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <path d="M4 7h11" />
                  <path d="M9 12h11" />
                  <path d="M4 17h11" />
                  <circle cx="19" cy="7" r="1.6" fill="currentColor" stroke="none" />
                  <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
                  <circle cx="19" cy="17" r="1.6" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="home-card-body">
                <span className="home-card-title">
                  Mixed Practice
                  {reviewsDue > 0 && <span className="home-card-pill">{reviewsDue} due</span>}
                </span>
                <span className="home-card-sub">
                  {reviewsDue > 0
                    ? `${reviewsDue} concept${reviewsDue === 1 ? '' : 's'} due for review`
                    : hasCleared
                      ? 'Interleaved review of cleared lessons'
                      : 'Clear a lesson to unlock'}
                </span>
              </span>
              <span className="home-card-go" aria-hidden>
                →
              </span>
            </button>

            <button
              type="button"
              className={`home-card ${testUnlocked ? '' : 'locked'}`}
              disabled={!testUnlocked}
              onClick={() => testUnlocked && navigate('/test')}
            >
              <span className="home-card-ico" style={{ color: '#8b5cf6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="home-card-body">
                <span className="home-card-title">Final test</span>
                <span className="home-card-sub">
                  {testUnlocked
                    ? `${testTotal} questions spanning every lesson`
                    : `Unlock after all ${lessons.length} lessons`}
                </span>
              </span>
              {testUnlocked ? (
                <span className="home-card-go" aria-hidden>
                  →
                </span>
              ) : (
                <LockIcon size={16} className="home-card-lock" />
              )}
            </button>

            <button type="button" className="home-card" onClick={() => navigate('/profile')}>
              <span className="home-card-ico" style={{ color: '#f0a020' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <line x1="5" y1="20" x2="5" y2="13" />
                  <line x1="12" y1="20" x2="12" y2="6" />
                  <line x1="19" y1="20" x2="19" y2="10" />
                </svg>
              </span>
              <span className="home-card-body">
                <span className="home-card-title">Your stats</span>
                <span className="home-card-sub">Streaks, accuracy, and history</span>
              </span>
              <span className="home-card-go" aria-hidden>
                →
              </span>
            </button>
          </div>
        </div>

        <aside className="home-aside">
          <button type="button" className="daily-widget" onClick={() => navigate('/problem')}>
            <span className="dw-head">
              <span className="dw-ico" style={{ color: 'var(--amber-text)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <path d="M9.5 18h5" />
                  <path d="M10.5 21h3" />
                  <path d="M12 3a6 6 0 0 0-3.4 10.9c.5.4.9 1 .9 1.6v.5h5v-.5c0-.6.4-1.2.9-1.6A6 6 0 0 0 12 3Z" />
                </svg>
              </span>
              <span className="dw-eyebrow">Problem of the day</span>
              <span className="dw-go" aria-hidden>
                →
              </span>
            </span>
            {problemPreview && <span className="dw-preview">{problemPreview}</span>}
          </button>

          <button type="button" className="daily-widget" onClick={() => navigate('/simulation')}>
            <span className="dw-head">
              <span className="dw-ico" style={{ color: 'var(--accent)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" {...ICO} aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="dw-eyebrow">Simulation of the day</span>
              <span className="dw-go" aria-hidden>
                →
              </span>
            </span>
            <span className="dw-sim-title">{sim.label}</span>
            {simPreview && <span className="dw-preview">{simPreview}</span>}
          </button>

          <ActivityHeatmap
            activity={progress.stats.dailyActivity ?? {}}
            currentStreak={currentStreak}
          />
        </aside>
      </div>
    </div>
  );
}
