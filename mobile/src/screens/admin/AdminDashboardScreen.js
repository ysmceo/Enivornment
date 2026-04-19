import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';
import { colors, radius, spacing } from '../../theme/tokens';

export default function AdminDashboardScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  }, []);

  const stats = data?.stats || data?.data || {};

  return (
    <ScreenContainer title="Admin Dashboard" subtitle="Platform-level overview and control.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Operational Snapshot</Text>
        <Text style={styles.heroSubtitle}>Real-time moderation and platform health overview.</Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{String(stats?.totalReports ?? '0')}</Text>
            <Text style={styles.heroStatLabel}>Total Reports</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{String(stats?.totalUsers ?? '0')}</Text>
            <Text style={styles.heroStatLabel}>Total Users</Text>
          </View>
        </View>
      </View>

      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiIndigo]}>
          <Text style={styles.kpiLabel}>Pending Reports</Text>
          <Text style={styles.kpiValue}>{String(stats?.pendingReports ?? '0')}</Text>
        </View>

        <View style={[styles.kpiCard, styles.kpiEmerald]}>
          <Text style={styles.kpiLabel}>Resolved Reports</Text>
          <Text style={styles.kpiValue}>{String(stats?.resolvedReports ?? '0')}</Text>
        </View>

        <View style={[styles.kpiCard, styles.kpiAmber]}>
          <Text style={styles.kpiLabel}>Pending ID Verification</Text>
          <Text style={styles.kpiValue}>{String(stats?.pendingVerifications ?? '0')}</Text>
        </View>

        <View style={[styles.kpiCard, styles.kpiRose]}>
          <Text style={styles.kpiLabel}>High-Risk Incidents</Text>
          <Text style={styles.kpiValue}>{String(stats?.highRiskReports ?? '0')}</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#f87171',
  },
  heroCard: {
    backgroundColor: '#1b1530',
    borderWidth: 1,
    borderColor: '#4338ca',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroTitle: {
    color: '#c4b5fd',
    fontWeight: '900',
    fontSize: 18,
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  heroStatsRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroStatItem: {
    flex: 1,
    gap: 2,
  },
  heroStatValue: {
    color: '#e2e8f0',
    fontWeight: '900',
    fontSize: 22,
  },
  heroStatLabel: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '700',
  },
  heroStatDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#4f46e5',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    backgroundColor: colors.surface,
  },
  kpiIndigo: {
    borderColor: '#6366f1',
    backgroundColor: '#1f2340',
  },
  kpiEmerald: {
    borderColor: '#10b981',
    backgroundColor: '#102c25',
  },
  kpiAmber: {
    borderColor: '#f59e0b',
    backgroundColor: '#30230f',
  },
  kpiRose: {
    borderColor: '#f43f5e',
    backgroundColor: '#341822',
  },
  kpiLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  kpiValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
});
