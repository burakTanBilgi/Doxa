// i18n bootstrap. Imported once (for its side effects) from `src/main.jsx`
// before <App/> renders — `initReactI18next` then makes `useTranslation()`
// work everywhere without a provider.
//
// Locales are bundled directly (no HTTP backend) — two small JSON files add
// negligible weight and avoid a loading flash. See docs/TRANSLATIONS.md.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import tr from './locales/tr.json';

// Single source of truth for the language switcher and the supported set.
// Adding a language = one entry here + one locale file + a `resources` line.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe' },
];
export const FALLBACK_LANGUAGE = 'en';
export const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_CODES,
    nonExplicitSupportedLngs: true, // a 'tr-TR' navigator value resolves to 'tr'
    load: 'languageOnly',
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'doxa_lang',
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

// Keep <html lang> in sync for accessibility / browser features.
const applyHtmlLang = (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng || FALLBACK_LANGUAGE;
  }
};
applyHtmlLang(i18n.resolvedLanguage);
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
