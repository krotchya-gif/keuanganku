'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuickActionCircleProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  /** Warna aksen ikon & latar lingkaran (hex, mis. '#635bff'). */
  color?: string;
  className?: string;
}

/**
 * QuickActionCircle — aksi cepat berbentuk lingkaran berwarna dengan
 * label kecil di bawahnya (pola beranda aplikasi finance mobile).
 */
export function QuickActionCircle({ icon, label, href, onClick, color = '#635bff', className }: QuickActionCircleProps) {
  const inner = (
    <>
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-150 group-active:scale-[0.94]"
        style={{ backgroundColor: `${color}1A`, color }}
      >
        {icon}
      </span>
      <span className="mt-1.5 text-center text-[11px] font-medium leading-tight text-muted-foreground">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('group flex w-16 flex-col items-center', className)}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={cn('group flex w-16 flex-col items-center', className)}>
      {inner}
    </button>
  );
}
