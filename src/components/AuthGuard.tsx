import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { navigate } from '../lib/router';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [loading, user]);

  if (loading) return <div className="center-note">Loading…</div>;
  if (!user) return <div className="center-note">Redirecting…</div>;
  return <>{children}</>;
}
