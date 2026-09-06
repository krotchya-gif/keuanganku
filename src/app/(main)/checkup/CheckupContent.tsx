'use client';

import { useState, useEffect } from 'react';
import { calculateFinancialCheckup, calculateNetWorth, calculateCashFlow, getDanaDarurat, excludeDuplicatedCashAssets, checkupRadarScore } from '@/shared';
import type { FinancialCheckupItem } from '@/shared';
import { formatRupiah, formatPercent, getStatusColor, getStatusLabel } from '@/lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchAssets } from '@/lib/queries/assets';
import { fetchDebts } from '@/lib/queries/debts';
import { fetchTransactions } from '@/lib/queries/transactions';
import { fetchAccounts } from '@/lib/queries/onboarding';
import { getMonthRange } from '@/lib/utils';
import { Loader2, AlertCircle, ShieldCheck, ShieldAlert, Activity } from 'lucide-react';
import { Skeleton, KPISkeleton, ChartSkeleton, ListSkeleton } from '@/components/ui/Skeleton';

export function CheckupContent() {
  const [loading, setLoading] = useState(true);
  const [checkupData, setCheckupData] = useState<FinancialCheckupItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        const { startDate, endDate } = getMonthRange(new Date().getFullYear(), new Date().getMonth() + 1);
        const [assets, debts, accounts, transactions] = await Promise.all([
          fetchAssets(userId),
          fetchDebts(userId),
          fetchAccounts(userId),
          fetchTransactions(userId, startDate, endDate),
        ]);

        const danaDarurat = getDanaDarurat(assets);
        const cashAccounts = accounts.filter((a) => a.type !== 'crypto');
        const nw = calculateNetWorth([...excludeDuplicatedCashAssets(assets, cashAccounts.length > 0), ...cashAccounts.map((a) => ({ ...a, category: 'kas_setara_kas' as const, amount: Number(a.balance) }))], debts);
        const cf = calculateCashFlow(transactions.map((t) => ({
          id: t.id, user_id: t.user_id, name: t.description ?? 'Transaksi',
          direction: t.transaction_type === 'income' || t.category === 'PENDAPATAN' ? 'masuk' : 'keluar',
          category: t.category === 'PENDAPATAN' ? 'pendapatan' : t.category === 'HUTANG' ? 'kewajiban_cicilan' : t.category === 'TABUNGAN_INVESTASI' ? 'masa_depan_investasi' : 'kebutuhan_sehari_hari',
          amount: Number(t.amount), is_recurring: false, created_at: t.created_at, updated_at: t.updated_at,
        })));

        const result = calculateFinancialCheckup({
          danaDarurat,
          pengeluaranBulanan: cf.totalKasKeluar,
          totalCicilan: cf.totalKewajiban,
          pendapatan: cf.totalKasMasuk,
          tabunganInvestasi: cf.totalMasaDepan,
          biayaHidup: cf.totalKebutuhan,
          totalAset: nw.totalAssets,
          totalUtang: nw.totalDebts,
        });

        setCheckupData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-3 sm:p-6 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <KPISkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartSkeleton />  
          <ListSkeleton items={6} />
        </div>
      </div>
    );
  }

  if (checkupData.length === 0) {
    return (
      <div className="flex flex-col h-64 items-center justify-center text-muted-foreground border border-dashed rounded-xl">
        <AlertCircle className="w-8 h-8 text-primary-500 mb-2 opacity-50" />
        <p className="font-medium">Belum ada data untuk dianalisa.</p>
        <p className="text-sm mt-1">Isi Kekayaan Bersih dan Kas Rutin Bulanan terlebih dahulu.</p>
      </div>
    );
  }

  const sehatCount = checkupData.filter((c) => c.status === 'sehat').length;

  const radarData = checkupData.map((item: FinancialCheckupItem) => ({
    subject: item.name.replace(/^Rasio\s/, '').replace(/\/ Pendapatan$/, ''),
    score: checkupRadarScore(item),
    fullMark: 100,
    status: item.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scorecard Keuangan"
        subtitle="Status 6 rasio kesehatan keuangan berdasarkan data aset dan arus kas Anda"
        icon={Activity}
        gradient="from-amber-500 to-orange-500"
        action={
          <div className={`card-premium px-5 py-3 text-center self-start border ${
            sehatCount >= 4 ? 'border-emerald-500/30 bg-emerald-500/10' : 
            sehatCount >= 2 ? 'border-amber-500/30 bg-amber-500/10' : 
            'border-red-500/30 bg-red-500/10'
          }`}>
            <div className="flex items-center gap-2 mb-1 justify-center">
              {sehatCount >= 4 ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : 
               sehatCount >= 2 ? <AlertCircle className="w-4 h-4 text-amber-500" /> : 
               <ShieldAlert className="w-4 h-4 text-red-500" />}
              <p className="text-2xl font-bold font-numeric" style={{ color: sehatCount >= 4 ? '#059669' : sehatCount >= 2 ? '#d97706' : '#dc2626' }}>
                {sehatCount}/6
              </p>
            </div>
            <p className="text-xs font-medium mt-0.5" style={{ color: sehatCount >= 4 ? '#059669' : sehatCount >= 2 ? '#d97706' : '#dc2626' }}>
              {sehatCount >= 4 ? 'Cukup Sehat' : sehatCount >= 2 ? 'Perlu Perhatian' : 'Kritis'}
            </p>
          </div>
        }
      />

      {/* Radar Chart */}
      <div className="card-premium p-4 sm:p-6 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl" />
        <h2 className="text-sm font-semibold text-foreground mb-4">Gambaran Umum Kesehatan Keuangan</h2>
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="78%">
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.4} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Skor"
                dataKey="score"
                stroke="#635bff"
                fill="#635bff"
                fillOpacity={0.2}
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#635bff', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#635bff' }}
              />
              <Tooltip
                formatter={(v, _name, props: any, index?: number) => {
                  const score = typeof v === 'number' ? v : Number(v ?? 0);
                  // recharts 3: data baris ada di props.payload (fallback ke argumen index)
                  const item = props?.payload ?? radarData[index ?? -1];
                  const status = item?.status || 'unknown';
                  const color = getStatusColor(status as 'sehat' | 'warning' | 'bahaya') || '#64748b';
                  const label = status === 'sehat' ? 'Sehat' : status === 'warning' ? 'Waspada' : status === 'bahaya' ? 'Bahaya' : '';
                  return [<span key="v" style={{ color }}>{score}/100</span>, label ? `Skor (${label})` : 'Skor'];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6 Rasio Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {checkupData.map((item: FinancialCheckupItem, idx: number) => {
          const color = getStatusColor(item.status);
          const isRupiahValue = item.name === 'Arus Kas';
          const isDarurat = item.name.includes('Dana Darurat');
          const isSolvabilitas = item.name.includes('Solvabilitas');

          let displayValue = '';
          if (isRupiahValue) {
            displayValue = `${item.value >= 0 ? '+' : ''}${formatRupiah(item.value)}`;
          } else if (isDarurat) {
            displayValue = `${item.value.toFixed(1)}x`;
          } else if (isSolvabilitas) {
            displayValue = `${Math.min(999, (item.value * 100)).toFixed(0)}%`;
          } else {
            displayValue = formatPercent(item.value);
          }

          return (
            <div
              key={item.name}
              className="card-premium p-4 sm:p-5 hover:border-primary-500/30 transition-all"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.formula}</p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2 shadow-sm whitespace-nowrap"
                  style={{ background: `${color}18`, color }}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>

              <p className="text-xl sm:text-2xl font-bold font-numeric mt-1" style={{ color }}>
                {displayValue}
              </p>

              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    background: color,
                    width: isRupiahValue ? (item.value > 0 ? '100%' : '5%') :
                      isDarurat ? `${Math.min(100, (item.value / 6) * 100)}%` :
                      isSolvabilitas ? `${Math.min(100, item.value * 100)}%` :
                      item.key === 'rasio_investasi' ? `${Math.min(100, (item.value / 0.2) * 100)}%` :
                      `${Math.min(100, item.value * 100)}%`,
                  }}
                />
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/60">
                <span className="text-xs text-muted-foreground">Target:</span>
                <span className="text-xs font-semibold text-foreground">{item.recommendation}</span>
              </div>

              {item.description && (
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed italic">
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
