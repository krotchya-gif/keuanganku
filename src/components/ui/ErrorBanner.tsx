import { AlertCircle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** ErrorBanner — pemberitahuan gagal muat data yang tampil inline di atas konten. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-2 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {message}
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
