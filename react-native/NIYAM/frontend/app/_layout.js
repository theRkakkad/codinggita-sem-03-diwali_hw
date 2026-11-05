import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Colors } from '../constants/colors';
import { AuthProvider } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

// Root navigation stack for NIYAM.
// Organizes the app into authentication (auth) and main tab navigation (tabs), wrapped with AuthProvider.
export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // 1. Initialize Android channel and notification system
    notificationService.init();

    // 2. Check if app was cold-launched by tapping a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          notificationService.handleNotificationResponse(response, router);
        }
      })
      .catch((err) => {
        console.warn('Error reading cold-launch notification response:', err);
      });

    // 3. Subscribe to notification interaction while app is foregrounded or backgrounded
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      notificationService.handleNotificationResponse(response, router);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
