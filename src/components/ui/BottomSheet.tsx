'use client';

import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * BottomSheet — mobile: sheet dari bawah, desktop: modal tengah.
 * Pengganti modal hand-rolled (fixed inset-0) agar konsisten & mobile-friendly.
 */
export function BottomSheet({ open, onClose, title, children, maxWidth = 'sm:max-w-md' }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-quick"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxWidth} bg-card border border-border/60 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-sheet-up flex flex-col max-h-[92dvh]`}
      >
        <div className="sm:hidden pt-3">
          <div className="sheet-handle" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 shrink-0">
            <h3 className="font-semibold text-foreground text-base">{title}</h3>
            <button
              onClick={onClose}
              className="touch-target flex items-center justify-center text-muted-foreground hover:bg-muted rounded-xl transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 touch-target flex items-center justify-center text-muted-foreground hover:bg-muted rounded-xl transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="p-5 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}