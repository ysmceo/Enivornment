import React, { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import api from '../../services/api';

export default function SOSScreen() {
  const [title, setTitle] = useState('Emergency Alert');
  const [description, setDescription] = useState('Need urgent assistance');
  const [latitude, setLatitude] = useState('6.5244');
  const [longitude, setLongitude] = useState('3.3792');

  const createAlert = async () => {
    try {
      const res = await api.post('/sos', {
        title,
        description,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      Alert.alert('SOS Sent', res?.data?.message || 'Alert created successfully');
    } catch (err) {
      Alert.alert('SOS failed', err?.response?.data?.message || err.message);
    }
  };

  return (
    <ScreenContainer title="SOS" subtitle="Trigger emergency response from mobile.">
      <View style={styles.form}>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor="#94a3b8" />
        <TextInput style={styles.input} value={latitude} onChangeText={setLatitude} placeholder="Latitude" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
        <TextInput style={styles.input} value={longitude} onChangeText={setLongitude} placeholder="Longitude" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
        <Button title="Send SOS" onPress={createAlert} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
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
