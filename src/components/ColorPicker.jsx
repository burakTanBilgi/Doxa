import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Pipette } from 'lucide-react';
import Tooltip from './Tooltip';

// Curated dusky palette — matches the hue ranges in ChartContext.generateDuskyColor
// (reds, terracotta, teals/slates, dusty purples, deep roses). Hand-picked so the
// swatches look intentional rather than arbitrary.
const PRESETS = [
  '#c73a3a', '#a85050', '#9b4444', '#c46b4a', '#a8703a', '#876040',
  '#538b93', '#5a7e8c', '#46707a', '#7a6a8c', '#8c5a82', '#a85a73',
  '#b8b8b8', '#888888', '#6b6b6b', '#3d3d3d', '#1a1a1a', '#d0d0d0',
];

// Custom color picker rendered as a popover anchored to an arbitrary trigger.
// The child element is wrapped: clicking it toggles the popover.
//
// Props:
//   value           — current color (#hex)
//   onChange(hex)   — fires when the user picks a swatch or the native picker commits
//   accentColor     — used for the active-swatch ring + popover border tint (defaults to value)
//   children        — single trigger element
export default function ColorPicker({ value, onChange, accentColor, children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  const nativeRef = useRef(null);

  const accent = accentColor || value || '#c73a3a';

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const updatePos = () => {
      const rect = wrapRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
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

  const handlePickPreset = (color) => {
    onChange(color);
    setOpen(false);
  };

  const handleNativeChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <span
      ref={wrapRef}
      style={{ display: 'inline-flex' }}
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
      {open && createPortal(
        <div
          ref={popRef}
          className="tooltip-fade-in"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 10000,
            backgroundColor: '#1a1a1a',
            border: `1px solid ${accent}`,
            borderRadius: 10,
            padding: 10,
            boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 0 0 1px ${accent}30, 0 0 16px ${accent}30`,
            width: 184,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 6,
            }}
          >
            {PRESETS.map(color => {
              const active = color.toLowerCase() === (value || '').toLowerCase();
              return (
                <button
                  key={color}
                  onClick={() => handlePickPreset(color)}
                  className="transition-transform hover:scale-110 active:scale-95"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: active ? `2px solid #ffffff` : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: active ? `0 0 0 2px ${color}80` : 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label={`Pick color ${color}`}
                >
                  {active && <Check size={10} style={{ color: '#fff' }} />}
                </button>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid #2d2d2d',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <button
              onClick={() => nativeRef.current?.click()}
              className="flex items-center gap-1.5 text-xs hover:bg-white/5 transition-colors px-2 py-1 rounded"
              style={{ color: '#d0d0d0', flex: 1, justifyContent: 'flex-start' }}
            >
              <Pipette size={12} style={{ color: accent }} />
              Custom...
            </button>
            <Tooltip content={value} accentColor={value}>
              <span
                className="w-5 h-5 rounded-full border border-white/10 inline-block"
                style={{ backgroundColor: value }}
              />
            </Tooltip>
            <input
              ref={nativeRef}
              type="color"
              value={value}
              onChange={handleNativeChange}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              aria-hidden="true"
            />
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}
