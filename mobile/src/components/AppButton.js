import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export default function AppButton({ title, onPress, disabled = false, variant = 'primary' }) {
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isSecondary ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isSecondary ? styles.secondaryLabel : styles.primaryLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  primaryLabel: {
    color: '#09090b',
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
