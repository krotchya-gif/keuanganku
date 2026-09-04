'use client';

import { cn } from '@/lib/utils';

export interface ChipGroup {
  key: string;
  label: string;
  color: string;
}

export interface ChipOption {
  /** Nama kategori/dompet — sekaligus nilai yang dipilih. */
  label: string;
  groupKey: string;
}

interface CategoryChipPickerProps {
  groups: ChipGroup[];
  options: ChipOption[];
  /** Opsi yang sedang dipilih (dicocokkan lewat `label`). */
  value: string | null;
  onSelect: (option: ChipOption) => void;
  className?: string;
  emptyMessage?: string;
}

/**
 * CategoryChipPicker — pengganti dropdown kategori: chips berwarna per
 * kelompok, tinggal ditekan. Warna chip mengikuti warna kelompoknya.
 */
export function CategoryChipPicker({
  groups,
  options,
  value,
  onSelect,
  className,
  emptyMessage = 'Belum ada kategori. Tambahkan dompet terlebih dahulu.',
}: CategoryChipPickerProps) {
  const visibleGroups = groups.filter((g) =>
    options.some((o) => o.groupKey === g.key)
  );

  if (visibleGroups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {visibleGroups.map((group) => (
        <div key={group.key}>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: group.color }}
              aria-hidden
            />
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {options
              .filter((o) => o.groupKey === group.key)
              .map((opt) => {
                const selected = opt.label === value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onSelect(opt)}
                    aria-pressed={selected}
                    className={cn(
                      'rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.96]',
                      selected
                        ? 'border-transparent shadow-card'
                        : 'border-border bg-card text-foreground hover:border-muted-foreground/40'
                    )}
                    style={
                      selected
                        ? {
                            backgroundColor: `${group.color}1F`,
                            color: group.color,
                            borderColor: `${group.color}59`,
                          }
                        : undefined
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
