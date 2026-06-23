import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProgress } from '../hooks/useProgress';
import { useTheme } from '../hooks/useTheme';
import { lessons } from '../content/lessons';
import { courseStats } from '../store/progress';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileMenu() {
  const { user, signOut } = useAuth();
  const progress = useProgress();
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = user?.name || 'Learner';
  const stats = courseStats(lessons, progress.all);
  const { currentStreak, longestStreak } = progress.stats;

  const statItems = [
    { value: currentStreak, label: 'Day streak' },
    { value: longestStreak, label: 'Best streak' },
    { value: `${stats.lessonsMastered}/${stats.lessonsBuilt}`, label: 'Lessons mastered' },
    { value: stats.problemsSolved, label: 'Problems solved' },
    { value: stats.questionsAnswered, label: 'Questions answered' },
    { value: `${Math.round(stats.masteryFraction * 100)}%`, label: 'Course mastery' },
  ];

  return (
    <div className="profile" ref={ref}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <span className="avatar" aria-hidden>
          {initials(name)}
        </span>
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          <div className="profile-head">
            <span className="avatar avatar-lg" aria-hidden>
              {initials(name)}
            </span>
            <div className="profile-id">
              <span className="profile-name">{name}</span>
              {user?.email && <span className="profile-email">{user.email}</span>}
            </div>
          </div>

          <div className="profile-stats">
            {statItems.map((s) => (
              <div className="pstat" key={s.label}>
                <span className="pstat-value">{s.value}</span>
                <span className="pstat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="profile-row">
            <span className="profile-row-label">Appearance</span>
            <div className="theme-seg" role="group" aria-label="Theme">
              <button
                type="button"
                className={`theme-opt ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                ☀ Light
              </button>
              <button
                type="button"
                className={`theme-opt ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                ☾ Dark
              </button>
            </div>
          </div>

          <button
            type="button"
            className="menu-signout"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
