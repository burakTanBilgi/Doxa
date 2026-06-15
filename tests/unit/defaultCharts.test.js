import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  makeDefaultPayload,
} from '../../src/context/defaultCharts.js';

describe('makeDefaultPayload', () => {
  it('returns an empty project payload with the Hakoniwa-required fields', () => {
    const p = makeDefaultPayload();
    expect(p.doxa_version).toBe('1.0');
    expect(typeof p.title).toBe('string');
    expect(typeof p.description).toBe('string');
    expect(p.charts).toEqual([]);
    expect(p.comparisons).toEqual([]);
    expect(p.compareSelection).toEqual([]);
  });

  it('uses the supplied title; falls back to DEFAULT_TITLE when omitted', () => {
    expect(makeDefaultPayload('My Project').title).toBe('My Project');
    expect(makeDefaultPayload().title).toBe(DEFAULT_TITLE);
  });

  it('honors a non-English title argument verbatim', () => {
    // Callers pass a localized title (e.g. t('common.untitledProject')) — the
    // payload must store exactly what it was given, not transliterate it.
    expect(makeDefaultPayload('Adsız Proje').title).toBe('Adsız Proje');
  });

  it('description matches DEFAULT_DESCRIPTION', () => {
    expect(makeDefaultPayload().description).toBe(DEFAULT_DESCRIPTION);
  });

  it('returns fresh arrays — mutating one payload must not affect another', () => {
    const a = makeDefaultPayload();
    const b = makeDefaultPayload();
    a.charts.push({ id: 1 });
    a.comparisons.push({ id: 1 });
    a.compareSelection.push(1);
    expect(b.charts).toEqual([]);
    expect(b.comparisons).toEqual([]);
    expect(b.compareSelection).toEqual([]);
  });

  it('DEFAULT_TITLE is non-empty', () => {
    expect(typeof DEFAULT_TITLE).toBe('string');
    expect(DEFAULT_TITLE.length).toBeGreaterThan(0);
  });
});
