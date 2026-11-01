import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Temporary Welcome Screen to verify frontend setup and Expo Router configuration.
export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Top Hindi Identity Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>नियम</Text>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeSubtext}>HealthTech</Text>
        </View>

        {/* Hero Title Section */}
        <View style={styles.heroSection}>
          <Text style={styles.brandTitle}>NIYAM</Text>
          <View style={styles.accentBar} />
          <Text style={styles.tagline}>
            Every dose. Every day. In discipline.
          </Text>
          <Text style={styles.subtitle}>
            Your personal medication companion.
          </Text>
        </View>

        {/* Foundation Verification Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>Foundation Active</Text>
          </View>
          <Text style={styles.statusText}>
            React Native + Expo Router is initialized and ready.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121417', // Deep charcoal foundation
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1C2028',
    borderColor: '#2D323E',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  badgeText: {
    color: '#E07A28', // Subtle saffron accent
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#5A606E',
    marginHorizontal: 8,
  },
  badgeSubtext: {
    color: '#A1A7B5',
    fontSize: 12,
    fontWeight: '500',
  },
  heroSection: {
    marginVertical: 'auto',
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#F5F3EF', // Warm off-white
    letterSpacing: 3,
  },
  accentBar: {
    width: 44,
    height: 4,
    backgroundColor: '#E07A28', // Saffron bar
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '500',
    color: '#E4DFD5',
    lineHeight: 28,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#8E94A2',
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: '#181C23',
    borderColor: '#262B36',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4E9F76', // Muted sage green
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E9F76',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
});
