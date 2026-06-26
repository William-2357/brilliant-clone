import { useEffect } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { ProgressProvider } from './hooks/useProgress';
import { useRoute, matchRoute, navigate } from './lib/router';
import AuthGuard from './components/AuthGuard';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import UnitPage from './pages/UnitPage';
import LessonPage from './pages/LessonPage';
import SandboxPage from './pages/SandboxPage';
import ArcadePage from './pages/ArcadePage';
import ProfilePage from './pages/ProfilePage';
import TestPage from './pages/TestPage';
import ProblemPage from './pages/ProblemPage';
import SimulationPage from './pages/SimulationPage';
import './App.css';

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to);
  }, [to]);
  return null;
}

function Routes() {
  const path = useRoute();

  if (path === '/login') return <LoginPage />;

  if (path === '/') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <HomePage />
        </AppLayout>
      </AuthGuard>
    );
  }

  const sectionMatch = matchRoute('/learn/section/:sectionId', path);
  if (sectionMatch) {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <UnitPage sectionId={sectionMatch.sectionId} />
        </AppLayout>
      </AuthGuard>
    );
  }

  const lessonMatch = matchRoute('/learn/:id', path);
  if (lessonMatch) {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={lessonMatch.id}>
          <LessonPage lessonId={lessonMatch.id} />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (path === '/learn') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <CoursePage />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (path === '/sandbox') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <SandboxPage />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (path === '/arcade') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <ArcadePage />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (path === '/test') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <TestPage />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (path === '/problem') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <ProblemPage />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (path === '/simulation') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <SimulationPage />
        </AppLayout>
      </AuthGuard>
    );
  }

  if (path === '/profile') {
    return (
      <AuthGuard>
        <AppLayout activeLessonId={null}>
          <ProfilePage />
        </AppLayout>
      </AuthGuard>
    );
  }

  return <Redirect to="/" />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <Routes />
      </ProgressProvider>
    </AuthProvider>
  );
}
