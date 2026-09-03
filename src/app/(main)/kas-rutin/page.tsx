import type { Metadata } from 'next';
import { KasRutinContent } from './KasRutinContent';

export const metadata: Metadata = { title: 'Kas Rutin Bulanan' };

export default function KasRutinPage() {
  return <KasRutinContent />;
}
