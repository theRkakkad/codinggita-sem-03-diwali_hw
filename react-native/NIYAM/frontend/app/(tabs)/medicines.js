import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import AppText from '../../components/ui/AppText';
import AppCard from '../../components/ui/AppCard';

// Medicines Screen Placeholder (Phase 05 Navigation Architecture)
export default function MedicinesScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="label" color={Colors.primary}>
            Prescriptions
          </AppText>
          <AppText variant="h1" style={styles.title}>
            My Medicines
          </AppText>
          <AppText variant="secondary" style={styles.subtitle}>
            Your medication list will appear here.
          </AppText>
        </View>

        {/* Placeholder Content Card */}
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.cardTitle}>
            Medicine Management
          </AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.cardBody}>
            Here you will be able to add new medicines, view prescription details, edit dosage times, and attach medical documents.
          </AppText>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <AppText variant="caption" color={Colors.secondary}>
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
    paddingVertical: Spacing.screenVertical,
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
    backgroundColor: Colors.secondary,
    marginRight: Spacing.xs,
  },
});
