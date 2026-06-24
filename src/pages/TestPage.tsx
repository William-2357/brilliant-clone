import { lessons, finalTest } from '../content/lessons';
import { allLessonsCleared } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import TestPlayer from '../components/TestPlayer';
import { navigate } from '../lib/router';

export default function TestPage() {
  const progress = useProgress();
  const [unlockAll] = useUnlockAll();

  if (!progress.loaded) {
    return <div className="center-note">Loading…</div>;
  }

  const unlocked = unlockAll || allLessonsCleared(lessons, progress.all);
  if (!unlocked) {
    return (
      <div className="center-note">
        <p>Clear all eight lessons to unlock the Final Test.</p>
        <button type="button" className="btn" onClick={() => navigate('/learn')}>
          Back to course
        </button>
      </div>
    );
  }

  // Key by id so a fresh visit always remounts with clean state.
  return <TestPlayer key={finalTest.id} lesson={finalTest} />;
}
