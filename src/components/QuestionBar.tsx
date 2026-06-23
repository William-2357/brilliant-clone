import type { Lesson } from '../types/lesson';
import type { LessonProgress } from '../types/lesson';
import { gradableSteps } from '../content/lessons';
import { problemResult } from '../store/progress';

interface Props {
  lesson: Lesson;
  progress: LessonProgress | undefined;
  /** Id of the question currently being worked on (highlighted), if any. */
  currentId?: string;
}

/**
 * One small bar per gradable question, colored by its result:
 * green (first try), yellow (second try), red (missed), or neutral (unanswered).
 */
export default function QuestionBar({ lesson, progress, currentId }: Props) {
  const problems = gradableSteps(lesson);
  return (
    <div className="qbar" role="list" aria-label="Question results">
      {problems.map((p, i) => {
        const res = problemResult(progress, p.id);
        const cls = res ? `seg-${res}` : 'seg-todo';
        const current = currentId && p.id === currentId ? 'seg-current' : '';
        return (
          <span
            key={p.id}
            role="listitem"
            className={`qseg ${cls} ${current}`}
            title={`Question ${i + 1}${res ? `: ${res}` : ''}`}
          />
        );
      })}
    </div>
  );
}
