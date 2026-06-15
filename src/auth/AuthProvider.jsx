import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase, supabaseConfigured } from './supabaseClient';
import i18n, { SUPPORTED_CODES } from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  // Sign-in is optional (local-first). This drives the on-demand login modal
  // opened from the navbar, rather than a hard gate in front of the app.
  const [loginOpen, setLoginOpen] = useState(false);
  // Lets the languageChanged handler read the live user without resubscribing.
  const userRef = useRef(null);
  // Set while applying a language pulled FROM the account, so the write-back
  // handler doesn't immediately echo that value straight back to Supabase.
  const applyingRemoteRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    // A signed-in account's stored language preference wins over the local
    // browser detector on sign-in. Best-effort — never blocks or throws.
    const applyRemoteLang = (u) => {
      try {
        const lang = u?.user_metadata?.lang;
        if (!lang || !SUPPORTED_CODES.includes(lang)) return;
        if (lang === i18n.resolvedLanguage) return;
        applyingRemoteRef.current = true;
        Promise.resolve(i18n.changeLanguage(lang)).finally(() => {
          applyingRemoteRef.current = false;
        });
      } catch {
        applyingRemoteRef.current = false;
      }
    };

    let mounted = true;
    const settleLoading = () => { if (mounted) setLoading(false); };
    // Backstop: Supabase auth can hang (lock contention, an unreachable host,
    // an in-flight token refresh that never returns). Sign-in is optional, so
    // never trap the user on a loading state — fall through to signed-out
    // (local-first) mode if getSession hasn't settled in time.
    const timeoutId = setTimeout(settleLoading, 5000);

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const u = data.session?.user ?? null;
        setUser(u);
        if (u) setLoginOpen(false);
        applyRemoteLang(u);
      })
      .catch((err) => {
        // A rejected getSession() must not leave loading stuck forever.
        console.error('Supabase getSession failed:', err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        settleLoading();
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // Dismiss the optional login modal as soon as a session is established.
      if (u) setLoginOpen(false);
      applyRemoteLang(u);
    });
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  // Persist a language change to the account so it follows the user across
  // devices. Best-effort: a failed write is swallowed and never reaches the UI.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const onLanguageChanged = (lng) => {
      if (applyingRemoteRef.current) return;        // value just came FROM the account
      const u = userRef.current;
      if (!u) return;                               // only persist when signed in
      if (!SUPPORTED_CODES.includes(lng)) return;
      if (u.user_metadata?.lang === lng) return;    // already stored
      supabase.auth.updateUser({ data: { lang: lng } }).catch(() => {});
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) return { error: new Error('Supabase not configured') };
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!supabaseConfigured) return { error: new Error('Supabase not configured') };
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    if (!supabaseConfigured) return { error: new Error('Supabase not configured') };
    return supabase.auth.signUp({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    return supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginOpen,
        openLogin,
        closeLogin,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        supabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
