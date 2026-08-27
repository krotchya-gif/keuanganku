// packages/shared/src/formulas/budgeting.ts
// Formula dari Budgeting Sheet Beruang.xlsx → Sheet JAN-DES, DASHBOARD TABUNGAN, EVALUASI TAHUNAN

import type {
  Transaction,
  SavingsGoal,
  MonthlyOverview,
  SavingsProgress,
} from '../types';

// ===== GAMBARAN UMUM BULAN =====
/**
 * Hitung gambaran umum bulanan
 * Rumus dari sheet JAN (bagian atas / "GAMBARAN UMUM"):
 * - Saldo Berlanjut (dari bulan sebelumnya)
 * + Pendapatan (realisasi PENDAPATAN)
 * - Pendapatan Ditabung (realisasi TABUNGAN_INVESTASI)
 * - Pendapatan Dibelanjakan (realisasi TAGIHAN + BIAYA_OPERASIONAL)
 * - Hutang Dilunasi (realisasi HUTANG)
 * = Sisa Saldo
 */
export function calculateMonthlyOverview(params: {
  carryOverBalance: number;
  transactions: Transaction[];
}): MonthlyOverview {
  const { carryOverBalance, transactions } = params;

  const income = transactions
    .filter((t) => t.category === 'PENDAPATAN')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const saved = transactions
    .filter((t) => t.category === 'TABUNGAN_INVESTASI')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const spent = transactions
    .filter((t) => t.category === 'TAGIHAN' || t.category === 'BIAYA_OPERASIONAL')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const debtPaid = transactions
    .filter((t) => t.category === 'HUTANG')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const remainingBalance = carryOverBalance + income - saved - spent - debtPaid;

  return { carryOver: carryOverBalance, income, saved, spent, debtPaid, remainingBalance };
}

// ===== DASHBOARD TABUNGAN =====
/**
 * Hitung progress tabungan per goal
 * Rumus dari sheet "DASHBOARD TABUNGAN":
 * totalSaved = initial_amount + current_amount
 * remaining = target - totalSaved
 * progressPercent = (totalSaved / target) × 100
 * monthsLeft = ceil(remaining / monthly_contribution)
 * Sisa Bulan = remaining / kontribusi_bulanan
 */
export function calculateSavingsProgress(goal: SavingsGoal): SavingsProgress {
  const totalSaved = Number(goal.initial_amount) + Number(goal.current_amount);
  const remaining = Math.max(0, Number(goal.target_amount) - totalSaved);
  const progressPercent =
    goal.target_amount > 0 ? Math.min(100, (totalSaved / Number(goal.target_amount)) * 100) : 0;

  const monthsLeft =
    goal.monthly_contribution > 0 && remaining > 0
      ? Math.ceil(remaining / Number(goal.monthly_contribution))
      : null;

  return {
    totalSaved,
    remaining,
    progressPercent,
    monthsLeft,
    isCompleted: remaining <= 0,
  };
}

// ===== EVALUASI TAHUNAN =====
/**
 * Hitung ringkasan tahunan per kategori
 * Dari sheet "EVALUASI TAHUNAN":
 * SISA = PENDAPATAN - (TABUNGAN_INVESTASI + TAGIHAN + BIAYA_OPERASIONAL + HUTANG)
 */
export function calculateAnnualSummary(transactions: Transaction[]) {
  const byCategory = {
    PENDAPATAN: 0,
    TABUNGAN_INVESTASI: 0,
    TAGIHAN: 0,
    BIAYA_OPERASIONAL: 0,
    HUTANG: 0,
  };

  for (const t of transactions) {
    if (t.category in byCategory) {
      byCategory[t.category as keyof typeof byCategory] += Number(t.amount);
    }
  }

  const sisa =
    byCategory.PENDAPATAN -
    byCategory.TABUNGAN_INVESTASI -
    byCategory.TAGIHAN -
    byCategory.BIAYA_OPERASIONAL -
    byCategory.HUTANG;

  return { ...byCategory, SISA: sisa };
}

export function calculateMonthlyBreakdown(transactions: Transaction[]) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return months.map((month) => {
    const monthTx = transactions.filter((t) => {
      // Parse 'YYYY-MM-DD' langsung dari string untuk menghindari pergeseran zona waktu
      const datePart = String(t.transaction_date).slice(0, 10);
      const m = Number(datePart.split('-')[1]);
      return m === month;
    });
    const summary = calculateAnnualSummary(monthTx);
    return { month, ...summary };
  });
}
