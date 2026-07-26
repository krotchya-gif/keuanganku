'use client';

import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Tidak Ada Koneksi</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Kamu sedang offline. Data yang tersimpan sebelumnya masih bisa diakses setelah koneksi kembali.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
