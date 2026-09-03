'use client';

import { useId } from 'react';

export const CHART_COLORS = {
  primary: '#635bff',
  success: '#3ecf8e',
  warning: '#f5a623',
  danger: '#ef4444',
  cyan: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  orange: '#f97316',
  blue: '#3b82f6',
};

export const CHART_GRADIENTS = {
  primary: {
    id: 'gradPrimary',
    start: '#635bff',
    end: '#635bff00',
  },
  success: {
    id: 'gradSuccess',
    start: '#3ecf8e',
    end: '#3ecf8e00',
  },
  danger: {
    id: 'gradDanger',
    start: '#ef4444',
    end: '#ef444400',
  },
  warning: {
    id: 'gradWarning',
    start: '#f5a623',
    end: '#f5a62300',
  },
  cyan: {
    id: 'gradCyan',
    start: '#06b6d4',
    end: '#06b6d400',
  },
};

export function ChartGradients({ prefix }: { prefix?: string }) {
  // Prefix per-instance (useId) supaya id SVG tidak bentrok bila ada 2+ chart di satu halaman
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = prefix ?? uid;
  return (
    <defs>
      {Object.values(CHART_GRADIENTS).map((g) => (
        <linearGradient key={g.id} id={`${p}-${g.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={g.start} stopOpacity={0.35} />
          <stop offset="100%" stopColor={g.end} stopOpacity={0} />
        </linearGradient>
      ))}
    </defs>
  );
}

export const chartGridStyle = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '3 3',
  strokeOpacity: 0.5,
};

export const chartAxisStyle = {
  tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'Inter, system-ui, sans-serif' },
  axisLine: { stroke: 'hsl(var(--border))', strokeOpacity: 0.3 },
  tickLine: { stroke: 'hsl(var(--border))', strokeOpacity: 0.2 },
};

export function formatChartRupiah(value: number): string {
  if (!Number.isFinite(value)) return 'Rp0';
  if (Math.abs(value) >= 1_000_000_000) {
    return `Rp${(value / 1_000_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(1).replace('.', ',')}jt`;
  }
  if (Math.abs(value) >= 1_000) {
    return `Rp${(value / 1_000).toFixed(0)}rb`;
  }
  return `Rp${value}`;
}
