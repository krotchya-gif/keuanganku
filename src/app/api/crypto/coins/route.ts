import { NextResponse } from 'next/server';

export async function GET() {
  const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=idr&order=market_cap_desc&per_page=100&page=1&sparkline=false', { next: { revalidate: 3600 } });
  if (!response.ok) return NextResponse.json({ error: 'Daftar crypto tidak tersedia.' }, { status: 502 });
  const coins = await response.json();
  return NextResponse.json(coins.map((coin: { id: string; symbol: string; name: string }) => ({ id: coin.id, symbol: coin.symbol, name: coin.name })));
}
