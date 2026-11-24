/**
 * NIYAM Phase 24 — Dashboard & Adherence Integration Test Suite
 * Validates:
 * 1. Centralized adherence calculation formulas (eligible denominator, zero denominator safety, no false 100%).
 * 2. Day-level and month-level compliance metrics.
 * 3. Next dose selection logic (chronological nearest upcoming pending dose, exclusion of past and completed doses).
 * 4. Overdue pending dose counting.
 * 5. Empty state and dashboard view transitions.
 * 6. Daily dose routine synchronization idempotency.
 */

const assert = require('assert');
const path = require('path');

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

// Import adherence utilities
const {
  calculateAdherence,
  calculateDayStats,
  calculateMonthStats,
} = require('./utils/adherence');

console.log('\n======================================================');
console.log('   NIYAM PHASE 24 — DASHBOARD & ADHERENCE SUITE        ');
console.log('======================================================\n');

// ----------------------------------------------------
// 1. Centralized Adherence Calculation (Core Formula)
// ----------------------------------------------------
console.log('--- 1. Centralized Adherence Calculation ---');

runTest('Zero denominator safety: 0 doses returns 0% (never 100% or NaN)', () => {
  const stats = calculateAdherence([]);
  assert.strictEqual(stats.total, 0);
  assert.strictEqual(stats.eligible, 0);
  assert.strictEqual(stats.taken, 0);
  assert.strictEqual(stats.adherenceRate, 0);
  assert.strictEqual(isNaN(stats.adherenceRate), false);
});

runTest('Zero denominator safety: only pending doses returns 0% (never 100% or NaN)', () => {
  const doses = [
    { id: '1', status: 'pending', scheduledAt: new Date().toISOString() },
    { id: '2', status: 'pending', scheduledAt: new Date().toISOString() },
  ];
  const stats = calculateAdherence(doses);
  assert.strictEqual(stats.total, 2);
  assert.strictEqual(stats.pending, 2);
  assert.strictEqual(stats.eligible, 0);
  assert.strictEqual(stats.adherenceRate, 0, 'Adherence must be 0% when there are no eligible completed doses');
});

runTest('Pending and unconfirmed doses are strictly excluded from eligible denominator', () => {
  const doses = [
    { id: '1', status: 'taken', scheduledAt: '2026-11-06T08:00:00Z' },
    { id: '2', status: 'pending', scheduledAt: '2026-11-06T12:00:00Z' },
    { id: '3', status: 'unconfirmed', scheduledAt: '2026-11-06T18:00:00Z' },
  ];
  const stats = calculateAdherence(doses);
  assert.strictEqual(stats.total, 3);
  assert.strictEqual(stats.taken, 1);
  assert.strictEqual(stats.pending, 1);
  assert.strictEqual(stats.unconfirmed, 1);
  assert.strictEqual(stats.eligible, 1, 'Eligible denominator must only count taken, skipped, and missed');
  assert.strictEqual(stats.adherenceRate, 100, '1 taken out of 1 eligible = 100%');
});

runTest('Adherence formula: (Taken / (Taken + Skipped + Missed)) * 100', () => {
  const doses = [
    { id: '1', status: 'taken' },
    { id: '2', status: 'taken' },
    { id: '3', status: 'skipped' },
    { id: '4', status: 'missed' },
    { id: '5', status: 'pending' },
    { id: '6', status: 'unconfirmed' },
  ];
  const stats = calculateAdherence(doses);
  assert.strictEqual(stats.total, 6);
  assert.strictEqual(stats.taken, 2);
  assert.strictEqual(stats.skipped, 1);
  assert.strictEqual(stats.missed, 1);
  assert.strictEqual(stats.pending, 1);
  assert.strictEqual(stats.unconfirmed, 1);
  assert.strictEqual(stats.eligible, 4, 'Eligible = 2 taken + 1 skipped + 1 missed = 4');
  // (2 / 4) * 100 = 50%
  assert.strictEqual(stats.adherenceRate, 50);
});

