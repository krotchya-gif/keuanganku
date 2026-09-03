import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  gradient?: string;
  action?: React.ReactNode;
}

/**
 * PageHeader — header halaman konsisten: ikon gradient + judul + subtitle + aksi kanan.
 */
export function PageHeader({ title, subtitle, icon: Icon, gradient = 'from-primary-500 to-primary-600', action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary-500" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-xs sm:text-sm truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
