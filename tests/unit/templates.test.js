import { describe, it, expect } from 'vitest';
import { TEMPLATES, findTemplate, localizeTemplatePayload } from '../../src/projects/templates.js';
import en from '../../src/i18n/locales/en.json';

// Minimal stand-in for i18next's `t`: resolves a dotted key against a locale
// dict, returns the key itself when missing (matching i18next's default).
function makeT(dict) {
  return (key) => {
    const v = String(key)
      .split('.')
      .reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), dict);
    return typeof v === 'string' ? v : key;
  };
}
const t = makeT(en);

describe('TEMPLATES', () => {
  it('exports a non-empty array of templates', () => {
    expect(Array.isArray(TEMPLATES)).toBe(true);
    expect(TEMPLATES.length).toBeGreaterThan(0);
  });

  it('every template has the required metadata + a Hakoniwa-compatible payload', () => {
    for (const tmpl of TEMPLATES) {
      expect(typeof tmpl.id).toBe('string');
      expect(tmpl.id.length).toBeGreaterThan(0);
      // name/description are i18n KEY strings, not text — still non-empty strings.
      expect(typeof tmpl.name).toBe('string');
      expect(tmpl.name.length).toBeGreaterThan(0);
      expect(typeof tmpl.description).toBe('string');

      expect(tmpl.payload.doxa_version).toBe('1.0');
      expect(Array.isArray(tmpl.payload.charts)).toBe(true);
      expect(tmpl.payload.charts.length).toBeGreaterThan(0);

      for (const chart of tmpl.payload.charts) {
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

  it('every template text field is an i18n key the en locale resolves', () => {
    for (const tmpl of TEMPLATES) {
      const keys = [
        tmpl.name,
        tmpl.description,
        ...tmpl.payload.charts.flatMap(c => [c.title, ...c.data.map(d => d.subject)]),
        ...tmpl.payload.comparisons.map(c => c.title),
      ];
      for (const key of keys) {
        expect(key.startsWith('templates.')).toBe(true);
        // The en locale must resolve it to something other than the key itself.
        expect(t(key)).not.toBe(key);
      }
    }
  });

  it('template ids are unique', () => {
    const ids = TEMPLATES.map(tmpl => tmpl.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the Character Profile template (the old default seed)', () => {
    expect(findTemplate('character-profile')).toBeTruthy();
  });

  it('findTemplate returns null for unknown ids', () => {
    expect(findTemplate('nope')).toBeNull();
  });
});

describe('localizeTemplatePayload', () => {
  it('returns deep copies — mutating the result must not affect the source', () => {
    const tmpl = TEMPLATES[0];
    const a = localizeTemplatePayload(tmpl, t);
    const b = localizeTemplatePayload(tmpl, t);
    a.charts[0].title = 'mutated';
    a.charts[0].data[0].value = 999;
    expect(b.charts[0].title).not.toBe('mutated');
    expect(b.charts[0].data[0].value).not.toBe(999);
    // Source template is untouched too.
    expect(tmpl.payload.charts[0].title).not.toBe('mutated');
  });

  it('resolves every i18n key to text — no unresolved "templates." keys remain', () => {
    for (const tmpl of TEMPLATES) {
      const p = localizeTemplatePayload(tmpl, t);
      const strings = [
        p.title,
        p.description,
        ...p.charts.flatMap(c => [c.title, ...c.data.map(d => d.subject)]),
        ...p.comparisons.map(c => c.title),
      ];
      for (const s of strings) {
        expect(typeof s).toBe('string');
        expect(s.startsWith('templates.')).toBe(false);
      }
    }
  });

  it('produces a payload usable as a Doxa project (round-trippable shape)', () => {
    const tmpl = TEMPLATES[0];
    const p = localizeTemplatePayload(tmpl, t);
    expect(p.doxa_version).toBe('1.0');
    expect(p.title).toBe(t(tmpl.name));
    expect(Array.isArray(p.charts)).toBe(true);
    expect(Array.isArray(p.comparisons)).toBe(true);
    expect(Array.isArray(p.compareSelection)).toBe(true);
  });
});
