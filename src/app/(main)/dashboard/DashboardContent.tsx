'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Plus, Wallet, PiggyBank, Activity, LayoutDashboard,
  ChevronRight, CalendarDays, ArrowRight
} from 'lucide-react';
import { formatRupiahCompact, formatPercent, getStatusColor, getMonthName, getMonthRange } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchAssets } from '@/lib/queries/assets';
import { fetchDebts } from '@/lib/queries/debts';
import { fetchCashflowItems } from '@/lib/queries/cashflow';
import { fetchSnapshots } from '@/lib/queries/snapshots';
import { fetchTransactions } from '@/lib/queries/transactions';
import { fetchSavingsGoals } from '@/lib/queries/savings';
import { fetchBudgetItems } from '@/lib/queries/budget';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { ChartGradients, chartGridStyle, chartAxisStyle, formatChartRupiah } from '@/components/charts/ChartTheme';
import type { Asset, Debt, CashflowItem, SavingsGoal, Transaction, FinancialCheckupItem } from '@/shared';
import { getDanaDarurat, calculateNetWorth, calculateCashFlow, calculateFinancialCheckup, calculateGrowth, checkupRadarScore, BUDGET_CATEGORY_LABELS, BUDGET_CATEGORY_COLORS } from '@/shared';
import { Skeleton, CardSkeleton, ChartSkeleton, KPISkeleton } from '@/components/ui/Skeleton';

interface NetWorthHistoryPoint {
  bulan: string;
  aset: number;
  utang: number;
  netWorth: number;
}

interface BudgetPreview {
  category: string;
  planned: number;
  actual: number;
  color: string;
}

interface CheckupRadarPoint {
  name: string;
  value: number;
  status: 'sehat' | 'warning' | 'bahaya';
}

