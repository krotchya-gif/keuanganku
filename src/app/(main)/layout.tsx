'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen bg-background relative">
      <Sidebar />
      
      {/* 
        Main content wrapper. 
        On mobile (mt-14) provides space for the fixed top navbar from Sidebar.
        On desktop (md:ml-64, md:mt-0) pushes content beside the persistent sidebar.
      */}
      <main className="flex-1 w-full min-w-0 mt-14 md:mt-0 md:ml-64 min-h-screen transition-transform">
        <div className="p-3 sm:p-6 md:p-8 w-full max-w-[100vw] sm:max-w-7xl mx-auto animate-fade-in pb-24 md:pb-8 safe-bottom">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
            { href: '/net-worth', label: 'Kekayaan', icon: 'TrendingUp' },
            { href: '/arus-kas', label: 'Arus Kas', icon: 'ArrowLeftRight' },
            { href: '/budgeting', label: 'Budget', icon: 'Wallet' },
            { href: '/tabungan', label: 'Tabungan', icon: 'Target' },
          ].map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const icons: Record<string, any> = {
              LayoutDashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
              TrendingUp: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
              ArrowLeftRight: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
              Wallet: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-1M3 7a2 2 0 012-2h12l4 4',
              Target: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
            };
            const d = icons[item.icon] || icons.LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors touch-target ${isActive ? 'text-primary-500' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={d} />
                </svg>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
