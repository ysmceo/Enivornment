import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import AuthStack from './AuthStack';
import UserTabs from './UserTabs';
import AdminTabs from './AdminTabs';
import { useAuth } from '../context/AuthContext';

export default function RootNavigator() {
  const { bootstrapping, isAuthenticated, isAdmin } = useAuth();

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#22d3ee" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthStack />;
  if (isAdmin) return <AdminTabs />;
  return <UserTabs />;
}
