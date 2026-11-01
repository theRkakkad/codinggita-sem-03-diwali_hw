import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';

// Reusable card container with surface foundation and soft borders.
export default function AppCard({
  children,
  variant = 'default', // 'default' | 'secondary' | 'flat'
  style,
  ...props
}) {
  const cardStyle = [
    styles.card,
    variant === 'default' && styles.defaultCard,
    variant === 'secondary' && styles.secondaryCard,
    variant === 'flat' && styles.flatCard,
    style,
  ];

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.cardPadding,
  },
  defaultCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flatCard: {
    backgroundColor: Colors.surface,
    borderWidth: 0,
  },
});
