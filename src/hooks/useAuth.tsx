import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { backend } from '../lib/backend';
import type { AuthUser } from '../lib/storage';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  backendKind: 'firebase' | 'local';
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = backend.auth.onChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      backendKind: backend.kind,
      signUp: async (name, email, password) => {
        await backend.auth.signUp(name, email, password);
      },
      signIn: async (email, password) => {
        await backend.auth.signIn(email, password);
      },
      signOut: async () => {
        await backend.auth.signOut();
      },
    }),
    [user, loading],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
