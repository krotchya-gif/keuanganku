'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { BottomSheet } from '@/components/ui/BottomSheet';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  Plus,
  MoreHorizontal,
  HeartPulse,
  Home,
  CreditCard,
  Calendar,
  BarChart3,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MORE_ITEMS = [
  { href: '/net-worth', label: 'Net Worth', icon: TrendingUp },
  { href: '/checkup', label: 'Checkup', icon: HeartPulse },
  { href: '/kpr', label: 'Simulasi KPR', icon: Home },
  { href: '/pembayaran', label: 'Pembayaran', icon: CreditCard },
  { href: '/kalendar', label: 'Kalendar', icon: Calendar },
  { href: '/evaluasi', label: 'Evaluasi', icon: BarChart3 },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const bottomItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/arus-kas', label: 'Arus Kas', icon: ArrowLeftRight },
    { href: '/tabungan', label: 'Tabungan', icon: Target },
  ];

  return (
    <div className="flex min-h-screen bg-background relative">
      <Sidebar />

      <main className="flex-1 w-full min-w-0 mt-14 md:mt-0 md:ml-64 min-h-screen transition-transform">
        <div className="p-3 sm:p-6 md:p-8 w-full max-w-[100vw] sm:max-w-7xl mx-auto animate-fade-in pb-28 md:pb-8 safe-bottom">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/70 safe-bottom">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {bottomItems.slice(0, 2).map((item) => (
            <NavButton key={item.href} {...item} active={isActive(item.href)} />
          ))}

          {/* FAB — Catat Transaksi */}
          <div className="flex justify-center relative">
            <Link
              href="/budgeting?catat=1"
              aria-label="Catat Transaksi"
              className="absolute -top-7 w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-glow active:scale-95 transition-transform border-4 border-background"
            >
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </Link>
            <span className="text-[10px] font-medium text-muted-foreground mt-8">Catat</span>
          </div>

          <NavButton {...bottomItems[2]} active={isActive(bottomItems[2].href)} />

          {/* Lainnya */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors touch-target',
              moreOpen ? 'text-primary-500' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Sheet "Lainnya" */}
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu Lainnya">
        <div className="grid grid-cols-3 gap-3">
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-[0.97]',
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