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

// Premium Registration Screen with Staggered Entrance Animations & Vector Icons.
export default function RegisterScreen() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

  // Form validation logic
  const validateForm = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the Terms and Privacy Policy.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormFilled = fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 8 && confirmPassword.length >= 8;
  const isValidEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const isPasswordMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = isFormFilled && isValidEmail && isPasswordMatch && agreeTerms && !isLoading;

  const handleRegister = () => {
    if (!validateForm()) return;

    setIsLoading(true);
    // Temporary demo message as required by Phase 07
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        'Validation Successful',
        'Account details validated successfully! In Phase 07, registration is frontend UI only. Backend account creation will be connected in Phase 08.',
        [{ text: 'OK' }]
      );
    }, 500);
  };

  // Demo auto-fill helper for fast evaluator verification
  const handleQuickFill = () => {
    setFullName('Aarav Sharma');
    setEmail('aarav.sharma@niyam.health');
    setPassword('Discipline#2026');
    setConfirmPassword('Discipline#2026');
    setAgreeTerms(true);
    setErrors({});
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
          {/* Top Navigation & Brand Header */}
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
              Create your account.
            </AppText>
            <AppText variant="secondary" color={Colors.textSecondary} style={styles.subtitle}>
              Start building a more consistent medication routine.
            </AppText>
          </Animated.View>

          {/* Registration Form Card */}
          <Animated.View
            style={{
              opacity: formFadeAnim,
              transform: [{ translateY: formSlideAnim }],
            }}
          >
            <AppCard style={styles.formCard}>
              {/* Full Name Input */}
              <AppInput
                label="Full Name"
                placeholder="e.g. Aarav Sharma"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: null }));
                }}
                leftIcon="person"
                autoCapitalize="words"
                error={errors.fullName}
              />

              {/* Email Address Input */}
              <AppInput
                label="Email Address"
                placeholder="name@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                }}
                leftIcon="mail"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              {/* Password Input */}
              <AppInput
                label="Password"
                placeholder="Minimum 8 characters"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
                leftIcon="lock"
                isPassword={true}
                error={errors.password}
              />

              {/* Confirm Password Input */}
              <AppInput
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                }}
                leftIcon="key"
                isPassword={true}
                error={errors.confirmPassword}
              />

              {/* Terms and Privacy Policy Agreement */}
              <Pressable
                onPress={() => {
                  setAgreeTerms(!agreeTerms);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: null }));
                }}
                style={styles.agreementRow}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
                  {agreeTerms && (
                    <Ionicons name="checkmark" size={14} color="#171A19" />
                  )}
                </View>
                <AppText variant="secondary" color={Colors.textSecondary} style={styles.agreementText}>
                  I agree to the Terms and Privacy Policy.
                </AppText>
              </Pressable>
              {errors.terms && (
                <AppText variant="caption" color={Colors.danger} style={styles.termsError}>
                  {errors.terms}
                </AppText>
              )}

              {/* Submit Registration Button */}
              <AppButton
                title={isLoading ? "Creating Account..." : "Create Account"}
                variant="primary"
                size="md"
                disabled={!canSubmit}
                loading={isLoading}
                onPress={handleRegister}
                style={styles.submitButton}
              />

              {/* Quick Evaluation Helper */}
              <Pressable onPress={handleQuickFill} style={styles.demoFillButton}>
                <Ionicons name="flash-outline" size={13} color={Colors.secondary} style={styles.flashIcon} />
                <AppText variant="caption" color={Colors.secondary}>
                  Fill Sample Data
                </AppText>
              </Pressable>
            </AppCard>
          </Animated.View>

          {/* Footer Navigation */}
          <Animated.View style={[styles.footerBlock, { opacity: footerFadeAnim }]}>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              hitSlop={10}
              style={styles.loginLink}
            >
              <AppText variant="secondary" color={Colors.textSecondary}>
                Already have an account?{' '}
                <AppText variant="secondary" color={Colors.primary} style={styles.linkBold}>
                  Sign in
                </AppText>
              </AppText>
            </Pressable>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={Colors.textMuted} />
              <AppText variant="caption" color={Colors.textMuted}>
                No spam • Zero clinical prescription decisions • Private storage
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
    marginBottom: Spacing.md,
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
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  agreementText: {
    flex: 1,
    lineHeight: 18,
    fontSize: 12,
  },
  termsError: {
    marginBottom: Spacing.sm,
    marginLeft: 30,
  },
  submitButton: {
    marginTop: Spacing.sm,
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
  loginLink: {
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
