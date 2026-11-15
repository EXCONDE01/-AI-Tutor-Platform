/**
 * Mobile (Capacitor Android) haptic feedback wrapper.
 *
 * Wraps the Capacitor Haptics plugin with graceful degradation:
 *   - If running in Capacitor with the Haptics plugin installed, uses it.
 *   - Otherwise silently no-ops (PWA / web / missing plugin).
 *
 * All Capacitor imports are dynamic and wrapped in try/catch.
 */

interface HapticsPlugin {
  impact?: (options: { style: ImpactStyle }) => Promise<void>;
  vibrate?: (options: { duration: number }) => Promise<void>;
}

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

/**
 * Check if we're running inside a Capacitor environment.
 */
async function isCapacitorAvailable(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Dynamically import @capacitor/haptics.
 * Returns null if not available.
 */
async function getHapticsPlugin(): Promise<HapticsPlugin | null> {
  try {
    const mod: { Haptics: HapticsPlugin | undefined } = await import('@capacitor/haptics');
    return mod.Haptics ?? null;
  } catch {
    return null;
  }
}

/**
 * Trigger a haptic impact feedback.
 *
 * @param style - 'light', 'medium', 'heavy', 'rigid', or 'soft' (default 'medium')
 */
export async function hapticImpact(style: ImpactStyle = 'medium'): Promise<void> {
  const Haptics = await getHapticsPlugin();
  if (!Haptics || typeof Haptics.impact !== 'function') {
    return;
  }
  try {
    await Haptics.impact({ style });
  } catch {
    // Silently fail — haptics are non-essential
  }
}

/**
 * Trigger a vibration for a given duration (ms).
 * Only supported on Android via Capacitor Haptics.
 *
 * @param duration - milliseconds to vibrate
 */
export async function hapticVibrate(duration: number): Promise<void> {
  const Haptics = await getHapticsPlugin();
  if (!Haptics || typeof Haptics.vibrate !== 'function') {
    return;
  }
  try {
    await Haptics.vibrate({ duration });
  } catch {
    // Silently fail — haptics are non-essential
  }
}

/**
 * Convenience: light impact (e.g. tap).
 */
export async function hapticLight(): Promise<void> {
  await hapticImpact('light');
}

/**
 * Convenience: medium impact (default).
 */
export async function hapticMedium(): Promise<void> {
  await hapticImpact('medium');
}

/**
 * Convenience: heavy impact (e.g. error / delete).
 */
export async function hapticHeavy(): Promise<void> {
  await hapticImpact('heavy');
}

/**
 * Check whether haptics are available on this platform.
 * Returns true only when running natively in Capacitor AND the plugin exists.
 */
export async function isHapticsAvailable(): Promise<boolean> {
  const available = await isCapacitorAvailable();
  if (!available) {
    return false;
  }
  const Haptics = await getHapticsPlugin();
  return Haptics != null && typeof Haptics.impact === 'function';
}
