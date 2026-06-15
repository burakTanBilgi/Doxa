import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';
import LoginScreen from './LoginScreen';

// On-demand sign-in overlay. Sign-in is optional (the app is usable signed
// out, local-first); this is opened from the navbar "Sign in" button and
// auto-closes once a session is established (see AuthProvider).
export default function LoginModal() {
  const { loginOpen, closeLogin } = useAuth();

  useEffect(() => {
    if (!loginOpen) return;
    const onEsc = (e) => e.key === 'Escape' && closeLogin();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [loginOpen, closeLogin]);

  if (!loginOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeLogin(); }}
    >
      <LoginScreen onClose={closeLogin} />
    </div>,
    document.body
  );
}
