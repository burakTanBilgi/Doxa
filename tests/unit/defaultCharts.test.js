import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CHARTS,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  makeDefaultPayload,
} from '../../src/context/defaultCharts.js';

describe('DEFAULT_CHARTS', () => {
  it('has at least three charts so the radar/scatter switch is exercised', () => {
    expect(DEFAULT_CHARTS.length).toBeGreaterThanOrEqual(3);
  });

  it('every chart has id / title / color / non-empty data with the trait shape', () => {
    for (const chart of DEFAULT_CHARTS) {
      expect(chart.id).toBeDefined();
      expect(typeof chart.title).toBe('string');
      expect(chart.title.length).toBeGreaterThan(0);
      expect(chart.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Array.isArray(chart.data)).toBe(true);
      expect(chart.data.length).toBeGreaterThanOrEqual(2);
      for (const trait of chart.data) {
        expect(typeof trait.subject).toBe('string');
        expect(trait.subject.length).toBeGreaterThan(0);
        expect(typeof trait.value).toBe('number');
        expect(trait.value).toBeGreaterThanOrEqual(0);
        expect(trait.value).toBeLessThanOrEqual(100);
        expect(trait.fullMark).toBe(100);
      }
    }
  });

  it('chart ids are unique', () => {
    const ids = DEFAULT_CHARTS.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('makeDefaultPayload', () => {
  it('returns the exported payload shape including Hakoniwa fields', () => {
    const p = makeDefaultPayload();
    expect(p.doxa_version).toBe('1.0');
    expect(typeof p.title).toBe('string');
    expect(typeof p.description).toBe('string');
    expect(Array.isArray(p.charts)).toBe(true);
    expect(Array.isArray(p.comparisons)).toBe(true);
    expect(Array.isArray(p.compareSelection)).toBe(true);
  });

  it('uses the supplied title; falls back to a default when omitted', () => {
    expect(makeDefaultPayload('My Project').title).toBe('My Project');
    expect(makeDefaultPayload().title).toMatch(/Untitled Project/i);
  });

  it('description matches the module default constant', () => {
    expect(makeDefaultPayload().description).toBe(DEFAULT_DESCRIPTION);
  });

  it('returns fresh deep copies — mutating one payload must not affect another', () => {
    const a = makeDefaultPayload();
    const b = makeDefaultPayload();
    a.charts[0].title = 'mutated';
    a.charts[0].data[0].value = 999;
    expect(b.charts[0].title).not.toBe('mutated');
    expect(b.charts[0].data[0].value).not.toBe(999);
  });

  it('returns charts in the live in-memory shape Hakoniwa expects', () => {
    const p = makeDefaultPayload();
    expect(p.charts[0].data[0]).toHaveProperty('subject');
    expect(p.charts[0].data[0]).toHaveProperty('value');
    expect(p.charts[0].data[0]).toHaveProperty('fullMark');
    // NOT the export format (which renames to "traits" / "name"):
    expect(p.charts[0]).not.toHaveProperty('traits');
    expect(p.charts[0].data[0]).not.toHaveProperty('name');
  });

  it('DEFAULT_TITLE is non-empty', () => {
    expect(typeof DEFAULT_TITLE).toBe('string');
    expect(DEFAULT_TITLE.length).toBeGreaterThan(0);
  });
});
