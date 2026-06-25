import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { navigate } from '../lib/router';
import Logo from '../components/Logo';

/** The Google "G" mark, inline so it themes cleanly and ships no extra asset. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/** Turn a raw Firebase/auth error into a short, human message. */
function friendlyAuthError(message: string): string {
  if (/operation-not-allowed/i.test(message)) return 'Google sign-in is not enabled for this app yet.';
  if (/unauthorized-domain/i.test(message)) return 'This domain is not authorized for Google sign-in.';
  if (/popup-blocked/i.test(message)) return 'Your browser blocked the sign-in popup. Allow popups and try again.';
  if (/account-exists-with-different-credential/i.test(message)) {
    return 'An account already exists with this email. Sign in with your email and password.';
  }
  if (/network-request-failed/i.test(message)) return 'Network error — check your connection and try again.';
  // Strip Firebase's "Firebase: " prefix and trailing "(auth/...)" code noise.
  return message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/i, '').trim() || 'Something went wrong.';
}

export default function LoginPage() {
  const { user, signIn, signUp, signInWithGoogle, backendKind } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate('/');
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(name, email, password);
      else await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      // A user closing/cancelling the popup isn't an error worth shouting about.
      if (!/popup-closed-by-user|cancelled-popup-request/i.test(message)) {
        setError(friendlyAuthError(message));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Logo size={56} className="auth-emblem" />
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
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-or">
          <span>or</span>
        </div>

        <button type="button" className="btn btn-block btn-google" onClick={google} disabled={busy}>
          <GoogleIcon />
          Continue with Google
        </button>

        {error && <p className="auth-error">{error}</p>}

        <p className="auth-note">
          {backendKind === 'firebase'
            ? 'Cloud sync on — your account and progress follow you across devices.'
            : 'Local mode — accounts and progress are stored on this device.'}
        </p>
      </div>
    </div>
  );
}
