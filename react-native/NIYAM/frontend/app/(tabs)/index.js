import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import {
  INITIAL_USER,
  INITIAL_DOSES,
  getDynamicDateString,
} from '../../constants/dashboardData';

// NIYAM Premium Dashboard Screen (Phase 08)
// Displays daily adherence metrics, next scheduled dose, schedule list, and quick actions.
export default function DashboardScreen() {
  const router = useRouter();

  // Local state for doses and dynamic interactions
  const [doses, setDoses] = useState(INITIAL_DOSES);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [selectedDose, setSelectedDose] = useState(null);

  // Dynamic current date
  const currentDateString = getDynamicDateString();

  // Calculate adherence and metrics from sample data dynamically
  const totalDoses = doses.length;
  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const pendingCount = doses.filter((d) => d.status === 'pending').length;
  const missedCount = doses.filter((d) => d.status === 'missed').length;
  const adherencePercentage =
    totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0;

  // Find the primary next dose (first pending dose)
  const nextDose = doses.find((d) => d.id === 'dose-1') || doses.find((d) => d.status === 'pending');
  const isNextDoseTaken = nextDose ? nextDose.status === 'taken' : false;

  // Functional Mark as Taken handler
  const handleMarkAsTaken = (doseId) => {
    const target = doses.find((d) => d.id === doseId);
    if (!target || target.status === 'taken') return; // Safe guard against repeated taps

    setDoses((prevDoses) =>
      prevDoses.map((item) =>
        item.id === doseId ? { ...item, status: 'taken' } : item
      )
    );

    // Show temporary confirmation message
    setFeedbackMessage(`Marked ${target.name} as taken.`);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);

    if (selectedDose && selectedDose.id === doseId) {
      setSelectedDose((prev) => (prev ? { ...prev, status: 'taken' } : null));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* A. HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.headerTextCol}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color={Colors.primary} style={styles.calendarIcon} />
              <AppText variant="caption" color={Colors.primary} style={styles.dateText}>
                {currentDateString}
              </AppText>
            </View>

            <View style={styles.greetingRow}>
              <AppText variant="h2" color={Colors.textSecondary} style={styles.greetingText}>
                {INITIAL_USER.greeting}{' '}
              </AppText>
              <AppText variant="h1" color={Colors.textPrimary} style={styles.userNameText}>
                {INITIAL_USER.name}
              </AppText>
            </View>

            <AppText variant="secondary" color={Colors.textSecondary} style={styles.subtitleText}>
              {INITIAL_USER.subtitle}
            </AppText>
          </View>

          {/* Profile / Avatar Action */}
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            hitSlop={10}
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && styles.avatarPressed,
            ]}
            accessibilityLabel="Open user profile"
          >
            <View style={styles.avatarInner}>
              <AppText style={styles.avatarInitial}>R</AppText>
            </View>
            <View style={styles.onlineBadge} />
          </Pressable>
        </View>

        {/* Temporary Action Feedback Banner */}
        {feedbackMessage && (
          <View style={styles.feedbackBanner}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={styles.feedbackIcon} />
            <AppText variant="secondary" color={Colors.textPrimary} style={styles.feedbackText}>
              {feedbackMessage}
            </AppText>
          </View>
        )}

        {/* B. DAILY ADHERENCE PROGRESS CARD */}
        <AppCard style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <View>
              <AppText variant="label" color={Colors.primary}>
                Daily Routine
              </AppText>
              <AppText variant="h2" style={styles.progressCardTitle}>
                Today's progress
              </AppText>
            </View>
            <View style={styles.percentageBadge}>
              <AppText variant="h2" color={Colors.primary} style={styles.percentageNumber}>
                {adherencePercentage}%
              </AppText>
            </View>
          </View>

          {/* Adherence Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(Math.max(adherencePercentage, 6), 100)}%` },
              ]}
            />
          </View>

          {/* Summary Breakdown Metrics */}
          <View style={styles.metricsRow}>
            {/* Taken Stat */}
            <View style={styles.metricItem}>
              <View style={styles.metricHeaderRow}>
                <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
                <AppText variant="caption" color={Colors.textMuted}>Taken</AppText>
              </View>
              <AppText variant="h3" color={Colors.success} style={styles.metricCount}>
                {takenCount}
              </AppText>
            </View>

            <View style={styles.metricDivider} />

            {/* Pending Stat */}
            <View style={styles.metricItem}>
              <View style={styles.metricHeaderRow}>
                <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
                <AppText variant="caption" color={Colors.textMuted}>Pending</AppText>
              </View>
              <AppText variant="h3" color={Colors.warning} style={styles.metricCount}>
                {pendingCount}
              </AppText>
            </View>

            <View style={styles.metricDivider} />

            {/* Missed Stat (Explicit demo data, kept distinct from unconfirmed) */}
            <View style={styles.metricItem}>
              <View style={styles.metricHeaderRow}>
                <View style={[styles.statusDot, { backgroundColor: Colors.danger }]} />
                <AppText variant="caption" color={Colors.textMuted}>Missed</AppText>
              </View>
              <AppText variant="h3" color={Colors.danger} style={styles.metricCount}>
                {missedCount}
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* C. NEXT DOSE CARD */}
        <AppCard style={styles.nextDoseCard}>
          <View style={styles.nextDoseTopRow}>
            <View style={styles.nextDoseTag}>
              <AppText style={styles.nextDoseTagText}>NEXT DOSE</AppText>
            </View>
            <View style={styles.timeTag}>
              <Ionicons name="time-outline" size={13} color={Colors.primary} style={styles.timeIcon} />
              <AppText variant="caption" color={Colors.primary} style={styles.timeText}>
                {nextDose?.time || '02:00 PM'}
              </AppText>
            </View>
          </View>

          <View style={styles.nextDoseDetails}>
            <View style={styles.medIconBox}>
              <MaterialCommunityIcons name="pill" size={26} color={Colors.primary} />
            </View>
            <View style={styles.medInfoCol}>
              <AppText variant="h2" style={styles.nextMedName}>
                {nextDose?.name || 'Vitamin D3'}
              </AppText>
              <AppText variant="secondary" color={Colors.textSecondary}>
                {nextDose?.dosage || '1 capsule'} • {nextDose?.instructions || 'Take with food after lunch'}
              </AppText>
            </View>
          </View>

          <View style={styles.nextDoseSupporting}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
            <AppText variant="caption" color={Colors.textMuted} style={styles.supportNoteText}>
              Your next scheduled dose
            </AppText>
          </View>

          {/* Action Button: Mark as Taken or Completed State */}
          <View style={styles.nextDoseActionRow}>
            {isNextDoseTaken ? (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={styles.completedIcon} />
                <AppText variant="secondary" color={Colors.success} style={styles.completedText}>
                  Dose completed for today
                </AppText>
              </View>
            ) : (
              <AppButton
                title="Mark as taken"
                variant="primary"
                size="md"
                icon={<Ionicons name="checkmark" size={18} color="#171A19" />}
                onPress={() => handleMarkAsTaken(nextDose.id)}
                style={styles.markTakenButton}
              />
            )}
          </View>
        </AppCard>

        {/* D. TODAY'S SCHEDULE SECTION */}
        <View style={styles.sectionHeader}>
          <AppText variant="h2" style={styles.sectionTitle}>
            Today's medicines
          </AppText>
          <Pressable
            onPress={() => router.push('/(tabs)/medicines')}
            hitSlop={10}
            style={styles.viewAllButton}
            accessibilityLabel="View all medicines"
          >
            <AppText variant="secondary" color={Colors.primary} style={styles.viewAllText}>
              View all
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Schedule Dose Entries */}
        <View style={styles.doseList}>
          {doses.map((dose) => {
            const isTaken = dose.status === 'taken';
            const isMissed = dose.status === 'missed';
            const isPending = dose.status === 'pending';

            return (
              <Pressable
                key={dose.id}
                onPress={() => setSelectedDose(dose)}
                style={({ pressed }) => [
                  styles.doseCard,
                  pressed && styles.doseCardPressed,
                  isMissed && styles.doseCardMissed,
                ]}
                accessibilityLabel={`${dose.name}, ${dose.dosage}, scheduled at ${dose.time}, status ${dose.status}`}
              >
                {/* Left Visual Status Marker */}
                <View
                  style={[
                    styles.doseStatusMarker,
                    isTaken && styles.markerTaken,
                    isPending && styles.markerPending,
                    isMissed && styles.markerMissed,
                  ]}
                >
                  {isTaken && <Ionicons name="checkmark" size={14} color={Colors.background} />}
                  {isPending && <Ionicons name="time" size={13} color={Colors.warning} />}
                  {isMissed && <Ionicons name="close" size={14} color={Colors.background} />}
                </View>

                {/* Medicine Information */}
                <View style={styles.doseInfo}>
                  <AppText variant="body" style={[styles.doseName, isTaken && styles.textTaken]}>
                    {dose.name}
                  </AppText>
                  <AppText variant="caption" color={Colors.textSecondary}>
                    {dose.dosage} • {dose.time}
                  </AppText>
                </View>

                {/* Status Pill Tag */}
                <View
                  style={[
                    styles.statusBadge,
                    isTaken && styles.badgeTaken,
                    isPending && styles.badgePending,
                    isMissed && styles.badgeMissed,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.statusBadgeText,
                      isTaken && { color: Colors.success },
                      isPending && { color: Colors.warning },
                      isMissed && { color: Colors.danger },
                    ]}
                  >
                    {isTaken ? 'Taken' : isPending ? 'Pending' : 'Missed'}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* E. QUICK ACTIONS SECTION */}
        <View style={styles.sectionHeader}>
          <AppText variant="h2" style={styles.sectionTitle}>
            Quick actions
          </AppText>
        </View>

        <View style={styles.quickActionRow}>
          {/* Action 1: My medicines */}
          <Pressable
            onPress={() => router.push('/(tabs)/medicines')}
            style={({ pressed }) => [
              styles.quickActionCard,
              pressed && styles.quickActionPressed,
            ]}
            accessibilityLabel="Navigate to My medicines"
          >
            <View style={styles.quickActionIconBox}>
              <MaterialCommunityIcons name="pill" size={20} color={Colors.primary} />
            </View>
            <AppText variant="secondary" color={Colors.textPrimary} style={styles.quickActionTitle}>
              My medicines
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              Prescriptions
            </AppText>
          </Pressable>

          {/* Action 2: Adherence history */}
          <Pressable
            onPress={() => router.push('/(tabs)/calendar')}
            style={({ pressed }) => [
              styles.quickActionCard,
              pressed && styles.quickActionPressed,
            ]}
            accessibilityLabel="Navigate to Adherence history"
          >
            <View style={styles.quickActionIconBox}>
              <Ionicons name="calendar-outline" size={19} color={Colors.primary} />
            </View>
            <AppText variant="secondary" color={Colors.textPrimary} style={styles.quickActionTitle}>
              Adherence history
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              Calendar log
            </AppText>
          </Pressable>

          {/* Action 3: My profile */}
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            style={({ pressed }) => [
              styles.quickActionCard,
              pressed && styles.quickActionPressed,
            ]}
            accessibilityLabel="Navigate to My profile"
          >
            <View style={styles.quickActionIconBox}>
              <Ionicons name="person-outline" size={19} color={Colors.primary} />
            </View>
            <AppText variant="secondary" color={Colors.textPrimary} style={styles.quickActionTitle}>
              My profile
            </AppText>
            <AppText variant="caption" color={Colors.textMuted}>
              Preferences
            </AppText>
          </Pressable>
        </View>

      </ScrollView>

      {/* DOSE DETAILS MODAL (Simple, accessible feedback inspection) */}
      <Modal
        visible={!!selectedDose}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedDose(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedDose(null)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedDose && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleBlock}>
                    <AppText variant="label" color={Colors.primary}>
                      {selectedDose.category}
                    </AppText>
                    <AppText variant="h2" style={styles.modalMedName}>
                      {selectedDose.name}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setSelectedDose(null)}
                    hitSlop={12}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <View style={styles.modalInfoRows}>
                  <View style={styles.modalInfoRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Dosage:</AppText>
                    <AppText variant="secondary" color={Colors.textPrimary} style={styles.boldText}>
                      {selectedDose.dosage}
                    </AppText>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Scheduled Time:</AppText>
                    <AppText variant="secondary" color={Colors.textPrimary} style={styles.boldText}>
                      {selectedDose.time}
                    </AppText>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Status:</AppText>
                    <AppText
                      variant="secondary"
                      color={
                        selectedDose.status === 'taken'
                          ? Colors.success
                          : selectedDose.status === 'pending'
                          ? Colors.warning
                          : Colors.danger
                      }
                      style={styles.boldText}
                    >
                      {selectedDose.status.toUpperCase()}
                    </AppText>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <AppText variant="secondary" color={Colors.textMuted}>Instructions:</AppText>
                    <AppText variant="secondary" color={Colors.textSecondary} style={styles.modalInstructions}>
                      {selectedDose.instructions}
                    </AppText>
                  </View>
                </View>

                {/* Modal Action */}
                {selectedDose.status === 'pending' ? (
                  <AppButton
                    title="Mark as Taken"
                    variant="primary"
                    size="md"
                    icon={<Ionicons name="checkmark" size={18} color="#171A19" />}
                    onPress={() => {
                      handleMarkAsTaken(selectedDose.id);
                      setSelectedDose(null);
                    }}
                    style={styles.modalActionButton}
                  />
                ) : (
                  <AppButton
                    title="Close"
                    variant="secondary"
                    size="md"
                    onPress={() => setSelectedDose(null)}
                    style={styles.modalActionButton}
                  />
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.screenVertical,
    paddingBottom: 110, // Clearance for floating glass bottom navigation dock
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerTextCol: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxs,
  },
  calendarIcon: {
    marginRight: 4,
  },
  dateText: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  greetingText: {
    fontWeight: Typography.weight.regular,
  },
  userNameText: {
    fontWeight: Typography.weight.bold,
  },
  subtitleText: {
    marginTop: 2,
    lineHeight: 20,
  },
  avatarButton: {
    position: 'relative',
    marginLeft: Spacing.md,
  },
  avatarInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: Colors.primary,
    fontSize: Typography.size.lg,
    fontWeight: '700',
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  // Feedback Banner
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 168, 137, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(127, 168, 137, 0.35)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  feedbackIcon: {
    marginRight: Spacing.xs,
  },
  feedbackText: {
    fontWeight: '500',
  },
  // Progress Card Styles
  progressCard: {
    padding: Spacing.cardPaddingLarge,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  progressCardTitle: {
    marginTop: 2,
  },
  percentageBadge: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.25)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.md,
  },
  percentageNumber: {
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricCount: {
    fontWeight: '800',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  // Next Dose Card Styles
  nextDoseCard: {
    padding: Spacing.cardPaddingLarge,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(230, 162, 60, 0.35)', // Restrained amber accent border
  },
  nextDoseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  nextDoseTag: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  nextDoseTagText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeIcon: {
    marginRight: 4,
  },
  timeText: {
    fontWeight: '600',
  },
  nextDoseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  medIconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(230, 162, 60, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  medInfoCol: {
    flex: 1,
  },
  nextMedName: {
    marginBottom: 2,
  },
  nextDoseSupporting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  supportNoteText: {
    fontStyle: 'italic',
  },
  nextDoseActionRow: {
    marginTop: Spacing.xxs,
  },
  markTakenButton: {
    width: '100%',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(127, 168, 137, 0.25)',
  },
  completedIcon: {
    marginRight: Spacing.xs,
  },
  completedText: {
    fontWeight: '600',
  },
  // Schedule Section Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontWeight: Typography.weight.semibold,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xxs,
  },
  viewAllText: {
    fontWeight: '600',
  },
  doseList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.cardPadding,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doseCardPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  doseCardMissed: {
    borderColor: 'rgba(216, 121, 112, 0.3)',
  },
  doseStatusMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  markerTaken: {
    backgroundColor: Colors.success,
  },
  markerPending: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  markerMissed: {
    backgroundColor: Colors.danger,
  },
  doseInfo: {
    flex: 1,
  },
  doseName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  textTaken: {
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  badgeTaken: {
    backgroundColor: 'rgba(127, 168, 137, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
  },
  badgeMissed: {
    backgroundColor: 'rgba(216, 121, 112, 0.15)',
  },
  statusBadgeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  // Quick Actions Styles
  quickActionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickActionPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  quickActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  quickActionTitle: {
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.cardPaddingLarge,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  modalTitleBlock: {
    flex: 1,
  },
  modalMedName: {
    marginTop: 2,
  },
  modalCloseButton: {
    padding: Spacing.xxs,
  },
  modalInfoRows: {
    gap: Spacing.xs,
    marginVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boldText: {
    fontWeight: '600',
  },
  modalInstructions: {
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  modalActionButton: {
    marginTop: Spacing.xs,
  },
});
