'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Download, X } from 'lucide-react';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Never auto-reload mid-game when an update is found
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // A new version is cached and available on next clean launch
                }
              };
            }
          };
        })
        .catch(() => {
          // Ignore registration failures in private browsing / unsupported environments
        });
    }

    // 2. Online / Offline Monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // 3. PWA Install Prompt Listener
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show subtle hint on landing page if not dismissed previously
      if (typeof window !== 'undefined' && !localStorage.getItem('mafia-pwa-dismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mafia-pwa-dismissed', '1');
    }
  };

  return (
    <>
      {/* Offline Alert Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-50 bg-red-950/95 border-b border-red-700/80 px-4 py-2 text-red-200 text-xs flex items-center justify-center gap-2 backdrop-blur-sm"
        >
          <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>You are currently offline. Multiplayer game sync requires an internet connection.</span>
        </div>
      )}

      {/* Subtle PWA Install Banner */}
      {showInstallBanner && deferredPrompt && (
        <aside
          aria-label="Install App"
          className="fixed bottom-4 right-4 z-40 bg-surface border border-border p-3 max-w-sm shadow-2xl flex items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-white shrink-0" />
            <div>
              <div className="font-bold text-white">Install Mafia App</div>
              <div className="text-muted text-[11px]">Play fullscreen on your home screen</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-2.5 py-1 bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismissInstall}
              className="p-1 text-muted hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {children}
    </>
  );
}
