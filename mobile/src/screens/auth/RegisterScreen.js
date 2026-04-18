import React, { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    const res = await register({ name, email: email.trim(), phone, password });
    if (!res.success) Alert.alert('Registration failed', res.message);
  };

  return (
    <ScreenContainer title="Register" subtitle="Create a citizen or admin-capable account from mobile.">
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
        <TextInput style={styles.input} autoCapitalize="none" placeholder="Email" placeholderTextColor="#94a3b8" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#94a3b8" value={phone} onChangeText={setPhone} />
        <TextInput style={styles.input} secureTextEntry placeholder="Password" placeholderTextColor="#94a3b8" value={password} onChangeText={setPassword} />
        <Button title={loading ? 'Creating account...' : 'Create account'} onPress={onSubmit} disabled={loading} />
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
