import React from 'react';
import FeatureCard from '../../components/FeatureCard';
import ScreenContainer from '../../components/ScreenContainer';

const features = [
  'Landing / Auth',
  'Citizen Dashboard',
  'Emergency Directory',
  'SOS Alerts',
  'Live Streams',
  'News + Reader',
  'Admin Dashboard',
  'Admin Reports',
  'Admin Users',
  'Admin Verification',
  'Crime Analytics',
  'Admin Live Viewer',
];

export default function PreviewScreen() {
  return (
    <ScreenContainer title="Feature Preview" subtitle="Web features mapped for mobile parity.">
      {features.map((item) => (
        <FeatureCard key={item} label="Included" value={item} />
      ))}
    </ScreenContainer>
  );
}
