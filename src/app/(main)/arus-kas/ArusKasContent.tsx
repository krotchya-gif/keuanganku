'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { Skeleton, ListSkeleton, KPISkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { formatRupiahCompact, formatPercent } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchCashflowItems } from '@/lib/queries/cashflow';
import { calculateCashFlow } from '@/shared';
import { CASHFLOW_CATEGORY_LABELS, CASHFLOW_CATEGORY_COLORS } from '@/shared';
import type { CashflowItem, CashflowCategory } from '@/shared';

export function ArusKasContent() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<CashflowItem[]>([]);

  // Modal forms
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CashflowItem | null>(null);
  const [form, setForm] = useState({ name: '', direction: 'masuk' as CashflowItem['direction'], category: 'pendapatan' as CashflowItem['category'], amount: 0, is_recurring: true });

  const fetchData = async () => {
    try {
      if (items.length === 0) setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) return;
      setUserId(userId);

      const data = await fetchCashflowItems(userId);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();

    // Kategori hanya diverifikasi untuk kas MASUK (harus 'pendapatan').
    // Untuk kas keluar, kategori user dipakai apa adanya (tanpa rewrite diam-diam).
    const finalCategory = form.direction === 'masuk' ? 'pendapatan' as CashflowItem['category'] : form.category;

    try {
      if (editingItem) {
        await supabase.from('cashflow_items').update({
          name: form.name, direction: form.direction, category: finalCategory, amount: form.amount, is_recurring: form.is_recurring
        }).eq('id', editingItem.id);
      } else {
        await supabase.from('cashflow_items').insert({
          user_id: userId, name: form.name, direction: form.direction, category: finalCategory, amount: form.amount, is_recurring: form.is_recurring
        });
      }
      setShowModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data. Coba lagi.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus pencatatan kas ini?')) return;
    try {
      const supabase = createClient();
      await supabase.from('cashflow_items').delete().eq('id', id);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data. Coba lagi.');
    }
  };

  const openAddModal = (direction: 'masuk' | 'keluar') => {
    setEditingItem(null);
    setForm({
      name: '',
      direction,
      category: direction === 'masuk' ? 'pendapatan' : 'kebutuhan_sehari_hari',
      amount: 0,
      is_recurring: true
    });
    setShowModal(true);
  };

  // Calculations — pakai shared formula agar konsisten dengan Dashboard & Checkup
  const cashFlow = calculateCashFlow(items);
  const totalMasuk = cashFlow.totalKasMasuk;
  const totalKeluar = cashFlow.totalKasKeluar;
  const surplus = cashFlow.surplusDefisit;
  const isPositive = surplus >= 0;

  const kasMasuk = items.filter(i => i.direction === 'masuk');
  const kasKeluar = items.filter(i => i.direction === 'keluar');

  // Grouped outputs for display (filter direction='keluar' supaya item legacy tidak terhitung)
  const outGroups: Array<{ cat: CashflowCategory; label: string; color: string; total: number; items: CashflowItem[] }> = [
    { cat: 'kewajiban_cicilan', label: CASHFLOW_CATEGORY_LABELS.kewajiban_cicilan, color: CASHFLOW_CATEGORY_COLORS.kewajiban_cicilan, total: cashFlow.totalKewajiban, items: kasKeluar.filter(i => i.category === 'kewajiban_cicilan') },
    { cat: 'masa_depan_investasi', label: CASHFLOW_CATEGORY_LABELS.masa_depan_investasi, color: CASHFLOW_CATEGORY_COLORS.masa_depan_investasi, total: cashFlow.totalMasaDepan, items: kasKeluar.filter(i => i.category === 'masa_depan_investasi') },
    { cat: 'kebutuhan_sehari_hari', label: CASHFLOW_CATEGORY_LABELS.kebutuhan_sehari_hari, color: CASHFLOW_CATEGORY_COLORS.kebutuhan_sehari_hari, total: cashFlow.totalKebutuhan, items: kasKeluar.filter(i => i.category === 'kebutuhan_sehari_hari') },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-3 sm:p-6 animate-pulse">
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
        title="Arus Kas"
        subtitle="Pencatatan kas masuk & proporsi kas keluar bulanan"
        icon={ArrowLeftRight}
        gradient="from-indigo-500 to-violet-600"
        action={
          <div className="flex gap-2">
            <button onClick={() => openAddModal('keluar')} className="btn-secondary flex-1 sm:flex-none">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
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

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="card-premium p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground font-medium">Surplus / Defisit</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
               {isPositive ? 'Sehat' : 'Defisit'}
            </span>
          </div>
          <p className={`kpi-value font-bold font-numeric ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{formatRupiahCompact(surplus)}
          </p>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Persentase dari Pendapatan</span>
            <span className="font-numeric font-medium">{formatPercent(totalMasuk > 0 ? surplus / totalMasuk : 0)}</span>
          </div>
        </div>
        <div className="card-premium p-4 sm:p-5 sm:col-span-1 lg:col-span-2">
           <p className="text-sm text-muted-foreground font-medium mb-4">Postur Alokasi Pengeluaran Bulanan</p>
           <div className="space-y-4">
             {/* Progress Bar Container — scale ke max(masuk, keluar) supaya bar tidak overflow */}
             <div className="h-3 w-full bg-muted rounded-full flex overflow-hidden">
               {(() => {
                 const barMax = Math.max(totalMasuk, totalKeluar);
                 return outGroups.map(g => (
                   <div key={g.cat} style={{ width: `${barMax > 0 ? (g.total/barMax)*100 : 0}%`, backgroundColor: g.color }} className="h-full" />
                 ));
               })()}
             </div>
             {/* Legend */}
             <div className="grid grid-cols-3 gap-2 mt-2">
               {outGroups.map(g => {
                 const pct = totalMasuk > 0 ? g.total/totalMasuk : 0;
                 return (
                   <div key={g.cat}>
                     <div className="flex items-center gap-1.5 text-xs">
                       <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                       <span className="text-muted-foreground truncate">{g.label}</span>
                     </div>
                     <p className="font-numeric font-semibold text-foreground text-sm mt-1">{formatPercent(pct)}</p>
                     <p className="text-[10px] text-muted-foreground font-numeric">{formatRupiahCompact(g.total)}</p>
                   </div>
                 );
               })}
             </div>
           </div>
        </div>
      </div>

      {/* Main Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* KAS MASUK */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
               <ArrowUpRight className="w-5 h-5 text-emerald-500" />
               Kas Masuk
            </h2>
            <span className="text-emerald-500 font-bold font-numeric text-sm sm:text-base">{formatRupiahCompact(totalMasuk)}</span>
          </div>
          <div className="space-y-2">
             {kasMasuk.length === 0 ? (
               <p className="text-sm text-muted-foreground italic text-center py-6 border border-dashed rounded-xl">Belum ada kas masuk tercatat.</p>
             ) : (
               kasMasuk.map(item => (
                 <div key={item.id} className="card-premium p-4 flex items-center justify-between gap-3 hover:border-primary-500/30 group">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.is_recurring ? 'Rutin / Tetap' : 'Sekali masuk'} · {CASHFLOW_CATEGORY_LABELS[item.category]}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-numeric font-semibold text-emerald-500">+{formatRupiahCompact(item.amount)}</span>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingItem(item); setForm({ name: item.name, direction: item.direction, category: item.category, amount: item.amount, is_recurring: item.is_recurring }); setShowModal(true); }} className="p-2 text-muted-foreground hover:text-primary-500 touch-target"><Edit2 className="w-3.5 h-3.5" /></button>
                         <button onClick={() => handleDelete(item.id)} className="p-2 text-muted-foreground hover:text-red-500 touch-target"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* KAS KELUAR */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
               <ArrowDownRight className="w-5 h-5 text-red-500" />
               Kas Keluar
            </h2>
            <span className="text-red-500 font-bold font-numeric text-sm sm:text-base">-{formatRupiahCompact(totalKeluar)}</span>
          </div>
          <div className="space-y-4">
             {outGroups.filter(g => g.items.length > 0).map(group => (
               <div key={group.cat} className="space-y-2">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between px-2">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: group.color }} /> {group.label}</span>
                    <span className="font-numeric">{formatRupiahCompact(group.total)}</span>
                 </h3>
                 {group.items.map(item => (
                   <div key={item.id} className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-muted-foreground/30 transition-colors group/item">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.is_recurring ? 'Beban Tetap' : 'Beban Variabel'}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-numeric font-medium text-foreground">-{formatRupiahCompact(item.amount)}</span>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                           <button onClick={() => { setEditingItem(item); setForm({ name: item.name, direction: item.direction, category: item.category, amount: item.amount, is_recurring: item.is_recurring }); setShowModal(true); }} className="p-2 text-muted-foreground hover:text-primary-500 touch-target"><Edit2 className="w-3.5 h-3.5" /></button>
                           <button onClick={() => handleDelete(item.id)} className="p-2 text-muted-foreground hover:text-red-500 touch-target"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             ))}
             {outGroups.every(g => g.items.length === 0) && (
                <p className="text-sm text-muted-foreground italic text-center py-6 border border-dashed rounded-xl">Belum ada kas keluar tercatat.</p>
             )}
          </div>
        </div>
      </div>

      <BottomSheet
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Edit Arus Kas' : (form.direction === 'masuk' ? 'Catat Kas Masuk' : 'Catat Kas Keluar')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Nama Item / Keterangan</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} type="text" className="input-field" placeholder={form.direction === 'masuk' ? "e.g. Gaji Pokok" : "e.g. Belanja Bulanan"} />
          </div>

          {form.direction === 'keluar' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Kategori Pengeluaran</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value as CashflowItem['category']})} className="input-field">
                <option value="kewajiban_cicilan">Kewajiban & Cicilan (Misal: KPR, Paylater)</option>
                <option value="masa_depan_investasi">Masa Depan & Investasi (Misal: Reksadana)</option>
                <option value="kebutuhan_sehari_hari">Kebutuhan Sehari-hari (Misal: Makan, Listrik)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Jumlah Uang (Rp)</label>
            <input required min={0} value={form.amount || ''} onChange={e => setForm({...form, amount: Number(e.target.value)})} type="number" className="input-field font-numeric" />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="is_recurring" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500 bg-background border-border" />
            <label htmlFor="is_recurring" className="text-sm text-foreground select-none pointer-events-auto">Jadikan Anggaran Rutin Tetap (berulang tiap bulan)</label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">Simpan</button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
