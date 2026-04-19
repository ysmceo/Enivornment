import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CitizenDashboardScreen from '../screens/user/CitizenDashboardScreen';
import EmergencyDirectoryScreen from '../screens/user/EmergencyDirectoryScreen';
import SOSScreen from '../screens/user/SOSScreen';
import LiveHomeScreen from '../screens/user/LiveHomeScreen';
import NewsCategoryScreen from '../screens/user/NewsCategoryScreen';
import NewsReaderScreen from '../screens/user/NewsReaderScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const getAgeFromDate = (dateInput) => {
  if (!dateInput) return null;
  const dob = new Date(dateInput);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
};

const isAdultAccount = (user) => {
  if (user?.role === 'admin') return true;
  const age = getAgeFromDate(user?.dateOfBirth);
  if (typeof age === 'number') return age >= 18;
  return user?.isAdult !== false;
};

function NewsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#020617' }, headerTintColor: '#f8fafc' }}>
      <Stack.Screen name="NewsCategory" component={NewsCategoryScreen} options={{ title: 'News Feed' }} />
      <Stack.Screen name="NewsReader" component={NewsReaderScreen} options={{ title: 'Read News' }} />
    </Stack.Navigator>
  );
}

export default function UserTabs() {
  const { user } = useAuth();
  const isMinorAccount = user?.role !== 'admin' && !isAdultAccount(user);

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
      <Tab.Screen
        name="Live"
        component={LiveHomeScreen}
        options={{
          title: isMinorAccount ? 'Live (18+)' : 'Live',
          tabBarBadge: isMinorAccount ? '18+' : undefined,
        }}
      />
      <Tab.Screen name="News" component={NewsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
