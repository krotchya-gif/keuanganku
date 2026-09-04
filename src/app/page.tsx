import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeftRight,
  BarChart3,
  Check,
  ChevronDown,
  History,
  House,
  PiggyBank,
  Plus,
  Smartphone,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Keuanganku - Manajemen Keuangan Personal',
  description:
    'Aplikasi manajemen keuangan personal lengkap: Kekayaan Bersih, Arus Kas, Checkup Keuangan, Simulasi KPR, Anggaran, dan Tabungan. Gratis, cepat, dan bisa diakses offline.',
  keywords: ['keuangan', 'budgeting', 'net worth', 'KPR', 'investasi', 'tabungan', 'PWA'],
  openGraph: {
    title: 'Keuanganku - Manajemen Keuangan Personal',
    description:
      'Pantau kekayaan bersih, arus kas, anggaran, dan kesehatan finansial dalam satu aplikasi. Gratis & offline.',
    type: 'website',
  },
};

const FAQS = [
  {
    q: 'Apakah Keuanganku gratis?',
    a: 'Ya, semua fitur inti (Kekayaan Bersih, Arus Kas, Checkup, Simulasi KPR, Anggaran, dan Tabungan) gratis digunakan.',
  },
  {
    q: 'Data keuangan saya aman tidak?',
    a: 'Data Anda disimpan di Supabase (PostgreSQL) dengan enkripsi saat transmisi. Setiap pengguna hanya bisa mengakses datanya sendiri (Row Level Security).',
  },
  {
    q: 'Bisa dipakai tanpa internet?',
    a: 'Bisa. Keuanganku adalah Progressive Web App (PWA). Setelah dipasang ke layar utama, aplikasi tetap bisa dibuka saat offline.',
  },
  {
    q: 'Apa bedanya dengan aplikasi budgeting lain?',
    a: 'Keuanganku menggabungkan 3 alat sekaligus: checkup kesehatan finansial, simulasi KPR, dan anggaran dompet, jadi Anda tidak perlu berpindah aplikasi.',
  },
  {
    q: 'Bagaimana cara menyimpan progres kekayaan bersih?',
    a: 'Cukup tekan tombol "Simpan Snapshot" di halaman Kekayaan Bersih setiap awal bulan. Riwayatnya otomatis digambar menjadi grafik perkembangan.',
  },
];

