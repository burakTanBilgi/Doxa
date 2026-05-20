import { describe, it, expect } from 'vitest';
import { TEMPLATES, findTemplate, cloneTemplatePayload } from '../../src/projects/templates.js';

describe('TEMPLATES', () => {
  it('exports a non-empty array of templates', () => {
    expect(Array.isArray(TEMPLATES)).toBe(true);
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });

  it('every template has the required metadata + a Hakoniwa-compatible payload', () => {
    for (const t of TEMPLATES) {
      expect(typeof t.id).toBe('string');
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe('string');

      expect(t.payload.doxa_version).toBe('1.0');
      expect(Array.isArray(t.payload.charts)).toBe(true);
      expect(t.payload.charts.length).toBeGreaterThan(0);

      for (const chart of t.payload.charts) {
        expect(typeof chart.title).toBe('string');
        expect(chart.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(chart.data.length).toBeGreaterThanOrEqual(2);
        for (const trait of chart.data) {
          expect(typeof trait.subject).toBe('string');
          expect(typeof trait.value).toBe('number');
          expect(trait.fullMark).toBe(100);
        }
      }
    }
  });

  it('template ids are unique', () => {
    const ids = TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the Character Profile template (the old default seed)', () => {
    expect(findTemplate('character-profile')).toBeTruthy();
  });

  it('findTemplate returns null for unknown ids', () => {
    expect(findTemplate('nope')).toBeNull();
  });
});

describe('cloneTemplatePayload', () => {
  it('returns deep copies — mutating the clone must not affect the source', () => {
    const t = TEMPLATES[0];
    const a = cloneTemplatePayload(t);
    const b = cloneTemplatePayload(t);
    a.charts[0].title = 'mutated';
    a.charts[0].data[0].value = 999;
    expect(b.charts[0].title).not.toBe('mutated');
    expect(b.charts[0].data[0].value).not.toBe(999);
    // Source template is untouched too.
    expect(t.payload.charts[0].title).not.toBe('mutated');
  });

  it('produces a payload usable as a Doxa project (round-trippable shape)', () => {
    const t = TEMPLATES[0];
    const clone = cloneTemplatePayload(t);
    expect(clone.doxa_version).toBe('1.0');
    expect(clone.title).toBe(t.name);
    expect(Array.isArray(clone.charts)).toBe(true);
    expect(Array.isArray(clone.comparisons)).toBe(true);
    expect(Array.isArray(clone.compareSelection)).toBe(true);
  });
});
