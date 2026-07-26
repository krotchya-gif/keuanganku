'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchTransactions } from '@/lib/queries/transactions';
import { fetchSnapshots } from '@/lib/queries/snapshots';
import { Loader2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Skeleton, KPISkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { formatRupiah, formatRupiahCompact } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { chartGridStyle, chartAxisStyle, formatChartRupiah } from '@/components/charts/ChartTheme';

export function EvaluasiContent() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [netWorthData, setNetWorthData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const userId = await getCurrentUserId();
        if (!userId) return;

        // Fetch all transactions for the year
        const txs = await fetchTransactions(userId, `${year}-01-01`, `${year}-12-31`);

        // Group transactions by month
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const grouped = months.map((m, idx) => {
          const mtxs = txs.filter(t => new Date(t.transaction_date).getMonth() === idx);
          const income = mtxs.filter(t => t.category === 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
          const expense = mtxs.filter(t => t.category !== 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
          return {
            bulan: m,
            Pemasukan: income,
            Pengeluaran: expense,
            Surplus: income - expense
          };
        });
        setMonthlyData(grouped);

        // Fetch Net Worth Snapshots
        const nw = await fetchSnapshots(userId, 12);

        const nwGrouped = months.map((m, idx) => {
          const snap = nw.find(n => {
             const dt = new Date(n.snapshot_date);
             return dt.getMonth() === idx;
          });
          return {
            bulan: m,
            Kekayaan: snap ? Number(snap.net_worth) : null
          };
        });
        setNetWorthData(nwGrouped);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [year]);

  if (loading) return (
    <div className="space-y-6 p-3 sm:p-6 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <KPISkeleton />
      <ChartSkeleton />
    </div>
  );

  const totalIncome = monthlyData.reduce((s, d) => s + d.Pemasukan, 0);
  const totalExpense = monthlyData.reduce((s, d) => s + d.Pengeluaran, 0);
  const netSurplus = totalIncome - totalExpense;

  const validNw = netWorthData.filter(d => d.Kekayaan !== null);
  const currentNw = validNw.length > 0 ? validNw[validNw.length - 1].Kekayaan : 0;
  const initialNw = validNw.length > 0 ? validNw[0].Kekayaan : 0;
  const nwGrowth = currentNw - initialNw;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evaluasi Tahunan</h1>
          <p className="text-muted-foreground text-sm mt-1">Laporan komprehensif kesehatan finansial Anda dalam setahun</p>
        </div>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-card border border-border rounded-lg px-4 py-2 text-sm font-bold focus:ring-primary-500">
           {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Tahun {y}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="card-premium p-5 border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5"/> Total Pemasukan</p>
            <p className="text-2xl font-bold font-numeric text-emerald-600 mt-2">{formatRupiahCompact(totalIncome)}</p>
         </div>
         <div className="card-premium p-5 border-red-500/10 bg-red-500/5">
            <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-1 flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5"/> Total Pengeluaran</p>
            <p className="text-2xl font-bold font-numeric text-red-600 mt-2">{formatRupiahCompact(totalExpense)}</p>
         </div>
         <div className="card-premium p-5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Net Surplus / Defisit</p>
            <p className={`text-2xl font-bold font-numeric mt-2 ${netSurplus >= 0 ? 'text-primary-600' : 'text-red-500'}`}>
               {netSurplus >= 0 ? '+' : ''}{formatRupiahCompact(netSurplus)}
            </p>
         </div>
         <div className="card-premium p-5 border-primary-500/20 shadow-md">
            <p className="text-xs font-bold text-primary-700 uppercase tracking-widest mb-1">Pertumbuhan Net Worth</p>
            <p className={`text-2xl font-bold font-numeric mt-2 ${nwGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
               {nwGrowth >= 0 ? '+' : ''}{formatRupiahCompact(nwGrowth)}
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Arus Kas Chart */}
         <div className="card-premium p-6">
            <h2 className="text-sm font-bold mb-6">Perbandingan Pemasukan & Pengeluaran Bulanan</h2>
            <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                     <CartesianGrid {...chartGridStyle} vertical={false} />
                     <XAxis dataKey="bulan" {...chartAxisStyle} />
                     <YAxis {...chartAxisStyle} tickFormatter={formatChartRupiah} />
                     <Tooltip content={<ChartTooltip />} cursor={{ fill: 'transparent' }} />
                    <Legend wrapperStyle={{ fontSize: 12, marginTop: '10px' }} />
                    <Bar dataKey="Pemasukan" fill="#3ecf8e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Net Worth Chart */}
         <div className="card-premium p-6">
            <h2 className="text-sm font-bold mb-6">Progres Kekayaan Bersih (Net Worth) {year}</h2>
            {validNw.length === 0 ? (
               <div className="h-64 flex flex-col items-center justify-center border-dashed border-2 border-border rounded-xl">
                 <p className="text-sm text-muted-foreground font-medium">Belum ada data Net Worth Snapshots.</p>
                 <p className="text-xs text-muted-foreground mt-1">Simpan snapshot bulanan di halaman Net Worth.</p>
               </div>
            ) : (
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={netWorthData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                       <CartesianGrid {...chartGridStyle} vertical={false} />
                       <XAxis dataKey="bulan" {...chartAxisStyle} />
                       <YAxis {...chartAxisStyle} tickFormatter={formatChartRupiah} />
                       <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="Kekayaan" stroke="#635bff" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