/** Bingkai ponsel CSS untuk menampilkan screenshot produk asli. `large` untuk section showcase. */
function PhoneFrame({ src, alt, priority = false, large = false }: { src: string; alt: string; priority?: boolean; large?: boolean }) {
  return (
    <div className={`relative mx-auto ${large ? 'w-[300px] sm:w-[340px]' : 'w-[240px] sm:w-[270px]'}`}>
      <div className="rounded-[2.6rem] border border-zinc-800/80 bg-zinc-900 p-[10px] shadow-[0_24px_60px_-16px_rgba(15,23,42,0.35)] dark:border-zinc-700 dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)]">
        <div className="relative overflow-hidden rounded-[2rem] bg-white">
          {/* unoptimized: file lokal 390px, hindari ketergantungan pipeline optimizer */}
          <Image
            src={src}
            alt={alt}
            width={390}
            height={844}
            priority={priority}
            unoptimized
            className="block h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Keuanganku</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#fitur" className="transition-colors hover:text-foreground">Fitur</a>
            <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-secondary !px-4 !py-2 text-sm">Masuk</Link>
            <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">Daftar</Link>
          </div>
        </div>
      </header>

      {/* ── HERO: copy kiri, produk kanan ── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tighter sm:text-5xl lg:text-6xl">
              Uang Anda, tercatat rapi.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Catat arus kas, jalankan anggaran dompet, dan hitung KPR dari satu aplikasi ringan yang bisa dipakai offline.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="btn-primary px-7 py-3.5 text-base">
                Mulai Gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="btn-secondary px-7 py-3.5 text-base">
                Masuk
              </Link>
            </div>
            <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" /> Gratis, tanpa iklan</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" /> Data hanya milik Anda</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" /> Bisa dipakai offline</span>
            </p>
          </div>
          <div className="relative">
            <PhoneFrame src="/landing/beranda.png" alt="Tampilan Beranda aplikasi Keuanganku" priority />
          </div>
        </div>
      </section>

      {/* ── PILAR 1: Mencatat ── */}
      <section id="fitur" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
              <Plus className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Mencatat sesingkat mungkin</h2>
            <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
              Pilih pemasukan atau pengeluaran, ketuk kategorinya, isi nominal lewat keypad. Selesai dalam hitungan detik,
              bahkan saat sinyal hilang.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Kategori berbentuk chip, tanpa dropdown</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Riwayat terarsip rapi per tanggal</li>
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <PhoneFrame src="/landing/catat.png" alt="Form Catat Transaksi dengan pilihan kategori chip dan keypad" />
          </div>
        </div>
      </section>

      {/* ── PILAR 2: Anggaran ── */}
      <section className="border-t border-border/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <PiggyBank className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Anggaran dompet yang disiplin</h2>
            <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
              Bagi gaji ke dompet bulanan, lalu bandingkan rencana dengan realisasi. Alokasi yang meleset langsung
              kelihatan sebelum jadi kebocoran.
            </p>
          </div>
          <div>
            <PhoneFrame src="/landing/anggaran.png" alt="Evaluasi anggaran: rencana vs realisasi per kategori" />
          </div>
        </div>
      </section>

      {/* ── PILAR 3: KPR (showcase penuh — foto tampil besar sendiri) ── */}
      <section className="overflow-hidden border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <House className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Simulasi KPR yang serius</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Jadwal amortisasi bulanan sampai akhir tenor, bunga tetap dan bertahap, plus perkiraan total biaya di
              luar uang muka. Semua angka dihitung lokal, tanpa dikirim ke mana pun.
            </p>
          </div>
          <div className="relative mt-12 flex justify-center sm:mt-16">
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[420px] w-[min(92vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/10 blur-3xl"
            />
            <PhoneFrame large src="/landing/kpr.png" alt="Form dan hasil Simulasi KPR" />
          </div>
        </div>
      </section>

      {/* ── FITUR PENDUKUNG (daftar ringkas, bukan kartu kembar) ── */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {[
              {
                icon: TrendingUp,
                title: 'Kekayaan bersih terpantau',
                desc: 'Aset, kewajiban, dan snapshot bulanan jadi grafik perkembangan.',
              },
              {
                icon: BarChart3,
                title: 'Checkup keuangan',
                desc: 'Enam rasio kesehatan finansial dengan penilaian sehat hingga bahaya.',
              },
              {
                icon: History,
                title: 'Riwayat transparan',
                desc: 'Semua transaksi terarsip per tanggal, bisa diekspor ke CSV.',
              },
              {
                icon: Smartphone,
                title: 'Pasang di layar utama',
                desc: 'Berjalan seperti aplikasi biasa di Android, iPhone, dan desktop.',
              },
            ].map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-primary-500">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KUTIPAN PENGGUNA ── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <blockquote className="text-xl font-medium leading-relaxed tracking-tight sm:text-2xl">
            &ldquo;Aku bisa lihat realisasi vs rencana tiap kategori, jadi tahu pengeluaran mana yang harus dipangkas.&rdquo;
          </blockquote>
          <p className="mt-5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Sarah Wijaya</span> · Freelancer, pengguna sejak 2026
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pertanyaan yang sering diajukan</h2>
        <div className="mt-8 divide-y divide-border/70 border-y border-border/70">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium sm:text-base">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA AKHIR ── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-primary-600 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Mulai malam ini.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/80 sm:text-base">
            Daftar dalam dua menit. Gratis selamanya, tanpa kartu kredit.
          </p>
          <Link
            href="/register"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-primary-700 shadow-lg transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            Daftar Gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Keuanganku</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeftRight className="h-3 w-3" /> Manajemen Keuangan Personal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">Masuk</Link>
            <Link href="/register" className="transition-colors hover:text-foreground">Daftar</Link>
            <span>© {new Date().getFullYear()} Keuanganku</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
