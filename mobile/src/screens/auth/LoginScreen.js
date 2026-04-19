import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing } from '../../theme/tokens';

const POST_LOGIN_MESSAGE = `VOICE OF THE VOICELESS

Where silence ends and truth begins.

We stand for those who cannot speak,
we fight for those who are unheard,
and we shine light where darkness hides.

This platform empowers you to report incidents,
share real-time information, and connect to live updates that matter.

Every voice counts. Every report matters.

Speak. Report. Be Heard.`;

export default function LoginScreen({ navigation }) {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [completeLogin, setCompleteLogin] = useState(null);

  const onContinueAfterWelcome = async () => {
    if (typeof completeLogin === 'function') {
      await completeLogin();
    }
    setWelcomeVisible(false);
    setCompleteLogin(null);
  };

  const onSubmit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      Alert.alert('Missing details', 'Please enter both email and password.');
      return;
    }
    if (!normalizedEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    const res = await login(normalizedEmail, password, { deferSession: true });
    if (!res.success) Alert.alert('Login failed', res.message);
    else {
      setCompleteLogin(() => res.completeLogin);
      setWelcomeVisible(true);
    }
  };

  return (
    <ScreenContainer title="Login" subtitle="Use your existing website account.">
      <View style={styles.form}>
        <AppInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
        />
        <AppInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <AppButton title={loading ? 'Signing in...' : 'Sign In'} onPress={onSubmit} disabled={loading} />
        <AppButton title="Create Account" variant="secondary" onPress={() => navigation.navigate('Register')} />
      </View>

      <Modal visible={welcomeVisible} transparent animationType="fade" onRequestClose={onContinueAfterWelcome}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>VOICE OF THE VOICELESS</Text>
            <Text style={styles.modalBody}>{POST_LOGIN_MESSAGE.replace('VOICE OF THE VOICELESS\n\n', '')}</Text>
            <Pressable style={styles.modalButton} onPress={onContinueAfterWelcome}>
              <Text style={styles.modalButtonText}>Continue to Dashboard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 18, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: '#140f26',
    borderWidth: 1,
    borderColor: '#4338ca',
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    color: '#c4b5fd',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalBody: {
    color: colors.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },
  modalButton: {
    marginTop: spacing.xs,
    backgroundColor: '#7c3aed',
    borderColor: '#8b5cf6',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#f8fafc',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
