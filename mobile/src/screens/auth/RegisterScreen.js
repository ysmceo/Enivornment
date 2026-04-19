import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmit = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPhone || !password || !confirmPassword) {
      Alert.alert('Missing details', 'Please complete all fields.');
      return;
    }
    if (!normalizedEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirm password must match.');
      return;
    }

    const res = await register({ name: normalizedName, email: normalizedEmail, phone: normalizedPhone, password });
    if (!res.success) Alert.alert('Registration failed', res.message);
  };

  return (
    <ScreenContainer title="Register" subtitle="Create a citizen or admin-capable account from mobile.">
      <View style={styles.form}>
        <AppInput placeholder="Full name" value={name} onChangeText={setName} />
        <AppInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} />
        <AppInput placeholder="Phone" value={phone} onChangeText={setPhone} />
        <AppInput secureTextEntry placeholder="Password" value={password} onChangeText={setPassword} />
        <AppInput secureTextEntry placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} />
        <AppButton title={loading ? 'Creating account...' : 'Create account'} onPress={onSubmit} disabled={loading} />
        <AppButton title="Already have an account? Sign In" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
});
