import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import AppText from '../../components/ui/AppText';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';

// Profile Screen Placeholder (Phase 05 Navigation Architecture)
export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="label" color={Colors.primary}>
            User Account
          </AppText>
          <AppText variant="h1" style={styles.title}>
            My Profile
          </AppText>
          <AppText variant="secondary" style={styles.subtitle}>
            Your account and preferences will appear here.
          </AppText>
        </View>

        {/* Placeholder Content Card */}
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.cardTitle}>
            Account & Settings
          </AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.cardBody}>
            User profile details, notification sound preferences, and account management tools will be configured in future phases.
          </AppText>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <AppText variant="caption" color={Colors.secondary}>
              Navigation Tab Active
            </AppText>
          </View>
        </AppCard>

        {/* Action to test returning to Welcome flow */}
        <View style={styles.actions}>
          <AppButton
            title="Log Out (Return to Welcome)"
            variant="outline"
            onPress={() => router.replace('/(auth)/welcome')}
          />
        </View>

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
    marginBottom: Spacing.lg,
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
  actions: {
    marginTop: Spacing.md,
  },
});
