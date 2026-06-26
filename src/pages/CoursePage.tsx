import type { CSSProperties } from 'react';
import { sections, lessons, finalTest, gradableSteps } from '../content/lessons';
import {
  sectionState,
  sectionProgressFraction,
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
import ActivityHeatmap from '../components/ActivityHeatmap';

const SECTION_STATE_LABEL: Record<string, string> = {
  locked: 'Locked',
  available: 'Start',
  'in-progress': 'In progress',
  complete: 'Complete',
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
        <h1 className="page-title">Probability &amp; Statistics</h1>
        <p className="page-sub">
          Eight units, each a short stack of predict-then-verify lessons. Finish a unit to unlock
          the next.
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
              <span className="unlock-sub">Jump to any unit without finishing earlier ones</span>
            </span>
          </label>

          <ol className="unit-grid">
            {sections.map((section) => {
              const sState = sectionState(section, progress.all, unlockAll);
              const built = section.lessons.filter((l) => l.status === 'built');
              const empty = built.length === 0;
              const frac = sectionProgressFraction(section, progress.all);
              const clearedCount = Math.round(frac * built.length);
              const clickable = !empty && sState !== 'locked';
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    className={`unit-card sstate-${sState} ${empty ? 'unit-empty' : ''}`}
                    style={{ '--section-accent': section.accent } as CSSProperties}
                    disabled={!clickable}
                    onClick={() => clickable && navigate(`/learn/section/${section.id}`)}
                  >
                    <span className="unit-card-index">{section.index}</span>
                    <span className="unit-card-body">
                      <span className="unit-card-title">{section.title}</span>
                      <span className="unit-card-desc">{section.blurb}</span>
                      <span className="unit-card-meta">
                        {empty
                          ? 'Coming soon'
                          : `${clearedCount}/${built.length} lessons cleared`}
                      </span>
                    </span>
                    {empty ? (
                      <span className="status-pill pill-locked">Soon</span>
                    ) : sState === 'locked' ? (
                      <LockIcon size={16} className="lcard-lock" />
                    ) : (
                      <ProgressRing value={frac} size={36} stroke={3.5} color="var(--section-accent)" />
                    )}
                    {!empty && (
                      <span className={`status-pill pill-${sState === 'complete' ? 'mastered' : sState}`}>
                        {SECTION_STATE_LABEL[sState]}
                      </span>
                    )}
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
                  ? 'Clear every unit to unlock'
                  : testScore != null
                    ? `Last score ${testScore}/${testTotal} · retake anytime`
                    : `${testTotal} questions spanning every unit`}
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
