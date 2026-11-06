/**
 * Centralized Adherence Calculation Utilities (Phase 24)
 * Single source of truth for adherence calculations across Dashboard, Calendar, and History.
 *
 * Formula:
 * Adherence = (Taken doses / Eligible scheduled doses) * 100
 *
 * Eligible doses include:
 * - Taken
 * - Skipped
 * - Confirmed missed
 *
 * Strictly excluded from eligible denominator:
 * - Pending
 * - Unconfirmed
 * - Future scheduled doses
 *
 * Safety rules:
 * - Skipped doses are NOT counted as taken.
 * - Pending and unconfirmed doses are NOT counted as missed.
 * - Never show 100% when there are zero eligible doses.
 * - Zero denominator safely returns 0 (or null for evaluating months).
 */

/**
 * Calculate adherence metrics for an array of dose events (single day or arbitrary set)
 * @param {Array} doses Array of normalized DoseEvent objects
 * @returns {object} Calculated metrics object
 */
export function calculateAdherence(doses = []) {
  if (!Array.isArray(doses)) {
    doses = [];
  }

  const total = doses.length;
  const taken = doses.filter((d) => d.status === 'taken').length;
  const skipped = doses.filter((d) => d.status === 'skipped').length;
  const missed = doses.filter((d) => d.status === 'missed').length;
  const pending = doses.filter((d) => d.status === 'pending').length;
  const unconfirmed = doses.filter((d) => d.status === 'unconfirmed').length;

  // Eligible scheduled doses: only resolved events where user action or explicit confirmation occurred
  const eligible = taken + skipped + missed;

  // Adherence rate: 0 if no eligible doses, never 100% when eligible is 0
  const adherenceRate = eligible > 0 ? Math.round((taken / eligible) * 100) : 0;

  // Visual indicator color mapping:
  // - 'all_taken' (Green): All scheduled doses for this day have been taken
  // - 'pending_or_skipped' (Amber): Some doses remain pending or were skipped
  // - 'missed' (Muted Red): At least one confirmed missed dose
  // - 'unconfirmed' (Grey): Contains unconfirmed doses awaiting clinical review
  // - 'none': No recorded dose activity
  let indicatorState = 'none';

  if (total === 0) {
    indicatorState = 'none';
  } else if (missed > 0) {
    indicatorState = 'missed';
  } else if (pending > 0 || skipped > 0) {
    indicatorState = 'pending_or_skipped';
  } else if (taken === total && total > 0) {
    indicatorState = 'all_taken';
  } else if (unconfirmed > 0) {
    indicatorState = 'unconfirmed';
  }

  return {
    total,
    taken,
    skipped,
    missed,
    pending,
    unconfirmed,
    eligible,
    adherenceRate,
    indicatorState,
  };
}

/**
 * Calculate single-day adherence statistics (compatible with Phase 12 signature)
 * @param {Array} doses
 * @returns {object}
 */
export function calculateDayStats(doses = []) {
  const stats = calculateAdherence(doses);
  return {
    ...stats,
    // Provide null adherenceRate when eligible is 0 for calendar evaluating state
    adherenceRate: stats.eligible > 0 ? stats.adherenceRate : null,
  };
}

/**
 * Calculate dynamic monthly statistics for a given year and month
 * @param {number} year
 * @param {number} monthIndex 0-indexed month
 * @param {object} records Map of 'YYYY-MM-DD' -> DoseEvent[]
 * @returns {object}
 */
export function calculateMonthStats(year, monthIndex, records = {}) {
  const monthStr = String(monthIndex + 1).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  let totalScheduled = 0;
  let taken = 0;
  let skipped = 0;
  let missed = 0;
  let pending = 0;
  let unconfirmed = 0;
  let daysWithActivity = 0;

  Object.entries(records).forEach(([dateKey, dayDoses]) => {
    if (dateKey.startsWith(prefix) && Array.isArray(dayDoses) && dayDoses.length > 0) {
      daysWithActivity += 1;
      totalScheduled += dayDoses.length;
      dayDoses.forEach((dose) => {
        if (dose.status === 'taken') taken += 1;
        else if (dose.status === 'skipped') skipped += 1;
        else if (dose.status === 'missed') missed += 1;
        else if (dose.status === 'pending') pending += 1;
        else if (dose.status === 'unconfirmed') unconfirmed += 1;
      });
    }
  });

  const totalEligible = taken + skipped + missed;
  const overallAdherence = totalEligible > 0 ? Math.round((taken / totalEligible) * 100) : null;

  return {
    year,
    monthIndex,
    totalScheduled,
    totalEligible,
    taken,
    skipped,
    missed,
    pending,
    unconfirmed,
    overallAdherence,
    daysWithActivity,
  };
}

export default {
  calculateAdherence,
  calculateDayStats,
  calculateMonthStats,
};

