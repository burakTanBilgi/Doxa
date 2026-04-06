import { useState, useRef } from 'react';
import { useCharts } from '../context/ChartContext';
import { Plus, Trash2, X, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

function TraitField({ chart, trait, index, onDragStart, onDragOver, onDrop, isDragging, dragOverIndex }) {
  const { updateTraitValue, removeTrait, updateTraitName } = useCharts();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(trait.subject);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBeingDragged, setIsBeingDragged] = useState(false);

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
    setIsBeingDragged(true);
    onDragStart(e, index);
  };

  const handleDragEnd = () => {
    setIsBeingDragged(false);
  };

  const isDropTarget = dragOverIndex === index && !isBeingDragged;

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className={`group transition-all duration-200 rounded-lg p-2 -mx-2 ${isDeleting ? 'animate-deleteOut' : ''} ${isBeingDragged ? 'opacity-40 scale-95' : ''} ${isDropTarget ? 'bg-white/5 ring-2 ring-dashed' : ''}`}
      style={{ 
        cursor: 'grab',
        '--tw-ring-color': isDropTarget ? chart.color + '80' : 'transparent'
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <GripVertical 
            size={12} 
            className="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab" 
            style={{ color: chart.color }}
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
        type="range"
        min="0"
        max="100"
        value={trait.value}
        onChange={(e) => updateTraitValue(chart.id, index, parseInt(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer transition-all hover:h-2.5"
        style={{
          background: `linear-gradient(to right, ${chart.color} 0%, ${chart.color} ${trait.value}%, #3d3d3d ${trait.value}%, #3d3d3d 100%)`
        }}
      />
    </div>
  );
}

function ChartControls({ chart, index: chartIndex, onChartDragStart, onChartDragOver, onChartDrop }) {
  const { updateChartColor, addTrait, removeChart, updateChartTitle, reorderTraits } = useCharts();
  const [newTraitName, setNewTraitName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(chart.title);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draggedTraitIndex, setDraggedTraitIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);

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
    dragEl.className = 'drag-preview';
    dragEl.style.cssText = `
      padding: 6px 12px;
      background: ${chart.color};
      color: white;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      position: absolute;
      top: -1000px;
    `;
    dragEl.textContent = chart.data[index].subject;
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 40, 15);
    setTimeout(() => document.body.removeChild(dragEl), 0);
  };

  const handleTraitDragOver = (e, overIndex) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(overIndex);
  };

  const handleTraitDrop = (e, toIndex) => {
    e.preventDefault();
    e.stopPropagation();
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
      position: absolute;
      top: -1000px;
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 180px;
    `;
    dragEl.innerHTML = `
      <span style="width: 12px; height: 12px; border-radius: 50%; background: ${chart.color}; flex-shrink: 0;"></span>
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${chart.title}</span>
    `;
    document.body.appendChild(dragEl);
    e.dataTransfer.setDragImage(dragEl, 90, 20);
    setTimeout(() => document.body.removeChild(dragEl), 0);
    
    onChartDragStart(e, index);
  };

  const handleChartDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={panelRef}
      draggable
      onDragStart={(e) => handleChartDragStart(e, chartIndex)}
      onDragEnd={handleChartDragEnd}
      onDragOver={onChartDragOver}
      onDrop={(e) => onChartDrop(e, chartIndex)}
      className={`rounded-2xl p-4 transition-all duration-300 hover:shadow-lg ${isDeleting ? 'animate-deletePanel' : 'animate-slideIn'} ${isDragging ? 'opacity-50 scale-95' : ''}`}
      style={{ 
        backgroundColor: '#252525',
        border: '1px solid #3d3d3d',
        borderLeftColor: chart.color, 
        borderLeftWidth: '4px',
        animationDelay: isDeleting ? '0ms' : `${chartIndex * 100}ms`,
        cursor: 'grab'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <input
            type="color"
            value={chart.color}
            onChange={(e) => updateChartColor(chart.id, e.target.value)}
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
              className="px-2 py-1 rounded-lg text-sm flex-1 focus:outline-none transition-all duration-200"
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
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90"
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
            className="p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-90"
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
          className="space-y-1 mb-4"
          onDragLeave={() => setDragOverIndex(null)}
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

        <div className="flex gap-2">
          <input
            type="text"
            value={newTraitName}
            onChange={(e) => setNewTraitName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrait()}
            placeholder="New trait name..."
            className="flex-1 text-sm px-3 py-2 rounded-xl focus:outline-none transition-all duration-200 hover:border-opacity-80 focus:scale-[1.02]"
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
            disabled={!newTraitName.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-xl transition-all duration-200 hover:scale-105 active:scale-90 hover:shadow-lg"
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

export default function ControlPanel({ onExport, isExporting }) {
  const { charts, addNewChart, reorderCharts } = useCharts();
  const [draggedChartIndex, setDraggedChartIndex] = useState(null);

  const handleChartDragStart = (e, index) => {
    setDraggedChartIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleChartDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleChartDrop = (e, toIndex) => {
    e.preventDefault();
    if (draggedChartIndex !== null && draggedChartIndex !== toIndex) {
      reorderCharts(draggedChartIndex, toIndex);
    }
    setDraggedChartIndex(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#888888' }}>Charts</h2>
        {onExport && (
          <button
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ 
              backgroundColor: isExporting ? '#3d3d3d' : '#c73a3a',
              color: isExporting ? '#888888' : '#ffffff'
            }}
          >
            {isExporting ? 'Saving...' : 'Export'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 scroll-smooth">
        {charts.map((chart, index) => (
          <ChartControls 
            key={chart.id} 
            chart={chart} 
            index={index}
            onChartDragStart={handleChartDragStart}
            onChartDragOver={handleChartDragOver}
            onChartDrop={handleChartDrop}
          />
        ))}
      </div>

      {/* Add Chart button at bottom */}
      <button
        onClick={addNewChart}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg animate-pulse-subtle"
        style={{ 
          backgroundColor: '#3d3d3d',
          color: '#d0d0d0',
          border: '2px dashed #555555'
        }}
      >
        <Plus size={18} />
        Add New Chart
      </button>
    </div>
  );
}
