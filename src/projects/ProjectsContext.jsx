import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useCharts } from '../context/ChartContext';
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
  const [modalOpen, setModalOpen] = useState(false);

  // Suppress autosave for one debounce window after a loadProject() so we
  // don't immediately re-write the row we just pulled.
  const suppressUntilRef = useRef(0);
  const lastSeenEpochRef = useRef(loadEpoch);
  const debounceRef = useRef(null);
  const activeIdRef = useRef(null);
  const userIdRef = useRef(null);

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
      return;
    }

    let cancelled = false;
    (async () => {
      setSyncStatus('saving');
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
        console.error('Project bootstrap failed:', err);
        if (!cancelled) setSyncStatus('error');
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
        console.error('Autosave failed:', err);
        setSyncStatus('error');
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
      console.error('Open project failed:', err);
      setSyncStatus('error');
    }
  }, [user, loadProject]);

  const newProject = useCallback(async () => {
    if (!user) return;
    const blankPayload = {
      doxa_version: '1.0',
      title: 'Untitled Project',
      description: '',
      charts: [],
      comparisons: [],
      compareSelection: [],
    };
    setSyncStatus('saving');
    try {
      const created = await cloudCreateProject(user.id, 'Untitled Project', blankPayload);
      suppressUntilRef.current = Date.now() + AUTOSAVE_DEBOUNCE_MS * 2;
      loadProject(blankPayload);
      setProjectList(prev => [created, ...prev]);
      setActiveId(created.id);
      setSyncStatus('saved');
      setModalOpen(false);
    } catch (err) {
      console.error('New project failed:', err);
      setSyncStatus('error');
    }
  }, [user, loadProject]);

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
      console.error('Delete project failed:', err);
      setSyncStatus('error');
    }
  }, [user, openProject, newProject]);

  const renameProject = useCallback(async (id, title) => {
    if (!user || !title.trim()) return;
    try {
      const updated = await cloudUpdateProject(id, user.id, { title: title.trim() });
      setProjectList(prev =>
        prev.map(p => p.id === id ? { ...p, title: updated.title, updated_at: updated.updated_at } : p)
      );
    } catch (err) {
      console.error('Rename project failed:', err);
      setSyncStatus('error');
    }
  }, [user]);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <ProjectsContext.Provider
      value={{
        projectList,
        activeId,
        syncStatus,
        modalOpen,
        openProject,
        newProject,
        deleteProject,
        renameProject,
        openModal,
        closeModal,
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
