import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { CourseSection } from '../types/lesson';
import type { ProgressMap } from '../lib/storage';
import { lessons, sections, finalTest } from '../content/lessons';
import { lessonState, sectionState, allLessonsCleared } from '../store/progress';
import { dueCount } from '../store/review';
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

function SidebarSection({
  section,
  activeLessonId,
  all,
  unlockAll,
  go,
}: {
  section: CourseSection;
  activeLessonId: string | null;
  all: ProgressMap;
  unlockAll: boolean;
  go: (path: string) => void;
}) {
  const sState = sectionState(section, all, unlockAll);
  const locked = sState === 'locked';
  const hasActive = section.lessons.some((l) => l.id === activeLessonId);
  // Auto-open when this section holds the active lesson; the parent keys this
  // component on `hasActive` so it remounts (with this fresh initial state)
  // rather than calling setState in an effect.
  const [open, setOpen] = useState(hasActive || sState === 'in-progress' || sState === 'available');

  if (section.lessons.length === 0) {
    return (
      <div className="nav-group">
        <div className="nav-group-head is-soon">
          <span className="nav-group-title">{section.title}</span>
          <span className="nav-soon">Soon</span>
        </div>
      </div>
    );
  }

  return (
    <div className="nav-group" style={{ '--section-accent': section.accent } as CSSProperties}>
      <button
        type="button"
        className={`nav-group-head ${locked ? 'is-locked' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`nav-caret ${open ? 'open' : ''}`} aria-hidden>
          ▸
        </span>
        <span className="nav-group-title">{section.title}</span>
        {locked && <LockIcon size={13} className="nav-group-lock" />}
      </button>
      {open && (
        <nav className="nav-list">
          {section.lessons.map((lesson) => {
            const state = lessonState(lesson, all, unlockAll);
            const isLocked = state === 'locked';
            const active = lesson.id === activeLessonId;
            const started =
              active || state === 'mastered' || state === 'cleared' || state === 'in-progress';
            return (
              <button
                key={lesson.id}
                type="button"
                className={`nav-item ${active ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                disabled={isLocked}
                onClick={() => !isLocked && go(`/learn/${lesson.id}`)}
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
      )}
    </div>
  );
}

export default function AppLayout({ activeLessonId, children }: Props) {
  const progress = useProgress();
  const [unlockAll] = useUnlockAll();
  const [navOpen, setNavOpen] = useState(false);
  const path = currentPath();

  function go(target: string) {
    setNavOpen(false);
    navigate(target);
  }

  const testUnlocked = unlockAll || allLessonsCleared(lessons, progress.all);
  const reviewsDue = dueCount(progress.stats, lessons, progress.all, new Date().getTime());

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
          All units
        </button>
        <button
          type="button"
          className={`nav-home ${path === '/sandbox' ? 'active' : ''}`}
          onClick={() => go('/sandbox')}
        >
          Sandbox
        </button>
        <button
          type="button"
          className={`nav-home ${path === '/arcade' ? 'active' : ''}`}
          onClick={() => go('/arcade')}
        >
          Arcade
        </button>
        <button
          type="button"
          className={`nav-home nav-home-badged ${path === '/practice' ? 'active' : ''}`}
          onClick={() => go('/practice')}
        >
          Mixed Practice
          {reviewsDue > 0 && (
            <span className="nav-due-badge" aria-label={`${reviewsDue} due`}>
              {reviewsDue}
            </span>
          )}
        </button>

        <p className="sidebar-label">Units</p>
        <div className="nav-sections">
          {sections.map((section) => (
            <SidebarSection
              key={`${section.id}${section.lessons.some((l) => l.id === activeLessonId) ? '-active' : ''}`}
              section={section}
              activeLessonId={activeLessonId}
              all={progress.all}
              unlockAll={unlockAll}
              go={go}
            />
          ))}
        </div>

        <p className="sidebar-label">Exam</p>
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
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
