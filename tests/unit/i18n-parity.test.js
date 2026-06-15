import { describe, it, expect } from 'vitest';
import en from '../../src/i18n/locales/en.json';
import tr from '../../src/i18n/locales/tr.json';

// Flatten a nested locale object into a sorted list of dotted leaf keys.
function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );
}

function valueAt(obj, dottedKey) {
  return dottedKey.split('.').reduce((o, p) => o[p], obj);
}

describe('locale key parity', () => {
  it('en.json and tr.json have identical key sets', () => {
    const enKeys = new Set(flatten(en));
    const trKeys = new Set(flatten(tr));
    const missingInTr = [...enKeys].filter((k) => !trKeys.has(k)).sort();
    const extraInTr = [...trKeys].filter((k) => !enKeys.has(k)).sort();
    expect({ missingInTr, extraInTr }).toEqual({ missingInTr: [], extraInTr: [] });
  });

  it('no locale value is an empty string', () => {
    for (const [name, json] of [['en', en], ['tr', tr]]) {
      for (const key of flatten(json)) {
        const v = valueAt(json, key);
        expect(typeof v, `${name}.${key} should be a string`).toBe('string');
        expect(v.trim(), `${name}.${key} should not be empty`).not.toBe('');
      }
    }
  });

  it('interpolation placeholders match between en and tr', () => {
    const placeholders = (s) => (s.match(/{{\s*\w+\s*}}/g) || []).sort();
    for (const key of flatten(en)) {
      const enVal = valueAt(en, key);
      const trVal = valueAt(tr, key);
      expect(placeholders(trVal), `placeholders differ for "${key}"`)
        .toEqual(placeholders(enVal));
    }
  });
});
