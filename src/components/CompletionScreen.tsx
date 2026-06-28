import type { Lesson, LessonProgress } from '../types/lesson';
import { gradableSteps } from '../content/lessons';
import { problemResult } from '../store/progress';
import QuestionBar from './QuestionBar';

interface Props {
  lesson: Lesson;
  progress: LessonProgress | undefined;
  cleared: boolean;
  mastered: boolean;
  nextLesson: Lesson | null;
  onNext: () => void;
  onReview: () => void;
  onRetry: () => void;
  onBackToCourse: () => void;
}

export default function CompletionScreen({
  lesson,
  progress,
  cleared,
  mastered,
  nextLesson,
  onNext,
  onReview,
  onRetry,
  onBackToCourse,
}: Props) {
  const problems = gradableSteps(lesson);
  const counts = problems.reduce(
    (acc, p) => {
      const r = problemResult(progress, p.id);
      if (r === 'green') acc.green += 1;
      else if (r === 'yellow') acc.yellow += 1;
      else if (r === 'red') acc.red += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 },
  );

  const fmtVal = (unit: string | undefined, v: number): string => {
    if (unit === 'dollars') return `$${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}`;
    if (unit === 'count' || unit === 'sum' || unit === 'matches') return String(Math.round(v));
    return v.toFixed(3);
  };

  // Pretesting reveal: how the learner's first-visit gut guess compares to the truth.
  const pre = progress?.preTest ?? null;
  let pretestReveal: { guess: string | null; answer: string; spotOn: boolean } | null = null;
  if (pre) {
    const answerStr = fmtVal(pre.unit, pre.answer);
    if (pre.guess === null) {
      pretestReveal = { guess: null, answer: answerStr, spotOn: false };
    } else {
      const eps =
        pre.unit === 'dollars'
          ? 0.5
          : pre.unit === 'count' || pre.unit === 'sum' || pre.unit === 'matches'
            ? Math.max(1, Math.abs(pre.answer) * 0.05)
            : 0.05;
      pretestReveal = {
        guess: fmtVal(pre.unit, pre.guess),
        answer: answerStr,
        spotOn: Math.abs(pre.guess - pre.answer) <= eps,
      };
    }
  }

  const badge = mastered ? '\u2605' : cleared ? '\u2713' : '\u21BA';
  const title = mastered ? 'Lesson mastered!' : cleared ? 'Lesson cleared' : 'Almost there';
  const summary = mastered
    ? `A perfect run — all ${problems.length} correct on the first try.`
    : cleared
      ? `You answered all ${problems.length} correctly. Get them all on the first try for mastery.`
      : `You missed ${counts.red} question${counts.red === 1 ? '' : 's'}. Clear them all to unlock the next lesson.`;

  return (
    <div className="completion">
      <div className={`completion-badge ${mastered ? 'badge-master' : cleared ? 'badge-clear' : 'badge-miss'}`} aria-hidden>
        {badge}
      </div>
      <h2>{title}</h2>
      <p className="completion-lesson">{lesson.title}</p>

      <div className="completion-results">
        <QuestionBar lesson={lesson} progress={progress} />
        <div className="result-legend">
          <span className="legend-item">
            <span className="legend-dot dot-green" /> {counts.green} first try
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-yellow" /> {counts.yellow} on retry
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-red" /> {counts.red} missed
          </span>
        </div>
      </div>

      <p className="completion-summary">{summary}</p>

      {pretestReveal && (
        <div className="pretest-reveal">
          <span className="pretest-reveal-eyebrow">Your intuition, then vs. now</span>
          {pretestReveal.guess === null ? (
            <p className="pretest-reveal-text">
              You started this lesson unsure — now you know the answer is{' '}
              <strong>{pretestReveal.answer}</strong>.
            </p>
          ) : (
            <>
              <div className="pretest-reveal-row">
                <span className="pretest-reveal-item">
                  <span className="pretest-reveal-label">Before the lesson</span>
                  <span className="pretest-reveal-guess">{pretestReveal.guess}</span>
                </span>
                <span className="pretest-reveal-arrow" aria-hidden>
                  →
                </span>
                <span className="pretest-reveal-item">
                  <span className="pretest-reveal-label">The answer</span>
                  <span className="pretest-reveal-answer">{pretestReveal.answer}</span>
                </span>
              </div>
              <p className="pretest-reveal-text">
                {pretestReveal.spotOn
                  ? 'Great intuition — your first guess was already close.'
                  : 'See how far your starting intuition was from the truth? That gap is the lesson.'}
              </p>
            </>
          )}
        </div>
      )}

      {cleared && nextLesson && (
        <>
          <div className="completion-next">
            <span className="completion-next-label">Up next</span>
            <span className="completion-next-title">{nextLesson.title}</span>
            <span className="completion-next-concept">{nextLesson.concept}</span>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={onNext}>
            Start {nextLesson.title}
          </button>
        </>
      )}
      {cleared && !nextLesson && (
        <p className="completion-summary">
          You&rsquo;ve cleared every available lesson. More are coming soon.
        </p>
      )}

      {/* A completed lesson can always be revisited (read-only) or retaken fresh. */}
      <button type="button" className="btn btn-block" onClick={onReview}>
        Review lesson
      </button>
      <button
        type="button"
        className={`btn btn-block ${cleared && nextLesson ? '' : 'btn-primary'}`}
        onClick={onRetry}
      >
        {mastered ? 'Retake lesson' : cleared ? 'Retry for mastery' : 'Retry lesson'}
      </button>

      <button type="button" className="btn btn-ghost" onClick={onBackToCourse}>
        Back to course
      </button>
    </div>
  );
}
