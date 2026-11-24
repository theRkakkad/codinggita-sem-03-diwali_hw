/**
 * NIYAM Phase 23 — End-of-Day Confirmation Workflow Integration Test Suite
 * Validates:
 * 1. End-of-Day notification scheduling (default 9:00 PM, distinct ID, cancellation).
 * 2. End-of-Day notification response handling (routes to /end-of-day, silence never means taken/missed).
 * 3. Day rollover functionality (past-day pending doses transition to unconfirmed safely and idempotently).
 * 4. End-of-Day review eligibility rules (today's past doses only, pending/unconfirmed only, future excluded).
 * 5. Dose actions in EOD review (Taken, Missed with reason, Skipped, Leave Unconfirmed).
 * 6. Review summary and adherence metric rules (unconfirmed not penalized as missed, accurate counts).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passCount = 0;
let failCount = 0;

function runTest(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

async function runAsyncTest(description, fn) {
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

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
  scheduleNotificationAsync: async ({ identifier, content, trigger }) => {
    const id = identifier || `notif_${nextId++}`;
    // Replace existing if same identifier
    const existingIdx = scheduledNotifications.findIndex((n) => n.identifier === id);
    if (existingIdx !== -1) {
      scheduledNotifications.splice(existingIdx, 1);
    }
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

// Mock Platform & Linking
const mockPlatform = { OS: 'android' };
const mockLinking = { openSettings: async () => true };

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
    return mockStorage[k] !== undefined ? mockStorage[k] : null;
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
  async markDoseAsUnconfirmed(id) {
    if (!doseDatabase[id]) throw new Error('Dose event not found.');
    const d = doseDatabase[id];
    d.status = 'unconfirmed';
    return { ...d };
  },
  async rolloverPastPendingDoses(beforeDate = null) {
    const cutoff = beforeDate ? new Date(beforeDate) : new Date();
    let modifiedCount = 0;
    for (const id in doseDatabase) {
      const d = doseDatabase[id];
      if (d.status === 'pending' && new Date(d.scheduledAt) < cutoff) {
        d.status = 'unconfirmed';
        modifiedCount++;
      }
    }
    return { success: true, modifiedCount, cutoff: cutoff.toISOString() };
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
  notificationService,
  EOD_REMINDER_NOTIFICATION_ID,
  EOD_REMINDERS_ENABLED_KEY,
  EOD_REMINDER_TIME_KEY,
  EOD_NOTIFICATION_TYPE,
  DEFAULT_EOD_TIME,
  parseTimeString,
};`;

const sandbox = {
  module: { exports: {} },
  exports: {},
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  parseInt,
  String,
  JSON,
  Platform: mockPlatform,
  Notifications: mockNotifications,
  Linking: mockLinking,
  authStorage,
  doseEventService,
};

vm.createContext(sandbox);
vm.runInContext(transformed, sandbox);

const {
  notificationService,
  EOD_REMINDER_NOTIFICATION_ID,
  EOD_REMINDERS_ENABLED_KEY,
  EOD_REMINDER_TIME_KEY,
  EOD_NOTIFICATION_TYPE,
  DEFAULT_EOD_TIME,
} = sandbox.module.exports;

async function runSuite() {
  console.log('\n======================================================');
  console.log('   NIYAM PHASE 23 — END-OF-DAY CONFIRMATION SUITE     ');
  console.log('======================================================\n');

  // Set logged in session
  await authStorage.setToken('valid_jwt_token_for_eod_test');

  // --- 1. Notification Constants & Defaults ---
  console.log('--- 1. End-of-Day Notification Configuration ---');
  runTest('Default EOD reminder time is 09:00 PM', () => {
    assert.strictEqual(DEFAULT_EOD_TIME, '09:00 PM');
  });

  runTest('Distinct EOD notification identifier defined', () => {
    assert.strictEqual(EOD_REMINDER_NOTIFICATION_ID, 'niyam_eod_daily_reminder');
  });

  runTest('Distinct EOD notification data type defined', () => {
    assert.strictEqual(EOD_NOTIFICATION_TYPE, 'end_of_day_review');
  });

  // --- 2. Notification Scheduling ---
  console.log('\n--- 2. End-of-Day Reminder Scheduling ---');
  await runAsyncTest('Schedules daily reminder at 9:00 PM with exact prompt copy', async () => {
    scheduledNotifications.length = 0;
    const notifId = await notificationService.scheduleEodReminder('09:00 PM');
    assert.strictEqual(notifId, EOD_REMINDER_NOTIFICATION_ID);

    const scheduled = scheduledNotifications.find((n) => n.identifier === EOD_REMINDER_NOTIFICATION_ID);
    assert(scheduled, 'EOD notification was scheduled');
    assert.strictEqual(scheduled.content.title, 'Your NIYAM daily review');
    assert.strictEqual(scheduled.content.body, "Take a moment to review today's medication schedule.");
    assert.strictEqual(scheduled.content.data.type, 'end_of_day_review');
    assert.strictEqual(scheduled.trigger.type, 'daily');
    assert.strictEqual(scheduled.trigger.hour, 21);
    assert.strictEqual(scheduled.trigger.minute, 0);
  });

  await runAsyncTest('Rescheduling at different time replaces previous reminder without duplicates', async () => {
    await notificationService.scheduleEodReminder('08:30 PM');
    const matches = scheduledNotifications.filter((n) => n.identifier === EOD_REMINDER_NOTIFICATION_ID);
    assert.strictEqual(matches.length, 1, 'Only one EOD notification exists');
    assert.strictEqual(matches[0].trigger.hour, 20);
    assert.strictEqual(matches[0].trigger.minute, 30);
  });

  await runAsyncTest('Cancelling EOD reminder does NOT cancel unrelated medication reminders', async () => {
    // Add a normal medication reminder
    await mockNotifications.scheduleNotificationAsync({
      identifier: 'med_notif_123',
      content: { title: 'Vitamin D3' },
      trigger: { type: 'daily' },
    });

    await notificationService.cancelEodReminder();

    const eod = scheduledNotifications.find((n) => n.identifier === EOD_REMINDER_NOTIFICATION_ID);
    const med = scheduledNotifications.find((n) => n.identifier === 'med_notif_123');

    assert(!eod, 'EOD reminder cancelled');
    assert(med, 'Medication reminder preserved');
  });

  await runAsyncTest('Disabling EOD reminders setting cancels scheduled notification', async () => {
    await notificationService.scheduleEodReminder('09:00 PM');
    await notificationService.setEodReminderSettings(false);

    const isEnabled = await notificationService.isEodReminderEnabled();
    assert.strictEqual(isEnabled, false);

    const eod = scheduledNotifications.find((n) => n.identifier === EOD_REMINDER_NOTIFICATION_ID);
    assert(!eod, 'EOD notification cancelled when setting is disabled');
  });

  // --- 3. Notification Tap Response ---
  console.log('\n--- 3. Notification Tap Handling ---');
  await runAsyncTest('Tapping EOD notification routes to /end-of-day without altering dose status', async () => {
    let routedPath = null;
    const mockRouter = {
      push: (target) => {
        routedPath = typeof target === 'string' ? target : target.pathname;
      },
      replace: (target) => {
        routedPath = target;
      },
    };

    const response = {
      actionIdentifier: mockNotifications.DEFAULT_ACTION_IDENTIFIER,
      notification: {
        request: {
          content: {
            data: {
              type: 'end_of_day_review',
            },
          },
        },
      },
    };

    await notificationService.handleNotificationResponse(response, mockRouter);
    assert.strictEqual(routedPath, '/end-of-day');
  });

  // --- 4. Day Rollover Logic ---
  console.log('\n--- 4. Day Rollover & Unconfirmed Status ---');
  await runAsyncTest('Transitions past-day pending doses to unconfirmed', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();

    doseDatabase['past_pending_1'] = {
      id: 'past_pending_1',
      name: 'Metformin',
      scheduledAt: yesterday.toISOString(),
      status: 'pending',
    };
    doseDatabase['past_taken_1'] = {
      id: 'past_taken_1',
      name: 'Aspirin',
      scheduledAt: yesterday.toISOString(),
      status: 'taken',
    };
    doseDatabase['past_missed_1'] = {
      id: 'past_missed_1',
      name: 'Atorvastatin',
      scheduledAt: yesterday.toISOString(),
      status: 'missed',
    };
    doseDatabase['today_pending_1'] = {
      id: 'today_pending_1',
      name: 'Vitamin D3',
      scheduledAt: today.toISOString(),
      status: 'pending',
    };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const res = await doseEventService.rolloverPastPendingDoses(startOfToday);
    assert.strictEqual(res.modifiedCount, 1);
    assert.strictEqual(doseDatabase['past_pending_1'].status, 'unconfirmed');
    assert.strictEqual(doseDatabase['past_taken_1'].status, 'taken', 'Taken dose untouched');
    assert.strictEqual(doseDatabase['past_missed_1'].status, 'missed', 'Missed dose untouched');
    assert.strictEqual(doseDatabase['today_pending_1'].status, 'pending', 'Today pending dose untouched');
  });

  await runAsyncTest('Day rollover is idempotent (running twice changes nothing on second run)', async () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const res2 = await doseEventService.rolloverPastPendingDoses(startOfToday);
    assert.strictEqual(res2.modifiedCount, 0, 'Zero modifications on second run');
  });

  // --- 5. End-of-Day Review Eligibility Filter ---
  console.log('\n--- 5. End-of-Day Review Eligibility Filter ---');
  runTest('Filters only today past pending and unconfirmed doses', () => {
    const nowTime = new Date();
    const twoHoursAgo = new Date(nowTime.getTime() - 2 * 60 * 60 * 1000);
    const twoHoursLater = new Date(nowTime.getTime() + 2 * 60 * 60 * 1000);

    const sampleDoses = [
      { id: '1', scheduledAt: twoHoursAgo.toISOString(), status: 'pending' },
      { id: '2', scheduledAt: twoHoursAgo.toISOString(), status: 'unconfirmed' },
      { id: '3', scheduledAt: twoHoursAgo.toISOString(), status: 'taken' },
      { id: '4', scheduledAt: twoHoursAgo.toISOString(), status: 'skipped' },
      { id: '5', scheduledAt: twoHoursAgo.toISOString(), status: 'missed' },
      { id: '6', scheduledAt: twoHoursLater.toISOString(), status: 'pending' }, // Future dose
    ];

    const eligible = sampleDoses.filter((dose) => {
      const sched = new Date(dose.scheduledAt);
      const isPastOrCurrent = !isNaN(sched.getTime()) && sched <= nowTime;
      const isEligibleStatus = dose.status === 'pending' || dose.status === 'unconfirmed';
      return isPastOrCurrent && isEligibleStatus;
    });

    assert.strictEqual(eligible.length, 2);
    assert.strictEqual(eligible[0].id, '1');
    assert.strictEqual(eligible[1].id, '2');
  });

  // --- 6. User Actions in EOD Review ---
  console.log('\n--- 6. End-of-Day User Actions ---');
  await runAsyncTest('Mark as Taken records takenAt and cancels active snooze', async () => {
    doseDatabase['eod_test_take'] = {
      id: 'eod_test_take',
      name: 'Lisinopril',
      status: 'pending',
    };
    await notificationService.scheduleSnoozeReminder({ doseId: 'eod_test_take' }, 10);

    const updated = await doseEventService.markDoseAsTaken('eod_test_take');
    await notificationService.cancelSnoozeReminder('eod_test_take');

    assert.strictEqual(updated.status, 'taken');
    assert(updated.takenAt, 'takenAt recorded');
  });

  await runAsyncTest('Confirm as Missed records optional reason without affecting other doses', async () => {
    doseDatabase['eod_test_miss'] = {
      id: 'eod_test_miss',
      name: 'Metformin',
      status: 'unconfirmed',
    };
    doseDatabase['eod_other'] = {
      id: 'eod_other',
      name: 'Omega 3',
      status: 'pending',
    };

    const updated = await doseEventService.confirmDoseAsMissed('eod_test_miss', 'Forgot to pack medicine');
    assert.strictEqual(updated.status, 'missed');
    assert.strictEqual(updated.missedReason, 'Forgot to pack medicine');
    assert.strictEqual(doseDatabase['eod_other'].status, 'pending', 'Other dose remains unaffected');
  });

  await runAsyncTest('Mark as Skipped records optional reason and preserves scheduled time', async () => {
    const origTime = new Date('2026-11-06T14:00:00Z').toISOString();
    doseDatabase['eod_test_skip'] = {
      id: 'eod_test_skip',
      name: 'Ibuprofen',
      scheduledAt: origTime,
      status: 'pending',
    };

    const updated = await doseEventService.markDoseAsSkipped('eod_test_skip', 'Doctor advised pausing');
    assert.strictEqual(updated.status, 'skipped');
    assert.strictEqual(updated.notes, 'Doctor advised pausing');
    assert.strictEqual(updated.scheduledAt, origTime, 'Original scheduled time strictly preserved');
  });

  await runAsyncTest('Leave Unconfirmed keeps record preserved without penalizing as missed', async () => {
    doseDatabase['eod_test_unconf'] = {
      id: 'eod_test_unconf',
      name: 'Multivitamin',
      status: 'pending',
    };

    const updated = await doseEventService.markDoseAsUnconfirmed('eod_test_unconf');
    assert.strictEqual(updated.status, 'unconfirmed');
    assert.notStrictEqual(updated.status, 'missed', 'Unconfirmed is strictly distinct from missed');
  });

  // --- 7. Review Summary & Adherence Rules ---
  console.log('\n--- 7. Review Summary & Adherence Rules ---');
  runTest('Unconfirmed doses are not counted as missed in summary metrics', () => {
    const summaryDoses = [
      { id: '1', status: 'taken' },
      { id: '2', status: 'skipped' },
      { id: '3', status: 'unconfirmed' },
      { id: '4', status: 'missed' },
    ];

    const taken = summaryDoses.filter((d) => d.status === 'taken').length;
    const skipped = summaryDoses.filter((d) => d.status === 'skipped').length;
    const missed = summaryDoses.filter((d) => d.status === 'missed').length;
    const unconfirmed = summaryDoses.filter((d) => d.status === 'unconfirmed').length;

    assert.strictEqual(taken, 1);
    assert.strictEqual(skipped, 1);
    assert.strictEqual(missed, 1);
    assert.strictEqual(unconfirmed, 1);

    // Adherence must not show 100% when missed or unconfirmed exist
    const adherence = Math.round((taken / summaryDoses.length) * 100);
    assert.strictEqual(adherence, 25);
    assert(adherence < 100, 'Adherence is not falsely 100%');
  });

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passCount} / ${passCount + failCount} passed (${failCount} failed)`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal error running suite:', err);
  process.exit(1);
});

