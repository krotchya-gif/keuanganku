import type { Metadata } from 'next';
import { NetWorthContent } from './NetWorthContent';

export const metadata: Metadata = { title: 'Kekayaan Bersih' };

export default function NetWorthPage() {
  return <NetWorthContent />;
}
