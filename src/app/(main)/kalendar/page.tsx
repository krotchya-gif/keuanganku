import type { Metadata } from 'next';
import { KalendarContent } from './KalendarContent';

export const metadata: Metadata = { title: 'Riwayat Transaksi' };

export default function KalendarPage() {
  return <KalendarContent />;
}
