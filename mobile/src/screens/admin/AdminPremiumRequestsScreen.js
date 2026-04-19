import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import { adminService } from '../../services/adminService';
import { colors, radius, spacing } from '../../theme/tokens';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

export default function AdminPremiumRequestsScreen() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [busyRequestId, setBusyRequestId] = useState('');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingRejectRequest, setPendingRejectRequest] = useState(null);

  const { data, loading, error, refetch } = useApiResource(async () => {
    const res = await adminService.getPremiumUpgradeRequests({ limit: 100, status: statusFilter });
    return res.data;
  }, [statusFilter]);

  const requests = data?.requests || [];

  const counts = useMemo(() => {
    const summary = { pending: 0, approved: 0, rejected: 0 };
    requests.forEach((item) => {
      if (summary[item?.status] !== undefined) summary[item.status] += 1;
    });
    return summary;
  }, [requests]);

  const openReceipt = async (request) => {
    const receiptUrl = String(request?.paymentReceiptUrl || '').trim();
    if (!receiptUrl) {
      Alert.alert('Receipt unavailable', 'No payment receipt uploaded for this request.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(receiptUrl);
      if (!supported) {
        Alert.alert('Open failed', 'This device cannot open the receipt link.');
        return;
      }

      await Linking.openURL(receiptUrl);
    } catch {
      Alert.alert('Open failed', 'Unable to open receipt right now.');
    }
  };

  const approveRequest = async (request) => {
    try {
      setBusyRequestId(request._id);
      await adminService.approvePremiumUpgradeRequest({ requestId: request._id });
      await refetch();
      Alert.alert('Approved', 'Premium request approved and user premium access activated.');
    } catch (err) {
      Alert.alert('Approve failed', err?.response?.data?.message || 'Could not approve premium request.');
    } finally {
      setBusyRequestId('');
    }
  };

  const rejectRequest = async (request, reason) => {
    try {
      setBusyRequestId(request._id);
      await adminService.rejectPremiumUpgradeRequest({
        requestId: request._id,
        reason,
      });
      await refetch();
      Alert.alert('Rejected', 'Premium request rejected.');
    } catch (err) {
      Alert.alert('Reject failed', err?.response?.data?.message || 'Could not reject premium request.');
    } finally {
      setBusyRequestId('');
    }
  };

  const confirmApproveRequest = (request) => {
    const userName = request?.userId?.name || request?.userId?.email || 'this user';
    Alert.alert(
      'Approve premium request',
      `Approve premium activation for ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            approveRequest(request).catch(() => {});
          },
        },
      ]
    );
  };

  const confirmRejectRequest = (request) => {
    setPendingRejectRequest(request);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const submitRejectWithReason = () => {
    if (!pendingRejectRequest) return;

    const reason = String(rejectReason || '').trim();
    if (!reason) {
      Alert.alert('Reason required', 'Please provide a rejection reason.');
      return;
    }

    Alert.alert(
      'Confirm rejection',
      'Reject this premium request with the entered reason?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            const request = pendingRejectRequest;
            setRejectModalVisible(false);
            setPendingRejectRequest(null);
            setRejectReason('');
            await rejectRequest(request, reason);
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer title="Premium Requests" subtitle="Verify manual transfer receipts and activate premium users.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryHero}>
        <Text style={styles.summaryHeroTitle}>Premium Verification Queue</Text>
        <Text style={styles.summaryHeroSubtitle}>Review payment evidence and activate trusted premium users.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.summaryCardPending]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={styles.summaryValue}>{counts.pending}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardApproved]}>
          <Text style={styles.summaryLabel}>Approved</Text>
          <Text style={styles.summaryValue}>{counts.approved}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardRejected]}>
          <Text style={styles.summaryLabel}>Rejected</Text>
          <Text style={styles.summaryValue}>{counts.rejected}</Text>
        </View>
      </View>

      <View style={styles.filterWrap}>
        <Text style={styles.filterLabel}>Filter:</Text>
        <View style={styles.filterChips}>
          {STATUS_OPTIONS.map((status) => (
            <AppButton
              key={status}
              title={status[0].toUpperCase() + status.slice(1)}
              variant={statusFilter === status ? 'primary' : 'secondary'}
              onPress={() => setStatusFilter(status)}
            />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listWrap}>
        {requests.length === 0 ? (
          <Text style={styles.emptyText}>No premium requests for this status.</Text>
        ) : (
          requests.map((request, idx) => {
            const isPending = request?.status === 'pending';
            const isBusy = busyRequestId === request?._id;

            return (
              <View key={`${request?._id || idx}`} style={styles.requestCard}>
                <Text style={styles.requestTitle}>{request?.userId?.name || 'Unknown user'}</Text>
                <Text style={styles.requestMeta}>Email: {request?.userId?.email || 'N/A'}</Text>
                <Text style={styles.requestMeta}>Reference: {request?.transferReference || 'N/A'}</Text>
                <Text style={styles.requestMeta}>
                  Amount: {request?.transferAmount ? `₦${Number(request.transferAmount).toLocaleString()}` : 'N/A'}
                </Text>
                <Text style={styles.requestMeta}>
                  Date: {request?.transferDate ? new Date(request.transferDate).toLocaleDateString() : 'N/A'}
                </Text>
                <Text style={styles.requestMeta}>Status: {request?.status || 'unknown'}</Text>
                <Text style={styles.requestMeta}>
                  Submitted: {request?.createdAt ? new Date(request.createdAt).toLocaleString() : 'N/A'}
                </Text>

                {request?.note ? <Text style={styles.requestNote}>Note: {request.note}</Text> : null}

                <AppButton
                  title={request?.paymentReceiptUrl ? 'View Receipt' : 'No Receipt Uploaded'}
                  variant="secondary"
                  disabled={!request?.paymentReceiptUrl}
                  onPress={() => openReceipt(request)}
                />

                {isPending ? (
                  <View style={styles.actionWrap}>
                    <AppButton
                      title={isBusy ? 'Processing...' : 'Approve'}
                      disabled={isBusy}
                      onPress={() => confirmApproveRequest(request)}
                    />
                    <AppButton
                      title={isBusy ? 'Processing...' : 'Reject'}
                      variant="secondary"
                      disabled={isBusy}
                      onPress={() => confirmRejectRequest(request)}
                    />
                  </View>
                ) : (
                  <Text style={styles.reviewedText}>Reviewed {request?.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : ''}</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setRejectModalVisible(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Enter rejection reason</Text>
            <Text style={styles.modalSubtitle}>
              This reason will be sent to the user notification.
            </Text>

            <AppInput
              placeholder="Reason for rejection"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActionWrap}>
              <AppButton title="Cancel" variant="secondary" onPress={() => setRejectModalVisible(false)} />
              <AppButton title="Submit Rejection" onPress={submitRejectWithReason} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: '#f87171',
  },
  summaryHero: {
    backgroundColor: '#1b1530',
    borderWidth: 1,
    borderColor: '#4338ca',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  summaryHeroTitle: {
    color: '#c4b5fd',
    fontWeight: '900',
    fontSize: 17,
  },
  summaryHeroSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  summaryCardPending: {
    borderColor: '#f59e0b',
    backgroundColor: '#30230f',
  },
  summaryCardApproved: {
    borderColor: '#10b981',
    backgroundColor: '#102c25',
  },
  summaryCardRejected: {
    borderColor: '#f43f5e',
    backgroundColor: '#341822',
  },
  summaryLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
  },
  filterWrap: {
    gap: spacing.xs,
  },
  filterLabel: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  filterChips: {
    gap: spacing.xs,
  },
  listWrap: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  requestTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  requestMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  requestNote: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionWrap: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  reviewedText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  modalActionWrap: {
    gap: spacing.xs,
  },
});
