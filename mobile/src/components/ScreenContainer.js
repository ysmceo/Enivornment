import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function ScreenContainer({ title, subtitle, children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.brandPill}>
          <Text style={styles.brandText}>VOV CRIME</Text>
        </View>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  brandPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#201508',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  brandText: {
    color: colors.brandSoft,
    fontWeight: '800',
    fontSize: typography.caption,
    letterSpacing: 0.8,
  },
  header: { marginBottom: 4 },
  title: { color: colors.textPrimary, fontWeight: '900', fontSize: typography.h1 },
  subtitle: { color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
});
