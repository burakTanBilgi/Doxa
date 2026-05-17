import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, Check } from 'lucide-react';
import Tooltip from './Tooltip';

// Props:
//   accentColor      — color used for the active row highlight and the button hover tint
//   modes            — [{ value, label, disabled? }] (used for a single-section menu)
//   current          — currently active value (single-section)
//   onSelect(value)  — single-section selection callback
//   sections         — optional array of { title, modes, current, onSelect } for multi-section menus
//                      (when supplied, `modes`/`current`/`onSelect` are ignored)
//   title            — button hover tooltip
export default function SortMenu({ accentColor = '#c73a3a', modes, current, onSelect, sections, title = 'Sort' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const wrapRef = useRef(null);
  const popRef = useRef(null);

  // Place the popover at fixed viewport coordinates so it escapes any
  // ancestor's stacking context (the parent card uses `transform`, which
  // would otherwise pin z-index inside the card).
  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const updatePos = () => {
      const rect = wrapRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      const insideTrigger = wrapRef.current && wrapRef.current.contains(e.target);
      const insidePopover = popRef.current && popRef.current.contains(e.target);
      if (!insideTrigger && !insidePopover) setOpen(false);
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const renderModes = (modes, current, onSelect) => (
    <div className="flex flex-col">
      {modes.map(m => {
        const active = m.value === current;
        return (
          <button
            key={m.value}
            disabled={m.disabled}
            onClick={() => { if (!m.disabled) { onSelect(m.value); setOpen(false); } }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5"
            style={{
              color: active ? accentColor : '#d0d0d0',
              fontWeight: active ? 600 : 400,
            }}
          >
            <span style={{ width: 12, display: 'inline-flex', justifyContent: 'center' }}>
              {active && <Check size={11} />}
            </span>
            {m.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={wrapRef} className="relative">
      <Tooltip content={title} accentColor={accentColor} disabled={open}>
        <button
          onClick={() => setOpen(o => !o)}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          style={{ color: accentColor, backgroundColor: open ? accentColor + '20' : 'transparent' }}
          onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = accentColor + '20'; }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <ArrowUpDown size={16} />
        </button>
      </Tooltip>
      {open && createPortal(
        <div
          ref={popRef}
          className="rounded-lg overflow-hidden shadow-xl"
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            backgroundColor: '#2d2d2d',
            border: '1px solid #3d3d3d',
            minWidth: 200,
            zIndex: 9999,
          }}
        >
          {sections ? (
            sections.map((section, i) => (
              <div key={section.title} style={{ borderTop: i === 0 ? 'none' : '1px solid #3d3d3d' }}>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: '#888888' }}>
                  {section.title}
                </div>
                {renderModes(section.modes, section.current, section.onSelect)}
              </div>
            ))
          ) : (
            renderModes(modes, current, onSelect)
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
