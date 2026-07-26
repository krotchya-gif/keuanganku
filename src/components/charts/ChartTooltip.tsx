'use client';

import { formatRupiah } from '@/lib/utils';

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey?: string;
  fill?: string;
  stroke?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  formatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter = formatRupiah,
  labelFormatter,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5 border-b border-border/40 pb-1.5">
        {labelFormatter ? labelFormatter(label ?? '') : label}
      </p>
      {payload.map((entry, i) => {
        const color = entry.color || entry.fill || entry.stroke || '#635bff';
        return (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </span>
            <span className="font-numeric font-semibold text-foreground">
              {formatter(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
