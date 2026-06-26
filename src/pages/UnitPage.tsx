import type { CSSProperties } from 'react';
import type { LessonState } from '../types/lesson';
import { sections } from '../content/lessons';
import { lessonState, lessonProgressFraction, sectionState } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate } from '../lib/router';
import LessonIcon, { LockIcon } from '../components/LessonIcon';
import ProgressRing from '../components/ProgressRing';
import QuestionBar from '../components/QuestionBar';

const STATE_LABEL: Record<LessonState, string> = {
  locked: 'Locked',
  available: 'Start',
  'in-progress': 'Continue',
  cleared: 'Cleared',
  mastered: 'Mastered',
};

export default function UnitPage({ sectionId }: { sectionId: string }) {
  const progress = useProgress();
  const [unlockAll] = useUnlockAll();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const section = sections.find((s) => s.id === sectionId);
  if (!section) {
    return (
      <div className="page">
        <button type="button" className="back-link" onClick={() => navigate('/learn')}>
          ← All units
        </button>
        <p className="center-note">That unit doesn’t exist.</p>
      </div>
    );
  }

  const unitLocked = sectionState(section, progress.all, unlockAll) === 'locked';

  return (
    <div className="page course" style={{ '--section-accent': section.accent } as CSSProperties}>
      <header className="page-head">
        <button type="button" className="back-link" onClick={() => navigate('/learn')}>
          ← All units
        </button>
        <p className="page-eyebrow unit-eyebrow">Unit {section.index}</p>
        <h1 className="page-title">{section.title}</h1>
        <p className="page-sub">{section.blurb}</p>
      </header>

      {section.lessons.length === 0 ? (
        <p className="center-note">Lessons for this unit are coming soon.</p>
      ) : (
        <ol className="lesson-cards">
          {section.lessons.map((lesson) => {
            const state = lessonState(lesson, progress.all, unlockAll);
            const clickable = state !== 'locked';
            const frac = state === 'mastered' ? 1 : lessonProgressFraction(lesson, progress.all);
            const ringColor =
              state === 'mastered'
                ? 'var(--good)'
                : state === 'cleared'
                  ? 'var(--accent-2)'
                  : 'var(--section-accent)';
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
                    {clickable && <QuestionBar lesson={lesson} progress={progress.all[lesson.id]} />}
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
      )}

      {unitLocked && section.lessons.length > 0 && (
        <p className="center-note">Finish the previous unit to unlock these lessons.</p>
      )}
    </div>
  );
}
