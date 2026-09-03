'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchTransactions } from '@/lib/queries/transactions';
import { History } from 'lucide-react';
import { Skeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRupiah, formatRupiahCompact, getMonthRange, getYearOptions } from '@/lib/utils';
import type { Transaction } from '@/shared';

export function KalendarContent() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function fetchData() {
      try {
        if (transactions.length === 0) setLoading(true);
        const userId = await getCurrentUserId();
        if (!userId) return;

        const { startDate, endDate } = getMonthRange(year, month);

        const txs = await fetchTransactions(userId, startDate, endDate);
        setTransactions(txs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  if (loading) return (
    <div className="space-y-6 p-3 sm:p-6 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <ListSkeleton items={5} />
    </div>
  );

  // Group by exact date (guard null/format tanggal ISO)
  const grouped: Record<string, Transaction[]> = {};
  transactions.forEach(t => {
     const dateStr = String(t.transaction_date).slice(0, 10);
     if (!dateStr) return;
     if (!grouped[dateStr]) grouped[dateStr] = [];
     grouped[dateStr].push(t);
  });

  const dates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Transaksi"
        subtitle="Urutan transaksi masuk-keluar berdasarkan tanggal"
        icon={History}
        gradient="from-rose-500 to-pink-600"
        action={
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-primary-500 touch-target">
              {Array.from({length: 12}, (_, i) => (<option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'long' })}</option>))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-medium inline-block w-24 focus:ring-primary-500 touch-target">
              {getYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      {dates.length === 0 ? (
        <div className="card-premium border-dashed">
          <EmptyState
            icon={History}
            title="Belum ada transaksi pada bulan ini"
            description="Catat transaksi lewat tombol Catat di halaman Arus Kas."
            action={<a href="/arus-kas" className="btn-secondary text-xs">Buka Arus Kas</a>}
          />
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {dates.map(date => {
            const dailyTxs = grouped[date];
            const dObj = new Date(date);
            const totalOut = dailyTxs.filter(t => t.category !== 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
            const totalIn = dailyTxs.filter(t => t.category === 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
            
            return (
              <div key={date} className="flex gap-4 group">
                {/* Date Bubble */}
                <div className="flex flex-col items-center shrink-0 w-16">
                  <div className="w-12 h-12 rounded-full bg-primary-500/10 text-primary-600 flex flex-col items-center justify-center border border-primary-500/20 group-hover:bg-primary-500 group-hover:text-white transition-colors shadow-sm">
                    <span className="text-[10px] font-bold uppercase leading-none">{dObj.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                    <span className="text-lg font-bold font-numeric leading-tight">{dObj.getDate()}</span>
                  </div>
                  <div className="w-px h-full bg-border/50 mt-2" />
                </div>
                
                {/* Daily Cards */}
                <div className="flex-1 pb-6">
                  <div className="mb-3 flex items-center gap-3">
                     {totalIn > 0 && <span className="shrink-0 rounded bg-success/10 px-2 py-0.5 font-numeric text-xs font-semibold text-success">Masuk: {formatRupiahCompact(totalIn)}</span>}
                     {totalOut > 0 && <span className="shrink-0 rounded bg-danger/10 px-2 py-0.5 font-numeric text-xs font-semibold text-danger">Keluar: {formatRupiahCompact(totalOut)}</span>}
                  </div>
                  
                  <div className="space-y-2">
                    {dailyTxs.map(tx => (
                      <div key={tx.id} className="card-premium p-4 flex justify-between items-center gap-3 group/card">
                        <div className="min-w-0">
                           <p className="text-sm font-bold text-foreground truncate">{tx.subcategory || 'Tanpa Kategori'}</p>
                           <p className="text-xs text-muted-foreground mt-0.5 truncate">{tx.description || '-'}</p>
                        </div>
                        <p className={`text-base font-bold font-numeric shrink-0 ${tx.category === 'PENDAPATAN' ? 'text-success' : 'text-foreground'}`}>
                           {tx.category === 'PENDAPATAN' ? '+' : '−'}{formatRupiahCompact(tx.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
