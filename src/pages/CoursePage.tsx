import { lessons } from '../content/lessons';
import { lessonState, recommendNext } from '../store/progress';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate } from '../lib/router';
import type { LessonState } from '../types/lesson';

const STATE_LABEL: Record<LessonState, string> = {
  locked: 'Locked',
  available: 'Start',
  'in-progress': 'Continue',
  mastered: 'Mastered',
};

export default function CoursePage() {
  const { user, signOut } = useAuth();
  const progress = useProgress();
  const [unlockAll, setUnlockAll] = useUnlockAll();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const next = recommendNext(lessons, progress.all);
  const masteredCount = lessons.filter((l) => progress.all[l.id]?.mastered).length;
  const builtCount = lessons.filter((l) => l.status === 'built').length;
  const { currentStreak, longestStreak } = progress.stats;

  return (
    <div className="course">
      <header className="course-header">
        <div>
          <p className="brand">The Long Run</p>
          <h1 className="course-title">Probability &amp; Statistics</h1>
          <p className="course-subtitle">Short, hands-on sessions for the curious adult learner.</p>
        </div>
        <div className="course-user">
          <span className="course-greeting">Hi, {user?.name || 'learner'}</span>
          <button type="button" className="link-btn" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="stat-row">
        <div className={`stat-chip ${currentStreak > 0 ? 'stat-chip-hot' : ''}`}>
          <span className="stat-icon" aria-hidden>
            {'\u{1F525}'}
          </span>
          <span className="stat-value">{currentStreak}</span>
          <span className="stat-label">day streak</span>
        </div>
        <div className="stat-chip">
          <span className="stat-value">{masteredCount}/{builtCount}</span>
          <span className="stat-label">lessons mastered</span>
        </div>
        <div className="stat-chip">
          <span className="stat-value">{longestStreak}</span>
          <span className="stat-label">best streak</span>
        </div>
      </div>

      {next && (
        <button
          type="button"
          className="next-card"
          onClick={() => navigate(`/learn/${next.id}`)}
        >
          <span className="next-label">Pick up where you left off</span>
          <span className="next-title">{next.title}</span>
          <span className="next-concept">{next.concept}</span>
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
          <span className="unlock-sub">Jump to any lesson without finishing the earlier ones</span>
        </span>
      </label>

      <ol className="lesson-list">
        {lessons.map((lesson) => {
          const state = lessonState(lesson, progress.all, unlockAll);
          const clickable = state !== 'locked';
          return (
            <li key={lesson.id}>
              <button
                type="button"
                className={`lesson-row state-${state}`}
                disabled={!clickable}
                onClick={() => clickable && navigate(`/learn/${lesson.id}`)}
              >
                <span className="lesson-index">{lesson.index}</span>
                <span className="lesson-main">
                  <span className="lesson-name">{lesson.title}</span>
                  <span className="lesson-concept">{lesson.concept}</span>
                </span>
                <span className={`lesson-badge badge-${state}`}>
                  {lesson.status === 'coming-soon' ? 'Coming soon' : STATE_LABEL[state]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
