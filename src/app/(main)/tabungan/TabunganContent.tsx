'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchSavingsGoals } from '@/lib/queries/savings';
import { fetchTransactionsByCategory } from '@/lib/queries/transactions';
import { PiggyBank, Target, ArrowUpRight, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { Skeleton, CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { formatRupiah, formatRupiahCompact, formatPercent } from '@/lib/utils';
import { calculateSavingsProgress } from '@/shared';
import type { SavingsGoal, Transaction } from '@/shared';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { ChartGradients, chartGridStyle, chartAxisStyle, formatChartRupiah } from '@/components/charts/ChartTheme';

const ICONS = ['🎯', '💰', '🏠', '🚗', '✈️', '📚', '💻', '🏥', '💍', '🎓', '🏦', '🛒'];
const year = new Date().getFullYear();

export function TabunganContent() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState({ name: '', target_amount: 0, monthly_contribution: 0, icon: '🎯', color: '#635bff' });

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
    if (!confirm('Hapus target ini?')) return;
    try {
      await createClient().from('savings_goals').delete().eq('id', g.id);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus target. Coba lagi.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      if (editing) {
        await supabase.from('savings_goals').update({ name: form.name, target_amount: form.target_amount, monthly_contribution: form.monthly_contribution, icon: form.icon, color: form.color }).eq('id', editing.id);
      } else {
        await supabase.from('savings_goals').insert({ ...form, user_id: userId, initial_amount: 0, current_amount: 0 });
      }
      setShowModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan target. Coba lagi.');
    }
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
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Target Tabungan & Investasi</h1>
          <p className="text-muted-foreground text-sm mt-1">Pantau progres menuju target finansial Anda</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', target_amount: 0, monthly_contribution: 0, icon: '🎯', color: '#635bff' }); setShowModal(true); }} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-glow">
          <Plus className="w-4 h-4" /> Target Baru
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 card-premium text-center border-dashed">
          <PiggyBank className="w-12 h-12 text-muted-foreground mb-3 opacity-20" />
          <p className="text-sm font-medium text-foreground">Belum ada target tabungan.</p>
          <p className="text-xs text-muted-foreground mt-1">Buat target baru untuk mulai menabung.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <div className="card-premium p-6 border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="w-5 h-5 text-emerald-500" />
                <h2 className="text-sm font-bold uppercase text-emerald-700">Total Terkumpul</h2>
              </div>
              <p className="text-3xl font-bold font-numeric text-emerald-600">{formatRupiah(totalAccumulated)}</p>
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
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold flex items-center gap-1"><span>{g.icon || '🎯'}</span> {g.name}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-numeric text-muted-foreground">{formatRupiahCompact(prog.totalSaved)} / {formatRupiahCompact(g.target_amount)}</span>
                          <button onClick={() => { setEditing(g); setForm({ name: g.name, target_amount: Number(g.target_amount), monthly_contribution: Number(g.monthly_contribution), icon: g.icon || '🎯', color: g.color || '#635bff' }); setShowModal(true); }} className="p-1 text-muted-foreground hover:text-primary-500"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => handleDelete(g)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Target</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Target Amount</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Terkumpul</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Progres</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">Target Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {goals.map(g => {
                    const prog = calculateSavingsProgress(g);
                    return (
                      <tr key={g.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4"><span className="mr-2">{g.icon || '🎯'}</span>{g.name}</td>
                        <td className="py-3 px-4 font-numeric">{formatRupiah(g.target_amount)}</td>
                        <td className="py-3 px-4 font-numeric text-emerald-600">{formatRupiah(prog.totalSaved)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, prog.progressPercent)}%`, background: g.color || '#635bff' }} />
                            </div>
                            <span className="text-xs font-numeric font-medium">{prog.progressPercent.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{g.target_date ? new Date(g.target_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{editing ? 'Edit Target' : 'Target Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-md"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Nama Target</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} type="text" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" placeholder="e.g. Dana Darurat 6x" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Target Amount (Rp)</label>
                <input required min={0} value={form.target_amount || ''} onChange={e => setForm({...form, target_amount: Number(e.target.value)})} type="number" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-numeric focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Target Nabung per Bulan (Rp)</label>
                <input min={0} value={form.monthly_contribution || ''} onChange={e => setForm({...form, monthly_contribution: Number(e.target.value)})} type="number" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-numeric focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => setForm({...form, icon: ic})} className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border ${form.icon === ic ? 'border-primary-500 bg-primary-500/10' : 'border-border hover:border-muted-foreground'}`}>{ic}</button>
                  ))}
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg">Batal</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg shadow-glow">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
