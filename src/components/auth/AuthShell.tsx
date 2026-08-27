import { Wallet } from 'lucide-react';

const LEDGER_ROWS = [
  { name: 'Gaji', amount: '8.500.000', positive: true },
  { name: 'Cicilan KPR', amount: '2.400.000', positive: false },
  { name: 'Belanja bulanan', amount: '1.320.000', positive: false },
  { name: 'Tabungan', amount: '1.000.000', positive: false },
];

/**
 * AuthShell — kerangka halaman auth (login/register/lupa/reset).
 * Panel branding gelap gaya "ledger" + area form mobile-first.
 * Bukan template AI: tanpa gradient blob, tanpa glassmorphism.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* ── Branding panel (desktop) ── */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[46%] flex-col justify-between bg-[#0d2119] text-white p-10 xl:p-14 relative overflow-hidden">
        {/* Pola garis halus, bukan blur circle */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Vignette lembut di tepi supaya grid tidak flat */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_55%,rgba(0,0,0,0.35)_100%)]" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#0d2119]" />
            </div>
            <span className="font-bold text-lg tracking-tight">Keuanganku</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl xl:text-[2.75rem] font-extrabold tracking-tighter leading-[1.08]">
            Kelola keuangan Anda<br />dengan tenang.
          </h1>
          <p className="mt-5 text-white/60 text-base leading-relaxed">
            Net worth, arus kas, budgeting, dan simulasi KPR — semuanya tercatat rapi di satu tempat.
          </p>
        </div>

        {/* Pratinjau jurnal — mini versi UI aplikasi yang sebenarnya */}
        <div className="relative max-w-md w-full">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-[11px] uppercase tracking-[0.14em] font-medium">
                Saldo bulan ini
              </span>
              <span className="text-xs font-semibold text-emerald-400 font-numeric">+12,4%</span>
            </div>
            <p className="text-[1.75rem] font-bold font-numeric tracking-tight leading-none">
              Rp 3.780.000
            </p>
            <div className="h-px bg-white/10" />
            {LEDGER_ROWS.map((r) => (
              <div key={r.name} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{r.name}</span>
                <span className={`font-numeric font-medium ${r.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {r.positive ? '+' : '−'}{r.amount}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-white/35 text-xs">Tampilan jurnal harian di aplikasi</p>
        </div>
      </aside>

      {/* ── Form area ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Brand strip (mobile) */}
        <div className="lg:hidden bg-[#0d2119] text-white px-5 pt-7 pb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#0d2119]" />
            </div>
            <span className="font-bold tracking-tight">Keuanganku</span>
          </div>
          <h1 className="text-[1.65rem] font-extrabold tracking-tight leading-tight">
            Kelola keuangan Anda<br />dengan tenang.
          </h1>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}