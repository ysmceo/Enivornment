import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';

export default function LandingScreen({ navigation }) {
  return (
    <ScreenContainer
      title="VOV CRIME"
      subtitle="Secure citizen reporting, emergency support, live monitoring, and admin operations on mobile."
    >
      <View style={styles.card}>
        <Text style={styles.copy}>Everything from the web app is mapped here: reports, SOS, live, news, analytics, and admin controls.</Text>
      </View>
      <Button title="Login" onPress={() => navigation.navigate('Login')} />
      <Button title="Register" onPress={() => navigation.navigate('Register')} />
      <Button title="Preview Features" onPress={() => navigation.navigate('Preview')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderColor: '#1e293b',
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  copy: { color: '#e2e8f0', lineHeight: 22 },
});
