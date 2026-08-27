'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { formatRupiah, formatRupiahCompact, formatPercent } from '@/lib/utils';
import { calculateKPR, calculateAdditionalCosts, calculateInstallmentRatio } from '@/shared';
import type { KPRResult } from '@/shared';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { chartGridStyle, chartAxisStyle, formatChartRupiah } from '@/components/charts/ChartTheme';
import { Calculator, Save, X, Bookmark, Loader2, Trash2, PlusCircle, Layers, Eye, Calendar, Home, Wallet, Percent, TrendingUp, AlertCircle } from 'lucide-react';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TableScroll } from '@/components/ui/TableScroll';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchKPRSimulations, type SavedSimulation } from '@/lib/queries/kpr';

const statusColors: Record<string, string> = { sehat: '#3ecf8e', warning: '#f5a623', bahaya: '#ef4444' };
const statusLabels: Record<string, string> = { sehat: '✅ Rasio Sehat', warning: '⚠️ Perlu Waspada', bahaya: '🔴 Tidak Sehat' };

const EMPTY_KPR_RESULT: KPRResult = {
  schedule: [],
  summary: {
    loanPrincipal: 0,
    totalPrincipalPaid: 0,
    totalInterestPaid: 0,
    totalPaid: 0,
    interestToPrincipalRatio: 0,
    minInstallment: 0,
    maxInstallment: 0,
    remainingAtFloating: 0,
  },
};

