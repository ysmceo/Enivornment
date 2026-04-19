import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import { adminService } from '../../services/adminService';
import { colors, radius, spacing } from '../../theme/tokens';

const AUTHORITY_TYPES = ['police', 'civil_defence', 'military', 'other'];
const SCOPE_TYPES = ['state', 'national'];

const INITIAL_FORM = {
  scope: 'state',
  name: '',
  agency: '',
  state: '',
  region: '',
  authorityType: 'police',
  category: 'public_safety',
  phonePrimary: '',
  phoneSecondary: '',
  phoneNumbers: '',
  email: '',
  address: '',
  active: true,
  isVerifiedOfficial: true,
};

const normalizeAuthorityLabel = (value) =>
  String(value || 'other')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());

const normalizePayload = (form) => {
  const numbers = String(form.phoneNumbers || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (form.phonePrimary && !numbers.includes(form.phonePrimary.trim())) {
    numbers.unshift(form.phonePrimary.trim());
  }

  if (form.phoneSecondary && !numbers.includes(form.phoneSecondary.trim())) {
    numbers.push(form.phoneSecondary.trim());
  }

  return {
    scope: form.scope,
    name: String(form.name || '').trim(),
    agency: String(form.agency || '').trim(),
    state: form.scope === 'national' ? undefined : String(form.state || '').trim(),
    region: form.scope === 'national' ? 'National' : (String(form.region || '').trim() || undefined),
    authorityType: form.authorityType,
    category: String(form.category || 'public_safety').trim(),
    phonePrimary: String(form.phonePrimary || '').trim(),
    phoneSecondary: String(form.phoneSecondary || '').trim() || undefined,
    phoneNumbers: numbers,
    email: String(form.email || '').trim() || undefined,
    address: String(form.address || '').trim() || undefined,
    active: !!form.active,
    isVerifiedOfficial: !!form.isVerifiedOfficial,
  };
};

export default function AdminEmergencyContactsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const [lastCsvAction, setLastCsvAction] = useState(null);
  const [busyDeleteId, setBusyDeleteId] = useState('');

  const [contacts, setContacts] = useState([]);
  const [states, setStates] = useState([]);

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const getFilterParams = () => ({
    page: 1,
    limit: 100,
    search: search || undefined,
    state: scopeFilter !== 'national' ? (stateFilter || undefined) : undefined,
    authorityType: typeFilter || undefined,
    scope: scopeFilter !== 'all' ? scopeFilter : undefined,
  });

  const loadContacts = async () => {
    const res = await adminService.getEmergencyContacts(getFilterParams());
    setContacts(res.data?.contacts || []);
  };

  const loadMeta = async () => {
    const res = await adminService.getMetadata();
    setStates(res.data?.metadata?.states || []);
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadMeta(), loadContacts()]);
    } catch (err) {
      Alert.alert('Load failed', err?.response?.data?.message || 'Unable to load emergency contacts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
  };

  const startUniversalArmedForces = () => {
    setEditing(null);
    setForm({
      ...INITIAL_FORM,
      scope: 'national',
      authorityType: 'military',
      name: 'Nigerian Armed Forces (Universal Response)',
      agency: 'Nigerian Armed Forces (Universal Response)',
      region: 'National',
      phonePrimary: '193',
      phoneNumbers: '193',
      isVerifiedOfficial: true,
      active: true,
    });
  };

  const startEdit = (contact) => {
    const numbers = Array.isArray(contact.phoneNumbers)
      ? contact.phoneNumbers.filter(Boolean)
      : [contact.phonePrimary, contact.phoneSecondary].filter(Boolean);

    setEditing(contact);
    setForm({
      scope: contact.scope || 'state',
      name: contact.name || '',
      agency: contact.agency || '',
      state: contact.state || '',
      region: contact.region || '',
      authorityType: contact.authorityType || 'police',
      category: contact.category || 'public_safety',
      phonePrimary: contact.phonePrimary || numbers[0] || '',
      phoneSecondary: contact.phoneSecondary || numbers[1] || '',
      phoneNumbers: numbers.join(', '),
      email: contact.email || '',
      address: contact.address || '',
      active: contact.active !== false,
      isVerifiedOfficial: contact.isVerifiedOfficial !== false,
    });
  };

  const saveContact = async () => {
    const payload = normalizePayload(form);
    if (!payload.name || !payload.agency || !payload.phonePrimary || (payload.scope !== 'national' && !payload.state)) {
      Alert.alert('Missing fields', 'Name, agency, primary phone, and state (for state scope) are required.');
      return;
    }

    try {
      setSaving(true);
      if (editing?._id) {
        await adminService.updateEmergencyContact({ contactId: editing._id, payload });
      } else {
        await adminService.createEmergencyContact(payload);
      }
      setEditing(null);
      setForm(INITIAL_FORM);
      await loadContacts();
      Alert.alert('Success', editing?._id ? 'Emergency contact updated.' : 'Emergency contact created.');
    } catch (err) {
      Alert.alert('Save failed', err?.response?.data?.message || 'Unable to save emergency contact.');
    } finally {
      setSaving(false);
    }
  };

  const removeContact = (contact) => {
    Alert.alert(
      'Delete contact',
      `Delete ${contact.agency || contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyDeleteId(contact._id);
              await adminService.deleteEmergencyContact(contact._id);
              await loadContacts();
              Alert.alert('Deleted', 'Emergency contact deleted.');
            } catch (err) {
              Alert.alert('Delete failed', err?.response?.data?.message || 'Unable to delete contact.');
            } finally {
              setBusyDeleteId('');
            }
          },
        },
      ]
    );
  };

  const downloadCsvOnWeb = (csvText) => {
    if (typeof document === 'undefined') return false;
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `emergency-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
    return true;
  };

  const exportCsv = async () => {
    try {
      setCsvBusy(true);
      const res = await adminService.exportEmergencyContactsCsv(getFilterParams());
      const csvText = typeof res?.data === 'string' ? res.data : String(res?.data || '');
      if (!csvText.trim()) {
        setLastCsvAction({
          kind: 'export',
          status: 'warning',
          message: 'No CSV content was returned by the server.',
          occurredAt: new Date().toISOString(),
        });
        Alert.alert('CSV export', 'No CSV content was returned by the server.');
        return;
      }

      if (Platform.OS === 'web' && downloadCsvOnWeb(csvText)) {
        setLastCsvAction({
          kind: 'export',
          status: 'success',
          message: 'CSV downloaded successfully.',
          occurredAt: new Date().toISOString(),
        });
        Alert.alert('CSV export', 'CSV downloaded successfully.');
        return;
      }

      await Clipboard.setStringAsync(csvText);
      setLastCsvAction({
        kind: 'export',
        status: 'success',
        message: 'CSV copied to clipboard.',
        occurredAt: new Date().toISOString(),
      });
      Alert.alert('CSV export', 'CSV copied to clipboard. Paste into a .csv file.');
    } catch (err) {
      setLastCsvAction({
        kind: 'export',
        status: 'error',
        message: err?.response?.data?.message || 'Unable to export emergency contacts CSV.',
        occurredAt: new Date().toISOString(),
      });
      Alert.alert('CSV export failed', err?.response?.data?.message || 'Unable to export emergency contacts CSV.');
    } finally {
      setCsvBusy(false);
    }
  };

  const readCsvTextFromDocument = async (asset) => {
    if (asset?.file && typeof asset.file.text === 'function') {
      return asset.file.text();
    }

    if (asset?.uri) {
      const response = await fetch(asset.uri);
      return response.text();
    }

    return '';
  };

  const runCsvImportWithMode = async (mode) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = Array.isArray(result.assets) ? result.assets[0] : null;
      if (!asset) {
        Alert.alert('CSV import', 'No file was selected.');
        return;
      }

      const csvText = await readCsvTextFromDocument(asset);
      if (!String(csvText || '').trim()) {
        Alert.alert('CSV import', 'Selected file appears empty.');
        return;
      }

      setCsvBusy(true);
      const response = await adminService.importEmergencyContactsCsv({ csv: csvText, mode });
      const summary = response?.data?.summary || {};
      await loadContacts();
      setLastCsvAction({
        kind: 'import',
        status: 'success',
        mode,
        inserted: summary.inserted ?? 0,
        modified: summary.modified ?? 0,
        skipped: summary.skipped ?? 0,
        occurredAt: new Date().toISOString(),
      });
      Alert.alert(
        'CSV import complete',
        `Mode: ${mode}\nInserted: ${summary.inserted ?? 0}\nModified: ${summary.modified ?? 0}\nSkipped: ${summary.skipped ?? 0}`
      );
    } catch (err) {
      setLastCsvAction({
        kind: 'import',
        status: 'error',
        mode,
        message: err?.response?.data?.message || 'Unable to import CSV file.',
        occurredAt: new Date().toISOString(),
      });
      Alert.alert('CSV import failed', err?.response?.data?.message || 'Unable to import CSV file.');
    } finally {
      setCsvBusy(false);
    }
  };

  const importCsv = () => {
    Alert.alert(
      'CSV import mode',
      'Choose import mode: Upsert (merge/update) or Replace (wipe and import all).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upsert', onPress: () => runCsvImportWithMode('upsert') },
        { text: 'Replace', style: 'destructive', onPress: () => runCsvImportWithMode('replace') },
      ]
    );
  };

  const summary = useMemo(() => {
    const total = contacts.length;
    const national = contacts.filter((item) => item.scope === 'national').length;
    const stateScoped = total - national;
    const verified = contacts.filter((item) => item.isVerifiedOfficial !== false).length;
    return { total, national, stateScoped, verified };
  }, [contacts]);

  const csvStatusToneStyle = useMemo(() => {
    if (lastCsvAction?.status === 'success') return styles.csvStatusCardSuccess;
    if (lastCsvAction?.status === 'warning') return styles.csvStatusCardWarning;
    if (lastCsvAction?.status === 'error') return styles.csvStatusCardError;
    return null;
  }, [lastCsvAction]);

  const csvStatusHeadlineStyle = useMemo(() => {
    if (lastCsvAction?.status === 'success') return styles.csvStatusHeadlineSuccess;
    if (lastCsvAction?.status === 'warning') return styles.csvStatusHeadlineWarning;
    if (lastCsvAction?.status === 'error') return styles.csvStatusHeadlineError;
    return null;
  }, [lastCsvAction]);

  return (
    <ScreenContainer title="Admin Emergency Contacts" subtitle="Manage verified emergency numbers by state, region, authority type, and universal scope.">
      {loading ? <ActivityIndicator color={colors.brandSoft} /> : null}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryPill}>Total: {summary.total}</Text>
        <Text style={styles.summaryPill}>State: {summary.stateScoped}</Text>
        <Text style={styles.summaryPill}>National: {summary.national}</Text>
        <Text style={styles.summaryPill}>Verified: {summary.verified}</Text>
      </View>

      {lastCsvAction ? (
        <View style={[styles.csvStatusCard, csvStatusToneStyle]}>
          <Text style={styles.csvStatusTitle}>Last CSV action</Text>
          <Text style={[styles.csvStatusText, csvStatusHeadlineStyle]}>
            {String(lastCsvAction.kind || 'csv').toUpperCase()} · {String(lastCsvAction.status || 'info').toUpperCase()}
          </Text>
          {lastCsvAction.mode ? (
            <Text style={styles.csvStatusText}>Mode: {lastCsvAction.mode}</Text>
          ) : null}
          {typeof lastCsvAction.inserted === 'number' ? (
            <Text style={styles.csvStatusText}>
              Inserted: {lastCsvAction.inserted} · Modified: {lastCsvAction.modified ?? 0} · Skipped: {lastCsvAction.skipped ?? 0}
            </Text>
          ) : null}
          {lastCsvAction.message ? (
            <Text style={styles.csvStatusText}>{lastCsvAction.message}</Text>
          ) : null}
          {lastCsvAction.occurredAt ? (
            <Text style={styles.csvStatusMeta}>At: {new Date(lastCsvAction.occurredAt).toLocaleString()}</Text>
          ) : null}
          <Pressable style={styles.csvClearButton} onPress={() => setLastCsvAction(null)}>
            <Text style={styles.csvClearButtonText}>Clear status</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Filters</Text>
        <AppInput placeholder="Search agency/contact/phone" value={search} onChangeText={setSearch} />
        <AppInput placeholder="Filter by state (e.g. Lagos)" value={stateFilter} onChangeText={setStateFilter} />
        <AppInput placeholder="Filter by authority type (police, military...)" value={typeFilter} onChangeText={setTypeFilter} />

        <View style={styles.rowWrap}>
          <Pressable style={[styles.scopeChip, scopeFilter === 'all' && styles.scopeChipActive]} onPress={() => setScopeFilter('all')}>
            <Text style={styles.scopeChipText}>All</Text>
          </Pressable>
          <Pressable style={[styles.scopeChip, scopeFilter === 'state' && styles.scopeChipActive]} onPress={() => setScopeFilter('state')}>
            <Text style={styles.scopeChipText}>State</Text>
          </Pressable>
          <Pressable style={[styles.scopeChip, scopeFilter === 'national' && styles.scopeChipActive]} onPress={() => setScopeFilter('national')}>
            <Text style={styles.scopeChipText}>National</Text>
          </Pressable>
        </View>

        <View style={styles.rowWrap}>
          <AppButton title="Apply Filters" variant="secondary" onPress={loadContacts} />
          <AppButton title={csvBusy ? 'Exporting…' : 'Export CSV'} variant="secondary" onPress={exportCsv} disabled={csvBusy} />
          <AppButton title={csvBusy ? 'Importing…' : 'Import CSV'} variant="secondary" onPress={importCsv} disabled={csvBusy} />
          <AppButton
            title="Reset"
            variant="secondary"
            onPress={() => {
              setSearch('');
              setStateFilter('');
              setTypeFilter('');
              setScopeFilter('all');
              setTimeout(() => {
                loadContacts().catch(() => {});
              }, 0);
            }}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editing?._id ? 'Edit Contact' : 'Create Contact'}</Text>

        <View style={styles.rowWrap}>
          {SCOPE_TYPES.map((scope) => (
            <Pressable
              key={scope}
              style={[styles.scopeChip, form.scope === scope && styles.scopeChipActive]}
              onPress={() => onFormChange('scope', scope)}
            >
              <Text style={styles.scopeChipText}>{scope === 'national' ? 'National' : 'State'}</Text>
            </Pressable>
          ))}
        </View>

        <AppInput placeholder="Contact name" value={form.name} onChangeText={(value) => onFormChange('name', value)} />
        <AppInput placeholder="Agency" value={form.agency} onChangeText={(value) => onFormChange('agency', value)} />

        {form.scope === 'national' ? (
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>National / All States</Text>
          </View>
        ) : (
          <AppInput
            placeholder={`State (e.g. ${states[0] || 'Lagos'})`}
            value={form.state}
            onChangeText={(value) => onFormChange('state', value)}
          />
        )}

        <AppInput
          placeholder={form.scope === 'national' ? 'Region: National' : 'Region (optional)'}
          value={form.scope === 'national' ? 'National' : form.region}
          onChangeText={(value) => onFormChange('region', value)}
          editable={form.scope !== 'national'}
        />

        <View style={styles.rowWrap}>
          {AUTHORITY_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[styles.scopeChip, form.authorityType === type && styles.scopeChipActive]}
              onPress={() => onFormChange('authorityType', type)}
            >
              <Text style={styles.scopeChipText}>{normalizeAuthorityLabel(type)}</Text>
            </Pressable>
          ))}
        </View>

        <AppInput placeholder="Category" value={form.category} onChangeText={(value) => onFormChange('category', value)} />
        <AppInput placeholder="Primary phone" value={form.phonePrimary} onChangeText={(value) => onFormChange('phonePrimary', value)} />
        <AppInput placeholder="Secondary phone" value={form.phoneSecondary} onChangeText={(value) => onFormChange('phoneSecondary', value)} />
        <AppInput placeholder="Phone numbers (comma-separated)" value={form.phoneNumbers} onChangeText={(value) => onFormChange('phoneNumbers', value)} />
        <AppInput placeholder="Email (optional)" value={form.email} onChangeText={(value) => onFormChange('email', value)} autoCapitalize="none" keyboardType="email-address" />
        <AppInput placeholder="Address (optional)" value={form.address} onChangeText={(value) => onFormChange('address', value)} />

        <View style={styles.rowWrap}>
          <Pressable style={[styles.scopeChip, form.active && styles.scopeChipActive]} onPress={() => onFormChange('active', !form.active)}>
            <Text style={styles.scopeChipText}>{form.active ? 'Active' : 'Inactive'}</Text>
          </Pressable>
          <Pressable
            style={[styles.scopeChip, form.isVerifiedOfficial && styles.scopeChipActive]}
            onPress={() => onFormChange('isVerifiedOfficial', !form.isVerifiedOfficial)}
          >
            <Text style={styles.scopeChipText}>{form.isVerifiedOfficial ? 'Verified' : 'Unverified'}</Text>
          </Pressable>
        </View>

        <View style={styles.rowWrap}>
          <AppButton title={saving ? 'Saving…' : editing?._id ? 'Save Changes' : 'Create Contact'} onPress={saveContact} disabled={saving} />
          <AppButton title="New Blank Form" variant="secondary" onPress={startCreate} disabled={saving} />
          <AppButton title="Universal Armed Forces" variant="secondary" onPress={startUniversalArmedForces} disabled={saving} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contacts ({contacts.length})</Text>
        {contacts.length === 0 ? <Text style={styles.emptyText}>No contacts loaded.</Text> : null}

        {contacts.map((contact, index) => (
          <View key={`${contact?._id || index}`} style={styles.contactCard}>
            <Text style={styles.contactTitle}>{contact.agency || contact.name || 'Emergency contact'}</Text>
            <Text style={styles.contactMeta}>Name: {contact.name || '-'}</Text>
            <Text style={styles.contactMeta}>Scope: {contact.scope === 'national' ? 'National' : 'State'}</Text>
            <Text style={styles.contactMeta}>State: {contact.state || 'All states'}</Text>
            <Text style={styles.contactMeta}>Region: {contact.region || '-'}</Text>
            <Text style={styles.contactMeta}>Type: {normalizeAuthorityLabel(contact.authorityType)}</Text>
            <Text style={styles.contactMeta}>Phone: {contact.phonePrimary || '-'}</Text>

            <View style={styles.rowWrap}>
              <AppButton title="Edit" variant="secondary" onPress={() => startEdit(contact)} />
              <AppButton
                title={busyDeleteId === contact._id ? 'Deleting…' : 'Delete'}
                variant="secondary"
                disabled={busyDeleteId === contact._id}
                onPress={() => removeContact(contact)}
              />
            </View>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summaryPill: {
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  csvStatusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  csvStatusCardSuccess: {
    borderColor: colors.success,
    backgroundColor: '#102c25',
  },
  csvStatusCardWarning: {
    borderColor: colors.brand,
    backgroundColor: '#30230f',
  },
  csvStatusCardError: {
    borderColor: colors.danger,
    backgroundColor: '#2f1114',
  },
  csvStatusTitle: {
    color: colors.textPrimary,
    fontWeight: '900',
    fontSize: 15,
  },
  csvStatusText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  csvStatusHeadlineSuccess: {
    color: '#86efac',
    fontWeight: '800',
  },
  csvStatusHeadlineWarning: {
    color: '#fde68a',
    fontWeight: '800',
  },
  csvStatusHeadlineError: {
    color: '#fca5a5',
    fontWeight: '800',
  },
  csvStatusMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  csvClearButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: '#1f2937',
  },
  csvClearButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  scopeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: '#1f2937',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  scopeChipActive: {
    borderColor: colors.brand,
    backgroundColor: '#3f2f1a',
  },
  scopeChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  readonlyField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  readonlyText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
  },
  contactCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  contactTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  contactMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
