/**
 * Mock for @capacitor/push-notifications used only by vitest unit tests.
 */
export const PushNotifications = {
  addListener: (eventName: string, listener: (data: unknown) => void) => ({
    remove: () => undefined,
  }),
  removeAllListeners: async () => undefined,
  requestPermissions: async () => ({ receive: 'granted' as const }),
  register: async () => undefined,
  getDeliveredNotifications: async () => [],
};