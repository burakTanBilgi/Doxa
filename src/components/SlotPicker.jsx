import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

// Props:
//   value             — currently selected chartId
//   compatibleCharts  — full list of chart objects compatible with this slot (includes current + already-used)
//   chosenIds         — Set<number> of chartIds already in this comparison (excluding the current slot)
//   onChange(id)      — selection callback (only called for charts NOT in chosenIds)
//   disabled          — if true, button is non-interactive (no other compatible chart exists)
//   isBaselineSlot    — first slot in the comparison; cosmetic only
export default function SlotPicker({ value, compatibleCharts, chosenIds, onChange, disabled, isBaselineSlot }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = useRef(null);
  const popRef = useRef(null);
  const current = compatibleCharts.find(c => c.id === value);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const updatePos = () => {
      const rect = wrapRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
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

  const available = compatibleCharts.filter(c => !chosenIds.has(c.id));
  const inComparison = compatibleCharts.filter(c => chosenIds.has(c.id));

  // Disabled = no other compatible chart exists. Render as a plain static label
  // (no chevron, no button styling, no special cursor) so it reads as "this is the
  // only option" rather than an unclickable control.
  if (disabled) {
    return (
      <div
        className="flex-1 min-w-0 text-xs px-2 py-1 rounded-md truncate"
        style={{ backgroundColor: '#3d3d3d', color: '#d0d0d0', opacity: 0.8 }}
        title="No other charts share these trait names"
      >
        {current?.title ?? '—'}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-1.5 text-xs px-2 py-1 rounded-md focus:outline-none truncate"
        style={{
          backgroundColor: '#3d3d3d',
          color: '#d0d0d0',
          border: 'none',
          cursor: 'pointer',
        }}
        title={isBaselineSlot ? 'Baseline (defines compatibility)' : 'Compatible chart'}
      >
        <span className="truncate">{current?.title ?? '—'}</span>
        <ChevronDown size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          className="rounded-lg overflow-hidden shadow-xl max-h-64 overflow-y-auto"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            backgroundColor: '#2d2d2d',
            border: '1px solid #3d3d3d',
            zIndex: 9999,
          }}
        >
          {available.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: '#888888' }}>
                Available
              </div>
              {available.map(c => {
                const isCurrent = c.id === value;
                return (
                  <button
                    key={c.id}
                    onClick={() => { onChange(c.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-white/10"
                    style={{
                      color: '#d0d0d0',
                      backgroundColor: '#3d3d3d',
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    <span style={{ width: 12, display: 'inline-flex', justifyContent: 'center' }}>
                      {isCurrent && <Check size={11} style={{ color: c.color }} />}
                    </span>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.title}</span>
                  </button>
                );
              })}
            </div>
          )}
          {inComparison.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider" style={{ color: '#888888', borderTop: available.length > 0 ? '1px solid #3d3d3d' : 'none' }}>
                In this comparison
              </div>
              {inComparison.map(c => (
                <div
                  key={c.id}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs italic"
                  style={{
                    color: '#888888',
                    backgroundColor: '#252525',
                    cursor: 'not-allowed',
                  }}
                  title="Already in this comparison"
                >
                  <span style={{ width: 12 }} />
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color, opacity: 0.6 }} />
                  <span className="truncate">{c.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
