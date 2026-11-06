import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Radius } from '../constants/radius';
import { Typography } from '../constants/typography';
import AppText from '../components/ui/AppText';
import AppCard from '../components/ui/AppCard';
import AppButton from '../components/ui/AppButton';
import { useAuth } from '../context/AuthContext';
import { doseEventService } from '../services/doseEventService';
import { notificationService } from '../services/notificationService';

// End-of-Day Review Screen (Phase 23)
// Allows users to review all unresponded medication doses scheduled for today whose time has passed.
// Rules: Silence never means Taken. Silence never means Missed.
export default function EndOfDayReviewScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [allDoses, setAllDoses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // In-flight action lockout to prevent duplicate submissions
  const [processingDoseId, setProcessingDoseId] = useState(null);

  // Modal states for user confirmations
  const [takenModalDose, setTakenModalDose] = useState(null);
  const [missedModalDose, setMissedModalDose] = useState(null);
  const [missedReasonInput, setMissedReasonInput] = useState('');
  const [skipModalDose, setSkipModalDose] = useState(null);
  const [skipReasonInput, setSkipReasonInput] = useState('');

  // Local calendar date boundaries
  const now = new Date();
  const todayDateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  /**
   * Load today's doses from real backend MongoDB after ensuring day rollover
   */
  const loadReviewData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      // 1. Process day-rollover for past days so previous days' pending doses transition to unconfirmed
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      await doseEventService.rolloverPastPendingDoses(startOfToday).catch((err) => {
        console.warn('Rollover check error:', err.message);
      });

      // 2. Fetch today's scheduled doses for authenticated user
      const doses = await doseEventService.getDoseEvents({ date: todayKey });
      setAllDoses(doses || []);
    } catch (err) {
      console.error('Error loading End-of-Day review doses:', err);
      setErrorMessage(err.message || 'Unable to load today’s medication schedule.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [todayKey]);

  useEffect(() => {
    loadReviewData();
  }, [loadReviewData]);

  // Daily statistics for all today's doses
  const stats = useMemo(() => {
    const total = allDoses.length;
    const taken = allDoses.filter((d) => d.status === 'taken').length;
    const skipped = allDoses.filter((d) => d.status === 'skipped').length;
    const missed = allDoses.filter((d) => d.status === 'missed').length;
    const unconfirmed = allDoses.filter((d) => d.status === 'unconfirmed').length;
    const pending = allDoses.filter((d) => d.status === 'pending').length;

    return {
      total,
      taken,
      skipped,
      missed,
      unconfirmed,
      pending,
    };
  }, [allDoses]);

  /**
   * Eligible review doses:
   * - Belonging to today
   * - Scheduled time has passed (scheduledAt <= now)
   * - Status is 'pending' or 'unconfirmed'
   * Strictly excludes future doses, already taken doses, already skipped doses, and confirmed missed doses.
   */
  const eligibleDoses = useMemo(() => {
    const currentTime = new Date();
    return allDoses.filter((dose) => {
      const scheduledTime = new Date(dose.scheduledAt);
      const isPastOrCurrent = !isNaN(scheduledTime.getTime()) && scheduledTime <= currentTime;
      const isEligibleStatus = dose.status === 'pending' || dose.status === 'unconfirmed';
      return isPastOrCurrent && isEligibleStatus;
    });
  }, [allDoses]);

  // Flash temporary feedback banner
  const triggerFeedback = (message) => {
    setFeedbackMessage(message);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  // Action A: Mark as Taken
  const handleConfirmTaken = async () => {
    if (!takenModalDose || processingDoseId) return;
    const dose = takenModalDose;
    const id = dose.id || dose._id;

    setProcessingDoseId(id);
    try {
      const updated = await doseEventService.markDoseAsTaken(id);
      await notificationService.cancelSnoozeReminder(id);

      setAllDoses((prev) =>
        prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
      );
      setTakenModalDose(null);
      triggerFeedback(`Marked ${dose.name} as taken.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark dose as taken.');
    } finally {
      setProcessingDoseId(null);
    }
  };

  // Action B: Explicitly Confirm as Missed
  const handleConfirmMissed = async () => {
    if (!missedModalDose || processingDoseId) return;
    const dose = missedModalDose;
    const id = dose.id || dose._id;

    setProcessingDoseId(id);
    try {
      const updated = await doseEventService.confirmDoseAsMissed(
        id,
        missedReasonInput.trim() || 'User confirmed missed dose during daily review'
      );

      setAllDoses((prev) =>
        prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
      );
      setMissedModalDose(null);
      setMissedReasonInput('');
      triggerFeedback(`Confirmed ${dose.name} as missed.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to confirm dose as missed.');
    } finally {
      setProcessingDoseId(null);
    }
  };

  // Action C: Mark as Skipped
  const handleConfirmSkip = async () => {
    if (!skipModalDose || processingDoseId) return;
    const dose = skipModalDose;
    const id = dose.id || dose._id;

    setProcessingDoseId(id);
    try {
      const updated = await doseEventService.markDoseAsSkipped(
        id,
        skipReasonInput.trim() || 'Skipped during daily review'
      );
      await notificationService.cancelSnoozeReminder(id);

      setAllDoses((prev) =>
        prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
      );
      setSkipModalDose(null);
      setSkipReasonInput('');
      triggerFeedback(`Marked ${dose.name} as skipped.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark dose as skipped.');
    } finally {
      setProcessingDoseId(null);
    }
  };

  // Action D: Leave Unconfirmed
  const handleLeaveUnconfirmed = async (dose) => {
    const id = dose.id || dose._id;
    if (processingDoseId) return;

    setProcessingDoseId(id);
    try {
      if (dose.status === 'pending') {
        const updated = await doseEventService.markDoseAsUnconfirmed(id);
        setAllDoses((prev) =>
          prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
        );
      }
      triggerFeedback(`Kept ${dose.name} as unconfirmed for clinical review.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update dose status.');
    } finally {
      setProcessingDoseId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/(tabs)')}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          accessibilityLabel="Return to Dashboard"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>

        <View style={styles.headerTextCol}>
          <AppText variant="caption" color={Colors.primary} style={styles.dateLabel}>
            {todayDateString}
          </AppText>
          <AppText variant="h1" color={Colors.textPrimary} style={styles.heading}>
            Let's review your day.
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadReviewData(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <View style={styles.feedbackBanner}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={{ marginRight: 6 }} />
            <AppText variant="secondary" color={Colors.textPrimary} style={{ flex: 1 }}>
              {feedbackMessage}
            </AppText>
          </View>
        )}

        {/* ERROR BANNER */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
            <AppText variant="caption" color={Colors.danger} style={{ flex: 1 }}>
              {errorMessage}
            </AppText>
            <Pressable onPress={() => loadReviewData()} style={styles.retryChip}>
              <AppText variant="caption" color={Colors.primary} style={{ fontWeight: '600' }}>
                Retry
              </AppText>
            </Pressable>
          </View>
        )}

        {/* TODAY'S METRICS OVERVIEW CARD */}
        <AppCard style={styles.statsCard}>
          <View style={styles.statsHeaderRow}>
            <View>
              <AppText variant="label" color={Colors.primary}>
                DAILY SUMMARY
              </AppText>
              <AppText variant="h2" style={styles.statsCardTitle}>
                Today's Overview
              </AppText>
            </View>
            <View style={styles.totalPill}>
              <AppText variant="caption" color={Colors.textMuted}>Total: </AppText>
              <AppText variant="body" color={Colors.textPrimary} style={{ fontWeight: '700' }}>
                {stats.total}
              </AppText>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            {/* Taken */}
            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                <AppText variant="caption" color={Colors.textMuted}>Taken</AppText>
              </View>
              <AppText variant="h3" color={Colors.success} style={styles.metricValue}>
                {stats.taken}
              </AppText>
            </View>

            <View style={styles.metricDivider} />

            {/* Skipped */}
            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                <AppText variant="caption" color={Colors.textMuted}>Skipped</AppText>
              </View>
              <AppText variant="h3" color={Colors.primary} style={styles.metricValue}>
                {stats.skipped}
              </AppText>
            </View>

            <View style={styles.metricDivider} />

            {/* Confirmed Missed */}
            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
                <AppText variant="caption" color={Colors.textMuted}>Missed</AppText>
              </View>
              <AppText variant="h3" color={Colors.danger} style={styles.metricValue}>
                {stats.missed}
              </AppText>
            </View>

            <View style={styles.metricDivider} />

            {/* Unconfirmed */}
            <View style={styles.metricItem}>
              <View style={styles.metricLabelRow}>
                <View style={[styles.dot, { backgroundColor: Colors.textMuted }]} />
                <AppText variant="caption" color={Colors.textMuted}>Unconfirmed</AppText>
              </View>
              <AppText variant="h3" color={Colors.textMuted} style={styles.metricValue}>
                {stats.unconfirmed}
              </AppText>
            </View>
          </View>
        </AppCard>

        {/* LOADING STATE */}
        {isLoading && allDoses.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <AppText variant="body" color={Colors.textSecondary} style={{ marginTop: Spacing.sm }}>
              Checking today's schedule...
            </AppText>
          </View>
        ) : stats.total === 0 ? (
          /* EMPTY STATE (No doses scheduled today) */
          <AppCard style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textMuted} />
            </View>
            <AppText variant="h2" style={styles.emptyTitle}>
              No Doses Scheduled Today
            </AppText>
            <AppText variant="secondary" color={Colors.textSecondary} style={styles.emptySubtitle}>
              You did not have any medications scheduled for today. Enjoy your evening!
            </AppText>
            <AppButton
              title="Return to Dashboard"
              variant="secondary"
              size="md"
              onPress={() => router.push('/(tabs)')}
              style={{ marginTop: Spacing.md }}
            />
          </AppCard>
        ) : eligibleDoses.length === 0 ? (
          /* COMPLETED STATE (All past doses have been reviewed) */
          <AppCard style={styles.completedCard}>
            <View style={styles.completedIconBox}>
              <Ionicons name="checkmark-done" size={36} color={Colors.success} />
            </View>
            <AppText variant="h2" style={styles.completedTitle}>
              All Caught Up for Today!
            </AppText>
            <AppText variant="secondary" color={Colors.textSecondary} style={styles.completedSubtitle}>
              All scheduled medication doses for today have been reviewed.
            </AppText>

            {/* Summary Breakdown */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <AppText variant="secondary" color={Colors.textMuted}>Taken Doses:</AppText>
                <AppText variant="body" color={Colors.success} style={{ fontWeight: '700' }}>
                  {stats.taken} of {stats.total}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText variant="secondary" color={Colors.textMuted}>Intentionally Skipped:</AppText>
                <AppText variant="body" color={Colors.primary} style={{ fontWeight: '600' }}>
                  {stats.skipped}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText variant="secondary" color={Colors.textMuted}>Confirmed Missed:</AppText>
                <AppText variant="body" color={Colors.danger} style={{ fontWeight: '600' }}>
                  {stats.missed}
                </AppText>
              </View>
              <View style={styles.summaryRow}>
                <AppText variant="secondary" color={Colors.textMuted}>Preserved Unconfirmed:</AppText>
                <AppText variant="body" color={Colors.textMuted} style={{ fontWeight: '600' }}>
                  {stats.unconfirmed}
                </AppText>
              </View>
            </View>

            <View style={styles.ruleNoticeBox}>
              <Ionicons name="shield-checkmark-outline" size={15} color={Colors.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
              <AppText variant="caption" color={Colors.textMuted} style={{ flex: 1, lineHeight: 16 }}>
                Unconfirmed doses are never counted as confirmed missed. Historical intake times and reasons remain preserved.
              </AppText>
            </View>

            <AppButton
              title="Return to Dashboard"
              variant="primary"
              size="md"
              onPress={() => router.push('/(tabs)')}
              style={{ marginTop: Spacing.md, width: '100%' }}
            />
          </AppCard>
        ) : (
          /* ELIGIBLE DOSES REVIEW LIST */
          <View style={styles.reviewSection}>
            <View style={styles.sectionHeaderRow}>
              <AppText variant="h2" color={Colors.textPrimary}>
                Doses Needing Response ({eligibleDoses.length})
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                Past scheduled time
              </AppText>
            </View>

            {eligibleDoses.map((dose) => {
              const id = dose.id || dose._id;
              const isProcessing = processingDoseId === id;

              return (
                <AppCard key={id} style={styles.doseReviewCard}>
                  {/* Dose Header Row */}
                  <View style={styles.doseHeaderRow}>
                    <View style={styles.medIconBox}>
                      <MaterialCommunityIcons name="pill" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.doseInfoCol}>
                      <AppText variant="h3" color={Colors.textPrimary} style={styles.doseName}>
                        {dose.name}
                      </AppText>
                      <AppText variant="secondary" color={Colors.textSecondary}>
                        {dose.dosage} • {dose.type || 'Medication'}
                      </AppText>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        dose.status === 'unconfirmed'
                          ? styles.statusBadgeUnconfirmed
                          : styles.statusBadgePending,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        color={dose.status === 'unconfirmed' ? Colors.textMuted : Colors.warning}
                        style={{ fontWeight: '700', textTransform: 'uppercase' }}
                      >
                        {dose.status}
                      </AppText>
                    </View>
                  </View>

                  {/* Scheduled Time & Instructions */}
                  <View style={styles.doseDetailsRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                      <AppText variant="caption" color={Colors.primary} style={{ fontWeight: '600' }}>
                        Scheduled: {dose.time || dose.scheduledTime}
                      </AppText>
                    </View>

                    {dose.instructions ? (
                      <View style={[styles.detailItem, { flex: 1, justifyContent: 'flex-end' }]}>
                        <AppText variant="caption" color={Colors.textMuted} numberOfLines={1}>
                          {dose.instructions}
                        </AppText>
                      </View>
                    ) : null}
                  </View>

                  {/* Actions Group */}
                  <View style={styles.actionsContainer}>
                    {/* Primary: Mark as Taken */}
                    <AppButton
                      title={isProcessing ? "Processing..." : "Mark as Taken"}
                      variant="primary"
                      size="sm"
                      icon={<Ionicons name="checkmark" size={16} color="#171A19" />}
                      loading={isProcessing}
                      disabled={isProcessing}
                      onPress={() => setTakenModalDose(dose)}
                      style={styles.actionButtonPrimary}
                    />

                    {/* Secondary Row: Missed & Skip */}
                    <View style={styles.actionsSubRow}>
                      <AppButton
                        title="Confirm Missed"
                        variant="outline"
                        size="sm"
                        icon={<Ionicons name="close" size={14} color={Colors.danger} />}
                        disabled={isProcessing}
                        onPress={() => {
                          setMissedReasonInput('');
                          setMissedModalDose(dose);
                        }}
                        style={[styles.actionSubButton, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                      />
                      <AppButton
                        title="Skip Dose"
                        variant="outline"
                        size="sm"
                        icon={<Ionicons name="play-skip-forward" size={14} color={Colors.primary} />}
                        disabled={isProcessing}
                        onPress={() => {
                          setSkipReasonInput('');
                          setSkipModalDose(dose);
                        }}
                        style={[styles.actionSubButton, { borderColor: 'rgba(230, 162, 60, 0.4)' }]}
                      />
                    </View>

                    {/* Tertiary: Leave Unconfirmed */}
                    <AppButton
                      title="Leave Unconfirmed for Later"
                      variant="ghost"
                      size="sm"
                      icon={<Ionicons name="help-circle-outline" size={15} color={Colors.textMuted} />}
                      disabled={isProcessing}
                      onPress={() => handleLeaveUnconfirmed(dose)}
                      style={styles.leaveUnconfirmedButton}
                    />
                  </View>
                </AppCard>
              );
            })}

            {/* Exit Option (Rule 10: Do not force users to confirm every dose to leave) */}
            <AppButton
              title="Return to Dashboard"
              variant="secondary"
              size="md"
              onPress={() => router.push('/(tabs)')}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}
      </ScrollView>

      {/* CONFIRM TAKEN MODAL */}
      <Modal
        visible={!!takenModalDose}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTakenModalDose(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTakenModalDose(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {takenModalDose && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleBlock}>
                    <AppText variant="label" color={Colors.success}>
                      CONFIRM INTAKE
                    </AppText>
                    <AppText variant="h2" style={styles.modalTitle}>
                      Mark {takenModalDose.name} as Taken?
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setTakenModalDose(null)}
                    hitSlop={12}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <AppText variant="secondary" color={Colors.textSecondary} style={{ marginBottom: Spacing.md }}>
                  Confirm that you took your {takenModalDose.dosage} dose scheduled at {takenModalDose.time}. A verified intake timestamp will be recorded.
                </AppText>

                <View style={styles.modalButtonGroup}>
                  <AppButton
                    title={processingDoseId ? "Saving..." : "Confirm Intake"}
                    variant="primary"
                    size="md"
                    loading={!!processingDoseId}
                    disabled={!!processingDoseId}
                    icon={<Ionicons name="checkmark" size={18} color="#171A19" />}
                    onPress={handleConfirmTaken}
                    style={{ marginBottom: Spacing.xs }}
                  />
                  <AppButton
                    title="Cancel"
                    variant="outline"
                    size="sm"
                    disabled={!!processingDoseId}
                    onPress={() => setTakenModalDose(null)}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* CONFIRM MISSED MODAL */}
      <Modal
        visible={!!missedModalDose}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMissedModalDose(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMissedModalDose(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {missedModalDose && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleBlock}>
                    <AppText variant="label" color={Colors.danger}>
                      CONFIRM MISSED DOSE
                    </AppText>
                    <AppText variant="h2" style={styles.modalTitle}>
                      Confirm Missed {missedModalDose.name}?
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setMissedModalDose(null)}
                    hitSlop={12}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <AppText variant="secondary" color={Colors.textSecondary} style={{ marginBottom: Spacing.sm }}>
                  Are you confirming that you did not take your {missedModalDose.dosage} dose scheduled at {missedModalDose.time}?
                </AppText>

                {/* Quick Reason Chips */}
                <AppText variant="caption" color={Colors.textMuted} style={{ marginBottom: 6 }}>
                  Reason (Optional):
                </AppText>
                <View style={styles.quickChipsRow}>
                  {['Forgot', 'Unavailable', 'Asleep', 'Ran out of medicine'].map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() => setMissedReasonInput(chip)}
                      style={[
                        styles.chip,
                        missedReasonInput === chip && styles.chipActiveDanger,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        color={missedReasonInput === chip ? Colors.danger : Colors.textSecondary}
                        style={{ fontWeight: missedReasonInput === chip ? '700' : '400' }}
                      >
                        {chip}
                      </AppText>
                    </Pressable>
                  ))}
                </View>

                {/* Custom Reason Input */}
                <TextInput
                  value={missedReasonInput}
                  onChangeText={setMissedReasonInput}
                  placeholder="Specify custom reason..."
                  placeholderTextColor={Colors.textMuted}
                  style={styles.reasonTextInput}
                  maxLength={100}
                />

                <View style={styles.modalButtonGroup}>
                  <AppButton
                    title={processingDoseId ? "Recording..." : "Confirm as Missed"}
                    variant="outline"
                    size="md"
                    loading={!!processingDoseId}
                    disabled={!!processingDoseId}
                    icon={<Ionicons name="close-circle-outline" size={18} color={Colors.danger} />}
                    onPress={handleConfirmMissed}
                    style={{ borderColor: Colors.danger, marginBottom: Spacing.xs }}
                  />
                  <AppButton
                    title="Cancel"
                    variant="secondary"
                    size="sm"
                    disabled={!!processingDoseId}
                    onPress={() => setMissedModalDose(null)}
                  />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* CONFIRM SKIP MODAL */}
      <Modal
        visible={!!skipModalDose}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSkipModalDose(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSkipModalDose(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {skipModalDose && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleBlock}>
                    <AppText variant="label" color={Colors.primary}>
                      CONFIRM SKIPPED DOSE
                    </AppText>
                    <AppText variant="h2" style={styles.modalTitle}>
                      Skip {skipModalDose.name}?
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setSkipModalDose(null)}
                    hitSlop={12}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <AppText variant="secondary" color={Colors.textSecondary} style={{ marginBottom: Spacing.sm }}>
                  Mark your scheduled {skipModalDose.dosage} dose at {skipModalDose.time} as intentionally skipped?
                </AppText>

                {/* Quick Reason Chips */}
                <AppText variant="caption" color={Colors.textMuted} style={{ marginBottom: 6 }}>
                  Reason (Optional):
                </AppText>
                <View style={styles.quickChipsRow}>
                  {['Doctor advised', 'Feeling sick', 'Fasting', 'Side effects'].map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() => setSkipReasonInput(chip)}
                      style={[
                        styles.chip,
                        skipReasonInput === chip && styles.chipActivePrimary,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        color={skipReasonInput === chip ? Colors.primary : Colors.textSecondary}
                        style={{ fontWeight: skipReasonInput === chip ? '700' : '400' }}
                      >
                        {chip}
                      </AppText>
                    </Pressable>
                  ))}
                </View>

                {/* Custom Reason Input */}
                <TextInput
                  value={skipReasonInput}
                  onChangeText={setSkipReasonInput}
                  placeholder="Specify custom skip reason..."
                  placeholderTextColor={Colors.textMuted}
                  style={styles.reasonTextInput}
                  maxLength={100}
                />

                <View style={styles.modalButtonGroup}>
                  <AppButton
                    title={processingDoseId ? "Recording..." : "Mark as Skipped"}
                    variant="outline"
                    size="md"
                    loading={!!processingDoseId}
                    disabled={!!processingDoseId}
                    icon={<Ionicons name="play-skip-forward" size={18} color={Colors.primary} />}
                    onPress={handleConfirmSkip}
                    style={{ borderColor: Colors.primary, marginBottom: Spacing.xs }}
                  />
                  <AppButton
                    title="Cancel"
                    variant="secondary"
                    size="sm"
                    disabled={!!processingDoseId}
                    onPress={() => setSkipModalDose(null)}
                  />
                </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonPressed: {
    opacity: 0.7,
    backgroundColor: Colors.surfaceSecondary,
  },
  headerTextCol: {
    flex: 1,
  },
  dateLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 2,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  retryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.xs,
    marginLeft: Spacing.sm,
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statsCardTitle: {
    marginTop: 2,
  },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  metricValue: {
    fontWeight: '800',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  centerContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    textAlign: 'center',
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  completedCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  completedIconBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  completedTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  completedSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  ruleNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    width: '100%',
  },
  reviewSection: {
    marginTop: Spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  doseReviewCard: {
    marginBottom: Spacing.md,
  },
  doseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  medIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  doseInfoCol: {
    flex: 1,
  },
  doseName: {
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  statusBadgePending: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
  },
  statusBadgeUnconfirmed: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  doseDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsContainer: {
    gap: Spacing.xs,
  },
  actionButtonPrimary: {
    width: '100%',
  },
  actionsSubRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionSubButton: {
    flex: 1,
  },
  leaveUnconfirmedButton: {
    width: '100%',
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  modalTitleBlock: {
    flex: 1,
  },
  modalTitle: {
    marginTop: 2,
  },
  modalCloseButton: {
    padding: Spacing.xxs,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActiveDanger: {
    borderColor: Colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  chipActivePrimary: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
  },
  reasonTextInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalButtonGroup: {
    marginTop: Spacing.xs,
  },
});

