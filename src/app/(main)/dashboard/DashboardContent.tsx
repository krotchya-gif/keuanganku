'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight, ArrowDownRight, Plus, Wallet, PiggyBank, Activity,
  ChevronRight, ArrowLeftRight, House, TrendingUp, HeartPulse,
  Target, Repeat, History, BarChart3,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';
import { formatRupiahCompact, formatPercent, getLocalDateString, cn } from '@/lib/utils';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchAssets } from '@/lib/queries/assets';
import { fetchDebts } from '@/lib/queries/debts';
import { fetchSnapshots } from '@/lib/queries/snapshots';
import { fetchTransactions } from '@/lib/queries/transactions';
import { fetchSavingsGoals } from '@/lib/queries/savings';
import { fetchBudgetItems } from '@/lib/queries/budget';
import { RecordTransactionSheet } from '@/components/transactions/RecordTransactionSheet';
import { HeroCard } from '@/components/ui/HeroCard';
import { QuickActionCircle } from '@/components/ui/QuickActionCircle';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { ChartGradients, chartAxisStyle, formatChartRupiah } from '@/components/charts/ChartTheme';
import type { SavingsGoal, Transaction } from '@/shared';
import { calculateNetWorth, calculateGrowth, BUDGET_CATEGORY_LABELS, BUDGET_CATEGORY_COLORS } from '@/shared';
import { Skeleton, ChartSkeleton } from '@/components/ui/Skeleton';

const QUICK_ACTIONS = [
  { label: 'Arus Kas', href: '/arus-kas', icon: ArrowLeftRight, color: '#3ecf8e' },
  { label: 'Simulasi KPR', href: '/kpr', icon: House, color: '#f5a623' },
  { label: 'Kekayaan Bersih', href: '/net-worth', icon: TrendingUp, color: '#635bff' },
  { label: 'Checkup', href: '/checkup', icon: HeartPulse, color: '#06b6d4' },
  { label: 'Tabungan', href: '/tabungan', icon: Target, color: '#ec4899' },
  { label: 'Kas Rutin', href: '/kas-rutin', icon: Repeat, color: '#8b5cf6' },
  { label: 'Riwayat', href: '/kalendar', icon: History, color: '#0ea5e9' },
  { label: 'Evaluasi', href: '/evaluasi', icon: BarChart3, color: '#f59e0b' },
];

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

const PRIVACY_KEY = 'keuanganku:sembunyikan-nilai';

