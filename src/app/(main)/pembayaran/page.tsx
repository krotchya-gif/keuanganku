import type { Metadata } from 'next';
import { PembayaranContent } from './PembayaranContent';

export const metadata: Metadata = { title: 'Pembayaran Tagihan' };

export default function PembayaranPage() {
  return <PembayaranContent />;
}
