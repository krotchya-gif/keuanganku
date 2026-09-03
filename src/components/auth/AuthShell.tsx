import { Wallet } from 'lucide-react';

const LEDGER_STRIP = [
  { label: 'Gaji', value: '+8,5 jt', positive: true },
  { label: 'Cicilan KPR', value: '−2,4 jt', positive: false },
  { label: 'Saldo', value: 'Rp 3,78 jt', positive: true },
];

/**
 * AuthShell — kerangka halaman auth satu kolom bergaya "layar aplikasi".
 * Full-bleed navy-indigo di semua breakpoint (tanpa split panel),
 * brand + headline di atas, form card putih di tengah.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#151439] relative overflow-hidden flex flex-col">
      {/* Pola garis halus, bukan gradient blob */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_50%,rgba(0,0,0,0.4)_100%)]" />

      <div className="relative flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center shadow-[0_0_32px_rgba(99,91,255,0.45)]">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight mt-3">Keuanganku</span>
          </div>

          <h1 className="text-white text-center text-[1.35rem] font-bold tracking-tight leading-snug">
            Kelola keuangan Anda dengan tenang.
          </h1>

          {/* Form card */}
          <div className="mt-7 bg-card rounded-2xl shadow-2xl p-6 sm:p-8">
            {/* Strip ledger — motif aplikasi, subtil */}
            <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-border/70">
              {LEDGER_STRIP.map((s) => (
                <div key={s.label} className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {s.label}
                  </p>
                  <p className={`text-sm font-numeric font-semibold mt-1 ${s.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {children}
          </div>

          <p className="text-white/30 text-center text-xs mt-6">
            © {new Date().getFullYear()} Keuanganku
          </p>
        </div>
      </div>
    </div>
  );
}