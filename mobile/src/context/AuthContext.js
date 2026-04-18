import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [loading, setLoading] = useState(false);

  const hydrate = async () => {
    const [storedToken, storedUser] = await AsyncStorage.multiGet(['cr_token', 'cr_user']);
    const tokenValue = storedToken[1];
    const userValue = storedUser[1];
    if (tokenValue && userValue) {
      setToken(tokenValue);
      setUser(JSON.parse(userValue));
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        await AsyncStorage.setItem('cr_user', JSON.stringify(res.data.user));
      } catch {
        await AsyncStorage.multiRemove(['cr_token', 'cr_user']);
        setToken(null);
        setUser(null);
      }
    }
    setBootstrapping(false);
  };

  useEffect(() => {
    hydrate();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const nextToken = res.data.token;
      const nextUser = res.data.user;
      await AsyncStorage.multiSet([
        ['cr_token', nextToken],
        ['cr_user', JSON.stringify(nextUser)],
      ]);
      setToken(nextToken);
      setUser(nextUser);
      return { success: true };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', payload);
      const nextToken = res.data.token;
      const nextUser = res.data.user;
      await AsyncStorage.multiSet([
        ['cr_token', nextToken],
        ['cr_user', JSON.stringify(nextUser)],
      ]);
      setToken(nextToken);
      setUser(nextUser);
      return { success: true };
    } catch (err) {
      return { success: false, message: err?.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // no-op
    }
    await AsyncStorage.multiRemove(['cr_token', 'cr_user']);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      bootstrapping,
      loading,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === 'admin',
      verified: user?.idVerificationStatus === 'verified',
      login,
      register,
      logout,
    }),
    [user, token, bootstrapping, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
