import { cloneElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_DELAY = 250;
const NEUTRAL = '#888888';

// Custom tooltip that wraps a single child. Hover or focus shows a small
// floating label positioned above (or below if there's no room).
// Color-aware: `accentColor` tints the tooltip border + glow (not the text)
// so a chart-color tooltip reads as belonging to that chart.
//
// Props:
//   content      — string or node shown inside the tooltip
//   accentColor  — optional; defaults to a neutral grey
//   placement    — 'top' (default) or 'bottom'
//   delay        — ms before showing (default 250)
//   disabled     — if true, render the child as-is (no tooltip)
//   children     — single element (button, label, span...); event handlers are merged
export default function Tooltip({
  content,
  accentColor,
  placement = 'top',
  delay = DEFAULT_DELAY,
  disabled = false,
  children,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, place: placement });
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const timerRef = useRef(null);

  const accent = accentColor || NEUTRAL;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return;
    const updatePos = () => {
      const t = triggerRef.current.getBoundingClientRect();
      const tip = tipRef.current.getBoundingClientRect();
      const margin = 8;
      let place = placement;
      let top = placement === 'top'
        ? t.top - tip.height - margin
        : t.bottom + margin;
      // Flip if we'd render off-screen.
      if (place === 'top' && top < 8) {
        place = 'bottom';
        top = t.bottom + margin;
      } else if (place === 'bottom' && top + tip.height > window.innerHeight - 8) {
        place = 'top';
        top = t.top - tip.height - margin;
      }
      const triggerCenter = t.left + t.width / 2;
      let left = triggerCenter - tip.width / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));
      setPos({ top, left, place });
    };
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, placement, content]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const show = () => {
    if (disabled || !content) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  const child = children;
  const mergedProps = {
    ref: (el) => {
      triggerRef.current = el;
      const r = child.ref;
      if (typeof r === 'function') r(el);
      else if (r && typeof r === 'object') r.current = el;
    },
    onMouseEnter: (e) => { show(); child.props.onMouseEnter?.(e); },
    onMouseLeave: (e) => { hide(); child.props.onMouseLeave?.(e); },
    onFocus: (e) => { show(); child.props.onFocus?.(e); },
    onBlur: (e) => { hide(); child.props.onBlur?.(e); },
  };

  return (
    <>
      {cloneElement(child, mergedProps)}
      {open && content && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          className="tooltip-fade-in"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 10000,
            pointerEvents: 'none',
            backgroundColor: '#1a1a1a',
            color: '#d0d0d0',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.4,
            padding: '5px 9px',
            borderRadius: 6,
            border: `1px solid ${accent}`,
            boxShadow: `0 4px 14px rgba(0,0,0,0.5), 0 0 0 1px ${accent}30, 0 0 12px ${accent}40`,
            maxWidth: 260,
            whiteSpace: 'pre-line',
            letterSpacing: '-0.005em',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
