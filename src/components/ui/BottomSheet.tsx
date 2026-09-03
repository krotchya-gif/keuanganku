'use client';

import { useEffect } from 'react';
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
 * Dilengkapi aksesibilitas dasar: role dialog, Escape untuk menutup,
 * dan lock scroll latar belakang.
 */
export function BottomSheet({ open, onClose, title, children, maxWidth = 'sm:max-w-md' }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Dialog'}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-quick"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxWidth} bg-card border border-border/70 rounded-t-2xl sm:rounded-2xl shadow-2xl animate-sheet-up flex flex-col max-h-[92dvh]`}
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
            className="absolute right-4 top-4 z-10 touch-target flex items-center justify-center text-muted-foreground hover:bg-muted rounded-xl transition-colors"
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
