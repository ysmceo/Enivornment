import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AppButton from '../../components/AppButton';
import FeatureCard from '../../components/FeatureCard';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';
import { authService } from '../../services/authService';
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

export default function SettingsScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [idCardNumber, setIdCardNumber] = React.useState('');
  const [governmentIdFile, setGovernmentIdFile] = React.useState(null);
  const [selfieFile, setSelfieFile] = React.useState(null);
  const [uploadingId, setUploadingId] = React.useState(false);
  const [uploadingSelfie, setUploadingSelfie] = React.useState(false);

  const resolvedAge = getAgeFromDate(user?.dateOfBirth);
  const isMinorAccount = user?.role !== 'admin' && (typeof resolvedAge === 'number' ? resolvedAge < 18 : user?.isAdult === false);
  const needsGovernmentIdForVerification = !isMinorAccount;

  const hasGovernmentId = Boolean(user?.hasGovernmentId);
  const hasSelfie = Boolean(user?.hasVerificationSelfie);

  const verificationProgressPercent = needsGovernmentIdForVerification
    ? (hasGovernmentId ? 50 : 0) + (hasSelfie ? 50 : 0)
    : (hasSelfie ? 100 : 0);

  const pickGovernmentId = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets?.[0] || null;
      setGovernmentIdFile(file);
    } catch {
      Alert.alert('File picker', 'Unable to open document picker right now.');
    }
  };

  const pickSelfie = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to upload a verification selfie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

      setSelfieFile({
        uri: asset.uri,
        name: `selfie-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    } catch {
      Alert.alert('Selfie picker', 'Unable to open image picker right now.');
    }
  };

  const uploadGovernmentId = async () => {
    if (!idCardNumber.trim()) {
      Alert.alert('Missing ID number', 'Please enter your ID card number first.');
      return;
    }

    if (!governmentIdFile) {
      Alert.alert('Missing file', 'Please choose a government ID file first.');
      return;
    }

    try {
      setUploadingId(true);
      const response = await authService.uploadGovernmentId(governmentIdFile, idCardNumber.trim());
      await refreshUser();
      setGovernmentIdFile(null);
      setIdCardNumber('');
      Alert.alert('Government ID', response?.data?.message || 'Government ID uploaded successfully.');
    } catch (err) {
      Alert.alert('Upload failed', err?.response?.data?.message || 'Failed to upload government ID.');
    } finally {
      setUploadingId(false);
    }
  };

  const uploadSelfie = async () => {
    if (!selfieFile) {
      Alert.alert('Missing selfie', 'Please choose a selfie image first.');
      return;
    }

    try {
      setUploadingSelfie(true);
      const response = await authService.uploadVerificationSelfie(selfieFile);
      await refreshUser();
      setSelfieFile(null);
      Alert.alert('Verification selfie', response?.data?.message || 'Selfie uploaded successfully.');
    } catch (err) {
      Alert.alert('Upload failed', err?.response?.data?.message || 'Failed to upload verification selfie.');
    } finally {
      setUploadingSelfie(false);
    }
  };

  const onLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert('Logout', 'Signed out from this device.');
    }
  };

  return (
    <ScreenContainer title="Settings" subtitle="Account, app preferences, and session controls.">
      <FeatureCard label="Name" value={user?.name || 'Unknown'} />
      <FeatureCard label="Email" value={user?.email || 'Not provided'} />
      <FeatureCard label="Role" value={user?.role || 'user'} />
      <FeatureCard label="Verification" value={user?.idVerificationStatus || 'unverified'} />
      <FeatureCard label="Age" value={typeof resolvedAge === 'number' ? String(resolvedAge) : 'Unknown'} />

      <View style={styles.verificationCard}>
        <Text style={styles.prefTitle}>Identity Verification Progress</Text>
        <Text style={styles.prefText}>
          {needsGovernmentIdForVerification
            ? 'Adult account: upload both government ID and selfie.'
            : 'Minor account: government ID is not required. Upload selfie only.'}
        </Text>
        <Text style={styles.progressText}>{verificationProgressPercent}% complete</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${verificationProgressPercent}%` }]} />
        </View>

        <View style={styles.statusRow}>
          {needsGovernmentIdForVerification ? (
            <Text style={[styles.statusPill, hasGovernmentId ? styles.statusDone : styles.statusPending]}>
              {hasGovernmentId ? 'ID uploaded' : 'ID pending'}
            </Text>
          ) : (
            <Text style={[styles.statusPill, styles.statusInfo]}>Minor account: ID not required</Text>
          )}

          <Text style={[styles.statusPill, hasSelfie ? styles.statusDone : styles.statusPending]}>
            {hasSelfie ? 'Selfie uploaded' : 'Selfie pending'}
          </Text>
        </View>

        {user?.idVerificationStatus === 'rejected' && user?.idRejectionReason ? (
          <Text style={styles.rejectionText}>Last rejection reason: {user.idRejectionReason}</Text>
        ) : null}
      </View>

      {needsGovernmentIdForVerification ? (
        <View style={styles.verificationCard}>
          <Text style={styles.prefTitle}>Upload Government ID</Text>
          <Text style={styles.prefText}>Supported formats: JPG, PNG, WEBP, PDF.</Text>
          <AppInput
            placeholder="Enter ID card number"
            value={idCardNumber}
            onChangeText={setIdCardNumber}
            autoCapitalize="none"
          />
          <AppButton
            title={governmentIdFile?.name ? `Selected: ${governmentIdFile.name}` : 'Pick Government ID File'}
            variant="secondary"
            onPress={pickGovernmentId}
          />
          <AppButton
            title={uploadingId ? 'Uploading ID...' : 'Upload Government ID'}
            onPress={uploadGovernmentId}
            disabled={uploadingId}
          />
        </View>
      ) : (
        <View style={styles.verificationCard}>
          <Text style={styles.prefTitle}>Government ID Upload</Text>
          <Text style={styles.prefText}>This is optional for minor accounts. Selfie upload is enough to proceed.</Text>
        </View>
      )}

      <View style={styles.verificationCard}>
        <Text style={styles.prefTitle}>Upload Verification Selfie</Text>
        <Text style={styles.prefText}>Please choose a clear selfie image.</Text>
        <AppButton
          title={selfieFile?.name ? `Selected: ${selfieFile.name}` : 'Pick Selfie Image'}
          variant="secondary"
          onPress={pickSelfie}
        />
        <AppButton
          title={uploadingSelfie ? 'Uploading Selfie...' : 'Upload Verification Selfie'}
          onPress={uploadSelfie}
          disabled={uploadingSelfie}
        />
      </View>

      <View style={styles.prefCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.prefTitle}>Push Notifications</Text>
          <Text style={styles.prefText}>Receive case updates and emergency alerts.</Text>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          thumbColor={notificationsEnabled ? colors.brandSoft : '#cbd5e1'}
          trackColor={{ false: '#334155', true: '#7c5b1f' }}
        />
      </View>

      <View style={styles.prefCard}>
        <Text style={styles.prefTitle}>API Endpoint</Text>
        <Text style={styles.prefText}>{API_BASE_URL}</Text>
      </View>

      <AppButton title="Log Out" variant="secondary" onPress={onLogout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  prefCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  verificationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  prefTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    marginBottom: 4,
  },
  prefText: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  progressText: {
    color: colors.brandSoft,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: '#2a2218',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statusPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  statusDone: {
    backgroundColor: '#163126',
    borderColor: '#1f7a49',
    color: '#6ee7b7',
  },
  statusPending: {
    backgroundColor: '#332214',
    borderColor: '#8b5e34',
    color: '#fbbf24',
  },
  statusInfo: {
    backgroundColor: '#1d2b3a',
    borderColor: '#2c6e9b',
    color: '#7dd3fc',
  },
  rejectionText: {
    color: '#fda4af',
    lineHeight: 20,
  },
});
