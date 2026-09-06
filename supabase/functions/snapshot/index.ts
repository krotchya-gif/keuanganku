// Auto-snapshot Net Worth — dipanggil via pg_cron tiap awal bulan
// Deploy: supabase functions deploy snapshot
//   (JANGAN pakai --no-verify-jwt — handler memverifikasi service key sendiri)
// Schedule: jalankan SQL di Supabase SQL Editor (lihat cron_setup.sql di folder yang sama)

import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    // Wajib: hanya cron/dashboard yang membawa service role key boleh memicu.
    // Cron SQL (003_cron_snapshot.sql) sudah mengirim header ini.
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ ok: false, error: "Tidak berwenang" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // Ambil semua user
    const { data: users, error: userErr } = await supabase
      .from("users")
      .select("id");

    if (userErr) throw userErr;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ ok: true, snapshots: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const snapshotDate = new Date().toISOString().split("T")[0];
    let snapshotsCreated = 0;

    for (const user of users) {
      // Ambil aset user — gagal? lewati user ini, JANGAN menimpa snapshot dengan nol.
      const { data: assets, error: assetsErr } = await supabase
        .from("assets")
        .select("category, amount, name, is_emergency_fund")
        .eq("user_id", user.id);
      if (assetsErr) {
        console.error(`Gagal membaca aset user ${user.id}, dilewati:`, assetsErr.message);
        continue;
      }

      // Ambil utang user — perlakuan sama.
      const { data: debts, error: debtsErr } = await supabase
        .from("debts")
        .select("term, total_amount")
        .eq("user_id", user.id);
      if (debtsErr) {
        console.error(`Gagal membaca utang user ${user.id}, dilewati:`, debtsErr.message);
        continue;
      }

      // Rekening adalah sumber kebenaran untuk kas. Crypto disimpan terpisah
      // dari assets, jadi masukkan nilai terakhir yang berhasil disimpan.
      const [{ data: accounts, error: accountsErr }, { data: cryptoHoldings, error: cryptoErr }] = await Promise.all([
        supabase.from("accounts").select("balance, type").eq("user_id", user.id).neq("type", "crypto"),
        supabase.from("crypto_holdings").select("quantity, current_price_idr").eq("user_id", user.id),
      ]);
      if (accountsErr || cryptoErr) {
        console.error(`Gagal membaca rekening/crypto user ${user.id}, dilewati:`, accountsErr?.message ?? cryptoErr?.message);
        continue;
      }

      const assetsList = assets ?? [];
      const debtsList = debts ?? [];

      // Saat ada rekening, aset kas manual biasa sudah terwakili oleh saldo
      // rekening. Dana darurat tetap dipertahankan sebagai aset manual.
      const manualAssets = accounts && accounts.length > 0
        ? assetsList.filter((a) => a.category !== "kas_setara_kas" || a.is_emergency_fund === true || a.name.toLowerCase().includes("dana darurat"))
        : assetsList;

      const assetsKas = manualAssets
        .filter((a) => a.category === "kas_setara_kas")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const accountKas = (accounts ?? []).reduce((sum, a) => sum + Number(a.balance), 0);

      const assetsInvestasi = manualAssets
        .filter((a) => a.category === "investasi")
        .reduce((sum, a) => sum + Number(a.amount), 0) +
        (cryptoHoldings ?? []).reduce((sum, h) => sum + Number(h.quantity) * Number(h.current_price_idr), 0);

      const assetsTetap = manualAssets
        .filter((a) => a.category === "tetap")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const debtsPendek = debtsList
        .filter((d) => d.term === "jangka_pendek")
        .reduce((sum, d) => sum + Number(d.total_amount), 0);

      const debtsPanjang = debtsList
        .filter((d) => d.term === "jangka_panjang")
        .reduce((sum, d) => sum + Number(d.total_amount), 0);

      const totalAssets = assetsKas + accountKas + assetsInvestasi + assetsTetap;
      const totalDebts = debtsPendek + debtsPanjang;
      const netWorth = totalAssets - totalDebts;

      // Ambil snapshot bulan sebelumnya untuk growth percentage
      const prevMonth = new Date();
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevDate = prevMonth.toISOString().split("T")[0];

      const { data: prevSnap } = await supabase
        .from("net_worth_snapshots")
        .select("net_worth")
        .eq("user_id", user.id)
        .eq("snapshot_date", prevDate)
        .single();

      const growthPercentage =
        prevSnap && Number(prevSnap.net_worth) > 0
          ? (netWorth - Number(prevSnap.net_worth)) / Number(prevSnap.net_worth)
          : null;

      // Upsert snapshot
      const { error: upsertErr } = await supabase.from("net_worth_snapshots").upsert(
        {
          user_id: user.id,
          snapshot_date: snapshotDate,
          total_assets: totalAssets,
          assets_kas: assetsKas,
          assets_investasi: assetsInvestasi,
          assets_tetap: assetsTetap,
          total_debts: totalDebts,
          debts_jangka_pendek: debtsPendek,
          debts_jangka_panjang: debtsPanjang,
          net_worth: netWorth,
          growth_percentage: growthPercentage,
        },
        { onConflict: "user_id, snapshot_date" }
      );

      if (upsertErr) {
        console.error(`Gagal upsert snapshot untuk user ${user.id}:`, upsertErr);
      } else {
        snapshotsCreated++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, snapshots: snapshotsCreated, total: users.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Snapshot error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
