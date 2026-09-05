import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.get('ids')?.trim();
  const symbols = new URL(request.url).searchParams.get('symbols')?.trim();
  if (!ids || !ids.split(',').every((id) => /^[a-z0-9-]+$/i.test(id))) {
    return NextResponse.json({ error: 'Daftar coin tidak valid.' }, { status: 400 });
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=idr&include_last_updated_at=true`;
  const response = await fetch(url, { next: { revalidate: 60 } });
  if (response.ok) return NextResponse.json(await response.json());

  // Optional server-side fallback. CoinMarketCap requires a server-only API key.
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  if (apiKey) {
    const fallback = await fetch(`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbols || ids)}`, { headers: { 'X-CMC_PRO_API_KEY': apiKey }, next: { revalidate: 60 } });
    if (fallback.ok) {
      const payload = await fallback.json() as { data?: Record<string, { quote?: { IDR?: { price?: number; last_updated?: string } } }> };
      const normalized: Record<string, { idr: number; last_updated_at?: number }> = {};
      for (const [key, value] of Object.entries(payload.data ?? {})) {
        const quote = value.quote?.IDR;
        if (quote?.price) normalized[key.toLowerCase()] = { idr: quote.price, last_updated_at: quote.last_updated ? Math.floor(new Date(quote.last_updated).getTime() / 1000) : undefined };
      }
      if (Object.keys(normalized).length) return NextResponse.json(normalized);
    }
  }
  return NextResponse.json({ error: 'Harga crypto tidak tersedia.' }, { status: 502 });
}
