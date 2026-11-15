import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/db': path.resolve(__dirname, './db'),
      '@/db/schema': path.resolve(__dirname, './db/schema'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/db/schema/audit': path.resolve(__dirname, './db/schema/audit.ts'),
      // Capacitor plugins (some not published as standalone packages) are
      // aliased to mocks for unit tests only. No native tooling is involved.
      '@capacitor/core': path.resolve(__dirname, './tests/mocks/capacitor-core.ts'),
      '@capacitor/preferences': path.resolve(__dirname, './tests/mocks/capacitor-preferences.ts'),
      '@capacitor/secure-storage': path.resolve(__dirname, './tests/mocks/capacitor-secure-storage.ts'),
      '@capacitor/push-notifications': path.resolve(__dirname, './tests/mocks/capacitor-push-notifications.ts'),
      '@capacitor/haptics': path.resolve(__dirname, './tests/mocks/capacitor-haptics.ts'),
      '@capacitor/app': path.resolve(__dirname, './tests/mocks/capacitor-app.ts'),
    },
  },
});