# Keuanganku — Manajemen Keuangan Personal

Aplikasi manajemen keuangan personal berbasis **Next.js 16** + **PWA** + **Supabase**.
Mengonversi perhitungan dari 3 file Excel (Financial Checkup, Simulasi KPR, Budgeting Sheet) menjadi platform web terpadu dengan tampilan mobile-first.

---

## Fitur

Aplikasi tersusun atas beberapa area utama dengan satu jalur data keuangan:

- **Beranda** — ringkasan kekayaan bersih (hero card + mode privasi), arus kas aktual, progres anggaran, aktivitas pengeluaran, transaksi terbaru
- **Arus Kas (mencatat)** — satu-satunya tempat pencatatan transaksi aktual: buku besar per tanggal dengan sheet "Catat Transaksi" (kategori + rekening sumber/tujuan + keypad), Riwayat timeline, dan Pembayaran Tagihan otomatis
- **Anggaran (merencanakan)** — target anggaran dibandingkan dengan realisasi transaksi aktual
- **Kas Rutin (mengotomatisasi)** — template pemasukan/pengeluaran berulang yang dikaitkan ke rekening dan menghasilkan transaksi otomatis
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
│   │   │   ├── budgeting/    # Pilar Anggaran: rencana vs realisasi
│   │   │   ├── kas-rutin/    # Template transaksi berulang
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
│   │   └── queries/          # accounts, transactions, recurring, crypto, dll
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

## Arsitektur Data Terpadu

`transactions` adalah satu-satunya sumber kejadian keuangan aktual.

```text
accounts → transactions ← recurring_transactions → budget_items
                         ↓
          Arus Kas / Dashboard / Budgeting / Checkup / Net Worth
```

- `accounts` menyimpan saldo rekening/dompet dan diperbarui oleh trigger transaksi.
- `recurring_transactions` hanya template; template tidak dihitung sebagai realisasi sebelum dibuat menjadi transaksi.
- `budget_items` menyimpan target, sedangkan realisasi selalu dihitung dari `transactions`.
- Transfer antar rekening tidak dihitung sebagai pemasukan atau pengeluaran.
- Tipe rekening `cash`, `bank`, dan `ewallet` menjadi sumber kas utama untuk Net Worth; rekening `crypto` hanya menjadi lokasi wallet dan tidak dihitung sebagai kas.
- Aset kas manual yang duplikat tidak dihitung ulang ketika rekening kas aktif tersedia.
- `cashflow_items` hanya dipertahankan untuk kompatibilitas migration lama dan tidak digunakan oleh alur utama.
- Crypto disimpan sebagai holding sederhana; pilihan coin memakai Top 100 market cap CoinGecko dan valuasi Net Worth tetap dalam IDR. Holding crypto dibaca langsung oleh halaman Net Worth dan Edge Function snapshot.
- Wallet crypto dibuat sebagai rekening bertipe `crypto` dari Pengaturan. Rekening ini hanya menghubungkan holding ke lokasi penyimpanan; nilai holding tetap dihitung sebagai Investasi dan saldo rekening tidak otomatis berkurang.
- Harga memakai CoinGecko dengan cache 60 detik; jika tersedia `COINMARKETCAP_API_KEY` server, CoinMarketCap menjadi fallback. Jika keduanya gagal, aplikasi mempertahankan harga terakhir yang tersimpan.

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
# Opsional — hanya dipakai server sebagai fallback harga crypto
COINMARKETCAP_API_KEY=your-coinmarketcap-key
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
   - `supabase/migrations/20260905012415_add_recurring_transactions.sql` — template transaksi berulang
   - `supabase/migrations/20260905012955_generate_due_recurring_transactions.sql` — generator transaksi jatuh tempo
   - `supabase/migrations/20260905014254_link_recurring_to_budget.sql` — sinkronisasi template ke budgeting
   - `supabase/migrations/20260905014411_schedule_recurring_transactions.sql` — scheduler harian
   - `supabase/migrations/20260905015126_harden_rls_and_functions.sql` — hardening RLS dan privilege function
   - `supabase/migrations/20260905020417_atomic_savings_transfer.sql` — transfer tabungan atomik dan sinkronisasi target
   - `supabase/migrations/20260905020627_atomic_bill_payment.sql` — pembayaran tagihan atomik dan anti-duplikasi periode
   - `supabase/migrations/20260905020810_link_bill_to_debt.sql` — kait pembayaran tagihan ke utang
   - `supabase/migrations/20260905021145_harden_savings_consistency.sql` — rekalkulasi target tabungan dari transaksi
   - `supabase/migrations/20260905021209_recurring_savings_generation.sql` — generator transfer tabungan berulang
   - `supabase/migrations/20260905022957_add_crypto_holdings.sql` — holding crypto dan RLS per pengguna
   - `supabase/migrations/20260907010000_harden_financial_integrity.sql` — derived amount dan validasi ownership lintas relasi
   - `supabase/migrations/20260907010100_fix_savings_transfer_derived_amount.sql` — menghapus increment saldo tabungan manual
   - `supabase/migrations/20260907011000_add_crypto_account_type.sql` — tipe rekening khusus wallet crypto

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
   - `COINMARKETCAP_API_KEY` (opsional, fallback harga crypto server-side)
