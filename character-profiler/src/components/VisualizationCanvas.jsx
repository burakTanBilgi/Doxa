import { forwardRef, useState, useRef } from 'react';
import { useCharts } from '../context/ChartContext';
import ChartDisplay from './ChartDisplay';

const VisualizationCanvas = forwardRef(function VisualizationCanvas({ 
  analysisTitle, 
  setAnalysisTitle, 
  analysisDescription, 
  setAnalysisDescription,
  mainHovered, 
  onCanvasLogoHover
}, ref) {
  const { charts, reorderCharts } = useCharts();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [titleInput, setTitleInput] = useState(analysisTitle);
  const [descInput, setDescInput] = useState(analysisDescription);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
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
      reorderCharts(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div
      ref={ref}
      className="rounded-xl p-6"
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
          src="/logo.png" 
          alt="Doxa" 
          className="h-8 w-auto rounded-lg logo-canvas transition-all duration-300"
          style={{
            opacity: mainHovered ? 0.9 : 0.7,
            filter: mainHovered ? 'drop-shadow(0 4px 12px rgba(199, 58, 58, 0.6))' : 'none',
            transform: mainHovered ? 'translateY(-2px)' : 'none'
          }}
          onMouseEnter={() => onCanvasLogoHover?.(true)}
          onMouseLeave={() => onCanvasLogoHover?.(false)}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts.map((chart, index) => (
          <div
            key={chart.id}
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
        ))}
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
