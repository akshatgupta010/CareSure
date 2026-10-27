import React from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeVariant =
  | 'low'
  | 'review'
  | 'high'
  | 'neutral'
  | 'primary'
  | 'outline'
  | 'passed'
  | 'warnings'
  | 'failed'
  | 'success';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', className, children, ...props }) => {
  const styles: Record<BadgeVariant, string> = {
    low: 'bg-risk-low-bg text-risk-low-text border-transparent',
    review: 'bg-risk-med-bg text-risk-med-text border-transparent',
    high: 'bg-risk-high-bg text-risk-high-text border-transparent',
    neutral: 'bg-bg-subtle text-text-muted border-border-subtle',
    primary: 'bg-brand/20 text-brand font-semibold border-brand/30',
    outline: 'bg-transparent text-text-secondary border-border-strong',
    passed: 'bg-risk-low-bg text-risk-low-text border-transparent',
    success: 'bg-risk-low-bg text-risk-low-text border-transparent',
    warnings: 'bg-risk-med-bg text-risk-med-text border-transparent',
    failed: 'bg-risk-high-bg text-risk-high-text border-transparent',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border transition-colors',
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export function getRiskVariant(
  score: number | null | undefined,
  thresholds?: { lowMax?: number; reviewMax?: number }
): BadgeVariant {
  if (score == null) return 'neutral';
  const lowMax = thresholds?.lowMax ?? 39;
  const reviewMax = thresholds?.reviewMax ?? 69;
  if (score <= lowMax) return 'low';
  if (score <= reviewMax) return 'review';
  return 'high';
}

export function getRiskLabel(
  score: number | null | undefined,
  thresholds?: { lowMax?: number; reviewMax?: number }
): string {
  if (score == null) return 'Unscored';
  const lowMax = thresholds?.lowMax ?? 39;
  const reviewMax = thresholds?.reviewMax ?? 69;
  if (score <= lowMax) return 'Low Risk';
  if (score <= reviewMax) return 'Needs Review';
  return 'High Risk';
}
