# Keuanganku — Manajemen Keuangan Personal

Aplikasi manajemen keuangan personal berbasis **Next.js 16** + **PWA** + **Supabase**.
Mengonversi perhitungan dari 3 file Excel (Financial Checkup, Simulasi KPR, Budgeting Sheet) menjadi platform web terpadu dengan tampilan mobile-first.

---

## Fitur

Aplikasi tersusun atas **4 pilar** agar tidak membingungkan pengguna:

- **Beranda** — ringkasan kekayaan bersih (hero card + mode privasi), arus kas aktual, progres anggaran, aktivitas pengeluaran, transaksi terbaru
- **Arus Kas (mencatat)** — satu-satunya tempat pencatatan transaksi: buku besar per tanggal dengan sheet "Catat Transaksi" (kategori + rekening sumber/tujuan + keypad), Riwayat timeline, dan Pembayaran Tagihan otomatis
- **Anggaran (merencanakan)** — Evaluasi rencana vs realisasi, Dompet anggaran, Kas Rutin Bulanan (dasar Checkup), dan Tabungan & Investasi berbasis transfer antar rekening
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
│   │   │   ├── budgeting/    # Pilar Anggaran: evaluasi + dompet
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
│   │   ├── 004_dana_darat_flag.sql
│   │   └── 005_seed_default_categories.sql
│   └── functions/
│       └── snapshot/           # Auto-snapshot (Deno)
├── sw.ts                     # Service worker (serwist)
├── next.config.mjs
└── package.json
```

---

## Setup Development

### Database source of truth

`supabase/fullschema.sql` adalah backup lokal sekaligus sumber perubahan schema
yang canonical. Sebelum dan sesudah perubahan Supabase, bandingkan file ini
dengan database live menggunakan Supabase MCP. DDL harus dilakukan melalui MCP,
lalu file ini wajib diperbarui bersama migration terkait. Seed data, Vault
secret, API key, dan konfigurasi cron environment-specific tidak boleh dimasukkan
ke dalam file tersebut. Detail aturan agent ada di `AGENTS.md`.

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
   - `supabase/migrations/005_seed_default_categories.sql` — wajib (seed kategori/dompet bawaan: trigger untuk user baru + backfill user lama yang belum punya kategori)
   - `supabase/migrations/20260904115104_add_onboarding_accounts.sql` — onboarding dan rekening
   - `supabase/migrations/20260904130039_add_transaction_accounts.sql` — relasi transaksi ke rekening
   - `supabase/migrations/20260904132915_add_savings_transfer_workflow.sql` — transfer tabungan dan target
   - `supabase/migrations/20260904133352_enforce_account_balances.sql` — sinkronisasi saldo rekening otomatis

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

1. Deploy edge function (TANPA `--no-verify-jwt` — handler memverifikasi service key dari header `Authorization`):
   ```bash
   supabase functions deploy snapshot
   ```
2. Jalankan `supabase/migrations/003_cron_snapshot.sql` di SQL Editor

---

## Status Deploy Terakhir (terverifikasi 2026-09-04)

Redesain UI (IA 4 pilar) dan perbaikan hasil review sudah live di production:

1. **Push ke GitHub** — selesai, `main` sudah sinkron dengan `origin/main`; deploy Vercel berjalan otomatis.
2. **Edge function `snapshot`** — sudah redeploy (versi 2, ACTIVE, `verify_jwt: true`, deploy **tanpa** `--no-verify-jwt`). Handler menolak request tanpa `Authorization: Bearer <service_role_key>` dengan 401 sebelum menyentuh database.
3. **Cron snapshot** — job `snapshot-networth-monthly` ada (`0 0 1 * *`), command mengirim header `Authorization` dari vault (secret `service_role_key` + `project_url` ada), histori sukses tiap tanggal 1.
4. **Uji handler snapshot** (tanpa menulis data produksi — `cron.run_job` tidak tersedia di versi pg_cron ini, jadi pakai curl):
   ```bash
   # Tanpa header → 401 dari gateway (platform JWT gate aktif)
   curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/snapshot" \
     -H "Content-Type: application/json"
   # Dengan anon key (JWT valid tapi bukan service key) → 401 dari handler baru:
   # {"ok":false,"error":"Tidak berwenang"}
   curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/snapshot" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <ANON_KEY>"
   ```
5. **(Opsional) Hapus akun QA** `qa-redesign@keuanganku.test` melalui Dashboard → Authentication → Users.

---

## Lisensi

MIT
