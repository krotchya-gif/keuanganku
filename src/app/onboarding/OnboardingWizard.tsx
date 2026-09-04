'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Loader2, Wallet } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { getOnboardingProfile, saveOnboardingProgress, finishOnboarding, createOnboardingAccount, createOnboardingAsset, createOnboardingDebt, createOnboardingCashflow } from '@/lib/queries/onboarding';
import type { AccountType, AssetCategory, CashflowCategory, DebtTerm } from '@/shared';

const steps = ['Rekening', 'Aset', 'Utang', 'Pendapatan', 'Pengeluaran', 'Prioritas'];
const priorities = ['Dana darurat', 'Kontrol pengeluaran', 'Menabung', 'Investasi', 'Membeli rumah', 'Melunasi utang'];
const input = 'w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/35';

export function OnboardingWizard() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prioritiesSelected, setPrioritiesSelected] = useState<string[]>([]);
  const [data, setData] = useState({ name: '', type: 'bank' as AccountType, amount: '', category: 'kas_setara_kas' as AssetCategory, term: 'jangka_panjang' as DebtTerm, monthly: '', direction: 'masuk' as 'masuk' | 'keluar', flowCategory: 'pendapatan' as CashflowCategory });

  useEffect(() => { (async () => { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.replace('/login'); return; } setUserId(user.id); const p = await getOnboardingProfile(user.id); setStep(Math.min(6, p.step)); setPrioritiesSelected(p.priorities); })(); }, [router]);
  const set = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));
  const togglePriority = (value: string) => setPrioritiesSelected((p) => p.includes(value) ? p.filter((x) => x !== value) : [...p, value]);

  async function next() {
    setBusy(true); setError('');
    try {
      const amount = Number(data.amount || 0);
      if ([1, 2, 3, 4, 5].includes(step) && data.name.trim() && amount < 0) throw new Error('Nominal tidak boleh negatif.');
      if (step === 1 && data.name.trim()) await createOnboardingAccount(userId, { name: data.name, type: data.type, balance: amount });
      if (step === 2 && data.name.trim()) await createOnboardingAsset(userId, { name: data.name, category: data.category, amount });
      if (step === 3 && data.name.trim()) await createOnboardingDebt(userId, { name: data.name, term: data.term, total_amount: amount, monthly_payment: Number(data.monthly || 0) });
      if (step === 4 && data.name.trim()) await createOnboardingCashflow(userId, { name: data.name, direction: 'masuk', category: 'pendapatan', amount });
      if (step === 5 && data.name.trim()) await createOnboardingCashflow(userId, { name: data.name, direction: 'keluar', category: data.flowCategory === 'pendapatan' ? 'kebutuhan_sehari_hari' : data.flowCategory, amount });
      if (step === 6) { await finishOnboarding(userId, 'completed', prioritiesSelected); router.replace('/dashboard'); return; }
      const nextStep = step + 1; await saveOnboardingProgress(userId, nextStep, prioritiesSelected); setStep(nextStep); setData((d) => ({ ...d, name: '', amount: '', monthly: '' }));
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan data.'); } finally { setBusy(false); }
  }
  async function skip() { setBusy(true); try { await finishOnboarding(userId, 'skipped', prioritiesSelected); router.replace('/dashboard'); } catch { setError('Gagal melewati onboarding.'); } finally { setBusy(false); } }

  const title = ['Saldo rekening awal', 'Aset yang dimiliki', 'Utang atau liabilitas', 'Pendapatan rutin', 'Pengeluaran rutin', 'Prioritas keuangan'][step - 1];
  return <AuthShell><div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center"><Wallet className="w-5 h-5 text-white" /></div><div><h2 className="text-xl font-bold">Setup keuangan awal</h2><p className="text-xs text-muted-foreground">Langkah {step} dari 6 · {title}</p></div></div><div className="flex gap-1.5 mb-6">{steps.map((s, i) => <div key={s} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? 'bg-primary-500' : 'bg-muted'}`} />)}</div>
    <div className="space-y-4 min-h-56">{step < 6 ? <><div><label className="block text-sm font-medium mb-1.5">{step === 1 ? 'Nama rekening' : step === 2 ? 'Nama aset' : step === 3 ? 'Nama utang' : step === 4 ? 'Sumber pendapatan' : 'Nama pengeluaran'}</label><input className={input} value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: BCA, Gaji, Kontrakan" /></div><div><label className="block text-sm font-medium mb-1.5">{step === 3 ? 'Total utang' : 'Nominal'}</label><input className={input} type="number" min="0" value={data.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" /></div>{step === 1 && <select className={input} value={data.type} onChange={(e) => set('type', e.target.value)}><option value="cash">Tunai</option><option value="bank">Bank</option><option value="ewallet">E-wallet</option><option value="other">Lainnya</option></select>}{step === 2 && <select className={input} value={data.category} onChange={(e) => set('category', e.target.value)}><option value="kas_setara_kas">Kas</option><option value="investasi">Investasi</option><option value="tetap">Aset tetap</option></select>}{step === 3 && <><select className={input} value={data.term} onChange={(e) => set('term', e.target.value)}><option value="jangka_pendek">Jangka pendek</option><option value="jangka_panjang">Jangka panjang</option></select><input className={input} type="number" min="0" value={data.monthly} onChange={(e) => set('monthly', e.target.value)} placeholder="Cicilan bulanan (opsional)" /></>}{step === 5 && <select className={input} value={data.flowCategory} onChange={(e) => set('flowCategory', e.target.value)}><option value="kebutuhan_sehari_hari">Kebutuhan sehari-hari</option><option value="kewajiban_cicilan">Kewajiban/cicilan</option><option value="masa_depan_investasi">Masa depan/investasi</option></select>}<p className="text-xs text-muted-foreground">Boleh dikosongkan jika belum ingin mengisinya.</p></> : <div className="grid grid-cols-2 gap-2">{priorities.map((p) => <button type="button" key={p} onClick={() => togglePriority(p)} className={`rounded-xl border p-3 text-left text-sm ${prioritiesSelected.includes(p) ? 'border-primary-500 bg-primary-500/10 text-primary-600' : 'border-border'}`}>{prioritiesSelected.includes(p) ? <Check className="inline w-4 h-4 mr-1" /> : null}{p}</button>)}</div>}{error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}</div><div className="flex items-center justify-between gap-2 mt-6"><button type="button" disabled={busy} onClick={step === 1 ? skip : () => setStep(step - 1)} className="btn-secondary">{step === 1 ? 'Lewati setup' : <><ChevronLeft className="w-4 h-4" /> Kembali</>}</button><button type="button" disabled={busy} onClick={next} className="btn-primary">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 6 ? 'Selesai' : <>Lanjut <ChevronRight className="w-4 h-4" /></>}</button></div></AuthShell>;
}
