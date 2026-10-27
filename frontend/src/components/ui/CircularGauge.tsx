import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CircularGaugeProps {
  percentage: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  percentage,
  label = 'DATA CONFIDENCE',
  size = 120,
  strokeWidth = 10,
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 85) return '#10B981'; // Green
    if (pct >= 65) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const strokeColor = getColor(clamped);

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border-subtle"
            fill="transparent"
          />
          {/* Active progress stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black tracking-tight text-text-main">
            {Math.round(clamped)}%
          </span>
          <span className="text-[9px] font-bold tracking-wider uppercase text-text-muted mt-0.5">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};
