import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';

// Welcome screen introducing NIYAM and directing users to Login or Registration.
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Hindi Identity Badge */}
        <View style={styles.badge}>
          <AppText style={styles.badgeHindi}>नियम</AppText>
          <View style={styles.badgeDot} />
          <AppText variant="caption" style={styles.badgeCategory}>HealthTech</AppText>
        </View>

        {/* Hero Branding Section */}
        <View style={styles.heroSection}>
          <AppText variant="display" style={styles.brandTitle}>
            NIYAM
          </AppText>
          <View style={styles.accentBar} />
          <AppText variant="h2" style={styles.tagline}>
            Every dose. Every day. In discipline.
          </AppText>
          <AppText variant="secondary" style={styles.subtitle}>
            Your personal medication management and adherence tracking companion.
          </AppText>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionSection}>
          <AppButton
            title="Get Started"
            variant="primary"
            onPress={() => router.push('/(auth)/register')}
          />
          <AppButton
            title="Log In"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
          />
          
          {/* Quick link to test tabs directly */}
          <AppButton
            title="Explore App Preview (Tabs) →"
            variant="outline"
            size="sm"
            style={styles.previewButton}
            onPress={() => router.replace('/(tabs)')}
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  badgeHindi: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: Spacing.xs,
  },
  badgeCategory: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  heroSection: {
    marginVertical: 'auto',
  },
  brandTitle: {
    letterSpacing: 4,
  },
  accentBar: {
    width: 44,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontStyle: 'italic',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    lineHeight: 28,
  },
  subtitle: {
    lineHeight: 22,
  },
  actionSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  previewButton: {
    marginTop: Spacing.xs,
  },
});
