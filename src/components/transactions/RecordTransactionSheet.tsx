'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CategoryChipPicker, type ChipGroup, type ChipOption } from '@/components/ui/CategoryChipPicker';
import { AmountKeypad } from '@/components/ui/AmountKeypad';
import { createClient } from '@/utils/supabase/client';
import { fetchBudgetItems } from '@/lib/queries/budget';
import { DEFAULT_BUDGET_ITEMS, BUDGET_CATEGORY_COLORS, BUDGET_CATEGORY_LABELS } from '@/shared/constants';
import type { BudgetCategory, Transaction } from '@/shared/types';
import type { Account } from '@/shared';
import { fetchAccounts } from '@/lib/queries/onboarding';
import { getLocalDateString, getTodayString } from '@/lib/utils';

type Direction = 'keluar' | 'masuk' | 'transfer';

const EXPENSE_GROUPS: BudgetCategory[] = ['BIAYA_OPERASIONAL', 'TAGIHAN', 'HUTANG', 'TABUNGAN_INVESTASI'];
const INCOME_GROUPS: BudgetCategory[] = ['PENDAPATAN'];

interface RecordTransactionSheetProps {
  open: boolean;
  onClose: () => void;
  /** Dipanggil setelah transaksi berhasil disimpan (parent me-refresh data). */
  onSaved: () => void;
  /** Transaksi yang sedang diedit (kosong = tambah baru). */
  editTransaction?: Transaction | null;
}

/**
 * RecordTransactionSheet — satu-satunya form pencatatan transaksi.
 * Dipakai bersama oleh FAB, Beranda, dan halaman Arus Kas.
 * Alur: pilih jenis → tanggal → ketuk kategori → nominal via keypad → simpan.
 */
