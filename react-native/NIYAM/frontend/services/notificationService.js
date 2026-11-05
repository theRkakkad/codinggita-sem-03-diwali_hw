import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { authStorage } from './authStorage';
import { doseEventService } from './doseEventService';

// Android Notification Channel Configuration
export const CHANNEL_ID = 'niyam-medication-reminders';
export const CHANNEL_NAME = 'Medication Reminders';

// Notification Action Identifiers & Category (Phase 22)
export const CATEGORY_DOSE_REMINDER = 'niyam-dose-reminder-category';
export const ACTION_TAKEN = 'ACTION_TAKEN';
export const ACTION_SNOOZE_10 = 'ACTION_SNOOZE_10';
export const ACTION_SKIP = 'ACTION_SKIP';
export const SNOOZE_OPTIONS = [5, 10, 15, 30]; // Valid snooze options in minutes

// Storage keys
const REMINDERS_ENABLED_KEY = 'niyam_reminders_enabled';
const NOTIFICATION_MAP_KEY = 'niyam_medicine_notification_ids';
const SNOOZE_MAP_KEY = 'niyam_snooze_notification_ids';

// Scheduling horizon for date-bounded medicines (in days)
export const SCHEDULING_HORIZON_DAYS = 14;

// Configure global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Robust parser for 12-hour AM/PM and 24-hour time strings.
 * Examples: '08:00 AM', '08:00 PM', '14:30', '9:15 AM'
 * @param {string} timeStr
 * @returns {{ hour: number, minute: number } | null}
 */
export function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim().toUpperCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3];

  if (minute < 0 || minute > 59) return null;

  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === 'AM' && hour === 12) {
      hour = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour += 12;
    }
  } else {
    if (hour < 0 || hour > 23) return null;
  }

  return { hour, minute };
}

/**
 * Storage helpers for mapping medicine IDs to their scheduled notification IDs
 */
