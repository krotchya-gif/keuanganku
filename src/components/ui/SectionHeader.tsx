interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

/**
 * SectionHeader — judul seksi card dengan aksi opsional di kanan.
 */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}