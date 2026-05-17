import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Copy, GitCompareArrows, Plus, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useCharts } from '../context/ChartContext';
import { areCompatible } from '../utils/compareCompatibility';

const ACCENT = '#c73a3a';

export default function ComparisonControls({ comparison }) {
  const {
    charts,
    removeComparison,
    updateComparisonTitle,
    setComparisonChartIds,
    duplicateComparison,
  } = useCharts();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(comparison.title);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      updateComparisonTitle(comparison.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => removeComparison(comparison.id), 400);
  };

  const baselineId = comparison.chartIds[0];
  const baseline = baselineId != null ? charts.find(c => c.id === baselineId) : null;

  const replaceSlot = (slotIndex, newChartId) => {
    const next = [...comparison.chartIds];
    if (newChartId == null) {
      next.splice(slotIndex, 1);
    } else {
      next[slotIndex] = newChartId;
    }
    setComparisonChartIds(comparison.id, next);
  };

  const removeSlot = (slotIndex) => {
    const next = comparison.chartIds.filter((_, i) => i !== slotIndex);
    setComparisonChartIds(comparison.id, next);
  };

  const moveSlot = (slotIndex, delta) => {
    const next = [...comparison.chartIds];
    const target = slotIndex + delta;
    if (target < 0 || target >= next.length) return;
    [next[slotIndex], next[target]] = [next[target], next[slotIndex]];
    setComparisonChartIds(comparison.id, next);
  };

  const addSlot = () => {
    // Find first available compatible chart not already selected.
    const used = new Set(comparison.chartIds);
    const candidate = charts.find(c => {
      if (used.has(c.id)) return false;
      if (!baseline) return true;
      return areCompatible(baseline, c);
    });
    if (!candidate) return;
    setComparisonChartIds(comparison.id, [...comparison.chartIds, candidate.id]);
  };

  // Eligible charts for a given slot — first slot can be anything, later slots must match baseline.
  const eligibleFor = (slotIndex, currentId) => {
    return charts.filter(c => {
      if (c.id === currentId) return true;
      if (comparison.chartIds.includes(c.id)) return false;
      if (slotIndex === 0) return true;
      return baseline && areCompatible(baseline, c);
    });
  };

  const canAddSlot = (() => {
    const used = new Set(comparison.chartIds);
    return charts.some(c => {
      if (used.has(c.id)) return false;
      if (!baseline) return true;
      return areCompatible(baseline, c);
    });
  })();

  return (
    <div
      ref={null}
      className={`relative rounded-2xl p-3 transition-all duration-300 ease-out`}
      style={{
        backgroundColor: '#1a1a1a',
        border: `1px solid ${ACCENT}40`,
        opacity: isDeleting ? 0 : 1,
        transform: isDeleting ? 'scale(0.95)' : 'scale(1)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GitCompareArrows size={16} style={{ color: ACCENT, flexShrink: 0 }} />
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="px-2 py-1 rounded-lg text-sm flex-1 focus:outline-none cursor-text"
              style={{
                backgroundColor: '#3d3d3d',
                color: '#d0d0d0',
                border: `1px solid ${ACCENT}`,
                boxShadow: `0 0 0 2px ${ACCENT}30`
              }}
              autoFocus
            />
          ) : (
            <h4
              className="font-medium text-sm cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 truncate"
              style={{ color: '#d0d0d0' }}
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit"
            >
              {comparison.title}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateComparison(comparison.id)}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
            style={{ color: ACCENT, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = ACCENT + '20'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Duplicate comparison"
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
            style={{ color: ACCENT, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = ACCENT + '20'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
            style={{ color: ACCENT, backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = ACCENT + '20'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Delete comparison"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="space-y-1.5">
          {comparison.chartIds.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: '#666666' }}>
              No charts added yet. Click "+ Add chart" below.
            </p>
          )}

          {comparison.chartIds.map((chartId, slotIndex) => {
            const chart = charts.find(c => c.id === chartId);
            const eligible = eligibleFor(slotIndex, chartId);
            const isFirst = slotIndex === 0;
            const isLast = slotIndex === comparison.chartIds.length - 1;

            return (
              <div
                key={`slot-${slotIndex}`}
                className="flex items-center gap-1.5 p-1.5 rounded-lg"
                style={{ backgroundColor: '#2d2d2d' }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chart?.color || '#666666' }}
                />
                <select
                  value={chartId}
                  onChange={(e) => replaceSlot(slotIndex, Number(e.target.value))}
                  className="flex-1 min-w-0 text-xs px-2 py-1 rounded-md focus:outline-none cursor-pointer"
                  style={{ backgroundColor: '#3d3d3d', color: '#d0d0d0', border: 'none' }}
                  title={isFirst ? 'Baseline (defines compatibility)' : 'Compatible chart'}
                >
                  {eligible.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => moveSlot(slotIndex, -1)}
                  disabled={isFirst}
                  className="p-1 rounded transition-all hover:scale-110 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#888888' }}
                  title="Move up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveSlot(slotIndex, 1)}
                  disabled={isLast}
                  className="p-1 rounded transition-all hover:scale-110 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#888888' }}
                  title="Move down"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  onClick={() => removeSlot(slotIndex)}
                  className="p-1 rounded transition-all hover:scale-110 active:scale-90"
                  style={{ color: '#888888' }}
                  title="Remove from comparison"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={addSlot}
          disabled={!canAddSlot}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#3d3d3d',
            color: '#d0d0d0',
            border: '1px dashed #555555',
          }}
          title={canAddSlot
            ? 'Add a chart to this comparison'
            : (baseline ? 'No more charts compatible with the baseline' : 'No charts available')}
        >
          <Plus size={12} />
          Add chart
        </button>
      </div>
    </div>
  );
}
