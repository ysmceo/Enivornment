import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function StartupSplash({ loading = false }) {
  return (
    <View style={styles.root}>
      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>VOV</Text>
        </View>
        <Text style={styles.brand}>VOV CRIME</Text>
        <Text style={styles.tagline}>VOICE OF THE VOICELESS</Text>
      </View>

      {loading ? <ActivityIndicator color={colors.brandSoft} size="large" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    color: '#1a1208',
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 1,
  },
  brand: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 30,
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 6,
    color: colors.brandSoft,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
});
