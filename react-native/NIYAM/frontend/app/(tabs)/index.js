import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import { getDynamicDateString } from '../../constants/dashboardData';
import { useAuth } from '../../context/AuthContext';
import { doseEventService, formatTime } from '../../services/doseEventService';
import { notificationService, SNOOZE_OPTIONS } from '../../services/notificationService';

function getTodayDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// NIYAM Premium Dashboard Screen (Phase 08, 19 & Phase 22 Taken/Snooze/Skip Integration)
// Displays daily adherence metrics, next scheduled dose, schedule list, and interactive dose response actions.
export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeDoseId, skipDoseId } = useLocalSearchParams();

  // Local state for doses and dynamic interactions
  const [doses, setDoses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [selectedDose, setSelectedDose] = useState(null);

  // Phase 22: Processing, Snooze, and Skip dialog states
  const [processingActionDoseId, setProcessingActionDoseId] = useState(null);
  const [isSnoozing, setIsSnoozing] = useState(false);
  const [snoozeModalDose, setSnoozeModalDose] = useState(null);
  const [skipModalDose, setSkipModalDose] = useState(null);
  const [skipReasonInput, setSkipReasonInput] = useState('');

  // Dynamic current date
  const currentDateString = getDynamicDateString();

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  // Fetch today's dose events from MongoDB
  const loadDoses = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setApiError(null);

    try {
      const todayKey = getTodayDateKey();
      const events = await doseEventService.getDoseEvents({ date: todayKey });
      setDoses(events);
    } catch (err) {
      console.warn('Load today dose events error:', err.message);
      setApiError(err.message || 'Unable to load today schedule from server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDoses();
    }, [loadDoses])
  );

  // Calculate adherence and metrics dynamically adhering strictly to product formula
  const totalDoses = doses.length;
  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const pendingCount = doses.filter((d) => d.status === 'pending').length;
  const skippedCount = doses.filter((d) => d.status === 'skipped').length;
  const missedCount = doses.filter((d) => d.status === 'missed').length;
  const unconfirmedCount = doses.filter((d) => d.status === 'unconfirmed').length;
  const adherencePercentage =
    totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 0;

  // Handle incoming notification navigation parameters (activeDoseId or skipDoseId)
  useEffect(() => {
    if (doses.length === 0) return;
    if (activeDoseId) {
      const match = doses.find((d) => d.id === activeDoseId || d._id === activeDoseId);
      if (match) setSelectedDose(match);
    } else if (skipDoseId) {
      const match = doses.find((d) => d.id === skipDoseId || d._id === skipDoseId);
      if (match) {
        setSkipReasonInput('');
        setSkipModalDose(match);
      }
    }
  }, [activeDoseId, skipDoseId, doses]);

  // Find primary next dose (first pending dose, or first dose)
  const nextDose = doses.find((d) => d.status === 'pending') || doses[0] || null;
  const isNextDoseTaken = nextDose ? nextDose.status === 'taken' : false;
  const isNextDoseSkipped = nextDose ? nextDose.status === 'skipped' : false;

  // Functional Mark as Taken handler connected to backend
  const handleMarkAsTaken = async (doseId) => {
    if (processingActionDoseId) return; // Prevent concurrent submissions
    const target = doses.find((d) => d.id === doseId || d._id === doseId);
    if (!target || target.status === 'taken') return;
    const id = target.id || target._id;

    setProcessingActionDoseId(id);
    try {
      const updated = await doseEventService.markDoseAsTaken(id);

      // Cancel any active snooze reminder for this dose
      try {
        await notificationService.cancelSnoozeReminder(id);
      } catch (e) {}

      setDoses((prev) =>
        prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
      );

      setFeedbackMessage(`Marked ${target.name} as taken.`);
      setTimeout(() => setFeedbackMessage(null), 3500);

      if (selectedDose && (selectedDose.id === id || selectedDose._id === id)) {
        setSelectedDose(updated);
      }
    } catch (err) {
      Alert.alert('Action Failed', err.message || 'Unable to mark dose as taken.');
    } finally {
      setProcessingActionDoseId(null);
    }
  };

  // Open Snooze selection modal
  const handleOpenSnoozeModal = (dose) => {
    if (!dose) return;
    setSelectedDose(null);
    setSnoozeModalDose(dose);
  };

  // Schedule Snooze reminder
  const handleSnoozeDose = async (dose, minutes) => {
    if (!dose) return;
    try {
      setIsSnoozing(true);
      const result = await notificationService.scheduleSnoozeReminder(dose, minutes);
      setFeedbackMessage(`Snoozed ${dose.name} for ${minutes} minutes. Reminder set for ${formatTime(result.triggerTime)}.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      setSnoozeModalDose(null);
      if (selectedDose && (selectedDose.id === dose.id || selectedDose._id === dose.id)) {
        setSelectedDose(null);
      }
    } catch (err) {
      Alert.alert('Snooze Failed', err.message || 'Could not schedule snooze reminder.');
    } finally {
      setIsSnoozing(false);
    }
  };

  // Open Skip confirmation modal
  const handleOpenSkipModal = (dose) => {
    if (!dose) return;
    setSelectedDose(null);
    setSkipReasonInput('');
    setSkipModalDose(dose);
  };

  // Functional Mark as Skipped handler connected to backend
  const handleConfirmSkip = async (doseId, reason = null) => {
    if (processingActionDoseId) return;
    const target = doses.find((d) => d.id === doseId || d._id === doseId);
    if (!target) return;
    const id = target.id || target._id;

    setProcessingActionDoseId(id);
    try {
      const trimmedReason = reason && reason.trim() ? reason.trim() : 'Skipped by user';
      const updated = await doseEventService.markDoseAsSkipped(id, trimmedReason);

      // Cancel any active snooze reminder for this dose
      try {
        await notificationService.cancelSnoozeReminder(id);
      } catch (e) {}

      setDoses((prev) =>
        prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
      );

      setFeedbackMessage(`Marked ${target.name} as skipped.`);
      setTimeout(() => setFeedbackMessage(null), 3500);

      setSkipModalDose(null);
      setSkipReasonInput('');
      if (selectedDose && (selectedDose.id === id || selectedDose._id === id)) {
        setSelectedDose(updated);
      }
    } catch (err) {
      Alert.alert('Action Failed', err.message || 'Unable to skip dose.');
    } finally {
      setProcessingActionDoseId(null);
    }
  };

  // Functional Explicitly Confirm as Missed handler connected to backend
  const handleConfirmMissed = async (doseId, missedReason = 'User confirmed missed dose') => {
    if (processingActionDoseId) return;
    const target = doses.find((d) => d.id === doseId || d._id === doseId);
    if (!target) return;
    const id = target.id || target._id;

    setProcessingActionDoseId(id);
    try {
      const updated = await doseEventService.confirmDoseAsMissed(id, missedReason);
      setDoses((prev) =>
        prev.map((item) => ((item.id === id || item._id === id) ? updated : item))
      );

      setFeedbackMessage(`Confirmed ${target.name} as missed.`);
      setTimeout(() => setFeedbackMessage(null), 3500);

      if (selectedDose && (selectedDose.id === id || selectedDose._id === id)) {
        setSelectedDose(updated);
      }
    } catch (err) {
      Alert.alert('Action Failed', err.message || 'Unable to confirm missed dose.');
    } finally {
      setProcessingActionDoseId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadDoses(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
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
                {greeting}{' '}
              </AppText>
              <AppText variant="h1" color={Colors.textPrimary} style={styles.userNameText}>
                {user?.name || 'Friend'}
              </AppText>
            </View>

            <AppText variant="secondary" color={Colors.textSecondary} style={styles.subtitleText}>
              Let's stay consistent today.
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
              <AppText style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </AppText>
            </View>
            <View style={styles.onlineBadge} />
          </Pressable>
        </View>

        {/* API Error Banner */}
        {apiError && (
          <View style={styles.apiErrorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
            <AppText variant="caption" color={Colors.danger} style={{ flex: 1 }}>
              {apiError}
            </AppText>
            <Pressable onPress={() => loadDoses()} style={styles.retryChip}>
              <AppText variant="caption" color={Colors.primary} style={{ fontWeight: '600' }}>
                Retry
              </AppText>
            </Pressable>
          </View>
        )}

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

            {/* Skipped Stat */}
            <View style={styles.metricItem}>
              <View style={styles.metricHeaderRow}>
                <View style={[styles.statusDot, { backgroundColor: Colors.primary }]} />
                <AppText variant="caption" color={Colors.textMuted}>Skipped</AppText>
              </View>
              <AppText variant="h3" color={Colors.primary} style={styles.metricCount}>
                {skippedCount}
              </AppText>
            </View>

            <View style={styles.metricDivider} />

            {/* Missed Stat */}
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
        {isLoading && doses.length === 0 ? (
          <AppCard style={styles.nextDoseCard}>
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.sm }} />
            <AppText variant="caption" color={Colors.textMuted} style={{ textAlign: 'center' }}>
              Checking today's schedule...
            </AppText>
          </AppCard>
        ) : nextDose ? (
          <AppCard style={styles.nextDoseCard}>
            <View style={styles.nextDoseTopRow}>
              <View style={styles.nextDoseTag}>
                <AppText style={styles.nextDoseTagText}>NEXT DOSE</AppText>
              </View>
              <View style={styles.timeTag}>
                <Ionicons name="time-outline" size={13} color={Colors.primary} style={styles.timeIcon} />
                <AppText variant="caption" color={Colors.primary} style={styles.timeText}>
                  {nextDose.time || 'Scheduled'}
                </AppText>
              </View>
            </View>

            <View style={styles.nextDoseDetails}>
              <View style={styles.medIconBox}>
                <MaterialCommunityIcons name="pill" size={26} color={Colors.primary} />
              </View>
              <View style={styles.medInfoCol}>
                <AppText variant="h2" style={styles.nextMedName}>
                  {nextDose.name}
                </AppText>
                <AppText variant="secondary" color={Colors.textSecondary}>
                  {nextDose.dosage} • {nextDose.instructions || 'Take as prescribed'}
                </AppText>
              </View>
            </View>

            <View style={styles.nextDoseSupporting}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
              <AppText variant="caption" color={Colors.textMuted} style={styles.supportNoteText}>
                {isNextDoseTaken
                  ? 'Logged in adherence record'
                  : isNextDoseSkipped
                  ? 'Marked as skipped in adherence record'
                  : 'Your next scheduled dose'}
              </AppText>
            </View>

            {/* Action Buttons: Taken, Snooze, Skip */}
            <View style={styles.nextDoseActionRow}>
              {isNextDoseTaken ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={styles.completedIcon} />
                  <AppText variant="secondary" color={Colors.success} style={styles.completedText}>
                    Dose completed for today
                  </AppText>
                </View>
              ) : isNextDoseSkipped ? (
                <View style={[styles.completedBadge, { borderColor: 'rgba(230, 162, 60, 0.4)' }]}>
                  <Ionicons name="play-skip-forward-circle" size={18} color={Colors.primary} style={styles.completedIcon} />
                  <AppText variant="secondary" color={Colors.primary} style={styles.completedText}>
                    Dose skipped for today
                  </AppText>
                </View>
              ) : (
                <View style={styles.nextDoseActionCol}>
                  <AppButton
                    title={processingActionDoseId === nextDose.id ? "Recording..." : "Mark as taken"}
                    variant="primary"
                    size="md"
                    loading={processingActionDoseId === nextDose.id}
                    disabled={processingActionDoseId === nextDose.id}
                    icon={<Ionicons name="checkmark" size={18} color="#171A19" />}
                    onPress={() => handleMarkAsTaken(nextDose.id)}
                    style={styles.markTakenButton}
                  />
                  <View style={styles.nextDoseSubActionsRow}>
                    <AppButton
                      title="Snooze"
                      variant="secondary"
                      size="sm"
                      icon={<Ionicons name="time-outline" size={14} color={Colors.textPrimary} />}
                      onPress={() => handleOpenSnoozeModal(nextDose)}
                      style={{ flex: 1, marginRight: Spacing.xs }}
                    />
                    <AppButton
                      title="Skip"
                      variant="outline"
                      size="sm"
                      icon={<Ionicons name="play-skip-forward" size={14} color={Colors.danger} />}
                      onPress={() => handleOpenSkipModal(nextDose)}
                      style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.35)' }}
                    />
                  </View>
                </View>
              )}
            </View>
          </AppCard>
        ) : (
          <AppCard style={styles.nextDoseCard}>
            <View style={styles.nextDoseTopRow}>
              <View style={styles.nextDoseTag}>
                <AppText style={styles.nextDoseTagText}>ALL CLEAR</AppText>
              </View>
            </View>
            <View style={styles.nextDoseDetails}>
              <View style={styles.medIconBox}>
                <Ionicons name="checkmark-done" size={26} color={Colors.primary} />
              </View>
              <View style={styles.medInfoCol}>
                <AppText variant="h2" style={styles.nextMedName}>
                  All Done for Today
                </AppText>
                <AppText variant="secondary" color={Colors.textSecondary}>
                  No remaining doses scheduled. Keep up the good work!
                </AppText>
              </View>
            </View>
          </AppCard>
        )}

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
          {isLoading && doses.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginBottom: Spacing.xs }} />
              <AppText variant="secondary" color={Colors.textSecondary}>
                Loading today's medicines...
              </AppText>
            </AppCard>
          ) : doses.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={26} color={Colors.textMuted} />
              </View>
              <AppText variant="h3" style={{ textAlign: 'center', marginBottom: 4 }}>
                No doses scheduled today
              </AppText>
              <AppText variant="secondary" color={Colors.textSecondary} style={{ textAlign: 'center', marginBottom: 12 }}>
                You have no scheduled medication intake due for today.
              </AppText>
              <AppButton
                title="Manage Prescriptions"
                variant="secondary"
                size="sm"
                onPress={() => router.push('/(tabs)/medicines')}
              />
            </AppCard>
          ) : (
            doses.map((dose) => {
              const isTaken = dose.status === 'taken';
              const isMissed = dose.status === 'missed';
              const isPending = dose.status === 'pending';
              const isSkipped = dose.status === 'skipped';
              const isUnconfirmed = dose.status === 'unconfirmed';

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
                      isSkipped && styles.markerSkipped,
                      isUnconfirmed && styles.markerUnconfirmed,
                    ]}
                  >
                    {isTaken && <Ionicons name="checkmark" size={14} color={Colors.background} />}
                    {isPending && <Ionicons name="time" size={13} color={Colors.warning} />}
                    {isMissed && <Ionicons name="close" size={14} color={Colors.background} />}
                    {isSkipped && <Ionicons name="play-skip-forward" size={13} color={Colors.primary} />}
                    {isUnconfirmed && <Ionicons name="help" size={14} color={Colors.textMuted} />}
                  </View>

                  {/* Medicine Information */}
                  <View style={styles.doseInfo}>
                    <AppText variant="body" style={[styles.doseName, isTaken && styles.textTaken]}>
                      {dose.name}
                    </AppText>
                    <AppText variant="caption" color={Colors.textSecondary}>
                      {dose.dosage} • {dose.time}
                    </AppText>

                    {/* Quick inline action chips for pending doses (Phase 22) */}
                    {isPending && (
                      <View style={styles.inlineActionRow}>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleMarkAsTaken(dose.id);
                          }}
                          disabled={processingActionDoseId === dose.id}
                          style={styles.quickActionTake}
                          accessibilityLabel={`Mark ${dose.name} taken`}
                        >
                          {processingActionDoseId === dose.id ? (
                            <ActivityIndicator size="small" color="#171A19" />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={13} color="#171A19" style={{ marginRight: 3 }} />
                              <AppText variant="caption" color="#171A19" style={{ fontWeight: '700' }}>
                                Take
                              </AppText>
                            </>
                          )}
                        </Pressable>

                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleOpenSnoozeModal(dose);
                          }}
                          style={styles.quickActionSnooze}
                          accessibilityLabel={`Snooze ${dose.name}`}
                        >
                          <Ionicons name="time-outline" size={13} color={Colors.primary} style={{ marginRight: 3 }} />
                          <AppText variant="caption" color={Colors.primary} style={{ fontWeight: '600' }}>
                            Snooze
                          </AppText>
                        </Pressable>

                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            handleOpenSkipModal(dose);
                          }}
                          style={styles.quickActionSkip}
                          accessibilityLabel={`Skip ${dose.name}`}
                        >
                          <Ionicons name="play-skip-forward" size={12} color={Colors.textSecondary} style={{ marginRight: 2 }} />
                          <AppText variant="caption" color={Colors.textSecondary} style={{ fontWeight: '500' }}>
                            Skip
                          </AppText>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Status Pill Tag */}
                  <View
                    style={[
                      styles.statusBadge,
                      isTaken && styles.badgeTaken,
                      isPending && styles.badgePending,
                      isMissed && styles.badgeMissed,
                      isSkipped && styles.badgeSkipped,
                      isUnconfirmed && styles.badgeUnconfirmed,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={[
                        styles.statusBadgeText,
                        isTaken && { color: Colors.success },
                        isPending && { color: Colors.warning },
                        isMissed && { color: Colors.danger },
                        isSkipped && { color: Colors.primary },
                        isUnconfirmed && { color: Colors.textMuted },
                      ]}
                    >
                      {isTaken
                        ? 'Taken'
                        : isPending
                        ? 'Pending'
                        : isSkipped
                        ? 'Skipped'
                        : isMissed
                        ? 'Missed'
                        : 'Unconfirmed'}
                    </AppText>
                  </View>
                </Pressable>
              );
            })
          )}
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

                {/* Modal Action Buttons */}
                <View style={styles.modalActionGroup}>
                  {selectedDose.status === 'pending' || selectedDose.status === 'unconfirmed' ? (
                    <>
                      <AppButton
                        title={processingActionDoseId === selectedDose.id ? "Recording..." : "Mark as Taken"}
                        variant="primary"
                        size="md"
                        loading={processingActionDoseId === selectedDose.id}
                        disabled={processingActionDoseId === selectedDose.id}
                        icon={<Ionicons name="checkmark" size={18} color="#171A19" />}
                        onPress={() => handleMarkAsTaken(selectedDose.id)}
                        style={styles.modalActionButton}
                      />
                      <View style={styles.modalSubActionsRow}>
                        <AppButton
                          title="Snooze"
                          variant="secondary"
                          size="sm"
                          icon={<Ionicons name="time-outline" size={14} color={Colors.textPrimary} />}
                          onPress={() => handleOpenSnoozeModal(selectedDose)}
                          style={{ flex: 1, marginRight: Spacing.xs }}
                        />
                        <AppButton
                          title="Skip Dose"
                          variant="outline"
                          size="sm"
                          icon={<Ionicons name="play-skip-forward" size={14} color={Colors.danger} />}
                          onPress={() => handleOpenSkipModal(selectedDose)}
                          style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.4)' }}
                        />
                      </View>
                      <AppButton
                        title="Confirm as Missed"
                        variant="outline"
                        size="sm"
                        icon={<Ionicons name="close" size={14} color={Colors.textMuted} />}
                        onPress={() => {
                          handleConfirmMissed(selectedDose.id);
                          setSelectedDose(null);
                        }}
                        style={{ marginTop: Spacing.xs, borderColor: 'rgba(255, 255, 255, 0.12)' }}
                      />
                    </>
                  ) : selectedDose.status === 'skipped' ? (
                    <>
                      <AppButton
                        title={processingActionDoseId === selectedDose.id ? "Recording..." : "Change to Taken"}
                        variant="primary"
                        size="md"
                        loading={processingActionDoseId === selectedDose.id}
                        disabled={processingActionDoseId === selectedDose.id}
                        icon={<Ionicons name="checkmark" size={18} color="#171A19" />}
                        onPress={() => handleMarkAsTaken(selectedDose.id)}
                        style={styles.modalActionButton}
                      />
                      <AppButton
                        title="Close"
                        variant="secondary"
                        size="md"
                        onPress={() => setSelectedDose(null)}
                        style={styles.modalActionButton}
                      />
                    </>
                  ) : (
                    <AppButton
                      title="Close"
                      variant="secondary"
                      size="md"
                      onPress={() => setSelectedDose(null)}
                      style={styles.modalActionButton}
                    />
                  )}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* SNOOZE SELECTION MODAL (Phase 22) */}
      <Modal
        visible={!!snoozeModalDose}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSnoozeModalDose(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSnoozeModalDose(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {snoozeModalDose && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleBlock}>
                    <AppText variant="label" color={Colors.primary}>
                      SNOOZE REMINDER
                    </AppText>
                    <AppText variant="h2" style={styles.modalMedName}>
                      {snoozeModalDose.name}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={() => setSnoozeModalDose(null)}
                    hitSlop={12}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                <AppText variant="secondary" color={Colors.textSecondary} style={{ marginBottom: Spacing.md }}>
                  Choose how long to snooze this dose. NIYAM will send you a reminder alert when the interval arrives.
                </AppText>

                {/* Snooze interval options */}
                <View style={styles.snoozeOptionsGrid}>
                  {SNOOZE_OPTIONS.map((mins) => (
                    <Pressable
                      key={mins}
                      onPress={() => handleSnoozeDose(snoozeModalDose, mins)}
                      disabled={isSnoozing}
                      style={({ pressed }) => [
                        styles.snoozeOptionCard,
                        pressed && styles.snoozeOptionPressed,
                      ]}
                      accessibilityLabel={`Snooze for ${mins} minutes`}
                    >
                      <Ionicons name="time-outline" size={22} color={Colors.primary} />
                      <AppText variant="h3" color={Colors.textPrimary} style={{ marginTop: 4 }}>
                        {mins} min
                      </AppText>
                      <AppText variant="caption" color={Colors.textMuted}>
                        Reminder
                      </AppText>
                    </Pressable>
                  ))}
                </View>

                {/* Clarification banner */}
                <View style={styles.infoBannerSnooze}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
                  <AppText variant="caption" color={Colors.textMuted} style={{ flex: 1, lineHeight: 16 }}>
                    Snoozing only sets a temporary on-device reminder. It does not alter your scheduled dose time or clinical routine in MongoDB.
                  </AppText>
                </View>

                <AppButton
                  title="Cancel"
                  variant="outline"
                  size="sm"
                  onPress={() => setSnoozeModalDose(null)}
                  style={{ marginTop: Spacing.xs }}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* SKIP CONFIRMATION MODAL (Phase 22) */}
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
                    <AppText variant="label" color={Colors.danger}>
                      CONFIRM SKIP
                    </AppText>
                    <AppText variant="h2" style={styles.modalMedName}>
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
                  Are you sure you want to skip your scheduled {skipModalDose.dosage} dose at {skipModalDose.time}?
                </AppText>

                {/* Quick reason tag chips */}
                <AppText variant="caption" color={Colors.textMuted} style={{ marginBottom: 6 }}>
                  Reason (Optional):
                </AppText>
                <View style={styles.quickReasonChipsRow}>
                  {['Doctor advised', 'Feeling sick', 'Ran out of medicine', 'Fasting'].map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() => setSkipReasonInput(chip)}
                      style={[
                        styles.reasonChip,
                        skipReasonInput === chip && styles.reasonChipActive,
                      ]}
                      accessibilityLabel={`Reason: ${chip}`}
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
                  placeholder="Add custom reason or note..."
                  placeholderTextColor={Colors.textMuted}
                  style={styles.skipReasonInput}
                  maxLength={100}
                />

                {/* Clarification banner */}
                <View style={styles.infoBannerSnooze}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
                  <AppText variant="caption" color={Colors.textMuted} style={{ flex: 1, lineHeight: 16 }}>
                    Skipped doses are recorded in your adherence history as intentionally skipped, distinct from missed doses.
                  </AppText>
                </View>

                <View style={styles.modalSubActionsRow}>
                  <AppButton
                    title="Keep Dose"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setSkipModalDose(null);
                      setSkipReasonInput('');
                    }}
                    disabled={processingActionDoseId === skipModalDose.id}
                    style={{ flex: 1, marginRight: Spacing.xs }}
                  />
                  <AppButton
                    title={processingActionDoseId === skipModalDose.id ? "Skipping..." : "Confirm Skip"}
                    variant="outline"
                    size="sm"
                    loading={processingActionDoseId === skipModalDose.id}
                    disabled={processingActionDoseId === skipModalDose.id}
                    icon={<Ionicons name="play-skip-forward" size={14} color={Colors.danger} />}
                    onPress={() => handleConfirmSkip(skipModalDose.id, skipReasonInput)}
                    style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.45)' }}
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
  // Error Banner
  apiErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  retryChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    borderRadius: Radius.sm,
    marginLeft: Spacing.xs,
  },
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
  markerSkipped: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  markerUnconfirmed: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
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
  badgeSkipped: {
    backgroundColor: 'rgba(230, 162, 60, 0.12)',
  },
  badgeUnconfirmed: {
    backgroundColor: 'rgba(133, 138, 132, 0.15)',
  },
  statusBadgeText: {
    fontWeight: '600',
    fontSize: 11,
  },
  // Empty Card
  emptyCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.xs,
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
  modalActionGroup: {
    marginTop: Spacing.xs,
  },
  modalSubActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  // Phase 22 styles: Next Dose Action Columns & Quick Inline Actions
  nextDoseActionCol: {
    width: '100%',
  },
  nextDoseSubActionsRow: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  quickActionTake: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  quickActionSnooze: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.3)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  quickActionSkip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  // Snooze Modal Styles
  snoozeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  snoozeOptionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeOptionPressed: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    borderColor: Colors.primary,
  },
  infoBannerSnooze: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Radius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  // Skip Modal Styles
  quickReasonChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  reasonChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  reasonChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
  },
  skipReasonInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: Typography.size.body,
    marginBottom: Spacing.sm,
  },
});
