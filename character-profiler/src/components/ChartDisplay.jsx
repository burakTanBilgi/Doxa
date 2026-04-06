import { useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList
} from 'recharts';
import { useCharts } from '../context/ChartContext';

function TwoFieldChart({ chart, onEditField }) {
  const scatterData = [{
    x: chart.data[0]?.value || 0,
    y: chart.data[1]?.value || 0,
    name: chart.title
  }];

  const CustomXLabel = (props) => {
    const { viewBox } = props;
    return (
      <text
        x={viewBox.x + viewBox.width / 2}
        y={viewBox.y + viewBox.height + 25}
        textAnchor="middle"
        fill="#b8b8b8"
        fontSize={11}
        style={{ cursor: 'pointer' }}
        onClick={() => onEditField(0)}
        className="hover:fill-white"
      >
        {chart.data[0]?.subject || 'X'}
      </text>
    );
  };

  const CustomYLabel = (props) => {
    const { viewBox } = props;
    return (
      <text
        x={viewBox.x - 25}
        y={viewBox.y + viewBox.height / 2}
        textAnchor="middle"
        fill="#b8b8b8"
        fontSize={11}
        transform={`rotate(-90, ${viewBox.x - 25}, ${viewBox.y + viewBox.height / 2})`}
        style={{ cursor: 'pointer' }}
        onClick={() => onEditField(1)}
        className="hover:fill-white"
      >
        {chart.data[1]?.subject || 'Y'}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
        <CartesianGrid stroke="#3d3d3d" strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          dataKey="x" 
          domain={[0, 100]} 
          ticks={[0, 25, 50, 75, 100]}
          name={chart.data[0]?.subject || 'X'}
          tick={{ fill: '#888', fontSize: 9 }}
          axisLine={{ stroke: '#4d4d4d' }}
          label={<CustomXLabel />}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          domain={[0, 100]} 
          ticks={[0, 25, 50, 75, 100]}
          name={chart.data[1]?.subject || 'Y'}
          tick={{ fill: '#888', fontSize: 9 }}
          axisLine={{ stroke: '#4d4d4d' }}
          label={<CustomYLabel />}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#2d2d2d',
            border: '1px solid #4d4d4d',
            borderRadius: '8px',
            color: '#d0d0d0'
          }}
          formatter={(value, name) => [`${value}%`, name === 'x' ? chart.data[0]?.subject : chart.data[1]?.subject]}
        />
        <Scatter 
          data={scatterData} 
          isAnimationActive={true}
          animationDuration={500}
        >
          <Cell fill={chart.color} />
          <LabelList 
            dataKey="name" 
            position="top" 
            offset={15}
            style={{ fill: '#d0d0d0', fontSize: 10 }} 
          />
          <LabelList 
            dataKey={(entry) => `(${entry.x}, ${entry.y})`}
            position="bottom" 
            offset={8}
            style={{ fill: chart.color, fontSize: 9, fontWeight: 600 }} 
          />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function RadarChartDisplay({ chart, traitCount, onLabelClick }) {
  const outerRadius = traitCount >= 10 ? '45%' : traitCount >= 7 ? '50%' : '65%';
  const fontSize = traitCount >= 10 ? 7 : traitCount >= 7 ? 8 : 10;
  const valueFontSize = traitCount >= 10 ? 6 : traitCount >= 7 ? 7 : 8;

  const CustomTick = ({ payload, x, y, textAnchor, cx, cy }) => {
    const index = chart.data.findIndex(d => d.subject === payload.value);
    const value = chart.data[index]?.value || 0;
    
    // Calculate position for value label (closer to center)
    const angle = Math.atan2(y - cy, x - cx);
    const valueOffset = 12;
    const valueX = x - Math.cos(angle) * valueOffset;
    const valueY = y - Math.sin(angle) * valueOffset;
    
    return (
      <g>
        <text
          x={x}
          y={y}
          textAnchor={textAnchor}
          fill="#b8b8b8"
          fontSize={fontSize}
          style={{ cursor: 'pointer' }}
          onClick={() => onLabelClick(index)}
          className="hover:fill-white transition-colors"
        >
          {payload.value}
        </text>
        <text
          x={valueX}
          y={valueY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={chart.color}
          fontSize={valueFontSize}
          fontWeight="600"
        >
          {value}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={chart.data} cx="50%" cy="50%" outerRadius={outerRadius}>
        <PolarGrid stroke="#4d4d4d" />
        <PolarAngleAxis
          dataKey="subject"
          tick={<CustomTick />}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#666', fontSize: 8 }}
          tickCount={5}
          axisLine={false}
        />
        <Radar
          name={chart.title}
          dataKey="value"
          stroke={chart.color}
          fill={chart.color}
          fillOpacity={0.35}
          strokeWidth={2}
          isAnimationActive={true}
          animationDuration={500}
          animationEasing="ease-out"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#2d2d2d',
            border: '1px solid #4d4d4d',
            borderRadius: '8px',
            color: '#d0d0d0'
          }}
          formatter={(value) => [`${value}%`, 'Value']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default function ChartDisplay({ chart, index = 0 }) {
  const { updateChartTitle, updateTraitName } = useCharts();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(chart.title);
  const [editingFieldIndex, setEditingFieldIndex] = useState(null);
  const [fieldInput, setFieldInput] = useState('');
  const traitCount = chart.data.length;

  const handleTitleSave = () => {
    if (titleInput.trim()) {
      updateChartTitle(chart.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleFieldEdit = (idx) => {
    setEditingFieldIndex(idx);
    setFieldInput(chart.data[idx].subject);
  };

  const handleFieldSave = () => {
    if (fieldInput.trim() && editingFieldIndex !== null) {
      updateTraitName(chart.id, editingFieldIndex, fieldInput.trim());
    }
    setEditingFieldIndex(null);
    setFieldInput('');
  };

  return (
    <div 
      className="rounded-2xl p-5 animate-scaleIn transition-all duration-300 hover:shadow-xl"
      style={{ 
        backgroundColor: '#252525', 
        border: '1px solid #3d3d3d',
        animationDelay: `${index * 100}ms`
      }}
    >
      {isEditingTitle ? (
        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
          className="text-base font-semibold mb-3 text-center w-full bg-transparent border-b-2 focus:outline-none"
          style={{ color: '#d0d0d0', borderColor: chart.color }}
          autoFocus
        />
      ) : (
        <h3 
          className="text-base font-semibold mb-3 text-center transition-all cursor-pointer hover:scale-105"
          style={{ color: '#d0d0d0' }}
          onClick={() => {
            setTitleInput(chart.title);
            setIsEditingTitle(true);
          }}
          title="Click to edit"
        >
          {chart.title}
        </h3>
      )}

      {/* Edit field overlay */}
      {editingFieldIndex !== null && (
        <div className="flex justify-center mb-2">
          <input
            type="text"
            value={fieldInput}
            onChange={(e) => setFieldInput(e.target.value)}
            onBlur={handleFieldSave}
            onKeyDown={(e) => e.key === 'Enter' && handleFieldSave()}
            className="text-sm px-3 py-1.5 rounded-lg bg-transparent border-2 focus:outline-none text-center"
            style={{ color: chart.color, borderColor: chart.color, minWidth: '120px' }}
            autoFocus
            placeholder="Field name..."
          />
        </div>
      )}

      <div className="w-full h-[280px]">
        {traitCount === 2 ? (
          <TwoFieldChart chart={chart} onEditField={handleFieldEdit} />
        ) : (
          <RadarChartDisplay chart={chart} traitCount={traitCount} onLabelClick={handleFieldEdit} />
        )}
      </div>
    </div>
  );
}