4. Deploy!

---

## Transaksi Berulang

Job `generate-recurring-transactions-daily` aktif di database live setiap hari
pukul 00:05 UTC (07:05 WIB). Job memproses template yang sudah jatuh tempo,
membuat transaksi aktual, memperbarui saldo rekening melalui trigger, dan
menggeser `next_run_date`. Generator juga dipanggil saat halaman Kas Rutin
dibuka sebagai fallback agar data segera diperbarui.

## Crypto di Net Worth

Crypto dicatat sebagai holding (coin, jumlah, dan wallet crypto opsional),
bukan sebagai transaksi jual-beli. Buat wallet dari Pengaturan dengan tipe
`Wallet crypto`, lalu pilih wallet tersebut saat menyimpan holding. Wallet crypto
tidak muncul sebagai Kas & Setara Kas dan saldonya tidak dimasukkan ke total kas.
Nilai holding tetap masuk ke Net Worth sebagai Investasi. Dropdown mengambil Top
100 coin berdasarkan market cap dari CoinGecko. Harga disegarkan saat halaman Net
Worth dibuka dan cache API berlaku 60 detik; data harga terakhir tetap dipakai
jika refresh gagal. Jika `COINMARKETCAP_API_KEY` tersedia di server, CoinMarketCap
digunakan sebagai fallback ketika CoinGecko gagal.

Endpoint yang digunakan:

- `GET /api/crypto/coins` — daftar Top 100 coin.
- `GET /api/crypto/prices` — harga IDR CoinGecko dengan fallback CoinMarketCap.

API key CoinMarketCap bersifat opsional, server-side, dan tidak boleh diberi
prefix `NEXT_PUBLIC_`.

## Auto-Snapshot Net Worth

Snapshot otomatis tiap awal bulan via pg_cron (butuh Supabase Pro plan):

1. Deploy edge function (TANPA `--no-verify-jwt` — handler memverifikasi service key dari header `Authorization`):
   ```bash
   supabase functions deploy snapshot
   ```
2. Jalankan `supabase/migrations/003_cron_snapshot.sql` di SQL Editor

Edge Function snapshot menghitung aset manual, saldo rekening aktif, crypto
(`quantity × current_price_idr`), dan utang. Perubahan pada
`supabase/functions/snapshot/index.ts` harus di-deploy ulang agar snapshot
production memakai alur ini.

---

## Status Implementasi Terakhir (terverifikasi 2026-09-07)

Arsitektur transaksi terpadu dan perbaikan hasil review sudah terverifikasi:

1. **Validasi aplikasi** — `npm run type-check`, `npm run lint`, dan `npm run build` lulus.
2. **Database live** — template transaksi berulang, generator, sinkronisasi budgeting, scheduler, dan hardening RLS sudah diterapkan melalui Supabase MCP.
3. **Jalur data** — onboarding, Kas Rutin, Arus Kas, Dashboard, Budgeting, Checkup, dan Net Worth mengikuti sumber transaksi yang sama.

4. **Crypto** — holding Top 100, valuasi IDR, refresh harga, fallback CoinMarketCap, dan perhitungan snapshot sudah tersedia.
5. **Wallet crypto** — tipe rekening `crypto` tersedia; wallet crypto dikeluarkan dari kas dan ditampilkan sebagai metadata pada crypto holding.
6. **Integritas data** — saldo target tabungan dihitung dari transaksi, field derived dilindungi, relasi finansial divalidasi per user, dan unique crypto memperlakukan wallet kosong sebagai satu lokasi.
7. **Deployment** — perubahan yang sudah di-commit dan dipush ke GitHub akan memicu deploy Vercel otomatis.
8. **Edge function `snapshot`** — tetap digunakan untuk snapshot net worth bulanan dan mengabaikan rekening bertipe `crypto` saat menghitung kas.
9. **Cron snapshot** — job `snapshot-networth-monthly` ada (`0 0 1 * *`), command mengirim header `Authorization` dari vault (secret `service_role_key` + `project_url` ada), histori sukses tiap tanggal 1.
8. **Uji handler snapshot** (tanpa menulis data produksi — `cron.run_job` tidak tersedia di versi pg_cron ini, jadi pakai curl):
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
9. **(Opsional) Hapus akun QA** `qa-redesign@keuanganku.test` melalui Dashboard → Authentication → Users.

---

## Lisensi

MIT
