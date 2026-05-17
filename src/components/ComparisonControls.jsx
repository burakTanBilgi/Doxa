import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Copy, GitCompareArrows, Plus, X, ArrowUp, ArrowDown, GripVertical, AlignLeft } from 'lucide-react';
import { useCharts } from '../context/ChartContext';
import { areCompatible } from '../utils/compareCompatibility';
import SortMenu from './SortMenu';
import StatsMenu from './StatsMenu';
import SlotPicker from './SlotPicker';
import EditableDescription from './EditableDescription';

const ACCENT = '#c73a3a';

const SLOT_SORT_MODES = [
  { value: 'custom', label: 'Custom (manual order)' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
];

const buildRowSortModes = (deltaAvailable) => [
  { value: 'custom', label: 'Custom (baseline order)' },
  { value: 'name-asc', label: 'Trait A–Z' },
  { value: 'name-desc', label: 'Trait Z–A' },
  { value: 'value-asc', label: 'Baseline value ascending' },
  { value: 'value-desc', label: 'Baseline value descending' },
  { value: 'delta-asc', label: 'Δ ascending', disabled: !deltaAvailable },
  { value: 'delta-desc', label: 'Δ descending', disabled: !deltaAvailable },
];

export default function ComparisonControls({ comparison }) {
  const {
    charts,
    removeComparison,
    updateComparisonTitle,
    setComparisonChartIds,
    duplicateComparison,
    setComparisonSlotSortMode,
    setComparisonRowSortMode,
    updateComparisonDescription,
    setComparisonShowDelta,
    toggleComparisonAggregate,
  } = useCharts();

  const slotSortMode = comparison.slotSortMode || 'custom';
  const rowSortMode = comparison.rowSortMode || 'custom';
  const slotSortActive = slotSortMode !== 'custom';

  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(comparison.title);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draggedSlot, setDraggedSlot] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [descEditing, setDescEditing] = useState(false);

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

  const reorderSlot = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const next = [...comparison.chartIds];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    setComparisonChartIds(comparison.id, next);
  };

  const handleSlotDragStart = (e, slotIndex) => {
    if (slotSortActive) { e.preventDefault(); return; }
    e.stopPropagation();
    setDraggedSlot(slotIndex);
    e.dataTransfer.effectAllowed = 'move';
    const chart = charts.find(c => c.id === comparison.chartIds[slotIndex]);
    const preview = document.createElement('div');
    preview.style.cssText = `
      padding: 6px 12px;
      background: ${chart?.color || '#c73a3a'};
      color: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      position: fixed;
      top: -1000px;
      left: 0;
      width: fit-content;
      white-space: nowrap;
    `;
    preview.textContent = chart?.title || '';
    document.body.appendChild(preview);
    e.dataTransfer.setDragImage(preview, 40, 15);
    requestAnimationFrame(() => document.body.removeChild(preview));
  };

  const handleSlotDragOver = (e, slotIndex) => {
    if (draggedSlot === null) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotIndex);
  };

  const handleSlotDrop = (e, slotIndex) => {
    if (draggedSlot === null) return;
    e.preventDefault();
    e.stopPropagation();
    reorderSlot(draggedSlot, slotIndex);
    setDraggedSlot(null);
    setDragOverSlot(null);
  };

  const handleSlotDragEnd = () => {
    setDraggedSlot(null);
    setDragOverSlot(null);
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

  // Compatible charts for a given slot — first slot allows any chart; later slots require matching baseline.
  // Includes charts already used in this comparison (the picker shows them as "in this comparison").
  const compatibleFor = (slotIndex) => {
    return charts.filter(c => {
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
          {!comparison.description && (
            <button
              onClick={() => setDescEditing(true)}
              className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
              style={{ color: ACCENT, backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = ACCENT + '20'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Add a description"
            >
              <AlignLeft size={16} />
            </button>
          )}
          <SortMenu
            accentColor={ACCENT}
            title="Sort"
            sections={[
              {
                title: 'Chart slots',
                modes: SLOT_SORT_MODES,
                current: slotSortMode,
                onSelect: (m) => setComparisonSlotSortMode(comparison.id, m),
              },
              {
                title: 'Trait rows',
                modes: buildRowSortModes(comparison.chartIds.length === 2),
                current: rowSortMode,
                onSelect: (m) => setComparisonRowSortMode(comparison.id, m),
              },
            ]}
          />
          <StatsMenu
            accentColor={ACCENT}
            showDelta={comparison.showDelta !== false}
            onShowDeltaChange={(v) => setComparisonShowDelta(comparison.id, v)}
            deltaAvailable={comparison.chartIds.length === 2}
            columnKeys={comparison.aggregateColumns || []}
            rowKeys={comparison.aggregateRows || []}
            onToggleColumn={(k) => toggleComparisonAggregate(comparison.id, 'columns', k)}
            onToggleRow={(k) => toggleComparisonAggregate(comparison.id, 'rows', k)}
          />
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
        <div className="mb-2">
          <EditableDescription
            value={comparison.description}
            onChange={(v) => updateComparisonDescription(comparison.id, v)}
            editing={descEditing}
            onEditingChange={setDescEditing}
            accentColor={ACCENT}
          />
        </div>
        <div className="space-y-1.5">
          {comparison.chartIds.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: '#666666' }}>
              No charts added yet. Click "+ Add chart" below.
            </p>
          )}

          {comparison.chartIds.map((chartId, slotIndex) => {
            const chart = charts.find(c => c.id === chartId);
            const compatible = compatibleFor(slotIndex);
            const isFirst = slotIndex === 0;
            const isLast = slotIndex === comparison.chartIds.length - 1;
            const canSwap = compatible.length > 1;
            const chosenIds = new Set(comparison.chartIds.filter((_, i) => i !== slotIndex));

            const moveTitle = slotSortActive
              ? 'Slot sort mode active — switch to Custom to reorder manually'
              : null;

            const isBeingDragged = draggedSlot === slotIndex;
            const isDropTarget = dragOverSlot === slotIndex && draggedSlot !== null && draggedSlot !== slotIndex;

            return (
              <div
                key={`slot-${slotIndex}`}
                draggable={!slotSortActive}
                onDragStart={(e) => handleSlotDragStart(e, slotIndex)}
                onDragOver={(e) => handleSlotDragOver(e, slotIndex)}
                onDrop={(e) => handleSlotDrop(e, slotIndex)}
                onDragEnd={handleSlotDragEnd}
                onDragLeave={() => { if (dragOverSlot === slotIndex) setDragOverSlot(null); }}
                className="flex items-center gap-1.5 p-1.5 rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: '#2d2d2d',
                  opacity: isBeingDragged ? 0.4 : 1,
                  transform: isBeingDragged ? 'scale(0.97)' : 'scale(1)',
                  boxShadow: isDropTarget ? `inset 0 0 0 2px ${ACCENT}80` : 'none',
                  cursor: slotSortActive ? 'default' : 'grab',
                }}
              >
                <GripVertical
                  size={12}
                  style={{
                    color: '#666666',
                    flexShrink: 0,
                    opacity: slotSortActive ? 0.15 : 0.5,
                    cursor: slotSortActive ? 'not-allowed' : 'grab',
                  }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chart?.color || '#666666' }}
                />
                <SlotPicker
                  value={chartId}
                  compatibleCharts={compatible}
                  chosenIds={chosenIds}
                  onChange={(newId) => replaceSlot(slotIndex, newId)}
                  disabled={!canSwap}
                  isBaselineSlot={isFirst}
                />
                <button
                  onClick={() => moveSlot(slotIndex, -1)}
                  disabled={isFirst || slotSortActive}
                  className="p-1 rounded transition-all hover:scale-110 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#888888' }}
                  title={moveTitle || 'Move up'}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => moveSlot(slotIndex, 1)}
                  disabled={isLast || slotSortActive}
                  className="p-1 rounded transition-all hover:scale-110 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ color: '#888888' }}
                  title={moveTitle || 'Move down'}
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
