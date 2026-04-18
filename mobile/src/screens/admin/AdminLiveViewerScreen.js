import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function AdminLiveViewerScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/streams');
    return res.data;
  }, []);

  const streams = data?.streams || data?.data || [];

  return (
    <ScreenContainer title="Admin Live Viewer" subtitle="Monitor all active livestream incidents.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      {streams.slice(0, 20).map((stream, idx) => (
        <Text key={`${stream?._id || idx}`} style={{ color: '#e2e8f0', marginBottom: 8 }}>
          • {stream?.title || 'Live incident'} — {stream?.status || 'active'}
        </Text>
      ))}
    </ScreenContainer>
  );
}
