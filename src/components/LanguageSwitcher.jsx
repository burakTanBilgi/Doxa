import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';
import Tooltip from './Tooltip';

const ACCENT = '#c73a3a';

// Navbar language picker. Mirrors UserMenu's portal-popover pattern so the
// popover escapes any ancestor stacking context. Driven entirely by
// SUPPORTED_LANGUAGES — adding a language needs no change here.
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    // Exempt clicks inside the portal popover — otherwise mousedown unmounts it
    // before the option button receives its click.
    const onDocClick = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const current = i18n.resolvedLanguage || 'en';

  const handleOpen = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.bottom + 6, left: Math.max(8, rect.right - 180) });
    }
    setOpen((o) => !o);
  };

  const choose = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <>
      <Tooltip content={t('nav.language')} accentColor={ACCENT}>
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors hover:bg-black/30"
          style={{
            backgroundColor: '#1a1a1a',
            border: `1px solid ${open ? ACCENT : '#3d3d3d'}`,
            color: '#d0d0d0',
          }}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Languages size={12} />
          <span>{current}</span>
        </button>
      </Tooltip>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100] rounded-xl py-1 shadow-xl"
          style={{
            top: coords.top,
            left: coords.left,
            width: 180,
            backgroundColor: '#2d2d2d',
            border: '1px solid #3d3d3d',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
          role="menu"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang.code === current;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => choose(lang.code)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-black/30 transition-colors"
                style={{ color: active ? ACCENT : '#d0d0d0', fontWeight: active ? 600 : 400 }}
                role="menuitem"
              >
                <span style={{ width: 12, display: 'inline-flex', justifyContent: 'center' }}>
                  {active && <Check size={11} />}
                </span>
                <span className="flex-1 text-left">{lang.nativeLabel}</span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: '#666666' }}>
                  {lang.code}
                </span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
