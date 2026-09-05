'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { Skeleton, ListSkeleton, KPISkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryChipPicker, type ChipGroup } from '@/components/ui/CategoryChipPicker';
import { AmountKeypad } from '@/components/ui/AmountKeypad';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRupiahCompact, formatPercent } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchRecurringTransactions, type RecurringTransaction } from '@/lib/queries/recurring';
import { fetchAccounts } from '@/lib/queries/onboarding';
import { calculateCashFlow } from '@/shared';
import { CASHFLOW_CATEGORY_LABELS, CASHFLOW_CATEGORY_COLORS } from '@/shared';
import type { CashflowItem, CashflowCategory } from '@/shared';

/** Kelompok kategori untuk kas keluar rutin (taxonomi cashflow_items). */
const KELUAR_GROUPS: ChipGroup[] = (
  ['kewajiban_cicilan', 'masa_depan_investasi', 'kebutuhan_sehari_hari'] as CashflowCategory[]
).map((key) => ({ key, label: CASHFLOW_CATEGORY_LABELS[key], color: CASHFLOW_CATEGORY_COLORS[key] }));

/**
 * KasRutinContent — struktur pemasukan & pengeluaran rutin bulanan.
 * Data ini menjadi dasar perhitungan Checkup Keuangan.
 */
