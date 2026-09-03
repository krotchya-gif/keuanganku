'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  ArrowLeftRight,
  HeartPulse,
  Home,
  PiggyBank,
  CreditCard,
  Calendar,
  Target,
  BarChart3,
  Settings,
  Wallet,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const navGroups: { label: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/net-worth', label: 'Net Worth', icon: TrendingUp },
      { href: '/arus-kas', label: 'Arus Kas', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Perencanaan',
    items: [
      { href: '/checkup', label: 'Checkup Keuangan', icon: HeartPulse },
      { href: '/kpr', label: 'Simulasi KPR', icon: Home },
      { href: '/budgeting', label: 'Budgeting', icon: PiggyBank },
      { href: '/pembayaran', label: 'Pembayaran', icon: CreditCard },
      { href: '/kalendar', label: 'Kalendar', icon: Calendar },
      { href: '/tabungan', label: 'Tabungan', icon: Target },
      { href: '/evaluasi', label: 'Evaluasi Tahunan', icon: BarChart3 },
    ],
  },
  {
    label: 'Akun',
    items: [{ href: '/settings', label: 'Pengaturan', icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<{ email: string; name: string; initial: string }>({
    email: 'Memuat...',
    name: 'Pengguna',
    initial: 'U',
  });

  useEffect(() => {
    setMounted(true);
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const email = user.email || '';
        const name = user.user_metadata?.full_name || email.split('@')[0] || 'Pengguna';
        setProfile({
          email,
          name,
          initial: name.charAt(0).toUpperCase(),
        });
      }
    };
    fetchProfile();
  }, []);

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm leading-none">Keuanganku</p>
            <p className="text-muted-foreground text-xs mt-0.5">Manajemen Finansial</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('nav-item', isActive && 'active')}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
            <span className="text-xs font-semibold text-primary-500">{profile.initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{profile.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{profile.email}</p>
          </div>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 shrink-0 hover:bg-muted text-muted-foreground rounded-md transition-colors"
              title="Ganti Tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="p-1.5 shrink-0 hover:bg-muted text-muted-foreground hover:text-red-500 rounded-md transition-colors"
            title="Keluar (Logout)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
