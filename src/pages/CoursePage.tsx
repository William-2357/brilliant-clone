import { lessons } from '../content/lessons';
import {
  lessonState,
  lessonProgressFraction,
  recommendNext,
  courseStats,
} from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate } from '../lib/router';
import LessonIcon, { lessonIconColor } from '../components/LessonIcon';
import ProgressRing from '../components/ProgressRing';
import QuestionBar from '../components/QuestionBar';
import type { LessonState } from '../types/lesson';

const STATE_LABEL: Record<LessonState, string> = {
  locked: 'Locked',
  available: 'Start',
  'in-progress': 'Continue',
  cleared: 'Cleared',
  mastered: 'Mastered',
};

export default function CoursePage() {
  const progress = useProgress();
  const [unlockAll, setUnlockAll] = useUnlockAll();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const next = recommendNext(lessons, progress.all);
  const stats = courseStats(lessons, progress.all);
  const { currentStreak, longestStreak } = progress.stats;

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
                    : lessonIconColor(lesson.id);
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
                      <span className="lcard-lock" aria-hidden>
                        {'\u{1F512}'}
                      </span>
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
          <div className="panel mastery-panel">
            <p className="panel-title">Course mastery</p>
            <div className="mastery-ring">
              <ProgressRing value={stats.masteryFraction} size={132} stroke={11}>
                <span className="mastery-pct">{Math.round(stats.masteryFraction * 100)}%</span>
                <span className="mastery-cap">complete</span>
              </ProgressRing>
            </div>
            <div className="panel-stats">
              <div className="pstat">
                <span className="pstat-value">
                  {stats.lessonsMastered}/{stats.lessonsBuilt}
                </span>
                <span className="pstat-label">Lessons mastered</span>
              </div>
              <div className="pstat">
                <span className="pstat-value">{stats.problemsSolved}</span>
                <span className="pstat-label">Problems solved</span>
              </div>
            </div>
          </div>

          <div className="panel streak-panel">
            <div className={`streak-hero ${currentStreak > 0 ? 'hot' : ''}`}>
              <span className="streak-flame" aria-hidden>
                {'\u{1F525}'}
              </span>
              <span className="streak-num">{currentStreak}</span>
              <span className="streak-cap">day streak</span>
            </div>
            <p className="streak-note">Best streak: {longestStreak} days</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
