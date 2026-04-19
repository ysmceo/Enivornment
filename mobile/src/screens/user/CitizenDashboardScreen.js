import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
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

const NIGERIA_STATES = [
  'FCT', 'Lagos', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Anambra', 'Edo', 'Enugu', 'Abia',
];

const CATEGORY_OPTIONS = [
  'crime',
  'assault',
  'fraud',
  'harassment',
  'domestic_violence',
  'environmental_hazard',
  'infrastructure_failure',
  'disaster',
  'human_safety',
  'unsafe_condition',
  'human_wellbeing',
  'other',
];

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

const getNowDateParts = () => {
  const now = new Date();
  return {
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
  };
};

const INITIAL_FORM = {
  title: '',
  description: '',
  incidentDateOnly: getNowDateParts().date,
  incidentTime: getNowDateParts().time,
  category: 'other',
  severity: 'medium',
  state: 'FCT',
  address: '',
  lat: '',
  lng: '',
};

export default function CitizenDashboardScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [trackingCaseId, setTrackingCaseId] = useState('');
  const [trackingEmail, setTrackingEmail] = useState(user?.email || '');
  const [trackedCase, setTrackedCase] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState('state');
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerQueries, setPickerQueries] = useState({ state: '', category: '' });
  const [premiumRequest, setPremiumRequest] = useState(null);
  const [premiumStatusLoading, setPremiumStatusLoading] = useState(false);
  const [premiumSubmitting, setPremiumSubmitting] = useState(false);
  const [premiumForm, setPremiumForm] = useState({
    transferReference: '',
    transferAmount: '',
    transferDate: getNowDateParts().date,
    senderName: '',
    note: '',
    paymentReceipt: null,
  });

  const { data, loading, error, refetch } = useApiResource(async () => {
    const res = await reportService.getMyReports({ limit: 20 });
    return res.data;
  }, []);

  const reports = data?.reports || [];
  const statusSummary = useMemo(() => {
    const summary = { pending: 0, in_progress: 0, solved: 0 };
    reports.forEach((report) => {
      if (report.status === 'pending') {
        summary.pending += 1;
        return;
      }

      if (['in_progress', 'under_review', 'investigating'].includes(report.status)) {
        summary.in_progress += 1;
        return;
      }

      if (['solved', 'resolved', 'closed'].includes(report.status)) {
        summary.solved += 1;
      }
    });
    return summary;
  }, [reports]);
  const hasPremiumAccess = user?.role === 'admin'
    || user?.premiumPlanActive === true
    || user?.premiumPlanStatus === 'active'
    || user?.currentPlan === 'premium';
  const hasUploadedPremiumReceipt = Boolean(premiumRequest?.paymentReceiptUrl);

  const loadPremiumStatus = async () => {
    try {
      setPremiumStatusLoading(true);
      const { data: premiumData } = await authService.getPremiumRequestStatus();
      setPremiumRequest(premiumData?.request || null);
    } catch {
      setPremiumRequest(null);
    } finally {
      setPremiumStatusLoading(false);
    }
  };

  useEffect(() => {
    loadPremiumStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickerOptions = useMemo(() => {
    const source = pickerType === 'category' ? CATEGORY_OPTIONS : NIGERIA_STATES;
    const query = String(pickerQuery || '').trim().toLowerCase();
    if (!query) return source;

    return source.filter((item) => String(item).toLowerCase().includes(query));
  }, [pickerQuery, pickerType]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickEvidenceFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const selected = Array.isArray(result.assets) ? result.assets.slice(0, 10) : [];
      setEvidenceFiles(selected);
    } catch {
      Alert.alert('Evidence selection', 'Unable to open file picker right now.');
    }
  };

  const submitReport = async () => {
    const title = String(form.title || '').trim();
    const description = String(form.description || '').trim();
    const address = String(form.address || '').trim();
    const incidentDateInput = `${String(form.incidentDateOnly || '').trim()}T${String(form.incidentTime || '').trim()}`;
    const incidentDate = new Date(incidentDateInput);

    if (!title || !description || !address) {
      Alert.alert('Missing details', 'Title, description, and address are required.');
      return;
    }

    if (description.length < 20) {
      Alert.alert('Description too short', 'Description must be at least 20 characters.');
      return;
    }

    if (Number.isNaN(incidentDate.getTime())) {
      Alert.alert('Invalid incident time', 'Use date format YYYY-MM-DD and time format HH:mm.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await reportService.createReport({
        ...form,
        incidentDate: incidentDate.toISOString(),
        reporterFullName: user?.name,
        reporterPhone: user?.phone,
        reporterEmail: user?.email,
        evidenceFiles,
      });

      const caseId = response?.data?.caseId || response?.data?.report?.caseId || '';
      Alert.alert('Report submitted', caseId ? `Case ID: ${caseId}` : 'Your report was submitted successfully.');

      setForm((prev) => ({
        ...INITIAL_FORM,
        state: prev.state || 'FCT',
        category: prev.category || 'other',
        severity: prev.severity || 'medium',
      }));
      setEvidenceFiles([]);
      await refetch();
    } catch (err) {
      Alert.alert('Submit failed', err?.response?.data?.message || 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const trackCase = async () => {
    const caseId = String(trackingCaseId || '').trim().toUpperCase();
    const email = String(trackingEmail || '').trim().toLowerCase();

    if (!caseId || !email) {
      Alert.alert('Missing tracking details', 'Please enter case ID and email.');
      return;
    }

    try {
      setTrackingLoading(true);
      const { data: tracked } = await reportService.trackCaseWithEmail({ caseId, email });
      setTrackedCase(tracked?.report || null);
    } catch (err) {
      setTrackedCase(null);
      Alert.alert('Track failed', err?.response?.data?.message || 'Unable to find this case.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const openPicker = (type) => {
    setPickerType(type);
    setPickerQuery(pickerQueries[type] || '');
    setPickerVisible(true);
  };

  const selectPickerValue = (value) => {
    if (pickerType === 'category') {
      setField('category', value);
    } else {
      setField('state', value);
    }
    setPickerVisible(false);
  };

  const copyTrackedCaseId = async () => {
    const caseId = trackedCase?.caseId;
    if (!caseId) {
      Alert.alert('Copy Case ID', 'No tracked case ID available yet.');
      return;
    }

    try {
      await Clipboard.setStringAsync(caseId);
      Alert.alert('Copied', `Case ID ${caseId} copied to clipboard.`);
    } catch {
      Alert.alert('Copy failed', 'Unable to copy case ID right now.');
    }
  };

  const openPremiumReceipt = async () => {
    const receiptUrl = String(premiumRequest?.paymentReceiptUrl || '').trim();
    if (!receiptUrl) {
      Alert.alert('Receipt unavailable', 'No uploaded premium receipt found yet.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(receiptUrl);
      if (!supported) {
        Alert.alert('Open receipt failed', 'This device cannot open the receipt link.');
        return;
      }

      await Linking.openURL(receiptUrl);
    } catch {
      Alert.alert('Open receipt failed', 'Unable to open the uploaded receipt right now.');
    }
  };

  const setPremiumField = (key, value) => {
    setPremiumForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickPremiumReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const selected = Array.isArray(result.assets) ? result.assets[0] : null;
      if (!selected) return;

      setPremiumField('paymentReceipt', selected);
      Alert.alert('Receipt selected', selected.name || 'Receipt file selected successfully.');
    } catch {
      Alert.alert('Receipt selection', 'Unable to open receipt picker right now.');
    }
  };

  const submitPremiumRequest = async () => {
    if (hasPremiumAccess) {
      Alert.alert('Premium active', 'Premium access is already active on this account.');
      return;
    }

    const transferReference = String(premiumForm.transferReference || '').trim();
    if (!transferReference) {
      Alert.alert('Missing transfer reference', 'Please enter your transfer reference.');
      return;
    }

    if (!premiumForm.paymentReceipt) {
      Alert.alert('Missing receipt', 'Please upload your payment receipt before submitting.');
      return;
    }

    try {
      setPremiumSubmitting(true);
      await authService.requestPremiumUpgrade({
        transferReference,
        transferAmount: premiumForm.transferAmount ? Number(premiumForm.transferAmount) : undefined,
        transferDate: String(premiumForm.transferDate || '').trim() || undefined,
        senderName: String(premiumForm.senderName || '').trim() || undefined,
        note: String(premiumForm.note || '').trim() || undefined,
        paymentReceipt: premiumForm.paymentReceipt,
      });

      Alert.alert('Premium request submitted', 'Your receipt and transfer details were submitted for admin verification.');
      setPremiumForm({
        transferReference: '',
        transferAmount: '',
        transferDate: getNowDateParts().date,
        senderName: '',
        note: '',
        paymentReceipt: null,
      });
      await loadPremiumStatus();
    } catch (err) {
      Alert.alert('Submission failed', err?.response?.data?.message || 'Unable to submit premium request.');
    } finally {
      setPremiumSubmitting(false);
    }
  };

  return (
    <ScreenContainer title="Citizen Dashboard" subtitle="Your reports and account activity.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Welcome back, {user?.name || 'Citizen'}</Text>
        <Text style={styles.heroSubtitle}>Track incidents, upload evidence, and monitor case progress in one place.</Text>
      </View>

      <View style={styles.kpiGrid}>
        <View style={[styles.kpiCard, styles.kpiIndigo]}>
          <Text style={styles.kpiLabel}>Total Reports</Text>
          <Text style={styles.kpiValue}>{String(reports.length)}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiAmber]}>
          <Text style={styles.kpiLabel}>Pending</Text>
          <Text style={styles.kpiValue}>{String(statusSummary.pending)}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiSky]}>
          <Text style={styles.kpiLabel}>In Progress</Text>
          <Text style={styles.kpiValue}>{String(statusSummary.in_progress)}</Text>
        </View>
        <View style={[styles.kpiCard, styles.kpiEmerald]}>
          <Text style={styles.kpiLabel}>Solved</Text>
          <Text style={styles.kpiValue}>{String(statusSummary.solved)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription Plan</Text>
        <Text style={styles.planText}>
          Current plan: <Text style={styles.planValue}>{user?.currentPlan || 'free'}</Text>
          {'  ·  '}
          Premium status: <Text style={styles.planValue}>{user?.premiumPlanStatus || 'none'}</Text>
        </Text>

        {hasPremiumAccess ? (
          <Text style={styles.premiumActive}>✅ Premium access is active.</Text>
        ) : null}

        {premiumStatusLoading ? <ActivityIndicator color="#22d3ee" /> : null}

        {premiumRequest ? (
          <View style={styles.receiptRow}>
            <View style={[styles.receiptBadge, hasUploadedPremiumReceipt ? styles.receiptBadgeSuccess : styles.receiptBadgeWarning]}>
              <Text style={[styles.receiptBadgeText, hasUploadedPremiumReceipt ? styles.receiptBadgeTextSuccess : styles.receiptBadgeTextWarning]}>
                {hasUploadedPremiumReceipt ? '✅ Receipt uploaded successfully' : '⚠️ Receipt not uploaded'}
              </Text>
            </View>

            {hasUploadedPremiumReceipt ? (
              <AppButton title="View Uploaded Receipt" variant="secondary" onPress={openPremiumReceipt} />
            ) : null}
          </View>
        ) : null}

        {!hasPremiumAccess ? (
          <View style={styles.premiumFormWrap}>
            <Text style={styles.sectionLabel}>Submit Premium Payment Details</Text>
            <AppInput
              placeholder="Transfer Reference *"
              value={premiumForm.transferReference}
              onChangeText={(value) => setPremiumField('transferReference', value)}
            />
            <AppInput
              placeholder="Amount Transferred (NGN)"
              value={premiumForm.transferAmount}
              onChangeText={(value) => setPremiumField('transferAmount', value)}
              keyboardType="numeric"
            />
            <AppInput
              placeholder="Transfer Date (YYYY-MM-DD)"
              value={premiumForm.transferDate}
              onChangeText={(value) => setPremiumField('transferDate', value)}
              autoCapitalize="none"
            />
            <AppInput
              placeholder="Sender Name"
              value={premiumForm.senderName}
              onChangeText={(value) => setPremiumField('senderName', value)}
            />
            <AppInput
              placeholder="Note (optional)"
              value={premiumForm.note}
              onChangeText={(value) => setPremiumField('note', value)}
              multiline
              numberOfLines={3}
            />

            <AppButton
              title={premiumForm.paymentReceipt?.name ? `Receipt: ${premiumForm.paymentReceipt.name}` : 'Upload Payment Receipt *'}
              variant="secondary"
              onPress={pickPremiumReceipt}
            />

            <AppButton
              title={premiumSubmitting ? 'Submitting premium request...' : 'Submit Premium Request'}
              onPress={submitPremiumRequest}
              disabled={premiumSubmitting}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Submit Incident Report</Text>
        <AppInput placeholder="Title" value={form.title} onChangeText={(v) => setField('title', v)} />
        <AppInput
          placeholder="Description (min 20 chars)"
          value={form.description}
          onChangeText={(v) => setField('description', v)}
          multiline
          numberOfLines={4}
        />
        <AppInput placeholder="Address / Landmark" value={form.address} onChangeText={(v) => setField('address', v)} />

        <View>
          <Text style={styles.sectionLabel}>State</Text>
          <Pressable style={styles.pickerTrigger} onPress={() => openPicker('state')}>
            <Text style={styles.pickerTriggerText}>{form.state || 'Select state'}</Text>
            <Text style={styles.pickerTriggerHint}>Tap to search</Text>
          </Pressable>
        </View>

        <View>
          <Text style={styles.sectionLabel}>Category</Text>
          <Pressable style={styles.pickerTrigger} onPress={() => openPicker('category')}>
            <Text style={styles.pickerTriggerText}>{String(form.category || 'Select category').replaceAll('_', ' ')}</Text>
            <Text style={styles.pickerTriggerHint}>Tap to search</Text>
          </Pressable>
        </View>

        <View>
          <Text style={styles.sectionLabel}>Severity</Text>
          <View style={styles.optionWrap}>
            {SEVERITY_OPTIONS.map((severity) => (
              <Pressable
                key={severity}
                onPress={() => setField('severity', severity)}
                style={[styles.optionChip, form.severity === severity && styles.optionChipSelected]}
              >
                <Text style={[styles.optionChipText, form.severity === severity && styles.optionChipTextSelected]}>{severity}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <AppInput
              placeholder="Date (YYYY-MM-DD)"
              value={form.incidentDateOnly}
              onChangeText={(v) => setField('incidentDateOnly', v)}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.col}>
            <AppInput
              placeholder="Time (HH:mm)"
              value={form.incidentTime}
              onChangeText={(v) => setField('incidentTime', v)}
              autoCapitalize="none"
            />
          </View>
        </View>

        <AppButton
          title="Use Current Date & Time"
          variant="secondary"
          onPress={() => {
            const nowParts = getNowDateParts();
            setField('incidentDateOnly', nowParts.date);
            setField('incidentTime', nowParts.time);
          }}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <AppInput placeholder="Latitude (optional)" value={form.lat} onChangeText={(v) => setField('lat', v)} />
          </View>
          <View style={styles.col}>
            <AppInput placeholder="Longitude (optional)" value={form.lng} onChangeText={(v) => setField('lng', v)} />
          </View>
        </View>

        <AppButton
          title={evidenceFiles.length ? `${evidenceFiles.length} evidence file(s) selected` : 'Attach evidence (optional)'}
          variant="secondary"
          onPress={pickEvidenceFiles}
        />

        <AppButton
          title={submitting ? 'Submitting...' : 'Submit Report'}
          onPress={submitReport}
          disabled={submitting}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Case by ID</Text>
        <AppInput
          placeholder="CASE-YYYYMMDD-XXXXXXXX"
          value={trackingCaseId}
          onChangeText={setTrackingCaseId}
          autoCapitalize="characters"
        />
        <AppInput
          placeholder="Email used during report"
          value={trackingEmail}
          onChangeText={setTrackingEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AppButton
          title={trackingLoading ? 'Tracking...' : 'Track Case'}
          variant="secondary"
          onPress={trackCase}
          disabled={trackingLoading}
        />

        {trackedCase ? (
          <View style={styles.trackedCard}>
            <Text style={styles.trackedTitle}>{trackedCase.caseId}</Text>
            <Text style={styles.trackedText}>Status: {getStatusLabel(trackedCase.status)}</Text>
            <Text style={styles.trackedText}>Last updated: {trackedCase.updatedAt ? new Date(trackedCase.updatedAt).toLocaleString() : 'N/A'}</Text>
            <AppButton title="Copy Case ID" variant="secondary" onPress={copyTrackedCaseId} />
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Recent Reports</Text>
        {reports.length === 0 ? (
          <Text style={styles.emptyText}>No reports submitted yet.</Text>
        ) : (
          reports.slice(0, 8).map((report) => (
            <View key={report._id} style={styles.reportItem}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportMeta}>Case ID: {report.caseId || 'N/A'}</Text>
              <Text style={styles.reportMeta}>Status: {getStatusLabel(report.status)}</Text>
            </View>
          ))
        )}
      </View>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setPickerVisible(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              Select {pickerType === 'category' ? 'Category' : 'State'}
            </Text>

            <AppInput
              placeholder={`Search ${pickerType === 'category' ? 'category' : 'state'}`}
              value={pickerQuery}
              onChangeText={(value) => {
                setPickerQuery(value);
                setPickerQueries((prev) => ({ ...prev, [pickerType]: value }));
              }}
              autoCapitalize="none"
              autoFocus
            />

            <ScrollView style={styles.modalOptionsScroll} contentContainerStyle={styles.modalOptionsWrap}>
              {pickerOptions.length === 0 ? (
                <Text style={styles.emptyText}>No matching options.</Text>
              ) : (
                pickerOptions.slice(0, 20).map((option) => {
                  const normalized = String(option);
                  const isSelected = pickerType === 'category' ? form.category === normalized : form.state === normalized;
                  return (
                    <Pressable
                      key={normalized}
                      onPress={() => selectPickerValue(normalized)}
                      style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                    >
                      <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>
                        {normalized.replaceAll('_', ' ')}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <AppButton title="Close" variant="secondary" onPress={() => setPickerVisible(false)} />
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  heroCard: {
    backgroundColor: '#1e1b38',
    borderWidth: 1,
    borderColor: '#4f46e5',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroTitle: {
    color: '#c4b5fd',
    fontWeight: '900',
    fontSize: 18,
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  kpiIndigo: {
    borderColor: '#6366f1',
    backgroundColor: '#1f2340',
  },
  kpiAmber: {
    borderColor: '#f59e0b',
    backgroundColor: '#30230f',
  },
  kpiSky: {
    borderColor: '#0ea5e9',
    backgroundColor: '#132a38',
  },
  kpiEmerald: {
    borderColor: '#10b981',
    backgroundColor: '#102c25',
  },
  kpiLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    color: '#f8fafc',
    fontWeight: '900',
    fontSize: 22,
  },
  planText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  planValue: {
    color: colors.textPrimary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  premiumActive: {
    color: '#6ee7b7',
    fontWeight: '700',
  },
  receiptRow: {
    gap: spacing.sm,
  },
  premiumFormWrap: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  receiptBadge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  receiptBadgeSuccess: {
    borderColor: '#34d399',
    backgroundColor: '#163126',
  },
  receiptBadgeWarning: {
    borderColor: '#fca5a5',
    backgroundColor: '#3b1c1c',
  },
  receiptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  receiptBadgeTextSuccess: {
    color: '#6ee7b7',
  },
  receiptBadgeTextWarning: {
    color: '#fda4af',
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionChipSelected: {
    borderColor: colors.brand,
    backgroundColor: '#3a2a0a',
  },
  optionChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  optionChipTextSelected: {
    color: colors.brandSoft,
  },
  pickerTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  pickerTriggerText: {
    color: colors.textPrimary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  pickerTriggerHint: {
    color: colors.textMuted,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
  },
  trackedCard: {
    borderWidth: 1,
    borderColor: '#1f7a49',
    borderRadius: radius.md,
    backgroundColor: '#163126',
    padding: spacing.sm,
    gap: 4,
  },
  trackedTitle: {
    color: '#6ee7b7',
    fontWeight: '800',
  },
  trackedText: {
    color: colors.textSecondary,
  },
  emptyText: {
    color: colors.textMuted,
  },
  reportItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
    backgroundColor: colors.surfaceElevated,
  },
  reportTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  reportMeta: {
    color: colors.textSecondary,
    fontSize: 12,
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
    maxHeight: '75%',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  modalOptionsScroll: {
    maxHeight: 280,
  },
  modalOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: spacing.xs,
  },
});
