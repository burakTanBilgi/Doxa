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

function TwoFieldChart({ chart }) {
  const scatterData = [{
    x: chart.data[0]?.value || 0,
    y: chart.data[1]?.value || 0,
    name: chart.title
  }];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
        <CartesianGrid stroke="#3d3d3d" strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          dataKey="x" 
          domain={[0, 100]} 
          name={chart.data[0]?.subject || 'X'}
          tick={{ fill: '#b8b8b8', fontSize: 10 }}
          axisLine={{ stroke: '#4d4d4d' }}
          label={{ 
            value: chart.data[0]?.subject || 'X', 
            position: 'bottom', 
            fill: '#b8b8b8',
            fontSize: 11
          }}
        />
        <YAxis 
          type="number" 
          dataKey="y" 
          domain={[0, 100]} 
          name={chart.data[1]?.subject || 'Y'}
          tick={{ fill: '#b8b8b8', fontSize: 10 }}
          axisLine={{ stroke: '#4d4d4d' }}
          label={{ 
            value: chart.data[1]?.subject || 'Y', 
            angle: -90, 
            position: 'insideLeft', 
            fill: '#b8b8b8',
            fontSize: 11
          }}
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
            style={{ fill: '#d0d0d0', fontSize: 10 }} 
          />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function RadarChartDisplay({ chart, traitCount }) {
  const outerRadius = traitCount >= 10 ? '45%' : traitCount >= 7 ? '50%' : '65%';
  const fontSize = traitCount >= 10 ? 7 : traitCount >= 7 ? 8 : 10;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={chart.data} cx="50%" cy="50%" outerRadius={outerRadius}>
        <PolarGrid stroke="#4d4d4d" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#b8b8b8', fontSize }}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
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
  const traitCount = chart.data.length;

  return (
    <div 
      className="rounded-2xl p-5 animate-scaleIn transition-all duration-300 hover:shadow-xl"
      style={{ 
        backgroundColor: '#252525', 
        border: '1px solid #3d3d3d',
        animationDelay: `${index * 100}ms`
      }}
    >
      <h3 
        className="text-base font-semibold mb-3 text-center transition-colors"
        style={{ color: '#d0d0d0' }}
      >
        {chart.title}
      </h3>
      <div className="w-full h-[280px]">
        {traitCount === 2 ? (
          <TwoFieldChart chart={chart} />
        ) : (
          <RadarChartDisplay chart={chart} traitCount={traitCount} />
        )}
      </div>
    </div>
  );
}
