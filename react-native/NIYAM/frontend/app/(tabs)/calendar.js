import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import AppText from '../../components/ui/AppText';
import AppCard from '../../components/ui/AppCard';

// Calendar Screen Placeholder (Phase 05 Navigation Architecture)
export default function CalendarScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="label" color={Colors.primary}>
            History & Adherence
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Adherence Calendar
          </AppText>
          <AppText variant="secondary" style={styles.subtitle}>
            Your medication history will appear here.
          </AppText>
        </View>

        {/* Placeholder Content Card */}
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.cardTitle}>
            Monthly Adherence Tracking
          </AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.cardBody}>
            The interactive calendar will display Taken, Missed, and Skipped doses across past weeks and months to monitor compliance.
          </AppText>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <AppText variant="caption" color={Colors.success}>
              Navigation Tab Active
            </AppText>
          </View>
        </AppCard>

      </ScrollView>
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
    paddingBottom: 110,
  },
  header: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  title: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    lineHeight: 20,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardBody: {
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
});
