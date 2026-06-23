import { getLesson } from '../content/lessons';
import { lessonState } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import LessonPlayer from '../components/LessonPlayer';
import { navigate } from '../lib/router';

export default function LessonPage({ lessonId }: { lessonId: string }) {
  const progress = useProgress();
  const [unlockAll] = useUnlockAll();
  const lesson = getLesson(lessonId);

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  if (!lesson) {
    return (
      <div className="center-note">
        <p>Lesson not found.</p>
        <button type="button" className="btn" onClick={() => navigate('/learn')}>
          Back to course
        </button>
      </div>
    );
  }

  const state = lessonState(lesson, progress.all, unlockAll);
  if (state === 'locked') {
    return (
      <div className="center-note">
        <p>
          {lesson.status === 'coming-soon'
            ? `${lesson.title} is coming soon.`
            : 'Master the previous lesson to unlock this one.'}
        </p>
        <button type="button" className="btn" onClick={() => navigate('/learn')}>
          Back to course
        </button>
      </div>
    );
  }

  // Key by lesson id so navigating between lessons remounts with fresh state
  // (otherwise completion/step state from the previous lesson leaks through).
  return <LessonPlayer key={lesson.id} lesson={lesson} />;
}
