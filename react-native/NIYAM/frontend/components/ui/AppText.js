import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

// Reusable text component ensuring consistent typography across the app.
export default function AppText({
  variant = 'body',
  color,
  style,
  children,
  ...props
}) {
  const variantStyle = styles[variant] || styles.body;
  const customColorStyle = color ? { color } : null;

  return (
    <Text style={[variantStyle, customColorStyle, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Big brand display title
  display: {
    fontSize: Typography.size.display,
    lineHeight: Typography.lineHeight.display,
    fontWeight: Typography.weight.heavy,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wide,
  },
  // Main screen heading
  h1: {
    fontSize: Typography.size.xxl,
    lineHeight: Typography.lineHeight.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.normal,
  },
  // Section heading
  h2: {
    fontSize: Typography.size.xl,
    lineHeight: Typography.lineHeight.xl,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  // Card / Subsection heading
  h3: {
    fontSize: Typography.size.lg,
    lineHeight: Typography.lineHeight.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.textPrimary,
  },
  // Standard readable body text
  body: {
    fontSize: Typography.size.base,
    lineHeight: Typography.lineHeight.base,
    fontWeight: Typography.weight.regular,
    color: Colors.textPrimary,
  },
  // Secondary / subtle body text
  secondary: {
    fontSize: Typography.size.sm,
    lineHeight: Typography.lineHeight.sm,
    fontWeight: Typography.weight.regular,
    color: Colors.textSecondary,
  },
  // Small caption / timestamp text
  caption: {
    fontSize: Typography.size.xs,
    lineHeight: Typography.lineHeight.xs,
    fontWeight: Typography.weight.regular,
    color: Colors.textMuted,
  },
  // Small pill or category label
  label: {
    fontSize: Typography.size.xs,
    lineHeight: Typography.lineHeight.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
});
