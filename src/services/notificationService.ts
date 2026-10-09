import { NotificationSettings, PushNotificationRecord, Deadline } from '../types/deadline';

const NOTIFICATIONS_STORAGE_KEY = 'duepulse_notifications_history';
const NOTIFIED_CACHE_KEY = 'duepulse_notified_deadlines_cache';

// Web Audio chime generator
export const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Pleasant double chime: 587.33 Hz (D5) -> 880 Hz (A5)
    const now = ctx.currentTime;
    
    // Note 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
};

export const isPushSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getPushPermissionState = (): NotificationPermission => {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
};

export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return 'denied';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

export const getNotificationHistory = (): PushNotificationRecord[] => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveNotificationHistory = (history: PushNotificationRecord[]) => {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (err) {
    console.error('Error saving notifications:', err);
  }
};

export const sendPushNotification = (
  title: string,
  body: string,
  options?: {
    deadlineId?: string;
    sound?: boolean;
    tag?: string;
  }
): PushNotificationRecord => {
  const record: PushNotificationRecord = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    body,
    timestamp: new Date().toISOString(),
    deadlineId: options?.deadlineId,
    read: false,
  };

  // 1. Play sound if requested
  if (options?.sound !== false) {
    playNotificationChime();
  }

  // 2. Try native system notification
  if (isPushSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: options?.tag || `duepulse_${options?.deadlineId || Date.now()}`,
      });
    } catch (e) {
      console.warn('Native notification dispatch fallback:', e);
    }
  }

  // 3. Save to in-app notification center
  const history = getNotificationHistory();
  saveNotificationHistory([record, ...history]);

  return record;
};

// Check upcoming deadlines and send push notifications based on user preferences
export const checkAndTriggerDeadlineAlerts = (
  deadlines: Deadline[],
  settings: NotificationSettings
) => {
  if (!settings.enabled) return;

  const now = Date.now();
  const notifiedCache: Record<string, boolean> = (() => {
    try {
      return JSON.parse(localStorage.getItem(NOTIFIED_CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  })();

  deadlines.forEach((deadline) => {
    if (deadline.status === 'completed') return;

    const dueTime = new Date(deadline.dueDate).getTime();
    const diffMs = dueTime - now;
    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMinutes / 60);

    // 1 hour window (between 50 and 65 minutes)
    if (settings.notify1HourBefore && diffMinutes > 0 && diffMinutes <= 60) {
      const cacheKey = `${deadline.id}_1h`;
      if (!notifiedCache[cacheKey]) {
        sendPushNotification(
          `⏰ Urgent: ${deadline.title}`,
          `Due in ${diffMinutes} minutes! Don't forget to submit.`,
          { deadlineId: deadline.id, sound: settings.soundEnabled, tag: cacheKey }
        );
        notifiedCache[cacheKey] = true;
      }
    }

    // 24 hours window (between 22 and 24 hours)
    if (settings.notify24HoursBefore && diffHours > 1 && diffHours <= 24) {
      const cacheKey = `${deadline.id}_24h`;
      if (!notifiedCache[cacheKey]) {
        sendPushNotification(
          `📅 Tomorrow: ${deadline.title}`,
          `Due in ${diffHours} hours. Make sure your subtasks are on track!`,
          { deadlineId: deadline.id, sound: settings.soundEnabled, tag: cacheKey }
        );
        notifiedCache[cacheKey] = true;
      }
    }

    // 3 days window (between 2 and 3 days)
    if (settings.notify3DaysBefore && diffHours > 24 && diffHours <= 72) {
      const cacheKey = `${deadline.id}_3d`;
      if (!notifiedCache[cacheKey]) {
        const daysLeft = Math.ceil(diffHours / 24);
        sendPushNotification(
          `📌 Upcoming: ${deadline.title}`,
          `Due in ${daysLeft} days. Estimated work time: ${deadline.estimatedHours || 2}h.`,
          { deadlineId: deadline.id, sound: settings.soundEnabled, tag: cacheKey }
        );
        notifiedCache[cacheKey] = true;
      }
    }
  });

  try {
    localStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(notifiedCache));
  } catch {
    // Ignore storage quota
  }
};
