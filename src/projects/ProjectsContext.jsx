import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useCharts } from '../context/ChartContext';
import { makeDefaultPayload } from '../context/defaultCharts';
import {
  cloudListProjects,
  cloudLoadProject,
  cloudCreateProject,
  cloudUpdateProject,
  cloudDeleteProject,
} from './cloud-storage';

const AUTOSAVE_DEBOUNCE_MS = 700;

const ProjectsContext = createContext(null);

export function ProjectsProvider({ children }) {
  const { user, supabaseConfigured } = useAuth();
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

  const recordError = useCallback((label, err) => {
    const msg = err?.message || err?.error_description || String(err);
    console.error(`${label}:`, err);
    setLastError(`${label}: ${msg}`);
    setSyncStatus('error');
  }, []);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user]);

  // ---- Sign-in bootstrap ---------------------------------------------------
  useEffect(() => {
    if (!supabaseConfigured) {
      setSyncStatus('offline');
      return;
    }
    if (!user) {
      setProjectList([]);
      setActiveId(null);
      setSyncStatus('idle');
      bootstrappedForRef.current = null;
      return;
    }
    // StrictMode invokes this twice in dev; only run once per user id.
    if (bootstrappedForRef.current === user.id) return;
    bootstrappedForRef.current = user.id;

    let cancelled = false;
    (async () => {
      setSyncStatus('saving');
      setLastError('');
      try {
        const list = await cloudListProjects(user.id);
        if (cancelled) return;

        if (list.length === 0) {
          // Seed first project from current in-memory state.
          const payload = serializeProject();
          const created = await cloudCreateProject(user.id, payload.title || 'Untitled Project', payload);
          if (cancelled) return;
          setProjectList([created]);
          setActiveId(created.id);
          setSyncStatus('saved');
        } else {
          // Open the most recent project (list is already sorted desc).
          const top = list[0];
          const full = await cloudLoadProject(top.id);
          if (cancelled) return;
          suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
          loadProject(full.payload || {});
          setProjectList(list);
          setActiveId(top.id);
          setSyncStatus('saved');
        }
      } catch (err) {
        if (!cancelled) recordError('Project bootstrap failed', err);
      }
    })();

    return () => { cancelled = true; };
    // We deliberately depend only on user identity; loadProject/serializeProject
    // are stable enough and re-running bootstrap on every charts change is wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supabaseConfigured]);

  // Track loadProject epoch — bump means suppress next autosave window.
  useEffect(() => {
    if (loadEpoch !== lastSeenEpochRef.current) {
      lastSeenEpochRef.current = loadEpoch;
      suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
    }
  }, [loadEpoch]);

  // ---- Debounced autosave --------------------------------------------------
  useEffect(() => {
    if (!supabaseConfigured || !user || !activeId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (Date.now() < suppressUntilRef.current) return;
      const id = activeIdRef.current;
      const uid = userIdRef.current;
      if (!id || !uid) return;
      const payload = serializeProject();
      setSyncStatus('saving');
      try {
        const updated = await cloudUpdateProject(id, uid, {
          title: payload.title || 'Untitled Project',
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
  }, [analysisTitle, analysisDescription, charts, comparisons, activeId, user, supabaseConfigured, serializeProject]);

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
    if (!user) return;
    const seedPayload = makeDefaultPayload('Untitled Project');
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
  }, [user, loadProject, recordError]);

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
