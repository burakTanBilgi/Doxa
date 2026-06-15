import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock auth + cloud-storage so the projects flow can be exercised in isolation
// from any real Supabase client. vi.mock is hoisted above any module-level
// `const`/`let`, so we use vi.hoisted() to make the shared handles available
// to both the factory and the test body.
const { authState, cloudMocks } = vi.hoisted(() => ({
  authState: { user: null, supabaseConfigured: true },
  cloudMocks: {
    cloudListProjects: vi.fn(),
    cloudLoadProject: vi.fn(),
    cloudCreateProject: vi.fn(),
    cloudUpdateProject: vi.fn(),
    cloudDeleteProject: vi.fn(),
  },
}));

vi.mock('../../src/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: authState.user,
    loading: false,
    supabaseConfigured: authState.supabaseConfigured,
  }),
  AuthProvider: ({ children }) => children,
}));

vi.mock('../../src/projects/cloud-storage', () => cloudMocks);

import { ChartProvider } from '../../src/context/ChartContext.jsx';
import { ProjectsProvider, useProjects } from '../../src/projects/ProjectsContext.jsx';

function wrap({ children }) {
  return (
    <ChartProvider>
      <ProjectsProvider>{children}</ProjectsProvider>
    </ChartProvider>
  );
}

beforeEach(() => {
  authState.user = { id: 'user-abc', email: 'test@example.com' };
  authState.supabaseConfigured = true;
  for (const fn of Object.values(cloudMocks)) fn.mockReset();
  // Local-first mode mirrors signed-out work to localStorage; clear it so one
  // test's local autosave can't hydrate the next. (tests/polyfills.js provides
  // a complete in-memory localStorage.)
  localStorage.clear();
});

