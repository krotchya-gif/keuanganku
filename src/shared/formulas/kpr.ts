// packages/shared/src/formulas/kpr.ts
// Formula dari Simulasi KPR.xlsx → Sheet "01 Data KPR", "02 Angsuran", "03 Biaya Lainnya"
// Menggunakan Iterative Balance Tracking (bukan PPMT/IPMT) untuk presisi tinggi

import type { AmortizationRow, KPRResult, KPRAdditionalCosts } from '../types';

/**
 * PMT — Hitung angsuran tetap per periode
 * pv (pinjaman) bernilai positif → mengembalikan nilai cicilan positif
 */
export function calculatePMT(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  const factor = Math.pow(1 + rate, nper);
  return (pv * rate * factor) / (factor - 1);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// ===== VALIDASI INPUT KPR =====
/**
 * Validasi parameter simulasi KPR sebelum dihitung.
 * Mengembalikan null jika valid, atau pesan error (Bahasa Indonesia) jika tidak valid.
 */
export function validateKPRInput(input: {
  propertyPrice: number;
  downPayment: number;
  loanPeriodYears: number;
  fixedPeriodYears: number;
  floatingPhases?: { durationYears: number }[];
}): string | null {
  if (!Number.isFinite(input.propertyPrice) || input.propertyPrice <= 0) {
    return 'Harga properti harus lebih dari 0.';
  }
  if (!Number.isFinite(input.downPayment) || input.downPayment < 0) {
    return 'Uang muka (DP) tidak boleh negatif.';
  }
  if (input.downPayment >= input.propertyPrice) {
    return 'Uang muka (DP) tidak boleh lebih besar atau sama dengan harga properti.';
  }
  if (!Number.isFinite(input.loanPeriodYears) || input.loanPeriodYears <= 0) {
    return 'Tenor KPR harus lebih dari 0 tahun.';
  }
  if (!Number.isFinite(input.fixedPeriodYears) || input.fixedPeriodYears < 0) {
    return 'Masa bunga fix tidak boleh negatif.';
  }
  if (input.fixedPeriodYears > input.loanPeriodYears) {
    return 'Masa bunga fix tidak boleh melebihi tenor KPR.';
  }

  const totalPhaseYears = (input.floatingPhases ?? []).reduce(
    (sum, p) => sum + (Number.isFinite(p.durationYears) ? p.durationYears : 0),
    0
  );
  if (input.fixedPeriodYears + totalPhaseYears > input.loanPeriodYears) {
    return 'Total durasi fase bunga (fix + transisi) melebihi tenor KPR.';
  }

  return null;
}

// ===== KALKULASI TABEL AMORTISASI KPR =====
/**
 * calculateKPR — Hitung tabel amortisasi lengkap menggunakan Iterative Balance Tracking
 * Mendukung KPR Lurus (1 Fix + 1 Float) maupun KPR Berjenjang (Array of Floating Transitions)
 * Melempar Error dengan pesan validasi jika input tidak valid.
 */
export function calculateKPR(input: {
  propertyPrice: number;
  downPayment: number;
  loanPeriodYears: number;
  fixedRateAnnual: number;
  fixedPeriodYears: number;
  floatingRateAnnual: number; // Bertindak sebagai batas atas (Cap Rate) jika ada transisi
  floatingPhases?: { durationYears: number; rateAnnual: number }[]; // Fase Bunga Transisi
  startDate?: Date;
  monthlyIncome?: number;
}): KPRResult {
  const error = validateKPRInput(input);
  if (error) throw new Error(error);

  const loanPrincipal = input.propertyPrice - input.downPayment;
  const totalPeriods = input.loanPeriodYears * 12;
  const fixedPeriods = input.fixedPeriodYears * 12;
  const floatingPhases = input.floatingPhases ?? [];

  const fixedMonthlyRate = input.fixedRateAnnual / 12;
  const floatingMonthlyRate = input.floatingRateAnnual / 12;

  const startDate = input.startDate ?? new Date();
  const schedule: AmortizationRow[] = [];
  
  // 1. Petakan (Map) suku bunga per bulannya berdasarkan fase yang ada
  const monthlyRates: { rate: number; isPhaseStart: boolean; phaseIndex: number; phaseLabel: string }[] = [];
  
  // Fase 0: Fix
  for (let m = 1; m <= fixedPeriods; m++) {
    monthlyRates.push({ rate: fixedMonthlyRate, isPhaseStart: m === 1, phaseIndex: 0, phaseLabel: `Fix (${(input.fixedRateAnnual * 100).toFixed(2)}%)` });
  }

  // Fase 1..N: Transisi Berjenjang (Opsional)
  floatingPhases.forEach((phase, idx) => {
    const phaseMonths = phase.durationYears * 12;
    const phaseMonthlyRate = phase.rateAnnual / 12;
    const label = `Transisi ${idx + 1} (${(phase.rateAnnual * 100).toFixed(2)}%)`;
    for (let m = 1; m <= phaseMonths; m++) {
      // Pastikan kita tidak melebihi total masa tenor KPR
      if (monthlyRates.length < totalPeriods) {
        monthlyRates.push({ rate: phaseMonthlyRate, isPhaseStart: m === 1, phaseIndex: idx + 1, phaseLabel: label });
      }
    }
  });

  // Fase N+1: Floating / Capping Akhir
  const floatingPhaseIndex = floatingPhases.length + 1;
  const remainingMonths = totalPeriods - monthlyRates.length;
  for (let m = 1; m <= remainingMonths; m++) {
    monthlyRates.push({ rate: floatingMonthlyRate, isPhaseStart: m === 1, phaseIndex: floatingPhaseIndex, phaseLabel: `Floating (${(input.floatingRateAnnual * 100).toFixed(2)}%)` });
  }

  // 2. Kalkulasi Iteratif Bulanan
  let balance = loanPrincipal;
  let remainingAtFloating = 0;
  let currentPMT = 0;
  let minInstallment = Infinity;
  let maxInstallment = 0;

  for (let period = 1; period <= totalPeriods; period++) {
    const date = addMonths(startDate, period - 1);
    const beginningBalance = balance;
    const currentPhase = monthlyRates[period - 1];

    // Jika terjadi perpindahan fase suku bunga, rekalkulasi PMT baru
    if (currentPhase.isPhaseStart || period === 1) {
      const remainingPeriod = totalPeriods - period + 1;
      currentPMT = calculatePMT(currentPhase.rate, remainingPeriod, balance);
      
      // Catat saldo saat pertama kali lepas landas dari masa fix
      if (period === fixedPeriods + 1) {
        remainingAtFloating = balance;
      }
    }

    const interestPayment = balance * currentPhase.rate;
    const principalPayment = currentPMT - interestPayment;
    const totalPayment = principalPayment + interestPayment;
    balance = beginningBalance - principalPayment;

    // Catat nilai cicilan terendah dan tertinggi dari seluruh rentang umur KPR
    if (totalPayment < minInstallment) minInstallment = totalPayment;
    if (totalPayment > maxInstallment) maxInstallment = totalPayment;

    schedule.push({
      period,
      date,
      beginningBalance,
      principalPayment,
      interestPayment,
      totalPayment,
      endingBalance: Math.max(0, balance),
      phaseIndex: currentPhase.phaseIndex,
      phaseLabel: currentPhase.phaseLabel,
    });
  }

  if (minInstallment === Infinity) minInstallment = 0;

  const totalInterestPaid = schedule.reduce((sum, r) => sum + r.interestPayment, 0);
  const totalPaid = loanPrincipal + totalInterestPaid;
  const interestToPrincipalRatio = loanPrincipal > 0 ? totalInterestPaid / loanPrincipal : 0;

  return {
    schedule,
    summary: {
      loanPrincipal,
      totalPrincipalPaid: loanPrincipal,
      totalInterestPaid,
      totalPaid,
      interestToPrincipalRatio,
      minInstallment,
      maxInstallment,
      remainingAtFloating,
    },
  };
}

// ===== BIAYA TAMBAHAN KPR =====
/**
 * Rumus Excel (sheet "03 Biaya Lainnya"):
 * BPHTB: E5 = D9 = 5% × (D6 - D7)   dimana D6=harga properti, D7=NPOPTKP
 * PPN:   E10 = D12 - (D12 × D13)   D12=11%×NPOP, D13=diskon (1.0=100%)
 * AJB:   E14 = D17 = D15 × 1%
 * BBN:   E18 = D21 = D19 × 2%
 * Total: E29 = E5 + E10 + E14 + E18 + E22 + E23 (notaris + biaya bank)
 */
export function calculateAdditionalCosts(params: {
  propertyPrice: number;
  npoptkp?: number;       // default 75.000.000
  ppnDiscount?: number;   // default 1.0 (100% diskon)
  ajbRate?: number;       // default 0.01 (1%)
  bbnRate?: number;       // default 0.02 (2%)
  notaryFee?: number;     // default 5.000.000
  bankFee1?: number;
  bankFee2?: number;
  bankFee3?: number;
}): KPRAdditionalCosts {
  const {
    propertyPrice,
    npoptkp = 75_000_000,
    ppnDiscount = 1.0,
    ajbRate = 0.01,
    bbnRate = 0.02,
    notaryFee = 5_000_000,
    bankFee1 = 0,
    bankFee2 = 0,
    bankFee3 = 0,
  } = params;

  const npopkp = Math.max(0, propertyPrice - npoptkp);
  const bphtb = 0.05 * npopkp;

  const ppnBase = 0.11 * propertyPrice;
  const ppn = ppnBase * (1 - ppnDiscount);

  const ajb = ajbRate * propertyPrice;
  const bbn = bbnRate * propertyPrice;
  const bankFees = bankFee1 + bankFee2 + bankFee3;
  const total = bphtb + ppn + ajb + bbn + notaryFee + bankFees;

  return { bphtb, ppn, ajb, bbn, notaryFee, bankFees, total };
}

// ===== RASIO CICILAN / GAJI =====
/**
 * Rumus Excel: K7 = K6 / gaji, L7 = L6 / gaji
 * K6 = cicilan minimum, L6 = cicilan maksimum
 * Status: 'sehat' (<30%), 'warning' (30-50%), 'bahaya' (>50%)
 */
export function calculateInstallmentRatio(
  minInstallment: number,
  maxInstallment: number,
  monthlyIncome: number
): { minRatio: number; maxRatio: number; conclusion: string; status: 'sehat' | 'warning' | 'bahaya' } {
  if (monthlyIncome <= 0) {
    return {
      minRatio: 0,
      maxRatio: 0,
      conclusion: 'Masukkan pendapatan bulanan untuk melihat rasio cicilan.',
      status: 'sehat',
    };
  }

  const minRatio = minInstallment / monthlyIncome;
  const maxRatio = maxInstallment / monthlyIncome;

  const worstRatio = Math.max(minRatio, maxRatio);

  let conclusion: string;
  let status: 'sehat' | 'warning' | 'bahaya';

  if (worstRatio < 0.3) {
    conclusion = 'Rasio Sehat: Cicilan tidak membebani cashflow. Masih ada ruang untuk tabungan, investasi, dan kebutuhan lainnya.';
    status = 'sehat';
  } else if (worstRatio >= 0.3 && worstRatio < 0.4) {
    if (maxRatio >= 0.4) {
      conclusion = 'Cicilan minimum dalam batas aman, tapi cicilan maksimum mendekati batas. Perhatikan cashflow saat bunga floating tiba.';
    } else {
      conclusion = 'Batas Aman: Cicilan masih terkendali. Pastikan dana darurat cukup dan kelola cashflow dengan baik.';
    }
    status = 'warning';
  } else if (worstRatio >= 0.4 && worstRatio <= 0.5) {
    conclusion = 'Membebani: Cicilan mulai memberatkan keuangan bulanan. Pertimbangkan menambah DP, memperpanjang tenor, atau menambah penghasilan.';
    status = 'warning';
  } else {
    conclusion = 'Tidak Sehat: Cicilan melebihi 50% penghasilan. Berisiko tinggi menyebabkan ketergantungan pada utang lain. Segera evaluasi kemampuan bayar.';
    status = 'bahaya';
  }

  return { minRatio, maxRatio, conclusion, status };
}
