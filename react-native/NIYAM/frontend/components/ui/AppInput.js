import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { Typography } from '../../constants/typography';
import AppText from './AppText';

// Map shorthand string names to Ionicons glyphs
const ICON_MAP = {
  mail: 'mail-outline',
  email: 'mail-outline',
  lock: 'lock-closed-outline',
  password: 'lock-closed-outline',
  person: 'person-outline',
  user: 'person-outline',
  key: 'key-outline',
};

// Reusable text input component featuring vector icons, focus states, and password toggles.
export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  isPassword = false,
  leftIcon,
  trailingAction,
  style,
  inputStyle,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const shouldHideText = isPassword ? !isPasswordVisible : secureTextEntry;

  // Resolve left icon name or render directly if React element
  const renderLeftIcon = () => {
    if (!leftIcon) return null;

    if (typeof leftIcon === 'string' && ICON_MAP[leftIcon]) {
      return (
        <View style={styles.leftIconContainer}>
          <Ionicons
            name={ICON_MAP[leftIcon]}
            size={18}
            color={isFocused ? Colors.primary : Colors.textMuted}
          />
        </View>
      );
    }

    if (typeof leftIcon === 'string') {
      return (
        <View style={styles.leftIconContainer}>
          <Ionicons
            name={leftIcon}
            size={18}
            color={isFocused ? Colors.primary : Colors.textMuted}
          />
        </View>
      );
    }

    return <View style={styles.leftIconContainer}>{leftIcon}</View>;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Input Label */}
      {label && (
        <AppText variant="secondary" color={Colors.textSecondary} style={styles.label}>
          {label}
        </AppText>
      )}

      {/* Input Field Container */}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}
      >
        {/* Left Vector Icon */}
        {renderLeftIcon()}

        {/* Text Input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={shouldHideText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.textInput, inputStyle]}
          {...props}
        />

        {/* Show/Hide Password Vector Icon Toggle */}
        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            hitSlop={10}
            style={styles.eyeButton}
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </Pressable>
        )}

        {/* Optional Custom Trailing Action */}
        {!isPassword && trailingAction && (
          <View style={styles.trailingContainer}>{trailingAction}</View>
        )}
      </View>

      {/* Error Message */}
      {error ? (
        <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xxs,
    fontWeight: Typography.weight.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#262C29',
  },
  inputWrapperError: {
    borderColor: Colors.danger,
  },
  leftIconContainer: {
    marginRight: Spacing.xs,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: Spacing.xxs,
    marginLeft: Spacing.xs,
  },
  trailingContainer: {
    marginLeft: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 4,
    marginLeft: 2,
  },
});
