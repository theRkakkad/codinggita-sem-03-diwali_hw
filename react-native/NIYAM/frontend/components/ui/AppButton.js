import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';

// Reusable button component providing consistent dimensions and tactile feedback.
export default function AppButton({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'secondary' | 'outline'
  size = 'md',          // 'md' | 'sm'
  disabled = false,
  loading = false,
  style,
  textStyle,
}) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  // Base container styles depending on variant and size
  const containerStyles = [
    styles.button,
    size === 'sm' ? styles.sizeSm : styles.sizeMd,
    isPrimary && styles.primaryButton,
    isSecondary && styles.secondaryButton,
    isOutline && styles.outlineButton,
    disabled && styles.disabledButton,
    style,
  ];

  // Text styles depending on variant
  const textStyles = [
    styles.text,
    size === 'sm' ? styles.textSm : styles.textMd,
    isPrimary && styles.primaryText,
    isSecondary && styles.secondaryText,
    isOutline && styles.outlineText,
    disabled && styles.disabledText,
    textStyle,
  ];

  const spinnerColor = isPrimary ? Colors.background : Colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        containerStyles,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.buttonPaddingHorizontal,
  },
  sizeMd: {
    height: Spacing.buttonHeight,
  },
  sizeSm: {
    height: Spacing.buttonHeightSmall,
    paddingHorizontal: Spacing.sm,
  },
  // Variant styles
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  disabledButton: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  // Typography inside buttons
  text: {
    fontWeight: Typography.weight.semibold,
    textAlign: 'center',
  },
  textMd: {
    fontSize: Typography.size.base,
  },
  textSm: {
    fontSize: Typography.size.sm,
  },
  primaryText: {
    color: '#171A19', // Deep dark text on bright Amber button for high contrast
  },
  secondaryText: {
    color: Colors.textPrimary,
  },
  outlineText: {
    color: Colors.primary,
  },
  disabledText: {
    color: Colors.textMuted,
  },
});
