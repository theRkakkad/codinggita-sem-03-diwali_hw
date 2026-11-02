import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../ui/AppText';
import { calculateDayStats } from '../../constants/adherenceData';

/**
 * Helper to format date string YYYY-MM-DD to "Monday, Nov 2, 2026"
 */
function formatSelectedDate(dateKey) {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * DailyDoseHistoryCard (Phase 12)
 * Displays the Selected Day Summary (adherence rate, breakdown counts)
 * and chronological Daily Dose History for the selected date.
 */
export default function DailyDoseHistoryCard({
  selectedDate,
  doses = [],
}) {
  const stats = calculateDayStats(doses);
  const dateFormatted = formatSelectedDate(selectedDate);

  // Render status badge for a dose item
  const renderDoseStatusBadge = (status) => {
    switch (status) {
      case 'taken':
        return (
          <View style={[styles.badge, styles.badgeTaken]}>
            <Ionicons name="checkmark" size={11} color={Colors.success} style={{ marginRight: 3 }} />
            <AppText variant="caption" color={Colors.success} style={styles.badgeText}>
              Taken
            </AppText>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Ionicons name="time" size={11} color={Colors.warning} style={{ marginRight: 3 }} />
            <AppText variant="caption" color={Colors.warning} style={styles.badgeText}>
              Pending
            </AppText>
          </View>
        );
      case 'skipped':
        return (
          <View style={[styles.badge, styles.badgeSkipped]}>
            <Ionicons name="play-skip-forward" size={11} color={Colors.primary} style={{ marginRight: 3 }} />
            <AppText variant="caption" color={Colors.primary} style={styles.badgeText}>
              Skipped
            </AppText>
          </View>
        );
      case 'missed':
        return (
          <View style={[styles.badge, styles.badgeMissed]}>
            <Ionicons name="close" size={11} color={Colors.danger} style={{ marginRight: 3 }} />
            <AppText variant="caption" color={Colors.danger} style={styles.badgeText}>
              Missed
            </AppText>
          </View>
        );
      case 'unconfirmed':
      default:
        return (
          <View style={[styles.badge, styles.badgeUnconfirmed]}>
            <Ionicons name="help" size={11} color={Colors.textMuted} style={{ marginRight: 3 }} />
            <AppText variant="caption" color={Colors.textMuted} style={styles.badgeText}>
              Unconfirmed
            </AppText>
          </View>
        );
    }
  };

  // Render left dose icon based on status
  const renderDoseIcon = (status, type) => {
    const isCapsule = type === 'Capsule';
    switch (status) {
      case 'taken':
        return (
          <View style={[styles.iconBox, styles.iconBoxTaken]}>
            <MaterialCommunityIcons
              name={isCapsule ? 'pill' : 'pill-multiple'}
              size={22}
              color={Colors.success}
            />
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.iconBox, styles.iconBoxPending]}>
            <MaterialCommunityIcons
              name={isCapsule ? 'pill' : 'pill-multiple'}
              size={22}
              color={Colors.warning}
            />
          </View>
        );
      case 'skipped':
        return (
          <View style={[styles.iconBox, styles.iconBoxSkipped]}>
            <MaterialCommunityIcons
              name="clock-fast"
              size={22}
              color={Colors.primary}
            />
          </View>
        );
      case 'missed':
        return (
          <View style={[styles.iconBox, styles.iconBoxMissed]}>
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={22}
              color={Colors.danger}
            />
          </View>
        );
      case 'unconfirmed':
      default:
        return (
          <View style={[styles.iconBox, styles.iconBoxUnconfirmed]}>
            <Ionicons
              name="help-circle-outline"
              size={22}
              color={Colors.textMuted}
            />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. SELECTED DAY SUMMARY CARD */}
      <View style={styles.summaryCard}>
        {/* Card Header with Date and Adherence Metric */}
        <View style={styles.summaryHeader}>
          <View style={styles.summaryTitleGroup}>
            <AppText variant="label" color={Colors.primary}>
              DAILY ADHERENCE
            </AppText>
            <AppText variant="h2" style={styles.dateTitle}>
              {dateFormatted}
            </AppText>
          </View>

          {/* Adherence Rate Pill / No data tag */}
          <View
            style={[
              styles.adherenceRatePill,
              stats.adherenceRate !== null && stats.adherenceRate >= 80
                ? styles.pillHigh
                : stats.adherenceRate !== null
                ? styles.pillModerate
                : styles.pillNoData,
            ]}
          >
            {stats.adherenceRate !== null ? (
              <>
                <Ionicons
                  name="shield-checkmark"
                  size={13}
                  color={stats.adherenceRate >= 80 ? Colors.success : Colors.primary}
                  style={{ marginRight: 4 }}
                />
                <AppText
                  variant="caption"
                  color={stats.adherenceRate >= 80 ? Colors.success : Colors.primary}
                  style={styles.adherenceRateText}
                >
                  {stats.adherenceRate}% Adherence
                </AppText>
              </>
            ) : (
              <AppText variant="caption" color={Colors.textMuted} style={styles.noDataText}>
                No adherence data
              </AppText>
            )}
          </View>
        </View>

        {/* Breakdown Metric Grid (6 metrics) */}
        <View style={styles.metricsGrid}>
          {/* Scheduled */}
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>Scheduled</AppText>
            <AppText variant="body" color={Colors.textPrimary} style={styles.metricNumber}>
              {stats.total}
            </AppText>
          </View>

          {/* Taken */}
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>Taken</AppText>
            <AppText variant="body" color={Colors.success} style={styles.metricNumber}>
              {stats.taken}
            </AppText>
          </View>

          {/* Skipped */}
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>Skipped</AppText>
            <AppText variant="body" color={Colors.primary} style={styles.metricNumber}>
              {stats.skipped}
            </AppText>
          </View>

          {/* Missed */}
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>Missed</AppText>
            <AppText variant="body" color={Colors.danger} style={styles.metricNumber}>
              {stats.missed}
            </AppText>
          </View>

          {/* Pending */}
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>Pending</AppText>
            <AppText variant="body" color={Colors.warning} style={styles.metricNumber}>
              {stats.pending}
            </AppText>
          </View>

          {/* Unconfirmed */}
          <View style={styles.metricItem}>
            <AppText variant="caption" color={Colors.textMuted}>Unconfirmed</AppText>
            <AppText variant="body" color={Colors.textMuted} style={styles.metricNumber}>
              {stats.unconfirmed}
            </AppText>
          </View>
        </View>
      </View>

      {/* 2. CHRONOLOGICAL DOSE HISTORY SECTION */}
      <View style={styles.historySection}>
        <View style={styles.sectionHeaderRow}>
          <AppText variant="h2" style={styles.sectionTitle}>
            Dose history
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            {doses.length} {doses.length === 1 ? 'event' : 'events'}
          </AppText>
        </View>

        {doses.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={24} color={Colors.textMuted} />
            </View>
            <AppText variant="h3" style={styles.emptyTitle}>
              No doses recorded
            </AppText>
            <AppText variant="secondary" color={Colors.textMuted} style={styles.emptySubtitle}>
              No medication routine was scheduled or recorded for this date.
            </AppText>
          </View>
        ) : (
          /* Dose List */
          <View style={styles.doseList}>
            {doses.map((dose) => {
              return (
                <View key={dose.id} style={styles.doseCard}>
                  {/* Left Icon */}
                  {renderDoseIcon(dose.status, dose.type)}

                  {/* Main Information */}
                  <View style={styles.doseMainInfo}>
                    <View style={styles.doseTitleRow}>
                      <AppText variant="body" style={styles.medNameText}>
                        {dose.name}
                      </AppText>
                      {renderDoseStatusBadge(dose.status)}
                    </View>

                    {/* Dosage and Scheduled Time */}
                    <AppText variant="caption" color={Colors.textSecondary} style={styles.dosageSubRow}>
                      {dose.dosage} • Scheduled: {dose.scheduledTime}
                    </AppText>

                    {/* Contextual Status Feedback: Actual Time / Missed Reason / Notes */}
                    {dose.actualTime && (
                      <View style={styles.extraInfoRow}>
                        <Ionicons name="checkmark-circle-outline" size={13} color={Colors.success} style={{ marginRight: 4 }} />
                        <AppText variant="caption" color={Colors.success}>
                          Taken at {dose.actualTime}
                        </AppText>
                      </View>
                    )}

                    {dose.missedReason && (
                      <View style={styles.extraInfoRow}>
                        <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} style={{ marginRight: 4 }} />
                        <AppText variant="caption" color={Colors.danger}>
                          Confirmed missed: {dose.missedReason}
                        </AppText>
                      </View>
                    )}

                    {dose.skippedReason && (
                      <View style={styles.extraInfoRow}>
                        <Ionicons name="information-circle-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                        <AppText variant="caption" color={Colors.primary}>
                          Skipped: {dose.skippedReason}
                        </AppText>
                      </View>
                    )}

                    {dose.status === 'unconfirmed' && (
                      <View style={styles.extraInfoRow}>
                        <Ionicons name="help-circle-outline" size={13} color={Colors.textMuted} style={{ marginRight: 4 }} />
                        <AppText variant="caption" color={Colors.textMuted}>
                          {dose.notes || 'Unconfirmed: awaiting user verification'}
                        </AppText>
                      </View>
                    )}

                    {dose.status === 'pending' && (
                      <View style={styles.extraInfoRow}>
                        <Ionicons name="time-outline" size={13} color={Colors.warning} style={{ marginRight: 4 }} />
                        <AppText variant="caption" color={Colors.warning}>
                          Pending reminder for today
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  // Selected Day Summary Card
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  summaryTitleGroup: {
    flex: 1,
    paddingRight: Spacing.xs,
  },
  dateTitle: {
    marginTop: 2,
    fontSize: 18,
  },
  adherenceRatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  pillHigh: {
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
    borderColor: 'rgba(127, 168, 137, 0.3)',
  },
  pillModerate: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    borderColor: 'rgba(230, 162, 60, 0.3)',
  },
  pillNoData: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
  },
  adherenceRateText: {
    fontWeight: '700',
    fontSize: 11,
  },
  noDataText: {
    fontSize: 11,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricNumber: {
    fontWeight: '800',
    fontSize: 15,
  },
  // Dose History Section
  historySection: {
    gap: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: Typography.weight.semibold,
  },
  doseList: {
    gap: Spacing.xs,
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  iconBoxTaken: {
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
  },
  iconBoxPending: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
  },
  iconBoxSkipped: {
    backgroundColor: 'rgba(230, 162, 60, 0.08)',
  },
  iconBoxMissed: {
    backgroundColor: 'rgba(216, 121, 112, 0.12)',
  },
  iconBoxUnconfirmed: {
    backgroundColor: 'rgba(133, 138, 132, 0.12)',
  },
  doseMainInfo: {
    flex: 1,
  },
  doseTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  medNameText: {
    fontWeight: '600',
    fontSize: 15,
  },
  dosageSubRow: {
    marginBottom: 4,
  },
  extraInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  badgeTaken: {
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
    borderColor: 'rgba(127, 168, 137, 0.25)',
  },
  badgePending: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    borderColor: 'rgba(230, 162, 60, 0.25)',
  },
  badgeSkipped: {
    backgroundColor: 'rgba(230, 162, 60, 0.1)',
    borderColor: 'rgba(230, 162, 60, 0.25)',
  },
  badgeMissed: {
    backgroundColor: 'rgba(216, 121, 112, 0.12)',
    borderColor: 'rgba(216, 121, 112, 0.25)',
  },
  badgeUnconfirmed: {
    backgroundColor: 'rgba(133, 138, 132, 0.12)',
    borderColor: 'rgba(133, 138, 132, 0.25)',
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 10,
  },
  // Empty State Card
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    marginBottom: 2,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
