'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:border-primary-500';

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
    <AuthShell>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Masuk ke akun Anda</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Lanjutkan pantauan keuangan Anda.</p>
      </div>

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <Link
              href="/lupa-password"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
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
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 touch-target flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
          className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition-all"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {loading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-7">
        Belum punya akun?{' '}
        <Link href="/register" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline">
          Daftar gratis
        </Link>
      </p>
    </AuthShell>
  );
}