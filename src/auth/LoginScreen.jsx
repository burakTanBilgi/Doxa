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
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email || !password) {
      setError(t('auth.credentialsRequired'));
      return;
    }
    setBusy(true);
    const fn = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const { data, error: err } = await fn(email, password);
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

        <form onSubmit={handleEmail} className="flex flex-col gap-3">
          <input
            type="email"
            autoComplete="email"
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