runTest('Rounding: fractional rates are rounded cleanly with Math.round', () => {
  const doses = [
    { id: '1', status: 'taken' },
    { id: '2', status: 'missed' },
    { id: '3', status: 'missed' },
  ];
  const stats = calculateAdherence(doses);
  // (1 / 3) * 100 = 33.333... -> 33%
  assert.strictEqual(stats.adherenceRate, 33);
});

// ----------------------------------------------------
// 2. Daily & Monthly Adherence History
// ----------------------------------------------------
console.log('\n--- 2. Daily & Monthly Adherence Compliance ---');

runTest('calculateDayStats classifies compliance and indicatorState accurately', () => {
  // All taken: 100%
  const perfectDay = calculateDayStats([{ status: 'taken' }]);
  assert.strictEqual(perfectDay.adherenceRate, 100);
  assert.strictEqual(perfectDay.indicatorState, 'all_taken');

  // Missed: contains missed
  const missedDay = calculateDayStats([
    { status: 'taken' },
    { status: 'missed' },
  ]);
  assert.strictEqual(missedDay.adherenceRate, 50);
  assert.strictEqual(missedDay.indicatorState, 'missed');

  // Pending or skipped
  const pendingDay = calculateDayStats([
    { status: 'taken' },
    { status: 'pending' },
  ]);
  assert.strictEqual(pendingDay.adherenceRate, 100);
  assert.strictEqual(pendingDay.indicatorState, 'pending_or_skipped');

  // Empty: no doses returns null adherenceRate and 'none'
  const emptyDay = calculateDayStats([]);
  assert.strictEqual(emptyDay.adherenceRate, null);
  assert.strictEqual(emptyDay.indicatorState, 'none');
});

runTest('calculateMonthStats aggregates monthly compliance across active days', () => {
  const records = {
    '2026-11-01': [{ status: 'taken' }, { status: 'taken' }], // 2 taken, 100%
    '2026-11-02': [{ status: 'taken' }, { status: 'missed' }], // 1 taken, 1 missed, 50%
    '2026-11-03': [{ status: 'skipped' }], // 0 taken, 1 skipped, 0%
    '2026-11-04': [{ status: 'pending' }], // pending only, 0 eligible
  };

  const monthStats = calculateMonthStats(2026, 10, records); // Month index 10 = November
  assert.strictEqual(monthStats.totalScheduled, 6);
  assert.strictEqual(monthStats.taken, 3);
  assert.strictEqual(monthStats.missed, 1);
  assert.strictEqual(monthStats.skipped, 1);
  assert.strictEqual(monthStats.totalEligible, 5); // 3 taken + 1 missed + 1 skipped
  // (3 / 5) * 100 = 60%
  assert.strictEqual(monthStats.overallAdherence, 60);
  assert.strictEqual(monthStats.daysWithActivity, 4); // Days with scheduled records in month
});

// ----------------------------------------------------
// 3. Next Dose Logic & Filtering
// ----------------------------------------------------
console.log('\n--- 3. Next Dose Logic & Filtering ---');

