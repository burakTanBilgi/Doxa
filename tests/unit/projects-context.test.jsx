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
});

describe('ProjectsContext bootstrap', () => {
  it('signed-out: status is idle, no remote calls made', async () => {
    authState.user = null;
    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('idle'));
    expect(cloudMocks.cloudListProjects).not.toHaveBeenCalled();
  });

  it('unconfigured: status is offline, no remote calls made', async () => {
    authState.supabaseConfigured = false;
    const { result } = renderHook(() => useProjects(), { wrapper: wrap });
    await waitFor(() => expect(result.current.syncStatus).toBe('offline'));
    expect(cloudMocks.cloudListProjects).not.toHaveBeenCalled();
  });

  it('signed-in with empty list: seeds a new project from current in-memory state', async () => {
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
    // Seeded with the default charts so a new account isn't an empty canvas.
    expect(payload.charts.length).toBeGreaterThan(0);
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
  it('creates a project seeded with the default charts (not empty)', async () => {
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
    // The default Big Five / Social Dynamics / Ayran charts should be present.
    expect(payload.charts.length).toBeGreaterThanOrEqual(3);
    expect(payload.charts[0].data[0]).toHaveProperty('subject');
    expect(result.current.activeId).toBe('fresh');
  });
});
