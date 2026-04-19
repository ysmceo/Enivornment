import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export default function AppInput(props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
});
