import React from 'react';
import { cn } from '@/lib/utils/cn';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  subtext?: string;
  valueColor?: string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  trendPositive = true,
  subtext,
  valueColor,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {trend && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1',
              trendPositive
                ? 'text-risk-low-text bg-risk-low-bg'
                : 'text-risk-high-text bg-risk-high-bg'
            )}
          >
            {trendPositive ? '↗' : '↘'} {trend}
          </span>
        )}
        {Icon && !trend && (
          <div className="w-8 h-8 rounded-lg bg-bg-subtle text-brand flex items-center justify-center">
            <Icon size={18} />
          </div>
        )}
      </div>

      <div>
        <div
          className={cn(
            'text-2xl lg:text-3xl font-extrabold tracking-tight text-text-main',
            valueColor
          )}
        >
          {value}
        </div>
        {subtext && (
          <p className="text-xs text-text-muted mt-1.5 line-clamp-1">{subtext}</p>
        )}
      </div>
    </div>
  );
};
