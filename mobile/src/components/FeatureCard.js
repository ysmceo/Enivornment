import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function FeatureCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
  },
  label: { color: '#94a3b8', marginBottom: 6 },
  value: { color: '#f8fafc', fontWeight: '700' },
});
