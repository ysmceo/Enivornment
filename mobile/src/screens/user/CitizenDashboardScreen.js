import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import FeatureCard from '../../components/FeatureCard';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import { useAuth } from '../../context/AuthContext';
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

  return (
    <ScreenContainer title="Citizen Dashboard" subtitle="Your reports and account activity.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FeatureCard label="Total reports" value={String(reports.length)} />
      <FeatureCard label="Pending" value={String(statusSummary.pending)} />
      <FeatureCard label="In progress" value={String(statusSummary.in_progress)} />
      <FeatureCard label="Solved" value={String(statusSummary.solved)} />

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
