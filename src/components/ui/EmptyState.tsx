import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  color?: string;
}

/**
 * EmptyState — state kosong seragam untuk semua halaman.
 */
export function EmptyState({ icon: Icon, title, description, action, color = '#635bff' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center px-6">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}12`, color }}
      >
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs mt-1 max-w-[260px]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}