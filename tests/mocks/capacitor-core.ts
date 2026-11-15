/**
 * Mock for @capacitor/core used only by vitest unit tests.
 * No native Android tooling involved.
 */
export const Capacitor = {
  isNativePlatform: () => false,
  isPluginEnabled: async () => false,
};
