import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAuth } from './AuthProvider';

const ACCENT = '#c73a3a';

// The sign-in card. Rendered inside <LoginModal/> as an optional overlay —
// sign-in is not required to use the app. When `onClose` is supplied a close
// button is shown and the card can be dismissed.
export default function LoginScreen({ onClose }) {
  const { t } = useTranslation();
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
    // On success the browser redirects to Google, so leave `busy` set.
    if (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('auth.credentialsRequired'));
      return;
    }
    setBusy(true);
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const { data, error: err } = await fn(trimmedEmail, password);
    if (err) {
      setError(err.message);
    } else if (mode === 'signup' && !data?.session) {
      setInfo(t('auth.confirmEmail'));
    }
    setBusy(false);
  };

  return (
    <div
      className="relative w-full max-w-sm rounded-2xl p-7"
      style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d' }}
    >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/30 transition-colors"
            style={{ color: '#888888' }}
          >
            <X size={16} />
          </button>
        )}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Doxa" className="h-10 w-auto rounded-lg mb-2" />
          <h1 className="text-xl font-bold tracking-tight font-cinzel" style={{ color: '#d0d0d0' }}>
            Doxa
          </h1>
          <p className="text-xs mt-1" style={{ color: '#888888' }}>
            {t('auth.tagline')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-50"
          style={{ backgroundColor: '#ffffff', color: '#1a1a1a' }}
        >
          <GoogleGlyph />
          <span>{t('auth.continueWithGoogle')}</span>
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ backgroundColor: '#3d3d3d' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#666666' }}>
            {t('auth.dividerOr')}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#3d3d3d' }} />
        </div>

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
            required
            placeholder={t('auth.email')}
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
            required
            minLength={6}
            placeholder={t('auth.password')}
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
            {busy ? t('auth.working') : mode === 'signin' ? t('auth.signIn') : t('auth.createAccount')}
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
          {mode === 'signin' ? t('auth.toSignup') : t('auth.toSignin')}
        </button>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h5.9c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.93 3.24-4.77 3.24-8.3z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.26 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.46 2.16 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
