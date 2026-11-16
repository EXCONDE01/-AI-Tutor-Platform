"use client";

import * as React from "react";
import { WifiOff, Wifi, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  className?: string;
  showQueuedCount?: boolean;
}

// Get queued messages count from IndexedDB
async function getQueueCount(): Promise<number> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return 0;
  
  return new Promise((resolve) => {
    const request = indexedDB.open('ai-tutor-push-queue', 1);
    request.onerror = () => resolve(0);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) {
        resolve(0);
        return;
      }
      const transaction = db.transaction('queue', 'readonly');
      const store = transaction.objectStore('queue');
      const index = store.index('by-status');
      const countRequest = index.count('pending');
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
    };
  });
}

export function OfflineBanner({ className, showQueuedCount = true }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [queuedCount, setQueuedCount] = React.useState(0);
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  React.useEffect(() => {
    const updateOnlineStatus = () => {
      const wasOffline = !isOnline;
      const nowOnline = navigator.onLine;
      setIsOnline(nowOnline);
      
      if (wasOffline && nowOnline) {
        setIsReconnecting(true);
        // Trigger sync
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'sync-now' });
        }
        setTimeout(() => setIsReconnecting(false), 3000);
      }
    };

    // Initial check
    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Listen for queue updates from SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'queue-updated') {
        setQueuedCount(event.data.count || 0);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Initial queue count
    getQueueCount().then(setQueuedCount);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [isOnline]);

  if (isOnline && !isReconnecting && queuedCount === 0) return null;

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 animate-slide-down",
        isOnline ? "bg-green-50 border-b border-green-200" : "bg-amber-50 border-b border-amber-200",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isReconnecting ? (
            <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
          ) : isOnline ? (
            <Wifi className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isReconnecting 
                ? "Reconnecting..." 
                : isOnline 
                ? "You're back online" 
                : "You're offline"}
            </p>
            {!isOnline && (
              <p className="text-xs text-gray-600">
                Changes will sync when connection is restored
              </p>
            )}
          </div>
        </div>

        {(showQueuedCount && queuedCount > 0) && (
          <div className="flex items-center gap-2 px-3 py-1 bg-white/80 rounded-full border text-sm">
            <span className="font-medium">{queuedCount}</span>
            <span className="text-muted-foreground">message{queuedCount !== 1 ? 's' : ''} queued</span>
          </div>
        )}

        {!isOnline && !isReconnecting && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 hidden sm:block">
              Cached lessons available
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for components to check online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return isOnline;
}