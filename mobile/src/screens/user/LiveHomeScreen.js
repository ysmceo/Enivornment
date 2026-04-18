import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function LiveHomeScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/streams');
    return res.data;
  }, []);

  const streams = data?.streams || data?.data || [];

  return (
    <ScreenContainer title="Live Streams" subtitle="Join citizen live reporting sessions.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      {streams.slice(0, 10).map((stream, index) => (
        <Text key={`${stream?._id || index}`} style={{ color: '#e2e8f0', marginBottom: 8 }}>
          • {stream?.title || 'Live incident'} ({stream?.status || 'active'})
        </Text>
      ))}
      {!loading && streams.length === 0 ? <Text style={{ color: '#94a3b8' }}>No active streams right now.</Text> : null}
    </ScreenContainer>
  );
}
