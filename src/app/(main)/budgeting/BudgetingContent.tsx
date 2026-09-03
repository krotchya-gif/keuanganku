'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Wallet, PiggyBank } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { CategoryChipPicker, type ChipGroup } from '@/components/ui/CategoryChipPicker';
import { AmountKeypad } from '@/components/ui/AmountKeypad';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { formatRupiah, formatRupiahCompact, formatPercent, getMonthRange, getYearOptions, getMonthName, cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { chartAxisStyle, formatChartRupiah } from '@/components/charts/ChartTheme';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchBudgetItems } from '@/lib/queries/budget';
import { fetchTransactions } from '@/lib/queries/transactions';
import { BUDGET_CATEGORY_LABELS, BUDGET_CATEGORY_COLORS } from '@/shared';
import type { BudgetItem, Transaction, BudgetCategory } from '@/shared';

const CATEGORY_GROUPS: ChipGroup[] = (Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]).map((key) => ({
  key,
  label: BUDGET_CATEGORY_LABELS[key],
  color: BUDGET_CATEGORY_COLORS[key],
}));

/** Label pendek untuk sumbu-X grafik agar semua kategori terbaca. */
const CHART_SHORT_LABELS: Record<BudgetCategory, string> = {
  PENDAPATAN: 'Pendapatan',
  TABUNGAN_INVESTASI: 'Tab. & Inv.',
  TAGIHAN: 'Tagihan',
  BIAYA_OPERASIONAL: 'Biaya Ops.',
  HUTANG: 'Hutang',
};

/**
 * BudgetingContent — pilar Anggaran: evaluasi rencana vs realisasi
 * dan pengelolaan amplop. Pencatatan harian berada di halaman Arus Kas.
 */
