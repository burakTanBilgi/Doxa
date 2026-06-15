// Vitest setup — runs before every unit test file.
//
// Polyfills MUST be imported before anything that touches Web Storage (i18n's
// language detector caches to localStorage on init), so this import comes
// first. ESM evaluates sibling imports in source order.
import './polyfills';

// Importing the i18n module initializes the shared i18next instance so any
// component rendered in a test (anything calling `useTranslation()`) gets a
// working `t`. Without this, react-i18next would warn about an uninitialized
// instance.
import '../src/i18n';
