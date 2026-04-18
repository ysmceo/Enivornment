import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function AdminVerificationScreen() {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/admin/users');
    return res.data;
  }, []);

  const users = (data?.users || data?.data || []).filter((u) => u?.idVerificationStatus !== 'verified');

  return (
    <ScreenContainer title="Admin Verification" subtitle="Review and verify submitted government IDs.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      {users.slice(0, 25).map((user, idx) => (
        <Text key={`${user?._id || idx}`} style={{ color: '#e2e8f0', marginBottom: 8 }}>
          • {user?.name || user?.email || 'User'} — {user?.idVerificationStatus || 'pending'}
        </Text>
      ))}
    </ScreenContainer>
  );
}
