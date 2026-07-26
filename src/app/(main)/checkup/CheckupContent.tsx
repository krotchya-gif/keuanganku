'use client';

import { useState, useEffect } from 'react';
import { calculateFinancialCheckup, getDanaDarurat } from '@/shared';
import { formatRupiah, formatPercent, getStatusColor, getStatusLabel } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { getCurrentUserId } from '@/lib/queries/users';
import { fetchAssets } from '@/lib/queries/assets';
import { fetchDebts } from '@/lib/queries/debts';
import { fetchCashflowItems } from '@/lib/queries/cashflow';
import { Loader2, AlertCircle, ShieldCheck, ShieldAlert, Activity } from 'lucide-react';
import { Skeleton, KPISkeleton, ChartSkeleton, ListSkeleton } from '@/components/ui/Skeleton';

const scoreColors: Record<string, string> = { sehat: '#3ecf8e', warning: '#f5a623', bahaya: '#ef4444' };

export function CheckupContent() {
  const [loading, setLoading] = useState(true);
  const [checkupData, setCheckupData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        const [assets, debts, cashflows] = await Promise.all([
          fetchAssets(userId),
          fetchDebts(userId),
          fetchCashflowItems(userId),
        ]);

        const danaDarurat = getDanaDarurat(assets);
        const totalAset = assets.reduce((s: number, a: any) => s + Number(a.amount), 0);
        const totalUtang = debts.reduce((s: number, d: any) => s + Number(d.total_amount), 0);
        const pendapatan = cashflows.filter((c: any) => c.direction === 'masuk').reduce((s: number, c: any) => s + Number(c.amount), 0);
        const pengeluaranBulanan = cashflows.filter((c: any) => c.direction === 'keluar').reduce((s: number, c: any) => s + Number(c.amount), 0);
        const totalCicilan = cashflows.filter((c: any) => c.category === 'kewajiban_cicilan').reduce((s: number, c: any) => s + Number(c.amount), 0);
        const tabunganInvestasi = cashflows.filter((c: any) => c.category === 'masa_depan_investasi').reduce((s: number, c: any) => s + Number(c.amount), 0);
        const biayaHidup = cashflows.filter((c: any) => c.category === 'kebutuhan_sehari_hari').reduce((s: number, c: any) => s + Number(c.amount), 0);

        const result = calculateFinancialCheckup({
          danaDarurat, pengeluaranBulanan, totalCicilan, pendapatan,
          tabunganInvestasi, biayaHidup, totalAset, totalUtang,
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
        <p className="text-sm mt-1">Isi Net Worth dan Arus Kas terlebih dahulu.</p>
      </div>
    );
  }

  const sehatCount = checkupData.filter((c: any) => c.status === 'sehat').length;

  const radarData = checkupData.map((item: any) => {
    let score = 0;
    if (item.name === 'Kecukupan Dana Darurat') {
      score = Math.min(100, (item.value / 6) * 100);
    } else if (item.name === 'Arus Kas') {
      score = item.value > 0 ? 100 : 20;
    } else if (item.name === 'Rasio Cicilan / Pendapatan') {
      score = (1 - Math.min(1, item.value / 0.5)) * 100;
    } else if (item.name === 'Rasio Investasi / Pendapatan') {
      score = Math.min(100, (item.value / 0.2) * 100);
    } else if (item.name === 'Rasio Biaya Hidup / Pendapatan') {
      score = (1 - Math.min(1, item.value / 0.8)) * 100;
    } else if (item.name === 'Rasio Solvabilitas') {
      score = Math.min(100, Math.min(item.value, 2) * 50);
    }

    return {
      subject: item.name.replace(/^Rasio\s/, '').replace(/\/ Pendapatan$/, ''),
      score: Math.round(score),
      fullMark: 100,
      status: item.status,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-glow">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Scorecard Keuangan</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                Status 6 rasio kesehatan keuangan berdasarkan data aset dan arus kas Anda
              </p>
            </div>
          </div>
        </div>
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
      </div>

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
                formatter={(v: number, _name: string, props: any) => {
                  const item = radarData[props.payloadIndex];
                  const status = item?.status || 'unknown';
                  const color = scoreColors[status] || '#64748b';
                  return [<span key="v" style={{ color }}>{v}/100 — {status === 'sehat' ? 'Sehat' : status === 'warning' ? 'Warning' : 'Bahaya'}</span>, 'Skor'];
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
        {checkupData.map((item: any, idx: number) => {
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
                      item.name.includes('Investasi') ? `${Math.min(100, (item.value / 0.2) * 100)}%` :
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