export function RecordTransactionSheet({ open, onClose, onSaved, editTransaction }: RecordTransactionSheetProps) {
  const [direction, setDirection] = useState<Direction>('keluar');
  const [date, setDate] = useState(getTodayString());
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [selected, setSelected] = useState<ChipOption | null>(null);
  const [wallets, setWallets] = useState<Array<{ name: string; category: BudgetCategory }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Muat dompet milik user (chip kategori mengikuti data mereka; fallback ke bawaan).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const items = await fetchBudgetItems(user.id);
        const accountRows = await fetchAccounts(user.id);
        if (!cancelled) {
          setWallets(items.length > 0 ? items.map((i) => ({ name: i.name, category: i.category })) : DEFAULT_BUDGET_ITEMS);
          setAccounts(accountRows);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setWallets(DEFAULT_BUDGET_ITEMS);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Isi ulang form saat membuka / mengganti mode edit.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editTransaction) {
      setDirection(editTransaction.transaction_type === 'transfer' ? 'transfer' : editTransaction.category === 'PENDAPATAN' ? 'masuk' : 'keluar');
      setDate(editTransaction.transaction_date);
      setAmount(editTransaction.amount);
      setDescription(editTransaction.description ?? '');
      setAccountId(editTransaction.account_id ?? '');
      setTransferToAccountId(editTransaction.transfer_to_account_id ?? '');
      setSelected(
        editTransaction.subcategory
          ? { label: editTransaction.subcategory, groupKey: editTransaction.category }
          : { label: labelOfCategory(editTransaction.category), groupKey: editTransaction.category }
      );
    } else {
      setDirection('keluar');
      setDate(getTodayString());
      setAmount(0);
      setDescription('');
      setAccountId('');
      setTransferToAccountId('');
      setSelected(null);
    }
  }, [open, editTransaction]);

  const groups: ChipGroup[] = useMemo(
    () => (direction === 'masuk' ? INCOME_GROUPS : direction === 'transfer' ? [] : EXPENSE_GROUPS).map((key) => ({
      key,
      label: BUDGET_CATEGORY_LABELS[key],
      color: BUDGET_CATEGORY_COLORS[key],
    })),
    [direction]
  );

  const options: ChipOption[] = useMemo(
    () =>
      wallets
        .filter((e) => groups.some((g) => g.key === e.category))
        .map((e) => ({ label: e.name, groupKey: e.category })),
    [wallets, groups]
  );

  const shiftDate = (days: number) => {
    const d = new Date(`${date}T00:00:00`);
    d.setDate(d.getDate() + days);
    setDate(getLocalDateString(d));
  };

  const pickOption = (opt: ChipOption) => setSelected(opt);

  const save = async () => {
    setError(null);
    if (direction !== 'transfer' && !selected) { setError('Pilih kategori terlebih dahulu.'); return; }
    if (!accountId) {
      setError(direction === 'masuk' ? 'Pilih rekening tujuan pemasukan.' : 'Pilih sumber dana pengeluaran.');
      return;
    }
    if (direction === 'transfer' && !transferToAccountId) { setError('Pilih rekening tujuan transfer.'); return; }
    if (direction === 'transfer' && transferToAccountId === accountId) { setError('Rekening sumber dan tujuan harus berbeda.'); return; }
    if (amount <= 0) { setError('Isi nominal lebih dari nol.'); return; }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Sesi berakhir. Silakan masuk kembali.'); setSaving(false); return; }

    const wallet = selected ? wallets.find((e) => e.name === selected.label) : null;
    const category = (wallet?.category ?? selected?.groupKey ?? 'TABUNGAN_INVESTASI') as BudgetCategory;

    const payload = {
      user_id: user.id,
      transaction_date: date,
      amount,
      category,
      transaction_type: direction === 'masuk' ? 'income' : direction === 'transfer' ? 'transfer' : 'expense',
      transfer_to_account_id: direction === 'transfer' ? transferToAccountId : null,
      subcategory: wallet && selected ? selected.label : null,
      description: description.trim() || null,
      account_id: accountId,
    };

    try {
      if (editTransaction) {
        const { error: err } = await supabase.from('transactions').update(payload).eq('id', editTransaction.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('transactions').insert(payload);
        if (err) throw err;
      }
      onSaved();
      onClose();
    } catch {
      setError('Gagal menyimpan transaksi. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={editTransaction ? 'Ubah Transaksi' : 'Catat Transaksi'} maxWidth="sm:max-w-lg">
      <div className="space-y-3.5">
        <SegmentedControl<Direction>
          value={direction}
          onChange={(d) => { setDirection(d); setSelected(null); }}
          options={[
            { value: 'keluar', label: 'Pengeluaran' },
            { value: 'masuk', label: 'Pemasukan' },
            { value: 'transfer', label: 'Transfer' },
          ]}
        />

        {/* Pemilih tanggal dengan langkah ±1 hari */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            aria-label="Sehari sebelumnya"
            className="touch-target flex shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Tanggal transaksi"
            className="input-field text-center font-medium"
          />
          <button
            onClick={() => shiftDate(1)}
            aria-label="Sehari berikutnya"
            className="touch-target flex shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {direction === 'transfer' && accounts.length > 0 && (
          <div>
            <label htmlFor="transfer-destination" className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Rekening tujuan <span className="text-danger">*</span></label>
            <select id="transfer-destination" required value={transferToAccountId} onChange={(e) => setTransferToAccountId(e.target.value)} className="input-field w-full">
              <option value="">Pilih rekening tujuan</option>
              {accounts.filter((a) => a.id !== accountId).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          </div>
        )}

        {direction !== 'transfer' && <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Kategori</p>
          <CategoryChipPicker
            groups={groups}
            options={options}
            value={selected?.label ?? null}
            onSelect={pickOption}
            emptyMessage={
              direction === 'masuk'
                ? 'Belum ada dompet pendapatan. Buat dompet di menu Anggaran.'
                : 'Belum ada dompet pengeluaran. Buat dompet di menu Anggaran.'
            }
          />
        </div>}

        <div>
          <label htmlFor="transaction-account" className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {direction === 'masuk' ? 'Rekening tujuan' : 'Sumber dana'} <span className="text-danger">*</span>
          </label>
          {accounts.length > 0 ? (
            <select id="transaction-account" required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input-field w-full">
              <option value="">Pilih {direction === 'masuk' ? 'rekening tujuan' : 'sumber dana'}</option>
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </select>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
              Belum ada rekening. Tambahkan rekening saat setup onboarding terlebih dahulu.
            </p>
          )}
        </div>

        <AmountKeypad value={amount} onChange={setAmount} />

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Catatan (opsional), misal: makan siang kantor"
          maxLength={120}
          className="input-field"
          aria-label="Catatan"
        />

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Tombol simpan menempel di dasar sheet agar selalu terlihat */}
        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-border/60 bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button onClick={save} disabled={saving} className="btn-primary w-full touch-target">
            {saving ? 'Menyimpan…' : editTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

function labelOfCategory(category: BudgetCategory): string {
  return BUDGET_CATEGORY_LABELS[category];
}
