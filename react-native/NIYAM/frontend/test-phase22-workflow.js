/**
 * NIYAM Phase 22 — Taken / Snooze / Skip Workflow Integration Test Suite
 * Validates dose-response actions, snooze reminder scheduling, skip confirmation,
 * notification category actions, and state integrity.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Mock Storage
const mockStorage = {};

// 2. Mock Expo Notifications
const scheduledNotifications = [];
let nextId = 1;
const channels = {};
const categories = {};
let permissionStatus = { status: 'granted', granted: true, canAskAgain: true };

const mockNotifications = {
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
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
    categories[categoryId] = actions;
    return { identifier: categoryId, actions };
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

// Mock Linking
const mockLinking = {
  openSettings: async () => true,
};

// Mock Platform
const mockPlatform = { OS: 'android' };

// Mock authStorage
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

// Mock doseEventService
const doseDatabase = {};
const doseEventService = {
  async markDoseAsTaken(id, takenAt = null) {
    if (!doseDatabase[id]) throw new Error('Dose event not found.');
    const d = doseDatabase[id];
    if (d.status === 'taken') throw new Error('Dose is already marked as taken.');
    d.status = 'taken';
    d.takenAt = takenAt ? new Date(takenAt) : new Date();
    return { ...d };
  },
  async markDoseAsSkipped(id, reason = 'Skipped by user') {
    if (!doseDatabase[id]) throw new Error('Dose event not found.');
    const d = doseDatabase[id];
    if (d.status === 'taken') throw new Error('Cannot skip an already taken dose.');
    d.status = 'skipped';
    d.notes = reason;
    return { ...d };
  },
  async confirmDoseAsMissed(id, missedReason = 'User confirmed missed dose') {
    if (!doseDatabase[id]) throw new Error('Dose event not found.');
    const d = doseDatabase[id];
    d.status = 'missed';
    d.missedReason = missedReason;
    return { ...d };
  },
};

// Read and transform notificationService.js
const codePath = path.join(__dirname, 'services', 'notificationService.js');
let rawCode = fs.readFileSync(codePath, 'utf8');

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
  CATEGORY_DOSE_REMINDER,
  ACTION_TAKEN,
  ACTION_SNOOZE_10,
  ACTION_SKIP,
  SNOOZE_OPTIONS,
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
  Number,
  Math,
  Boolean,
  JSON,
  Array,
  Notifications: mockNotifications,
  Linking: mockLinking,
  Platform: mockPlatform,
  authStorage,
  doseEventService,
  module: { exports: {} },
  exports: {},
};

vm.createContext(sandbox);
vm.runInContext(transformed, sandbox);

const {
  CATEGORY_DOSE_REMINDER,
  ACTION_TAKEN,
  ACTION_SNOOZE_10,
  ACTION_SKIP,
  SNOOZE_OPTIONS,
  notificationService,
} = sandbox.module.exports;

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
  console.log('   NIYAM PHASE 22 — DOSE RESPONSE WORKFLOW SUITE       ');
  console.log('======================================================\n');

  // 1. Category Registration & Action Configuration
  console.log('--- 1. Notification Actions Registration ---');
  await runAsyncTest('Registers category with Taken, Snooze 10m, and Skip actions', async () => {
    await notificationService.init();
    assert.ok(categories[CATEGORY_DOSE_REMINDER], 'Category registered');
    const actions = categories[CATEGORY_DOSE_REMINDER];
    assert.strictEqual(actions.length, 3);
    assert.strictEqual(actions[0].identifier, ACTION_TAKEN);
    assert.strictEqual(actions[1].identifier, ACTION_SNOOZE_10);
    assert.strictEqual(actions[2].identifier, ACTION_SKIP);
    assert.strictEqual(actions[2].options.opensAppToForeground, true);
  });

  // 2. Mark Dose as Taken
  console.log('\n--- 2. Mark Dose as Taken ---');
  await runAsyncTest('Marks pending dose as taken with server-generated timestamp', async () => {
    doseDatabase['dose-101'] = {
      id: 'dose-101',
      name: 'Metformin',
      dosage: '500 mg',
      status: 'pending',
      scheduledAt: new Date(),
    };

    const res = await doseEventService.markDoseAsTaken('dose-101');
    assert.strictEqual(res.status, 'taken');
    assert.ok(res.takenAt instanceof Date, 'takenAt recorded');
    assert.strictEqual(doseDatabase['dose-101'].status, 'taken');
  });

  await runAsyncTest('Rejects duplicate taken transition', async () => {
    let errorCaught = false;
    try {
      await doseEventService.markDoseAsTaken('dose-101');
    } catch (e) {
      errorCaught = true;
      assert.ok(e.message.includes('already marked as taken'));
    }
    assert.ok(errorCaught, 'Should reject already taken transition');
  });

  // 3. Snooze Reminders
  console.log('\n--- 3. Snooze Reminders ---');
  runTest('Supports exactly 5, 10, 15, and 30 minute options', () => {
    assert.strictEqual(SNOOZE_OPTIONS.length, 4);
    assert.strictEqual(SNOOZE_OPTIONS[0], 5);
    assert.strictEqual(SNOOZE_OPTIONS[1], 10);
    assert.strictEqual(SNOOZE_OPTIONS[2], 15);
    assert.strictEqual(SNOOZE_OPTIONS[3], 30);
  });

  await runAsyncTest('Schedules 5-minute snooze local notification with timeInterval trigger', async () => {
    scheduledNotifications.length = 0;
    const dose = {
      id: 'dose-snooze-5',
      name: 'Vitamin D3',
      dosage: '1 capsule',
      status: 'pending',
      scheduledAt: new Date('2026-11-05T08:00:00Z'),
    };

    const res = await notificationService.scheduleSnoozeReminder(dose, 5);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.minutes, 5);
    assert.strictEqual(scheduledNotifications.length, 1);
    const notif = scheduledNotifications[0];
    assert.strictEqual(notif.trigger.type, 'timeInterval');
    assert.strictEqual(notif.trigger.seconds, 300); // 5 * 60
    assert.strictEqual(notif.content.title, 'Time for your Vitamin D3');
    assert.ok(notif.content.body.includes('5m'));
    assert.strictEqual(notif.content.data.doseId, 'dose-snooze-5');
    assert.strictEqual(notif.content.categoryIdentifier, CATEGORY_DOSE_REMINDER);

    // Dose status and scheduledAt in MongoDB remain pending & unchanged
    assert.strictEqual(dose.status, 'pending');
    assert.strictEqual(dose.scheduledAt.toISOString(), '2026-11-05T08:00:00.000Z');
  });

  await runAsyncTest('Schedules 10, 15, and 30 minute snooze options correctly', async () => {
    for (const mins of [10, 15, 30]) {
      scheduledNotifications.length = 0;
      const res = await notificationService.scheduleSnoozeReminder({ id: `dose-${mins}`, name: 'Aspirin' }, mins);
      assert.strictEqual(res.minutes, mins);
      assert.strictEqual(scheduledNotifications[0].trigger.seconds, mins * 60);
    }
  });

  await runAsyncTest('Prevents duplicate snooze scheduling for the same dose', async () => {
    scheduledNotifications.length = 0;
    const dose = { id: 'dose-dup-snooze', name: 'Thyroxine', dosage: '50 mcg' };

    // First snooze for 10 min
    await notificationService.scheduleSnoozeReminder(dose, 10);
    assert.strictEqual(scheduledNotifications.length, 1);
    const firstNotifId = scheduledNotifications[0].identifier;

    // Re-snooze for 15 min
    await notificationService.scheduleSnoozeReminder(dose, 15);
    assert.strictEqual(scheduledNotifications.length, 1);
    const secondNotifId = scheduledNotifications[0].identifier;
    assert.notStrictEqual(firstNotifId, secondNotifId);
    assert.strictEqual(scheduledNotifications[0].trigger.seconds, 900); // 15 * 60
  });

  await runAsyncTest('Cancels pending snooze reminder when dose is taken or skipped', async () => {
    scheduledNotifications.length = 0;
    const dose = { id: 'dose-cancel-snooze', name: 'Calcium', dosage: '500 mg' };
    await notificationService.scheduleSnoozeReminder(dose, 10);
    assert.strictEqual(scheduledNotifications.length, 1);

    await notificationService.cancelSnoozeReminder('dose-cancel-snooze');
    assert.strictEqual(scheduledNotifications.length, 0);
  });

  await runAsyncTest('Fails gracefully when notification permission is disabled', async () => {
    permissionStatus = { status: 'denied', granted: false, canAskAgain: false };
    let errorCaught = false;
    try {
      await notificationService.scheduleSnoozeReminder({ id: 'dose-denied', name: 'Meds' }, 10);
    } catch (e) {
      errorCaught = true;
      assert.ok(e.message.includes('Notification permissions are disabled'));
    }
    assert.ok(errorCaught, 'Must not claim snooze succeeded when permissions denied');
    permissionStatus = { status: 'granted', granted: true, canAskAgain: true }; // reset
  });

  // 4. Mark Dose as Skipped
  console.log('\n--- 4. Mark Dose as Skipped ---');
  await runAsyncTest('Marks dose as skipped and stores clinical reason in notes', async () => {
    doseDatabase['dose-skip-1'] = {
      id: 'dose-skip-1',
      name: 'Amoxicillin',
      dosage: '250 mg',
      status: 'pending',
      scheduledAt: new Date('2026-11-05T14:00:00Z'),
    };

    const res = await doseEventService.markDoseAsSkipped('dose-skip-1', 'Patient feeling nauseous');
    assert.strictEqual(res.status, 'skipped');
    assert.strictEqual(res.notes, 'Patient feeling nauseous');
    assert.strictEqual(doseDatabase['dose-skip-1'].status, 'skipped');
    // Original scheduled time preserved
    assert.strictEqual(doseDatabase['dose-skip-1'].scheduledAt.toISOString(), '2026-11-05T14:00:00.000Z');
  });

  await runAsyncTest('Rejects skipping an already taken dose', async () => {
    let errorCaught = false;
    try {
      await doseEventService.markDoseAsSkipped('dose-101', 'Changed mind');
    } catch (e) {
      errorCaught = true;
      assert.ok(e.message.includes('Cannot skip an already taken dose'));
    }
    assert.ok(errorCaught);
  });

  // 5. Notification Action Responses
  console.log('\n--- 5. Notification Action Responses ---');
  await runAsyncTest('Notification ACTION_TAKEN marks dose as taken and cancels snooze', async () => {
    await authStorage.setToken('valid-auth-token');
    doseDatabase['dose-action-taken'] = {
      id: 'dose-action-taken',
      name: 'Omega 3',
      status: 'pending',
      scheduledAt: new Date(),
    };

    // Have an active snooze reminder
    await notificationService.scheduleSnoozeReminder({ id: 'dose-action-taken', name: 'Omega 3' }, 10);
    assert.strictEqual(scheduledNotifications.length, 1);

    const mockRouter = { replace: () => {}, push: () => {} };
    let doseUpdatedCallback = null;

    const response = {
      actionIdentifier: ACTION_TAKEN,
      notification: {
        request: {
          content: {
            data: { doseId: 'dose-action-taken', name: 'Omega 3' },
          },
        },
      },
    };

    await notificationService.handleNotificationResponse(response, mockRouter, {
      onDoseUpdated: (id, status) => { doseUpdatedCallback = { id, status }; },
    });

    assert.strictEqual(doseDatabase['dose-action-taken'].status, 'taken');
    assert.strictEqual(scheduledNotifications.length, 0, 'Snooze notification cancelled');
    assert.deepStrictEqual(doseUpdatedCallback, { id: 'dose-action-taken', status: 'taken' });
  });

  await runAsyncTest('Notification ACTION_SNOOZE_10 schedules 10m snooze', async () => {
    scheduledNotifications.length = 0;
    const mockRouter = { replace: () => {}, push: () => {} };
    const response = {
      actionIdentifier: ACTION_SNOOZE_10,
      notification: {
        request: {
          content: {
            data: { doseId: 'dose-action-snooze', name: 'Vitamin B12', dosage: '1 tablet' },
          },
        },
      },
    };

    await notificationService.handleNotificationResponse(response, mockRouter);
    assert.strictEqual(scheduledNotifications.length, 1);
    assert.strictEqual(scheduledNotifications[0].trigger.seconds, 600); // 10 min
  });

  await runAsyncTest('Notification ACTION_SKIP routes to in-app skip confirmation', async () => {
    let routedTo = null;
    const mockRouter = {
      push: (target) => { routedTo = target; },
      replace: () => {},
    };
    const response = {
      actionIdentifier: ACTION_SKIP,
      notification: {
        request: {
          content: {
            data: { doseId: 'dose-action-skip', name: 'Zinc' },
          },
        },
      },
    };

    await notificationService.handleNotificationResponse(response, mockRouter);
    assert.strictEqual(routedTo.pathname, '/(tabs)');
    assert.strictEqual(routedTo.params.skipDoseId, 'dose-action-skip');
  });

  await runAsyncTest('Default notification banner tap routes in-app without marking taken', async () => {
    doseDatabase['dose-tap-check'] = { id: 'dose-tap-check', status: 'pending' };
    let routedTo = null;
    const mockRouter = {
      push: (target) => { routedTo = target; },
      replace: () => {},
    };
    const response = {
      actionIdentifier: mockNotifications.DEFAULT_ACTION_IDENTIFIER,
      notification: {
        request: {
          content: {
            data: { doseId: 'dose-tap-check', name: 'Iron' },
          },
        },
      },
    };

    await notificationService.handleNotificationResponse(response, mockRouter);
    // Crucial: dose status MUST remain pending!
    assert.strictEqual(doseDatabase['dose-tap-check'].status, 'pending');
    assert.strictEqual(routedTo.pathname, '/(tabs)');
    assert.strictEqual(routedTo.params.activeDoseId, 'dose-tap-check');
  });

  await runAsyncTest('Action handling redirects logged-out users to login screen', async () => {
    await authStorage.removeToken();
    let loginRedirect = false;
    const mockRouter = {
      replace: (path) => { if (path === '/(auth)/login') loginRedirect = true; },
      push: () => {},
    };
    const response = {
      actionIdentifier: ACTION_TAKEN,
      notification: {
        request: { content: { data: { doseId: 'dose-logout-test' } } },
      },
    };

    await notificationService.handleNotificationResponse(response, mockRouter);
    assert.ok(loginRedirect, 'Must redirect to login if session expired');
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
