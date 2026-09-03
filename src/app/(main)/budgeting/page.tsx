import type { Metadata } from 'next';
import { BudgetingContent } from './BudgetingContent';

export const metadata: Metadata = { title: 'Anggaran' };

export default function BudgetingPage() {
  return <BudgetingContent />;
}
