import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CitizenDashboardScreen from '../screens/user/CitizenDashboardScreen';
import EmergencyDirectoryScreen from '../screens/user/EmergencyDirectoryScreen';
import SOSScreen from '../screens/user/SOSScreen';
import LiveHomeScreen from '../screens/user/LiveHomeScreen';
import NewsCategoryScreen from '../screens/user/NewsCategoryScreen';
import NewsReaderScreen from '../screens/user/NewsReaderScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function NewsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#020617' }, headerTintColor: '#f8fafc' }}>
      <Stack.Screen name="NewsCategory" component={NewsCategoryScreen} options={{ title: 'News Feed' }} />
      <Stack.Screen name="NewsReader" component={NewsReaderScreen} options={{ title: 'Read News' }} />
    </Stack.Navigator>
  );
}

export default function UserTabs() {
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
      <Tab.Screen name="Dashboard" component={CitizenDashboardScreen} />
      <Tab.Screen name="Emergency" component={EmergencyDirectoryScreen} />
      <Tab.Screen name="SOS" component={SOSScreen} />
      <Tab.Screen name="Live" component={LiveHomeScreen} />
      <Tab.Screen name="News" component={NewsStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
