/**
 * Capacitor configuration for AI Tutor Android app.
 *
 * webDir points to Next.js static export output (`out`). If you are serving
 * the Next.js server output instead of a static export, change this to `.next`.
 *
 * No iOS platform — Android only. Plugins are declared here but the native
 * side must be added separately (`npx cap add android`) on a machine with the
 * Android SDK. This file is web-side only and requires no native tooling.
 */

interface CapacitorPluginConfig {
  [key: string]: unknown;
}

interface CapacitorAndroidConfig {
  allowMixedContent?: boolean;
  backgroundColor?: string;
  appendUserAgent?: string;
  mainActivity?: string;
  pluginClientCode?: string;
  webContentsDebuggingEnabled?: boolean;
  buildOptions?: {
    keystorePath?: string;
    keystorePassword?: string;
    alias?: string;
    storePassword?: string;
  };
}

interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime?: boolean;
  plugins?: Record<string, CapacitorPluginConfig>;
  android?: CapacitorAndroidConfig;
}

const config: CapacitorConfig = {
  appId: 'com.aitutor.app',
  appName: 'AI Tutor',
  webDir: 'out',
  bundledWebRuntime: false,
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#3b82f6',
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerStyle: 'small',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
    appendUserAgent: 'AI Tutor/1.0',
    mainActivity: 'MainActivity',
    pluginClientCode: '00000000000000000000000000000000',
    webContentsDebuggingEnabled: false,
    buildOptions: {
      keystorePath: '',
      keystorePassword: '',
      alias: '',
      storePassword: '',
    },
  },
};

export default config;
