import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function FeatureCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  label: { color: colors.textMuted, marginBottom: 6, fontSize: typography.caption, textTransform: 'uppercase', letterSpacing: 0.8 },
  value: { color: colors.textPrimary, fontWeight: '800', fontSize: typography.body },
});
