'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Loader2, Wallet } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { getOnboardingProfile, saveOnboardingProgress, finishOnboarding, createOnboardingAccount, createOnboardingAsset, createOnboardingDebt, createOnboardingIncomeTransaction, createOnboardingRecurringExpense } from '@/lib/queries/onboarding';
import type { AccountType, AssetCategory, CashflowCategory, DebtTerm } from '@/shared';

const steps = ['Rekening', 'Aset', 'Utang', 'Pendapatan', 'Pengeluaran', 'Prioritas'];
const priorities = ['Dana darurat', 'Kontrol pengeluaran', 'Menabung', 'Investasi', 'Membeli rumah', 'Melunasi utang'];
const input = 'w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/35';
const emptyData = { name: '', type: 'bank' as AccountType, amount: '', category: 'kas_setara_kas' as AssetCategory, term: 'jangka_panjang' as DebtTerm, monthly: '', flowCategory: 'kebutuhan_sehari_hari' as CashflowCategory };

export function OnboardingWizard() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prioritiesSelected, setPrioritiesSelected] = useState<string[]>([]);
  const [data, setData] = useState(emptyData);
  const [counts, setCounts] = useState([0, 0, 0, 0, 0]);

  useEffect(() => { (async () => { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) { router.replace('/login'); return; } setUserId(user.id); const p = await getOnboardingProfile(user.id); setStep(Math.min(6, p.step)); setPrioritiesSelected(p.priorities); })(); }, [router]);
  const set = (key: keyof typeof emptyData, value: string) => setData((d) => ({ ...d, [key]: value }));
  const togglePriority = (value: string) => setPrioritiesSelected((p) => p.includes(value) ? p.filter((x) => x !== value) : [...p, value]);

  async function saveItem() {
    if (step > 5 || !data.name.trim()) return false;
    const amount = Number(data.amount || 0);
    if (amount < 0) throw new Error('Nominal tidak boleh negatif.');
    if (step === 1) await createOnboardingAccount(userId, { name: data.name.trim(), type: data.type, balance: amount });
    if (step === 2) await createOnboardingAsset(userId, { name: data.name.trim(), category: data.category, amount });
    if (step === 3) await createOnboardingDebt(userId, { name: data.name.trim(), term: data.term, total_amount: amount, monthly_payment: Number(data.monthly || 0) });
    if (step === 4) await createOnboardingIncomeTransaction(userId, { name: data.name.trim(), amount });
    if (step === 5) await createOnboardingRecurringExpense(userId, { name: data.name.trim(), category: data.flowCategory, amount });
    setCounts((c) => c.map((n, i) => i === step - 1 ? n + 1 : n)); setData(emptyData); return true;
  }

  async function next() { setBusy(true); setError(''); try { await saveItem(); if (step === 6) { await finishOnboarding(userId, 'completed', prioritiesSelected); router.replace('/dashboard'); return; } const nextStep = step + 1; await saveOnboardingProgress(userId, nextStep, prioritiesSelected); setStep(nextStep); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan data.'); } finally { setBusy(false); } }
  async function addAnother() { setBusy(true); setError(''); try { await saveItem(); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan data.'); } finally { setBusy(false); } }
  async function skip() { setBusy(true); try { await finishOnboarding(userId, 'skipped', prioritiesSelected); router.replace('/dashboard'); } catch { setError('Gagal melewati onboarding.'); } finally { setBusy(false); } }

  const title = ['Saldo rekening awal', 'Aset yang dimiliki', 'Utang atau liabilitas', 'Pendapatan rutin', 'Pengeluaran rutin', 'Prioritas keuangan'][step - 1];
  return <AuthShell><div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center"><Wallet className="w-5 h-5 text-white" /></div><div><h2 className="text-xl font-bold">Setup keuangan awal</h2><p className="text-xs text-muted-foreground">Langkah {step} dari 6 · {title}</p></div></div><div className="flex gap-1.5 mb-6">{steps.map((s, i) => <div key={s} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? 'bg-primary-500' : 'bg-muted'}`} />)}</div><div className="space-y-4 min-h-56">{step < 6 ? <><p className="text-sm text-muted-foreground">Tambahkan satu atau beberapa item. Langkah ini boleh dilewati.</p><div><label className="block text-sm font-medium mb-1.5">{step === 1 ? 'Nama rekening' : step === 2 ? 'Nama aset' : step === 3 ? 'Nama utang' : step === 4 ? 'Sumber pendapatan' : 'Nama pengeluaran'}</label><input className={input} value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="Contoh: BCA, Gaji, Kontrakan" /></div><div><label className="block text-sm font-medium mb-1.5">{step === 3 ? 'Total utang' : 'Nominal'}</label><input className={input} type="number" min="0" value={data.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0" /></div>{step === 1 && <select className={input} value={data.type} onChange={(e) => set('type', e.target.value)}><option value="cash">Tunai</option><option value="bank">Bank</option><option value="ewallet">E-wallet</option><option value="other">Lainnya</option></select>}{step === 2 && <select className={input} value={data.category} onChange={(e) => set('category', e.target.value)}><option value="kas_setara_kas">Kas</option><option value="investasi">Investasi</option><option value="tetap">Aset tetap</option></select>}{step === 3 && <><select className={input} value={data.term} onChange={(e) => set('term', e.target.value)}><option value="jangka_pendek">Jangka pendek</option><option value="jangka_panjang">Jangka panjang</option></select><input className={input} type="number" min="0" value={data.monthly} onChange={(e) => set('monthly', e.target.value)} placeholder="Cicilan bulanan (opsional)" /></>}{step === 5 && <select className={input} value={data.flowCategory} onChange={(e) => set('flowCategory', e.target.value)}><option value="kebutuhan_sehari_hari">Kebutuhan sehari-hari</option><option value="kewajiban_cicilan">Kewajiban/cicilan</option><option value="masa_depan_investasi">Masa depan/investasi</option></select>}<p className="text-xs text-muted-foreground">{counts[step - 1]} item sudah ditambahkan.</p></> : <><p className="text-sm text-muted-foreground">Pilih fokus utama agar rekomendasi aplikasi lebih relevan.</p><div className="grid grid-cols-2 gap-2">{priorities.map((p) => <button type="button" key={p} onClick={() => togglePriority(p)} className={`rounded-xl border p-3 text-left text-sm ${prioritiesSelected.includes(p) ? 'border-primary-500 bg-primary-500/10 text-primary-600' : 'border-border'}`}>{prioritiesSelected.includes(p) ? <Check className="inline w-4 h-4 mr-1" /> : null}{p}</button>)}</div><div className="rounded-xl bg-muted/50 p-4 text-sm"><p className="font-semibold mb-2">Ringkasan kondisi awal</p><p>{counts[0]} rekening · {counts[1]} aset · {counts[2]} utang</p><p>{counts[3]} sumber pendapatan · {counts[4]} pengeluaran rutin</p></div></>}{error && <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}</div><div className="flex flex-wrap items-center justify-between gap-2 mt-6"><button type="button" disabled={busy} onClick={step === 1 ? skip : () => setStep(step - 1)} className="btn-secondary">{step === 1 ? 'Lewati setup' : <><ChevronLeft className="w-4 h-4" /> Kembali</>}</button><div className="flex gap-2">{step < 6 && <button type="button" disabled={busy || !data.name.trim()} onClick={addAnother} className="btn-secondary">Tambah lagi</button>}<button type="button" disabled={busy} onClick={next} className="btn-primary">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : step === 6 ? 'Selesai' : <>Lanjut <ChevronRight className="w-4 h-4" /></>}</button></div></div></AuthShell>;
}
