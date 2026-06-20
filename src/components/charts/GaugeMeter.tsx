import React from 'react';
import { cn } from '@/lib/utils';

interface GaugeMeterProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
  warningThreshold?: number;
  dangerThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value,
  min = -10,
  max = 10,
  label,
  unit = '°',
  warningThreshold = 5,
  dangerThreshold = 8,
  size = 'md',
  className,
}) => {
  const percentage = Math.min(
    100,
    Math.max(0, ((value - min) / (max - min)) * 100)
  );

  const getColor = () => {
    const absValue = Math.abs(value);
    if (absValue >= dangerThreshold) return 'text-red-500';
    if (absValue >= warningThreshold) return 'text-orange-500';
    return 'text-cyan-400';
  };

  const getRingColor = () => {
    const absValue = Math.abs(value);
    if (absValue >= dangerThreshold) return '#ef4444';
    if (absValue >= warningThreshold) return '#f97316';
    return '#22d3ee';
  };

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };

  const fontSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 8 : 10;
  const sizePx = size === 'sm' ? 96 : size === 'md' ? 128 : 160;
  const radius = (sizePx - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference * 0.75;
  const arcStart = -135;
  const arcEnd = 135;

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M',
      start.x,
      start.y,
      'A',
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(' ');
  };

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <svg
          width={sizePx}
          height={sizePx}
          className="transform -rotate-90"
        >
          <path
            d={describeArc(
              sizePx / 2,
              sizePx / 2,
              radius,
              arcStart,
              arcEnd
            )}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={describeArc(
              sizePx / 2,
              sizePx / 2,
              radius,
              arcStart,
              arcStart + (percentage / 100) * 270
            )}
            fill="none"
            stroke={getRingColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-300"
            style={{
              strokeDasharray: circumference * 0.75,
              strokeDashoffset: offset,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'font-mono font-bold transition-colors duration-300',
              fontSizes[size],
              getColor()
            )}
          >
            {value.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {unit}
          </span>
        </div>
      </div>

      <div className="mt-2 text-center">
        <span className="text-xs text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="flex justify-between w-full mt-1 text-xs text-slate-500 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};
