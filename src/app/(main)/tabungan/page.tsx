import type { Metadata } from 'next';
import { TabunganContent } from './TabunganContent';

export const metadata: Metadata = { title: 'Tabungan & Investasi' };

export default function TabunganPage() {
  return <TabunganContent />;
}
