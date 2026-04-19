import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminVerificationScreen from '../screens/admin/AdminVerificationScreen';
import CrimeAnalyticsScreen from '../screens/admin/CrimeAnalyticsScreen';
import AdminLiveViewerScreen from '../screens/admin/AdminLiveViewerScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#020617' },
        headerTintColor: '#f8fafc',
        tabBarStyle: { backgroundColor: '#020617', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#22d3ee',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen name="AdminHome" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Reports" component={AdminReportsScreen} />
      <Tab.Screen name="Users" component={AdminUsersScreen} />
      <Tab.Screen name="Verify" component={AdminVerificationScreen} />
      <Tab.Screen name="Analytics" component={CrimeAnalyticsScreen} />
      <Tab.Screen name="LiveWatch" component={AdminLiveViewerScreen} options={{ title: 'Live' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
