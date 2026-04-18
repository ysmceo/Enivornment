import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EmergencyDirectoryScreen() {
  const { isAdmin } = useAuth();
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/emergency-contacts');
    return res.data;
  }, []);

  const contacts = data?.contacts || data?.data || [];

  return (
    <ScreenContainer title="Emergency Directory" subtitle="Nearby emergency agencies and numbers.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      {contacts.slice(0, 15).map((contact, index) => (
        <Text key={`${contact?._id || index}`} style={{ color: '#e2e8f0', marginBottom: 8 }}>
          • {contact?.name || 'Agency'} — {isAdmin ? (contact?.phone || contact?.phonePrimary || 'N/A') : 'Admin-only'}
        </Text>
      ))}
    </ScreenContainer>
  );
}
