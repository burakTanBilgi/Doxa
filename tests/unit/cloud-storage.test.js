import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabaseClient module that cloud-storage imports. Each test gets a
// fresh client builder so it can assert which methods were called and with
// what arguments.
let mockClient;
let mockConfigured;

vi.mock('../../src/auth/supabaseClient.js', () => ({
  get supabase() { return mockClient; },
  get supabaseConfigured() { return mockConfigured; },
}));

import {
  cloudListProjects,
  cloudLoadProject,
  cloudCreateProject,
  cloudUpdateProject,
  cloudDeleteProject,
} from '../../src/projects/cloud-storage.js';

// Build a thenable query builder that records every chained call. Each "leaf"
// (where the chain resolves) is configured per-test via the `result` getter.
function makeBuilder(result) {
  const calls = [];
  const record = (method, ...args) => calls.push({ method, args });

  const handler = {
    get(target, prop) {
      if (prop === 'then') {
        // Promise-ifying: terminal method that yields { data, error }.
        return (resolve, reject) => Promise.resolve(result.value).then(resolve, reject);
      }
      if (prop === '__calls') return calls;
      return (...args) => {
        record(prop, ...args);
        return new Proxy(target, handler);
      };
    },
  };

  const builder = new Proxy({}, handler);
  return { builder, calls };
}

function makeMockClient(builders = {}) {
  const fromCalls = [];
  return {
    from: vi.fn((table) => {
      fromCalls.push(table);
      const b = builders[table];
      if (!b) throw new Error(`no builder registered for table ${table}`);
      return b;
    }),
    fromCalls,
  };
}

beforeEach(() => {
  mockClient = null;
  mockConfigured = true;
});

describe('assertReady gate', () => {
  it('throws clearly when supabase is not configured', async () => {
    mockConfigured = false;
    mockClient = null;
    await expect(cloudListProjects('user-1')).rejects.toThrow(/not configured/i);
  });
});

describe('cloudListProjects', () => {
  it('queries doxa_charts filtered by user_id and ordered by updated_at desc', async () => {
    const result = { value: { data: [{ id: 'p1', title: 'A', updated_at: '2026-01-01' }], error: null } };
    const { builder, calls } = makeBuilder(result);
    mockClient = makeMockClient({ doxa_charts: builder });

    const rows = await cloudListProjects('user-42');

    expect(mockClient.fromCalls).toEqual(['doxa_charts']);
    expect(calls).toEqual([
      { method: 'select', args: ['id, title, updated_at'] },
      { method: 'eq', args: ['user_id', 'user-42'] },
      { method: 'order', args: ['updated_at', { ascending: false }] },
    ]);
    expect(rows).toEqual([{ id: 'p1', title: 'A', updated_at: '2026-01-01' }]);
  });

  it('returns an empty array (not null) when supabase returns null data', async () => {
    const { builder } = makeBuilder({ value: { data: null, error: null } });
    mockClient = makeMockClient({ doxa_charts: builder });
    await expect(cloudListProjects('u')).resolves.toEqual([]);
  });

  it('throws the supabase error through to the caller', async () => {
    const err = { message: 'permission denied for table doxa_charts', code: '42501' };
    const { builder } = makeBuilder({ value: { data: null, error: err } });
    mockClient = makeMockClient({ doxa_charts: builder });
    await expect(cloudListProjects('u')).rejects.toMatchObject({ message: /permission denied/ });
  });
});

describe('cloudLoadProject', () => {
  it('selects the full row (including payload + user_id) by id and uses single()', async () => {
    const row = { id: 'pid', title: 'A', payload: { charts: [] }, updated_at: 't', user_id: 'u' };
    const { builder, calls } = makeBuilder({ value: { data: row, error: null } });
    mockClient = makeMockClient({ doxa_charts: builder });

    const result = await cloudLoadProject('pid');

    expect(calls.map(c => c.method)).toEqual(['select', 'eq', 'single']);
    expect(calls[0].args[0]).toContain('payload');
    expect(calls[0].args[0]).toContain('user_id');
    expect(calls[1].args).toEqual(['id', 'pid']);
    expect(result).toEqual(row);
  });
});

describe('cloudCreateProject', () => {
  it('inserts user_id + title + payload + updated_at and selects the new row', async () => {
    const row = { id: 'new-id', title: 'Hello', updated_at: 't' };
    const { builder, calls } = makeBuilder({ value: { data: row, error: null } });
    mockClient = makeMockClient({ doxa_charts: builder });

    const payload = { doxa_version: '1.0', charts: [], comparisons: [], compareSelection: [] };
    const result = await cloudCreateProject('user-7', 'Hello', payload);

    expect(calls[0].method).toBe('insert');
    expect(calls[0].args[0]).toMatchObject({ user_id: 'user-7', title: 'Hello', payload });
    // updated_at is set on insert to defend against NOT NULL constraints.
    expect(calls[0].args[0].updated_at).toBeTypeOf('string');
    expect(new Date(calls[0].args[0].updated_at).toString()).not.toBe('Invalid Date');
    expect(calls[1].method).toBe('select');
    expect(calls[2].method).toBe('single');
    expect(result).toEqual(row);
  });

  it('surfaces RLS rejections verbatim so the user sees the real message', async () => {
    const err = {
      message: 'new row violates row-level security policy for table "doxa_charts"',
      code: '42501',
    };
    const { builder } = makeBuilder({ value: { data: null, error: err } });
    mockClient = makeMockClient({ doxa_charts: builder });

    await expect(cloudCreateProject('u', 't', {})).rejects.toMatchObject({
      message: /row-level security/,
      code: '42501',
    });
  });
});

describe('cloudUpdateProject', () => {
  it('updates with patch + auto-stamped updated_at, scoped by id AND user_id', async () => {
    const row = { id: 'pid', title: 'New', updated_at: 't' };
    const { builder, calls } = makeBuilder({ value: { data: row, error: null } });
    mockClient = makeMockClient({ doxa_charts: builder });

    await cloudUpdateProject('pid', 'user-7', { title: 'New' });

    expect(calls[0].method).toBe('update');
    expect(calls[0].args[0].title).toBe('New');
    expect(calls[0].args[0].updated_at).toBeTypeOf('string');
    // Both eq filters present — id alone would allow updating someone else's row
    // if RLS were ever misconfigured. user_id is a defense in depth.
    const eqCalls = calls.filter(c => c.method === 'eq');
    expect(eqCalls).toEqual([
      { method: 'eq', args: ['id', 'pid'] },
      { method: 'eq', args: ['user_id', 'user-7'] },
    ]);
  });
});

describe('cloudDeleteProject', () => {
  it('deletes scoped by both id and user_id', async () => {
    const { builder, calls } = makeBuilder({ value: { data: null, error: null } });
    mockClient = makeMockClient({ doxa_charts: builder });

    await cloudDeleteProject('pid', 'user-7');

    expect(calls[0].method).toBe('delete');
    const eqCalls = calls.filter(c => c.method === 'eq');
    expect(eqCalls).toEqual([
      { method: 'eq', args: ['id', 'pid'] },
      { method: 'eq', args: ['user_id', 'user-7'] },
    ]);
  });

  it('throws on supabase error', async () => {
    const err = { message: 'not found', code: '404' };
    const { builder } = makeBuilder({ value: { data: null, error: err } });
    mockClient = makeMockClient({ doxa_charts: builder });

    await expect(cloudDeleteProject('pid', 'u')).rejects.toMatchObject({ message: 'not found' });
  });
});
