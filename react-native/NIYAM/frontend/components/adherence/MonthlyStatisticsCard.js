import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../ui/AppText';
import { MONTH_NAMES_FULL } from '../../constants/adherenceData';

/**
 * MonthlyStatisticsCard (Phase 12)
 * Renders monthly adherence totals, evaluated compliance rate,
 * visual progress bar, and summary metrics computed dynamically from records.
 */
export default function MonthlyStatisticsCard({ monthStats }) {
  if (!monthStats) return null;

  const monthLabel = MONTH_NAMES_FULL[monthStats.monthIndex] || '';
  const adherence = monthStats.overallAdherence;
  const hasData = adherence !== null;

  // Determine adherence rating tier
  let ratingTier = 'Evaluating';
  let tierColor = Colors.primary;
  if (hasData) {
    if (adherence >= 85) {
      ratingTier = 'Optimal Consistency';
      tierColor = Colors.success;
    } else if (adherence >= 70) {
      ratingTier = 'Moderate Adherence';
      tierColor = Colors.warning;
    } else {
      ratingTier = 'Needs Attention';
      tierColor = Colors.danger;
    }
  }

  return (
    <View style={styles.container}>
      {/* SECTION HEADER */}
      <View style={styles.sectionHeader}>
        <AppText variant="h2" style={styles.sectionTitle}>
          Monthly summary
        </AppText>
        <View style={styles.monthTag}>
          <AppText variant="caption" color={Colors.primary} style={styles.monthTagText}>
            {monthLabel} {monthStats.year}
          </AppText>
        </View>
      </View>

      {/* MAIN SUMMARY CARD */}
      <View style={styles.card}>
        {/* Top Score Block */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreLeft}>
            <AppText variant="label" color={Colors.textMuted}>
              EVALUATED ADHERENCE
            </AppText>
            <View style={styles.scoreNumberRow}>
              <AppText variant="h1" color={hasData ? Colors.textPrimary : Colors.textMuted} style={styles.scoreText}>
                {hasData ? `${adherence}%` : 'No data'}
              </AppText>
            </View>
            <AppText variant="caption" color={Colors.textMuted}>
              Based on {monthStats.totalEligible} evaluated doses
            </AppText>
          </View>

          {/* Tier Badge */}
          {hasData && (
            <View style={[styles.tierBadge, { borderColor: tierColor, backgroundColor: 'rgba(23, 26, 25, 0.6)' }]}>
              <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
              <AppText variant="caption" color={tierColor} style={styles.tierText}>
                {ratingTier}
              </AppText>
            </View>
          )}
        </View>

        {/* Visual Progress Bar (Pure StyleSheet, No external chart library) */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: hasData ? `${Math.min(Math.max(adherence, 4), 100)}%` : '0%',
                backgroundColor: hasData && adherence >= 85 ? Colors.success : Colors.primary,
              },
            ]}
          />
        </View>

        {/* 4 Compact Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          {/* 1. Eligible Doses */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="clipboard-outline" size={14} color={Colors.textMuted} style={{ marginRight: 4 }} />
              <AppText variant="caption" color={Colors.textMuted}>Eligible</AppText>
            </View>
            <AppText variant="h3" color={Colors.textPrimary} style={styles.metricValue}>
              {monthStats.totalEligible}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted} style={styles.metricSub}>
              Evaluated
            </AppText>
          </View>

          {/* 2. Taken Doses */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.success} style={{ marginRight: 4 }} />
              <AppText variant="caption" color={Colors.textMuted}>Taken</AppText>
            </View>
            <AppText variant="h3" color={Colors.success} style={styles.metricValue}>
              {monthStats.taken}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted} style={styles.metricSub}>
              Completed
            </AppText>
          </View>

          {/* 3. Skipped Doses */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="play-skip-forward-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
              <AppText variant="caption" color={Colors.textMuted}>Skipped</AppText>
            </View>
            <AppText variant="h3" color={Colors.primary} style={styles.metricValue}>
              {monthStats.skipped}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted} style={styles.metricSub}>
              Planned pause
            </AppText>
          </View>

          {/* 4. Confirmed Missed Doses */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="close-circle-outline" size={14} color={Colors.danger} style={{ marginRight: 4 }} />
              <AppText variant="caption" color={Colors.textMuted}>Missed</AppText>
            </View>
            <AppText variant="h3" color={Colors.danger} style={styles.metricValue}>
              {monthStats.missed}
            </AppText>
            <AppText variant="caption" color={Colors.textMuted} style={styles.metricSub}>
              User confirmed
            </AppText>
          </View>
        </View>

        {/* Footer Activity Count & Educational Note */}
        <View style={styles.footerNoteRow}>
          <View style={styles.activityBadge}>
            <Ionicons name="calendar" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
            <AppText variant="caption" color={Colors.textPrimary} style={styles.activityText}>
              {monthStats.daysWithActivity} {monthStats.daysWithActivity === 1 ? 'day' : 'days'} with recorded activity
            </AppText>
          </View>
          <AppText variant="caption" color={Colors.textMuted} style={styles.guidanceNote}>
            Pending and unconfirmed doses are preserved for clinical review and never penalized as missed doses.
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontWeight: Typography.weight.semibold,
  },
  monthTag: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.25)',
  },
  monthTagText: {
    fontWeight: '700',
    fontSize: 11,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.cardPadding,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  scoreLeft: {
    flex: 1,
  },
  scoreNumberRow: {
    marginVertical: 2,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '800',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontWeight: '800',
    fontSize: 16,
    marginVertical: 2,
  },
  metricSub: {
    fontSize: 9,
  },
  footerNoteRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityText: {
    fontWeight: '600',
    fontSize: 12,
  },
  guidanceNote: {
    lineHeight: 16,
  },
});
