import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import AppCard from '../../components/ui/AppCard';
import AppButton from '../../components/ui/AppButton';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { medicineService } from '../../services/medicineService';

// Profile & Account Screen connected to authenticated User session
export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshProfile, updateProfile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Medication reminder preferences & system permissions (Phase 21 & Phase 23)
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isTestingReminder, setIsTestingReminder] = useState(false);

  // End-of-Day review reminder settings (Phase 23)
  const [eodRemindersEnabled, setEodRemindersEnabled] = useState(true);
  const [eodReminderTime, setEodReminderTime] = useState('09:00 PM');

  // Sync reminder preferences and system permission status
  const loadReminderSettings = useCallback(async () => {
    try {
      const enabled = await notificationService.areRemindersEnabled();
      setRemindersEnabled(enabled);

      const eodEnabled = await notificationService.isEodReminderEnabled();
      setEodRemindersEnabled(eodEnabled);

      const eodTime = await notificationService.getEodReminderTime();
      setEodReminderTime(eodTime);

      const perm = await notificationService.getPermissionStatus();
      setPermissionStatus(perm.status);
      setPermissionGranted(perm.granted);
    } catch (e) {
      console.warn('Error loading reminder settings:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReminderSettings();
    }, [loadReminderSettings])
  );

  const handleToggleReminders = async (value) => {
    try {
      if (value) {
        // Request permission if not granted
        const perm = await notificationService.getPermissionStatus();
        if (!perm.granted) {
          if (perm.status === 'denied') {
            Alert.alert(
              'Notifications Disabled',
              'Medication reminders are blocked by your device settings. Would you like to open settings to enable them?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => notificationService.openSettings() },
              ]
            );
            return;
          }

          const requested = await notificationService.requestPermission();
          if (!requested) {
            Alert.alert(
              'Permission Required',
              'Notifications are required to alert you when it is time to take your medication.'
            );
            return;
          }
        }

        // Fetch medicines to schedule active routines
        const meds = await medicineService.getMedicines().catch(() => []);
        await notificationService.setRemindersEnabled(true, meds);
        setRemindersEnabled(true);
        setPermissionGranted(true);
      } else {
        await notificationService.setRemindersEnabled(false);
        setRemindersEnabled(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update reminder settings.');
    }
  };

  const handleOpenSettings = async () => {
    await notificationService.openSettings();
  };

  const handleSendTestReminder = async () => {
    setIsTestingReminder(true);
    try {
      await notificationService.scheduleTestNotification(5);
      Alert.alert(
        'Test Reminder Scheduled',
        'A test reminder will appear in 5 seconds. Lock your screen or switch apps to see the notification banner.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Test Failed', err.message || 'Could not schedule test notification.');
    } finally {
      setIsTestingReminder(false);
    }
  };

  // Phase 23: Toggle End-of-Day Review Reminders
  const handleToggleEodReminders = async (value) => {
    try {
      if (value) {
        const perm = await notificationService.getPermissionStatus();
        if (!perm.granted) {
          if (perm.status === 'denied') {
            Alert.alert(
              'Notifications Disabled',
              'End-of-Day review reminders require notification permission. Open settings to enable notifications?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => notificationService.openSettings() },
              ]
            );
            return;
          }
          const requested = await notificationService.requestPermission();
          if (!requested) {
            Alert.alert(
              'Permission Required',
              'Notifications are required to remind you to review remaining medication doses.'
            );
            return;
          }
        }
        await notificationService.setEodReminderSettings(true, eodReminderTime);
        setEodRemindersEnabled(true);
        setPermissionGranted(true);
      } else {
        await notificationService.setEodReminderSettings(false);
        setEodRemindersEnabled(false);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update End-of-Day reminder settings.');
    }
  };

  // Phase 23: Change End-of-Day Review reminder time
  const handleChangeEodTime = async (timeStr) => {
    setEodReminderTime(timeStr);
    try {
      await notificationService.setEodReminderSettings(eodRemindersEnabled, timeStr);
    } catch (err) {
      console.warn('Failed to update EOD time:', err);
    }
  };

  // Profile Picture management (Camera & Library selection)
  const handleAvatarPress = () => {
    const options = [
      {
        text: 'Choose from Library',
        onPress: () => pickImage(false),
      },
      {
        text: 'Take Photo',
        onPress: () => pickImage(true),
      },
    ];

    if (user?.avatar) {
      options.push({
        text: 'Remove Photo',
        style: 'destructive',
        onPress: removeAvatar,
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Profile Picture', 'Add or change your profile picture', options);
  };

  const pickImage = async (useCamera = false) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Needed',
            'Please allow camera access in device settings to take a profile picture.'
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo Library Permission Needed',
            'Please allow photo library access in device settings to select a profile picture.'
          );
          return;
        }
      }

      setIsUploadingPhoto(true);

      const options = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsUploadingPhoto(false);
        return;
      }

      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const base64Uri = asset.base64?.startsWith('data:')
        ? asset.base64
        : `data:${mime};base64,${asset.base64}`;

      await updateProfile({ avatar: base64Uri });
      Alert.alert('Success', 'Profile picture updated successfully.');
    } catch (err) {
      console.warn('Failed to update profile picture:', err);
      Alert.alert('Error', err.message || 'Failed to update profile picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setIsUploadingPhoto(true);
      await updateProfile({ avatar: null });
      Alert.alert('Removed', 'Profile picture removed.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to remove profile picture.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

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
            <Pressable
              onPress={handleAvatarPress}
              disabled={isUploadingPhoto}
              style={({ pressed }) => [
                styles.avatarWrapper,
                pressed && { opacity: 0.8 },
              ]}
              accessibilityLabel="Change profile picture"
            >
              <View style={styles.avatar}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarPhoto} />
                ) : (
                  <AppText style={styles.avatarText}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </AppText>
                )}
                {isUploadingPhoto && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color={Colors.white} />
                  </View>
                )}
              </View>
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={13} color={Colors.white} />
              </View>
            </Pressable>
            <View style={styles.userInfo}>
              <AppText variant="h2" style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
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

        {/* Medication Reminders Settings Card (Phase 21) */}
        <AppCard style={styles.card}>
          <View style={styles.reminderHeaderRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <AppText variant="h3" style={styles.cardTitle}>
                Medication Reminders
              </AppText>
              <AppText variant="secondary" color={Colors.textSecondary} style={styles.reminderSubtitle}>
                Timely on-device alerts for your prescribed doses.
              </AppText>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={handleToggleReminders}
              trackColor={{ false: Colors.surfaceSecondary, true: Colors.primary }}
              thumbColor={remindersEnabled ? '#FFFFFF' : Colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          {/* Permission Status */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons
                name={permissionGranted ? 'notifications-outline' : 'notifications-off-outline'}
                size={16}
                color={permissionGranted ? Colors.success : Colors.warning}
              />
            </View>
            <View style={styles.detailContent}>
              <AppText variant="caption" color={Colors.textMuted}>Notification Permission</AppText>
              <View style={styles.statusPillInline}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: permissionGranted
                        ? Colors.success
                        : permissionStatus === 'denied'
                        ? Colors.danger
                        : Colors.warning,
                    },
                  ]}
                />
                <AppText
                  variant="body"
                  color={
                    permissionGranted
                      ? Colors.success
                      : permissionStatus === 'denied'
                      ? Colors.danger
                      : Colors.warning
                  }
                  style={{ fontWeight: '600' }}
                >
                  {permissionGranted
                    ? 'Active / Granted'
                    : permissionStatus === 'denied'
                    ? 'Denied / Blocked'
                    : 'Not Requested'}
                </AppText>
              </View>
            </View>
          </View>

          {/* Action to open settings if permission denied */}
          {!permissionGranted && (
            <View style={styles.permissionActionRow}>
              <AppButton
                title="Enable in Device Settings"
                variant="outline"
                size="sm"
                icon={<Ionicons name="settings-outline" size={14} color={Colors.primary} />}
                onPress={handleOpenSettings}
                style={styles.settingsButton}
              />
            </View>
          )}

          {/* Clarification banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
            <AppText variant="caption" color={Colors.textMuted} style={{ flex: 1, lineHeight: 16 }}>
              Disabling device reminders silences alerts on this device but does not delete or alter your medication routines in MongoDB.
            </AppText>
          </View>

          {/* Send Test Reminder Button */}
          {permissionGranted && remindersEnabled && (
            <View style={styles.testReminderRow}>
              <AppButton
                title={isTestingReminder ? 'Scheduling Test...' : 'Send Test Reminder (5s)'}
                variant="secondary"
                size="sm"
                icon={<Ionicons name="time-outline" size={14} color={Colors.textPrimary} />}
                loading={isTestingReminder}
                onPress={handleSendTestReminder}
              />
            </View>
          )}
        </AppCard>

        {/* End-of-Day Review Reminders Settings Card (Phase 23) */}
        <AppCard style={styles.card}>
          <View style={styles.reminderHeaderRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <AppText variant="h3" style={styles.cardTitle}>
                End-of-Day Review
              </AppText>
              <AppText variant="secondary" color={Colors.textSecondary} style={styles.reminderSubtitle}>
                Evening reminder to confirm unanswered doses from today.
              </AppText>
            </View>
            <Switch
              value={eodRemindersEnabled}
              onValueChange={handleToggleEodReminders}
              trackColor={{ false: Colors.surfaceSecondary, true: Colors.primary }}
              thumbColor={eodRemindersEnabled ? '#FFFFFF' : Colors.textMuted}
            />
          </View>

          <View style={styles.divider} />

          {/* Reminder Time Selector */}
          <View style={styles.eodTimeBlock}>
            <View style={styles.eodTimeHeader}>
              <View style={styles.detailIconBox}>
                <Ionicons name="moon-outline" size={16} color={Colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <AppText variant="caption" color={Colors.textMuted}>Daily Review Time</AppText>
                <AppText variant="body" color={Colors.textPrimary} style={{ fontWeight: '700' }}>
                  {eodReminderTime} {eodReminderTime === '09:00 PM' ? '(Default)' : ''}
                </AppText>
              </View>
            </View>

            {eodRemindersEnabled && (
              <View style={styles.timeChipsRow}>
                {['08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM'].map((timeOption) => (
                  <Pressable
                    key={timeOption}
                    onPress={() => handleChangeEodTime(timeOption)}
                    style={[
                      styles.timeChip,
                      eodReminderTime === timeOption && styles.timeChipActive,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={eodReminderTime === timeOption ? Colors.primary : Colors.textSecondary}
                      style={{ fontWeight: eodReminderTime === timeOption ? '700' : '500' }}
                    >
                      {timeOption}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Open Review Screen Action */}
          <View style={styles.eodActionRow}>
            <AppButton
              title="Open Today's Review Screen"
              variant="outline"
              size="sm"
              icon={<Ionicons name="clipboard-outline" size={14} color={Colors.primary} />}
              onPress={() => router.push('/end-of-day')}
              style={{ borderColor: 'rgba(230, 162, 60, 0.4)' }}
            />
          </View>

          {/* Clarification banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6, marginTop: 1 }} />
            <AppText variant="caption" color={Colors.textMuted} style={{ flex: 1, lineHeight: 16 }}>
              Disabling End-of-Day reminders silences the evening notification but never deletes your dose events or medication history.
            </AppText>
          </View>
        </AppCard>

        {/* Medication History Navigation Card */}
        <AppCard style={styles.card}>
          <View style={styles.historyCardRow}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <AppText variant="h3" style={styles.cardTitle}>
                Medication History
              </AppText>
              <AppText variant="secondary" color={Colors.textSecondary} style={{ marginTop: 2 }}>
                View discontinued medications and complete historical dose intake logs.
              </AppText>
            </View>
            <AppButton
              title="Open"
              variant="outline"
              size="sm"
              icon={<Ionicons name="time-outline" size={14} color={Colors.primary} />}
              onPress={() => router.push('/history')}
            />
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
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
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
  historyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  reminderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderSubtitle: {
    fontSize: Typography.size.caption,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  statusPillInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  permissionActionRow: {
    marginTop: Spacing.sm,
  },
  settingsButton: {
    borderColor: Colors.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  testReminderRow: {
    marginTop: Spacing.md,
    alignItems: 'flex-start',
  },
  eodTimeBlock: {
    paddingVertical: Spacing.xs,
  },
  eodTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginLeft: 40,
    marginBottom: Spacing.sm,
  },
  timeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(230, 162, 60, 0.15)',
  },
  eodActionRow: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
});
