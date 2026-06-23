import type { Lesson } from '../types/lesson';

interface Props {
  lesson: Lesson;
  problemsSolved: number;
  nextLesson: Lesson | null;
  onNext: () => void;
  onBackToCourse: () => void;
}

export default function CompletionScreen({
  lesson,
  problemsSolved,
  nextLesson,
  onNext,
  onBackToCourse,
}: Props) {
  return (
    <div className="completion">
      <div className="completion-badge" aria-hidden>
        {'\u2713'}
      </div>
      <h2>Lesson mastered</h2>
      <p className="completion-lesson">{lesson.title}</p>
      <p className="completion-summary">
        You solved all {problemsSolved} problems in this lesson.
      </p>
      {nextLesson ? (
        <>
          <div className="completion-next">
            <span className="completion-next-label">Up next</span>
            <span className="completion-next-title">{nextLesson.title}</span>
            <span className="completion-next-concept">{nextLesson.concept}</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Start {nextLesson.title}
          </button>
        </>
      ) : (
        <p className="completion-summary">
          You&rsquo;ve mastered every available lesson. More are coming soon.
        </p>
      )}
      <button type="button" className="btn btn-ghost" onClick={onBackToCourse}>
        Back to course
      </button>
    </div>
  );
}
