/**
 * Mock for @capacitor/preferences used only by vitest unit tests.
 */
export const Preferences = {
  set: async () => undefined,
  get: async () => ({ value: null }),
  remove: async () => undefined,
  clear: async () => undefined,
};