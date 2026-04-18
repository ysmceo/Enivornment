import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import FeatureCard from '../../components/FeatureCard';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function CrimeAnalyticsScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/reports/map-summary');
    return res.data;
  }, []);

  const summary = data?.summary || data?.data || {};

  return (
    <ScreenContainer title="Crime Analytics" subtitle="Map-summary insight mirrored from website analytics.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      <FeatureCard label="Total reports" value={String(summary?.totalReports ?? '-')} />
      <FeatureCard label="High risk" value={String(summary?.highRiskCount ?? '-')} />
    </ScreenContainer>
  );
}
