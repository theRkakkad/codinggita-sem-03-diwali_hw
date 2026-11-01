import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import { Ionicons } from '@expo/vector-icons';

// Three-step onboarding experience introducing NIYAM's core values.
export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Navigate to Registration / Auth flow
  const handleComplete = () => {
    router.replace('/(auth)/register');
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Header Bar: Step Pill & Skip Button */}
        <View style={styles.topBar}>
          <View style={styles.stepBadge}>
            <AppText style={styles.stepBadgeText}>
              Step {currentStep + 1} of 3
            </AppText>
          </View>

          {currentStep < 2 ? (
            <Pressable onPress={handleComplete} hitSlop={12} style={styles.skipButton}>
              <AppText variant="secondary" color={Colors.textMuted}>
                Skip
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}
        </View>

        {/* Dynamic Content by Step */}
        <View style={styles.contentSection}>
          
          {/* STEP 1: Your Medication, Organised */}
          {currentStep === 0 && (
            <View style={styles.stepContainer}>
              <View style={styles.textBlock}>
                <AppText variant="label" color={Colors.primary}>
                  Organisation
                </AppText>
                <AppText variant="h1" style={styles.heading}>
                  Stay on track with every dose.
                </AppText>
                <AppText variant="secondary" style={styles.description}>
                  Keep your medication schedule organised in one simple place.
                </AppText>
              </View>

              {/* Visual Composition: Organised Medicine Schedule Preview */}
              <AppCard style={styles.visualCard}>
                <View style={styles.scheduleHeader}>
                  <AppText variant="h3">Today's Schedule</AppText>
                  <AppText variant="caption" color={Colors.primary}>3 Prescriptions</AppText>
                </View>

                <View style={styles.medicineList}>
                  <View style={styles.medicineItem}>
                    <View style={styles.medicineDot} />
                    <View style={styles.medicineInfo}>
                      <AppText variant="body" style={styles.medicineName}>Metformin</AppText>
                      <AppText variant="caption">500 mg • Morning (08:00 AM)</AppText>
                    </View>
                    <View style={styles.tagTaken}>
                      <AppText variant="caption" color={Colors.success}>Taken</AppText>
                    </View>
                  </View>

                  <View style={styles.medicineItem}>
                    <View style={[styles.medicineDot, { backgroundColor: Colors.warning }]} />
                    <View style={styles.medicineInfo}>
                      <AppText variant="body" style={styles.medicineName}>Atorvastatin</AppText>
                      <AppText variant="caption">10 mg • Night (09:00 PM)</AppText>
                    </View>
                    <View style={styles.tagPending}>
                      <AppText variant="caption" color={Colors.warning}>Upcoming</AppText>
                    </View>
                  </View>

                  <View style={styles.medicineItem}>
                    <View style={[styles.medicineDot, { backgroundColor: Colors.secondary }]} />
                    <View style={styles.medicineInfo}>
                      <AppText variant="body" style={styles.medicineName}>Vitamin D3</AppText>
                      <AppText variant="caption">1000 IU • Afternoon (01:00 PM)</AppText>
                    </View>
                    <View style={styles.tagWeekly}>
                      <AppText variant="caption" color={Colors.textMuted}>Weekly</AppText>
                    </View>
                  </View>
                </View>
              </AppCard>
            </View>
          )}

          {/* STEP 2: Never Lose Track */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.textBlock}>
                <AppText variant="label" color={Colors.secondary}>
                  Discipline & Routines
                </AppText>
                <AppText variant="h1" style={styles.heading}>
                  Timely reminders. Better routines.
                </AppText>
                <AppText variant="secondary" style={styles.description}>
                  Get reminders for your scheduled medicines and keep track of your daily routine.
                </AppText>
              </View>

              {/* Visual Composition: Reminder Notification Card */}
              <AppCard style={styles.visualCard}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderIconCircle}>
                    <Ionicons name="alarm-outline" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.reminderHeaderText}>
                    <AppText variant="label" color={Colors.primary}>Dose Reminder</AppText>
                    <AppText variant="caption">Scheduled at 08:00 AM</AppText>
                  </View>
                </View>

                <View style={styles.reminderDoseBlock}>
                  <AppText variant="h2" style={styles.reminderMedTitle}>
                    Metformin 500mg
                  </AppText>
                  <AppText variant="secondary">
                    1 tablet with breakfast
                  </AppText>
                </View>

                {/* Reminder Action Chips Preview */}
                <View style={styles.actionChipRow}>
                  <View style={styles.chipTaken}>
                    <Ionicons name="checkmark" size={13} color={Colors.background} style={styles.chipIcon} />
                    <AppText variant="caption" color={Colors.background} style={styles.boldText}>
                      Taken
                    </AppText>
                  </View>
                  <View style={styles.chipSnooze}>
                    <Ionicons name="time-outline" size={13} color={Colors.textPrimary} style={styles.chipIcon} />
                    <AppText variant="caption" color={Colors.textPrimary}>
                      Snooze 10m
                    </AppText>
                  </View>
                  <View style={styles.chipSkip}>
                    <Ionicons name="close" size={13} color={Colors.danger} style={styles.chipIcon} />
                    <AppText variant="caption" color={Colors.danger}>
                      Skip
                    </AppText>
                  </View>
                </View>

                <AppText variant="caption" color={Colors.textMuted} style={styles.reminderNotice}>
                  Local offline alerts keep your routine protected anytime.
                </AppText>
              </AppCard>
            </View>
          )}

          {/* STEP 3: Build a Consistent Habit */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.textBlock}>
                <AppText variant="label" color={Colors.success}>
                  Adherence
                </AppText>
                <AppText variant="h1" style={styles.heading}>
                  Every dose deserves attention.
                </AppText>
                <AppText variant="secondary" style={styles.description}>
                  Review your medication history and understand your daily adherence.
                </AppText>
              </View>

              {/* Visual Composition: Adherence History & 7-Day Calendar Strip */}
              <AppCard style={styles.visualCard}>
                <View style={styles.adherenceStats}>
                  <View style={styles.statBox}>
                    <AppText variant="h1" color={Colors.success} style={styles.statNumber}>96%</AppText>
                    <AppText variant="caption" color={Colors.textMuted}>Weekly Adherence</AppText>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <AppText variant="h1" color={Colors.primary} style={styles.statNumber}>7 Days</AppText>
                    <AppText variant="caption" color={Colors.textMuted}>Current Streak</AppText>
                  </View>
                </View>

                {/* 7-Day Adherence Calendar Strip */}
                <View style={styles.calendarRow}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                    <View key={idx} style={styles.dayCol}>
                      <AppText variant="caption" color={Colors.textMuted}>{day}</AppText>
                      <View style={[styles.dayCircle, idx < 6 ? styles.daySuccess : styles.dayToday]}>
                        {idx < 6 ? (
                          <Ionicons name="checkmark" size={13} color={Colors.background} />
                        ) : (
                          <View style={styles.todayDot} />
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                <AppText variant="caption" color={Colors.textMuted} style={styles.adherenceDisclaimer}>
                  NIYAM supports personal tracking discipline without replacing medical advice.
                </AppText>
              </AppCard>
            </View>
          )}

        </View>

        {/* Bottom Navigation & Progress Indicator */}
        <View style={styles.footer}>
          
          {/* 3-Step Progress Dots */}
          <View style={styles.progressContainer}>
            {[0, 1, 2].map((stepIndex) => (
              <View
                key={stepIndex}
                style={[
                  styles.progressDot,
                  currentStep === stepIndex && styles.progressDotActive,
                  currentStep > stepIndex && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          {/* Action Button Row */}
          <View style={styles.buttonRow}>
            <AppButton
              title="Back"
              variant="outline"
              size="md"
              icon={<Ionicons name="arrow-back" size={16} color={Colors.primary} />}
              style={styles.backButton}
              onPress={handleBack}
            />

            <AppButton
              title={currentStep === 2 ? "Get Started" : "Next"}
              variant="primary"
              size="md"
              iconRight={<Ionicons name="arrow-forward" size={16} color="#171A19" />}
              style={styles.nextButton}
              onPress={handleNext}
            />
          </View>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.screenVertical,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  stepBadge: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  stepBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  skipPlaceholder: {
    width: 40,
  },
  contentSection: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    gap: Spacing.lg,
  },
  textBlock: {
    gap: Spacing.xs,
  },
  heading: {
    marginTop: Spacing.xxs,
    lineHeight: 34,
  },
  description: {
    lineHeight: 22,
  },
  visualCard: {
    padding: Spacing.cardPaddingLarge,
  },
  // Step 1 Styles
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  medicineList: {
    gap: Spacing.sm,
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    marginRight: Spacing.sm,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  tagTaken: {
    backgroundColor: 'rgba(127, 168, 137, 0.15)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  tagPending: {
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  tagWeekly: {
    backgroundColor: 'rgba(133, 138, 132, 0.15)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  // Step 2 Styles
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  reminderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reminderIcon: {
    fontSize: 18,
  },
  reminderHeaderText: {
    justifyContent: 'center',
  },
  reminderDoseBlock: {
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reminderMedTitle: {
    marginBottom: Spacing.xxs,
  },
  actionChipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  chipTaken: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.success,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    gap: 3,
  },
  chipSnooze: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    gap: 3,
  },
  chipSkip: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(216, 121, 112, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(216, 121, 112, 0.25)',
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    gap: 3,
  },
  chipIcon: {
    marginRight: 2,
  },
  boldText: {
    fontWeight: '700',
  },
  reminderNotice: {
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  // Step 3 Styles
  adherenceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: '800',
    marginBottom: Spacing.xxs,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  dayCol: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySuccess: {
    backgroundColor: Colors.success,
  },
  dayToday: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  adherenceDisclaimer: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  // Footer & Buttons
  footer: {
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  progressDotCompleted: {
    backgroundColor: Colors.primaryLight,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});
