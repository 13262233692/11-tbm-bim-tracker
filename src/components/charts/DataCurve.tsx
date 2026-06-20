import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { TbmPoseData } from '@/types/tbm';

interface DataCurveProps {
  data: TbmPoseData[];
  dataKey: keyof TbmPoseData['rotation'] | keyof TbmPoseData['position'];
  label: string;
  unit?: string;
  color?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
}

export const DataCurve: React.FC<DataCurveProps> = ({
  data,
  dataKey,
  label,
  unit = '',
  color = '#22d3ee',
  warningThreshold,
  dangerThreshold,
}) => {
  const chartData = data.map((pose, index) => {
    let value: number;
    if (dataKey in pose.rotation) {
      value = pose.rotation[dataKey as keyof TbmPoseData['rotation']];
    } else {
      value = pose.position[dataKey as keyof TbmPoseData['position']];
    }
    return {
      index,
      time: new Date(pose.timestamp).toLocaleTimeString(),
      value,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-cyan-500/30 rounded-lg px-3 py-2 backdrop-blur">
          <p className="text-cyan-400 font-mono text-sm">
            {payload[0].value.toFixed(3)} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">
        {label}
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
            vertical={false}
          />
          <XAxis
            dataKey="index"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />

          {warningThreshold !== undefined && (
            <>
              <ReferenceLine
                y={warningThreshold}
                stroke="#f97316"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceLine
                y={-warningThreshold}
                stroke="#f97316"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            </>
          )}

          {dangerThreshold !== undefined && (
            <>
              <ReferenceLine
                y={dangerThreshold}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceLine
                y={-dangerThreshold}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            </>
          )}

          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
            fill={`url(#gradient-${dataKey})`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
