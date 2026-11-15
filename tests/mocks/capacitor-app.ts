/**
 * Mock for @capacitor/app used only by vitest unit tests.
 */
export const App = {
  addListener: (eventName: string, listener: (data: unknown) => void) => ({
    remove: () => undefined,
  }),
  removeAllListeners: async () => undefined,
  openUrl: async () => undefined,
  canOpenUrl: async () => ({ value: false }),
  exitApp: async () => undefined,
  getLaunchUrl: async () => ({ url: null }),
};