// Warna untuk masing-masing fase bunga
const PHASE_COLORS = [
  { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   badge: 'bg-blue-100 text-blue-700',   hex: '#3b82f6' },
  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  badge: 'bg-amber-100 text-amber-700',  hex: '#f59e0b' },
  { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', badge: 'bg-purple-100 text-purple-700', hex: '#a855f7' },
  { bg: 'bg-pink-500/10',   border: 'border-pink-500/20',   text: 'text-pink-400',   badge: 'bg-pink-100 text-pink-700',   hex: '#ec4899' },
  { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   text: 'text-cyan-400',   badge: 'bg-cyan-100 text-cyan-700',   hex: '#06b6d4' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', badge: 'bg-orange-100 text-orange-700', hex: '#f97316' },
];

function getPhaseStyling(phaseIndex: number | undefined, totalFloatingPhases: number) {
  if (phaseIndex === undefined) return PHASE_COLORS[0];
  if (phaseIndex === 0) return PHASE_COLORS[0]; // fix = biru
  if (phaseIndex <= totalFloatingPhases) return PHASE_COLORS[phaseIndex]; // transisi
  return PHASE_COLORS[5]; // floating akhir = oranye
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/60 last:border-0 gap-3">
      <span className="text-sm text-muted-foreground min-w-0 truncate">{label}</span>
      <span className={`text-sm font-numeric font-semibold shrink-0 whitespace-nowrap ${highlight ? 'text-primary-500' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

interface FloatingPhase {
  durationYears: number;
  rateAnnual: number;
}

// floating_phases bisa berupa JSONB (objek) atau teks JSON — tangani keduanya
function parseFloatingPhases(value: string | object | null | undefined): FloatingPhase[] | null {
  if (!value) return null;
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (Array.isArray(parsed)) {
    const valid = parsed.filter(
      (p): p is FloatingPhase =>
        typeof p === 'object' && p !== null &&
        typeof (p as FloatingPhase).durationYears === 'number' &&
        typeof (p as FloatingPhase).rateAnnual === 'number'
    );
    return valid.length > 0 ? valid : null;
  }
  return null;
}

export function KPRContent() {
  const [form, setForm] = useState({
    propertyPrice: 900_000_000,
    downPayment: 100_000_000,
    loanPeriodYears: 15,
    fixedRateAnnual: 0.0347,
    fixedPeriodYears: 4,
    floatingRateAnnual: 0.1299,
    monthlyIncome: 30_000_000,
    npoptkp: 75_000_000,
    ppnDiscount: 1.0,
    ajbRate: 0.01,
    bbnRate: 0.02,
    notaryFee: 5_000_000,
    bankFee1: 0,
    bankFee2: 0,
    bankFee3: 0,
  });

  // State bunga berjenjang
  const [berjenjang, setBerjenjang] = useState(false);
  const [floatingPhases, setFloatingPhases] = useState<FloatingPhase[]>([
    { durationYears: 2, rateAnnual: 0.08 },
  ]);

  const [tab, setTab] = useState<'ringkasan' | 'amortisasi' | 'biaya'>('ringkasan');
  const [showAllRows, setShowAllRows] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 24;

  // DB States
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [simulations, setSimulations] = useState<SavedSimulation[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSim, setSelectedSim] = useState<SavedSimulation | null>(null);
  const [simName, setSimName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchSimulations = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await getCurrentUserId();
      if (!userId) return;
      setUserId(userId);

      const data = await fetchKPRSimulations(userId);
      setSimulations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const loadSimulation = (sim: SavedSimulation) => {
    setForm({
      propertyPrice: Number(sim.property_price),
      downPayment: Number(sim.down_payment),
      loanPeriodYears: Number(sim.loan_period_years),
      fixedRateAnnual: Number(sim.fixed_rate),
      fixedPeriodYears: Number(sim.fixed_period_years),
      floatingRateAnnual: Number(sim.floating_rate),
      monthlyIncome: Number(sim.monthly_income),
      npoptkp: Number(sim.npoptkp),
      ppnDiscount: Number(sim.ppn_discount),
      ajbRate: Number(sim.ajb_rate),
      bbnRate: Number(sim.bbn_rate),
      notaryFee: Number(sim.notary_fee),
      bankFee1: Number(sim.bank_fee_1),
      bankFee2: Number(sim.bank_fee_2),
      bankFee3: Number(sim.bank_fee_3),
    });
    // Load bunga berjenjang jika ada (guard: JSONB object ATAU teks JSON)
    const phases = parseFloatingPhases(sim.floating_phases);
    if (phases) {
      setBerjenjang(true);
      setFloatingPhases(phases);
    } else {
      setBerjenjang(false);
    }
  };

  const saveSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim()) return;
    if (calcError) return;
    setIsSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('kpr_simulations').insert({
        user_id: userId,
        name: simName,
        property_price: form.propertyPrice,
        down_payment: form.downPayment,
        loan_principal: form.propertyPrice - form.downPayment,
        loan_period_years: form.loanPeriodYears,
        fixed_rate: form.fixedRateAnnual,
        fixed_period_years: form.fixedPeriodYears,
        floating_rate: form.floatingRateAnnual,
        floating_period_years: form.loanPeriodYears - form.fixedPeriodYears,
        monthly_income: form.monthlyIncome,
        npoptkp: form.npoptkp,
        ppn_discount: form.ppnDiscount,
        ajb_rate: form.ajbRate,
        bbn_rate: form.bbnRate,
        notary_fee: form.notaryFee,
        bank_fee_1: form.bankFee1,
        bank_fee_2: form.bankFee2,
        bank_fee_3: form.bankFee3,
        floating_phases: berjenjang ? JSON.stringify(floatingPhases) : null,
        // Save calculated results
        monthly_installment_min: kprResult.summary.minInstallment,
        monthly_installment_max: kprResult.summary.maxInstallment,
        total_interest: kprResult.summary.totalInterestPaid,
        remaining_principal_at_floating: kprResult.summary.remainingAtFloating,
      });
      setShowSaveModal(false);
      setSimName('');
      fetchSimulations();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSimulation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus simulasi ini?')) return;
    try {
      const supabase = createClient();
      await supabase.from('kpr_simulations').delete().eq('id', id);
      fetchSimulations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = useCallback((field: string, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Handlers bunga berjenjang
  const addPhase = () => {
    if (floatingPhases.length >= 5) return;
    setFloatingPhases(prev => [...prev, { durationYears: 1, rateAnnual: 0.09 }]);
  };

  const removePhase = (idx: number) => {
    setFloatingPhases(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePhase = (idx: number, field: keyof FloatingPhase, value: number) => {
    setFloatingPhases(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  // Validasi total durasi fase berjenjang
  const totalTransitionYears = floatingPhases.reduce((s, p) => s + p.durationYears, 0);
  const remainingFloatingYears = form.loanPeriodYears - form.fixedPeriodYears - totalTransitionYears;
  const isDurationValid = remainingFloatingYears >= 0;

  const { kprResult, calcError } = useMemo(() => {
    try {
      const result = calculateKPR({
        propertyPrice: form.propertyPrice,
        downPayment: form.downPayment,
        loanPeriodYears: form.loanPeriodYears,
        fixedRateAnnual: form.fixedRateAnnual,
        fixedPeriodYears: form.fixedPeriodYears,
        floatingRateAnnual: form.floatingRateAnnual,
        floatingPhases: berjenjang ? floatingPhases : [],
      });
      return { kprResult: result, calcError: null as string | null };
    } catch (err) {
      return {
        kprResult: EMPTY_KPR_RESULT,
        calcError: err instanceof Error ? err.message : 'Input simulasi tidak valid.',
      };
    }
  }, [form, berjenjang, floatingPhases]);

  const additionalCosts = calculateAdditionalCosts({
    propertyPrice: form.propertyPrice,
    npoptkp: form.npoptkp,
    ppnDiscount: form.ppnDiscount,
    ajbRate: form.ajbRate,
    bbnRate: form.bbnRate,
    notaryFee: form.notaryFee,
    bankFee1: form.bankFee1,
    bankFee2: form.bankFee2,
    bankFee3: form.bankFee3,
  });

  const ratioResult = calculateInstallmentRatio(
    kprResult.summary.minInstallment,
    kprResult.summary.maxInstallment,
    form.monthlyIncome
  );

  const chartData = kprResult.schedule
    .filter((_, i) => i % 12 === 0)
    .map((row, i) => ({
      tahun: `Th ${i + 1}`,
      pokok: Math.round(row.principalPayment * 12),
      bunga: Math.round(row.interestPayment * 12),
      saldo: Math.round(row.endingBalance),
    }));

  const totalRows = kprResult.schedule.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const displayRows = showAllRows
    ? kprResult.schedule
    : kprResult.schedule.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const pageStart = totalRows === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const pageEnd = Math.min(safePage * PER_PAGE, totalRows);

  // Buat legenda fase unik untuk ditampilkan di header tabel amortisasi
  const uniquePhases = Array.from(
    new Map(kprResult.schedule.map(r => [r.phaseIndex, r.phaseLabel])).entries()
  ).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));

  if (loading) {
    return (
      <div className="space-y-6 p-3 sm:p-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><CardSkeleton /></div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulasi KPR"
        subtitle="Hitung cicilan, amortisasi, dan biaya-biaya KPR secara lengkap"
        icon={Home}
        gradient="from-sky-500 to-blue-600"
        action={
          <button
            onClick={() => setShowSaveModal(true)}
            className="btn-primary"
          >
            <Save className="w-4 h-4" /> Simpan Simulasi
          </button>
        }
      />

      {/* Saved Simulations Bar */}
      {simulations.length > 0 && (
        <div className="card-premium p-4 flex gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2 border-r border-border shrink-0">
            <Bookmark className="w-4 h-4" /> Tersimpan
          </div>
          {simulations.map(sim => (
            <div
              key={sim.id}
              onClick={() => loadSimulation(sim)}
              className="flex items-center justify-between gap-3 shrink-0 bg-muted/50 hover:bg-muted border border-border px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors group"
            >
              <div>
                <span className="font-medium">{sim.name}</span>
                <span className="text-xs text-muted-foreground block font-numeric">{formatRupiahCompact(Number(sim.property_price))}</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedSim(sim); setShowDetailModal(true); }}
                  className="p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-blue-500 transition-opacity touch-target"
                  title="Lihat detail"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => deleteSimulation(sim.id, e)} className="p-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500 transition-opacity touch-target">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── LEFT: Input Form ── */}
        <div className="col-span-1 space-y-4">
          <div className="card-premium p-5">
            <h2 className="text-xl font-bold text-foreground mb-5 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-foreground" /> Data KPR
            </h2>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setBerjenjang(false)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all border ${
                  !berjenjang
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                }`}
              >
                Single Float
              </button>
              <button
                onClick={() => setBerjenjang(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all border ${
                  berjenjang
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600'
                    : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                }`}
              >
                <Layers className="w-4 h-4" /> Berjenjang
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Harga Properti (Rp)</label>
                <input
                  type="number"
                  value={form.propertyPrice || ''}
                  onChange={(e) => handleChange('propertyPrice', parseFloat(e.target.value) || 0)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Uang Muka / DP (Rp)</label>
                <input
                  type="number"
                  value={form.downPayment || ''}
                  onChange={(e) => handleChange('downPayment', parseFloat(e.target.value) || 0)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {(form.propertyPrice > 0 ? ((form.downPayment / form.propertyPrice) * 100).toFixed(1) : 0)}% dari harga properti
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Periode KPR (Tahun)</label>
                <input
                  type="number"
                  value={form.loanPeriodYears || ''}
                  onChange={(e) => handleChange('loanPeriodYears', parseFloat(e.target.value) || 0)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="h-px bg-border/60 my-2" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Bunga Fix p.a (%)</label>
                  <input
                    type="number"
                    value={form.fixedRateAnnual ? parseFloat((form.fixedRateAnnual * 100).toFixed(2)) : ''}
                    onChange={(e) => handleChange('fixedRateAnnual', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Periode Fix (Thn)</label>
                  <input
                    type="number"
                    value={form.fixedPeriodYears || ''}
                    onChange={(e) => handleChange('fixedPeriodYears', parseFloat(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {!berjenjang && (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Bunga Floating Cap p.a (%)</label>
                  <input
                    type="number"
                    value={form.floatingRateAnnual ? parseFloat((form.floatingRateAnnual * 100).toFixed(2)) : ''}
                    onChange={(e) => handleChange('floatingRateAnnual', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div className="h-px bg-border/60 my-2" />

              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Pendapatan Bulanan (Rp)</label>
                <input
                  type="number"
                  value={form.monthlyIncome || ''}
                  onChange={(e) => handleChange('monthlyIncome', parseFloat(e.target.value) || 0)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* ── BUNGA BERJENJANG CONFIGURATION ── */}
          {berjenjang && (
            <div className="card-premium p-5">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center justify-between">
                <span>Fase Bunga Transisi</span>
                <span className="text-[10px] font-semibold bg-primary-500/15 text-primary-500 px-2 py-0.5 rounded-full">
                  {floatingPhases.length} Fase
                </span>
              </h2>

              <div className="space-y-4 tracking-tight">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Durasi transisi total tidak boleh melebihi sisa tenor ({form.loanPeriodYears - form.fixedPeriodYears} tahun).
                </p>

                {/* Visualisasi timeline */}
                <div className="flex items-center gap-0.5 h-6 rounded-md overflow-hidden text-[10px] font-bold">
                  {(() => {
                    const tenorYears = Math.max(1, form.loanPeriodYears);
                    return (
                      <>
                        <div
                          className="flex items-center justify-center bg-blue-500 text-white overflow-hidden shrink-0 h-full"
                          style={{ width: `${(form.fixedPeriodYears / tenorYears) * 100}%`, minWidth: 4 }}
                          title={`Fix: ${form.fixedPeriodYears}th`}
                        >
                          {form.fixedPeriodYears >= 1 ? `${form.fixedPeriodYears}t` : ''}
                        </div>
                        {floatingPhases.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-center text-white overflow-hidden shrink-0 h-full"
                            style={{ width: `${(p.durationYears / tenorYears) * 100}%`, minWidth: 4, background: PHASE_COLORS[i + 1]?.hex ?? '#a855f7' }}
                            title={`Transisi ${i + 1}: ${p.durationYears}th`}
                          >
                            {p.durationYears >= 1 ? `${p.durationYears}t` : ''}
                          </div>
                        ))}
                        {remainingFloatingYears > 0 && (
                          <div
                            className="flex items-center justify-center bg-orange-500 text-white overflow-hidden shrink-0 h-full"
                            style={{ width: `${(remainingFloatingYears / tenorYears) * 100}%`, minWidth: 4 }}
                            title={`Floating: ${remainingFloatingYears}th`}
                          >
                            {remainingFloatingYears >= 1 ? `${remainingFloatingYears}t` : ''}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {!isDurationValid && (
                  <p className="text-xs text-red-500 font-medium py-1.5 px-3 bg-red-500/10 rounded-lg">
                    ⚠️ Total durasi fase ({totalTransitionYears}th) melebihi sisa tenor ({form.loanPeriodYears - form.fixedPeriodYears}th). Kurangi durasi transisi.
                  </p>
                )}

                {floatingPhases.map((phase, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3.5 space-y-3 ${PHASE_COLORS[idx + 1]?.bg} ${PHASE_COLORS[idx + 1]?.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${PHASE_COLORS[idx + 1]?.text}`}>
                        Transisi {idx + 1}
                      </span>
                      <button
                        onClick={() => removePhase(idx)}
                        className="text-muted-foreground hover:text-red-500 transition-colors bg-background rounded-full p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Durasi (tahun)</label>
                        <input
                          type="number"
                          min={1}
                          max={form.loanPeriodYears}
                          value={phase.durationYears || ''}
                          onChange={e => updatePhase(idx, 'durationYears', Number(e.target.value) || 1)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-numeric focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Bunga /tahun (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={phase.rateAnnual ? parseFloat((phase.rateAnnual * 100).toFixed(2)) : ''}
                          onChange={e => updatePhase(idx, 'rateAnnual', (parseFloat(e.target.value) || 0) / 100)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-numeric focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {floatingPhases.length < 5 && isDurationValid && remainingFloatingYears > 0 && (
                  <button
                    onClick={addPhase}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-primary-500 border border-dashed border-primary-500/40 rounded-xl hover:bg-primary-500/5 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tambah Fase Transisi
                  </button>
                )}

                <div className="pt-2">
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Bunga Floating Akhir p.a (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={form.floatingRateAnnual ? parseFloat((form.floatingRateAnnual * 100).toFixed(2)) : ''}
                      onChange={(e) => handleChange('floatingRateAnnual', (parseFloat(e.target.value) || 0) / 100)}
                      className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground font-numeric focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="text-[10px] text-muted-foreground bg-muted/60 px-3 py-2 rounded-lg border border-border shrink-0">
                      Sisa: {Math.max(0, remainingFloatingYears)} thn
                    </div>
                  </div>
                </div>

                {/* Ringkasan fase */}
                <div className="text-xs text-muted-foreground pt-3 space-y-1.5 border-t border-border/60">
                  <div className="flex justify-between"><span>Fix ({form.fixedPeriodYears} thn)</span><span className="font-numeric font-semibold">{formatPercent(form.fixedRateAnnual)}</span></div>
                  {floatingPhases.map((p, i) => (
                    <div key={i} className="flex justify-between">
                      <span>Transisi {i + 1} ({p.durationYears} thn)</span>
                      <span className="font-numeric font-semibold">{formatPercent(p.rateAnnual)}</span>
                    </div>
                  ))}
                  {remainingFloatingYears > 0 && (
                    <div className="flex justify-between"><span>Floating ({remainingFloatingYears} thn)</span><span className="font-numeric font-semibold">{formatPercent(form.floatingRateAnnual)}</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rasio Cicilan */}
          <div className="card-premium p-5">
            <h2 className="text-sm font-semibold text-foreground mb-3">Rasio Cicilan / Gaji</h2>
            <div
              className="p-3 rounded-lg text-sm font-medium mb-3 border"
              style={{ background: statusColors[ratioResult.status] + '10', color: statusColors[ratioResult.status], borderColor: statusColors[ratioResult.status] + '30' }}
            >
              {statusLabels[ratioResult.status]}
            </div>
            <InfoRow label="Cicilan Min (fix)" value={formatRupiah(kprResult.summary.minInstallment)} />
            <InfoRow label="Cicilan Maks" value={formatRupiah(kprResult.summary.maxInstallment)} />
            <InfoRow label="Rasio Min (vs Gaji)" value={formatPercent(ratioResult.minRatio)} />
            <InfoRow label="Rasio Maks (vs Gaji)" value={formatPercent(ratioResult.maxRatio)} />
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed p-3 bg-muted/50 rounded-lg">{ratioResult.conclusion}</p>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Pinjaman Pokok', value: formatRupiahCompact(kprResult.summary.loanPrincipal), color: 'text-primary-500' },
              { label: 'Total Bunga Dibayar', value: formatRupiahCompact(kprResult.summary.totalInterestPaid), color: 'text-red-500' },
              { label: 'Total Uang Dikeluarkan', value: formatRupiahCompact(kprResult.summary.totalPaid + additionalCosts.total), color: 'text-foreground' },
            ].map((kpi) => (
              <div key={kpi.label} className="card-premium p-3 sm:p-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className={`text-sm sm:text-lg font-bold font-numeric mt-1 ${kpi.color} truncate`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="card-premium">
            {calcError && (
              <div className="mx-5 mt-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{calcError} Sesuaikan input di form simulasi.</p>
              </div>
            )}
            <div className="flex border-b border-border">
              {[
                { key: 'ringkasan', label: '📊 Ringkasan' },
                { key: 'amortisasi', label: '📋 Tabel Amortisasi' },
                { key: 'biaya', label: '💰 Biaya Tambahan (Siluman)' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as typeof tab)}
                  className={`px-5 py-3 text-sm font-medium transition-colors ${tab === t.key ? 'text-primary-500 border-b-2 border-primary-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'ringkasan' && (
                <div className="space-y-4">
                  {/* Area chart */}
                  <div className="h-48 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="pokokGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="bungaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...chartGridStyle} />
                        <XAxis dataKey="tahun" {...chartAxisStyle} />
                        <YAxis tickFormatter={formatChartRupiah} width={90} {...chartAxisStyle} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area name="Pokok" type="monotone" dataKey="pokok" stroke="#3ecf8e" fill="url(#pokokGrad)" strokeWidth={2} />
                        <Area name="Bunga" type="monotone" dataKey="bunga" stroke="#ef4444" fill="url(#bungaGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <InfoRow label="Biaya Booking Fee / Uang Muka (DP)" value={formatRupiah(form.downPayment)} />
                  <InfoRow label="Pokok Pinjaman KPR" value={formatRupiah(kprResult.summary.loanPrincipal)} />
                  <InfoRow label="Total Bunga (Selama Tenor)" value={formatRupiah(kprResult.summary.totalInterestPaid)} />
                  <InfoRow label="Rasio Bunga terhadap Pokok" value={formatPercent(kprResult.summary.interestToPrincipalRatio)} highlight />
                  <InfoRow label={`Sisa Pokok Saat Bunga Floating (Setelah Tahun ke-${form.fixedPeriodYears})`} value={formatRupiah(kprResult.summary.remainingAtFloating)} />
                  <InfoRow label="Total Biaya Siluman (Notaris, Pajak, dll)" value={formatRupiah(additionalCosts.total)} />
                  <div className="bg-primary-500/5 p-3 rounded-lg border border-primary-500/10 mt-4">
                    <InfoRow label="Modal Awal Yang Harus Disiapkan (DP + Biaya Tambahan)" value={formatRupiah(form.downPayment + additionalCosts.total)} highlight />
                  </div>

                  {/* Ringkasan fase berjenjang */}
                  {berjenjang && (
                    <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-primary-500" /> Struktur Bunga Berjenjang</p>
                      <div className="space-y-1">
                        {uniquePhases.map(([idx, label]) => {
                          const style = getPhaseStyling(idx ?? 0, floatingPhases.length);
                          const count = kprResult.schedule.filter(r => r.phaseIndex === idx).length;
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className={`inline-flex items-center gap-1 font-medium ${style.text}`}>
                                <span className={`w-2 h-2 rounded-full`} style={{ background: PHASE_COLORS[Math.min((idx ?? 0), PHASE_COLORS.length - 1)]?.hex }} />
                                {label}
                              </span>
                              <span className="text-muted-foreground">{count} bulan</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'amortisasi' && (
                <div>
                  {/* Legenda fase */}
                  {berjenjang && uniquePhases.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {uniquePhases.map(([idx, label]) => {
                        const phaseIdx = idx ?? 0;
                        const colorIdx = Math.min(phaseIdx, PHASE_COLORS.length - 1);
                        return (
                          <span key={idx} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PHASE_COLORS[colorIdx].badge}`}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <TableScroll minWidth={760}>
                  <table className="w-full text-xs box-border">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['Bln', 'Tanggal', 'Saldo Awal', 'Angsuran Pokok', 'Angsuran Bunga', 'Total Cicilan', 'Sisa Pokok'].map((h) => (
                          <th key={h} className="text-left py-2 px-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.map((row) => {
                        const phaseIdx = row.phaseIndex ?? 0;
                        const colorIdx = Math.min(phaseIdx, PHASE_COLORS.length - 1);
                        const isFixed = phaseIdx === 0;
                        const rowBg = isFixed ? '' : `${PHASE_COLORS[colorIdx].bg}`;
                        return (
                          <tr key={row.period} className={`border-b border-border/40 hover:brightness-95 ${rowBg}`}>
                            <td className="py-2.5 px-2 font-numeric whitespace-nowrap">{row.period}</td>
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              {row.date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}
                              {!isFixed && row.phaseLabel && (
                                <span className={`ml-1 text-[9px] px-1 py-0.5 rounded font-semibold ${PHASE_COLORS[colorIdx].badge}`}>
                                  {row.phaseLabel?.split(' ')[0] === 'Transisi' ? row.phaseLabel?.split('(')[0].trim() : 'Float'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 font-numeric whitespace-nowrap">{formatRupiahCompact(row.beginningBalance)}</td>
                            <td className="py-2.5 px-2 font-numeric text-emerald-600 whitespace-nowrap">{formatRupiahCompact(row.principalPayment)}</td>
                            <td className="py-2.5 px-2 font-numeric text-red-500 whitespace-nowrap">{formatRupiahCompact(row.interestPayment)}</td>
                            <td className="py-2.5 px-2 font-numeric font-semibold text-primary-600 whitespace-nowrap">{formatRupiahCompact(row.totalPayment)}</td>
                            <td className="py-2.5 px-2 font-numeric font-medium whitespace-nowrap">{formatRupiahCompact(row.endingBalance)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </TableScroll>
                  {totalRows > PER_PAGE && (
                    showAllRows ? (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => { setShowAllRows(false); setPage(1); }}
                          className="text-xs bg-muted/50 font-medium text-primary-500 hover:text-primary-600 py-2.5 px-4 rounded-lg transition-colors"
                        >
                          ← Kembali ke tampilan per halaman
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground font-numeric">
                          Menampilkan {pageStart}–{pageEnd} dari {totalRows} bulan
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                            className="btn-secondary !py-2 !px-3 text-xs disabled:opacity-40"
                          >
                            ← Sebelumnya
                          </button>
                          <span className="text-xs text-muted-foreground font-numeric">
                            {safePage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                            className="btn-secondary !py-2 !px-3 text-xs disabled:opacity-40"
                          >
                            Berikutnya →
                          </button>
                          <button
                            onClick={() => setShowAllRows(true)}
                            className="text-xs bg-muted/50 font-medium text-primary-500 hover:text-primary-600 py-2 px-3 rounded-lg transition-colors"
                          >
                            Tampilkan Semua
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {tab === 'biaya' && (
                <div className="space-y-0">
                  {[
                    { label: 'BPHTB (5% × NPOPKP)', value: additionalCosts.bphtb, note: `NPOPTKP = ${formatRupiahCompact(form.npoptkp)} | Pajak untuk pembeli properti` },
                    { label: 'PPN', value: additionalCosts.ppn, note: `11% dari harga properti | Diskon = ${formatPercent(form.ppnDiscount)}` },
                    { label: 'AJB', value: additionalCosts.ajb, note: `${formatPercent(form.ajbRate)} dari harga | Akta Jual Beli Pejabat PPAT` },
                    { label: 'BBN', value: additionalCosts.bbn, note: `${formatPercent(form.bbnRate)} dari harga | Biaya Balik Nama Sertifikat` },
                    { label: 'Jasa Notaris', value: additionalCosts.notaryFee, note: 'Estimasi biaya notaris (dapat diubah di form)' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-3.5 border-b border-border/60">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                      </div>
                      <p className="text-sm font-numeric font-semibold text-foreground bg-muted/50 px-2 py-1 rounded">{formatRupiah(item.value)}</p>
                    </div>
                  ))}

                  {/* Additional Modifiable Bank Fees Form Inputs shown directly inline for convenience */}
                  <div className="pt-6 pb-2">
                    <p className="text-sm font-semibold mb-3">Biaya Bank & Appraisal (Input Manual)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Biaya Provisi/Admin</label>
                        <input type="number" value={form.bankFee1 || ''} onChange={e => handleChange('bankFee1', parseFloat(e.target.value) || 0)} className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-numeric focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Asuransi Jiwa</label>
                        <input type="number" value={form.bankFee2 || ''} onChange={e => handleChange('bankFee2', parseFloat(e.target.value) || 0)} className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-numeric focus:outline-none focus:border-primary-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">Asuransi Kebakaran</label>
                        <input type="number" value={form.bankFee3 || ''} onChange={e => handleChange('bankFee3', parseFloat(e.target.value) || 0)} className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs font-numeric focus:outline-none focus:border-primary-500" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-4 bg-primary-500/10 px-4 rounded-xl mt-4 border border-primary-500/20">
                    <div>
                      <p className="text-sm font-bold text-foreground">TOTAL BIAYA SILUMAN</p>
                      <p className="text-xs text-muted-foreground">Harus dibayar cash di luar DP KPR</p>
                    </div>
                    <p className="text-xl font-bold font-numeric text-primary-600">{formatRupiah(additionalCosts.total)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <BottomSheet open={showDetailModal && !!selectedSim} onClose={() => setShowDetailModal(false)} title={selectedSim?.name} maxWidth="sm:max-w-lg">
        {selectedSim && (
          <div className="space-y-5">
              {/* Tanggal */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                <Calendar className="w-3.5 h-3.5" />
                Dibuat: {new Date(selectedSim.created_at).toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

              {/* Data Properti */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-500" /> Data Properti
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Harga Properti" value={formatRupiah(Number(selectedSim.property_price))} />
                  <InfoRow label="Uang Muka (DP)" value={formatRupiah(Number(selectedSim.down_payment))} />
                  <InfoRow label="Pokok Pinjaman" value={formatRupiah(Number(selectedSim.loan_principal))} />
                  <InfoRow label="Tenor" value={`${selectedSim.loan_period_years} tahun`} />
                </div>
              </div>

              {/* Struktur Bunga */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4 text-purple-500" /> Struktur Bunga
                </h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fix ({selectedSim.fixed_period_years} thn)</span>
                    <span className="font-numeric font-medium">{(Number(selectedSim.fixed_rate) * 100).toFixed(2)}%</span>
                  </div>
                  {selectedSim.floating_phases && (() => {
                    const phases = parseFloatingPhases(selectedSim.floating_phases);
                    if (phases) {
                      return phases.map((p, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Transisi {i + 1} ({p.durationYears} thn)</span>
                          <span className="font-numeric font-medium">{(p.rateAnnual * 100).toFixed(2)}%</span>
                        </div>
                      ));
                    }
                    return null;
                  })()}
                  <div className="flex justify-between text-sm pt-2 border-t border-border/60">
                    <span className="text-muted-foreground">Floating ({selectedSim.floating_period_years || (selectedSim.loan_period_years - selectedSim.fixed_period_years)} thn)</span>
                    <span className="font-numeric font-medium">{(Number(selectedSim.floating_rate) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Hasil Perhitungan */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" /> Hasil Perhitungan
                </h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cicilan Min (Fix)</span>
                    <span className="font-numeric font-medium text-green-600">{formatRupiah(Number(selectedSim.monthly_installment_min || 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cicilan Max (Float)</span>
                    <span className="font-numeric font-medium text-amber-600">{formatRupiah(Number(selectedSim.monthly_installment_max || 0))}</span>
                  </div>
                  {selectedSim.total_interest && (
                    <div className="flex justify-between text-sm pt-2 border-t border-border/60">
                      <span className="text-muted-foreground">Total Bunga</span>
                      <span className="font-numeric font-medium text-red-500">{formatRupiah(Number(selectedSim.total_interest))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pendapatan */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-cyan-500" /> Analisis Pendapatan
                </h4>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pendapatan Bulanan</span>
                    <span className="font-numeric font-medium">{formatRupiah(Number(selectedSim.monthly_income || 0))}</span>
                  </div>
                  {Number(selectedSim.monthly_income || 0) > 0 && Number(selectedSim.monthly_installment_min || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rasio Min</span>
                        <span className="font-numeric font-medium">{((Number(selectedSim.monthly_installment_min) / Number(selectedSim.monthly_income)) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rasio Max</span>
                        <span className="font-numeric font-medium">{((Number(selectedSim.monthly_installment_max || selectedSim.monthly_installment_min) / Number(selectedSim.monthly_income)) * 100).toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-2 border-t border-border">
                <button 
                  onClick={() => { loadSimulation(selectedSim); setShowDetailModal(false); }}
                  className="btn-primary flex-1"
                >
                  <Calculator className="w-4 h-4" /> Load ke Form
                </button>
                <button 
                  onClick={(e) => { deleteSimulation(selectedSim.id, e); setShowDetailModal(false); }}
                  className="px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              </div>
            </div>
        )}
      </BottomSheet>

      {/* Save Modal */}
      <BottomSheet open={showSaveModal} onClose={() => setShowSaveModal(false)} title="Simpan Simulasi KPR">
        <form onSubmit={saveSimulation} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Nama Simulasi</label>
            <input required autoFocus value={simName} onChange={e => setSimName(e.target.value)} type="text" className="input-field" placeholder="e.g. Cluster Bintaro Jaya" />
          </div>
          {berjenjang && (
            <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              Simulasi akan disimpan dengan <strong>{floatingPhases.length} fase bunga berjenjang</strong>.
            </p>
          )}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowSaveModal(false)} className="btn-secondary">Batal</button>
            <button disabled={isSaving} type="submit" className="btn-primary">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}
