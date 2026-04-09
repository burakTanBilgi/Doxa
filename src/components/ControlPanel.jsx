import { useState, useRef, useEffect, useCallback } from 'react';
import { useCharts } from '../context/ChartContext';
import { Plus, Trash2, X, ChevronDown, ChevronUp, GripVertical, Lock, Unlock, Download, Upload, Image, FileJson, FileText, FileCode } from 'lucide-react';
import { exportAsJson, exportAsMarkdown, parseImportJson } from '../utils/exportFormats';

// Auto-scroll when dragging near edges - finds scrollable parent automatically
function useAutoScroll(isDragging) {
  const scrollSpeed = 12;
  const edgeThreshold = 80;
  const animationRef = useRef(null);
  const lastY = useRef(0);

  useEffect(() => {
    if (!isDragging) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const findScrollableParent = (element) => {
      while (element && element !== document.body) {
        const style = window.getComputedStyle(element);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return element;
        }
        element = element.parentElement;
      }
      return null;
    };

    const handleDragMove = (e) => {
      lastY.current = e.clientY;
      
      // Find all scrollable containers and check if we're near their edges
      const scrollContainers = document.querySelectorAll('[class*="overflow-y-auto"], [class*="overflow-auto"]');
      
      scrollContainers.forEach(container => {
        const rect = container.getBoundingClientRect();
        const y = e.clientY;
        
        // Check if mouse is within this container's horizontal bounds
        if (e.clientX < rect.left || e.clientX > rect.right) return;
        
        // Cancel existing animation for this container
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }

        const scroll = () => {
          const currentY = lastY.current;
          
          if (currentY < rect.top + edgeThreshold && currentY > rect.top - 20) {
            // Near top - scroll up
            const intensity = Math.max(0.3, 1 - (currentY - rect.top) / edgeThreshold);
            container.scrollTop -= scrollSpeed * intensity;
            animationRef.current = requestAnimationFrame(scroll);
          } else if (currentY > rect.bottom - edgeThreshold && currentY < rect.bottom + 20) {
            // Near bottom - scroll down  
            const intensity = Math.max(0.3, 1 - (rect.bottom - currentY) / edgeThreshold);
            container.scrollTop += scrollSpeed * intensity;
            animationRef.current = requestAnimationFrame(scroll);
          }
        };

        scroll();
      });
    };

    document.addEventListener('dragover', handleDragMove);
    return () => {
      document.removeEventListener('dragover', handleDragMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging]);
}

