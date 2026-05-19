import { useState } from 'react';
import { useAuth } from './AuthProvider';

const ACCENT = '#c73a3a';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setBusy(true);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err.message);
    setBusy(false);
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setBusy(true);
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const { data, error: err } = await fn(email, password);
    if (err) {
      setError(err.message);
    } else if (mode === 'signup' && !data?.session) {
      setInfo('Check your inbox to confirm your email.');
    }
    setBusy(false);
  };

  return (
    <div
      className="h-screen w-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-7"
        style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d' }}
      >
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Doxa" className="h-10 w-auto rounded-lg mb-2" />
          <h1 className="text-xl font-bold tracking-tight font-cinzel" style={{ color: '#d0d0d0' }}>
            Doxa
          </h1>
          <p className="text-xs mt-1" style={{ color: '#888888' }}>
            Sign in to sync your projects
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #3d3d3d',
            color: '#d0d0d0',
          }}
        >
          <GoogleGlyph />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: '#3d3d3d' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#666666' }}>
            or
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#3d3d3d' }} />
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #3d3d3d',
              color: '#d0d0d0',
            }}
          />
          <input
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #3d3d3d',
              color: '#d0d0d0',
            }}
          />
          <button
            type="submit"
            disabled={busy}
            className="py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50"
            style={{ backgroundColor: ACCENT, color: '#ffffff' }}
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {error && (
          <p className="text-xs mt-3 text-center" style={{ color: ACCENT }}>
            {error}
          </p>
        )}
        {info && (
          <p className="text-xs mt-3 text-center" style={{ color: '#6bbf6b' }}>
            {info}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
            setInfo('');
          }}
          className="block mx-auto mt-5 text-xs hover:underline"
          style={{ color: '#888888' }}
        >
          {mode === 'signin'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 2.9l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-16c0-1 .1-2 .1-3 0-1.5-.1-3-.3-4.5Z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7A20 20 0 0 0 6.3 14.7Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C41 35.5 44 30.2 44 24c0-1.2-.1-2.3-.4-3.5Z"
      />
    </svg>
  );
}
