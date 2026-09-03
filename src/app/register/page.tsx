'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { Eye, EyeOff, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:border-primary-500';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(
          error.message.includes('already registered')
            ? 'Email ini sudah terdaftar. Silakan login.'
            : error.message
        );
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Akun berhasil dibuat!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Selamat datang, <strong>{fullName}</strong>! Jika email konfirmasi diaktifkan, silakan
            cek inbox Anda dan klik link verifikasi sebelum masuk.
          </p>
          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
          >
            Masuk ke Keuanganku
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthShell>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Buat akun baru</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Gratis selamanya, tanpa kartu kredit.</p>
      </div>

      <form onSubmit={handleRegister} className="mt-8 space-y-5">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-1.5">
            Nama Lengkap
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama Anda"
            required
            autoComplete="name"
            className={inputClass}
          />
        </div>

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
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              autoComplete="new-password"
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
          <p className="text-xs text-muted-foreground mt-1">Minimal 6 karakter</p>
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
            <UserPlus className="w-4 h-4" />
          )}
          {loading ? 'Memproses...' : 'Daftar Sekarang'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-7">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline">
          Masuk di sini
        </Link>
      </p>
    </AuthShell>
  );
}