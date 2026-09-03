'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sidebar } from '@/components/layout/Sidebar';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  LayoutDashboard,
  ArrowLeftRight,
  House,
  PiggyBank,
  Plus,
  MoreHorizontal,
  HeartPulse,
  ReceiptText,
  History,
  BarChart3,
  Settings,
  TrendingUp,
  Target,
  Repeat,
  Wallet,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

/** Menu sekunder di sheet, dikelompokkan per pilar agar tidak membingungkan. */
const MORE_SECTIONS: {
  label: string;
  items: { href: string; label: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: 'Arus Kas',
    items: [
      { href: '/kalendar', label: 'Riwayat', icon: History },
      { href: '/pembayaran', label: 'Pembayaran Tagihan', icon: ReceiptText },
    ],
  },
  {
    label: 'Anggaran',
    items: [
      { href: '/kas-rutin', label: 'Kas Rutin Bulanan', icon: Repeat },
      { href: '/tabungan', label: 'Tabungan & Investasi', icon: Target },
    ],
  },
  {
    label: 'Analisis',
    items: [
      { href: '/net-worth', label: 'Kekayaan Bersih', icon: TrendingUp },
      { href: '/checkup', label: 'Checkup Keuangan', icon: HeartPulse },
      { href: '/evaluasi', label: 'Evaluasi Tahunan', icon: BarChart3 },
    ],
  },
  {
    label: 'Akun',
    items: [{ href: '/settings', label: 'Pengaturan', icon: Settings }],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const bottomItems = [
    { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
    { href: '/arus-kas', label: 'Arus Kas', icon: ArrowLeftRight },
    { href: '/budgeting', label: 'Anggaran', icon: PiggyBank },
    { href: '/kpr', label: 'KPR', icon: House },
  ];

  return (
    <div className="flex min-h-screen bg-background relative">
      <Sidebar />

      <main className="flex-1 w-full min-w-0 mt-14 md:mt-0 md:ml-64 min-h-screen transition-transform">
        <div className="p-3.5 sm:p-6 md:p-8 w-full max-w-[100vw] sm:max-w-7xl mx-auto animate-fade-in pb-[calc(9rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </main>

      {/* Mobile Top Bar — logo, tema, menu sekunder */}
      <header className="md:hidden fixed top-0 w-full z-40 min-h-14 bg-card/95 backdrop-blur-lg border-b border-border/70 flex items-center justify-between px-3 pt-[env(safe-area-inset-top,0px)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <p className="font-bold text-foreground text-base leading-none">Keuanganku</p>
        </div>
        <div className="flex items-center gap-1">
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors touch-target flex items-center justify-center"
              aria-label="Ganti Tema"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={() => setMoreOpen(true)}
            className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors touch-target flex items-center justify-center"
            aria-label="Menu lainnya"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation — Beranda, Arus Kas, Catat, Anggaran, KPR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/70 safe-bottom">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          <NavButton {...bottomItems[0]} active={isActive(bottomItems[0].href)} />
          <NavButton {...bottomItems[1]} active={isActive(bottomItems[1].href) || isActive('/kalendar') || isActive('/pembayaran')} />

          {/* FAB — Catat Transaksi */}
          <div className="flex justify-center relative">
            <Link
              href="/arus-kas?catat=1"
              aria-label="Catat Transaksi"
              className="absolute -top-7 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-card-hover active:scale-95 transition-transform border-4 border-background"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </Link>
            <span className="text-[10px] font-medium text-muted-foreground mt-8">Catat</span>
          </div>

          <NavButton {...bottomItems[2]} active={isActive(bottomItems[2].href) || isActive('/kas-rutin') || isActive('/tabungan')} />
          <NavButton {...bottomItems[3]} active={isActive(bottomItems[3].href)} />
        </div>
      </nav>

      {/* Sheet menu sekunder */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu Lainnya">
        <div className="space-y-4">
          {MORE_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all active:scale-[0.97]',
                        active
                          ? 'border-primary-500/30 bg-primary-500/10 text-primary-500'
                          : 'border-border/60 bg-muted/40 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Keluar */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors touch-target"
        >
          <LogOut className="w-4 h-4" />
          Keluar dari Keuanganku
        </button>
      </BottomSheet>

      <InstallPrompt />
    </div>
  );
}

function NavButton({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors touch-target',
        active ? 'text-primary-500' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
