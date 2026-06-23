import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { navigate } from '../lib/router';

export default function LoginPage() {
  const { user, signIn, signUp, backendKind } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/learn');
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(name, email, password);
      else await signIn(email, password);
      navigate('/learn');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-emblem" aria-hidden>
          LR
        </div>
        <p className="brand">The Long Run</p>
        <h1 className="auth-title">Probability, by doing</h1>
        <p className="auth-sub">
          Predict, simulate, and watch the math reveal itself — short hands-on
          sessions for the curious adult learner.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setMode('signup')}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <input
              className="field"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}
          <input
            className="field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-note">
          {backendKind === 'firebase'
            ? 'Cloud sync on — your account and progress follow you across devices.'
            : 'Local mode — accounts and progress are stored on this device.'}
        </p>
      </div>
    </div>
  );
}
