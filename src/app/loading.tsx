import { Skeleton } from '@/components/ui/Skeleton';

/** Loading UI rute — skeleton ringan mengikuti pola halaman. */
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    </div>
  );
}
