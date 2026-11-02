import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import AppCard from '../../components/ui/AppCard';
import AppInput from '../../components/ui/AppInput';
import { useAuth } from '../../context/AuthContext';

// Premium Login Screen with Fluid Animations and Vector Icons.
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Entrance animations
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-15)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(20)).current;
  const footerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(headerFadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(formSlideAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(footerFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Basic validation check before submission
  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormFilled = email.trim().length > 0 && password.length > 0;
  const isValidEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const canSubmit = isFormFilled && isValidEmail && !isLoading;

  const handleLogin = async () => {
    if (!validateForm()) return;

    setApiError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      // Navigate to dashboard after successful login
      router.replace('/(tabs)');
    } catch (err) {
      setApiError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo auto-fill helper for seamless college evaluation
  const handleQuickFill = () => {
    setEmail('patient@niyam.health');
    setPassword('Discipline#2026');
    setErrors({});
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Recovery',
      'Password recovery will be available later when backend services are active.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Badge & Navigation */}
          <Animated.View
            style={[
              styles.topNav,
              {
                opacity: headerFadeAnim,
                transform: [{ translateY: headerSlideAnim }],
              },
            ]}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} style={styles.backIcon} />
              <AppText variant="secondary" color={Colors.textSecondary}>
                Back
              </AppText>
            </Pressable>

            <View style={styles.badge}>
              <AppText style={styles.badgeHindi}>नियम</AppText>
              <View style={styles.badgeDot} />
              <AppText variant="caption" style={styles.badgeCategory}>NIYAM</AppText>
            </View>
          </Animated.View>

          {/* Screen Title Block */}
          <Animated.View
            style={[
              styles.titleBlock,
              {
                opacity: headerFadeAnim,
                transform: [{ translateY: headerSlideAnim }],
              },
            ]}
          >
            <AppText variant="label" color={Colors.primary}>
              NIYAM
            </AppText>
            <AppText variant="h1" style={styles.mainTitle}>
              Welcome back.
            </AppText>
            <AppText variant="secondary" color={Colors.textSecondary} style={styles.subtitle}>
              Continue your journey towards a consistent routine.
            </AppText>
          </Animated.View>

          {/* Login Form Card */}
          <Animated.View
            style={{
              opacity: formFadeAnim,
              transform: [{ translateY: formSlideAnim }],
            }}
          >
            <AppCard style={styles.formCard}>
              {/* API Error Feedback Banner */}
              {apiError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} style={styles.errorIcon} />
                  <AppText variant="caption" color={Colors.danger} style={styles.errorBannerText}>
                    {apiError}
                  </AppText>
                </View>
              )}

              {/* Email Input */}
              <AppInput
                label="Email"
                placeholder="name@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  if (apiError) setApiError(null);
                }}
                leftIcon="mail"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              {/* Password Input */}
              <AppInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
                leftIcon="lock"
                isPassword={true}
                error={errors.password}
              />

              {/* Forgot Password Link */}
              <View style={styles.forgotRow}>
                <Pressable onPress={handleForgotPassword} hitSlop={8}>
                  <AppText variant="caption" color={Colors.primary} style={styles.forgotText}>
                    Forgot password?
                  </AppText>
                </Pressable>
              </View>

              {/* Primary Submit Button */}
              <AppButton
                title={isLoading ? "Signing in..." : "Sign In"}
                variant="primary"
                size="md"
                disabled={!canSubmit}
                loading={isLoading}
                onPress={handleLogin}
                style={styles.loginButton}
              />

              {/* Fast Evaluation Helper */}
              <Pressable onPress={handleQuickFill} style={styles.demoFillButton}>
                <Ionicons name="flash-outline" size={13} color={Colors.secondary} style={styles.flashIcon} />
                <AppText variant="caption" color={Colors.secondary}>
                  Fill Sample Credentials
                </AppText>
              </Pressable>
            </AppCard>
          </Animated.View>

          {/* Footer Navigation */}
          <Animated.View style={[styles.footerBlock, { opacity: footerFadeAnim }]}>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              hitSlop={10}
              style={styles.registerLink}
            >
              <AppText variant="secondary" color={Colors.textSecondary}>
                New to NIYAM?{' '}
                <AppText variant="secondary" color={Colors.primary} style={styles.linkBold}>
                  Create account
                </AppText>
              </AppText>
            </Pressable>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
              <AppText variant="caption" color={Colors.textMuted}>
                Protected HealthTech Environment • Encrypted Credentials
              </AppText>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.screenVertical,
    justifyContent: 'space-between',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  backIcon: {
    marginRight: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  badgeHindi: {
    color: Colors.primary,
    fontSize: 12,
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
  titleBlock: {
    marginBottom: Spacing.lg,
  },
  mainTitle: {
    marginTop: Spacing.xxs,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    lineHeight: 22,
  },
  formCard: {
    padding: Spacing.cardPaddingLarge,
    marginBottom: Spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
  },
  errorIcon: {
    marginRight: Spacing.xs,
  },
  errorBannerText: {
    flex: 1,
    lineHeight: 18,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  forgotText: {
    fontWeight: Typography.weight.medium,
  },
  loginButton: {
    marginTop: Spacing.xs,
  },
  demoFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xxs,
  },
  flashIcon: {
    marginRight: 4,
  },
  footerBlock: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  registerLink: {
    paddingVertical: Spacing.xxs,
  },
  linkBold: {
    fontWeight: Typography.weight.bold,
    textDecorationLine: 'underline',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
