import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
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
import { medicineService } from '../services/medicineService';
import { doseEventService, formatTime } from '../services/doseEventService';
import { notificationService } from '../services/notificationService';

export default function HistoryScreen() {
  const router = useRouter();

  // Active sub-tab: 'medicines' or 'doses'
  const [activeTab, setActiveTab] = useState('medicines');
  const [doseStatusFilter, setDoseStatusFilter] = useState('All');

  const [archivedMedicines, setArchivedMedicines] = useState([]);
  const [doseEvents, setDoseEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Load archived medicines and dose history from backend
  const loadHistoryData = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [archivedMeds, events] = await Promise.all([
        medicineService.getArchivedMedicines().catch(() => []),
        doseEventService.getDoseEvents().catch(() => []),
      ]);

      setArchivedMedicines(archivedMeds);
      // Filter dose events to past non-pending records (historical logs)
      const historicalDoses = events.filter((d) => d.status !== 'pending');
      setDoseEvents(historicalDoses);
    } catch (err) {
      console.warn('Failed to load history:', err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // Restore archived medicine back to active routine
  const handleRestoreMedicine = async (medicine) => {
    const id = medicine.id || medicine._id;
    try {
      setActionInProgressId(id);
      const restored = await medicineService.restoreMedicine(id);

      // Re-schedule notifications for restored medicine
      try {
        await notificationService.scheduleMedicineReminders(restored);
      } catch (notifErr) {
        console.warn('Failed to schedule reminders on restore:', notifErr);
      }

      setArchivedMedicines((prev) => prev.filter((m) => (m.id || m._id) !== id));
      setFeedbackMessage(`Restored ${medicine.name} to your active medication list.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    } catch (err) {
      Alert.alert('Restore Failed', err.message || 'Could not restore medication.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Permanently delete archived medicine
  const handlePermanentDelete = (medicine) => {
    const id = medicine.id || medicine._id;
    Alert.alert(
      'Permanent Deletion',
      `Permanently delete ${medicine.name}? This cannot be undone and will delete all associated logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionInProgressId(id);
              await medicineService.deleteMedicine(id, true);
              setArchivedMedicines((prev) => prev.filter((m) => (m.id || m._id) !== id));
              setFeedbackMessage(`Permanently removed ${medicine.name}.`);
              setTimeout(() => setFeedbackMessage(null), 3500);
            } catch (err) {
              Alert.alert('Delete Failed', err.message || 'Could not delete medication.');
            } finally {
              setActionInProgressId(null);
            }
          },
        },
      ]
    );
  };

  // Filtered dose logs
  const filteredDoseLogs = useMemo(() => {
    if (doseStatusFilter === 'All') return doseEvents;
    return doseEvents.filter((d) => d.status?.toLowerCase() === doseStatusFilter.toLowerCase());
  }, [doseEvents, doseStatusFilter]);

  // Render type icon helper
  const renderTypeIcon = (type) => {
    if (type === 'Syrup' || type === 'Drops') {
      return <MaterialCommunityIcons name="bottle-tonic-outline" size={20} color={Colors.primary} />;
    }
    if (type === 'Injection') {
      return <MaterialCommunityIcons name="needle" size={20} color={Colors.primary} />;
    }
    return <MaterialCommunityIcons name="pill" size={20} color={Colors.primary} />;
  };

  // Render dose status pill
  const renderStatusBadge = (status) => {
    const s = (status || 'unconfirmed').toLowerCase();
    let bg = 'rgba(156, 163, 175, 0.15)';
    let text = Colors.textMuted;
    let label = 'Unconfirmed';

    if (s === 'taken') {
      bg = 'rgba(34, 197, 94, 0.15)';
      text = Colors.success;
      label = 'Taken';
    } else if (s === 'skipped') {
      bg = 'rgba(234, 179, 8, 0.15)';
      text = Colors.warning;
      label = 'Skipped';
    } else if (s === 'missed') {
      bg = 'rgba(239, 68, 68, 0.15)';
      text = Colors.danger;
      label = 'Missed';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bg }]}>
        <AppText variant="caption" style={{ color: text, fontWeight: '700', fontSize: 11 }}>
          {label}
        </AppText>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. TOP HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrapper}>
          <AppText variant="h2" style={styles.headerTitle}>
            Medication History
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary}>
            Past medications & recorded intake logs
          </AppText>
        </View>
      </View>

      {/* Temporary Feedback Banner */}
      {feedbackMessage && (
        <View style={styles.feedbackBanner}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          <AppText variant="caption" color={Colors.textPrimary} style={{ flex: 1 }}>
            {feedbackMessage}
          </AppText>
        </View>
      )}

      {/* 2. SEGMENTED NAVIGATION TABS */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('medicines')}
          style={[styles.tabItem, activeTab === 'medicines' && styles.tabItemActive]}
        >
          <Ionicons
            name="archive-outline"
            size={16}
            color={activeTab === 'medicines' ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <AppText
            variant="caption"
            color={activeTab === 'medicines' ? Colors.primary : Colors.textSecondary}
            style={{ fontWeight: activeTab === 'medicines' ? '700' : '500' }}
          >
            Discontinued ({archivedMedicines.length})
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('doses')}
          style={[styles.tabItem, activeTab === 'doses' && styles.tabItemActive]}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={activeTab === 'doses' ? Colors.primary : Colors.textMuted}
            style={{ marginRight: 6 }}
          />
          <AppText
            variant="caption"
            color={activeTab === 'doses' ? Colors.primary : Colors.textSecondary}
            style={{ fontWeight: activeTab === 'doses' ? '700' : '500' }}
          >
            Intake Logs ({doseEvents.length})
          </AppText>
        </Pressable>
      </View>

      {/* 3. CONTENT AREA */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <AppText variant="secondary" color={Colors.textMuted} style={{ marginTop: 12 }}>
            Loading history records...
          </AppText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadHistoryData(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {activeTab === 'medicines' ? (
            /* TAB A: DISCONTINUED MEDICINES */
            <View>
              {archivedMedicines.length === 0 ? (
                <AppCard style={styles.emptyCard}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="file-tray-outline" size={32} color={Colors.textMuted} />
                  </View>
                  <AppText variant="h3" style={{ textAlign: 'center', marginBottom: 6 }}>
                    No Discontinued Medications
                  </AppText>
                  <AppText variant="secondary" color={Colors.textMuted} style={{ textAlign: 'center', lineHeight: 20 }}>
                    When you remove a medication from your active routine, it is safely stored here. Your historical doses and records stay permanently preserved.
                  </AppText>
                </AppCard>
              ) : (
                archivedMedicines.map((item) => {
                  const id = item.id || item._id;
                  const isBusy = actionInProgressId === id;
                  const discontinuedDate = item.archivedAt
                    ? new Date(item.archivedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Previously removed';

                  return (
                    <AppCard key={id} style={styles.medicineCard}>
                      <View style={styles.medicineCardHeader}>
                        <View style={styles.medIconBox}>
                          {renderTypeIcon(item.type)}
                        </View>
                        <View style={styles.medInfo}>
                          <AppText variant="h3" style={styles.medName}>
                            {item.name}
                          </AppText>
                          <AppText variant="caption" color={Colors.textSecondary}>
                            {item.dosage} • {item.frequency}
                          </AppText>
                        </View>
                        <View style={styles.archivedBadge}>
                          <AppText variant="caption" style={styles.archivedBadgeText}>
                            Archived
                          </AppText>
                        </View>
                      </View>

                      {/* Reminder times & discontinued date */}
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={13} color={Colors.textMuted} style={{ marginRight: 4 }} />
                        <AppText variant="caption" color={Colors.textMuted} style={{ flex: 1 }}>
                          Schedule: {item.time || item.reminderTimes?.join(', ') || 'As prescribed'}
                        </AppText>
                        <AppText variant="caption" color={Colors.textMuted}>
                          {discontinuedDate}
                        </AppText>
                      </View>

                      {item.instructions ? (
                        <AppText variant="caption" color={Colors.textSecondary} style={styles.instructionsText}>
                          Instructions: {item.instructions}
                        </AppText>
                      ) : null}

                      {/* Action buttons */}
                      <View style={styles.actionRow}>
                        <AppButton
                          title="Restore Routine"
                          variant="outline"
                          size="sm"
                          icon={<Ionicons name="refresh-outline" size={14} color={Colors.primary} />}
                          onPress={() => handleRestoreMedicine(item)}
                          disabled={isBusy}
                          style={{ flex: 1, marginRight: 8 }}
                        />
                        <AppButton
                          title="Delete Permanently"
                          variant="ghost"
                          size="sm"
                          icon={<Ionicons name="trash-outline" size={14} color={Colors.danger} />}
                          onPress={() => handlePermanentDelete(item)}
                          disabled={isBusy}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </AppCard>
                  );
                })
              )}
            </View>
          ) : (
            /* TAB B: INTAKE LOGS */
            <View>
              {/* Dose status filter pills */}
              <View style={styles.filterPillsRow}>
                {['All', 'Taken', 'Skipped', 'Missed', 'Unconfirmed'].map((statusOption) => (
                  <Pressable
                    key={statusOption}
                    onPress={() => setDoseStatusFilter(statusOption)}
                    style={[
                      styles.filterChip,
                      doseStatusFilter === statusOption && styles.filterChipActive,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={doseStatusFilter === statusOption ? Colors.primary : Colors.textMuted}
                      style={{ fontWeight: doseStatusFilter === statusOption ? '700' : '500' }}
                    >
                      {statusOption}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {filteredDoseLogs.length === 0 ? (
                <AppCard style={styles.emptyCard}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="clipboard-outline" size={32} color={Colors.textMuted} />
                  </View>
                  <AppText variant="h3" style={{ textAlign: 'center', marginBottom: 6 }}>
                    No Intake Records Found
                  </AppText>
                  <AppText variant="secondary" color={Colors.textMuted} style={{ textAlign: 'center' }}>
                    Doses you confirm as Taken, Skipped, or Missed will be logged chronologically here.
                  </AppText>
                </AppCard>
              ) : (
                filteredDoseLogs.map((dose) => {
                  const id = dose.id || dose._id;
                  const schedDate = dose.scheduledAt ? new Date(dose.scheduledAt) : null;
                  const dateStr = schedDate
                    ? schedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '';
                  const timeStr = dose.time || formatTime(dose.scheduledAt);

                  return (
                    <AppCard key={id} style={styles.logCard}>
                      <View style={styles.logHeader}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="body" style={{ fontWeight: '700' }}>
                            {dose.name}
                          </AppText>
                          <AppText variant="caption" color={Colors.textSecondary}>
                            {dose.dosage} • {dateStr} at {timeStr}
                          </AppText>
                        </View>
                        {renderStatusBadge(dose.status)}
                      </View>

                      {dose.takenAt && (
                        <AppText variant="caption" color={Colors.success} style={{ marginTop: 4 }}>
                          Recorded Taken at: {formatTime(dose.takenAt)}
                        </AppText>
                      )}

                      {dose.skippedReason && (
                        <AppText variant="caption" color={Colors.warning} style={{ marginTop: 4 }}>
                          Skip reason: "{dose.skippedReason}"
                        </AppText>
                      )}

                      {dose.missedReason && (
                        <AppText variant="caption" color={Colors.danger} style={{ marginTop: 4 }}>
                          Missed reason: "{dose.missedReason}"
                        </AppText>
                      )}

                      {dose.notes && (
                        <AppText variant="caption" color={Colors.textMuted} style={{ marginTop: 4 }}>
                          Notes: {dose.notes}
                        </AppText>
                      )}
                    </AppCard>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: Typography.weight.bold,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127, 168, 137, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127, 168, 137, 0.25)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
  },
  tabItemActive: {
    backgroundColor: Colors.surfaceSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  medicineCard: {
    marginBottom: Spacing.md,
  },
  medicineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  medIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontWeight: '700',
  },
  archivedBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  instructionsText: {
    lineHeight: 18,
    marginTop: 4,
    backgroundColor: Colors.surfaceSecondary,
    padding: 8,
    borderRadius: Radius.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(127, 168, 137, 0.12)',
  },
  logCard: {
    marginBottom: Spacing.sm,
    paddingVertical: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
});
