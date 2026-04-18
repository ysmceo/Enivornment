import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import FeatureCard from '../../components/FeatureCard';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function CitizenDashboardScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/reports/my');
    return res.data;
  }, []);

  return (
    <ScreenContainer title="Citizen Dashboard" subtitle="Your reports and account activity.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      <FeatureCard label="Total reports" value={String(data?.count || data?.reports?.length || 0)} />
      <FeatureCard label="Recent status" value={data?.reports?.[0]?.status || 'No reports yet'} />
    </ScreenContainer>
  );
}
