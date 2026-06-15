# Translations & Internationalization

How Doxa's multi-language support is wired, and how to add or edit a translation.

## Overview

Doxa uses [`react-i18next`](https://react.i18next.com/). The setup is small:

- `src/i18n/index.js` — the i18next config. Locales are **bundled directly**
  (imported as JSON), so there is no network fetch and no loading flash.
- `src/i18n/locales/en.json` — English. **This is the source of truth** for the
  full key set.
- `src/i18n/locales/tr.json` — Turkish. Same key tree, translated values.

`src/main.jsx` imports `src/i18n` once, before `<App/>` renders. That call
initializes i18next; after it, any component can call `useTranslation()` and get
a working `t`.

Language is detected on first visit (`i18next-browser-languagedetector`):
`localStorage` first, then the browser's `navigator` language, falling back to
English. The chosen language is cached in `localStorage` under `doxa_lang`.

## Key naming

Keys follow `area.descriptiveCamelCaseKey`. Areas group related strings:
`auth`, `nav`, `controls`, `chart`, `comparison`, `projects`, `templates`,
`sort`, `stats`, `color`, `common`, `errors`.

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <button>{t('common.add')}</button>;
}
```

### Interpolation

Placeholders use `{{name}}`:

```json
"errors": { "importFailed": "Failed to import: {{message}}" }
```
```jsx
t('errors.importFailed', { message: err.message })
```

### Plurals

i18next selects a plural form from a `count` argument, looking up keys with
`_one` / `_other` suffixes:

```json
"projects": {
  "chartCount_one": "{{count}} chart",
  "chartCount_other": "{{count}} charts"
}
```
```jsx
t('projects.chartCount', { count: n })
```

Turkish has no grammatical plural, but **both** `_one` and `_other` keys are kept
in `tr.json` (with the same value) so the parity test passes — i18next simply
always picks `_other` for Turkish.

### State-dependent strings

Pick the key in JSX rather than branching inside a translation:

```jsx
t(isExpanded ? 'common.collapse' : 'common.expand')
```

## How templates are localized

This is the one non-obvious part. Templates (`src/projects/templates.js`) are
**language-neutral**: their structure (ids, colors, numeric values, comparison
wiring) is stored directly, but every text field — `name`, `description`, chart
`title`, trait `subject`, comparison `title` — holds an **i18n key string**, not
text. The text lives under the `templates.*` namespace in the locale files.

When the user picks a template, `localizeTemplatePayload(tmpl, t)` deep-clones
the payload **and** resolves every key through `t`, producing a project filled
with text in the language that is active right then.

The important consequence: a project created from a template is plain frozen
data. **Switching the app language later never retranslates existing projects**
— only templates-about-to-be-fabricated and the live UI chrome change. The same
holds for anything saved in the `doxa_charts` table and for JSON import/export,
which carry raw data and are never translated.

The "Ayran" chart in the *Character Profile* template is a deliberate joke — its
keys resolve to the **same Turkish text in both** `en.json` and `tr.json`. The
values are intentionally identical; key parity is still preserved.

## Cross-device sync

When a signed-in user changes language, the choice is written to their Supabase
account (`user_metadata.lang`) on a best-effort basis. On sign-in, a stored
account language wins over the local browser detector. All of this lives in
`src/auth/AuthProvider.jsx` and never blocks or surfaces errors to the UI.

## Adding a new language

1. Add an entry to `SUPPORTED_LANGUAGES` in `src/i18n/index.js`:
   ```js
   { code: 'de', label: 'German', nativeLabel: 'Deutsch' }
   ```
2. Create `src/i18n/locales/de.json` — copy `en.json` and translate every value.
   Keep the key tree **identical**.
3. Register it in `src/i18n/index.js`:
   ```js
   import de from './locales/de.json';
   // ...
   resources: { en: { translation: en }, tr: { translation: tr }, de: { translation: de } },
   ```
   `supportedLngs` is derived from `SUPPORTED_LANGUAGES`, so no other change is
   needed. The navbar language switcher picks up the new entry automatically.
4. Run `npm test` — the parity test (`tests/unit/i18n-parity.test.js`) fails if
   the new file is missing keys, has extra keys, has an empty value, or has
   `{{placeholders}}` that don't match English.

## Tests

- `tests/unit/i18n-parity.test.js` — every locale has the identical key set, no
  empty values, and matching interpolation placeholders.
- `tests/unit/templates.test.js` — every template text field is a resolvable
  `templates.*` key, and `localizeTemplatePayload` resolves them all (no raw
  `templates.` keys leak into a fabricated project).

Run them with `npm test`.