function computeNextDoseState(doses, now = new Date()) {
  const pending = doses.filter((d) => d.status === 'pending');

  const upcoming = pending
    .filter((d) => new Date(d.scheduledAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const overdue = pending
    .filter((d) => new Date(d.scheduledAt).getTime() < now.getTime());

  return {
    nextUpcomingDose: upcoming.length > 0 ? upcoming[0] : null,
    overduePendingCount: overdue.length,
  };
}

runTest('Selects earliest upcoming pending dose scheduled at or after now', () => {
  const now = new Date('2026-11-06T10:00:00Z');
  const doses = [
    { id: '1', name: 'Med 1', status: 'pending', scheduledAt: '2026-11-06T08:00:00Z' }, // Overdue
    { id: '2', name: 'Med 2', status: 'pending', scheduledAt: '2026-11-06T14:00:00Z' }, // Upcoming 2
    { id: '3', name: 'Med 3', status: 'pending', scheduledAt: '2026-11-06T11:00:00Z' }, // Nearest upcoming
    { id: '4', name: 'Med 4', status: 'taken', scheduledAt: '2026-11-06T11:00:00Z' },   // Already taken
  ];

  const { nextUpcomingDose, overduePendingCount } = computeNextDoseState(doses, now);
  assert(nextUpcomingDose !== null, 'Should find upcoming dose');
  assert.strictEqual(nextUpcomingDose.id, '3', 'Nearest upcoming dose must be Med 3 (11:00 AM)');
  assert.strictEqual(overduePendingCount, 1, 'Med 1 (08:00 AM) must be counted as overdue');
});

runTest('Never selects taken, skipped, missed, or unconfirmed doses as next upcoming dose', () => {
  const now = new Date('2026-11-06T10:00:00Z');
  const doses = [
    { id: '1', name: 'Med 1', status: 'taken', scheduledAt: '2026-11-06T12:00:00Z' },
    { id: '2', name: 'Med 2', status: 'skipped', scheduledAt: '2026-11-06T14:00:00Z' },
    { id: '3', name: 'Med 3', status: 'missed', scheduledAt: '2026-11-06T16:00:00Z' },
    { id: '4', name: 'Med 4', status: 'unconfirmed', scheduledAt: '2026-11-06T18:00:00Z' },
  ];

  const { nextUpcomingDose } = computeNextDoseState(doses, now);
  assert.strictEqual(nextUpcomingDose, null, 'No pending doses should result in null nextUpcomingDose');
});

runTest('Detects all overdue pending doses when scheduled times are past', () => {
  const now = new Date('2026-11-06T20:00:00Z');
  const doses = [
    { id: '1', name: 'Med 1', status: 'pending', scheduledAt: '2026-11-06T08:00:00Z' },
    { id: '2', name: 'Med 2', status: 'pending', scheduledAt: '2026-11-06T13:00:00Z' },
  ];

  const { nextUpcomingDose, overduePendingCount } = computeNextDoseState(doses, now);
  assert.strictEqual(nextUpcomingDose, null);
  assert.strictEqual(overduePendingCount, 2);
});

// ----------------------------------------------------
// 4. Dashboard View & Empty State Transitions
// ----------------------------------------------------
console.log('\n--- 4. Dashboard View & Empty State Transitions ---');

function resolveDashboardCardState({
  doses,
  userMedicinesCount,
  nextUpcomingDose,
  overduePendingCount,
}) {
  const stats = calculateAdherence(doses);
  const totalDoses = stats.total;
  const takenCount = stats.taken;
  const pendingCount = stats.pending;

  if (nextUpcomingDose) {
    return 'NEXT_DOSE';
  }
  if (overduePendingCount > 0) {
    return 'PENDING_REVIEW';
  }
  if (totalDoses > 0 && takenCount === totalDoses) {
    return 'ALL_DONE_TAKEN';
  }
  if (totalDoses > 0 && pendingCount === 0) {
    return 'ALL_LOGGED';
  }
  if (userMedicinesCount === 0) {
    return 'NO_MEDICINES_GET_STARTED';
  }
  return 'NO_DOSES_TODAY';
}

runTest('Displays GET STARTED state when user has 0 medicines configured', () => {
  const state = resolveDashboardCardState({
    doses: [],
    userMedicinesCount: 0,
    nextUpcomingDose: null,
    overduePendingCount: 0,
  });
  assert.strictEqual(state, 'NO_MEDICINES_GET_STARTED');
});

runTest('Displays NO DOSES TODAY state when user has medicines but 0 doses scheduled today', () => {
  const state = resolveDashboardCardState({
    doses: [],
    userMedicinesCount: 3,
    nextUpcomingDose: null,
    overduePendingCount: 0,
  });
  assert.strictEqual(state, 'NO_DOSES_TODAY');
});

runTest('Displays ALL DONE state when all scheduled doses for today were taken', () => {
  const doses = [
    { id: '1', status: 'taken', scheduledAt: '2026-11-06T08:00:00Z' },
    { id: '2', status: 'taken', scheduledAt: '2026-11-06T12:00:00Z' },
  ];
  const state = resolveDashboardCardState({
    doses,
    userMedicinesCount: 2,
    nextUpcomingDose: null,
    overduePendingCount: 0,
  });
  assert.strictEqual(state, 'ALL_DONE_TAKEN');
});

runTest('Displays ALL LOGGED state when all doses are reviewed (some taken, some skipped)', () => {
  const doses = [
    { id: '1', status: 'taken', scheduledAt: '2026-11-06T08:00:00Z' },
    { id: '2', status: 'skipped', scheduledAt: '2026-11-06T12:00:00Z' },
  ];
  const state = resolveDashboardCardState({
    doses,
    userMedicinesCount: 2,
    nextUpcomingDose: null,
    overduePendingCount: 0,
  });
  assert.strictEqual(state, 'ALL_LOGGED');
});

// ----------------------------------------------------
// 5. Daily Routine Synchronization Logic
// ----------------------------------------------------
console.log('\n--- 5. Daily Routine Synchronization Idempotency ---');

runTest('Daily sync creates missing pending dose events without duplicating existing ones', () => {
  const activeMedicines = [
    {
      _id: 'med-1',
      name: 'Metformin',
      dosage: '500mg',
      type: 'tablet',
      status: 'active',
      reminderTimes: ['08:00 AM', '08:00 PM'],
    },
    {
      _id: 'med-2',
      name: 'Atorvastatin',
      dosage: '20mg',
      type: 'tablet',
      status: 'active',
      reminderTimes: ['09:00 PM'],
    },
  ];

  // Simulate existing events: Morning Metformin was already taken!
  const existingEvents = [
    {
      _id: 'ev-1',
      medicine: 'med-1',
      name: 'Metformin',
      status: 'taken',
      scheduledAt: new Date('2026-11-06T08:00:00').toISOString(),
      takenAt: new Date('2026-11-06T08:05:00').toISOString(),
    },
  ];

  // Helper matching controller's check
  function simulateSync(meds, events, targetDateStr = '2026-11-06') {
    const results = [...events];

    for (const med of meds) {
      if (med.status !== 'active') continue;
      const reminders = med.reminderTimes || [];

      for (const timeStr of reminders) {
        // Simple 12-hour parse
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3] ? match[3].toUpperCase() : null;
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;

        const sched = new Date(`${targetDateStr}T00:00:00`);
        sched.setHours(hours, minutes, 0, 0);

        // Check window
        const windowStart = new Date(sched.getTime() - 60000);
        const windowEnd = new Date(sched.getTime() + 60000);

        const exists = results.some((e) => {
          const eMedId = e.medicine ? (e.medicine._id || e.medicine) : null;
          if (String(eMedId) !== String(med._id)) return false;
          const eTime = new Date(e.scheduledAt).getTime();
          return eTime >= windowStart.getTime() && eTime <= windowEnd.getTime();
        });

        if (!exists) {
          results.push({
            _id: `ev-new-${results.length + 1}`,
            medicine: med._id,
            name: med.name,
            dosage: med.dosage,
            status: 'pending',
            scheduledAt: sched.toISOString(),
          });
        }
      }
    }
    return results;
  }

  // First sync pass: Metformin 08:00 AM already exists (taken) and must NOT be recreated or modified
  const pass1 = simulateSync(activeMedicines, existingEvents);
  assert.strictEqual(pass1.length, 3, 'Should have 3 total events (1 existing taken + 2 newly created pending)');
  
  const takenMetformin = pass1.find((e) => e.medicine === 'med-1' && e.status === 'taken');
  assert(takenMetformin, 'Existing taken event must be preserved untouched');
  assert.strictEqual(takenMetformin._id, 'ev-1');

  // Second sync pass: must be completely idempotent and create 0 duplicates
  const pass2 = simulateSync(activeMedicines, pass1);
  assert.strictEqual(pass2.length, 3, 'Running sync again must not duplicate any events');
});

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passCount} / ${passCount + failCount} passed (${failCount} failed)`);
console.log('======================================================\n');

if (failCount > 0) {
  process.exit(1);
}
