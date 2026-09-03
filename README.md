# Keuanganku — Manajemen Keuangan Personal

Aplikasi manajemen keuangan personal berbasis **Next.js 16** + **PWA** + **Supabase**.
Mengonversi perhitungan dari 3 file Excel (Financial Checkup, Simulasi KPR, Budgeting Sheet) menjadi platform web terpadu dengan tampilan mobile-first.

---

## Fitur

Aplikasi tersusun atas **4 pilar** agar tidak membingungkan pengguna:

- **Beranda** — ringkasan kekayaan bersih (hero card + mode privasi), arus kas aktual, progres anggaran, aktivitas pengeluaran, transaksi terbaru
- **Arus Kas (mencatat)** — satu-satunya tempat pencatatan transaksi: buku besar per tanggal dengan sheet "Catat Transaksi" (chip kategori + keypad), Riwayat timeline, Pembayaran Tagihan (ceklis)
- **Anggaran (merencanakan)** — Evaluasi rencana vs realisasi, Amplop anggaran, Kas Rutin Bulanan (dasar Checkup), Tabungan & Investasi
- **KPR (simulasi)** — kalkulasi amortisasi, bunga tetap + floating tunggal/bertahap, biaya tambahan (BPHTB, PPN, AJB, BBN), tabel 20 baris/halaman
- **Analisis** — Kekayaan Bersih & snapshot, Checkup 6 rasio (radar chart), Evaluasi Tahunan
- **PWA** — install prompt (1×/24 jam), offline fallback, service worker cache strategy

---

## Tech Stack

| Stack | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, proxy.ts) |
| Bahasa | TypeScript 6 |
| Styling | Tailwind CSS 3 (design tokens custom, tanpa shadcn/ui) |
| Charts | Recharts 3 |
| Forms | Hand-rolled `useState` + komponen chip picker & keypad kustom |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email) |
| PWA | @serwist/next 9.5 |
| Deployment | Vercel |

---

## Struktur Project

```
keuangan/
├── src/
│   ├── app/
│   │   ├── (main)/           # Protected routes + sidebar + bottom nav
│   │   │   ├── dashboard/    # Beranda (hero + aksi cepat)
│   │   │   ├── arus-kas/     # Pilar Arus Kas: buku transaksi
│   │   │   ├── kalendar/     # Riwayat (timeline)
│   │   │   ├── pembayaran/   # Ceklis tagihan
│   │   │   ├── budgeting/    # Pilar Anggaran: evaluasi + amplop
│   │   │   ├── kas-rutin/    # Kas rutin bulanan (ex-Arus Kas lama)
│   │   │   ├── tabungan/     # Tabungan & investasi
│   │   │   ├── kpr/          # Pilar KPR: simulasi
│   │   │   ├── net-worth/ checkup/ evaluasi/  # Analisis
│   │   │   └── settings/
│   │   ├── page.tsx          # Landing page (public)
│   │   ├── login/ register/ lupa-password/ reset-password/
│   │   └── auth/callback/
│   ├── components/
│   │   ├── auth/             # AuthShell
│   │   ├── charts/           # ChartTooltip, ChartTheme
│   │   ├── layout/           # Sidebar, InstallPrompt
│   │   ├── transactions/     # RecordTransactionSheet (form catat bersama)
│   │   └── ui/               # BottomSheet, CategoryChipPicker, AmountKeypad, SegmentedControl, HeroCard, StatCard, dll
│   ├── lib/
│   │   ├── utils.ts          # formatRupiah, tanggal lokal, dll
│   │   ├── export.ts         # exportCSV, exportPDF
│   │   └── queries/          # assets, debts, cashflow, transactions, dll
│   ├── shared/
│   │   ├── formulas/         # networth, cashflow, checkup, kpr, budgeting
│   │   ├── types/            # Semua TypeScript interfaces
│   │   └── constants/
│   ├── utils/supabase/       # client, server, middleware
│   └── proxy.ts              # Auth proxy Next 16 (updateSession)
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_seed_data.sql
│   │   ├── 003_cron_snapshot.sql
│   │   └── 004_dana_darat_flag.sql
│   └── functions/
│       └── snapshot/           # Auto-snapshot (Deno)
├── sw.ts                     # Service worker (serwist)
├── next.config.mjs
└── package.json
```

---

## Setup Development

### Prerequisites
- Node.js 18+
- Supabase account

### 1. Clone & Install
```bash
git clone https://github.com/krotchya-gif/keuanganku.git
cd app-keuangan
npm install
```

### 2. Environment Variables
Buat `.env.local` di root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
```

### 3. Database
1. Buat project di [Supabase Dashboard](https://supabase.com/dashboard)
2. Buka SQL Editor, jalankan migrasi berurutan:
   - `supabase/migrations/001_initial_schema.sql` — wajib
   - `supabase/migrations/002_seed_data.sql` — opsional (data contoh)
   - `supabase/migrations/003_cron_snapshot.sql` — opsional (auto-snapshot, butuh Pro plan)
   - `supabase/migrations/004_dana_darat_flag.sql` — opsional (is_emergency_fund untuk dana darurat)

### 4. Run
```bash
npm run dev          # http://localhost:3002
```

---

## Scripts

| Script | Fungsi |
|---|---|
| `npm run dev` | Dev server port 3002 |
| `npm run build` | Production build (termasuk serwist SW) |
| `npm run start` | Start production |
| `npm run lint` | Next lint |
| `npm run type-check` | TypeScript type check |

---

## Deployment (Vercel)

1. Push ke GitHub
2. Import ke [Vercel](https://vercel.com)
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
4. Deploy!

---

## Auto-Snapshot Net Worth

Snapshot otomatis tiap awal bulan via pg_cron (butuh Supabase Pro plan):

1. Deploy edge function:
   ```bash
   supabase functions deploy snapshot --no-verify-jwt
   ```
2. Jalankan `supabase/migrations/003_cron_snapshot.sql` di SQL Editor

---

## Lisensi

MIT