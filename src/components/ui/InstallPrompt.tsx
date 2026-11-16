"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallPromptProps {
  onDismiss?: () => void;
  className?: string;
}

export function InstallPrompt({ onDismiss, className }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = React.useState(() => {
    // Check if already dismissed recently (lazy init)
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    if (isStandalone || isInWebAppiOS) return false;
    
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const week = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < week) return false;
    }
    return true; // Show prompt by default
  });
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  
  // Initialize platform detection directly to avoid synchronous setState in effect
  const [isIOS, setIsIOS] = React.useState(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  });
  const [isAndroid, setIsAndroid] = React.useState(() => {
    if (typeof navigator === 'undefined') return false;
    return /Android/.test(navigator.userAgent);
  });

  React.useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    
    if (isStandalone || isInWebAppiOS) {
      return; // Already installed
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    // Also show prompt after a delay if event doesn't fire (fallback)
    const timer = setTimeout(() => {
      if (!deferredPrompt && !isStandalone && !isInWebAppiOS) {
        setShowPrompt(true);
      }
    }, 30000); // 30 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[InstallPrompt] User ${outcome} the install prompt`);
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
        onDismiss?.();
      }
    } else if (isIOS) {
      // iOS - show instructions
      alert('To install: Tap the Share button (square with arrow up) and select "Add to Home Screen"');
    } else if (isAndroid) {
      // Android - might show browser menu
      alert('To install: Tap the menu (⋮) and select "Install app" or "Add to Home Screen"');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    onDismiss?.();
  };

  if (!showPrompt) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up",
        className
      )}
      role="dialog"
      aria-label="Install app prompt"
    >
      <div className="bg-card border shadow-xl rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {isIOS ? (
              <Smartphone className="h-6 w-6 text-primary" />
            ) : isAndroid ? (
              <Smartphone className="h-6 w-6 text-primary" />
            ) : (
              <Monitor className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install AI Tutor</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isIOS
                ? 'Add to Home Screen for offline access and push notifications'
                : isAndroid
                ? 'Install for better performance, offline support & notifications'
                : 'Install for offline access, push notifications & better performance'}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button 
            className="flex-1 gap-2" 
            onClick={handleInstall}
            disabled={!deferredPrompt && !isIOS && !isAndroid}
          >
            <Download className="h-4 w-4" />
            {deferredPrompt ? 'Install' : isIOS ? 'iOS Instructions' : isAndroid ? 'Android Instructions' : 'Install'}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handleDismiss}
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  );
}

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}