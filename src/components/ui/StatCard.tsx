import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color?: string;
  delta?: React.ReactNode;
  sub?: React.ReactNode;
  onClick?: () => void;
}

/**
 * StatCard — kartu KPI gaya fintech: ikon gradient + nilai besar (auto-shrink) + sub info.
 */
export function StatCard({ label, value, icon: Icon, color = '#635bff', delta, sub, onClick }: StatCardProps) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`relative overflow-hidden card-premium p-4 sm:p-5 text-left w-full ${onClick ? 'active:scale-[0.98]' : ''}`}
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-bl-full"
        style={{ background: `linear-gradient(to bottom left, ${color}0d, transparent)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}15`, color }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm font-medium text-foreground truncate">{label}</p>
          </div>
          {delta}
        </div>
        <p className="kpi-value font-bold font-numeric text-foreground">{value}</p>
        {sub && <div className="mt-3">{sub}</div>}
      </div>
    </Comp>
  );
}