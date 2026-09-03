'use client';

import { useEffect } from 'react';

/**
 * Fallback terakhir bila error boundary root juga gagal
 * (wajib me-render <html> dan <body> sendiri).
 */
export default function GlobalError({
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
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a' }}>
        <div style={{ display: 'flex', minHeight: '100dvh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Terjadi kesalahan serius</h1>
          <p style={{ fontSize: 14, color: '#475569', maxWidth: 360 }}>
            Aplikasi gagal dimuat. Coba muat ulang halaman.
          </p>
          <button
            onClick={reset}
            style={{ background: '#635bff', color: 'white', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
