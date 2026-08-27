# Keuanganku — Manajemen Keuangan Personal

Aplikasi manajemen keuangan personal berbasis **Next.js 14** + **PWA** + **Supabase**.
Mengonversi perhitungan dari 3 file Excel (Financial Checkup, Simulasi KPR, Budgeting Sheet) menjadi platform web terpadu dengan tampilan mobile-first.

---

## Fitur

- **Landing Page** — Halaman pemasaran di `/` (hero, fitur, testimoni, FAQ) untuk pengunjung yang belum login
- **Net Worth & Snapshot** — Tracking aset, utang, dan kekayaan bersih bulanan
- **Arus Kas** — Pencatatan pemasukan & pengeluaran, surplus/defisit
- **Financial Checkup** — 6 rasio kesehatan keuangan (Dana Darurat, Arus Kas, Cicilan, Investasi, Biaya Hidup, Solvabilitas) dengan radar chart
- **Simulasi KPR** — Kalkulasi amortisasi iterative, dukung bunga fix + floating berjenjang, biaya tambahan (BPHTB, PPN, AJB, BBN), tabel amortisasi 20 baris/halaman + Tampilkan Semua
- **Budgeting (Amplop)** — Zero-based budgeting, jurnal harian, evaluasi rencana vs realisasi
- **Tabungan & Investasi** — Progress tracker per target
- **Kalender Pembayaran** — Ceklis tagihan & cicilan
- **Evaluasi Tahunan** — Laporan komprehensif per bulan
- **PWA** — Install prompt (1×/24 jam), offline fallback, service worker cache strategy

---

## Tech Stack

| Stack | Teknologi |
|---|---|
| Framework | Next.js 14.2.35 (App Router) |
| Bahasa | TypeScript 5.9 |
| Styling | Tailwind CSS 3 (design tokens custom, tanpa shadcn/ui) |
| Charts | Recharts 2.15 |
| Forms | Hand-rolled `useState` (tanpa library form) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email) |
| PWA | @serwist/next 9.5 |
| Deployment | Vercel |

---

## Struktur Project

```
app keuangan/
├── src/
│   ├── app/
│   │   ├── (main)/           # Protected routes + sidebar + bottom nav
│   │   │   ├── dashboard/
│   │   │   ├── net-worth/
│   │   │   ├── arus-kas/
│   │   │   ├── checkup/
│   │   │   ├── kpr/
│   │   │   ├── budgeting/
│   │   │   ├── pembayaran/
│   │   │   ├── kalendar/
│   │   │   ├── tabungan/
│   │   │   ├── evaluasi/
│   │   │   └── settings/
│   │   ├── page.tsx          # Landing page (public)
│   │   ├── login/ register/ lupa-password/ reset-password/
│   │   └── auth/callback/
│   ├── components/
│   │   ├── auth/             # AuthShell (single-column app screen)
│   │   ├── charts/           # ChartTooltip, ChartTheme
│   │   ├── layout/           # Sidebar (desktop), InstallPrompt
│   │   └── ui/               # BottomSheet, StatCard, TableScroll, PageHeader, dll
│   ├── lib/
│   │   ├── utils.ts          # formatRupiah, formatRupiahCompact, dll
│   │   ├── export.ts         # exportCSV, exportPDF
│   │   └── queries/          # assets, debts, cashflow, transactions, dll
│   ├── shared/
│   │   ├── formulas/         # networth, cashflow, checkup, kpr, budgeting
│   │   ├── types/            # Semua TypeScript interfaces
│   │   └── constants/
│   ├── utils/supabase/       # client, server, middleware
│   └── middleware.ts         # Auth middleware (getClaims)
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