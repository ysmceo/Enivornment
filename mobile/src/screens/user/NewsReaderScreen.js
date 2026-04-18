import React from 'react';
import { Linking, Text, TouchableOpacity } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';

export default function NewsReaderScreen({ route }) {
  const article = route?.params?.article;

  return (
    <ScreenContainer title="News Reader" subtitle={article?.source || 'Article detail'}>
      <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 20 }}>{article?.title || 'No article selected'}</Text>
      <Text style={{ color: '#cbd5e1', marginTop: 10, lineHeight: 22 }}>{article?.description || 'Open source article for full content.'}</Text>
      {article?.url ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(article.url)}
          style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#0ea5e9' }}
        >
          <Text style={{ color: '#082f49', fontWeight: '800' }}>Open original article</Text>
        </TouchableOpacity>
      ) : null}
    </ScreenContainer>
  );
}
