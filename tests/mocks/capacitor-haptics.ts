/**
 * Mock for @capacitor/haptics used only by vitest unit tests.
 */
export const Haptics = {
  impact: async () => undefined,
  vibrate: async () => undefined,
};