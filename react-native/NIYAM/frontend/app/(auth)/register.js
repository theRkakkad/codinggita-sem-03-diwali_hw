import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';

// Registration placeholder screen (Phase 05 Navigation Architecture)
export default function RegisterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="label" color={Colors.primary}>
            New User
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Create Account
          </AppText>
          <AppText variant="secondary" style={styles.subtitle}>
            Join NIYAM to start tracking your medicines, reminders, and daily adherence.
          </AppText>
        </View>

        {/* Placeholder Info Card */}
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.cardTitle}>
            Registration Placeholder
          </AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.cardBody}>
            User registration forms, input validation, and password hashing will be built in Phase 06.
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            Tap below to test navigation into the main application.
          </AppText>
        </AppCard>

        {/* Navigation Action Buttons */}
        <View style={styles.actions}>
          <AppButton
            title="Register & Enter Dashboard →"
            variant="primary"
            onPress={() => router.replace('/(tabs)')}
          />
          <AppButton
            title="Already have an account? Log In"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />
          <AppButton
            title="← Back to Welcome"
            variant="outline"
            size="sm"
            onPress={() => router.back()}
          />
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
  header: {
    marginTop: Spacing.md,
  },
  title: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    lineHeight: 20,
  },
  card: {
    marginVertical: 'auto',
  },
  cardTitle: {
    marginBottom: Spacing.xs,
  },
  cardBody: {
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
});
