import React, { useEffect, useState } from 'react';
import AuthStack from './AuthStack';
import UserTabs from './UserTabs';
import AdminTabs from './AdminTabs';
import { useAuth } from '../context/AuthContext';
import StartupSplash from '../components/StartupSplash';

export default function RootNavigator() {
  const { bootstrapping, isAuthenticated, isAdmin } = useAuth();
  const [showBrandSplash, setShowBrandSplash] = useState(true);

  useEffect(() => {
    if (bootstrapping) return undefined;
    const timer = setTimeout(() => setShowBrandSplash(false), 1800);
    return () => clearTimeout(timer);
  }, [bootstrapping]);

  if (bootstrapping || showBrandSplash) return <StartupSplash loading={bootstrapping} />;

  if (!isAuthenticated) return <AuthStack />;
  if (isAdmin) return <AdminTabs />;
  return <UserTabs />;
}
