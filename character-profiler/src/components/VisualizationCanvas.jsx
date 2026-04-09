import { forwardRef, useState, useRef } from 'react';
import { useCharts } from '../context/ChartContext';
import ChartDisplay from './ChartDisplay';
import { Plus } from 'lucide-react';

const VisualizationCanvas = forwardRef(function VisualizationCanvas({ 
  analysisTitle, 
  setAnalysisTitle, 
  analysisDescription, 
  setAnalysisDescription,
  mainHovered, 
  onCanvasLogoHover
}, ref) {
  const { charts, reorderCharts, swapCharts, addNewChart } = useCharts();
  const [addBtnVisible, setAddBtnVisible] = useState(false);
  const gridRef = useRef(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [titleInput, setTitleInput] = useState(analysisTitle);
  const [descInput, setDescInput] = useState(analysisDescription);

  // --- Drag state: single source of truth ---
  const [draggedIndex, setDraggedIndex] = useState(null);
  // dropTarget: null | { type: 'swap', index } | { type: 'gap', pos }
  const [dropTarget, setDropTarget] = useState(null);
  const dragImageRef = useRef(null);

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      setAnalysisTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    if (descInput.trim()) {
      setAnalysisDescription(descInput.trim());
    }
    setIsEditingDesc(false);
  };

  // --- Drag handlers ---
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    const preview = document.createElement('div');
    preview.style.cssText = `
      padding: 8px 16px;
      background: ${charts[index].color};
      color: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      position: fixed;
      top: -1000px;
      left: 0;
      width: fit-content;
      white-space: nowrap;
    `;
    preview.textContent = charts[index].title;
    document.body.appendChild(preview);
    dragImageRef.current = preview;
    e.dataTransfer.setDragImage(preview, 50, 20);
    requestAnimationFrame(() => preview.remove());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTarget(null);
  };

  // Swap: drag over a chart
  const handleChartDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropTarget({ type: 'swap', index });
    }
  };

  const handleChartDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      swapCharts(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDropTarget(null);
  };

  // Gap: drag over a gap zone
  const handleGapDragOver = (e, gapPos) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null) {
      setDropTarget({ type: 'gap', pos: gapPos });
    }
  };

  const handleGapDrop = (e, gapPos) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null) {
      const targetIndex = draggedIndex < gapPos ? gapPos - 1 : gapPos;
      if (targetIndex !== draggedIndex && targetIndex >= 0 && targetIndex < charts.length) {
        reorderCharts(draggedIndex, targetIndex);
      }
    }
    setDraggedIndex(null);
    setDropTarget(null);
  };

  // Helper: should a gap be visible? (hide if dragged chart is adjacent)
  const isGapActive = (gapPos) => {
    if (draggedIndex === null) return false;
    if (gapPos === 0) return draggedIndex !== 0;
    if (gapPos === charts.length) return draggedIndex !== charts.length - 1;
    // Between chart[gapPos-1] and chart[gapPos]
    return draggedIndex !== gapPos - 1 && draggedIndex !== gapPos;
  };

  // Helper: is this gap highlighted right now?
  const isGapHighlighted = (gapPos) => {
    return dropTarget?.type === 'gap' && dropTarget.pos === gapPos;
  };

  return (
    <div
      ref={ref}
      className="rounded-xl p-4 sm:p-5 overflow-hidden"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Header for export */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-xl sm:text-2xl font-bold bg-transparent border-b-2 focus:outline-none w-full"
              style={{ color: '#c73a3a', borderColor: '#c73a3a' }}
              autoFocus
            />
          ) : (
            <h2 
              className="text-xl sm:text-2xl font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-100"
              style={{ color: '#c73a3a' }}
              onClick={() => {
                setTitleInput(analysisTitle);
                setIsEditingTitle(true);
              }}
              title="Click to edit title"
            >
              {analysisTitle || 'Untitled Analysis'}
            </h2>
          )}
          {isEditingDesc ? (
            <input
              type="text"
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              onBlur={handleDescSave}
              onKeyDown={(e) => e.key === 'Enter' && handleDescSave()}
              className="text-sm mt-1 bg-transparent border-b focus:outline-none w-full"
              style={{ color: '#888888', borderColor: '#888888' }}
              autoFocus
            />
          ) : (
            <p 
              className="text-sm mt-1 cursor-pointer transition-all duration-200 hover:text-gray-300"
              style={{ color: '#888888' }}
              onClick={() => {
                setDescInput(analysisDescription);
                setIsEditingDesc(true);
              }}
              title="Click to edit description"
            >
              {analysisDescription}
            </p>
          )}
        </div>
        <img 
          src="/Doxa3.png" 
          alt="Doxa" 
          className="h-10 sm:h-12 w-auto logo-canvas transition-all duration-300"
          style={{
            opacity: mainHovered ? 1 : 0.85,
            filter: mainHovered ? 'drop-shadow(0 4px 12px rgba(199, 58, 58, 0.6))' : 'none',
            transform: mainHovered ? 'translateY(-2px)' : 'none'
          }}
          onMouseEnter={() => onCanvasLogoHover?.(true)}
          onMouseLeave={() => onCanvasLogoHover?.(false)}
        />
      </div>
      <div className="relative">
        <div 
          ref={gridRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-3"
        >
          {charts.map((chart, index) => {
            const isRightCol = index % 2 === 1;
            const isLast = index === charts.length - 1;
            const isSwapTarget = dropTarget?.type === 'swap' && dropTarget.index === index;

            return (
              <div key={chart.id} className="relative">
                {/* Gap: before first chart (left edge of chart 0) */}
                {index === 0 && isGapActive(0) && (
                  <div
                    className="absolute top-0 bottom-0 z-10"
                    style={{ left: '-10px', width: '20px' }}
                    onDragOver={(e) => handleGapDragOver(e, 0)}
                    onDrop={(e) => handleGapDrop(e, 0)}
                    onDragLeave={() => setDropTarget(null)}
                  >
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 rounded-full ${
                        isGapHighlighted(0) ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        top: '15%', bottom: '15%', width: '2px',
                        background: 'linear-gradient(to bottom, transparent, rgba(160,160,160,0.5) 20%, rgba(160,160,160,0.5) 80%, transparent)',
                      }}
                    />
                  </div>
                )}

                {/* Gap: vertical between pairs (left edge of right-col charts) */}
                {isRightCol && isGapActive(index) && (
                  <div
                    className="absolute top-0 bottom-0 z-10"
                    style={{ left: '-10px', width: '20px' }}
                    onDragOver={(e) => handleGapDragOver(e, index)}
                    onDrop={(e) => handleGapDrop(e, index)}
                    onDragLeave={() => setDropTarget(null)}
                  >
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 rounded-full ${
                        isGapHighlighted(index) ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        top: '15%', bottom: '15%', width: '2px',
                        background: 'linear-gradient(to bottom, transparent, rgba(160,160,160,0.5) 20%, rgba(160,160,160,0.5) 80%, transparent)',
                      }}
                    />
                  </div>
                )}

                {/* Chart card */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleChartDragOver(e, index)}
                  onDragLeave={() => { if (dropTarget?.type === 'swap' && dropTarget.index === index) setDropTarget(null); }}
                  onDrop={(e) => handleChartDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-200 rounded-2xl ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  }`}
                  style={{
                    cursor: 'grab',
                    boxShadow: isSwapTarget 
                      ? '0 0 0 2px rgba(160,160,160,0.4), 0 0 16px rgba(160,160,160,0.15)' 
                      : 'none',
                  }}
                >
                  <ChartDisplay chart={chart} index={index} />
                </div>

                {/* Gap: after last chart (right edge) */}
                {isLast && isGapActive(charts.length) && (
                  <div
                    className="absolute top-0 bottom-0 z-10"
                    style={{ right: '-10px', width: '20px' }}
                    onDragOver={(e) => handleGapDragOver(e, charts.length)}
                    onDrop={(e) => handleGapDrop(e, charts.length)}
                    onDragLeave={() => setDropTarget(null)}
                  >
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 rounded-full ${
                        isGapHighlighted(charts.length) ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        top: '15%', bottom: '15%', width: '2px',
                        background: 'linear-gradient(to bottom, transparent, rgba(160,160,160,0.5) 20%, rgba(160,160,160,0.5) 80%, transparent)',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Add Chart button - small circle at bottom third of last row */}
        {charts.length > 0 && (() => {
          const isLastRowFull = charts.length % 2 === 0;
          return (
            <div
              className="absolute z-30"
              style={{
                right: isLastRowFull ? 'calc(50% - 16px)' : '0px',
                bottom: '0px',
                transform: 'translateY(-33%)',
              }}
              onMouseEnter={() => setAddBtnVisible(true)}
              onMouseLeave={() => setAddBtnVisible(false)}
            >
              <div className="absolute -inset-6" />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ease-out ${
                  addBtnVisible
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-75 pointer-events-none'
                }`}
                style={{
                  backgroundColor: '#3a3a3a',
                  boxShadow: addBtnVisible ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
                }}
                onClick={() => { addNewChart(); setAddBtnVisible(false); }}
              >
                <Plus size={16} className="text-gray-400" />
              </div>
            </div>
          );
        })()}

        {/* Hover detection zone for add button */}
        {charts.length > 0 && !addBtnVisible && (
          <div
            className="absolute bottom-0 left-0 right-0 h-16 z-20"
            onMouseEnter={() => setAddBtnVisible(true)}
          />
        )}
      </div>
      {charts.length === 0 && (
        <div className="text-center py-12" style={{ color: '#888888' }}>
          <p className="text-lg">No charts yet.</p>
          <p className="text-sm mt-2">Add a chart from the control panel to get started.</p>
        </div>
      )}
    </div>
  );
});

export default VisualizationCanvas;
