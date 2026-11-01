import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';

import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

// Bottom Tab Navigation Layout for the main NIYAM application.
// Contains 4 tabs: Dashboard, Medicines, Calendar, Profile.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* 1. Dashboard Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>◫</Text>
          ),
        }}
      />

      {/* 2. Medicines Tab */}
      <Tabs.Screen
        name="medicines"
        options={{
          title: 'Medicines',
          tabBarLabel: 'Medicines',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>💊</Text>
          ),
        }}
      />

      {/* 3. Calendar Tab */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📅</Text>
          ),
        }}
      />

      {/* 4. Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 8,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabBarLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    marginTop: 2,
  },
  tabIcon: {
    fontSize: 18,
  },
});