describe('ProjectsContext bootstrap', () => {
  it('signed-out (cloud available): status is local, no remote calls made', async () => {
    // Sign-in is optional. A signed-out user works locally — no cloud calls,
    // and the sync indicator reflects browser-local persistence.
    authState.user = null;
    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('local'));
    expect(cloudMocks.cloudListProjects).not.toHaveBeenCalled();
  });

  it('unconfigured: status is offline, no remote calls made', async () => {
    authState.supabaseConfigured = false;
    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('offline'));
    expect(cloudMocks.cloudListProjects).not.toHaveBeenCalled();
  });

  it('signed-in with empty list: seeds a blank project on first sign-in', async () => {
    cloudMocks.cloudListProjects.mockResolvedValue([]);
    cloudMocks.cloudCreateProject.mockImplementation(async (uid, title) => ({
      id: 'seeded-id',
      title,
      updated_at: '2026-05-19T00:00:00Z',
    }));

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });

    await waitFor(() => expect(result.current.syncStatus).toBe('saved'));
    expect(cloudMocks.cloudCreateProject).toHaveBeenCalledTimes(1);
    const [uid, title, payload] = cloudMocks.cloudCreateProject.mock.calls[0];
    expect(uid).toBe('user-abc');
    expect(title.length).toBeGreaterThan(0);
    // A fresh account starts EMPTY — the user picks content via templates or
    // by adding charts manually.
    expect(payload.charts).toEqual([]);
    expect(payload.comparisons).toEqual([]);
    expect(result.current.activeId).toBe('seeded-id');
    expect(result.current.projectList).toEqual([{ id: 'seeded-id', title, updated_at: '2026-05-19T00:00:00Z' }]);
  });

  it('signed-in with existing list: loads the most recent project', async () => {
    cloudMocks.cloudListProjects.mockResolvedValue([
      { id: 'newer', title: 'New', updated_at: '2026-05-19T00:00:00Z' },
      { id: 'older', title: 'Old', updated_at: '2026-01-01T00:00:00Z' },
    ]);
    cloudMocks.cloudLoadProject.mockResolvedValue({
      id: 'newer', title: 'New', user_id: 'user-abc', updated_at: '2026-05-19T00:00:00Z',
      payload: {
        doxa_version: '1.0',
        title: 'Hydrated',
        description: 'from cloud',
        charts: [{
          id: 1, title: 'C', color: '#abcdef',
          data: [
            { subject: 'a', value: 1, fullMark: 100 },
            { subject: 'b', value: 2, fullMark: 100 },
            { subject: 'c', value: 3, fullMark: 100 },
          ],
        }],
        comparisons: [],
      },
    });

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });

    await waitFor(() => expect(result.current.syncStatus).toBe('saved'));
    expect(cloudMocks.cloudLoadProject).toHaveBeenCalledWith('newer');
    expect(cloudMocks.cloudCreateProject).not.toHaveBeenCalled();
    expect(result.current.activeId).toBe('newer');
  });

  it('captures the full error message when list fails', async () => {
    const err = new Error('permission denied for table doxa_charts');
    err.code = '42501';
    cloudMocks.cloudListProjects.mockRejectedValue(err);

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });

    await waitFor(() => expect(result.current.syncStatus).toBe('error'));
    expect(result.current.lastError).toMatch(/permission denied/);
  });

  it('captures the full error message when create fails (RLS rejection)', async () => {
    cloudMocks.cloudListProjects.mockResolvedValue([]);
    const err = new Error('new row violates row-level security policy for table "doxa_charts"');
    err.code = '42501';
    cloudMocks.cloudCreateProject.mockRejectedValue(err);

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });

    await waitFor(() => expect(result.current.syncStatus).toBe('error'));
    expect(result.current.lastError).toMatch(/row-level security/);
  });

  it('dismissError clears the lastError state', async () => {
    cloudMocks.cloudListProjects.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('error'));

    act(() => { result.current.dismissError(); });
    expect(result.current.lastError).toBe('');
    expect(result.current.syncStatus).not.toBe('error');
  });

  it('PGRST205 (missing table) is translated into a concrete setup instruction', async () => {
    // PostgREST returns this exact code when the table isn't in its schema
    // cache — by far the most common Doxa setup failure. The user shouldn't
    // have to interpret the raw "schema cache" wording.
    const err = Object.assign(new Error("Could not find the table 'public.doxa_charts' in the schema cache"), {
      code: 'PGRST205',
    });
    cloudMocks.cloudListProjects.mockRejectedValue(err);

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('error'));

    expect(result.current.lastError).toMatch(/public\.doxa_charts is missing/);
    expect(result.current.lastError).toMatch(/supabase\/schema\.sql/);
    expect(result.current.lastError).not.toMatch(/schema cache/i); // hide raw jargon
  });

  it('error message includes Supabase code, hint, and details when present', async () => {
    // PostgREST errors come back with all four fields. We want the user to see
    // them so they can diagnose RLS / schema / permission issues at a glance.
    const err = Object.assign(new Error('permission denied for table doxa_charts'), {
      code: '42501',
      hint: 'check your RLS policies',
      details: 'role anon cannot SELECT',
    });
    cloudMocks.cloudListProjects.mockRejectedValue(err);

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('error'));

    expect(result.current.lastError).toMatch(/permission denied/);
    expect(result.current.lastError).toMatch(/42501/);
    expect(result.current.lastError).toMatch(/check your RLS policies/);
    expect(result.current.lastError).toMatch(/role anon cannot SELECT/);
  });
});

describe('ProjectsContext.newProject', () => {
  it('creates a blank project (no seed content)', async () => {
    cloudMocks.cloudListProjects.mockResolvedValue([
      { id: 'existing', title: 'Existing', updated_at: '2026-05-19T00:00:00Z' },
    ]);
    cloudMocks.cloudLoadProject.mockResolvedValue({
      id: 'existing', title: 'Existing', user_id: 'user-abc',
      updated_at: '2026-05-19T00:00:00Z',
      payload: { doxa_version: '1.0', title: 'Existing', description: '', charts: [], comparisons: [] },
    });
    cloudMocks.cloudCreateProject.mockImplementation(async (uid, title) => ({
      id: 'fresh', title, updated_at: '2026-05-19T01:00:00Z',
    }));

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('saved'));

    await act(async () => { await result.current.newProject(); });

    expect(cloudMocks.cloudCreateProject).toHaveBeenCalledTimes(1);
    const [, , payload] = cloudMocks.cloudCreateProject.mock.calls[0];
    // Empty by design — templates are the only path to a pre-populated project.
    expect(payload.charts).toEqual([]);
    expect(payload.comparisons).toEqual([]);
    expect(result.current.activeId).toBe('fresh');
  });
});

