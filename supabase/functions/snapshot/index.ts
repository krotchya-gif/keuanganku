// Auto-snapshot Net Worth — dipanggil via pg_cron tiap akhir bulan
// Deploy: supabase functions deploy snapshot-networth --no-verify-jwt
// Schedule: jalankan SQL di Supabase SQL Editor (lihat cron_setup.sql di folder yang sama)

import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      // Ambil aset user
      const { data: assets } = await supabase
        .from("assets")
        .select("category, amount")
        .eq("user_id", user.id);

      // Ambil utang user
      const { data: debts } = await supabase
        .from("debts")
        .select("term, total_amount")
        .eq("user_id", user.id);

      const assetsList = assets ?? [];
      const debtsList = debts ?? [];

      const assetsKas = assetsList
        .filter((a) => a.category === "kas_setara_kas")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const assetsInvestasi = assetsList
        .filter((a) => a.category === "investasi")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const assetsTetap = assetsList
        .filter((a) => a.category === "tetap")
        .reduce((sum, a) => sum + Number(a.amount), 0);

      const debtsPendek = debtsList
        .filter((d) => d.term === "jangka_pendek")
        .reduce((sum, d) => sum + Number(d.total_amount), 0);

      const debtsPanjang = debtsList
        .filter((d) => d.term === "jangka_panjang")
        .reduce((sum, d) => sum + Number(d.total_amount), 0);

      const totalAssets = assetsKas + assetsInvestasi + assetsTetap;
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
