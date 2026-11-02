import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import { useAuth } from '../../context/AuthContext';

// Profile & Account Screen connected to authenticated User session
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of NIYAM?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              router.replace('/(auth)/welcome');
            } catch (err) {
              console.warn('Logout error:', err);
              router.replace('/(auth)/welcome');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setIsRefreshing(false);
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active Member';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="label" color={Colors.primary}>
            ACCOUNT & SETTINGS
          </AppText>
          <AppText variant="h1" style={styles.title}>
            My Profile
          </AppText>
          <AppText variant="secondary" style={styles.subtitle}>
            Your authenticated identity and medical routine preferences.
          </AppText>
        </View>

        {/* User Identity Card */}
        <AppCard style={styles.userCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <AppText style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </AppText>
            </View>
            <View style={styles.userInfo}>
              <AppText variant="h2" style={styles.userName}>
                {user?.name || 'NIYAM User'}
              </AppText>
              <AppText variant="secondary" color={Colors.textSecondary}>
                {user?.email || 'patient@niyam.health'}
              </AppText>
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <AppText variant="caption" color={Colors.success}>
                  Verified Account
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        {/* Account Details Card */}
        <AppCard style={styles.card}>
          <AppText variant="h3" style={styles.cardTitle}>
            Account Details
          </AppText>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="person-outline" size={16} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <AppText variant="caption" color={Colors.textMuted}>Full Name</AppText>
              <AppText variant="body" color={Colors.textPrimary}>{user?.name || 'Not provided'}</AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="mail-outline" size={16} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <AppText variant="caption" color={Colors.textMuted}>Email Address</AppText>
              <AppText variant="body" color={Colors.textPrimary}>{user?.email || 'Not provided'}</AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <AppText variant="caption" color={Colors.textMuted}>Member Since</AppText>
              <AppText variant="body" color={Colors.textPrimary}>{memberSince}</AppText>
            </View>
          </View>
        </AppCard>

        {/* Sync & Refresh Action */}
        <View style={styles.refreshBlock}>
          <AppButton
            title={isRefreshing ? "Refreshing Profile..." : "Sync Profile with Server"}
            variant="secondary"
            size="sm"
            icon={<Ionicons name="sync-outline" size={16} color={Colors.textPrimary} />}
            loading={isRefreshing}
            onPress={handleRefresh}
          />
        </View>

        {/* Sign Out Action */}
        <View style={styles.actions}>
          <AppButton
            title={isLoggingOut ? "Signing Out..." : "Sign Out"}
            variant="outline"
            loading={isLoggingOut}
            icon={<Ionicons name="log-out-outline" size={18} color={Colors.danger} />}
            onPress={handleLogout}
            style={styles.logoutButton}
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
    color: Colors.textSecondary,
  },
  userCard: {
    marginBottom: Spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    marginBottom: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  detailContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: Spacing.xxs,
  },
  refreshBlock: {
    marginBottom: Spacing.md,
  },
  actions: {
    marginTop: Spacing.xs,
  },
  logoutButton: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
});
