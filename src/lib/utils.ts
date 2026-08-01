// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRupiahCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} rb`;
  }
  return formatRupiah(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals).replace('.', ',')}%`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function getMonthName(month: number): string {
  const names = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return names[month - 1] ?? '';
}

// Format tanggal lokal (YYYY-MM-DD) tanpa konversi UTC.
// toISOString() menggeser tanggal -1 hari untuk zona waktu positif (mis. UTC+7).
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayString(): string {
  return getLocalDateString(new Date());
}

export function getMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  return {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: getLocalDateString(new Date(year, month, 0)),
  };
}

export function getYearOptions(current = new Date().getFullYear(), range = 5): number[] {
  return Array.from({ length: range }, (_, i) => current - i);
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function getStatusColor(status: 'sehat' | 'warning' | 'bahaya'): string {
  return {
    sehat: '#3ecf8e',
    warning: '#f5a623',
    bahaya: '#ef4444',
  }[status];
}

export function getStatusLabel(status: 'sehat' | 'warning' | 'bahaya'): string {
  return { sehat: 'Sehat', warning: 'Perhatian', bahaya: 'Bahaya' }[status];
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
