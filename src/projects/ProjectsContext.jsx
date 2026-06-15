import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { useCharts } from '../context/ChartContext';
import { makeDefaultPayload } from '../context/defaultCharts';
import { localizeTemplatePayload } from './templates';
import {
  cloudListProjects,
  cloudLoadProject,
  cloudCreateProject,
  cloudUpdateProject,
  cloudDeleteProject,
} from './cloud-storage';
import { loadLocalProject, saveLocalProject } from './local-storage';

const AUTOSAVE_DEBOUNCE_MS = 700;

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const { t } = useTranslation();
  const { user, loading: authLoading, supabaseConfigured } = useAuth();
  const {
    analysisTitle,
    analysisDescription,
    charts,
    comparisons,
    loadProject,
    serializeProject,
    loadEpoch,
  } = useCharts();

  const [projectList, setProjectList] = useState([]);
  const [activeId, setActiveId] = useState(null);
  // 'idle' | 'saving' | 'saved' | 'error' | 'offline'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastError, setLastError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Suppress autosave for one debounce window after a loadProject() so we
  // don't immediately re-write the row we just pulled.
  const suppressUntilRef = useRef(0);
  const lastSeenEpochRef = useRef(loadEpoch);
  const debounceRef = useRef(null);
  const activeIdRef = useRef(null);
  const userIdRef = useRef(null);
  // React StrictMode runs effects twice in dev. Track the user we've already
  // bootstrapped for so we don't seed two duplicate "first" projects.
  const bootstrappedForRef = useRef(null);
  // True once we've cloud-bootstrapped at least once this session. Used to tell
  // a fresh signed-out page load (hydrate from localStorage) apart from a
  // cloud→local transition on sign-out (keep the editor as-is).
  const everCloudBootstrappedRef = useRef(false);
  // Guards the one-time hydrate of the editor from localStorage in local mode.
  const localHydratedRef = useRef(false);

  const recordError = useCallback((label, err) => {
    const msg = err?.message || err?.error_description || String(err);
    const code = err?.code ? ` [code ${err.code}]` : '';
    const hint = err?.hint ? ` — hint: ${err.hint}` : '';
    const detail = err?.details ? ` — ${err.details}` : '';
    console.error(`${label}:`, err);

    // PGRST205 = PostgREST can't find the table in its schema cache. Almost
    // always means the doxa_charts table was never created in Supabase. Show
    // a clear setup hint instead of the raw PostgREST message.
    if (err?.code === 'PGRST205' || /Could not find the table/i.test(msg)) {
      setLastError(
        'Supabase table public.doxa_charts is missing. Open Supabase → SQL editor and run the schema in supabase/schema.sql to create it.'
      );
    } else {
      setLastError(`${label}: ${msg}${code}${hint}${detail}`);
    }
    setSyncStatus('error');
  }, []);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user]);

  // ---- Bootstrap (cloud when signed in, otherwise local) -------------------
  useEffect(() => {
    // LOCAL MODE: no signed-in user (Supabase unconfigured, or signed out).
    if (!supabaseConfigured || !user) {
      // While Supabase auth is still resolving we don't yet know whether a
      // session exists — wait so we don't flash local content over a cloud
      // project that's about to load.
      if (supabaseConfigured && authLoading) return;

      setProjectList([]);
      setActiveId(null);
      setSyncStatus(supabaseConfigured ? 'local' : 'offline');
      bootstrappedForRef.current = null; // let a future sign-in re-bootstrap

      // Hydrate the editor from localStorage exactly once, and only on a real
      // signed-out page load — never when transitioning cloud→local on sign
      // out, which would clobber the work currently in the editor.
      if (!localHydratedRef.current && !everCloudBootstrappedRef.current) {
        localHydratedRef.current = true;
        const saved = loadLocalProject();
        if (saved) {
          suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
          loadProject(saved);
        }
      }
      return;
    }

    // CLOUD MODE: signed in.
    // StrictMode invokes this twice in dev; only run once per user id.
    if (bootstrappedForRef.current === user.id) return;
    bootstrappedForRef.current = user.id;
    everCloudBootstrappedRef.current = true;

    // Don't cancel on cleanup. Cancelling caused two problems:
    //   1. StrictMode double-mounts cleanup the first invocation; the second
    //      sees the StrictMode guard and skips, leaving state stuck at "saving"
    //      because the original setState calls were bailed by cancelled=true.
    //   2. In production it just wastes a fetch.
    // Instead, after each await we compare userIdRef to the captured id —
    // setState only happens if the user we're loading for is still active.
    const expectedUserId = user.id;
    const stillCurrent = () => userIdRef.current === expectedUserId;

    (async () => {
      setSyncStatus('saving');
      setLastError('');
      try {
        const list = await cloudListProjects(expectedUserId);
        if (!stillCurrent()) return;

        if (list.length === 0) {
          // Seed first project from current in-memory state. Suppress the
          // 700ms post-mount autosave: serializeProject() at this moment IS
          // exactly what we just wrote, so re-writing would be wasted work.
          const payload = serializeProject();
          const created = await cloudCreateProject(expectedUserId, payload.title || t('common.untitledProject'), payload);
          if (!stillCurrent()) return;
          suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
          setProjectList([created]);
          setActiveId(created.id);
          setSyncStatus('saved');
        } else {
          // Open the most recent project (list is already sorted desc).
          const top = list[0];
          const full = await cloudLoadProject(top.id);
          if (!stillCurrent()) return;
          suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
          loadProject(full.payload || {});
          setProjectList(list);
          setActiveId(top.id);
          setSyncStatus('saved');
        }
      } catch (err) {
        if (stillCurrent()) recordError('Project bootstrap failed', err);
      }
    })();
    // We deliberately depend only on user identity (+ auth-loading, to know
    // when "no user" is final); loadProject/serializeProject are stable enough
    // and re-running bootstrap on every charts change is wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabaseConfigured, authLoading]);

  // Track loadProject epoch — bump means suppress next autosave window.
  useEffect(() => {
    if (loadEpoch !== lastSeenEpochRef.current) {
      lastSeenEpochRef.current = loadEpoch;
      suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
    }
  }, [loadEpoch]);

  // ---- Debounced autosave (cloud when signed in, else localStorage) --------
  useEffect(() => {
    // Wait until auth has settled so we don't write the empty default over a
    // localStorage project that's about to be hydrated.
    if (supabaseConfigured && authLoading) return;
    // Signed in but the project bootstrap hasn't produced an activeId yet.
    if (user && !activeId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (Date.now() < suppressUntilRef.current) return;
      const payload = serializeProject();
      const uid = userIdRef.current;
      const id = activeIdRef.current;

      // LOCAL MODE: persist to the browser, no network.
      if (!uid) {
        saveLocalProject(payload);
        setSyncStatus(supabaseConfigured ? 'local' : 'offline');
        return;
      }

      // CLOUD MODE.
      if (!id) return;
      setSyncStatus('saving');
      try {
        const updated = await cloudUpdateProject(id, uid, {
          title: payload.title || t('common.untitledProject'),
          payload,
        });
        setProjectList(prev => {
          const next = prev.map(p =>
            p.id === id ? { ...p, title: updated.title, updated_at: updated.updated_at } : p
          );
          // Re-sort so most-recent floats to top.
          next.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
          return next;
        });
        setSyncStatus('saved');
      } catch (err) {
        recordError('Autosave failed', err);
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [analysisTitle, analysisDescription, charts, comparisons, activeId, user, authLoading, supabaseConfigured, serializeProject, recordError, t]);

  // ---- Actions -------------------------------------------------------------
  const openProject = useCallback(async (id) => {
    if (!user) return;
    setSyncStatus('saving');
    try {
      const full = await cloudLoadProject(id);
      suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
      loadProject(full.payload || {});
      setActiveId(id);
      setSyncStatus('saved');
      setModalOpen(false);
    } catch (err) {
      recordError('Open project failed', err);
    }
  }, [user, loadProject, recordError]);

  const newProject = useCallback(async () => {
    const seedPayload = makeDefaultPayload(t('common.untitledProject'));
    // LOCAL MODE: load into the editor and persist to the browser immediately
    // (don't wait for the debounced autosave, so a refresh keeps it).
    if (!user) {
      loadProject(seedPayload);
      saveLocalProject(seedPayload);
      setSyncStatus(supabaseConfigured ? 'local' : 'offline');
      setModalOpen(false);
      return;
    }
    setSyncStatus('saving');
    setLastError('');
    try {
      const created = await cloudCreateProject(user.id, seedPayload.title, seedPayload);
      suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
      loadProject(seedPayload);
      setProjectList(prev => [created, ...prev]);
      setActiveId(created.id);
      setSyncStatus('saved');
      setModalOpen(false);
    } catch (err) {
      recordError('New project failed', err);
    }
  }, [user, supabaseConfigured, loadProject, recordError, t]);

  const newProjectFromTemplate = useCallback(async (template) => {
    if (!template) return;
    const seedPayload = localizeTemplatePayload(template, t);
    // LOCAL MODE: fabricate the template into the editor and persist locally.
    if (!user) {
      loadProject(seedPayload);
      saveLocalProject(seedPayload);
      setSyncStatus(supabaseConfigured ? 'local' : 'offline');
      setModalOpen(false);
      return;
    }
    setSyncStatus('saving');
    setLastError('');
    try {
      const created = await cloudCreateProject(user.id, seedPayload.title, seedPayload);
      suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
      loadProject(seedPayload);
      setProjectList(prev => [created, ...prev]);
      setActiveId(created.id);
      setSyncStatus('saved');
      setModalOpen(false);
    } catch (err) {
      recordError('New project from template failed', err);
    }
  }, [user, supabaseConfigured, loadProject, recordError, t]);

  const deleteProject = useCallback(async (id) => {
    if (!user) return;
    try {
      await cloudDeleteProject(id, user.id);
      setProjectList(prev => {
        const next = prev.filter(p => p.id !== id);
        // If we just removed the active project, switch to the next one or
        // create a blank to keep the editor populated.
        if (id === activeIdRef.current) {
          if (next.length > 0) {
            openProject(next[0].id);
          } else {
            setActiveId(null);
            newProject();
          }
        }
        return next;
      });
    } catch (err) {
      recordError('Delete project failed', err);
    }
  }, [user, openProject, newProject, recordError]);

  const renameProject = useCallback(async (id, title) => {
    if (!user || !title.trim()) return;
    try {
      const updated = await cloudUpdateProject(id, user.id, { title: title.trim() });
      setProjectList(prev =>
        prev.map(p => p.id === id ? { ...p, title: updated.title, updated_at: updated.updated_at } : p)
      );
    } catch (err) {
      recordError('Rename project failed', err);
    }
  }, [user, recordError]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const dismissError = useCallback(() => {
    setLastError('');
    if (syncStatus === 'error') setSyncStatus('idle');
  }, [syncStatus]);

  const retryBootstrap = useCallback(() => {
    // Drop the StrictMode guard so the bootstrap effect runs again.
    bootstrappedForRef.current = null;
    setLastError('');
    setSyncStatus('idle');
    // Touch the user dep by forcing a no-op state change; simpler: re-trigger
    // by toggling activeId — but that loses the active project. Instead, just
    // manually re-run the bootstrap body inline.
    if (!user) return;
    (async () => {
      setSyncStatus('saving');
      try {
        const list = await cloudListProjects(user.id);
        setProjectList(list);
        if (list.length > 0 && !activeIdRef.current) {
          const full = await cloudLoadProject(list[0].id);
          suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
          loadProject(full.payload || {});
          setActiveId(list[0].id);
        }
        setSyncStatus('saved');
      } catch (err) {
        recordError('Retry failed', err);
      }
    })();
  }, [user, loadProject, recordError]);

  return (
    <ProjectsContext.Provider
      value={{
        projectList,
        activeId,
        syncStatus,
        lastError,
        modalOpen,
        openProject,
        newProject,
        newProjectFromTemplate,
        deleteProject,
        renameProject,
        openModal,
        closeModal,
        dismissError,
        retryBootstrap,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within a ProjectsProvider');
  return ctx;
}
