'use client';

import { cn } from '@/lib/utils';

interface SegmentedControlProps<T extends string> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * SegmentedControl — pengganti tab/pilihan mode dengan pil aktif putih
 * di atas rel abu-abu (pola segmented control iOS).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex w-full items-center gap-1 rounded-full bg-muted p-1',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-full font-medium transition-all duration-200 active:scale-[0.97]',
              size === 'md' ? 'py-2 text-sm' : 'py-1.5 text-xs',
              active
                ? 'bg-card text-foreground shadow-card'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
