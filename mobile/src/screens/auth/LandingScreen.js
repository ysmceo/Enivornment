import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import ScreenContainer from '../../components/ScreenContainer';
import { colors, radius, spacing, typography } from '../../theme/tokens';

const KPI_STATS = [
  { value: '102k', label: 'Trusted Citizens' },
  { value: '900M+', label: 'Evidence Data Secured' },
  { value: '124k', label: 'Incidents Processed' },
  { value: '99%', label: 'Successful Escalations' },
];

const CORE_FEATURES = [
  {
    title: 'Anonymous Reporting',
    description: 'Safely report sensitive incidents without exposing your identity to the public.',
  },
  {
    title: 'Military-grade Security',
    description: 'All evidence is encrypted in transit and at rest for trusted legal admissibility.',
  },
  {
    title: 'Live Video Evidence',
    description: 'Stream real-time evidence when immediate intervention is required.',
  },
  {
    title: 'Case Status Alerts',
    description: 'Receive structured updates as reports move from intake to resolution.',
  },
];

const OPERATIONS = [
  {
    title: 'Emergency Operations',
    subtitle: '24/7 incident escalation for severe threats and active emergencies.',
    points: ['Rapid alert routing', 'Geo-aware triage', 'Agency handoff'],
  },
  {
    title: 'Digital Evidence Desk',
    subtitle: 'Secure evidence intake, timeline validation, and integrity preservation.',
    points: ['Media chain of custody', 'Tamper detection', 'Investigation notes'],
  },
];

const PROCESS = [
  {
    step: '01',
    title: 'Send Your Report',
    description: 'Submit details, optional media, and location in under two minutes.',
  },
  {
    step: '02',
    title: 'Verification & Investigation',
    description: 'Workflow validates context, prioritizes severity, and alerts responders.',
  },
  {
    step: '03',
    title: 'Coordinated Response',
    description: 'Agencies receive structured evidence with real-time updates for action.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'The platform helped us receive reliable, timestamped evidence much faster.',
    author: 'Officer M. Yusuf',
  },
  {
    quote: 'Anonymous reporting gave me confidence to submit critical information safely.',
    author: 'Amina K.',
  },
];

export default function LandingScreen({ navigation }) {
  return (
    <ScreenContainer
      title="VOV CRIME"
      subtitle="Secure civic intelligence for safer communities."
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Real-time Civic Protection Platform</Text>
        <Text style={styles.heroTitle}>Report Incidents, Protect Communities, Get Fast Response.</Text>
        <Text style={styles.heroCopy}>
          A secure platform where citizens, responders, and agencies work together with verified evidence,
          rapid escalation, and structured incident workflows.
        </Text>
        <View style={styles.actionStack}>
          <AppButton title="Get Started" onPress={() => navigation.navigate('Register')} />
          <AppButton title="Sign In" onPress={() => navigation.navigate('Login')} variant="secondary" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Command Snapshot</Text>
        <View style={styles.kpiGrid}>
          {KPI_STATS.map((item) => (
            <View key={item.label} style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{item.value}</Text>
              <Text style={styles.kpiLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Core Features</Text>
        {CORE_FEATURES.map((feature) => (
          <View key={feature.title} style={styles.card}>
            <Text style={styles.cardTitle}>• {feature.title}</Text>
            <Text style={styles.copy}>{feature.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operational Areas</Text>
        {OPERATIONS.map((op) => (
          <View key={op.title} style={styles.card}>
            <Text style={styles.cardTitle}>{op.title}</Text>
            <Text style={styles.copy}>{op.subtitle}</Text>
            {op.points.map((point) => (
              <Text key={point} style={styles.bullet}>✓ {point}</Text>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        {PROCESS.map((item) => (
          <View key={item.step} style={styles.stepCard}>
            <Text style={styles.stepBadge}>{item.step}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.copy}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Community Feedback</Text>
        {TESTIMONIALS.map((item) => (
          <View key={item.author} style={styles.card}>
            <Text style={styles.copy}>“{item.quote}”</Text>
            <Text style={styles.author}>— {item.author}</Text>
          </View>
        ))}
      </View>

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Request emergency support and coordination.</Text>
        <Text style={styles.ctaText}>Immediate support for active incidents and high-risk reports.</Text>
        <AppButton title="Create Account" onPress={() => navigation.navigate('Register')} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>VOV CRIME</Text>
        <Text style={styles.footerText}>© 2026 VOV CRIME. All rights reserved.</Text>
      </View>

      <View style={styles.actionStack}>
        <AppButton title="Preview Features" onPress={() => navigation.navigate('Preview')} variant="secondary" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#1c140d',
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.brandSoft,
    fontWeight: '700',
    fontSize: typography.caption,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  heroCopy: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.brandSoft,
    fontWeight: '800',
    fontSize: typography.h2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  kpiValue: {
    color: colors.brandSoft,
    fontWeight: '900',
    fontSize: 22,
  },
  kpiLabel: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: typography.caption,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  copy: { color: colors.textSecondary, lineHeight: 22 },
  bullet: {
    color: colors.textSecondary,
    lineHeight: 22,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  stepBadge: {
    color: '#0b0b0b',
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    fontWeight: '900',
    minWidth: 42,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  author: {
    color: colors.brandSoft,
    marginTop: 4,
    fontWeight: '700',
  },
  ctaCard: {
    backgroundColor: '#f59e0b',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ctaTitle: {
    color: '#101010',
    fontWeight: '900',
    fontSize: typography.h2,
  },
  ctaText: {
    color: '#292524',
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: 4,
  },
  footerTitle: {
    color: colors.brandSoft,
    fontWeight: '900',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  actionStack: {
    gap: spacing.sm,
    marginTop: 4,
  },
});
