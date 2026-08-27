'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff, LogIn, Loader2, TrendingUp, Shield, BarChart3, Wallet } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();

      // Timeout 10 detik
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
      );
      const authPromise = supabase.auth.signInWithPassword({ email, password });

      const { error } = await Promise.race([authPromise, timeoutPromise]) as Awaited<typeof authPromise>;

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setError('Email belum dikonfirmasi. Silakan cek inbox email Anda dan klik link verifikasi, lalu coba masuk kembali.');
        } else if (error.message === 'Invalid login credentials') {
          setError('Email atau password salah. Silakan coba lagi.');
        } else {
          setError(error.message);
        }
        setLoading(false);
      } else {
        // Gunakan hard redirect agar middleware dan cookies membaca ulang secara sempurna
        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'timeout') {
        setError('Koneksi timeout. Pastikan koneksi internet Anda stabil, lalu coba lagi.');
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-500 to-violet-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold">Keuanganku</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Kelola keuangan<br />dengan cerdas
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Pantau net worth, arus kas, budgeting, dan kesehatan finansial Anda dalam satu platform.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-4">
          {[
            { icon: BarChart3, title: 'Net Worth Tracker', desc: 'Pantau pertumbuhan aset dan utang Anda' },
            { icon: Shield, title: 'Checkup Keuangan', desc: '6 rasio kesehatan finansial real-time' },
            { icon: TrendingUp, title: 'Simulasi KPR', desc: 'Hitung cicilan KPR dengan akurat' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <f.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p className="text-white/60 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="flex lg:hidden flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-glow mb-3">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Keuanganku</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Selamat datang kembali</h2>
            <p className="text-muted-foreground text-sm mt-1">Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                required
                autoComplete="email"
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <Link href="/lupa-password" className="text-xs font-medium text-primary-500 hover:text-primary-600 hover:underline">
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 touch-target flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Belum punya akun?{' '}
            <Link href="/register" className="text-primary-500 hover:text-primary-600 font-medium hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}