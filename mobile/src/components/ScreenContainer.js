import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ScreenContainer({ title, subtitle, children }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  header: { marginBottom: 4 },
  title: { color: '#f8fafc', fontWeight: '800', fontSize: 24 },
  subtitle: { color: '#cbd5e1', marginTop: 4 },
});
