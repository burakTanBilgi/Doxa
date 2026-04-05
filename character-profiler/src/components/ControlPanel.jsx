import { useState, useRef } from 'react';
import { useCharts } from '../context/ChartContext';
import { Plus, Trash2, X, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

function TraitField({ chart, trait, index, onDragStart, onDragOver, onDrop, isDragging }) {
  const { updateTraitValue, removeTrait, updateTraitName } = useCharts();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(trait.subject);
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`group transition-all duration-300 ${isDeleting ? 'animate-deleteOut' : 'animate-fadeIn'} ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'grab' }}
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
    setDraggedTraitIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTraitDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTraitDrop = (e, toIndex) => {
    e.preventDefault();
    if (draggedTraitIndex !== null && draggedTraitIndex !== toIndex) {
      reorderTraits(chart.id, draggedTraitIndex, toIndex);
    }
    setDraggedTraitIndex(null);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onChartDragStart(e, chartIndex)}
      onDragOver={onChartDragOver}
      onDrop={(e) => onChartDrop(e, chartIndex)}
      className={`rounded-2xl p-4 transition-all duration-300 hover:shadow-lg ${isDeleting ? 'animate-deletePanel' : 'animate-slideIn'}`}
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
        <div className="space-y-3 mb-4">
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

export default function ControlPanel() {
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: '#d0d0d0' }}>Charts</h2>
        <button
          onClick={addNewChart}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
          style={{ backgroundColor: '#c73a3a', color: '#ffffff' }}
        >
          <Plus size={14} />
          Add Chart
        </button>
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
    </div>
  );
}
