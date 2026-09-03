'use client';

import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroCardProps {
  /** Teks kecil di atas nilai (mis. "Kekayaan Bersih"). */
  label: string;
  /** Nilai utama sudah terformat (mis. "Rp 39.280.000"). */
  value: string;
  /** Saat true, nilai disembunyikan (Rp •••••••). */
  hidden?: boolean;
  onToggleHidden?: () => void;
  /** Chip kecil di bagian atas kartu (mis. jumlah akun). */
  chips?: React.ReactNode;
  /** Baris statistik di bawah nilai (Aset & Kewajiban). */
  stats?: Array<{ label: string; value: string; icon?: React.ReactNode; tone?: 'positive' | 'negative' }>;
  /** Konten tambahan di bagian bawah (sparkline, dll). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * HeroCard — kartu gradient di puncak beranda: nilai utama besar,
 * bisa disembunyikan (mode privasi), plus baris statistik pendukung.
 */
export function HeroCard({ label, value, hidden, onToggleHidden, chips, stats, children, className }: HeroCardProps) {
  return (
    <section
      className={cn(
        'dashboard-summary-hero relative overflow-hidden rounded-2xl p-5 shadow-card',
        className
      )}
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-2">
        {chips}
        {onToggleHidden && (
          <button
            onClick={onToggleHidden}
            aria-label={hidden ? 'Tampilkan nilai' : 'Sembunyikan nilai'}
            className="touch-target -mr-2 flex items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>

      <p className="mt-3 text-sm text-white/75">{label}</p>
      <p className="mt-0.5 font-numeric text-3xl font-bold tracking-tight text-white">
        {hidden ? 'Rp •••••••' : value}
      </p>

      {stats && stats.length > 0 && (
        <div className={cn('grid gap-3', stats.length >= 2 ? 'grid-cols-2' : 'grid-cols-1')}>
          {stats.map((s) => (
            <div key={s.label} className="mt-3 rounded-xl bg-white/10 px-3.5 py-2.5">
              <p className="flex items-center gap-1.5 text-xs text-white/75">
                {s.icon}
                {s.label}
              </p>
              <p className={cn('mt-0.5 font-numeric text-lg font-semibold text-white', hidden && 'blur-[6px] select-none')}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {children}
    </section>
  );
}
