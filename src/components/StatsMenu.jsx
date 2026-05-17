import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sigma, Check } from 'lucide-react';
import { AGGREGATES } from '../utils/aggregates';

// Σ popover for a comparison: toggle the Δ column, plus per-stat checkboxes
// to add aggregate columns (per-trait across charts) and rows (per-chart
// across traits). Portal-based so it escapes the card's transform stacking.
//
// Props:
//   accentColor     — color of the trigger icon + active checkmark
//   showDelta       — current value of comparison.showDelta
//   onShowDeltaChange(bool)
//   deltaAvailable  — true iff exactly 2 charts are in the comparison
//   columnKeys      — array of currently-active column aggregate keys
//   rowKeys         — array of currently-active row aggregate keys
//   onToggleColumn(key)
//   onToggleRow(key)
export default function StatsMenu({
  accentColor = '#c73a3a',
  showDelta,
  onShowDeltaChange,
  deltaAvailable,
  columnKeys,
  rowKeys,
  onToggleColumn,
  onToggleRow,
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const wrapRef = useRef(null);
  const popRef = useRef(null);

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

  const renderCheckRow = (label, checked, onToggle, disabled, titleAttr) => (
    <button
      key={label}
      onClick={() => { if (!disabled) onToggle(); }}
      disabled={disabled}
      title={titleAttr}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5"
      style={{ color: checked ? accentColor : '#d0d0d0', fontWeight: checked ? 600 : 400 }}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: 12, height: 12, borderRadius: 2,
          border: `1px solid ${checked ? accentColor : '#555555'}`,
          background: checked ? accentColor : 'transparent',
        }}
      >
        {checked && <Check size={9} style={{ color: '#fff' }} />}
      </span>
      {label}
    </button>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
        style={{ color: accentColor, backgroundColor: open ? accentColor + '20' : 'transparent' }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = accentColor + '20'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
        title="Aggregate stats"
      >
        <Sigma size={16} />
      </button>
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
            minWidth: 220,
            zIndex: 9999,
          }}
        >
          {deltaAvailable && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: '#888888' }}>
                Δ column
              </div>
              {renderCheckRow(
                'Show Δ column',
                !!showDelta,
                () => onShowDeltaChange(!showDelta),
                false,
                null
              )}
            </div>
          )}
          <div style={{ borderTop: deltaAvailable ? '1px solid #3d3d3d' : 'none' }}>
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: '#888888' }}>
              Add columns (per trait, across charts)
            </div>
            {AGGREGATES.map(a => renderCheckRow(
              a.label,
              columnKeys.includes(a.key),
              () => onToggleColumn(a.key),
              false,
              null
            ))}
          </div>
          <div style={{ borderTop: '1px solid #3d3d3d' }}>
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: '#888888' }}>
              Add rows (per chart, across traits)
            </div>
            {AGGREGATES.map(a => renderCheckRow(
              a.label,
              rowKeys.includes(a.key),
              () => onToggleRow(a.key),
              false,
              null
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
