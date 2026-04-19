import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { colors, radius, spacing } from '../../theme/tokens';

const getAgeFromDate = (dateInput) => {
  if (!dateInput) return null;
  const dob = new Date(dateInput);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
};

const isAdultAccount = (user) => {
  if (user?.role === 'admin') return true;
  const age = getAgeFromDate(user?.dateOfBirth);
  if (typeof age === 'number') return age >= 18;
  return user?.isAdult !== false;
};

export default function LiveHomeScreen() {
  const { user } = useAuth();
  const isMinorAccount = user?.role !== 'admin' && !isAdultAccount(user);
  const resolvedAge = getAgeFromDate(user?.dateOfBirth);

  const { data, loading, error } = useApiResource(async () => {
    if (isMinorAccount) {
      return { streams: [] };
    }

    const res = await api.get('/streams');
    return res.data;
  }, [isMinorAccount]);

  const streams = data?.streams || data?.data || [];
  const subtitle = isMinorAccount
    ? 'Live video is available only to adult (18+) accounts. You will unlock access automatically at 18.'
    : 'Join citizen live reporting sessions.';

  return (
    <ScreenContainer title="Live Streams" subtitle={subtitle}>
      <View style={[styles.statusCard, isMinorAccount ? styles.minorCard : styles.adultCard]}>
        <Text style={styles.statusTitle}>{isMinorAccount ? 'Live access restricted (Minor Account)' : 'Live access enabled'}</Text>
        <Text style={styles.statusText}>
          {isMinorAccount
            ? typeof resolvedAge === 'number'
              ? `Current age: ${resolvedAge}. Live features unlock automatically when you turn 18.`
              : 'We could not verify your age from date of birth. Live remains restricted until account age resolves to 18+.'
            : 'You can view active streams. Live start/join options are available for eligible adult accounts.'}
        </Text>
      </View>

      {isMinorAccount ? null : (
        <>
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      {streams.slice(0, 10).map((stream, index) => (
        <Text key={`${stream?._id || index}`} style={{ color: '#e2e8f0', marginBottom: 8 }}>
          • {stream?.title || 'Live incident'} ({stream?.status || 'active'})
        </Text>
      ))}
      {!loading && streams.length === 0 ? <Text style={{ color: '#94a3b8' }}>No active streams right now.</Text> : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  minorCard: {
    borderColor: '#b45309',
    backgroundColor: '#3f2508',
  },
  adultCard: {
    borderColor: '#0f766e',
    backgroundColor: '#0f2f2c',
  },
  statusTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  statusText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
