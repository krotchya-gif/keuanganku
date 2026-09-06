'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertTriangle, User, RefreshCcw, Settings as SettingsIcon, LogOut, Plus, Trash2 } from 'lucide-react';
import type { Account, AccountType } from '@/shared';
import { fetchAccounts } from '@/lib/queries/onboarding';
import { PageHeader } from '@/components/ui/PageHeader';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Tunai', bank: 'Bank', ewallet: 'E-wallet', crypto: 'Wallet crypto', other: 'Lainnya',
};

export function SettingsContent() {
  const [loading, setLoading] = useState(true);
  const [reseting, setReseting] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'bank' as AccountType, balance: 0 });

  useEffect(() => {
    async function fetchUser() {
      try {
         const supabase = createClient();
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           if (user.email) setEmail(user.email);
           setName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Pengguna');
           setAccounts(await fetchAccounts(user.id));
         }
      } catch (err) {
         console.error(err);
      } finally {
         setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleReset = async () => {
     if (!confirm('PERINGATAN KERAS!\n\nApakah Anda yakin ingin menghapus SEMUA data keuangan Anda? (Aset, Utang, KPR, Jurnal Transaksi, Dompet Anggaran, Target Tabungan). Aksi ini TIDAK BISA dibatalkan.')) return;
     if (!confirm('Apakah Anda BENAR-BENAR YAKIN? Sekali lagi, semua data akan lenyap untuk selamanya.')) return;

     setReseting(true);
     try {
       const supabase = createClient();
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) { setReseting(false); return alert('Sesi berakhir. Silakan masuk kembali.'); }

       // Hapus data yang cuma milik user ini — jalankan paralel (mendekati atomik)
       const results = await Promise.all([
         supabase.from('transactions').delete().eq('user_id', user.id),
         supabase.from('budget_items').delete().eq('user_id', user.id),
         supabase.from('recurring_transactions').delete().eq('user_id', user.id),
         supabase.from('cashflow_items').delete().eq('user_id', user.id),
         supabase.from('assets').delete().eq('user_id', user.id),
         supabase.from('debts').delete().eq('user_id', user.id),
         supabase.from('net_worth_snapshots').delete().eq('user_id', user.id),
         supabase.from('kpr_simulations').delete().eq('user_id', user.id),
         supabase.from('savings_goals').delete().eq('user_id', user.id),
         supabase.from('accounts').delete().eq('user_id', user.id),
       ]);

       if (results.some(r => r.error)) {
         throw new Error('Salah satu tabel gagal dihapus');
       }

       alert('Seluruh data berhasil dihapus. Aplikasi kembali bersih seperti baru dibuat.');
       window.location.href = '/dashboard';
     } catch (err) {
       console.error(err);
       alert('Terjadi kesalahan saat mereset data. Sebagian data mungkin masih tersisa, silakan coba lagi.');
     } finally {
       setReseting(false);
     }
  };

  const addAccount = async () => {
    if (!newAccount.name.trim() || newAccount.balance < 0) return;
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data, error } = await supabase.from('accounts').insert({ user_id: authData.user.id, ...newAccount, name: newAccount.name.trim() }).select().single();
    if (!error && data) { setAccounts((a) => [...a, data as Account]); setNewAccount({ name: '', type: 'bank', balance: 0 }); }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Nonaktifkan rekening ini? Transaksi lama tetap tersimpan.')) return;
    const { error } = await createClient().from('accounts').update({ is_active: false }).eq('id', id);
    if (!error) setAccounts((a) => a.filter((x) => x.id !== id));
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Pengaturan Akun"
        subtitle="Kelola profil pengguna dan manajemen data aplikasi"
        icon={SettingsIcon}
      />

      {/* Profil User */}
      <div className="card-premium p-6">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-4 border-b border-border pb-3">
          <User className="w-4 h-4 text-primary-500" /> Profil Pengguna
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nama Lengkap</label>
            <p className="font-medium text-foreground">{name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Alamat Email</label>
            <p className="font-medium text-foreground">{email}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Status Akun</label>
            <p className="mt-1 flex items-center gap-1 font-medium text-success">
              <span className="block h-2 w-2 rounded-full bg-success" /> Terhubung (tersinkron ke Supabase)
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-danger/10 text-danger hover:bg-danger/20 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" /> Keluar dari Akun
          </button>
        </div>
      </div>

      {/* Ganti Sandi */}
      <div className="card-premium p-6">
        <h2 className="text-sm font-bold mb-4 border-b border-border pb-3">Rekening & Dompet</h2>
        <div className="space-y-2 mb-4">{accounts.map((account) => <div key={account.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5"><div><p className="text-sm font-medium">{account.name}</p><p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]} · Rp {Number(account.balance).toLocaleString('id-ID')}</p></div><button onClick={() => deleteAccount(account.id)} aria-label={`Nonaktifkan ${account.name}`} className="text-danger p-2"><Trash2 className="w-4 h-4" /></button></div>)}</div>
        <div className="grid grid-cols-[1fr_auto] gap-2"><input className="input-field" placeholder="Nama rekening" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} /><input className="input-field" type="number" min="0" placeholder="Saldo awal" value={newAccount.balance || ''} onChange={e => setNewAccount({ ...newAccount, balance: Number(e.target.value) })} /></div>
        <div className="flex gap-2 mt-2"><select className="input-field" value={newAccount.type} onChange={e => setNewAccount({ ...newAccount, type: e.target.value as AccountType })}><option value="cash">Tunai</option><option value="bank">Bank</option><option value="ewallet">E-wallet</option><option value="crypto">Wallet crypto</option><option value="other">Lainnya</option></select><button onClick={addAccount} className="btn-primary"><Plus className="w-4 h-4" /> Tambah</button></div>
      </div>

      <div className="card-premium p-6">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-4 border-b border-border pb-3">
           <AlertTriangle className="w-4 h-4 text-primary-500" /> Keamanan Akun
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Ubah Kata Sandi</p>
            <p className="text-xs text-muted-foreground mb-4">
              Anda akan menerima sebuah tautan di email untuk mereset kata sandi dengan aman.
            </p>
            <button 
              onClick={async () => {
                 try {
                   const supabase = createClient();
                   const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
                   });
                   if (error) throw error;
                   alert('Tautan reset kata sandi telah dikirim ke: ' + email + '\nSilakan periksa kotak masuk Anda.');
                 } catch (err) {
                   console.error(err);
                   alert('Gagal mengirim tautan reset. Periksa email Anda atau coba lagi.');
                 }
              }}
              className="btn-secondary"
            >
              Kirim Tautan Reset
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card-premium border border-red-500/30 bg-red-50/10">
        <div className="px-6 py-4 border-b border-red-500/20 bg-red-500/5">
           <h2 className="flex items-center gap-2 text-sm font-bold text-danger">
             <AlertTriangle className="w-4 h-4" /> Zona Berbahaya
           </h2>
        </div>
        <div className="p-6">
           <p className="mb-1 text-sm font-medium text-foreground">Reset Total Seluruh Data Keuangan</p>
           <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
             Tindakan ini menghapus semua catatan transaksi, dompet anggaran, simulasi KPR, dan portofolio aset.
             Gunakan hanya jika Anda ingin memulai pencatatan kembali dari nol.
           </p>

           <button
             onClick={handleReset}
             disabled={reseting}
             className="flex items-center gap-2 bg-card border border-danger/30 hover:bg-danger/10 hover:border-danger/50 text-danger px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
           >
             {reseting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
             {reseting ? 'Menghapus Data…' : 'Hapus Semua Data'}
           </button>
        </div>
      </div>
    </div>
  );
}