export function BudgetingContent() {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [activeTab, setActiveTab] = useState<'evaluasi' | 'amplop'>('evaluasi');

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Tautan lama /budgeting?catat=1 dialihkan ke Arus Kas (satu tempat pencatatan).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('catat') === '1') {
      window.location.replace('/arus-kas?catat=1');
    }
  }, []);

  // Form amplop
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({ name: '', category: 'BIAYA_OPERASIONAL' as BudgetCategory, amount: 0 });

  const fetchData = async () => {
    try {
      setLoading(true);
      const id = await getCurrentUserId();
      if (!id) return;
      setUserId(id);

      const itemsData = await fetchBudgetItems(id);
      setBudgetItems(itemsData);

      const { startDate, endDate } = getMonthRange(year, month);
      const txData = await fetchTransactions(id, startDate, endDate);
      setTransactions(txData);
    } catch (err) {
      console.error(err);
      setFetchError('Gagal memuat anggaran. Periksa koneksi internet Anda lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const saveBudgetItem = async () => {
    setItemError(null);
    if (!itemForm.name.trim()) { setItemError('Isi nama amplop terlebih dahulu.'); return; }
    if (itemForm.amount <= 0) { setItemError('Isi rencana nominal lebih dari nol.'); return; }

    const supabase = createClient();
    const payload = { name: itemForm.name.trim(), category: itemForm.category, amount: itemForm.amount };
    const { error } = editingItem
      ? await supabase.from('budget_items').update(payload).eq('id', editingItem.id)
      : await supabase.from('budget_items').insert({ ...payload, user_id: userId });

    if (error) {
      setItemError('Gagal menyimpan amplop. Periksa koneksi lalu coba lagi.');
      return;
    }
    setShowItemModal(false);
    await fetchData();
  };

  const deleteBudgetItem = async (id: string) => {
    if (!window.confirm('Hapus amplop ini? Transaksi yang memakai amplop ini akan kehilangan referensinya.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('budget_items').delete().eq('id', id);
    if (error) {
      window.alert('Gagal menghapus amplop. Coba lagi.');
      return;
    }
    await fetchData();
  };

  // ── Data evaluasi ──
  const summaryByCategory = (Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]).map((catKey) => {
    const plannedItems = budgetItems.filter((i) => i.category === catKey);
    const totalPlanned = plannedItems.reduce((s, i) => s + Number(i.amount), 0);

    const actualTxs = transactions.filter((t) => t.category === catKey);
    const totalActual = actualTxs.reduce((s, t) => s + Number(t.amount), 0);

    const plannedNames = new Set(plannedItems.map((i) => i.name));
    const leakedTxs = actualTxs.filter((t) => !t.subcategory || !plannedNames.has(t.subcategory));
    const leakedTotal = leakedTxs.reduce((s, t) => s + Number(t.amount), 0);

    return {
      catKey,
      label: BUDGET_CATEGORY_LABELS[catKey],
      color: BUDGET_CATEGORY_COLORS[catKey],
      totalPlanned,
      totalActual,
      leakedTotal,
      leakedTxs,
      plannedItems: plannedItems.map((pi) => {
        const actual = actualTxs.filter((t) => t.subcategory === pi.name).reduce((s, t) => s + Number(t.amount), 0);
        return { id: pi.id, name: pi.name, planned: Number(pi.amount), actual };
      }),
    };
  });

  const totalIncomePlanned = summaryByCategory.find((s) => s.catKey === 'PENDAPATAN')?.totalPlanned || 0;
  const totalIncomeActual = summaryByCategory.find((s) => s.catKey === 'PENDAPATAN')?.totalActual || 0;
  const totalExpensePlanned = summaryByCategory.filter((s) => s.catKey !== 'PENDAPATAN').reduce((s, g) => s + g.totalPlanned, 0);
  const totalExpenseActual = summaryByCategory.filter((s) => s.catKey !== 'PENDAPATAN').reduce((s, g) => s + g.totalActual, 0);

  const budgetRemaining = totalExpensePlanned - totalExpenseActual;
  const isOverbudget = totalExpenseActual > totalExpensePlanned;

  const openItemModal = (item: BudgetItem | null) => {
    setEditingItem(item);
    setItemError(null);
    setItemForm(item ? { name: item.name, category: item.category, amount: Number(item.amount) } : { name: '', category: 'BIAYA_OPERASIONAL', amount: 0 });
    setShowItemModal(true);
  };

  if (loading && budgetItems.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Anggaran"
        subtitle="Rencanakan amplop bulanan, lalu bandingkan dengan realisasi"
        icon={PiggyBank}
        action={
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Bulan" className="touch-target rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium focus:ring-primary-500">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Tahun" className="touch-target inline-block w-24 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium focus:ring-primary-500">
              {getYearOptions().map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
      />

      {fetchError && (
        <ErrorBanner message={fetchError} onRetry={() => { setFetchError(null); fetchData(); }} />
      )}

      {/* Tabs */}
      <div className="card-premium">
        <div className="flex overflow-x-auto border-b border-border no-scrollbar">
          {[
            { key: 'evaluasi', label: 'Evaluasi', mobileLabel: 'Evaluasi' },
            { key: 'amplop', label: 'Amplop Anggaran', mobileLabel: 'Amplop' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as 'evaluasi' | 'amplop')}
              aria-selected={activeTab === t.key}
              role="tab"
              className={cn(
                'whitespace-nowrap px-4 py-3 text-xs font-medium transition-colors sm:px-6 sm:py-4 sm:text-sm',
                activeTab === t.key
                  ? 'border-b-2 border-primary-500 bg-primary-500/5 text-primary-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.mobileLabel}</span>
            </button>
          ))}
        </div>

        <div className="p-0 sm:p-5">
          {/* TAB EVALUASI */}
          {activeTab === 'evaluasi' && (
            <div className="space-y-4 p-3 sm:p-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card-premium border-success/20 bg-success/5 p-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Pemasukan (Aktual)</p>
                  <p className="font-numeric text-lg font-bold text-success sm:text-xl">
                    {formatRupiahCompact(totalIncomeActual)} <span className="font-normal text-xs text-muted-foreground">/ {formatRupiahCompact(totalIncomePlanned)}</span>
                  </p>
                </div>
                <div className="card-premium p-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Pengeluaran (Aktual)</p>
                  <p className="font-numeric text-lg font-bold text-foreground sm:text-xl">
                    {formatRupiahCompact(totalExpenseActual)} <span className="font-normal text-xs text-muted-foreground">/ {formatRupiahCompact(totalExpensePlanned)}</span>
                  </p>
                </div>
                <div className={cn('card-premium p-4', isOverbudget && 'border-danger/30 bg-danger/5')}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Sisa Anggaran</p>
                  <p className={cn('font-numeric text-lg font-bold sm:text-xl', isOverbudget ? 'text-danger' : 'text-primary-500')}>
                    {isOverbudget ? '−' : ''}{formatRupiahCompact(Math.abs(budgetRemaining))}
                    {isOverbudget && <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] text-danger">Melebihi Anggaran</span>}
                  </p>
                </div>
                <div className="card-premium p-4">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Pemakaian Anggaran</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className={cn('font-numeric text-lg font-bold sm:text-xl', totalExpensePlanned > 0 && totalExpenseActual / totalExpensePlanned > 0.9 ? 'text-danger' : 'text-foreground')}>
                      {formatPercent(totalExpensePlanned > 0 ? totalExpenseActual / totalExpensePlanned : 0)}
                    </p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full', isOverbudget ? 'bg-danger' : 'bg-primary-500')}
                        style={{ width: `${Math.min(100, totalExpensePlanned > 0 ? (totalExpenseActual / totalExpensePlanned) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {summaryByCategory.filter((g) => g.totalPlanned > 0 || g.totalActual > 0).length > 0 && (
                <div className="card-premium p-4 sm:p-5">
                  <h3 className="mb-4 text-sm font-bold text-foreground">Rencana vs Realisasi per Kategori</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summaryByCategory.filter((g) => g.totalPlanned > 0 || g.totalActual > 0).map((g) => ({ ...g, labelShort: CHART_SHORT_LABELS[g.catKey] ?? g.label }))} barGap={4} barCategoryGap="20%">
                        <XAxis
                          dataKey="labelShort"
                          {...chartAxisStyle}
                          tick={{ ...chartAxisStyle.tick, fontSize: 10 }}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={58}
                          tickMargin={4}
                        />
                        <YAxis {...chartAxisStyle} tickFormatter={formatChartRupiah} width={70} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
                        <Bar dataKey="totalPlanned" name="Rencana" fill="#635bff" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="totalActual" name="Realisasi" fill="#3ecf8e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Progres per amplop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {summaryByCategory.map((group) => {
                  if (group.plannedItems.length === 0 && group.totalActual === 0) return null;
                  return (
                    <div key={group.catKey} className="card-premium border border-border/50 p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center justify-between border-b border-border/50 pb-2 text-sm font-bold uppercase tracking-wide">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
                          <span style={{ color: group.color }}>{group.label}</span>
                        </span>
                        <span className="font-numeric">{formatRupiahCompact(group.totalActual)} / {formatRupiahCompact(group.totalPlanned)}</span>
                      </h3>
                      <div className="space-y-4">
                        {group.plannedItems.map((item) => {
                          const pct = item.planned > 0 ? item.actual / item.planned : item.actual > 0 ? 1 : 0;
                          const isOver = item.actual > item.planned;
                          return (
                            <div key={item.id} className="group/item">
                              <div className="mb-1 flex items-end justify-between gap-2">
                                <p className="min-w-0 truncate text-sm font-medium text-foreground">{item.name}</p>
                                <p className="shrink-0 whitespace-nowrap font-numeric text-xs font-medium">
                                  <span className={isOver ? (group.catKey === 'PENDAPATAN' ? 'text-success' : 'text-danger') : 'text-foreground'}>
                                    {formatRupiahCompact(item.actual)}
                                  </span>
                                  <span className="text-muted-foreground"> / {formatRupiahCompact(item.planned)}</span>
                                </p>
                              </div>
                              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="absolute left-0 top-0 h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, pct * 100)}%`,
                                    backgroundColor: isOver && group.catKey !== 'PENDAPATAN' ? '#ef4444' : group.color,
                                  }}
                                />
                              </div>
                              {isOver && group.catKey !== 'PENDAPATAN' && (
                                <p className="mt-1 text-right text-[10px] font-medium italic text-danger">
                                  Melebihi alokasi {formatRupiah(item.actual - item.planned)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {group.leakedTxs.length > 0 && (
                          <div className="mt-3 rounded border border-dashed border-danger/30 bg-danger/5 p-2">
                            <p className="mb-1 text-xs font-medium text-danger">Transaksi di luar amplop</p>
                            <p className="font-numeric text-lg font-bold text-danger">
                              {group.catKey === 'PENDAPATAN' ? '+' : '−'}{formatRupiahCompact(group.leakedTotal)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB AMPLOP */}
          {activeTab === 'amplop' && (
            <div className="space-y-3 p-3 sm:space-y-4 sm:p-0">
              <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:mb-6 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-bold text-foreground">Kelola Amplop Anggaran</h2>
                  <p className="text-xs text-muted-foreground">Tentukan rencana nominal bulanan untuk setiap pos pengeluaran.</p>
                </div>
                <button onClick={() => openItemModal(null)} className="btn-primary w-full justify-center sm:w-auto">
                  <Plus className="h-4 w-4" /> Buat Amplop Baru
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(Object.keys(BUDGET_CATEGORY_LABELS) as BudgetCategory[]).map((catKey) => {
                  const items = budgetItems.filter((i) => i.category === catKey);
                  if (items.length === 0) return null;
                  return (
                    <div key={catKey} className="card-premium overflow-hidden border border-border/60">
                      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
                        <h3 className="text-xs font-bold uppercase" style={{ color: BUDGET_CATEGORY_COLORS[catKey] }}>{BUDGET_CATEGORY_LABELS[catKey]}</h3>
                        <p className="rounded border border-border bg-background px-2 py-0.5 font-numeric text-xs font-bold">{formatRupiahCompact(items.reduce((s, i) => s + Number(i.amount), 0))}</p>
                      </div>
                      <ul className="divide-y divide-border/60">
                        {items.map((item) => (
                          <li key={item.id} className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                              <p className="mt-0.5 truncate font-numeric text-[10px] tracking-wide text-muted-foreground">Rencana: {formatRupiahCompact(item.amount)}</p>
                            </div>
                            <div className="flex shrink-0 gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                              <button onClick={() => openItemModal(item)} aria-label={`Ubah amplop ${item.name}`} className="touch-target p-2 text-muted-foreground hover:text-primary-500"><Edit2 className="h-3.5 w-3.5" /></button>
                              <button onClick={() => deleteBudgetItem(item.id)} aria-label={`Hapus amplop ${item.name}`} className="touch-target p-2 text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {budgetItems.length === 0 && (
                <EmptyState
                  icon={Wallet}
                  title="Belum ada amplop anggaran"
                  description="Buat amplop pertama Anda, misalnya Konsumsi, Transportasi, atau Listrik."
                  action={<button onClick={() => openItemModal(null)} className="btn-primary text-xs">Buat Amplop Pertama</button>}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal amplop */}
      <BottomSheet open={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Ubah Amplop' : 'Buat Amplop Baru'}>
        <div className="space-y-4">
          <div>
            <label htmlFor="amplop-nama" className="mb-1.5 block text-xs font-medium text-foreground">Nama Amplop</label>
            <input
              id="amplop-nama"
              required
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              type="text"
              className="input-field"
              placeholder="misal: Belanja Bulanan, Listrik, Makan Siang"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Kategori Induk</p>
            <CategoryChipPicker
              groups={CATEGORY_GROUPS}
              options={CATEGORY_GROUPS.map((g) => ({ label: g.label, groupKey: g.key }))}
              value={BUDGET_CATEGORY_LABELS[itemForm.category]}
              onSelect={(opt) => setItemForm({ ...itemForm, category: opt.groupKey as BudgetCategory })}
            />
          </div>
          <AmountKeypad value={itemForm.amount} onChange={(amount) => setItemForm({ ...itemForm, amount })} />
          <p className="text-xs text-muted-foreground">Rencana nominal yang ingin disisihkan setiap bulan untuk amplop ini.</p>

          {itemError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {itemError}
            </p>
          )}

          <button type="button" onClick={saveBudgetItem} className="btn-primary w-full touch-target">
            {editingItem ? 'Simpan Perubahan' : 'Simpan Amplop'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
