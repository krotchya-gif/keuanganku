'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchSavingsGoals } from '@/lib/queries/savings';
import { fetchTransactionsByCategory } from '@/lib/queries/transactions';
import { PiggyBank, Target, ArrowUpRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { Skeleton, CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TableScroll } from '@/components/ui/TableScroll';
import { formatRupiah, formatRupiahCompact, formatPercent } from '@/lib/utils';
import { calculateSavingsProgress } from '@/shared';
import type { SavingsGoal, Transaction } from '@/shared';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { ChartGradients, chartGridStyle, chartAxisStyle, formatChartRupiah } from '@/components/charts/ChartTheme';

const ICONS = ['🎯', '💰', '🏠', '🚗', '✈️', '📚', '💻', '🏥', '💍', '🎓', '🏦', '🛒'];

export function TabunganContent() {
  const year = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', target_amount: 0, monthly_contribution: 0, saved: 0, icon: '🎯', color: '#635bff' });

  const fetchData = async () => {
    try {
      if (goals.length === 0) setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) return;
      setUserId(userId);

      const [goalData, txData] = await Promise.all([
        fetchSavingsGoals(userId),
        fetchTransactionsByCategory(userId, 'TABUNGAN_INVESTASI', `${year}-01-01`, `${year}-12-31`),
      ]);

      setGoals(goalData);
      setTxs(txData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalAccumulated = goals.reduce((s, g) => s + Number(g.initial_amount || 0) + Number(g.current_amount || 0), 0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const chartData = months.map((m, idx) => ({
    bulan: m,
    total: txs.filter(t => Number(String(t.transaction_date).slice(0, 10).split('-')[1]) === idx + 1).reduce((s, t) => s + Number(t.amount), 0),
  }));

  const handleDelete = async (g: SavingsGoal) => {
    if (!window.confirm('Hapus target ini?')) return;
    const { error } = await createClient().from('savings_goals').delete().eq('id', g.id);
    if (error) {
      console.error(error);
      window.alert('Gagal menghapus target. Coba lagi.');
      return;
    }
    await fetchData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) { setFormError('Isi nama target terlebih dahulu.'); return; }
    if (form.target_amount <= 0) { setFormError('Isi nominal target lebih dari nol.'); return; }

    // Progres dihitung dari initial_amount + current_amount; simpan nilai
    // terkumpul di initial_amount agar tidak terhitung ganda.
    const payload = {
      name: form.name.trim(),
      target_amount: form.target_amount,
      monthly_contribution: form.monthly_contribution,
      icon: form.icon,
      color: form.color,
      initial_amount: form.saved,
      current_amount: 0,
    };
    const supabase = createClient();
    const { error } = editing
      ? await supabase.from('savings_goals').update(payload).eq('id', editing.id)
      : await supabase.from('savings_goals').insert({ ...payload, user_id: userId });
    if (error) {
      console.error(error);
      setFormError('Gagal menyimpan target. Periksa koneksi lalu coba lagi.');
      return;
    }
    setShowModal(false);
    await fetchData();
  };

  if (loading) return (
    <div className="space-y-6 p-3 sm:p-6 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="md:col-span-2">
          <ChartSkeleton />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Target Tabungan & Investasi"
        subtitle="Pantau progres menuju target finansial Anda"
        icon={PiggyBank}
        gradient="from-emerald-500 to-teal-600"
        action={
          <button onClick={() => { setEditing(null); setForm({ name: '', target_amount: 0, monthly_contribution: 0, saved: 0, icon: '🎯', color: '#635bff' }); setShowModal(true); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Target Baru
          </button>
        }
      />

      {goals.length === 0 ? (
        <div className="card-premium border-dashed">
          <EmptyState
            icon={PiggyBank}
            title="Belum ada target tabungan."
            description="Buat target baru untuk mulai menabung."
            color="#3ecf8e"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="card-premium p-5 sm:p-6 border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-bold uppercase text-emerald-700">Total Terkumpul</h2>
              </div>
              <p className="kpi-value font-bold font-numeric text-emerald-600">{formatRupiahCompact(totalAccumulated)}</p>
              <div className="flex items-center justify-between mt-4 mb-2 text-xs">
                <span className="text-muted-foreground">Total Target: {formatRupiahCompact(totalTarget)}</span>
                <span className="font-bold text-emerald-600 font-numeric">{formatPercent(totalTarget > 0 ? totalAccumulated / totalTarget : 0)}</span>
              </div>
              <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all rounded-full" style={{ width: `${Math.min(100, totalTarget > 0 ? (totalAccumulated / totalTarget) * 100 : 0)}%` }} />
              </div>
            </div>

            <div className="card-premium p-5">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-primary-600">
                <Target className="w-4 h-4" /> Progres per Target
              </h2>
              <div className="space-y-4">
                {goals.map(g => {
                  const prog = calculateSavingsProgress(g);
                  return (
                    <div key={g.id}>
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <span className="text-xs font-semibold flex items-center gap-1 min-w-0"><span className="shrink-0">{g.icon || '🎯'}</span> <span className="truncate">{g.name}</span></span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-numeric text-muted-foreground">{formatRupiahCompact(prog.totalSaved)} / {formatRupiahCompact(g.target_amount)}</span>
                          <button onClick={() => { setEditing(g); setForm({ name: g.name, target_amount: Number(g.target_amount), monthly_contribution: Number(g.monthly_contribution), saved: Number(g.initial_amount || 0) + Number(g.current_amount || 0), icon: g.icon || '🎯', color: g.color || '#635bff' }); setShowModal(true); }} aria-label={`Ubah target ${g.name}`} className="p-1.5 text-muted-foreground hover:text-primary-500 touch-target"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(g)} className="p-1.5 text-muted-foreground hover:text-red-500 touch-target"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, prog.progressPercent)}%`, background: g.color || '#635bff' }} />
                        </div>
                        <span className="text-[9px] font-numeric font-bold w-8 text-right" style={{ color: g.color || '#635bff' }}>{prog.progressPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="card-premium p-6 h-full min-h-[300px] flex flex-col">
              <h2 className="text-sm font-bold mb-6 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Grafik Setoran Tabungan ({year})
              </h2>
              <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid {...chartGridStyle} vertical={false} />
                    <XAxis dataKey="bulan" {...chartAxisStyle} />
                    <YAxis {...chartAxisStyle} tickFormatter={(v) => formatChartRupiah(v)} width={60} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="total" stroke="#3ecf8e" strokeWidth={3} fill="url(#tab-gradSuccess)" />
                    <ChartGradients prefix="tab" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card-premium overflow-hidden">
              <TableScroll minWidth={560}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground whitespace-nowrap">Target</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground whitespace-nowrap">Target Amount</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground whitespace-nowrap">Terkumpul</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground whitespace-nowrap">Progres</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground whitespace-nowrap">Target Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {goals.map(g => {
                    const prog = calculateSavingsProgress(g);
                    return (
                      <tr key={g.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 whitespace-nowrap"><span className="mr-2">{g.icon || '🎯'}</span>{g.name}</td>
                        <td className="py-3 px-4 font-numeric whitespace-nowrap">{formatRupiahCompact(g.target_amount)}</td>
                        <td className="py-3 px-4 font-numeric text-emerald-600 whitespace-nowrap">{formatRupiahCompact(prog.totalSaved)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, prog.progressPercent)}%`, background: g.color || '#635bff' }} />
                            </div>
                            <span className="text-xs font-numeric font-medium whitespace-nowrap">{prog.progressPercent.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{g.target_date ? new Date(g.target_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </TableScroll>
            </div>
          </div>
        </div>
      )}

      <BottomSheet open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Ubah Target' : 'Target Baru'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Nama Target</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} type="text" className="input-field" placeholder="misal: Dana Darurat 6x Pengeluaran" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Nominal Target (Rp)</label>
            <input required min={0} value={form.target_amount || ''} onChange={e => setForm({...form, target_amount: Number(e.target.value)})} type="number" className="input-field font-numeric" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Sudah Terkumpul (Rp)</label>
            <input min={0} value={form.saved || ''} onChange={e => setForm({...form, saved: Number(e.target.value)})} type="number" className="input-field font-numeric" />
            <p className="mt-1 text-[10px] text-muted-foreground">Total tabungan yang sudah Anda kumpulkan untuk target ini.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Rencana Menabung per Bulan (Rp)</label>
            <input min={0} value={form.monthly_contribution || ''} onChange={e => setForm({...form, monthly_contribution: Number(e.target.value)})} type="number" className="input-field font-numeric" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Ikon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm({...form, icon: ic})} className={`touch-target flex h-10 w-10 items-center justify-center rounded-xl border text-lg ${form.icon === ic ? 'border-primary-500 bg-primary-500/10' : 'border-border hover:border-muted-foreground'}`}>{ic}</button>
              ))}
            </div>
          </div>

          {formError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">{formError}</p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary">{editing ? 'Simpan Perubahan' : 'Simpan Target'}</button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
