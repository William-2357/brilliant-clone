import { useEffect } from 'react';
import { AuthProvider } from './hooks/useAuth';
import { ProgressProvider } from './hooks/useProgress';
import { useRoute, matchRoute, navigate } from './lib/router';
import AuthGuard from './components/AuthGuard';
import LoginPage from './pages/LoginPage';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
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

  const lessonMatch = matchRoute('/learn/:id', path);
  if (lessonMatch) {
    return (
      <AuthGuard>
        <LessonPage lessonId={lessonMatch.id} />
      </AuthGuard>
    );
  }

  if (path === '/learn') {
    return (
      <AuthGuard>
        <CoursePage />
      </AuthGuard>
    );
  }

  return <Redirect to="/learn" />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <div className="app-shell">
          <Routes />
        </div>
      </ProgressProvider>
    </AuthProvider>
  );
}
