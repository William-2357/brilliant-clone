import { useState } from 'react';
import type { ReactNode } from 'react';
import { lessons } from '../content/lessons';
import { lessonState, lessonProgressFraction } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate } from '../lib/router';
import LessonIcon, { lessonIconColor } from './LessonIcon';
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
          <span className="brand-mark" aria-hidden>
            LR
          </span>
          <span className="brand-text">The Long Run</span>
        </button>
        <ProfileMenu />
      </header>

      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className="sidebar">
        <p className="sidebar-label">Course</p>
        <button
          type="button"
          className={`nav-home ${activeLessonId === null ? 'active' : ''}`}
          onClick={() => go('/learn')}
        >
          Overview
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
                  : lessonIconColor(lesson.id);
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
                  <span className="nav-lock" aria-hidden>
                    {'\u{1F512}'}
                  </span>
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
