'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { Loader2, ArrowLeft, Send } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500/35 focus:border-primary-500';

export default function LupaPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Tautan reset password telah dikirim ke email Anda. Periksa kotak masuk atau spam.');
    }
    setLoading(false);
  };

  return (
    <AuthShell>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Lupa password?</h2>
        <p className="text-muted-foreground text-sm mt-1.5">
          Masukkan email Anda untuk menerima tautan reset kata sandi.
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">{error}</div>}
        {message ? (
          <div className="bg-emerald-50 text-emerald-700 p-6 rounded-2xl text-sm font-medium border border-emerald-200 text-center space-y-3">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
              <Send className="w-5 h-5 text-emerald-600" />
            </div>
            <p>{message}</p>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={inputClass}
                placeholder="nama@email.com"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold text-sm transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kirim Tautan Reset'}
            </button>
          </>
        )}
      </form>

      <div className="mt-8 text-center text-sm">
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Login
        </Link>
      </div>
    </AuthShell>
  );
}