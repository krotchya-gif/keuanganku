'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, House } from 'lucide-react';

/**
 * Error boundary root App Router — mencegah layar putih saat render gagal.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Sesuatu berjalan tidak semestinya saat menampilkan halaman ini. Data Anda aman — coba muat ulang bagian ini.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button onClick={reset} className="btn-primary touch-target">
          <RotateCcw className="h-4 w-4" /> Coba Lagi
        </button>
        <Link href="/dashboard" className="btn-secondary touch-target">
          <House className="h-4 w-4" /> Ke Beranda
        </Link>
      </div>
    </div>
  );
}
