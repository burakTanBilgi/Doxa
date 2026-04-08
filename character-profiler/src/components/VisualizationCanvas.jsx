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
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [gapDropIndex, setGapDropIndex] = useState(null);
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

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Create mini preview
    const preview = document.createElement('div');
    preview.style.cssText = `
      padding: 8px 16px;
      background: ${charts[index].color};
      color: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    preview.textContent = charts[index].title;
    document.body.appendChild(preview);
    dragImageRef.current = preview;
    e.dataTransfer.setDragImage(preview, 50, 20);
    setTimeout(() => preview.remove(), 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      swapCharts(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setGapDropIndex(null);
  };

  const handleGapDragOver = (e, gapIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null) {
      setGapDropIndex(gapIndex);
      setDropTargetIndex(null);
    }
  };

  const handleGapDrop = (e, gapIndex) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      const targetIndex = draggedIndex < gapIndex ? gapIndex - 1 : gapIndex;
      if (targetIndex !== draggedIndex && targetIndex >= 0) {
        reorderCharts(draggedIndex, Math.min(targetIndex, charts.length - 1));
      }
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setGapDropIndex(null);
  };

  return (
    <div
      ref={ref}
      className="rounded-xl p-6 overflow-hidden"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Header for export */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-2xl font-bold bg-transparent border-b-2 focus:outline-none w-full"
              style={{ color: '#c73a3a', borderColor: '#c73a3a' }}
              autoFocus
            />
          ) : (
            <h2 
              className="text-2xl font-bold cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-100"
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
          className="h-14 w-auto logo-canvas transition-all duration-300"
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
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          onDragOver={(e) => {
            if (draggedIndex !== null) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={(e) => handleGapDrop(e, charts.length)}
        >
          {charts.map((chart, index) => {
            const isLeftCol = index % 2 === 0;
            const isRightCol = index % 2 === 1;
            return (
              <div key={chart.id} className="relative">
                {/* Horizontal gap drop zone above this chart */}
                {draggedIndex !== null && draggedIndex !== index && (
                  <div
                    className={`absolute -top-3 left-0 right-0 h-6 z-10 transition-all duration-200 rounded-full ${
                      gapDropIndex === index ? 'bg-white/10' : ''
                    }`}
                    onDragOver={(e) => handleGapDragOver(e, index)}
                    onDrop={(e) => handleGapDrop(e, index)}
                    onDragLeave={() => setGapDropIndex(null)}
                  >
                    {gapDropIndex === index && (
                      <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-gray-400 rounded-full" />
                    )}
                  </div>
                )}
                {/* Vertical gap drop zone on the left side of right-column charts */}
                {draggedIndex !== null && isRightCol && draggedIndex !== index && draggedIndex !== index - 1 && (
                  <div
                    className={`absolute -left-3 top-0 bottom-0 w-6 z-10 transition-all duration-200 ${
                      gapDropIndex === index + 0.5 ? 'bg-white/10' : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (draggedIndex !== null) {
                        setGapDropIndex(index + 0.5);
                        setDropTargetIndex(null);
                      }
                    }}
                    onDrop={(e) => handleGapDrop(e, index)}
                    onDragLeave={() => setGapDropIndex(null)}
                  >
                    {gapDropIndex === index + 0.5 && (
                      <div className="absolute left-1/2 top-4 bottom-4 w-0.5 -translate-x-1/2 bg-gray-400 rounded-full" />
                    )}
                  </div>
                )}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-200 rounded-2xl ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  } ${
                    dropTargetIndex === index ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''
                  }`}
                  style={{
                    cursor: 'grab',
                    ringColor: dropTargetIndex === index ? chart.color : undefined
                  }}
                >
                  <ChartDisplay chart={chart} index={index} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Add Chart button - small circle positioned at bottom third of last row */}
        {charts.length > 0 && (() => {
          const isLastRowFull = charts.length % 2 === 0;
          return (
            <div
              className="absolute z-30"
              style={{
                // Between last 2 charts if even, or right edge of last chart if odd
                right: isLastRowFull ? 'calc(50% - 16px)' : '0px',
                bottom: '0px',
                // Position at 1/3 from bottom of the last chart
                transform: 'translateY(-33%)',
              }}
              onMouseEnter={() => setAddBtnVisible(true)}
              onMouseLeave={() => setAddBtnVisible(false)}
            >
              {/* Larger invisible hover trigger */}
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

        {/* Hover detection zone at bottom of grid for showing add button */}
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