describe('ProjectsContext.newProjectFromTemplate', () => {
  it('creates a project pre-filled from the supplied template payload', async () => {
    cloudMocks.cloudListProjects.mockResolvedValue([
      { id: 'existing', title: 'Existing', updated_at: '2026-05-19T00:00:00Z' },
    ]);
    cloudMocks.cloudLoadProject.mockResolvedValue({
      id: 'existing', title: 'Existing', user_id: 'user-abc',
      updated_at: '2026-05-19T00:00:00Z',
      payload: { doxa_version: '1.0', title: 'Existing', description: '', charts: [], comparisons: [] },
    });
    cloudMocks.cloudCreateProject.mockImplementation(async (uid, title) => ({
      id: 'from-template', title, updated_at: '2026-05-19T02:00:00Z',
    }));

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('saved'));

    const template = {
      id: 'tmpl',
      name: 'My Template',
      description: 'desc',
      payload: {
        doxa_version: '1.0',
        title: 'My Template',
        description: 'desc',
        charts: [{
          id: 1, title: 'C', color: '#abcdef',
          data: [
            { subject: 'a', value: 1, fullMark: 100 },
            { subject: 'b', value: 2, fullMark: 100 },
            { subject: 'c', value: 3, fullMark: 100 },
          ],
        }],
        comparisons: [],
        compareSelection: [],
      },
    };

    await act(async () => { await result.current.newProjectFromTemplate(template); });

    // One call for the empty-list bootstrap-then-load? No — the list returned
    // an existing row, so bootstrap loaded it instead of seeding. The only
    // create call here is for the template.
    expect(cloudMocks.cloudCreateProject).toHaveBeenCalledTimes(1);
    const [uid, title, payload] = cloudMocks.cloudCreateProject.mock.calls[0];
    expect(uid).toBe('user-abc');
    expect(title).toBe('My Template');
    expect(payload.charts).toHaveLength(1);
    expect(payload.charts[0].data[0].subject).toBe('a');
    expect(result.current.activeId).toBe('from-template');
  });

  it('is a no-op when the template arg is missing', async () => {
    cloudMocks.cloudListProjects.mockResolvedValue([
      { id: 'x', title: 'X', updated_at: '2026-05-19T00:00:00Z' },
    ]);
    cloudMocks.cloudLoadProject.mockResolvedValue({
      id: 'x', title: 'X', user_id: 'user-abc', updated_at: '2026-05-19T00:00:00Z',
      payload: { doxa_version: '1.0', title: 'X', description: '', charts: [], comparisons: [] },
    });

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('saved'));
    cloudMocks.cloudCreateProject.mockClear();

    await act(async () => { await result.current.newProjectFromTemplate(null); });
    expect(cloudMocks.cloudCreateProject).not.toHaveBeenCalled();
  });
});

describe('ProjectsContext local mode (signed out)', () => {
  beforeEach(() => { authState.user = null; });

  it('newProjectFromTemplate fabricates locally — no cloud call, persisted to localStorage', async () => {
    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('local'));

    const template = {
      id: 'tmpl', name: 'T', description: 'd',
      payload: {
        doxa_version: '1.0', title: 'T', description: 'd',
        charts: [{
          id: 1, title: 'C', color: '#abcdef',
          data: [
            { subject: 'a', value: 1, fullMark: 100 },
            { subject: 'b', value: 2, fullMark: 100 },
            { subject: 'c', value: 3, fullMark: 100 },
          ],
        }],
        comparisons: [], compareSelection: [],
      },
    };

    await act(async () => { await result.current.newProjectFromTemplate(template); });

    expect(cloudMocks.cloudCreateProject).not.toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('doxa_local_project'));
    expect(stored.charts).toHaveLength(1);
    expect(stored.charts[0].data[0].subject).toBe('a');
  });

  it('newProject resets locally — no cloud call, blank project persisted', async () => {
    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('local'));

    await act(async () => { await result.current.newProject(); });

    expect(cloudMocks.cloudCreateProject).not.toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('doxa_local_project'));
    expect(stored.charts).toEqual([]);
  });

  it('hydrates the editor from a previously saved local project', async () => {
    localStorage.setItem('doxa_local_project', JSON.stringify({
      doxa_version: '1.0', title: 'Saved Locally', description: '',
      charts: [], comparisons: [], compareSelection: [],
    }));

    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('local'));
    // No cloud round-trip happened — the project came straight from the browser.
    expect(cloudMocks.cloudListProjects).not.toHaveBeenCalled();
  });
});
