import { useState } from 'react';
import type { ReactNode } from 'react';
import { lessons } from '../content/lessons';
import { lessonState, lessonProgressFraction } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate, currentPath } from '../lib/router';
import LessonIcon, { LockIcon } from './LessonIcon';
import Logo from './Logo';
import ProgressRing from './ProgressRing';
import ProfileMenu from './ProfileMenu';

interface Props {
  activeLessonId: string | null;
  children: ReactNode;
}

export default function AppLayout({ activeLessonId, children }: Props) {
  const progress = useProgress();
  const [unlockAll] = useUnlockAll();
  const [navOpen, setNavOpen] = useState(false);
  const path = currentPath();

  function go(path: string) {
    setNavOpen(false);
    navigate(path);
  }

  return (
    <div className={`layout ${navOpen ? 'nav-open' : ''}`}>
      <header className="topbar">
        <button
          type="button"
          className="hamburger"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Toggle lesson menu"
        >
          <span />
          <span />
          <span />
        </button>
        <button type="button" className="brand-link" onClick={() => go('/learn')}>
          <Logo size={32} className="brand-mark" />
          <span className="brand-text">The Long Run</span>
        </button>
        <div className="topbar-actions">
          <ProfileMenu />
        </div>
      </header>

      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className="sidebar">
        <p className="sidebar-label">Course</p>
        <button
          type="button"
          className={`nav-home ${path === '/learn' ? 'active' : ''}`}
          onClick={() => go('/learn')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`nav-home ${path === '/sandbox' ? 'active' : ''}`}
          onClick={() => go('/sandbox')}
        >
          Sandbox
        </button>
        <p className="sidebar-label">Lessons</p>
        <nav className="nav-list">
          {lessons.map((lesson) => {
            const state = lessonState(lesson, progress.all, unlockAll);
            const locked = state === 'locked';
            const frac = lessonProgressFraction(lesson, progress.all);
            const active = lesson.id === activeLessonId;
            const ringColor =
              state === 'mastered'
                ? 'var(--good)'
                : state === 'cleared'
                  ? 'var(--accent-2)'
                  : 'var(--accent)';
            return (
              <button
                key={lesson.id}
                type="button"
                className={`nav-item ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                disabled={locked}
                onClick={() => !locked && go(`/learn/${lesson.id}`)}
              >
                <LessonIcon lessonId={lesson.id} size={20} tile />
                <span className="nav-text">
                  <span className="nav-title">{lesson.title}</span>
                  <span className="nav-sub">{lesson.concept}</span>
                </span>
                {locked ? (
                  <LockIcon size={15} className="nav-lock" />
                ) : (
                  <ProgressRing
                    value={state === 'mastered' ? 1 : frac}
                    size={24}
                    stroke={3}
                    color={ringColor}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
