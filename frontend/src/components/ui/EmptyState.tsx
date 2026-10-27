import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-bg-surface border border-dashed border-border-strong rounded-xl my-4',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-bg-subtle text-text-muted flex items-center justify-center mb-3">
        <Icon size={24} />
      </div>
      <h3 className="text-sm font-bold text-text-main">{title}</h3>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
