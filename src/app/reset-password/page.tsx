'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { Loader2, Key, Eye, EyeOff } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-500';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
       return setError('Kata sandi tidak cocok.');
    }
    if (password.length < 6) {
       return setError('Kata sandi minimal 6 karakter.');
    }

    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setMessage('Kata sandi berhasil diubah! Anda akan dialihkan ke dashboard...');
      setTimeout(() => {
         router.push('/dashboard');
      }, 2000);
    }
  };

  return (
    <AuthShell>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Buat sandi baru</h2>
        <p className="text-muted-foreground text-sm mt-1.5">
          Isi kolom di bawah untuk memperbarui sandi akun Anda.
        </p>
      </div>

      <form onSubmit={handleUpdatePassword} className="mt-8 space-y-4">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">{error}</div>}
        {message ? (
          <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl text-sm font-medium border border-emerald-200 text-center">
            {message}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Sandi Baru</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className={`${inputClass} pl-10 pr-12`}
                  placeholder="••••••••"
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

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Konfirmasi Sandi Baru</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                  className={`${inputClass} pl-10`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition-all mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Sandi Baru'}
            </button>
          </>
        )}
      </form>
    </AuthShell>
  );
}