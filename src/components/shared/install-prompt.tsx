"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallPromptProps {
  className?: string;
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Lazy initializers for browser-only values
const getInitialIsIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const getInitialIsInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
};

const getInitialShowPrompt = (): boolean => {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem('install-prompt-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10);
    const week = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedTime < week) {
      return false;
    }
  }
  return false;
};

export function InstallPrompt({ className }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(getInitialShowPrompt);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(getInitialIsIOS);
  const [isInstalled, setIsInstalled] = useState(getInitialIsInstalled);

  useEffect(() => {
    // Register service worker in production only
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    if (isInstalled) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show prompt after a delay if not installed and not iOS
    const timer = setTimeout(() => {
      if (!isInstalled && !isIOS && !deferredPrompt) {
        setShowPrompt(true);
      }
    }, 30000); // 30 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [deferredPrompt, isInstalled, isIOS]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // For iOS, show instructions
      alert('To install: Tap the Share button, then "Add to Home Screen"');
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('install-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-card p-4 shadow-elevation-4 animate-slide-in-from-bottom",
        className
      )}
      role="dialog"
      aria-label="Install app"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">Install AI Tutor</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add to home screen for offline access and better experience
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          onClick={handleInstall}
          className="flex-1"
          size="sm"
        >
          <Download className="mr-2 h-4 w-4" />
          Install
        </Button>
        <Button
          variant="outline"
          onClick={handleDismiss}
          className="flex-1"
          size="sm"
        >
          Not now
        </Button>
      </div>
    </div>
  );
}