function TraitField({ chart, trait, index, onDragStart, onDragOver, onDrop, isDragging, dragOverIndex, onCrossChartDrop }) {
  const { updateTraitValue, removeTrait, updateTraitName } = useCharts();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(trait.subject);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);
  const [isDraggable, setIsDraggable] = useState(false);
  const [isSliderActive, setIsSliderActive] = useState(false);
  const sliderRef = useRef(null);

  // Click outside to deactivate slider and enable dragging
  useEffect(() => {
    if (!isSliderActive) return;
    
    const handleClickOutside = (e) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target)) {
        setIsSliderActive(false);
        setIsDraggable(true);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSliderActive]);

  const handleSave = () => {
    if (nameInput.trim()) {
      updateTraitName(chart.id, index, nameInput.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      removeTrait(chart.id, index);
    }, 300);
  };

  const handleDragStart = (e) => {
    if (!isDraggable) {
      e.preventDefault();
      return;
    }
    setIsBeingDragged(true);
    // Store chart ID and trait index for cross-chart transfers
    e.dataTransfer.setData('application/json', JSON.stringify({
      chartId: chart.id,
      traitIndex: index,
      traitName: trait.subject
    }));
    onDragStart(e, index);
  };

  const handleDragEnd = () => {
    setIsBeingDragged(false);
    setIsDraggable(false);
  };

  const isDropTarget = dragOverIndex === index && !isBeingDragged;

  return (
    <div 
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`group transition-all duration-200 rounded-lg p-2 -mx-2 ${isDeleting ? 'animate-deleteOut' : ''} ${isBeingDragged ? 'opacity-40 scale-95' : ''} ${isDropTarget ? 'bg-white/5 ring-2 ring-dashed' : ''}`}
      style={{ 
        '--tw-ring-color': isDropTarget ? chart.color + '80' : 'transparent'
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <GripVertical 
            size={12} 
            className="opacity-30 group-hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing" 
            style={{ color: chart.color }}
            onMouseDown={() => setIsDraggable(true)}
            onMouseUp={() => setIsDraggable(false)}
          />
          {isEditing ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="text-xs font-medium px-1.5 py-0.5 rounded-md focus:outline-none transition-all hover:ring-1 focus:ring-2"
              style={{ 
                backgroundColor: '#3d3d3d', 
                color: '#d0d0d0', 
                width: '120px',
                '--tw-ring-color': chart.color + '60'
              }}
              autoFocus
            />
          ) : (
            <label 
              className="text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 interactive-text"
              style={{ color: '#b8b8b8' }}
              onClick={() => setIsEditing(true)}
              title="Click to edit"
              data-hover-color={chart.color}
            >
              {trait.subject}
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono w-8 text-right transition-all" style={{ color: '#888888' }}>
            {trait.value}
          </span>
          {chart.data.length > 2 && (
            <button
              onClick={handleDelete}
              className="p-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-125 active:scale-90 rounded"
              style={{ color: chart.color }}
              title="Remove trait"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      <input
        ref={sliderRef}
        type="range"
        min="0"
        max="100"
        value={trait.value}
        onChange={(e) => updateTraitValue(chart.id, index, parseInt(e.target.value))}
        onMouseDown={(e) => {
          e.stopPropagation();
          if (!isSliderActive) {
            setIsSliderActive(true);
            setIsDraggable(false);
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isSliderActive) {
            // Second click on slider - deactivate and enable drag
            setIsSliderActive(false);
            setIsDraggable(true);
          }
        }}
        className={`w-full h-2 rounded-full appearance-none cursor-pointer transition-all hover:h-2.5 ${isSliderActive ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''}`}
        style={{
          background: `linear-gradient(to right, ${chart.color} 0%, ${chart.color} ${trait.value}%, #3d3d3d ${trait.value}%, #3d3d3d 100%)`,
          '--tw-ring-color': isSliderActive ? chart.color + '60' : 'transparent'
        }}
      />
    </div>
  );
}

function ChartControls({ chart, index: chartIndex, onChartDragStart, onChartDragOver, onChartDrop, isDragTarget }) {
  const { updateChartColor, addTrait, removeChart, updateChartTitle, reorderTraits, transferTrait } = useCharts();
  const [newTraitName, setNewTraitName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(chart.title);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draggedTraitIndex, setDraggedTraitIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragHandleHeld, setIsDragHandleHeld] = useState(false);
  const panelRef = useRef(null);

  // Reset drag handle on global mouseup
  useEffect(() => {
    const handleMouseUp = () => setIsDragHandleHeld(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleAddTrait = () => {
    if (newTraitName.trim()) {
      addTrait(chart.id, newTraitName);
      setNewTraitName('');
    }
  };

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      updateChartTitle(chart.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleDeleteChart = () => {
    setIsDeleting(true);
    setTimeout(() => {
      removeChart(chart.id);
    }, 400);
  };

  const handleTraitDragStart = (e, index) => {
    e.stopPropagation();
    setDraggedTraitIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image for trait
    const dragEl = document.createElement('div');
    dragEl.style.cssText = `
      padding: 6px 12px;
      background: ${chart.color};
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
    dragEl.textContent = chart.data[index].subject;
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 40, 15);
    requestAnimationFrame(() => document.body.removeChild(dragEl));
  };

  const handleTraitDragOver = (e, overIndex) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Check if this is from another chart (cross-chart transfer)
    try {
      const types = e.dataTransfer.types;
      if (types.includes('application/json')) {
        // This could be a cross-chart transfer, show drop indicator
        setDragOverIndex(overIndex);
      }
    } catch (err) {
      // Fallback
    }
    
    setDragOverIndex(overIndex);
  };

  const handleTraitDrop = (e, toIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a cross-chart transfer
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const { chartId, traitIndex } = JSON.parse(data);
        if (chartId !== chart.id) {
          // Cross-chart transfer
          transferTrait(chartId, traitIndex, chart.id, toIndex);
          setDraggedTraitIndex(null);
          setDragOverIndex(null);
          return;
        }
      }
    } catch (err) {
      // Not a cross-chart transfer, continue with normal reorder
    }
    
    if (draggedTraitIndex !== null && draggedTraitIndex !== toIndex) {
      reorderTraits(chart.id, draggedTraitIndex, toIndex);
    }
    setDraggedTraitIndex(null);
    setDragOverIndex(null);
  };

  const handleTraitDragEnd = () => {
    setDragOverIndex(null);
  };

  const handleChartDragStart = (e, index) => {
    setIsDragging(true);
    
    // Create miniaturized drag preview
    const dragEl = document.createElement('div');
    dragEl.style.cssText = `
      padding: 12px 16px;
      background: #252525;
      border: 2px solid ${chart.color};
      border-radius: 12px;
      color: #d0d0d0;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      position: fixed;
      top: -1000px;
      left: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      max-width: 180px;
    `;
    dragEl.innerHTML = `
      <span style="width: 12px; height: 12px; border-radius: 50%; background: ${chart.color}; flex-shrink: 0;"></span>
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${chart.title}</span>
    `;
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 90, 20);
    requestAnimationFrame(() => document.body.removeChild(dragEl));
    
    onChartDragStart(e, index);
  };

  const handleChartDragEnd = () => {
    setIsDragging(false);
  };

  // Handle cross-chart trait drop on the entire panel
  const handlePanelDrop = (e) => {
    // First check if this is a cross-chart trait transfer
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const { chartId, traitIndex } = JSON.parse(data);
        if (chartId !== chart.id) {
          e.preventDefault();
          e.stopPropagation();
          transferTrait(chartId, traitIndex, chart.id, -1);
          return;
        }
      }
    } catch (err) {
      // Not a trait transfer, let chart drop handler handle it
    }
    onChartDrop(e, chartIndex);
  };

  return (
    <div
      ref={panelRef}
      draggable={isDragHandleHeld}
      onDragStart={(e) => {
        if (!isDragHandleHeld) { e.preventDefault(); return; }
        handleChartDragStart(e, chartIndex);
      }}
      onDragEnd={() => { handleChartDragEnd(); setIsDragHandleHeld(false); }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onChartDragOver(e, chartIndex);
      }}
      onDrop={handlePanelDrop}
      className={`rounded-2xl p-4 transition-all duration-300 hover:shadow-lg ${isDeleting ? 'animate-deletePanel' : 'animate-slideIn'}`}
      style={{
        ...{
          backgroundColor: '#252525',
          border: '1px solid #3d3d3d',
          borderLeftColor: chart.color, 
          borderLeftWidth: '4px',
          animationDelay: isDeleting ? '0ms' : `${chartIndex * 100}ms`,
        },
        ...(isDragging ? { opacity: 0.4, transform: 'scale(0.97)', transition: 'opacity 0.2s ease, transform 0.2s ease' } : {}),
      }}
    >
      {/* Header - drag handle */}
      <div 
        className="flex items-center justify-between mb-3"
        onMouseDown={() => setIsDragHandleHeld(true)}
        style={{ cursor: 'grab' }}
      >
        <div className="flex items-center gap-2 flex-1">
          <input
            type="color"
            value={chart.color}
            onChange={(e) => updateChartColor(chart.id, e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-6 h-6 rounded-full cursor-pointer border-0 bg-transparent flex-shrink-0 transition-transform hover:scale-110"
            title="Change chart color"
          />
          {isEditingTitle ? (
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              onMouseDown={(e) => e.stopPropagation()}
              className="px-2 py-1 rounded-lg text-sm flex-1 focus:outline-none transition-all duration-200 cursor-text"
              style={{ 
                backgroundColor: '#3d3d3d', 
                color: '#d0d0d0',
                border: `1px solid ${chart.color}`,
                boxShadow: `0 0 0 2px ${chart.color}30`
              }}
              autoFocus
            />
          ) : (
            <h4
              className="font-medium text-sm cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 interactive-text"
              style={{ color: '#d0d0d0' }}
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit"
              data-hover-color={chart.color}
            >
              {chart.title}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
            style={{ 
              color: chart.color,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = chart.color + '20'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={handleDeleteChart}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
            style={{ 
              color: chart.color,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = chart.color + '20'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Delete chart"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div 
          className="space-y-1 mb-4 min-h-[40px] rounded-lg transition-all"
          onDragLeave={() => setDragOverIndex(null)}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => handleTraitDrop(e, chart.data.length)}
          style={{
            border: dragOverIndex !== null ? 'none' : undefined
          }}
        >
          {chart.data.map((trait, index) => (
            <TraitField 
              key={`${chart.id}-${trait.subject}-${index}`} 
              chart={chart} 
              trait={trait} 
              index={index}
              onDragStart={handleTraitDragStart}
              onDragOver={handleTraitDragOver}
              onDrop={handleTraitDrop}
              isDragging={draggedTraitIndex === index}
              dragOverIndex={dragOverIndex}
            />
          ))}
        </div>

        {/* Bottom area - also a drag handle */}
        <div 
          className="flex gap-2"
          onMouseDown={() => setIsDragHandleHeld(true)}
          style={{ cursor: 'grab' }}
        >
          <input
            type="text"
            value={newTraitName}
            onChange={(e) => setNewTraitName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrait()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="New trait name..."
            className="flex-1 text-sm px-3 py-2 rounded-xl focus:outline-none transition-all duration-200 hover:border-opacity-80 focus:scale-[1.02] cursor-text"
            style={{ 
              backgroundColor: '#3d3d3d', 
              color: '#d0d0d0',
              border: `1px solid ${chart.color}40`,
              boxShadow: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = `1px solid ${chart.color}`;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${chart.color}30`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = `1px solid ${chart.color}40`;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleAddTrait}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!newTraitName.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl transition-all duration-200 hover:scale-105 active:scale-90 hover:shadow-lg cursor-pointer"
            style={{ 
              backgroundColor: newTraitName.trim() ? chart.color : '#3d3d3d',
              color: newTraitName.trim() ? '#ffffff' : '#888888'
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ControlPanel({ onExportPng, onExportSvg, isExporting, scrollSyncEnabled, onToggleScrollSync, canToggleSync, analysisTitle, analysisDescription, setAnalysisTitle, setAnalysisDescription }) {
  const { charts, addNewChart, reorderCharts, importCharts } = useCharts();
  const [draggedChartIndex, setDraggedChartIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | 'on'
  const [exportOpen, setExportOpen] = useState(false);
  const [importPrompt, setImportPrompt] = useState(null); // { charts, title, description }
  const exportRef = useRef(null);
  const fileInputRef = useRef(null);

  // Enable auto-scroll when dragging
  useAutoScroll(draggedChartIndex !== null);

  // Close export dropdown on click-outside
  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  const handleExportJson = () => {
    exportAsJson(analysisTitle, analysisDescription, charts);
    setExportOpen(false);
  };

  const handleExportMarkdown = () => {
    exportAsMarkdown(analysisTitle, analysisDescription, charts);
    setExportOpen(false);
  };

  const handleExportPng = () => {
    onExportPng?.();
    setExportOpen(false);
  };

  const handleExportSvg = () => {
    onExportSvg?.();
    setExportOpen(false);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const result = parseImportJson(evt.target.result);
        setImportPrompt(result);
      } catch (err) {
        alert('Failed to import: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = (mode) => {
    if (importPrompt) {
      importCharts(importPrompt.charts, mode);
      if (mode === 'replace') {
        setAnalysisTitle?.(importPrompt.title);
        setAnalysisDescription?.(importPrompt.description);
      }
    }
    setImportPrompt(null);
  };

  const handleChartDragStart = (e, index) => {
    setDraggedChartIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create preview
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
    e.dataTransfer.setDragImage(preview, 50, 20);
    requestAnimationFrame(() => preview.remove());
  };

  const handleChartDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedChartIndex === null || draggedChartIndex === index) return;
    
    // Determine drop position based on mouse position within element
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const threshold = rect.height / 2;
    
    setDropTargetIndex(index);
    setDropPosition(y < threshold ? 'before' : 'after');
  };

  const handleGapDragOver = (e, insertIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetIndex(insertIndex);
    setDropPosition('gap');
  };

  const handleChartDrop = (e, toIndex) => {
    e.preventDefault();
    if (draggedChartIndex !== null && draggedChartIndex !== toIndex) {
      // Adjust target index based on position
      let targetIndex = toIndex;
      if (dropPosition === 'after' && draggedChartIndex < toIndex) {
        targetIndex = toIndex;
      } else if (dropPosition === 'before' && draggedChartIndex > toIndex) {
        targetIndex = toIndex;
      } else if (dropPosition === 'after') {
        targetIndex = toIndex + 1;
      }
      reorderCharts(draggedChartIndex, Math.min(targetIndex, charts.length - 1));
    }
    resetDragState();
  };

  const handleGapDrop = (e, insertIndex) => {
    e.preventDefault();
    if (draggedChartIndex !== null) {
      const targetIndex = draggedChartIndex < insertIndex ? insertIndex - 1 : insertIndex;
      if (targetIndex !== draggedChartIndex) {
        reorderCharts(draggedChartIndex, Math.min(targetIndex, charts.length - 1));
      }
    }
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedChartIndex(null);
    setDropTargetIndex(null);
    setDropPosition(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#888888' }}>Control Panel</h2>
        <div className="flex items-center gap-2">
          {/* Scroll Sync Toggle - hidden on mobile, only visible when both panels at top */}
          <button
            onClick={onToggleScrollSync}
            disabled={!canToggleSync}
            className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 ${
              canToggleSync 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
            style={{ 
              backgroundColor: '#1a1a1a',
              color: scrollSyncEnabled ? '#c73a3a' : '#666666'
            }}
            title={scrollSyncEnabled ? 'Scroll sync ON (click to unlock)' : 'Scroll sync OFF (click to lock)'}
          >
            {scrollSyncEnabled ? (
              <Lock size={14} />
            ) : (
              <Unlock size={14} />
            )}
          </button>
          
          {/* Import button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ backgroundColor: '#3d3d3d', color: '#888888' }}
            title="Import JSON"
          >
            <Download size={13} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              disabled={isExporting}
              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ 
                backgroundColor: isExporting ? '#3d3d3d' : '#c73a3a',
                color: isExporting ? '#888888' : '#ffffff'
              }}
              title="Export"
            >
              <Upload size={13} />
            </button>
            {exportOpen && (
              <div 
                className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden shadow-xl z-50"
                style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', minWidth: '140px' }}
              >
                <button onClick={handleExportPng} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors hover:bg-white/5" style={{ color: '#d0d0d0' }}>
                  <Image size={13} style={{ color: '#c73a3a' }} /> PNG Image
                </button>
                <button onClick={handleExportSvg} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors hover:bg-white/5" style={{ color: '#d0d0d0' }}>
                  <FileCode size={13} style={{ color: '#c73a3a' }} /> SVG Image
                </button>
                <div style={{ borderTop: '1px solid #3d3d3d' }} />
                <button onClick={handleExportJson} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors hover:bg-white/5" style={{ color: '#d0d0d0' }}>
                  <FileJson size={13} style={{ color: '#888888' }} /> JSON Data
                </button>
                <button onClick={handleExportMarkdown} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors hover:bg-white/5" style={{ color: '#d0d0d0' }}>
                  <FileText size={13} style={{ color: '#888888' }} /> Markdown
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import confirmation prompt */}
      {importPrompt && (
        <div 
          className="mb-3 p-3 rounded-lg text-xs"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #3d3d3d' }}
        >
          <p style={{ color: '#d0d0d0' }} className="mb-2">
            Import <strong>{importPrompt.charts.length}</strong> chart{importPrompt.charts.length !== 1 ? 's' : ''} from <strong>"{importPrompt.title}"</strong>?
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => handleImportConfirm('replace')}
              className="flex-1 px-2 py-1.5 text-xs rounded-md transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#c73a3a', color: '#ffffff' }}
            >
              Replace All
            </button>
            <button 
              onClick={() => handleImportConfirm('append')}
              className="flex-1 px-2 py-1.5 text-xs rounded-md transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#3d3d3d', color: '#d0d0d0' }}
            >
              Append
            </button>
            <button 
              onClick={() => setImportPrompt(null)}
              className="px-2 py-1.5 text-xs rounded-md transition-all hover:scale-105 active:scale-95"
              style={{ color: '#888888' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1" onDragEnd={resetDragState}>
        {/* Top drop zone */}
        {draggedChartIndex !== null && draggedChartIndex !== 0 && (
          <div
            className="h-3 mb-1 rounded-full transition-all duration-150"
            style={{
              backgroundColor: dropTargetIndex === 0 && dropPosition === 'gap' 
                ? (charts[draggedChartIndex]?.color || '#c73a3a') + '50' 
                : 'transparent',
            }}
            onDragOver={(e) => handleGapDragOver(e, 0)}
            onDrop={(e) => handleGapDrop(e, 0)}
          />
        )}
        
        {charts.map((chart, index) => (
          <div key={chart.id}>
            <div
              className="transition-all duration-200"
              style={{
                opacity: draggedChartIndex === index ? 0.35 : 1,
                transform: draggedChartIndex === index ? 'scale(0.97)' : 
                           (dropTargetIndex === index && dropPosition === 'before') ? 'translateY(3px)' :
                           (dropTargetIndex === index && dropPosition === 'after') ? 'translateY(-3px)' : 'none',
                borderTop: dropTargetIndex === index && dropPosition === 'before' ? `2px solid ${charts[draggedChartIndex]?.color || '#c73a3a'}` : '2px solid transparent',
                borderBottom: dropTargetIndex === index && dropPosition === 'after' ? `2px solid ${charts[draggedChartIndex]?.color || '#c73a3a'}` : '2px solid transparent',
                borderRadius: '4px',
                transition: 'all 0.15s ease-out',
              }}
            >
              <ChartControls 
                chart={chart} 
                index={index}
                onChartDragStart={handleChartDragStart}
                onChartDragOver={handleChartDragOver}
                onChartDrop={handleChartDrop}
                isDragTarget={dropTargetIndex === index}
              />
            </div>
            
            {/* Gap between charts */}
            {index < charts.length - 1 && draggedChartIndex !== null && draggedChartIndex !== index && draggedChartIndex !== index + 1 && (
              <div
                className="h-3 my-1 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: dropTargetIndex === index + 1 && dropPosition === 'gap'
                    ? (charts[draggedChartIndex]?.color || '#c73a3a') + '50'
                    : 'transparent',
                }}
                onDragOver={(e) => handleGapDragOver(e, index + 1)}
                onDrop={(e) => handleGapDrop(e, index + 1)}
              />
            )}
            
            {/* Normal spacing when not dragging */}
            {(draggedChartIndex === null || draggedChartIndex === index || draggedChartIndex === index + 1) && index < charts.length - 1 && (
              <div className="h-3" />
            )}
          </div>
        ))}
      </div>

      {/* Add Chart button at bottom */}
      <button
        onClick={addNewChart}
        className="mt-4 mb-16 lg:mb-0 w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg animate-pulse-subtle"
        style={{ 
          backgroundColor: '#3d3d3d',
          color: '#d0d0d0',
          border: '2px dashed #555555'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedChartIndex !== null) {
            setDropTargetIndex(charts.length);
            setDropPosition('gap');
          }
        }}
        onDrop={(e) => handleGapDrop(e, charts.length)}
      >
        <Plus size={18} />
        Add New Chart
      </button>
    </div>
  );
}
