'use client';

import { Delete } from 'lucide-react';
import { cn, formatRupiah } from '@/lib/utils';

interface AmountKeypadProps {
  /** Nominal dalam rupiah. */
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

const MAX_DIGITS = 13;

/**
 * AmountKeypad — tampilan nominal besar + keypad kalkulator.
 * Meniru pola aplikasi finance mobile: angka besar rata kanan,
 * keypad 3x4 (1-9, 000, 0, hapus).
 */
export function AmountKeypad({ value, onChange, className, disabled }: AmountKeypadProps) {
  const digits = value === 0 ? '' : String(value);

  const press = (key: string) => {
    if (disabled) return;
    if (key === 'del') {
      onChange(Number(digits.slice(0, -1) || '0'));
      return;
    }
    const next = (digits + key).replace(/^0+/, '') || '0';
    if (next.replace(/^0+/, '').length > MAX_DIGITS) return;
    onChange(Number(next));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'];

  return (
    <div className={cn('select-none', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nominal</p>
      <p
        className={cn(
          'mt-1 mb-3 text-right font-numeric text-3xl font-bold tracking-tight',
          value === 0 ? 'text-muted-foreground/50' : 'text-foreground'
        )}
        aria-live="polite"
      >
        <span className="mr-1.5 text-lg font-semibold text-muted-foreground">Rp</span>
        {formatRupiah(value).replace('Rp', '').trim() || '0'}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            aria-label={key === 'del' ? 'Hapus angka' : key}
            className={cn(
              'flex h-11 touch-target items-center justify-center rounded-xl bg-muted/70 font-numeric text-lg font-medium text-foreground transition-all hover:bg-muted active:scale-[0.95] disabled:opacity-50',
              key === 'del' && 'text-danger'
            )}
          >
            {key === 'del' ? <Delete className="h-5 w-5" /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