async function getStoredNotificationMap() {
  try {
    const raw = await authStorage.getItem?.(NOTIFICATION_MAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {};
}

async function saveStoredNotificationMap(map) {
  try {
    await authStorage.setItem?.(NOTIFICATION_MAP_KEY, JSON.stringify(map));
  } catch (e) {
    // fallback
  }
}

/**
 * Storage helpers for mapping dose event IDs to their active snooze notification IDs
 */
async function getStoredSnoozeMap() {
  try {
    const raw = await authStorage.getItem?.(SNOOZE_MAP_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return {};
}

async function saveStoredSnoozeMap(map) {
  try {
    await authStorage.setItem?.(SNOOZE_MAP_KEY, JSON.stringify(map));
  } catch (e) {
    // fallback
  }
}

export const notificationService = {
  /**
   * Initialize notification system, register Android notification channel, and set notification categories
   */
  async init() {
    if (Platform.OS === 'web') return;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: CHANNEL_NAME,
          description: 'Timely reminders for prescribed medication intakes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E6A23C',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      }

      // Register interactive notification actions (Taken, Snooze 10m, Skip)
      await Notifications.setNotificationCategoryAsync(CATEGORY_DOSE_REMINDER, [
        {
          identifier: ACTION_TAKEN,
          buttonTitle: 'Mark Taken',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: ACTION_SNOOZE_10,
          buttonTitle: 'Snooze 10m',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: ACTION_SKIP,
          buttonTitle: 'Skip',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    } catch (err) {
      console.warn('Failed to configure notification channel/category:', err);
    }
  },

  /**
   * Check current notification permission status
   * @returns {Promise<{ status: string, granted: boolean, canAskAgain: boolean }>}
   */
  async getPermissionStatus() {
    if (Platform.OS === 'web') {
      return { status: 'granted', granted: true, canAskAgain: true };
    }

    try {
      const settings = await Notifications.getPermissionsAsync();
      return {
        status: settings.status,
        granted: settings.granted || settings.status === 'granted',
        canAskAgain: settings.canAskAgain,
      };
    } catch (err) {
      console.warn('Error reading notification permissions:', err);
      return { status: 'undetermined', granted: false, canAskAgain: true };
    }
  },

  /**
   * Request notification permission from user
   * @returns {Promise<boolean>}
   */
  async requestPermission() {
    if (Platform.OS === 'web') return true;

    try {
      const current = await this.getPermissionStatus();
      if (current.granted) return true;

      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (requested.granted || requested.status === 'granted') {
        await this.init(); // Ensure channel is set up once granted
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return false;
    }
  },

  /**
   * Open system device settings when permissions are denied
   */
  async openSettings() {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('Failed to open device settings:', err);
    }
  },

  /**
   * Check if medication reminders are enabled in user settings
   * @returns {Promise<boolean>}
   */
  async areRemindersEnabled() {
    try {
      const val = await authStorage.getItem?.(REMINDERS_ENABLED_KEY);
      if (val === null || val === undefined) return true; // Default enabled
      return val === 'true';
    } catch (e) {
      return true;
    }
  },

  /**
   * Enable or disable medication reminders in user settings
   * @param {boolean} enabled
   * @param {Array} [medicines=[]]
   */
  async setRemindersEnabled(enabled, medicines = []) {
    try {
      await authStorage.setItem?.(REMINDERS_ENABLED_KEY, enabled ? 'true' : 'false');
      if (!enabled) {
        await this.cancelAllReminders();
      } else if (medicines.length > 0) {
        await this.rescheduleAllActiveMedicines(medicines);
      }
    } catch (err) {
      console.warn('Failed to toggle reminders setting:', err);
    }
  },

  /**
   * Schedule local reminders for a medicine record
   * @param {object} medicine
   * @returns {Promise<Array<string>>} scheduled notification identifiers
   */
  async scheduleMedicineReminders(medicine) {
    if (!medicine) return [];
    const medId = medicine.id || medicine._id;
    if (!medId) return [];

    // Always clear old scheduled reminders for this medicine first
    await this.cancelMedicineReminders(medId);

    // Only active medicines have reminders scheduled
    if (medicine.status !== 'Active') {
      return [];
    }

    // "As needed" medicines do not require automatic reminder scheduling
    if (medicine.frequency === 'As needed') {
      return [];
    }

    // Verify user has enabled reminders
    const enabled = await this.areRemindersEnabled();
    if (!enabled) {
      return [];
    }

    // Verify permission
    let perm = await this.getPermissionStatus();
    if (!perm.granted) {
      if (perm.status === 'undetermined' || perm.canAskAgain) {
        const granted = await this.requestPermission();
        if (!granted) return [];
      } else {
        return [];
      }
    }

    // Verify end date has not passed
    const now = new Date();
    if (medicine.endDate) {
      const end = new Date(medicine.endDate);
      if (!isNaN(end.getTime()) && end < now) {
        return [];
      }
    }

    const reminderTimes = Array.isArray(medicine.reminderTimes)
      ? medicine.reminderTimes
      : typeof medicine.time === 'string' && medicine.time !== 'As prescribed'
      ? medicine.time.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    if (reminderTimes.length === 0) {
      return [];
    }

    const scheduledIds = [];
    const title = `Time for your ${medicine.name}`;
    const body = `Take ${medicine.dosage} according to your medication schedule.`;
    const notificationData = {
      medicineId: medId,
      name: medicine.name,
      dosage: medicine.dosage,
      type: 'medication_reminder',
    };

    const hasEndDate = Boolean(medicine.endDate);
    const parsedEndDate = hasEndDate ? new Date(medicine.endDate) : null;
    const isEndDateValid = parsedEndDate && !isNaN(parsedEndDate.getTime());

    // Schedule per reminder time
    for (const timeStr of reminderTimes) {
      const parsedTime = parseTimeString(timeStr);
      if (!parsedTime) continue;

      const { hour, minute } = parsedTime;

      try {
        if (!hasEndDate || !isEndDateValid) {
          // Open-ended routine: schedule repeating daily notification at specified hour & minute
          const trigger = {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            channelId: CHANNEL_ID,
          };

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: notificationData,
              categoryIdentifier: CATEGORY_DOSE_REMINDER,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger,
          });

          scheduledIds.push(notificationId);
        } else {
          // Date-bounded routine: schedule explicit daily date triggers within [start, end] up to 14 days
          const startBase = medicine.startDate ? new Date(medicine.startDate) : now;
          const effectiveStart = startBase > now ? startBase : now;

          for (let dayOffset = 0; dayOffset < SCHEDULING_HORIZON_DAYS; dayOffset++) {
            const targetDate = new Date(effectiveStart.getTime() + dayOffset * 86400000);
            targetDate.setHours(hour, minute, 0, 0);

            // Skip past times today
            if (targetDate <= now) continue;

            // Stop if beyond end date
            if (targetDate > parsedEndDate) break;

            const trigger = {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: targetDate,
              channelId: CHANNEL_ID,
            };

            const notificationId = await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                data: notificationData,
                categoryIdentifier: CATEGORY_DOSE_REMINDER,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
              },
              trigger,
            });

            scheduledIds.push(notificationId);
          }
        }
      } catch (scheduleErr) {
        console.warn(`Failed to schedule reminder for ${medicine.name} at ${timeStr}:`, scheduleErr);
      }
    }

    // Persist scheduled notification IDs
    if (scheduledIds.length > 0) {
      const map = await getStoredNotificationMap();
      map[medId] = scheduledIds;
      await saveStoredNotificationMap(map);
    }

    return scheduledIds;
  },

  /**
   * Cancel all reminders scheduled for a specific medicine
   * @param {string} medicineId
   */
  async cancelMedicineReminders(medicineId) {
    if (!medicineId) return;

    try {
      // 1. Cancel via stored notification IDs
      const map = await getStoredNotificationMap();
      const ids = map[medicineId] || [];

      for (const id of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch (e) {
          // Ignore cancellation errors if notification already fired
        }
      }

      delete map[medicineId];
      await saveStoredNotificationMap(map);

      // 2. Safeguard: query all active scheduled notifications and cancel any matching medicineId
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of allScheduled) {
        if (item.content?.data?.medicineId === medicineId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          } catch (e) {
            // Ignore
          }
        }
      }

      // 3. Clear any active snooze notifications for this medicine
      const snoozeMap = await getStoredSnoozeMap();
      let snoozeMapChanged = false;
      for (const item of allScheduled) {
        if (item.content?.data?.medicineId === medicineId && item.content?.data?.type === 'snooze_reminder') {
          const doseId = item.content?.data?.doseId;
          if (doseId && snoozeMap[doseId]) {
            delete snoozeMap[doseId];
            snoozeMapChanged = true;
          }
        }
      }
      if (snoozeMapChanged) {
        await saveStoredSnoozeMap(snoozeMap);
      }
    } catch (err) {
      console.warn(`Error cancelling reminders for medicine ${medicineId}:`, err);
    }
  },

  /**
   * Schedule a local snooze reminder for a pending dose event (Phase 22)
   * Options: 5, 10, 15, or 30 minutes.
   * Keeps the original dose as pending, does NOT create a new DoseEvent,
   * does NOT alter scheduledAt, and prevents duplicate snooze scheduling.
   * @param {object} dose
   * @param {number} minutes
   * @returns {Promise<{ success: boolean, notificationId: string, minutes: number, triggerTime: Date }>}
   */
  async scheduleSnoozeReminder(dose, minutes) {
    if (!dose) {
      throw new Error('Dose information is required to schedule a snooze reminder.');
    }

    const validMinutes = SNOOZE_OPTIONS.includes(Number(minutes)) ? Number(minutes) : 10;
    const doseId = dose.id || dose._id;
    const medicineId = dose.medicineId || (typeof dose.medicine === 'object' ? dose.medicine?._id : dose.medicine);
    const name = dose.name || 'Medication';
    const dosage = dose.dosage || '';

    // Check permission
    const perm = await this.getPermissionStatus();
    if (!perm.granted) {
      throw new Error('Notification permissions are disabled on this device. Please enable notifications in your profile or device settings.');
    }

    // Check reminders enabled in settings
    const enabled = await this.areRemindersEnabled();
    if (!enabled) {
      throw new Error('Medication reminders are currently paused in your settings.');
    }

    // Prevent duplicate snooze scheduling: cancel any prior snooze for this dose
    if (doseId) {
      await this.cancelSnoozeReminder(doseId);
    }

    const triggerSeconds = Math.max(1, Math.round(validMinutes * 60));
    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: triggerSeconds,
      repeats: false,
      channelId: CHANNEL_ID,
    };

    const notificationData = {
      doseId: doseId || undefined,
      medicineId: medicineId || undefined,
      name,
      dosage,
      type: 'snooze_reminder',
      snoozedMinutes: validMinutes,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time for your ${name}`,
        body: `Snoozed dose (${validMinutes}m): Take ${dosage || 'prescribed amount'} according to your medication schedule.`,
        data: notificationData,
        categoryIdentifier: CATEGORY_DOSE_REMINDER,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    if (doseId) {
      const snoozeMap = await getStoredSnoozeMap();
      snoozeMap[doseId] = notificationId;
      await saveStoredSnoozeMap(snoozeMap);
    }

    return {
      success: true,
      notificationId,
      minutes: validMinutes,
      triggerTime: new Date(Date.now() + triggerSeconds * 1000),
    };
  },

  /**
   * Cancel any pending snooze reminder associated with a dose event
   * @param {string} doseId
   */
  async cancelSnoozeReminder(doseId) {
    if (!doseId) return;

    try {
      const map = await getStoredSnoozeMap();
      const notifId = map[doseId];
      if (notifId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notifId);
        } catch (e) {
          // ignore if already fired
        }
        delete map[doseId];
        await saveStoredSnoozeMap(map);
      }

      // Safeguard: query active notifications and cancel matching doseId
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of allScheduled) {
        if (item.content?.data?.doseId === doseId && item.content?.data?.type === 'snooze_reminder') {
          try {
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn(`Error cancelling snooze reminder for dose ${doseId}:`, err);
    }
  },

  /**
   * Cancel all notifications across all medicines and snoozes
   */
  async cancelAllReminders() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await saveStoredNotificationMap({});
      await saveStoredSnoozeMap({});
    } catch (err) {
      console.warn('Error cancelling all reminders:', err);
    }
  },

  /**
   * Reschedule reminders for all active medicines
   * @param {Array<object>} medicines
   */
  async rescheduleAllActiveMedicines(medicines) {
    if (!Array.isArray(medicines)) return;

    for (const med of medicines) {
      const id = med.id || med._id;
      if (med.status === 'Active') {
        await this.scheduleMedicineReminders(med);
      } else {
        await this.cancelMedicineReminders(id);
      }
    }
  },

  /**
   * Get all currently scheduled notifications (useful for inspection & debugging)
   * @returns {Promise<Array>}
   */
  async getAllScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (e) {
      return [];
    }
  },

  /**
   * Schedule a single test notification firing after specified seconds
   * @param {number} [seconds=5]
   * @returns {Promise<string>} notification ID
   */
  async scheduleTestNotification(seconds = 5) {
    await this.init();
    await this.requestPermission();

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, seconds),
      repeats: false,
      channelId: CHANNEL_ID,
    };

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your Vitamin D3',
        body: 'Take 1 capsule according to your medication schedule.',
        data: {
          medicineId: 'test-demo-medicine',
          name: 'Vitamin D3',
          dosage: '1 capsule',
          type: 'medication_reminder',
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });
  },

  /**
   * Handles user interaction with a notification (taps and category action buttons)
   * Supports Taken, Snooze 10m, Skip, and default banner tap.
   * Does NOT mark doses as taken when tapping the notification banner.
   * @param {object} response
   * @param {object} router Expo Router instance
   * @param {object} [options]
   */
  async handleNotificationResponse(response, router, options = {}) {
    if (!response) return;

    const actionIdentifier = response.actionIdentifier;
    const data = response.notification?.request?.content?.data || {};
    const doseId = data.doseId;
    const medicineId = data.medicineId;

    try {
      // 1. Verify user session
      const token = await authStorage.getToken();
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // 2. Action: Mark as Taken
      if (actionIdentifier === ACTION_TAKEN) {
        if (doseId) {
          try {
            await doseEventService.markDoseAsTaken(doseId);
            await this.cancelSnoozeReminder(doseId);
            options.onDoseUpdated?.(doseId, 'taken');
          } catch (apiErr) {
            console.warn('API error marking dose taken from notification action:', apiErr.message);
          }
        }
        return;
      }

      // 3. Action: Snooze 10m
      if (actionIdentifier === ACTION_SNOOZE_10) {
        try {
          await this.scheduleSnoozeReminder(data, 10);
        } catch (snoozeErr) {
          console.warn('Failed to schedule snooze from notification action:', snoozeErr.message);
        }
        return;
      }

      // 4. Action: Skip -> Navigate to app to prompt for optional skip reason
      if (actionIdentifier === ACTION_SKIP) {
        if (doseId) {
          router.push({
            pathname: '/(tabs)',
            params: { skipDoseId: doseId },
          });
        } else {
          router.push('/(tabs)');
        }
        return;
      }

      // 5. Default Tap on notification banner: navigate safely without marking as taken
      if (doseId) {
        router.push({
          pathname: '/(tabs)',
          params: { activeDoseId: doseId },
        });
      } else if (medicineId) {
        router.push({
          pathname: '/(tabs)/medicines',
          params: { highlightId: medicineId },
        });
      } else {
        router.push('/(tabs)');
      }
    } catch (err) {
      console.warn('Error handling notification response:', err);
      router.push('/(tabs)');
    }
  },

  /**
   * Backward-compatible alias for handleNotificationResponse
   */
  async handleNotificationTap(response, router) {
    return this.handleNotificationResponse(response, router);
  },
};

export default notificationService;
