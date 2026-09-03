'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowLeftRight, ArrowDownRight, ArrowUpRight, Edit2, Trash2, Plus } from 'lucide-react';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordTransactionSheet } from '@/components/transactions/RecordTransactionSheet';
import { formatRupiahCompact, formatRupiah, getMonthRange, getCurrentMonthYear, getMonthName, cn } from '@/lib/utils';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchTransactions } from '@/lib/queries/transactions';
import { BUDGET_CATEGORY_COLORS } from '@/shared';
import type { Transaction } from '@/shared';
import { createClient } from '@/utils/supabase/client';

type Filter = 'semua' | 'masuk' | 'keluar';

/**
 * ArusKasContent — buku besar transaksi (satu-satunya tempat pencatatan).
 * Daftar transaksi per tanggal + navigasi bulan + ringkasan masuk/keluar.
 */
export function ArusKasContent() {
  const initial = getCurrentMonthYear();
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [filter, setFilter] = useState<Filter>('semua');

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const refresh = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const { startDate, endDate } = getMonthRange(year, month);
    const data = await fetchTransactions(userId, startDate, endDate);
    setTransactions(data);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  // Deep link dari FAB (/arus-kas?catat=1): langsung buka form catat.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('catat') === '1') {
      setSheetOpen(true);
      window.history.replaceState(null, '', '/arus-kas');
    }
  }, []);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  const filtered = useMemo(
    () =>
      transactions.filter((t) =>
        filter === 'semua' ? true : filter === 'masuk' ? t.category === 'PENDAPATAN' : t.category !== 'PENDAPATAN'
      ),
    [transactions, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const list = map.get(t.transaction_date) ?? [];
      list.push(t);
      map.set(t.transaction_date, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totals = useMemo(() => {
    const masuk = transactions.filter((t) => t.category === 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
    const keluar = transactions.filter((t) => t.category !== 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
    return { masuk, keluar, surplus: masuk - keluar };
  }, [transactions]);

  const handleDelete = async (tx: Transaction) => {
    if (!window.confirm('Hapus transaksi ini?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id);
    if (error) {
      window.alert('Gagal menghapus transaksi. Coba lagi.');
      return;
    }
    await refresh();
  };

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const dayNet = (list: Transaction[]) =>
    list.reduce((s, t) => s + (t.category === 'PENDAPATAN' ? Number(t.amount) : -Number(t.amount)), 0);

  /** Judul baris: amplop, lalu catatan. Info sekunder menampilkan sisanya. */
  const rowTitle = (tx: Transaction) => tx.subcategory || tx.description || 'Transaksi';
  const rowMeta = (tx: Transaction) => {
    if (tx.subcategory && tx.description) return tx.description;
    return '';
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Arus Kas"
        subtitle="Buku pencatatan pemasukan & pengeluaran"
        icon={ArrowLeftRight}
        action={
          <button
            onClick={() => { setEditing(null); setSheetOpen(true); }}
            className="btn-primary w-full sm:w-auto touch-target"
          >
            <Plus className="h-4 w-4" />
            Catat Transaksi
          </button>
        }
      />

      {/* Navigasi bulan */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="Bulan sebelumnya"
          className="touch-target flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary-500" />
          {getMonthName(month)} {year}
        </p>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="Bulan berikutnya"
          className="touch-target flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Ringkasan bulan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Pemasukan" value={formatRupiahCompact(totals.masuk)} icon={ArrowDownRight} color="#3ecf8e" />
        <StatCard label="Pengeluaran" value={formatRupiahCompact(totals.keluar)} icon={ArrowUpRight} color="#ef4444" />
        <StatCard
          label="Surplus / Defisit"
          value={`${totals.surplus >= 0 ? '+' : '−'}${formatRupiahCompact(Math.abs(totals.surplus))}`}
          icon={ArrowLeftRight}
          color={totals.surplus >= 0 ? '#3ecf8e' : '#ef4444'}
          delta={
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', totals.surplus >= 0 ? 'badge-sehat' : 'badge-bahaya')}>
              {totals.surplus >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          }
        />
      </div>

      {/* Filter arah */}
      <SegmentedControl<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'semua', label: 'Semua' },
          { value: 'masuk', label: 'Pemasukan' },
          { value: 'keluar', label: 'Pengeluaran' },
        ]}
      />

      {/* Buku transaksi */}
      {loading ? (
        <ListSkeleton items={6} />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={filter === 'semua' ? 'Belum ada transaksi bulan ini' : 'Tidak ada transaksi pada filter ini'}
          description="Tekan tombol Catat Transaksi untuk menambahkan pemasukan atau pengeluaran."
          action={<button onClick={() => { setEditing(null); setSheetOpen(true); }} className="btn-primary text-xs">Catat Transaksi</button>}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, list]) => (
            <section key={date}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{formatDayLabel(date)}</h2>
                <span className={cn('font-numeric text-xs font-semibold', dayNet(list) >= 0 ? 'text-success' : 'text-danger')}>
                  {dayNet(list) >= 0 ? '+' : '−'}{formatRupiahCompact(Math.abs(dayNet(list)))}
                </span>
              </div>
              <div className="card-premium divide-y divide-border/60 overflow-hidden">
                {list.map((tx) => {
                  const isIncome = tx.category === 'PENDAPATAN';
                  const color = BUDGET_CATEGORY_COLORS[tx.category] ?? '#635bff';
                  return (
                    <div key={tx.id} className="group flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${color}1A`, color }}
                        >
                          {isIncome ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{rowTitle(tx)}</p>
                          {rowMeta(tx) && <p className="truncate text-[10px] text-muted-foreground">{rowMeta(tx)}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className={cn('font-numeric text-sm font-semibold', isIncome ? 'text-success' : 'text-danger')}>
                          {isIncome ? '+' : '−'}{formatRupiah(tx.amount).replace('Rp', 'Rp ')}
                        </p>
                        <div className="flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <button onClick={() => { setEditing(tx); setSheetOpen(true); }} aria-label="Ubah transaksi" className="touch-target p-2 text-muted-foreground hover:text-primary-500">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tx)} aria-label="Hapus transaksi" className="touch-target p-2 text-muted-foreground hover:text-danger">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <RecordTransactionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={refresh}
        editTransaction={editing}
      />
    </div>
  );
}
