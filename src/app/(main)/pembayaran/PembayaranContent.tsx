'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchBudgetItemsByCategory } from '@/lib/queries/budget';
import { fetchTransactionsByCategory } from '@/lib/queries/transactions';
import { ReceiptText, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { Skeleton, ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRupiah, formatRupiahCompact, getMonthRange, getYearOptions } from '@/lib/utils';
import type { BudgetItem, Transaction } from '@/shared';

export function PembayaranContent() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    async function fetchData() {
      try {
        if (items.length === 0) setLoading(true);
        const userId = await getCurrentUserId();
        if (!userId) return;

        // Fetch master envelopes for Bills and Debts
        const [tagihanItems, hutangItems] = await Promise.all([
          fetchBudgetItemsByCategory(userId, 'TAGIHAN'),
          fetchBudgetItemsByCategory(userId, 'HUTANG'),
        ]);
        setItems([...tagihanItems, ...hutangItems]);

        // Fetch transactions for the selected month to check if paid
        const { startDate, endDate } = getMonthRange(year, month);

        const [tagihanTxs, hutangTxs] = await Promise.all([
          fetchTransactionsByCategory(userId, 'TAGIHAN', startDate, endDate),
          fetchTransactionsByCategory(userId, 'HUTANG', startDate, endDate),
        ]);
        setTransactions([...tagihanTxs, ...hutangTxs]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6 p-3 sm:p-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <ListSkeleton items={4} />
      </div>
    );
  }

  const bills = items.filter(i => i.category === 'TAGIHAN');
  const debts = items.filter(i => i.category === 'HUTANG');

  const checkStatus = (itemName: string, target: number) => {
    const matchedTxs = transactions.filter(t => t.subcategory === itemName);
    const paid = matchedTxs.reduce((s, t) => s + Number(t.amount), 0);
    // Target 0 (belum diisi) jangan dianggap lunas
    return { paid, isFullyPaid: target > 0 && paid >= target, target };
  };

  const renderList = (list: BudgetItem[], title: string, colorClass: string, bgClass: string) => {
    if (list.length === 0) return null;
    
    // Hitung status lunas / blm lunas agregat
    let totalTarget = 0;
    let totalPaid = 0;
    
    const enrichedList = list.map(item => {
      const s = checkStatus(item.name, Number(item.amount));
      totalTarget += s.target;
      totalPaid += s.paid;
      return { ...item, ...s };
    });

    return (
      <div className={`card-premium overflow-hidden border ${bgClass}`}>
        <div className="bg-background/80 backdrop-blur-sm px-5 py-4 flex justify-between items-center gap-3 border-b border-border/50">
           <div className="min-w-0">
             <h3 className={`font-bold ${colorClass} uppercase tracking-wide truncate`}>{title}</h3>
             <p className="mt-0.5 font-numeric text-xs text-muted-foreground">Terbayar: {formatRupiahCompact(totalPaid)} / {formatRupiahCompact(totalTarget)}</p>
           </div>
           {totalPaid >= totalTarget && totalTarget > 0 && <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Lunas</span>}
        </div>
        <div className="divide-y divide-border/30 bg-card">
           {enrichedList.map(item => (
             <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/10">
               <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {item.isFullyPaid ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                     <span className="truncate">{item.name}</span>
                  </p>
               </div>
               <div className="text-right shrink-0">
                  <p className={`text-sm font-numeric font-bold ${item.isFullyPaid ? 'text-success' : 'text-foreground'}`}>
                    {formatRupiahCompact(item.paid)}
                  </p>
                  <p className="text-[10px] font-numeric text-muted-foreground">Rencana: {formatRupiahCompact(item.target)}</p>
               </div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran Tagihan"
        subtitle="Ceklis tagihan dan cicilan yang harus dibayar bulan ini"
        icon={CreditCard}
        gradient="from-amber-500 to-orange-600"
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

      {items.length === 0 ? (
        <div className="card-premium border-dashed">
          <EmptyState
            icon={ReceiptText}
            title="Belum ada tagihan atau cicilan"
            description="Buat amplop kategori Tagihan atau Hutang di halaman Anggaran."
            action={<a href="/budgeting" className="btn-secondary text-xs">Buka Anggaran</a>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {renderList(bills, 'Tagihan Bulanan', 'text-amber-600', 'border-amber-500/20')}
           {renderList(debts, 'Cicilan Utang', 'text-red-500', 'border-red-500/20')}
        </div>
      )}
    </div>
  );
}
