import type { Metadata } from 'next';
import Link from 'next/link';
import {
  TrendingUp,
  HeartPulse,
  Home,
  PiggyBank,
  Target,
  ArrowRight,
  Wallet,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  CalendarDays,
  BarChart3,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Keuanganku — Manajemen Keuangan Personal',
  description:
    'Aplikasi manajemen keuangan personal lengkap: Net Worth, Arus Kas, Checkup Keuangan, Simulasi KPR, Budgeting, dan Tabungan. Gratis, cepat, dan bisa diakses offline.',
  keywords: ['keuangan', 'budgeting', 'net worth', 'KPR', 'investasi', 'tabungan', 'PWA'],
  openGraph: {
    title: 'Keuanganku — Manajemen Keuangan Personal',
    description:
      'Pantau net worth, arus kas, budgeting, dan kesehatan finansial dalam satu aplikasi. Gratis & offline.',
    type: 'website',
  },
};

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Kekayaan Bersih (Net Worth)',
    desc: 'Pantau total aset, utang, dan kekayaan bersih Anda dengan grafik perkembangan bulanan.',
    color: '#635bff',
  },
  {
    icon: HeartPulse,
    title: 'Checkup Keuangan',
    desc: '6 rasio kesehatan finansial real-time: dana darurat, arus kas, cicilan, investasi, dan lainnya.',
    color: '#3ecf8e',
  },
  {
    icon: Home,
    title: 'Simulasi KPR',
    desc: 'Hitung cicilan KPR bunga tetap maupun bertahap, lengkap dengan tabel amortisasi dan biaya tambahan.',
    color: '#06b6d4',
  },
  {
    icon: PiggyBank,
    title: 'Anggaran Amplop',
    desc: 'Sistem amplop digital: rencanakan, catat transaksi harian, dan evaluasi pengeluaran tanpa bocor.',
    color: '#f5a623',
  },
  {
    icon: Target,
    title: 'Target Tabungan',
    desc: 'Buat goal menabung, pantau progres, dan hitung estimasi bulan mencapai target.',
    color: '#ec4899',
  },
  {
    icon: BarChart3,
    title: 'Evaluasi Tahunan',
    desc: 'Laporan komprehensif pemasukan, pengeluaran, dan pertumbuhan kekayaan Anda selama setahun.',
    color: '#8b5cf6',
  },
];

const TESTIMONIALS = [
  {
    name: 'Andi Pratama',
    role: 'Karyawan Swasta, 29',
    quote:
      'Awalnya cuma buat simulasi KPR, ternyata ketagihan. Sekarang semua keuangan bulanan aku catat di Keuanganku. Fitur checkup-nya ngingetin aku buat perbaiki dana darurat.',
    initial: 'A',
  },
  {
    name: 'Sarah Wijaya',
    role: 'Freelancer, 26',
    quote:
      'Sistem amplop-nya enak banget dipakai. Aku bisa liat realisasi vs rencana tiap kategori, jadi tahu pengeluaran mana yang harus dipangkas.',
    initial: 'S',
  },
  {
    name: 'Budi Santoso',
    role: 'Wirausaha, 34',
    quote:
      'Pernah nyobain banyak aplikasi keuangan, ini paling simpel dan cepat. Bisa dipakai offline juga, jadi catatan tetap jalan walau sinyal lagi jelek.',
    initial: 'B',
  },
];

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
    a: 'Keuanganku menggabungkan 3 alat sekaligus: checkup kesehatan finansial, simulasi KPR, dan budgeting amplop — jadi Anda tidak perlu berpindah aplikasi.',
  },
  {
    q: 'Bagaimana cara menyimpan progres net worth?',
    a: 'Cukup tekan tombol "Simpan Snapshot" di halaman Net Worth setiap awal bulan. Riwayatnya otomatis digambar menjadi grafik perkembangan.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">Keuanganku</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#fitur" className="hover:text-foreground transition-colors">Fitur</a>
            <a href="#testimoni" className="hover:text-foreground transition-colors">Testimoni</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <Link href="/login" className="btn-primary !py-2">
            Masuk <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 text-primary-600 border border-primary-500/20 rounded-full px-4 py-1.5 text-xs font-semibold mb-6">
            <Smartphone className="w-3.5 h-3.5" /> PWA · Gratis · Tanpa Iklan
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Kelola Keuangan<br />
            <span className="gradient-text">dengan Cerdas &amp; Tenang</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Pantau net worth, arus kas, kesehatan finansial, simulasi KPR, dan budgeting amplop —
            semua dalam satu aplikasi yang cepat dan bisa diakses offline.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base">
              Daftar Gratis Sekarang
            </Link>
            <Link href="/login" className="btn-secondary w-full sm:w-auto px-8 py-3.5 text-base">
              Sudah punya akun? Masuk
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 6 Rasio Kesehatan Finansial</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Simulasi KPR Akurat</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Budgeting Amplop</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mode Offline</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="fitur" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Semua Alat Keuangan, Satu Tempat</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Diambil dari 3 metode pencatatan klasik (checkup, simulasi KPR, budgeting amplop) dan disatukan dalam aplikasi yang mudah dipakai di HP.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-premium p-6 hover:border-primary-500/30">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.color}15`, color: f.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimoni" className="bg-muted/40 border-y border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Yang Kata Pengguna</h2>
            <p className="text-muted-foreground mt-3">Mereka sudah mulai mengatur keuangannya lebih baik.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card-premium p-6 flex flex-col">
                <div className="flex gap-1 text-amber-400 mb-4">
                  {'★★★★★'.split('').map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed flex-1 italic">&quot;{t.quote}&quot;</p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border/60">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30 text-sm font-semibold text-primary-500">
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">Pertanyaan yang Sering Diajukan</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card-premium p-5 group">
              <summary className="flex items-center justify-between cursor-pointer font-medium text-sm sm:text-base list-none">
                {f.q}
                <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform ml-3 shrink-0">▼</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="card-premium p-8 sm:p-12 text-center bg-gradient-to-br from-primary-500 to-violet-600 border-transparent text-white">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-white/80" />
          <h2 className="text-2xl sm:text-3xl font-bold">Mulai Atur Keuangan Anda Hari Ini</h2>
          <p className="text-white/80 mt-3 max-w-lg mx-auto">
            Gratis selamanya. Tanpa kartu kredit. Data pribadi hanya milik Anda.
          </p>
          <Link href="/register" className="mt-6 inline-flex items-center gap-2 bg-white text-primary-600 hover:bg-white/90 px-8 py-3.5 rounded-xl font-semibold text-base shadow-lg active:scale-[0.98] transition-all">
            Daftar Sekarang <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">Keuanganku</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Manajemen Keuangan Personal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">Masuk</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Daftar</Link>
            <span>© {new Date().getFullYear()} Keuanganku</span>
          </div>
        </div>
      </footer>
    </div>
  );
}