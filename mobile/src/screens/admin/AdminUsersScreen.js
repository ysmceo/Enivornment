import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import { adminService } from '../../services/adminService';
import { colors, radius, spacing } from '../../theme/tokens';

const STATUS_LABELS = {
  none: 'Not submitted',
  pending: 'Pending review',
  verified: 'Verified',
  rejected: 'Rejected',
};

const getVerificationLabel = (status) => STATUS_LABELS[status] || status || 'Unknown';

export default function AdminUsersScreen() {
  const [busyUserId, setBusyUserId] = useState('');

  const { data, loading, error, refetch } = useApiResource(async () => {
    const res = await adminService.getUsers({ limit: 25 });
    return res.data;
  }, []);

  const users = data?.users || data?.data || [];
  const summary = useMemo(() => {
    const stats = { active: 0, disabled: 0, pendingVerification: 0 };
    users.forEach((user) => {
      if (user?.isActive === false) stats.disabled += 1;
      else stats.active += 1;
      if (user?.idVerificationStatus === 'pending') stats.pendingVerification += 1;
    });
    return stats;
  }, [users]);

  const runAction = async (userId, actionFn, successMessage) => {
    try {
      setBusyUserId(userId);
      await actionFn();
      await refetch();
      Alert.alert('Success', successMessage);
    } catch (err) {
      Alert.alert('Action failed', err?.response?.data?.message || 'Unable to complete action.');
    } finally {
      setBusyUserId('');
    }
  };

  const toggleAccountStatus = (user) => {
    const name = user?.name || user?.email || 'this user';
    const isDisabled = user?.isActive === false;
    Alert.alert(
      isDisabled ? 'Activate account' : 'Deactivate account',
      `${isDisabled ? 'Activate' : 'Deactivate'} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isDisabled ? 'Activate' : 'Deactivate',
          onPress: () =>
            runAction(
              user._id,
              () => adminService.toggleUserStatus(user._id),
              `${name} has been ${isDisabled ? 'activated' : 'deactivated'}.`
            ),
        },
      ]
    );
  };

  const approveVerification = (user) => {
    const name = user?.name || user?.email || 'this user';
    runAction(
      user._id,
      () => adminService.reviewGovernmentId({ userId: user._id, action: 'approve' }),
      `${name} verification approved.`
    );
  };

  const rejectVerification = (user) => {
    const name = user?.name || user?.email || 'this user';
    runAction(
      user._id,
      () => adminService.reviewGovernmentId({ userId: user._id, action: 'reject', rejectionReason: 'Rejected by admin (mobile review).' }),
      `${name} verification rejected.`
    );
  };

  return (
    <ScreenContainer title="Admin Users" subtitle="Manage user access and account status.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Active: {summary.active}</Text>
        <Text style={styles.summaryText}>Disabled: {summary.disabled}</Text>
        <Text style={styles.summaryText}>Pending verification: {summary.pendingVerification}</Text>
      </View>

      {users.slice(0, 25).map((user, idx) => {
        const isBusy = busyUserId === user?._id;
        const isDisabled = user?.isActive === false;
        const verificationStatus = user?.idVerificationStatus || 'none';

        return (
          <View key={`${user?._id || idx}`} style={styles.userCard}>
            <Text style={styles.userTitle}>{user?.name || user?.email || 'User'}</Text>
            <Text style={styles.userMeta}>Email: {user?.email || 'N/A'}</Text>
            <Text style={styles.userMeta}>Role: {user?.role || 'user'}</Text>
            <Text style={styles.userMeta}>Status: {isDisabled ? 'Disabled' : 'Active'}</Text>
            <Text style={styles.userMeta}>Verification: {getVerificationLabel(verificationStatus)}</Text>

            <View style={styles.actionsWrap}>
              <AppButton
                title={isBusy ? 'Saving…' : isDisabled ? 'Activate User' : 'Deactivate User'}
                variant="secondary"
                disabled={isBusy || user?.role === 'admin'}
                onPress={() => toggleAccountStatus(user)}
              />

              {verificationStatus !== 'verified' && (
                <AppButton
                  title={isBusy ? 'Saving…' : 'Approve Verification'}
                  disabled={isBusy}
                  onPress={() => approveVerification(user)}
                />
              )}

              {verificationStatus === 'pending' && (
                <AppButton
                  title={isBusy ? 'Saving…' : 'Reject Verification'}
                  variant="secondary"
                  disabled={isBusy}
                  onPress={() => rejectVerification(user)}
                />
              )}
            </View>
          </View>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#f87171',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  summaryText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  userCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  userTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  userMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  actionsWrap: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
});
