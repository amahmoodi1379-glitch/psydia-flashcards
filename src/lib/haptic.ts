/**
 * Telegram Mini App Haptic Feedback helper.
 * Gracefully degrades to no-op outside Telegram WebView.
 */

type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "error" | "success" | "warning";

function getHaptic() {
  return window.Telegram?.WebApp?.HapticFeedback;
}

export function hapticImpact(style: ImpactStyle = "light") {
  try {
    getHaptic()?.impactOccurred(style);
  } catch {
    // Silently ignore if not available
  }
}

export function hapticNotification(type: NotificationType) {
  try {
    getHaptic()?.notificationOccurred(type);
  } catch {
    // Silently ignore if not available
  }
}

export function hapticSelection() {
  try {
    getHaptic()?.selectionChanged();
  } catch {
    // Silently ignore if not available
  }
}
