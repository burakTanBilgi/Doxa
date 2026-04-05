import { forwardRef, useState } from 'react';
import { useCharts } from '../context/ChartContext';
import ChartDisplay from './ChartDisplay';
import { Camera, Loader2 } from 'lucide-react';

const VisualizationCanvas = forwardRef(function VisualizationCanvas({ 
  analysisTitle, 
  setAnalysisTitle, 
  analysisDescription, 
  setAnalysisDescription,
  mainHovered, 
  onCanvasLogoHover,
  onExport,
  isExporting
}, ref) {
  const { charts } = useCharts();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [titleInput, setTitleInput] = useState(analysisTitle);
  const [descInput, setDescInput] = useState(analysisDescription);

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
        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ 
              backgroundColor: isExporting ? '#3d3d3d' : '#c73a3a',
              color: isExporting ? '#888888' : '#ffffff'
            }}
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Camera size={14} />
            )}
            {isExporting ? 'Saving...' : 'Export'}
          </button>
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
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts.map((chart, index) => (
          <ChartDisplay key={chart.id} chart={chart} index={index} />
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
