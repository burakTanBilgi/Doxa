import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export default function ChartDisplay({ chart }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 backdrop-blur-sm border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4 text-center">
        {chart.title}
      </h3>
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chart.data} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid stroke="#475569" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 10 }}
              axisLine={false}
            />
            <Radar
              name={chart.title}
              dataKey="value"
              stroke={chart.color}
              fill={chart.color}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#f1f5f9'
              }}
              formatter={(value) => [`${value}%`, 'Value']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
