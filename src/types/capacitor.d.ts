/**
 * Ambient declarations for @capacitor/* plugins.
 *
 * These packages are NOT installed in this repo (no Android SDK / native
 * tooling available). The mobile modules import them dynamically inside
 * try/catch blocks and degrade gracefully when absent. These declarations
 * exist solely so `tsc --noEmit` passes without requiring the packages.
 *
 * If @capacitor/* packages are later installed, this file can be removed
 * and replaced with the real type definitions.
 */

declare module '@capacitor/core' {
  export const Capacitor: {
    isNativePlatform: () => boolean;
    isPluginEnabled: (pluginId: string) => Promise<boolean>;
  };
}

declare module '@capacitor/preferences' {
  export const Preferences: {
    set: (options: { key: string; value: string }) => Promise<void>;
    get: (options: { key: string }) => Promise<{ value: string | null }>;
    remove: (options: { key: string }) => Promise<void>;
    clear: () => Promise<void>;
  };
}

// @capacitor/secure-storage is a community plugin that may not be installed.
// We keep it as `any` so dynamic import works but falls back gracefully.
declare module '@capacitor/secure-storage' {
  export const SecureStorage: any;
}

declare module '@capacitor/push-notifications' {
  export const PushNotifications: {
    addListener: (eventName: string, listener: (data: unknown) => void) => { remove: () => void };
    removeAllListeners: () => Promise<void>;
    requestPermissions: () => Promise<{ receive: 'granted' | 'denied' }>;
    register: () => Promise<void>;
    getDeliveredNotifications: () => Promise<Array<{ title?: string; body?: string; data?: unknown; id?: string }>>;
  };
}

declare module '@capacitor/haptics' {
  export const Haptics: {
    impact: (options: { style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' }) => Promise<void>;
    vibrate: (options: { duration: number }) => Promise<void>;
  };
}

declare module '@capacitor/app' {
  export const App: {
    addListener: (eventName: string, listener: (data: unknown) => void) => { remove: () => void };
    removeAllListeners: () => Promise<void>;
    openUrl: (options: { url: string }) => Promise<void>;
    canOpenUrl: (options: { url: string }) => Promise<{ value: boolean }>;
    exitApp: () => Promise<void>;
    getLaunchUrl: () => Promise<{ url: string | null }>;
  };
}
