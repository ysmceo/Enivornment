import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import { adminService } from '../../services/adminService';
import { colors, radius, spacing } from '../../theme/tokens';

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  investigating: 'Under Investigation',
  verified: 'Verified',
  solved: 'Solved',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
};

const getStatusLabel = (status) => STATUS_LABELS[status] || status || 'Unknown';

export default function AdminReportsScreen() {
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const { data, loading, error, refetch } = useApiResource(async () => {
    const res = await adminService.getReports({ limit: 25 });
    return res.data;
  }, []);

  const reports = data?.reports || data?.data || [];
  const summary = useMemo(() => {
    const stats = { pending: 0, underReview: 0, solved: 0 };
    reports.forEach((report) => {
      if (report.status === 'pending') stats.pending += 1;
      if (['under_review', 'investigating', 'in_progress'].includes(report.status)) stats.underReview += 1;
      if (['solved', 'resolved', 'closed'].includes(report.status)) stats.solved += 1;
    });
    return stats;
  }, [reports]);

  const updateStatus = async (report, status, adminNotes, extra = {}) => {
    try {
      setActionLoadingId(report._id);
      await adminService.updateReportStatus({
        reportId: report._id,
        status,
        adminNotes,
        ...extra,
      });
      await refetch();
      Alert.alert('Success', `Case ${report.caseId || report._id} moved to ${getStatusLabel(status)}.`);
    } catch (err) {
      Alert.alert('Update failed', err?.response?.data?.message || 'Unable to update report status.');
    } finally {
      setActionLoadingId('');
    }
  };

  const confirmDeleteReport = (report) => {
    Alert.alert(
      'Delete report',
      `Delete case ${report.caseId || report._id}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(report._id);
              await adminService.deleteReport(report._id);
              await refetch();
              Alert.alert('Deleted', 'Report deleted successfully.');
            } catch (err) {
              Alert.alert('Delete failed', err?.response?.data?.message || 'Unable to delete report.');
            } finally {
              setDeletingId('');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer title="Admin Reports" subtitle="Moderate and process incoming reports.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>Pending: {summary.pending}</Text>
        <Text style={styles.summaryText}>In review: {summary.underReview}</Text>
        <Text style={styles.summaryText}>Solved: {summary.solved}</Text>
      </View>

      {reports.slice(0, 25).map((report, idx) => {
        const isActionBusy = actionLoadingId === report._id;
        const isDeleting = deletingId === report._id;

        return (
          <View key={`${report?._id || idx}`} style={styles.reportCard}>
            <Text style={styles.reportTitle}>{report?.title || 'Untitled'}</Text>
            <Text style={styles.reportMeta}>Case: {report?.caseId || 'N/A'}</Text>
            <Text style={styles.reportMeta}>Reporter: {report?.submittedBy?.name || report?.submittedBy?.email || 'Unknown'}</Text>
            <Text style={styles.reportMeta}>Status: {getStatusLabel(report?.status)}</Text>
            <Text style={styles.reportMeta}>Priority: {report?.priority || 'medium'}</Text>

            <View style={styles.actionsGrid}>
              <AppButton
                title={isActionBusy ? 'Updating…' : 'Start Review'}
                variant="secondary"
                disabled={isActionBusy || isDeleting}
                onPress={() => updateStatus(report, 'under_review', 'Moved to under review via mobile admin app')}
              />
              <AppButton
                title={isActionBusy ? 'Updating…' : 'Investigating'}
                variant="secondary"
                disabled={isActionBusy || isDeleting}
                onPress={() => updateStatus(report, 'investigating', 'Moved to investigation via mobile admin app', { priority: 'high' })}
              />
              <AppButton
                title={isActionBusy ? 'Updating…' : 'Resolve'}
                disabled={isActionBusy || isDeleting}
                onPress={() => updateStatus(report, 'solved', 'Case resolved by admin via mobile app')}
              />
              <AppButton
                title={isActionBusy ? 'Updating…' : 'Reject'}
                variant="secondary"
                disabled={isActionBusy || isDeleting}
                onPress={() => updateStatus(report, 'rejected', 'Report rejected by admin via mobile app', { rejectionReason: 'Insufficient actionable evidence' })}
              />
              <AppButton
                title={isDeleting ? 'Deleting…' : 'Delete Report'}
                variant="secondary"
                disabled={isActionBusy || isDeleting}
                onPress={() => confirmDeleteReport(report)}
              />
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
  reportCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  reportTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  reportMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  actionsGrid: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
});
