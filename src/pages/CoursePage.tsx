import { lessons, finalTest, gradableSteps } from '../content/lessons';
import {
  lessonState,
  lessonProgressFraction,
  recommendNext,
  courseStats,
  masteryCurve,
  allLessonsCleared,
  allQuestionsResolved,
  problemResult,
} from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate } from '../lib/router';
import LessonIcon, { LockIcon } from '../components/LessonIcon';
import ProgressRing from '../components/ProgressRing';
import MasteryCurve from '../components/MasteryCurve';
import QuestionBar from '../components/QuestionBar';
import ActivityHeatmap from '../components/ActivityHeatmap';
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
  const testUnlocked = unlockAll || allLessonsCleared(lessons, progress.all);
  const testProgress = progress.all[finalTest.id];
  const testTotal = gradableSteps(finalTest).length;
  const testScore = allQuestionsResolved(finalTest, testProgress)
    ? gradableSteps(finalTest).filter((s) => problemResult(testProgress, s.id) === 'green').length
    : null;
  const { currentStreak } = progress.stats;
  const curve = masteryCurve(lessons, progress.all);
  const masteryPct = Math.round(stats.masteryFraction * 100);
  const firstTry =
    stats.problemsResolved > 0
      ? Math.round((stats.problemsGreen / stats.problemsResolved) * 100)
      : null;

  return (
    <div className="page course">
      <header className="page-head">
        <p className="page-eyebrow">Course</p>
        <h1 className="page-title">All lessons</h1>
        <p className="page-sub">
          Every lesson in Probability &amp; Statistics — predict, simulate, verify, one short
          hands-on session at a time.
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

          <button
            type="button"
            className="resume-card final-test-cta"
            disabled={!testUnlocked}
            onClick={() => testUnlocked && navigate('/test')}
          >
            <LessonIcon lessonId={finalTest.id} size={28} tile className="resume-icon" />
            <span className="resume-body">
              <span className="resume-eyebrow">
                {!testUnlocked ? 'Locked' : testScore != null ? 'Completed' : 'Capstone'}
              </span>
              <span className="resume-title">{finalTest.title}</span>
              <span className="resume-sub">
                {!testUnlocked
                  ? 'Clear all eight lessons to unlock'
                  : testScore != null
                    ? `Last score ${testScore}/${testTotal} · retake anytime`
                    : `${testTotal} questions spanning every lesson`}
              </span>
            </span>
            <span className="resume-go" aria-hidden>
              {testUnlocked ? '→' : <LockIcon size={16} />}
            </span>
          </button>
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

          <ActivityHeatmap
            activity={progress.stats.dailyActivity ?? {}}
            currentStreak={currentStreak}
          />
        </aside>
      </div>
    </div>
  );
}