export function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [netWorth, setNetWorth] = useState({ current: 0, previous: 0, growth: 0, totalAssets: 0, totalDebts: 0 });
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthHistoryPoint[]>([]);
  const [cashFlow, setCashFlow] = useState({ totalMasuk: 0, totalKeluar: 0, surplus: 0 });
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetPreview[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [checkupData, setCheckupData] = useState<CheckupRadarPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        const { startDate, endDate } = getMonthRange(currentYear, currentMonth);

        const [
          snapData, cashData, savingData, txData,
          assetData, debtData, budgetRows
        ] = await Promise.all([
          fetchSnapshots(userId, 12),
          fetchCashflowItems(userId),
          fetchSavingsGoals(userId),
          fetchTransactions(userId, startDate, endDate),
          fetchAssets(userId),
          fetchDebts(userId),
          fetchBudgetItems(userId),
        ]);

        if (snapData.length > 0) {
          const latest = snapData[snapData.length - 1];
          const prev = snapData.length > 1 ? snapData[snapData.length - 2] : latest;
          const prevNW = Number(prev.net_worth);
          setNetWorth({
            current: Number(latest.net_worth),
            previous: prevNW,
            growth: calculateGrowth(Number(latest.net_worth), prevNW) ?? 0,
            totalAssets: Number(latest.total_assets),
            totalDebts: Number(latest.total_debts),
          });
          setNetWorthHistory(snapData.map((s) => ({
            bulan: new Date(s.snapshot_date).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
            aset: Number(s.total_assets),
            utang: Number(s.total_debts),
            netWorth: Number(s.net_worth),
          })));
        } else if (assetData.length > 0 || debtData.length > 0) {
          const live = calculateNetWorth(assetData, debtData);
          setNetWorth({
            current: live.netWorth,
            previous: 0,
            growth: 0,
            totalAssets: live.totalAssets,
            totalDebts: live.totalDebts,
          });
        }

        const cashFlowResult = calculateCashFlow(cashData);
        setCashFlow({
          totalMasuk: cashFlowResult.totalKasMasuk,
          totalKeluar: cashFlowResult.totalKasKeluar,
          surplus: cashFlowResult.surplusDefisit,
        });

        if (savingData.length > 0) setSavingsGoals(savingData.slice(0, 4));

        if (assetData.length > 0 || debtData.length > 0 || cashData.length > 0) {
          const nw = calculateNetWorth(assetData, debtData);
          const danaDarurat = getDanaDarurat(assetData);
          const checkup = calculateFinancialCheckup({
            danaDarurat,
            pengeluaranBulanan: cashFlowResult.totalKasKeluar,
            totalCicilan: cashFlowResult.totalKewajiban,
            pendapatan: cashFlowResult.totalKasMasuk,
            tabunganInvestasi: cashFlowResult.totalMasaDepan,
            biayaHidup: cashFlowResult.totalKebutuhan,
            totalAset: nw.totalAssets,
            totalUtang: nw.totalDebts,
          });

          const radarNames = ['Dana Darurat', 'Arus Kas', 'Cicilan', 'Investasi', 'Biaya Hidup', 'Solvabilitas'];
          setCheckupData(checkup.map((item: FinancialCheckupItem, i: number) => ({
            name: radarNames[i],
            value: checkupRadarScore(item) / 100,
            status: item.status,
          })));
        }

        setTransactions(txData);
        setBudgetData(() => {
          const cats = Object.keys(BUDGET_CATEGORY_LABELS);
          return cats.map((cat) => {
            const planned = budgetRows.filter((b) => b.category === cat).reduce((s: number, b) => s + Number(b.amount), 0);
            const actual = txData.filter((t) => t.category === cat).reduce((s: number, t) => s + Number(t.amount), 0);
            return {
              category: BUDGET_CATEGORY_LABELS[cat as keyof typeof BUDGET_CATEGORY_LABELS],
              planned,
              actual,
              color: BUDGET_CATEGORY_COLORS[cat as keyof typeof BUDGET_CATEGORY_COLORS],
            };
          });
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentMonth, currentYear]);

  const worstStatus: 'sehat' | 'warning' | 'bahaya' = checkupData.some(d => d.status === 'bahaya')
    ? 'bahaya'
    : checkupData.some(d => d.status === 'warning')
      ? 'warning'
      : 'sehat';
  const radarColor = getStatusColor(worstStatus);

  const isPositiveCF = cashFlow.surplus >= 0;
  const isPositiveNW = netWorth.growth >= 0;

  if (loading) {
    return (
      <div className="space-y-6 p-3 sm:p-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <KPISkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
          <ChartSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {getMonthName(currentMonth)} {currentYear}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/budgeting"
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-lg text-sm font-medium transition-all shadow-glow active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Catat Transaksi</span>
            <span className="sm:hidden">Transaksi</span>
          </Link>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Net Worth */}
        <div className="relative overflow-hidden card-premium p-4 sm:p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-500/5 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Net Worth</p>
              </div>
              {netWorthHistory.length > 0 && (
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isPositiveNW ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {isPositiveNW ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(Math.abs(netWorth.growth))}
                </span>
              )}
            </div>
            <p className="kpi-value font-bold font-numeric text-foreground mt-1">
              {netWorth.current === 0 ? 'Rp 0' : formatRupiahCompact(netWorth.current)}
            </p>
            {netWorthHistory.length > 0 && (
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netWorthHistory}>
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#635bff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#635bff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="netWorth" stroke="#635bff" strokeWidth={2} fill="url(#nwGrad)" dot={false} />
                    <Tooltip content={<ChartTooltip formatter={formatRupiahCompact} />} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-2">
              <span>Aset <span className="font-semibold text-emerald-600">{formatRupiahCompact(netWorth.totalAssets)}</span></span>
              <span>Utang <span className="font-semibold text-red-500">{formatRupiahCompact(netWorth.totalDebts)}</span></span>
            </div>
          </div>
        </div>

        {/* Arus Kas */}
        <div className="relative overflow-hidden card-premium p-4 sm:p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground">Arus Kas</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isPositiveCF ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {isPositiveCF ? 'Surplus' : 'Defisit'}
              </span>
            </div>
            <p className={`kpi-value font-bold font-numeric mt-1 ${isPositiveCF ? 'text-emerald-600' : 'text-red-500'}`}>
              {isPositiveCF ? '+' : ''}{formatRupiahCompact(cashFlow.surplus)}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Pemasukan</span>
                </div>
                <span className="font-numeric font-semibold text-emerald-600">{formatRupiahCompact(cashFlow.totalMasuk)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-muted-foreground">Pengeluaran</span>
                </div>
                <span className="font-numeric font-semibold text-red-500">{formatRupiahCompact(cashFlow.totalKeluar)}</span>
              </div>
            </div>
            {cashFlow.totalMasuk > 0 && (
              <div className="mt-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (cashFlow.totalKeluar / cashFlow.totalMasuk) * 100)}%`,
                      background: `linear-gradient(90deg, #3ecf8e, ${(cashFlow.totalKeluar / cashFlow.totalMasuk) > 0.8 ? '#ef4444' : '#635bff'})`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {formatPercent(cashFlow.totalKeluar / cashFlow.totalMasuk)} terpakai
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Checkup Score */}
        <div className="card-premium p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-sm font-medium text-foreground">Checkup</p>
            </div>
            <Link href="/checkup" className="group flex items-center gap-1 text-xs text-primary-500 font-medium hover:text-primary-600 transition-colors">
              Detail
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="h-[130px]">
            {checkupData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={checkupData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 8.5, fill: 'hsl(var(--muted-foreground))' }} />
                  <Radar
                    name="Skor"
                    dataKey="value"
                    stroke={radarColor}
                    fill={radarColor}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: radarColor, strokeWidth: 0 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                <p className="text-center">Data belum<br />tersedia</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 mt-1 pt-2 border-t border-border/40">
            {(['sehat', 'warning', 'bahaya'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: getStatusColor(s) }} />
                {s === 'sehat' ? 'Sehat' : s === 'warning' ? 'Waspada' : 'Bahaya'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Net Worth History + Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Net Worth History Chart */}
        <div className="lg:col-span-3 card-premium p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Riwayat Kekayaan</h2>
            <Link href="/net-worth" className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">
              Kelola
            </Link>
          </div>
          <div className="h-56 sm:h-64">
            {netWorthHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <ChartGradients prefix="dash" />
                  <XAxis dataKey="bulan" {...chartAxisStyle} />
                  <YAxis {...chartAxisStyle} tickFormatter={formatChartRupiah} width={65} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="aset" stroke="#3ecf8e" strokeWidth={2} fill="url(#dash-gradSuccess)" stackId="1" dot={false} />
                  <Area type="monotone" dataKey="utang" stroke="#ef4444" strokeWidth={2} fill="url(#dash-gradDanger)" stackId="2" dot={false} />
                  <Area type="monotone" dataKey="netWorth" stroke="#635bff" strokeWidth={3} fill="url(#dash-gradPrimary)" dot={{ r: 3, strokeWidth: 2, fill: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm border border-dashed rounded-xl">
                <p className="text-center">Simpan snapshot di halaman Net Worth<br />untuk melihat grafik perkembangan</p>
              </div>
            )}
          </div>
        </div>

        {/* Budget Preview */}
        <div className="lg:col-span-2 card-premium p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Budget {getMonthName(currentMonth)}</h2>
            <Link href="/budgeting" className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">
              Detail
            </Link>
          </div>
          <div className="space-y-3">
            {budgetData.filter(b => b.planned > 0).map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <p className="text-xs font-medium text-foreground">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{formatRupiahCompact(item.planned)}</span>
                    <span className="font-numeric font-semibold" style={{ color: item.actual > item.planned ? '#ef4444' : item.color }}>
                      {formatRupiahCompact(item.actual)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (item.actual / item.planned) * 100)}%`,
                      background: item.actual > item.planned ? '#ef4444' : item.color,
                    }}
                  />
                </div>
              </div>
            ))}
            {budgetData.every(b => b.planned === 0) && (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Wallet className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Belum ada anggaran</p>
                <Link href="/budgeting" className="text-xs text-primary-500 mt-1 hover:underline">Atur Budget →</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Savings Goals + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Savings Goals */}
        <div className="lg:col-span-2 card-premium p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-foreground">Target Tabungan</h2>
            </div>
            <Link href="/tabungan" className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">
              Kelola
            </Link>
          </div>
          <div className="space-y-4">
            {savingsGoals.length > 0 ? savingsGoals.map((goal) => {
              const saved = Number(goal.initial_amount || 0) + Number(goal.current_amount || 0);
              const target = Number(goal.target_amount || 1);
              const pct = Math.min(100, (saved / target) * 100);
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{goal.icon || '🎯'}</span>
                      <p className="text-sm font-medium text-foreground truncate">{goal.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-numeric font-semibold" style={{ color: goal.color || '#635bff' }}>
                        {formatRupiahCompact(saved)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">dari {formatRupiahCompact(target)}</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: goal.color || '#635bff' }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(0)}% terkumpul</p>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <PiggyBank className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Belum ada target tabungan</p>
                <Link href="/tabungan" className="text-xs text-primary-500 mt-1 hover:underline">Buat Target →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions + Bills */}
        <div className="lg:col-span-3 space-y-3">
          {/* Recent Transactions */}
          <div className="card-premium p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Transaksi Terbaru</h2>
              <Link href="/budgeting" className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">
                Semua
              </Link>
            </div>
            {transactions.length > 0 ? (
              <div className="space-y-1">
                {transactions.slice(0, 5).map((tx, i) => {
                  const isIncome = tx.category === 'PENDAPATAN';
                  return (
                    <div key={tx.id || i} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isIncome ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          <span className={`text-xs font-bold ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isIncome ? '+' : '-'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tx.subcategory || tx.description || 'Transaksi'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-numeric font-semibold ml-3 shrink-0 ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}{formatRupiahCompact(tx.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <Wallet className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Belum ada transaksi bulan ini</p>
                <Link href="/budgeting" className="text-xs text-primary-500 mt-1 hover:underline">Catat transaksi →</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Net Worth', href: '/net-worth', icon: TrendingUp, desc: 'Aset & utang', color: '#635bff' },
          { label: 'Arus Kas', href: '/arus-kas', icon: Activity, desc: 'Surplus & defisit', color: '#3ecf8e' },
          { label: 'Simulasi KPR', href: '/kpr', icon: TrendingUp, desc: 'Cicilan KPR', color: '#f5a623' },
          { label: 'Checkup', href: '/checkup', icon: Activity, desc: 'Kesehatan finansial', color: '#06b6d4' },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="card-premium p-4 flex items-center gap-3 hover:border-primary-500/40 group transition-all active:scale-[0.98]"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${action.color}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: action.color }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary-500 transition-colors">
                  {action.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{action.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
