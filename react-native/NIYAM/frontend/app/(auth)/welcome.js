import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

// Cinematic Namaste Welcome Screen with Ambient Breathing Glow & Indian Identity.
export default function NamasteWelcomeScreen() {
  const router = useRouter();

  // Animation values using React Native's native Animated driver
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringScaleAnim = useRef(new Animated.Value(0.8)).current;
  const ringOpacityAnim = useRef(new Animated.Value(0)).current;

  const symbolScaleAnim = useRef(new Animated.Value(0.6)).current;
  const symbolOpacityAnim = useRef(new Animated.Value(0)).current;

  const hindiOpacityAnim = useRef(new Animated.Value(0)).current;
  const hindiTranslateAnim = useRef(new Animated.Value(14)).current;

  const englishOpacityAnim = useRef(new Animated.Value(0)).current;
  const englishTranslateAnim = useRef(new Animated.Value(14)).current;

  const supportOpacityAnim = useRef(new Animated.Value(0)).current;
  const supportTranslateAnim = useRef(new Animated.Value(12)).current;

  const ctaOpacityAnim = useRef(new Animated.Value(0)).current;
  const ctaTranslateAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Check if user has reduced-motion enabled in device accessibility settings
    AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      if (isReduced) {
        // Skip motion for accessibility: immediately reveal all elements
        glowAnim.setValue(1);
        ringOpacityAnim.setValue(1);
        ringScaleAnim.setValue(1);
        symbolOpacityAnim.setValue(1);
        symbolScaleAnim.setValue(1);
        hindiOpacityAnim.setValue(1);
        hindiTranslateAnim.setValue(0);
        englishOpacityAnim.setValue(1);
        englishTranslateAnim.setValue(0);
        supportOpacityAnim.setValue(1);
        supportTranslateAnim.setValue(0);
        ctaOpacityAnim.setValue(1);
        ctaTranslateAnim.setValue(0);
        return;
      }

      // 1. Choreographed cinematic entrance sequence
      Animated.sequence([
        // Step 1: Ambient Opening Glow & Ring
        Animated.parallel([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacityAnim, {
            toValue: 0.6,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(ringScaleAnim, {
            toValue: 1.1,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),

        // Step 2 & 3: Namaste Symbol & Hindi Greeting reveal
        Animated.parallel([
          Animated.timing(symbolOpacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(symbolScaleAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.timing(hindiOpacityAnim, {
            toValue: 1,
            duration: 500,
            delay: 150,
            useNativeDriver: true,
          }),
          Animated.timing(hindiTranslateAnim, {
            toValue: 0,
            duration: 500,
            delay: 150,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),

        // Step 4: English Greeting & Welcome to NIYAM
        Animated.parallel([
          Animated.timing(englishOpacityAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(englishTranslateAnim, {
            toValue: 0,
            duration: 450,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),

        // Step 5: Supporting Text & Tagline
        Animated.parallel([
          Animated.timing(supportOpacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(supportTranslateAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),

        // Step 6: Call-To-Action buttons slide up from bottom
        Animated.parallel([
          Animated.timing(ctaOpacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(ctaTranslateAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // 2. Start serene breathing ambient pulse loop once intro is complete
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1.0,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    });
  }, []);

  // Navigation handlers
  const handleBeginJourney = () => {
    router.push('/(auth)/onboarding');
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Top subtle identity pill */}
        <Animated.View style={[styles.topBrandBadge, { opacity: glowAnim }]}>
          <AppText style={styles.badgeHindi}>नियम</AppText>
          <View style={styles.badgeDot} />
          <AppText variant="caption" style={styles.badgeCategory}>HealthTech</AppText>
        </Animated.View>

        {/* Central Namaste Symbol & Ambient Glow */}
        <View style={styles.centerSection}>
          
          {/* Subtle Ambient Glowing Rings with Serene Pulse */}
          <Animated.View
            style={[
              styles.ambientGlow,
              {
                opacity: glowAnim,
                transform: [
                  { scale: Animated.multiply(ringScaleAnim, pulseAnim) },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.amberRing,
              {
                opacity: ringOpacityAnim,
                transform: [
                  { scale: Animated.multiply(ringScaleAnim, pulseAnim) },
                ],
              },
            ]}
          />

          {/* Folded Hands Icon Symbol */}
          <Animated.View
            style={[
              styles.symbolContainer,
              {
                opacity: symbolOpacityAnim,
                transform: [{ scale: symbolScaleAnim }],
              },
            ]}
          >
            <MaterialCommunityIcons name="hands-pray" size={44} color={Colors.primary} />
          </Animated.View>

          {/* Hindi Greeting: "नमस्ते" */}
          <Animated.View
            style={[
              styles.hindiBlock,
              {
                opacity: hindiOpacityAnim,
                transform: [{ translateY: hindiTranslateAnim }],
              },
            ]}
          >
            <AppText style={styles.hindiGreetingText}>
              नमस्ते
            </AppText>
          </Animated.View>

          {/* English Greeting & Main Heading */}
          <Animated.View
            style={[
              styles.headingBlock,
              {
                opacity: englishOpacityAnim,
                transform: [{ translateY: englishTranslateAnim }],
              },
            ]}
          >
            <AppText variant="secondary" color={Colors.textSecondary} style={styles.englishGreeting}>
              Namaste.
            </AppText>

            <View style={styles.titleRow}>
              <AppText variant="h1" style={styles.welcomeText}>
                Welcome to{' '}
              </AppText>
              <AppText variant="h1" color={Colors.primary} style={styles.brandWordmark}>
                NIYAM
              </AppText>
              <AppText variant="h1" style={styles.welcomeText}>
                .
              </AppText>
            </View>
          </Animated.View>

          {/* Supporting Text & Official Tagline */}
          <Animated.View
            style={[
              styles.supportBlock,
              {
                opacity: supportOpacityAnim,
                transform: [{ translateY: supportTranslateAnim }],
              },
            ]}
          >
            <AppText variant="body" color={Colors.textSecondary} style={styles.supportingText}>
              A little discipline today. A better routine every day.
            </AppText>

            <View style={styles.accentDivider} />

            <AppText variant="secondary" color={Colors.primaryLight} style={styles.brandTagline}>
              Every dose. Every day. In discipline.
            </AppText>
          </Animated.View>

        </View>

        {/* Call To Action Buttons */}
        <Animated.View
          style={[
            styles.ctaContainer,
            {
              opacity: ctaOpacityAnim,
              transform: [{ translateY: ctaTranslateAnim }],
            },
          ]}
        >
          {/* Primary Action Button */}
          <AppButton
            title="Begin your journey"
            variant="primary"
            size="md"
            iconRight={<Ionicons name="arrow-forward" size={18} color="#171A19" />}
            onPress={handleBeginJourney}
          />

          {/* Secondary Action Link */}
          <Pressable
            onPress={handleLogin}
            hitSlop={12}
            style={({ pressed }) => [
              styles.secondaryLink,
              pressed && styles.secondaryLinkPressed,
            ]}
          >
            <AppText variant="secondary" color={Colors.textSecondary}>
              Already have an account?{' '}
              <AppText variant="secondary" color={Colors.primary} style={styles.underlineText}>
                Log in
              </AppText>
            </AppText>
          </Pressable>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background, // Deep charcoal foundation #171A19
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.screenVertical,
    justifyContent: 'space-between',
  },
  topBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
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
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: '500',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  ambientGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(230, 162, 60, 0.08)',
  },
  amberRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(230, 162, 60, 0.25)',
  },
  symbolContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(230, 162, 60, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  namasteIcon: {
    fontSize: 42,
    textAlign: 'center',
  },
  hindiBlock: {
    marginBottom: Spacing.xs,
  },
  hindiGreetingText: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  headingBlock: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  englishGreeting: {
    fontSize: Typography.size.base,
    letterSpacing: 1,
    marginBottom: Spacing.xxs,
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  brandWordmark: {
    fontWeight: '800',
    letterSpacing: 2,
  },
  supportBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  supportingText: {
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  accentDivider: {
    width: 32,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    marginVertical: Spacing.sm,
    opacity: 0.8,
  },
  brandTagline: {
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 13,
  },
  ctaContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  secondaryLink: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  secondaryLinkPressed: {
    opacity: 0.7,
  },
  underlineText: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
