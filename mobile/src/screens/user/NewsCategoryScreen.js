import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import useApiResource from '../../hooks/useApiResource';
import api from '../../services/api';

export default function NewsCategoryScreen({ navigation }) {
  const { data, loading, error } = useApiResource(async () => {
    const res = await api.get('/meta/news?ngCategory=all&limit=12');
    return res.data;
  }, []);

  const world = data?.news?.world || [];

  return (
    <ScreenContainer title="News" subtitle="Category feed mirrored from web backend.">
      {loading ? <ActivityIndicator color="#22d3ee" /> : null}
      {error ? <Text style={{ color: '#f87171' }}>{error}</Text> : null}
      {world.map((item, idx) => (
        <TouchableOpacity
          key={`${item?.url || idx}`}
          onPress={() => navigation.navigate('NewsReader', { article: item })}
          style={{ backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 12, marginBottom: 8 }}
        >
          <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{item?.title || 'Untitled'}</Text>
          <Text style={{ color: '#94a3b8', marginTop: 4 }}>{item?.source || 'News'}</Text>
        </TouchableOpacity>
      ))}
    </ScreenContainer>
  );
}
