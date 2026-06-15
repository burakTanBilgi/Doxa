import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadLocalProject,
  saveLocalProject,
  clearLocalProject,
} from '../../src/projects/local-storage.js';

describe('local-storage helpers', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(loadLocalProject()).toBeNull();
  });

  it('round-trips a project payload', () => {
    const payload = {
      doxa_version: '1.0',
      title: 'X',
      description: '',
      charts: [{ id: 1, title: 'C', color: '#abcdef', data: [] }],
      comparisons: [],
      compareSelection: [],
    };
    saveLocalProject(payload);
    expect(loadLocalProject()).toEqual(payload);
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    localStorage.setItem('doxa_local_project', '{ not valid json');
    expect(loadLocalProject()).toBeNull();
  });

  it('returns null for non-object JSON (array or primitive)', () => {
    localStorage.setItem('doxa_local_project', JSON.stringify([1, 2, 3]));
    expect(loadLocalProject()).toBeNull();
    localStorage.setItem('doxa_local_project', JSON.stringify('a string'));
    expect(loadLocalProject()).toBeNull();
  });

  it('clearLocalProject removes the stored project', () => {
    saveLocalProject({ title: 'X', charts: [] });
    clearLocalProject();
    expect(loadLocalProject()).toBeNull();
  });
});
