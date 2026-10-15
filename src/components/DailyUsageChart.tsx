import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DailyUsageChartProps {
  data: Array<{ date: string; tokens: number }>;
}

const DailyUsageChart: React.FC<DailyUsageChartProps> = ({ data }) => {
  const chartData = data.map(([date, tokens]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tokens,
  }));

  return (
    <div className="graph-container">
      <div className="graph-title">Daily Token Usage (Last 30 Days)</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
          <XAxis
            dataKey="date"
            stroke="#ffffff"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#ffffff' }}
          />
          <YAxis
            stroke="#ffffff"
            style={{ fontSize: '10px' }}
            tick={{ fill: '#ffffff' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111111',
              border: '1px solid #333333',
              color: '#ffffff',
            }}
            itemStyle={{ color: '#ffffff' }}
          />
          <Line
            type="monotone"
            dataKey="tokens"
            stroke="#58a6ff"
            strokeWidth={2}
            dot={{ fill: '#58a6ff', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyUsageChart;
