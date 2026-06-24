import { useState } from 'react';
import type { ReactNode } from 'react';
import { lessons, finalTest } from '../content/lessons';
import { lessonState, allLessonsCleared } from '../store/progress';
import { useProgress } from '../hooks/useProgress';
import { useUnlockAll } from '../hooks/useUnlockAll';
import { navigate, currentPath } from '../lib/router';
import LessonIcon, { LockIcon } from './LessonIcon';
import Logo from './Logo';
import ProfileMenu from './ProfileMenu';
import ThemeToggle from './ThemeToggle';

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
        <button type="button" className="brand-link" onClick={() => go('/')}>
          <Logo size={32} className="brand-mark" />
          <span className="brand-text">The Long Run</span>
        </button>
        <div className="topbar-actions">
          <ThemeToggle />
          <ProfileMenu />
        </div>
      </header>

      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}

      <aside className="sidebar">
        <p className="sidebar-label">Course</p>
        <button
          type="button"
          className={`nav-home ${path === '/' ? 'active' : ''}`}
          onClick={() => go('/')}
        >
          Home
        </button>
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
            const active = lesson.id === activeLessonId;
            const started =
              active || state === 'mastered' || state === 'cleared' || state === 'in-progress';
            return (
              <button
                key={lesson.id}
                type="button"
                className={`nav-item ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
                disabled={locked}
                onClick={() => !locked && go(`/learn/${lesson.id}`)}
              >
                <LessonIcon lessonId={lesson.id} size={20} colored={!active} tile />
                <span className="nav-text">
                  <span className="nav-title">{lesson.title}</span>
                  <span className="nav-sub">{lesson.concept}</span>
                </span>
                <span className={`nav-dot ${started ? 'on' : ''}`} aria-hidden />
              </button>
            );
          })}
        </nav>

        <p className="sidebar-label">Exam</p>
        {(() => {
          const testUnlocked = unlockAll || allLessonsCleared(lessons, progress.all);
          return (
            <button
              type="button"
              className={`nav-item ${path === '/test' ? 'active' : ''} ${testUnlocked ? '' : 'locked'}`}
              disabled={!testUnlocked}
              onClick={() => testUnlocked && go('/test')}
            >
              <LessonIcon lessonId={finalTest.id} size={20} tile />
              <span className="nav-text">
                <span className="nav-title">{finalTest.title}</span>
                <span className="nav-sub">{finalTest.concept}</span>
              </span>
              {!testUnlocked && <LockIcon size={15} className="nav-lock" />}
            </button>
          );
        })()}
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
