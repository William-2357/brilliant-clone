import { lessons } from '../content/lessons';
import {
  lessonState,
  lessonProgressFraction,
  recommendNext,
  courseStats,
  masteryCurve,
  dayKey,
  dayDiff,
} from '../store/progress';
import { useProgress } from '../hooks/useProgress';
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
  available: 'Start',
  'in-progress': 'Continue',
  cleared: 'Cleared',
  mastered: 'Mastered',
};

const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface WeekCell {
  label: string;
  on: boolean;
  today: boolean;
}

/**
 * The last 7 calendar days (ending today). A day is "on" if it falls within the
 * current streak window (the consecutive days ending on `lastActiveDay`). This
 * only marks days we can actually back with stored data, never invented ones.
 */
function weekCells(stats: UserStats): WeekCell[] {
  const cells: WeekCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    let on = false;
    if (stats.lastActiveDay && stats.currentStreak > 0) {
      const back = dayDiff(key, stats.lastActiveDay); // lastActiveDay - key
      on = back >= 0 && back <= stats.currentStreak - 1;
    }
    cells.push({ label: DAY_INITIAL[d.getDay()], on, today: i === 0 });
  }
  return cells;
}

export default function CoursePage() {
  const progress = useProgress();
  const [unlockAll, setUnlockAll] = useUnlockAll();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const next = recommendNext(lessons, progress.all);
  const stats = courseStats(lessons, progress.all);
  const { currentStreak, longestStreak } = progress.stats;
  const curve = masteryCurve(lessons, progress.all);
  const cells = weekCells(progress.stats);
  const masteryPct = Math.round(stats.masteryFraction * 100);
  const firstTry =
    stats.problemsResolved > 0
      ? Math.round((stats.problemsGreen / stats.problemsResolved) * 100)
      : null;

  return (
    <div className="page course">
      <header className="page-head">
        <p className="page-eyebrow">The Long Run</p>
        <h1 className="page-title">Probability &amp; Statistics</h1>
        <p className="page-sub">
          Predict, simulate, verify. Short, hands-on sessions for the curious adult learner.
        </p>
      </header>

      <div className="course-grid">
        <div className="course-main">
          {next && (
            <button type="button" className="resume-card" onClick={() => navigate(`/learn/${next.id}`)}>
              <LessonIcon lessonId={next.id} size={28} tile className="resume-icon" />
              <span className="resume-body">
                <span className="resume-eyebrow">Pick up where you left off</span>
                <span className="resume-title">{next.title}</span>
                <span className="resume-sub">{next.concept}</span>
              </span>
              <span className="resume-go" aria-hidden>
                →
              </span>
            </button>
          )}

          <label className="unlock-toggle">
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

          <ol className="lesson-cards">
            {lessons.map((lesson) => {
              const state = lessonState(lesson, progress.all, unlockAll);
              const clickable = state !== 'locked';
              const frac = state === 'mastered' ? 1 : lessonProgressFraction(lesson, progress.all);
              const ringColor =
                state === 'mastered'
                  ? 'var(--good)'
                  : state === 'cleared'
                    ? 'var(--accent-2)'
                    : 'var(--accent)';
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    className={`lcard state-${state}`}
                    disabled={!clickable}
                    onClick={() => clickable && navigate(`/learn/${lesson.id}`)}
                  >
                    <span className="lcard-index">{lesson.index}</span>
                    <LessonIcon lessonId={lesson.id} size={26} tile className="lcard-icon" />
                    <span className="lcard-body">
                      <span className="lcard-title">{lesson.title}</span>
                      <span className="lcard-desc">{lesson.concept}</span>
                      {clickable && (
                        <QuestionBar lesson={lesson} progress={progress.all[lesson.id]} />
                      )}
                    </span>
                    {clickable ? (
                      <ProgressRing value={frac} size={34} stroke={3.5} color={ringColor} />
                    ) : (
                      <LockIcon size={16} className="lcard-lock" />
                    )}
                    <span className={`status-pill pill-${state}`}>
                      {lesson.status === 'coming-soon' ? 'Coming soon' : STATE_LABEL[state]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="course-aside">
          <div className="panel prog-panel">
            <p className="prog-eyebrow">Your progress</p>
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
            <div className="prog-lines">
              <div className="sl">
                <span>Problems solved</span>
                <b>
                  {stats.problemsSolved}/{stats.totalProblems}
                </b>
              </div>
              <div className="sl">
                <span>First-try rate</span>
                <b>{firstTry === null ? '—' : `${firstTry}%`}</b>
              </div>
              <div className="sl">
                <span>Questions answered</span>
                <b>{stats.questionsAnswered}</b>
              </div>
            </div>
          </div>

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
            <div className="weekstrip" role="img" aria-label={`${currentStreak} day streak this week`}>
              {cells.map((c, i) => (
                <div key={i} className={`day ${c.on ? 'on' : ''} ${c.today ? 'today' : ''}`}>
                  <i />
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
