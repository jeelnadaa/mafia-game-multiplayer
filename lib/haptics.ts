// Haptics wrapper for tactile feedback on mobile devices

let hapticsEnabled = true;

const HAPTICS_STORAGE_KEY = 'mafia_haptics_enabled';

// Initialize from localStorage if available in browser
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem(HAPTICS_STORAGE_KEY);
    if (saved !== null) {
      hapticsEnabled = saved === 'true';
    }
  } catch (_) {}
}

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
    } catch (_) {}
  }
}

/**
 * Triggers vibration pattern if supported and enabled.
 * Safely degrades on unsupported browsers (iOS Safari, desktop).
 */
export function triggerHaptic(pattern: number | number[]): boolean {
  if (!hapticsEnabled) return false;
  if (!isHapticsSupported()) return false;

  try {
    return navigator.vibrate(pattern);
  } catch (_) {
    return false;
  }
}

/**
 * Short subtle tick (e.g. on role card reveal or button tap)
 */
export function hapticTick(): boolean {
  return triggerHaptic(20);
}

/**
 * Double pulse when it is your turn to act at night
 */
export function hapticYourTurn(): boolean {
  return triggerHaptic([35, 60, 45]);
}

/**
 * Longer pulse when player is eliminated
 */
export function hapticEliminated(): boolean {
  return triggerHaptic([120, 80, 160]);
}

/**
 * Subtle confirmation pulse when vote or target is locked
 */
export function hapticConfirm(): boolean {
  return triggerHaptic([25, 40, 25]);
}
