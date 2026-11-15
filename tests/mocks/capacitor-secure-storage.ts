/**
 * Mock for @capacitor/secure-storage used only by vitest unit tests.
 * This plugin may not exist as a published package; mock provides the shape.
 */
export const SecureStorage = {
  set: async () => undefined,
  get: async () => ({ value: null }),
  remove: async () => undefined,
  clear: async () => undefined,
};