import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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

    const res = await login(normalizedEmail, password);
    if (!res.success) Alert.alert('Login failed', res.message);
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
});
