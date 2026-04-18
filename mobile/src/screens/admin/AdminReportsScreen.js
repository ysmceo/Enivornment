import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function AdminReportsScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/admin/reports');
    return res.data;
  }, []);

  const reports = data?.reports || data?.data || [];

  return (
    <ScreenContainer title="Admin Reports" subtitle="Moderate and process incoming reports.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      {reports.slice(0, 25).map((report, idx) => (
        <Text key={`${report?._id || idx}`} style={{ color: '#e2e8f0', marginBottom: 8 }}>
          • {report?.title || 'Untitled'} — {report?.status || 'pending'}
        </Text>
      ))}
    </ScreenContainer>
  );
}
