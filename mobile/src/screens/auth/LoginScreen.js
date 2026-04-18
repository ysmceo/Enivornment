import React, { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    const res = await login(email.trim(), password);
    if (!res.success) Alert.alert('Login failed', res.message);
  };

  return (
    <ScreenContainer title="Login" subtitle="Use your existing website account.">
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={onSubmit} disabled={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
