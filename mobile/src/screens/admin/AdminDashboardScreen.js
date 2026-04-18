import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import FeatureCard from '../../components/FeatureCard';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function AdminDashboardScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  }, []);

  const stats = data?.stats || data?.data || {};

  return (
    <ScreenContainer title="Admin Dashboard" subtitle="Platform-level overview and control.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      <FeatureCard label="Total reports" value={String(stats?.totalReports ?? '-')} />
      <FeatureCard label="Pending reports" value={String(stats?.pendingReports ?? '-')} />
      <FeatureCard label="Total users" value={String(stats?.totalUsers ?? '-')} />
    </ScreenContainer>
  );
}
