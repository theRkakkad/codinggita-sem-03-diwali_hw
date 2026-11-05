/**
 * NIYAM Phase 21 — Notification & Reminder Service Test Suite
 * Validates local medication reminder scheduling, time parsing, cancellation,
 * tap routing, settings persistence, and edge cases.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Mock Platform and SecureStore
const mockStorage = {};
const mockSecureStore = {
  getItemAsync: async (k) => mockStorage[k] || null,
  setItemAsync: async (k, v) => { mockStorage[k] = String(v); },
  deleteItemAsync: async (k) => { delete mockStorage[k]; },
};

// 2. Mock Expo Notifications
const scheduledNotifications = [];
let nextId = 1;
const channels = {};
let permissionStatus = { status: 'granted', granted: true, canAskAgain: true };

const mockNotifications = {
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
  },
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationPriority: { HIGH: 'high', DEFAULT: 'default' },
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async (channelId, config) => {
    channels[channelId] = config;
    return config;
  },
  setNotificationCategoryAsync: async (categoryId, actions) => {
    return { categoryId, actions };
  },
  getPermissionsAsync: async () => permissionStatus,
  requestPermissionsAsync: async () => permissionStatus,
  scheduleNotificationAsync: async ({ content, trigger }) => {
    const id = `notif_${nextId++}`;
    scheduledNotifications.push({ identifier: id, content, trigger });
    return id;
  },
  cancelScheduledNotificationAsync: async (identifier) => {
    const idx = scheduledNotifications.findIndex((n) => n.identifier === identifier);
    if (idx !== -1) {
      scheduledNotifications.splice(idx, 1);
    }
  },
  cancelAllScheduledNotificationsAsync: async () => {
    scheduledNotifications.length = 0;
  },
  getAllScheduledNotificationsAsync: async () => [...scheduledNotifications],
  getLastNotificationResponseAsync: async () => null,
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
};

// Mock expo-linking
const mockLinking = {
  openSettings: async () => true,
};

const mockPlatform = { OS: 'android' };

// Create authStorage mock matching our real implementation
const authStorage = {
  async getToken() {
    return mockStorage['niyam_auth_token'] || null;
  },
  async setToken(t) {
    mockStorage['niyam_auth_token'] = t;
  },
  async removeToken() {
    delete mockStorage['niyam_auth_token'];
  },
  async getItem(k) {
    return mockStorage[k] || null;
  },
  async setItem(k, v) {
    mockStorage[k] = String(v);
  },
  async removeItem(k) {
    delete mockStorage[k];
  },
};

// Read and transform notificationService.js
const codePath = path.join(__dirname, 'services', 'notificationService.js');
let rawCode = fs.readFileSync(codePath, 'utf8');

// Strip ESM imports and exports for VM execution
let transformed = rawCode
  .replace(/import\s+\*\s+as\s+Notifications\s+from\s+['"]expo-notifications['"];?/g, '')
  .replace(/import\s+\*\s+as\s+Linking\s+from\s+['"]expo-linking['"];?/g, '')
  .replace(/import\s+\{[^}]*\}\s+from\s+['"]react-native['"];?/g, '')
  .replace(/import\s+\{[^}]*\}\s+from\s+['"]\.\/authStorage['"];?/g, '')
  .replace(/import\s+\{[^}]*\}\s+from\s+['"]\.\/doseEventService['"];?/g, '')
  .replace(/export\s+const\s+/g, 'const ')
  .replace(/export\s+function\s+/g, 'function ')
  .replace(/export\s+default\s+notificationService;?/g, '');

transformed += `\nmodule.exports = {
  CHANNEL_ID,
  CHANNEL_NAME,
  SCHEDULING_HORIZON_DAYS,
  parseTimeString,
  notificationService
};`;

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  parseInt,
  Math,
  Boolean,
  JSON,
  Array,
  Notifications: mockNotifications,
  Linking: mockLinking,
  Platform: mockPlatform,
  authStorage,
  module: { exports: {} },
  exports: {},
};

vm.createContext(sandbox);
vm.runInContext(transformed, sandbox);

const { parseTimeString, CHANNEL_ID, notificationService } = sandbox.module.exports;

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('   NIYAM PHASE 21 — LOCAL NOTIFICATIONS TEST SUITE    ');
  console.log('======================================================\n');

  // 1. Time parsing tests
  console.log('--- 1. Time String Parsing ---');
  runTest('Parses standard 12-hour AM times (08:00 AM)', () => {
    const res = parseTimeString('08:00 AM');
    assert.strictEqual(res.hour, 8);
    assert.strictEqual(res.minute, 0);
  });

  runTest('Parses standard 12-hour PM times (08:30 PM -> 20:30)', () => {
    const res = parseTimeString('08:30 PM');
    assert.strictEqual(res.hour, 20);
    assert.strictEqual(res.minute, 30);
  });

  runTest('Parses 12:00 PM (noon -> 12:00)', () => {
    const res = parseTimeString('12:00 PM');
    assert.strictEqual(res.hour, 12);
    assert.strictEqual(res.minute, 0);
  });

  runTest('Parses 12:00 AM (midnight -> 00:00)', () => {
    const res = parseTimeString('12:00 AM');
    assert.strictEqual(res.hour, 0);
    assert.strictEqual(res.minute, 0);
  });

  runTest('Parses single digit hour with lowercase am (9:15 am)', () => {
    const res = parseTimeString('9:15 am');
    assert.strictEqual(res.hour, 9);
    assert.strictEqual(res.minute, 15);
  });

  runTest('Parses 24-hour military time (14:45)', () => {
    const res = parseTimeString('14:45');
    assert.strictEqual(res.hour, 14);
    assert.strictEqual(res.minute, 45);
  });

  runTest('Parses 24-hour midnight (00:00)', () => {
    const res = parseTimeString('00:00');
    assert.strictEqual(res.hour, 0);
    assert.strictEqual(res.minute, 0);
  });

  runTest('Rejects invalid hour/minute numbers (25:00, 12:60)', () => {
    assert.strictEqual(parseTimeString('25:00'), null);
    assert.strictEqual(parseTimeString('12:60'), null);
    assert.strictEqual(parseTimeString('13:00 PM'), null);
  });

  runTest('Rejects malformed strings and non-strings', () => {
    assert.strictEqual(parseTimeString(''), null);
    assert.strictEqual(parseTimeString('noon'), null);
    assert.strictEqual(parseTimeString(null), null);
    assert.strictEqual(parseTimeString(undefined), null);
    assert.strictEqual(parseTimeString(123), null);
  });

  // 2. Android Notification Channel
  console.log('\n--- 2. Notification Channel Setup ---');
  await runAsyncTest('Initializes High Importance Android channel', async () => {
    await notificationService.init();
    assert.ok(channels[CHANNEL_ID], 'Channel should be registered');
    assert.strictEqual(channels[CHANNEL_ID].importance, mockNotifications.AndroidImportance.HIGH);
    assert.strictEqual(channels[CHANNEL_ID].lightColor, '#E6A23C');
    assert.strictEqual(channels[CHANNEL_ID].sound, 'default');
  });

  // 3. Permission checks
  console.log('\n--- 3. Notification Permissions ---');
  await runAsyncTest('Reads granted permissions accurately', async () => {
    permissionStatus = { status: 'granted', granted: true, canAskAgain: true };
    const perm = await notificationService.getPermissionStatus();
    assert.strictEqual(perm.granted, true);
    assert.strictEqual(perm.status, 'granted');
  });

  await runAsyncTest('Reads denied permissions accurately', async () => {
    permissionStatus = { status: 'denied', granted: false, canAskAgain: false };
    const perm = await notificationService.getPermissionStatus();
    assert.strictEqual(perm.granted, false);
    assert.strictEqual(perm.status, 'denied');
    permissionStatus = { status: 'granted', granted: true, canAskAgain: true }; // reset
  });

  // 4. Scheduling Reminders
  console.log('\n--- 4. Scheduling Medication Reminders ---');
  await runAsyncTest('Schedules repeating daily notification for open-ended active medicine', async () => {
    scheduledNotifications.length = 0;
    const med = {
      id: 'med-open-ended-1',
      name: 'Vitamin D3',
      dosage: '1 capsule',
      status: 'Active',
      frequency: 'Once daily',
      reminderTimes: ['08:00 AM'],
      startDate: new Date().toISOString(),
    };

    const ids = await notificationService.scheduleMedicineReminders(med);
    assert.strictEqual(ids.length, 1);
    assert.strictEqual(scheduledNotifications.length, 1);
    const notif = scheduledNotifications[0];
    assert.strictEqual(notif.content.title, 'Time for your Vitamin D3');
    assert.strictEqual(notif.content.body, 'Take 1 capsule according to your medication schedule.');
    assert.strictEqual(notif.content.data.medicineId, 'med-open-ended-1');
    assert.strictEqual(notif.trigger.type, 'daily');
    assert.strictEqual(notif.trigger.hour, 8);
    assert.strictEqual(notif.trigger.minute, 0);
  });

  await runAsyncTest('Schedules multiple daily times (twice-daily)', async () => {
    scheduledNotifications.length = 0;
    const med = {
      id: 'med-twice-daily-1',
      name: 'Metformin',
      dosage: '500 mg',
      status: 'Active',
      frequency: 'Twice daily',
      reminderTimes: ['08:00 AM', '08:00 PM'],
    };

    const ids = await notificationService.scheduleMedicineReminders(med);
    assert.strictEqual(ids.length, 2);
    assert.strictEqual(scheduledNotifications.length, 2);
    assert.strictEqual(scheduledNotifications[0].trigger.hour, 8);
    assert.strictEqual(scheduledNotifications[1].trigger.hour, 20);
  });

  await runAsyncTest('Schedules 3 times daily (three-times-daily)', async () => {
    scheduledNotifications.length = 0;
    const med = {
      id: 'med-thrice-daily-1',
      name: 'Amoxicillin',
      dosage: '250 mg',
      status: 'Active',
      frequency: 'Three times daily',
      reminderTimes: ['08:00 AM', '02:00 PM', '08:00 PM'],
    };

    const ids = await notificationService.scheduleMedicineReminders(med);
    assert.strictEqual(ids.length, 3);
    assert.strictEqual(scheduledNotifications.length, 3);
  });

  await runAsyncTest('Schedules date-bounded notifications up to scheduling horizon', async () => {
    scheduledNotifications.length = 0;
    const futureEnd = new Date(Date.now() + 5 * 86400000); // 5 days from now
    const med = {
      id: 'med-bounded-1',
      name: 'Antibiotic Course',
      dosage: '500 mg',
      status: 'Active',
      frequency: 'Once daily',
      reminderTimes: ['10:00 AM'],
      startDate: new Date().toISOString(),
      endDate: futureEnd.toISOString(),
    };

    const ids = await notificationService.scheduleMedicineReminders(med);
    assert.ok(ids.length > 0, 'Should schedule date triggers');
    assert.strictEqual(scheduledNotifications[0].trigger.type, 'date');
  });

  await runAsyncTest('Skips "As needed" medicines without automatic reminders', async () => {
    scheduledNotifications.length = 0;
    const med = {
      id: 'med-prn-1',
      name: 'Paracetamol',
      dosage: '650 mg',
      status: 'Active',
      frequency: 'As needed',
      reminderTimes: ['08:00 AM'],
    };

    const ids = await notificationService.scheduleMedicineReminders(med);
    assert.strictEqual(ids.length, 0);
    assert.strictEqual(scheduledNotifications.length, 0);
  });

  await runAsyncTest('Does not schedule reminders for Paused or Completed medicines', async () => {
    scheduledNotifications.length = 0;
    const pausedMed = {
      id: 'med-paused-1',
      name: 'BP Tablet',
      dosage: '10 mg',
      status: 'Paused',
      reminderTimes: ['09:00 AM'],
    };
    const completedMed = {
      id: 'med-completed-1',
      name: 'Painkiller',
      dosage: '5 mg',
      status: 'Completed',
      reminderTimes: ['09:00 AM'],
    };

    assert.strictEqual((await notificationService.scheduleMedicineReminders(pausedMed)).length, 0);
    assert.strictEqual((await notificationService.scheduleMedicineReminders(completedMed)).length, 0);
    assert.strictEqual(scheduledNotifications.length, 0);
  });

  await runAsyncTest('Does not schedule reminders if endDate is already in the past', async () => {
    scheduledNotifications.length = 0;
    const expiredMed = {
      id: 'med-expired-1',
      name: 'Old Medicine',
      dosage: '1 tablet',
      status: 'Active',
      reminderTimes: ['09:00 AM'],
      endDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    };

    const ids = await notificationService.scheduleMedicineReminders(expiredMed);
    assert.strictEqual(ids.length, 0);
    assert.strictEqual(scheduledNotifications.length, 0);
  });

  // 5. Cancellation & Rescheduling
  console.log('\n--- 5. Cancellation & Rescheduling ---');
  await runAsyncTest('Cancels reminders for a specific medicine', async () => {
    scheduledNotifications.length = 0;
    const medA = {
      id: 'med-cancel-a',
      name: 'Med A',
      dosage: '10 mg',
      status: 'Active',
      reminderTimes: ['08:00 AM'],
    };
    const medB = {
      id: 'med-cancel-b',
      name: 'Med B',
      dosage: '20 mg',
      status: 'Active',
      reminderTimes: ['09:00 AM'],
    };

    await notificationService.scheduleMedicineReminders(medA);
    await notificationService.scheduleMedicineReminders(medB);
    assert.strictEqual(scheduledNotifications.length, 2);

    await notificationService.cancelMedicineReminders('med-cancel-a');
    assert.strictEqual(scheduledNotifications.length, 1);
    assert.strictEqual(scheduledNotifications[0].content.data.medicineId, 'med-cancel-b');
  });

  await runAsyncTest('Reschedules reminders on medicine update (cancelling previous ones)', async () => {
    scheduledNotifications.length = 0;
    const initial = {
      id: 'med-update-1',
      name: 'Thyroxine',
      dosage: '50 mcg',
      status: 'Active',
      reminderTimes: ['07:00 AM'],
    };
    await notificationService.scheduleMedicineReminders(initial);
    assert.strictEqual(scheduledNotifications.length, 1);
    assert.strictEqual(scheduledNotifications[0].trigger.hour, 7);

    // Update with new time
    const updated = {
      id: 'med-update-1',
      name: 'Thyroxine',
      dosage: '75 mcg',
      status: 'Active',
      reminderTimes: ['06:30 AM'],
    };
    await notificationService.scheduleMedicineReminders(updated);
    assert.strictEqual(scheduledNotifications.length, 1);
    assert.strictEqual(scheduledNotifications[0].trigger.hour, 6);
    assert.strictEqual(scheduledNotifications[0].trigger.minute, 30);
    assert.strictEqual(scheduledNotifications[0].content.body, 'Take 75 mcg according to your medication schedule.');
  });

  await runAsyncTest('Cancels all reminders when user toggles off medication reminders', async () => {
    scheduledNotifications.length = 0;
    const med = {
      id: 'med-toggle-1',
      name: 'Iron Supplement',
      dosage: '1 tablet',
      status: 'Active',
      reminderTimes: ['08:00 AM'],
    };
    await notificationService.scheduleMedicineReminders(med);
    assert.strictEqual(scheduledNotifications.length, 1);

    await notificationService.setRemindersEnabled(false);
    assert.strictEqual(scheduledNotifications.length, 0);
    assert.strictEqual(await notificationService.areRemindersEnabled(), false);

    // Re-enable
    await notificationService.setRemindersEnabled(true, [med]);
    assert.strictEqual(scheduledNotifications.length, 1);
    assert.strictEqual(await notificationService.areRemindersEnabled(), true);
  });

  // 6. Notification Tap Handling
  console.log('\n--- 6. Notification Tap Handling ---');
  await runAsyncTest('Routes to /login if user is not authenticated', async () => {
    await authStorage.removeToken();
    let navigatedTo = null;
    const mockRouter = {
      replace: (path) => { navigatedTo = { action: 'replace', path }; },
      push: (target) => { navigatedTo = { action: 'push', target }; },
    };

    const response = {
      notification: {
        request: {
          content: {
            data: { medicineId: 'med-tap-1', name: 'Vitamin D3' },
          },
        },
      },
    };

    await notificationService.handleNotificationTap(response, mockRouter);
    assert.deepStrictEqual(navigatedTo, { action: 'replace', path: '/(auth)/login' });
  });

  await runAsyncTest('Routes to /(tabs)/medicines with highlightId when authenticated', async () => {
    await authStorage.setToken('fake-jwt-token');
    let navigatedTo = null;
    const mockRouter = {
      replace: (path) => { navigatedTo = { action: 'replace', path }; },
      push: (target) => { navigatedTo = { action: 'push', target }; },
    };

    const response = {
      notification: {
        request: {
          content: {
            data: { medicineId: 'med-tap-123', name: 'Vitamin D3' },
          },
        },
      },
    };

    await notificationService.handleNotificationTap(response, mockRouter);
    assert.strictEqual(navigatedTo.action, 'push');
    assert.strictEqual(navigatedTo.target.pathname, '/(tabs)/medicines');
    assert.strictEqual(navigatedTo.target.params.highlightId, 'med-tap-123');
  });

  await runAsyncTest('Routes to /(tabs) if medicineId is missing', async () => {
    let navigatedTo = null;
    const mockRouter = {
      replace: (path) => { navigatedTo = { action: 'replace', path }; },
      push: (target) => { navigatedTo = { action: 'push', target }; },
    };

    const response = {
      notification: {
        request: {
          content: {
            data: { type: 'general_reminder' },
          },
        },
      },
    };

    await notificationService.handleNotificationTap(response, mockRouter);
    assert.deepStrictEqual(navigatedTo, { action: 'push', target: '/(tabs)' });
  });

  // 7. Test notification scheduling helper
  console.log('\n--- 7. Test Reminder Helper ---');
  await runAsyncTest('Schedules immediate 5-second test reminder with exact NIYAM prompt copy', async () => {
    scheduledNotifications.length = 0;
    const id = await notificationService.scheduleTestNotification(5);
    assert.ok(id);
    assert.strictEqual(scheduledNotifications.length, 1);
    const testNotif = scheduledNotifications[0];
    assert.strictEqual(testNotif.content.title, 'Time for your Vitamin D3');
    assert.strictEqual(testNotif.content.body, 'Take 1 capsule according to your medication schedule.');
    assert.strictEqual(testNotif.trigger.type, 'timeInterval');
    assert.strictEqual(testNotif.trigger.seconds, 5);
  });

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} passed (${totalTests - passedTests} failed)`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