export function KasRutinContent() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<(CashflowItem & Partial<RecurringTransaction>)[]>([]);
  const [accounts, setAccounts] = useState<Awaited<ReturnType<typeof fetchAccounts>>>([]);

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<(CashflowItem & Partial<RecurringTransaction>) | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    direction: 'keluar' as CashflowItem['direction'],
    category: 'kebutuhan_sehari_hari' as CashflowItem['category'],
    amount: 0,
    is_recurring: true,
    account_id: '',
  });

  const fetchData = async () => {
    try {
      if (items.length === 0) setLoading(true);
      const id = await getCurrentUserId();
      if (!id) return;
      setUserId(id);
      setAccounts(await fetchAccounts(id));

      // Materialize template yang sudah jatuh tempo menjadi transaksi aktual.
      const { error: generateError } = await createClient().rpc('generate_due_recurring_transactions');
      if (generateError) console.error('Gagal membuat transaksi rutin:', generateError);
      const data = await fetchRecurringTransactions(id);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError('Isi nama pos kas terlebih dahulu.'); return; }
    if (form.amount <= 0) { setFormError('Isi nominal lebih dari nol.'); return; }

    const supabase = createClient();
    // Kas masuk selalu berkategori pendapatan.
    const finalCategory: CashflowItem['category'] = form.direction === 'masuk' ? 'pendapatan' : form.category;

    const payload = {
      name: form.name.trim(),
      direction: form.direction,
      category: finalCategory,
      amount: form.amount,
      is_recurring: form.is_recurring,
      frequency: 'monthly',
      day_of_month: new Date().getDate(),
      next_run_date: new Date().toISOString().slice(0, 10),
      account_id: form.account_id || null,
    };

    const { error } = editingItem
      ? await supabase.from('recurring_transactions').update(payload).eq('id', editingItem.id)
      : await supabase.from('recurring_transactions').insert({ ...payload, user_id: userId });

    if (error) {
      setFormError('Gagal menyimpan data. Periksa koneksi lalu coba lagi.');
      return;
    }
    setShowModal(false);
    await fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus pos kas rutin ini?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('recurring_transactions').update({ is_active: false }).eq('id', id).eq('user_id', userId);
    if (error) {
      window.alert('Gagal menghapus data. Coba lagi.');
      return;
    }
    await fetchData();
  };

  const openAddModal = (direction: 'masuk' | 'keluar') => {
    setEditingItem(null);
    setFormError(null);
    setForm({
      name: '',
      direction,
      category: direction === 'masuk' ? 'pendapatan' : 'kebutuhan_sehari_hari',
      amount: 0,
      is_recurring: true,
      account_id: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: CashflowItem & Partial<RecurringTransaction>) => {
    setEditingItem(item);
    setFormError(null);
    setForm({ name: item.name, direction: item.direction, category: item.category, amount: item.amount, is_recurring: item.is_recurring, account_id: item.account_id ?? '' });
    setShowModal(true);
  };

  // Perhitungan — pakai formula bersama agar konsisten dengan Checkup.
  const cashFlow = calculateCashFlow(items);
  const totalMasuk = cashFlow.totalKasMasuk;
  const totalKeluar = cashFlow.totalKasKeluar;
  const surplus = cashFlow.surplusDefisit;
  const isPositive = surplus >= 0;

  const kasMasuk = items.filter((i) => i.direction === 'masuk');
  const kasKeluar = items.filter((i) => i.direction === 'keluar');

  const outGroups = [
    { cat: 'kewajiban_cicilan' as const, label: CASHFLOW_CATEGORY_LABELS.kewajiban_cicilan, color: CASHFLOW_CATEGORY_COLORS.kewajiban_cicilan, total: cashFlow.totalKewajiban, items: kasKeluar.filter((i) => i.category === 'kewajiban_cicilan') },
    { cat: 'masa_depan_investasi' as const, label: CASHFLOW_CATEGORY_LABELS.masa_depan_investasi, color: CASHFLOW_CATEGORY_COLORS.masa_depan_investasi, total: cashFlow.totalMasaDepan, items: kasKeluar.filter((i) => i.category === 'masa_depan_investasi') },
    { cat: 'kebutuhan_sehari_hari' as const, label: CASHFLOW_CATEGORY_LABELS.kebutuhan_sehari_hari, color: CASHFLOW_CATEGORY_COLORS.kebutuhan_sehari_hari, total: cashFlow.totalKebutuhan, items: kasKeluar.filter((i) => i.category === 'kebutuhan_sehari_hari') },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <KPISkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ListSkeleton items={4} />
          <ListSkeleton items={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kas Rutin Bulanan"
        subtitle="Struktur pemasukan & pengeluaran rutin — dasar perhitungan Checkup Keuangan"
        icon={ArrowLeftRight}
        action={
          <div className="flex gap-2">
            <button onClick={() => openAddModal('keluar')} className="btn-secondary flex-1 sm:flex-none">
              <ArrowDownRight className="w-4 h-4 text-danger" />
              <span className="hidden sm:inline">Kas Keluar</span>
              <span className="sm:hidden">Keluar</span>
            </button>
            <button onClick={() => openAddModal('masuk')} className="btn-primary flex-1 sm:flex-none">
              <ArrowUpRight className="w-4 h-4" />
              <span className="hidden sm:inline">Kas Masuk</span>
              <span className="sm:hidden">Masuk</span>
            </button>
          </div>
        }
      />

      {/* Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="card-premium p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Surplus / Defisit</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${isPositive ? 'badge-sehat' : 'badge-bahaya'}`}>
              {isPositive ? 'Surplus' : 'Defisit'}
            </span>
          </div>
          <p className={`kpi-value font-bold font-numeric ${isPositive ? 'text-success' : 'text-danger'}`}>
            {isPositive ? '+' : '−'}{formatRupiahCompact(Math.abs(surplus))}
          </p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Dari total pemasukan</span>
            <span className="font-numeric font-medium">{formatPercent(totalMasuk > 0 ? surplus / totalMasuk : 0)}</span>
          </div>
        </div>
        <div className="card-premium p-4 sm:p-5 sm:col-span-1 lg:col-span-2">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Alokasi Pengeluaran Bulanan</p>
          <div className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {(() => {
                const barMax = Math.max(totalMasuk, totalKeluar);
                return outGroups.map((g) => (
                  <div key={g.cat} style={{ width: `${barMax > 0 ? (g.total / barMax) * 100 : 0}%`, backgroundColor: g.color }} className="h-full" />
                ));
              })()}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {outGroups.map((g) => {
                const pct = totalMasuk > 0 ? g.total / totalMasuk : 0;
                return (
                  <div key={g.cat}>
                    <div className="flex items-start gap-1.5 text-[11px] leading-tight">
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                      <span className="text-muted-foreground">{g.label}</span>
                    </div>
                    <p className="mt-1 font-numeric text-sm font-semibold text-foreground">{formatPercent(pct)}</p>
                    <p className="font-numeric text-[10px] text-muted-foreground">{formatRupiahCompact(g.total)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Daftar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Kas Masuk */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
              <ArrowUpRight className="h-5 w-5 text-success" />
              Pemasukan Rutin
            </h2>
            <span className="font-numeric text-sm font-bold text-success sm:text-base">{formatRupiahCompact(totalMasuk)}</span>
          </div>
          <div className="space-y-2">
            {kasMasuk.length === 0 ? (
              <EmptyState
                icon={ArrowUpRight}
                title="Belum ada pemasukan rutin"
                description="Tambahkan sumber pemasukan bulanan seperti gaji atau hasil investasi."
                action={<button onClick={() => openAddModal('masuk')} className="btn-secondary text-xs">Tambah Pemasukan</button>}
              />
            ) : (
              kasMasuk.map((item) => (
                <div key={item.id} className="card-premium group flex items-center justify-between gap-3 p-4 hover:border-primary-500/30">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug text-foreground">{item.name}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.is_recurring ? 'Rutin setiap bulan' : 'Sekali masuk'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-numeric font-semibold text-success">+{formatRupiahCompact(item.amount)}</span>
                    <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <button onClick={() => openEditModal(item)} aria-label={`Ubah ${item.name}`} className="touch-target p-2 text-muted-foreground hover:text-primary-500"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(item.id)} aria-label={`Hapus ${item.name}`} className="touch-target p-2 text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kas Keluar */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground sm:text-lg">
              <ArrowDownRight className="h-5 w-5 text-danger" />
              Pengeluaran Rutin
            </h2>
            <span className="font-numeric text-sm font-bold text-danger sm:text-base">−{formatRupiahCompact(totalKeluar)}</span>
          </div>
          <div className="space-y-4">
            {outGroups.filter((g) => g.items.length > 0).map((group) => (
              <div key={group.cat} className="space-y-2">
                <h3 className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: group.color }} /> {group.label}</span>
                  <span className="font-numeric">{formatRupiahCompact(group.total)}</span>
                </h3>
                {group.items.map((item) => (
                  <div key={item.id} className="group/item flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-muted-foreground/30">
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-foreground">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{item.is_recurring ? 'Nominal tetap' : 'Nominal berubah'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-numeric font-medium text-foreground">−{formatRupiahCompact(item.amount)}</span>
                      <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/item:opacity-100">
                        <button onClick={() => openEditModal(item)} aria-label={`Ubah ${item.name}`} className="touch-target p-2 text-muted-foreground hover:text-primary-500"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDelete(item.id)} aria-label={`Hapus ${item.name}`} className="touch-target p-2 text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {outGroups.every((g) => g.items.length === 0) && (
              <EmptyState
                icon={ArrowDownRight}
                title="Belum ada pengeluaran rutin"
                description="Catat biaya bulanan seperti sewa, listrik, atau cicilan."
                action={<button onClick={() => openAddModal('keluar')} className="btn-secondary text-xs">Tambah Pengeluaran</button>}
              />
            )}
          </div>
        </div>
      </div>

      <BottomSheet
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Ubah Pos Kas' : form.direction === 'masuk' ? 'Tambah Kas Masuk' : 'Tambah Kas Keluar'}
      >
        <div className="space-y-4">
          <SegmentedControl
            value={form.direction}
            onChange={(d) => setForm({ ...form, direction: d, category: d === 'masuk' ? 'pendapatan' : 'kebutuhan_sehari_hari' })}
            options={[
              { value: 'keluar' as const, label: 'Kas Keluar' },
              { value: 'masuk' as const, label: 'Kas Masuk' },
            ]}
          />

          <div>
            <label htmlFor="kas-nama" className="mb-1.5 block text-xs font-medium text-foreground">Nama Pos Kas</label>
            <input
              id="kas-nama"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              type="text"
              className="input-field"
              placeholder={form.direction === 'masuk' ? 'misal: Gaji Bulanan' : 'misal: Belanja Bulanan'}
            />
          </div>

          <div>
            <label htmlFor="kas-account" className="mb-1.5 block text-xs font-medium text-foreground">Rekening terkait</label>
            <select id="kas-account" value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className="input-field w-full">
              <option value="">Tanpa rekening (hanya catatan)</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </div>

          {form.direction === 'keluar' && (
            <div>
              <p className="mb-2 text-xs font-medium text-foreground">Kategori Pengeluaran</p>
              <CategoryChipPicker
                groups={KELUAR_GROUPS}
                options={KELUAR_GROUPS.map((g) => ({ label: g.label, groupKey: g.key }))}
                value={CASHFLOW_CATEGORY_LABELS[form.category]}
                onSelect={(opt) => setForm({ ...form, category: opt.groupKey as CashflowItem['category'] })}
              />
            </div>
          )}

          <AmountKeypad value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />

          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring"
              checked={form.is_recurring}
              onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
              className="h-4 w-4 rounded border-border bg-background text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="is_recurring" className="pointer-events-auto select-none text-sm text-foreground">
              Berulang setiap bulan
            </label>
          </div>

          {formError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {formError}
            </p>
          )}

          <button type="button" onClick={handleSave} className="btn-primary w-full touch-target">
            {editingItem ? 'Simpan Perubahan' : 'Simpan Pos Kas'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
