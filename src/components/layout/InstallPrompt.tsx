'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'keuanganku_install_prompt';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 jam

type StoredValue = { accepted: true } | { dismissedAt: number };

function readStorage(): StoredValue | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredValue;
  } catch {
    return null;
  }
}

function writeStorage(value: StoredValue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // storage penuh / private mode — abaikan
  }
}

function canShowPrompt(): boolean {
  const stored = readStorage();
  if (!stored) return true;
  if ('accepted' in stored) return false;
  return Date.now() - stored.dismissedAt >= DISMISS_COOLDOWN_MS;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Catat sejak pertama kali banner ditampilkan. Event ini dapat dipicu
      // ulang saat navigasi/refresh sebelum user menekan tombol apa pun.
      if (canShowPrompt()) {
        writeStorage({ dismissedAt: Date.now() });
        setShow(true);
      }
    };
    const installedHandler = () => {
      writeStorage({ accepted: true });
      setShow(false);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const dismiss = () => {
    writeStorage({ dismissedAt: Date.now() });
    setShow(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        writeStorage({ accepted: true });
        setShow(false);
      } else {
        dismiss();
      }
    } catch (err) {
      console.error('Install prompt failed:', err);
      setShow(false);
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[45] animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-xl shadow-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install Aplikasi</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pasang di layar utama untuk akses lebih cepat</p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={handleInstall} className="bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors">
              Install
            </button>
            <button onClick={dismiss} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">
              Nanti
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
