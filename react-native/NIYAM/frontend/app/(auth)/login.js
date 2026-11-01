import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';

// Login placeholder screen (Phase 05 Navigation Architecture)
export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="label" color={Colors.primary}>
            Account Access
          </AppText>
          <AppText variant="h1" style={styles.title}>
            Welcome Back
          </AppText>
          <AppText variant="secondary" style={styles.subtitle}>
            Log in to manage your medication schedule and adherence history.
          </AppText>
        </View>

        {/* Placeholder Info Card */}
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.cardTitle}>
            Authentication Placeholder
          </AppText>
          <AppText variant="body" color={Colors.textSecondary} style={styles.cardBody}>
            Form inputs, validation, and JWT authentication will be integrated in Phase 06.
          </AppText>
          <AppText variant="caption" color={Colors.textMuted}>
            Tap below to test navigation into the main application.
          </AppText>
        </AppCard>

        {/* Navigation Action Buttons */}
        <View style={styles.actions}>
          <AppButton
            title="Log In & Enter Dashboard →"
            variant="primary"
            onPress={() => router.replace('/(tabs)')}
          />
          <AppButton
            title="Create an Account"
            variant="secondary"
            onPress={() => router.push('/(auth)/register')}
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