export function DashboardContent() {
  // Stabil agar efek & memo tidak berjalan ulang tiap render.
  const [now] = useState(() => new Date());
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [summaryTab, setSummaryTab] = useState<'kas' | 'anggaran'>('kas');
  const [refreshKey, setRefreshKey] = useState(0);

  const [netWorth, setNetWorth] = useState({ current: 0, previous: 0, growth: 0, totalAssets: 0, totalDebts: 0 });
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthHistoryPoint[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [budgetData, setBudgetData] = useState<BudgetPreview[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setHidden(localStorage.getItem(PRIVACY_KEY) === '1');
  }, []);

  const toggleHidden = () => {
    setHidden((h) => {
      localStorage.setItem(PRIVACY_KEY, h ? '0' : '1');
      return !h;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        // 60 hari terakhir: mencakup bulan berjalan + aktivitas mingguan lintas bulan.
        const from = new Date(now);
        from.setDate(from.getDate() - 59);
        const { startDate, endDate } = { startDate: getLocalDateString(from), endDate: getLocalDateString(now) };

        const [snapData, txData, assetData, debtData, savingData, budgetRows] = await Promise.all([
          fetchSnapshots(userId, 12),
          fetchTransactions(userId, startDate, endDate),
          fetchAssets(userId),
          fetchDebts(userId),
          fetchSavingsGoals(userId),
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
            bulan: new Date(`${s.snapshot_date}T00:00:00`).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
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

        setTransactions(txData);
        setSavingsGoals(savingData.slice(0, 4));

        // Realisasi anggaran: transaksi bulan berjalan per kategori.
        const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
        setBudgetData(() => {
          const cats = Object.keys(BUDGET_CATEGORY_LABELS);
          return cats.map((cat) => {
            const planned = budgetRows.filter((b) => b.category === cat).reduce((s: number, b) => s + Number(b.amount), 0);
            const actual = txData
              .filter((t) => t.category === cat && t.transaction_date.startsWith(monthPrefix))
              .reduce((s: number, t) => s + Number(t.amount), 0);
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
        setFetchError('Gagal memuat data. Periksa koneksi internet Anda lalu coba lagi.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear, refreshKey]);

  // Arus kas aktual bulan berjalan (dari transaksi, bukan rencana).
  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const cashFlow = useMemo(() => {
    const monthTx = transactions.filter((t) => t.transaction_date.startsWith(monthPrefix));
    const masuk = monthTx.filter((t) => t.category === 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
    const keluar = monthTx.filter((t) => t.category !== 'PENDAPATAN').reduce((s, t) => s + Number(t.amount), 0);
    return { masuk, keluar, surplus: masuk - keluar };
  }, [transactions, monthPrefix]);

  // Aktivitas pengeluaran 7 hari terakhir untuk grafik batang.
  const weeklyActivity = useMemo(() => {
    const days: Array<{ hari: string; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      const total = transactions
        .filter((t) => t.transaction_date === key && t.category !== 'PENDAPATAN')
        .reduce((s, t) => s + Number(t.amount), 0);
      days.push({ hari: d.toLocaleDateString('id-ID', { weekday: 'short' }), total });
    }
    return days;
  }, [transactions, now]);

  const sisaPersen = cashFlow.masuk > 0 ? Math.max(0, Math.min(100, ((cashFlow.masuk - cashFlow.keluar) / cashFlow.masuk) * 100)) : null;

  const isPositiveNW = netWorth.growth >= 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Ikhtisar</p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Keuanganku</h1>
        </div>
        <button onClick={() => setRecordOpen(true)} className="btn-primary hidden md:flex">
          <Plus className="w-4 h-4" />
          Catat Transaksi
        </button>
      </div>

      {fetchError && (
        <ErrorBanner message={fetchError} onRetry={() => { setFetchError(null); setRefreshKey((k) => k + 1); }} />
      )}

      {/* Hero — Kekayaan Bersih */}
      <HeroCard
        label="Kekayaan Bersih"
        value={netWorth.current === 0 ? 'Rp 0' : formatRupiahCompact(netWorth.current)}
        hidden={hidden}
        onToggleHidden={toggleHidden}
        chips={
          netWorthHistory.length > 0 ? (
            <span className="flex w-fit items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
              {isPositiveNW ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {formatPercent(Math.abs(netWorth.growth))}
            </span>
          ) : (
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90">
              <TrendingUp className="w-3 h-3" /> {netWorthHistory.length || 0} snapshot tercatat
            </span>
          )
        }
        stats={[
          { label: 'Aset', value: formatRupiahCompact(netWorth.totalAssets), icon: <ArrowUpRight className="w-3.5 h-3.5" /> },
          { label: 'Kewajiban', value: formatRupiahCompact(netWorth.totalDebts), icon: <ArrowDownRight className="w-3.5 h-3.5" /> },
        ]}
      >
        {netWorthHistory.length > 1 && (
          <div className="mt-3 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthHistory}>
                <defs>
                  <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="netWorth" stroke="rgba(255,255,255,0.9)" strokeWidth={2} fill="url(#heroSpark)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </HeroCard>

      {/* Aksi cepat */}
      <nav aria-label="Aksi cepat" className="grid grid-cols-4 sm:grid-cols-8 gap-y-3 justify-items-center">
        {QUICK_ACTIONS.map((action) => (
          <QuickActionCircle key={action.href} href={action.href} label={action.label} icon={<action.icon className="h-5 w-5" />} color={action.color} />
        ))}
      </nav>

      {/* Ringkasan: tab Arus Kas / Anggaran */}
      <section className="card-premium p-4 sm:p-5">
        <SegmentedControl
          value={summaryTab}
          onChange={setSummaryTab}
          options={[
            { value: 'kas', label: 'Arus Kas' },
            { value: 'anggaran', label: 'Anggaran' },
          ]}
          className="mb-4"
        />

        {summaryTab === 'kas' ? (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative h-36 w-36 shrink-0">
              {sisaPersen !== null ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Tersisa', value: sisaPersen },
                          { name: 'Terpakai', value: 100 - sisaPersen },
                        ]}
                        dataKey="value"
                        innerRadius="72%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        <Cell key="sisa" fill="#635bff" />
                        <Cell key="terpakai" fill="hsl(var(--muted))" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-numeric text-xl font-bold text-foreground">{Math.round(sisaPersen)}%</p>
                    <p className="text-[10px] text-muted-foreground">dana tersisa</p>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                  Belum ada pemasukan bulan ini
                </div>
              )}
            </div>

            <div className="w-full space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowDownRight className="h-4 w-4 text-success" /> Pemasukan
                </span>
                <span className="font-numeric text-sm font-semibold text-success">
                  {hidden ? 'Rp ••••••' : formatRupiahCompact(cashFlow.masuk)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArrowUpRight className="h-4 w-4 text-danger" /> Pengeluaran
                </span>
                <span className="font-numeric text-sm font-semibold text-danger">
                  {hidden ? 'Rp ••••••' : formatRupiahCompact(cashFlow.keluar)}
                </span>
              </div>
              <p className={cn('text-center text-xs font-medium', cashFlow.surplus >= 0 ? 'text-success' : 'text-danger')}>
                {cashFlow.surplus >= 0 ? 'Surplus ' : 'Defisit '}
                {hidden ? 'Rp ••••••' : formatRupiahCompact(Math.abs(cashFlow.surplus))}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {budgetData.filter((b) => b.planned > 0).map((item) => (
              <div key={item.category}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <p className="text-xs font-medium text-foreground">{item.category}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{formatRupiahCompact(item.planned)}</span>
                    <span className="font-numeric font-semibold" style={{ color: item.actual > item.planned ? '#ef4444' : item.color }}>
                      {formatRupiahCompact(item.actual)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
            {budgetData.every((b) => b.planned === 0) && (
              <EmptyState
                icon={Wallet}
                title="Belum ada anggaran"
                description="Susun dompet anggaran bulan ini agar pengeluaran lebih terkendali."
                action={<Link href="/budgeting" className="btn-secondary text-xs">Atur Anggaran</Link>}
              />
            )}
          </div>
        )}
      </section>

      {/* Aktivitas pengeluaran mingguan */}
      <section className="card-premium p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Aktivitas Pengeluaran</h2>
            <p className="text-xs text-muted-foreground">7 hari terakhir</p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Total</p>
              <p className="font-numeric text-sm font-semibold text-primary-500">
                {hidden ? '••••' : formatRupiahCompact(weeklyActivity.reduce((s, d) => s + d.total, 0))}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Rata-rata</p>
              <p className="font-numeric text-sm font-semibold text-primary-500">
                {hidden ? '••••' : formatRupiahCompact(weeklyActivity.reduce((s, d) => s + d.total, 0) / 7)}
              </p>
            </div>
          </div>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivity} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="hari" {...chartAxisStyle} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip formatter={formatRupiahCompact} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#635bff" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Riwayat kekayaan */}
      <section className="card-premium p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Riwayat Kekayaan Bersih</h2>
          <Link href="/net-worth" className="text-xs font-medium text-primary-500 transition-colors hover:text-primary-600">
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
            <EmptyState
              icon={TrendingUp}
              title="Grafik belum tersedia"
              description="Simpan snapshot di halaman Kekayaan Bersih untuk melihat perkembangan."
              action={<Link href="/net-worth" className="btn-secondary text-xs">Buka Kekayaan Bersih</Link>}
            />
          )}
        </div>
      </section>

      {/* Target tabungan + transaksi terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
        <section className="lg:col-span-2 card-premium p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-success" />
              <h2 className="text-sm font-semibold text-foreground">Target Tabungan</h2>
            </div>
            <Link href="/tabungan" className="text-xs font-medium text-primary-500 transition-colors hover:text-primary-600">
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
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-base">{goal.icon || '🎯'}</span>
                      <p className="truncate text-sm font-medium text-foreground">{goal.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-numeric text-xs font-semibold" style={{ color: goal.color || '#635bff' }}>
                        {formatRupiahCompact(saved)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">dari {formatRupiahCompact(target)}</p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: goal.color || '#635bff' }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{pct.toFixed(0)}% terkumpul</p>
                </div>
              );
            }) : (
              <EmptyState
                icon={PiggyBank}
                title="Belum ada target tabungan"
                description="Tentukan tujuan menabung pertama Anda."
                action={<Link href="/tabungan" className="btn-secondary text-xs">Buat Target</Link>}
              />
            )}
          </div>
        </section>

        <section className="lg:col-span-3 card-premium p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Transaksi Terbaru</h2>
            <Link href="/arus-kas" className="flex items-center gap-0.5 text-xs font-medium text-primary-500 transition-colors hover:text-primary-600">
              Lihat Semua
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {transactions.length > 0 ? (
            <div className="space-y-1">
              {transactions.slice(0, 5).map((tx, i) => {
                const isIncome = tx.category === 'PENDAPATAN';
                return (
                  <div key={tx.id || i} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', isIncome ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                        {isIncome ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{tx.subcategory || tx.description || 'Transaksi'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(`${tx.transaction_date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <p className={cn('ml-3 shrink-0 font-numeric text-sm font-semibold', isIncome ? 'text-success' : 'text-danger')}>
                      {hidden ? 'Rp ••••••' : `${isIncome ? '+' : '−'}${formatRupiahCompact(tx.amount)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="Belum ada transaksi"
              description="Catat pemasukan atau pengeluaran pertama Anda."
              action={<button onClick={() => setRecordOpen(true)} className="btn-primary text-xs">Catat Sekarang</button>}
            />
          )}
        </section>
      </div>

      {/* CTA mobile — pengganti tombol header yang disembunyikan di layar kecil */}
      <Link
        href="/arus-kas?catat=1"
        className="btn-primary w-full touch-target md:hidden"
      >
        <Plus className="h-4 w-4" />
        Catat Transaksi
      </Link>

      <RecordTransactionSheet open={recordOpen} onClose={() => setRecordOpen(false)} onSaved={() => setRefreshKey((k) => k + 1)} />
    </div>
  );
}
