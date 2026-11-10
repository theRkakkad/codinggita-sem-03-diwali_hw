import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../components/ui/AppText';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Minimum duration in ms to display the branded splash screen before handoff
const MIN_SPLASH_DURATION = 1800;

/**
 * NIYAM Branded Startup Splash Screen
 * Exact visual match to the official NIYAM dawn artwork:
 * - Serene sky & sunrise horizon
 * - Iconic capsule & herbal leaves emblem
 * - "NIYAM - Your Medication Companion"
 * - "Take Care. Live Better."
 * - Smooth 60fps circular loading spinner
 * - "Loading your health journey..."
 * - Single-time execution with seamless handoff to dashboard or welcome screen
 */
export default function StartupSplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Animation values
  const screenFadeAnim = useRef(new Animated.Value(0)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Floating leaves animation values
  const leaf1X = useRef(new Animated.Value(0)).current;
  const leaf1Y = useRef(new Animated.Value(0)).current;
  const leaf2X = useRef(new Animated.Value(0)).current;
  const leaf2Y = useRef(new Animated.Value(0)).current;

  const isMinTimeElapsed = useRef(false);
  const isTransitioning = useRef(false);

  // Transition to next screen (tabs for logged in, welcome for guest)
  const triggerExitTransition = useCallback(() => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    Animated.timing(exitFadeAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    });
  }, [isAuthenticated, router, exitFadeAnim]);

  // Tap anywhere to skip into app immediately if auth finished
  const handleTapToSkip = () => {
    if (!isAuthLoading && !isTransitioning.current) {
      triggerExitTransition();
    }
  };

  useEffect(() => {
    // 1. Initial screen fade-in
    Animated.timing(screenFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // 2. Smooth continuous 360-degree spinner loop
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 950,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // 3. Gentle floating herbal leaves drifting across the sky
    const leafLoop1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(leaf1X, { toValue: 12, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(leaf1Y, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(leaf1X, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(leaf1Y, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    leafLoop1.start();

    const leafLoop2 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(leaf2X, { toValue: -10, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(leaf2Y, { toValue: 6, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(leaf2X, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(leaf2Y, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    leafLoop2.start();

    // 4. Timer ensuring the splash is visible for at least MIN_SPLASH_DURATION
    const minTimer = setTimeout(() => {
      isMinTimeElapsed.current = true;
      if (!isAuthLoading && !isTransitioning.current) {
        triggerExitTransition();
      }
    }, MIN_SPLASH_DURATION);

    return () => {
      clearTimeout(minTimer);
      spinLoop.stop();
      leafLoop1.stop();
      leafLoop2.stop();
    };
  }, [triggerExitTransition, isAuthLoading, screenFadeAnim, spinAnim, leaf1X, leaf1Y, leaf2X, leaf2Y]);

  // When auth loading finishes after minimum splash duration, proceed automatically
  useEffect(() => {
    if (!isAuthLoading && isMinTimeElapsed.current && !isTransitioning.current) {
      triggerExitTransition();
    }
  }, [isAuthLoading, triggerExitTransition]);

  // Interpolated spin angle
  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable style={styles.container} onPress={handleTapToSkip}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <Animated.View
        style={[
          styles.animatedWrapper,
          {
            opacity: Animated.multiply(screenFadeAnim, exitFadeAnim),
          },
        ]}
      >
        {/* Full-screen exact artwork background */}
        <ImageBackground
          source={require('../assets/splash_clean_bg.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Subtle floating herbal leaves overlay */}
          <Animated.View
            style={[
              styles.floatingLeaf,
              {
                top: SCREEN_HEIGHT * 0.16,
                left: SCREEN_WIDTH * 0.14,
                transform: [{ translateX: leaf1X }, { translateY: leaf1Y }, { rotate: '-20deg' }],
              },
            ]}
          >
            <Ionicons name="leaf" size={18} color="rgba(125, 185, 75, 0.7)" />
          </Animated.View>

          <Animated.View
            style={[
              styles.floatingLeaf,
              {
                top: SCREEN_HEIGHT * 0.08,
                right: SCREEN_WIDTH * 0.16,
                transform: [{ translateX: leaf2X }, { translateY: leaf2Y }, { rotate: '40deg' }],
              },
            ]}
          >
            <Ionicons name="leaf" size={15} color="rgba(125, 185, 75, 0.65)" />
          </Animated.View>

          <Animated.View
            style={[
              styles.floatingLeaf,
              {
                top: SCREEN_HEIGHT * 0.27,
                right: SCREEN_WIDTH * 0.12,
                transform: [{ translateX: leaf1Y }, { translateY: leaf1X }, { rotate: '15deg' }],
              },
            ]}
          >
            <Ionicons name="leaf" size={13} color="rgba(125, 185, 75, 0.6)" />
          </Animated.View>

          {/* Bottom Loading Section (Spinner & "Loading your health journey...") */}
          <View style={styles.bottomSection}>
            {/* Smooth 60fps circular loader ring */}
            <Animated.View
              style={[
                styles.spinnerRing,
                {
                  transform: [{ rotate: spinInterpolation }],
                },
              ]}
            />

            {/* Loading caption */}
            <AppText style={styles.loadingCaption}>
              Loading your health journey...
            </AppText>
          </View>
        </ImageBackground>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#95C5F8',
  },
  animatedWrapper: {
    flex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },

  // Floating leaf accents
  floatingLeaf: {
    position: 'absolute',
  },

  // Bottom Loading Section positioned exactly where the artwork loader sits
  bottomSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT * 0.09, // Matches artwork vertical placement
    paddingHorizontal: 20,
  },

  // Modern circular spinner ring matching design
  spinnerRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderTopColor: '#FFFFFF',
    borderRightColor: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 14,
  },

  // Caption text
  loadingCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
