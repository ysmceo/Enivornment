import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// List of Nigerian languages (ISO 639-1 or custom codes)
export const NIGERIAN_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'ig', name: 'Igbo' },
  { code: 'ha', name: 'Hausa' },
  { code: 'bi', name: 'Bini' },
  { code: 'ef', name: 'Efik' },
  { code: 'ib', name: 'Ibibio' },
  { code: 'ur', name: 'Urhobo' },
  { code: 'it', name: 'Itsekiri' },
  { code: 'ij', name: 'Ijaw' },
  { code: 'ka', name: 'Kanuri' },
  { code: 'tv', name: 'Tiv' },
  { code: 'id', name: 'Idoma' },
  { code: 'nu', name: 'Nupe' },
  { code: 'fu', name: 'Fulfulde' },
  { code: 'go', name: 'Gokana' },
  { code: 'an', name: 'Anang' },
  { code: 'eb', name: 'Ebira' },
  { code: 'an', name: 'Angas' },
  { code: 'ba', name: 'Bachama' },
  { code: 'ba', name: 'Bajju' },
  { code: 'ba', name: 'Bura' },
  { code: 'ba', name: 'Babur' },
  { code: 'ba', name: 'Berom' },
  { code: 'ba', name: 'Bura-Pabir' },
  // Add more as needed
];

const resources = NIGERIAN_LANGUAGES.reduce((acc, lang) => {
  acc[lang.code] = { translation: {} };
  return acc;
}, {});

resources['en'].translation = {
  welcome: 'Welcome',
  dashboard: 'Dashboard',
  admin: 'Admin',
  user: 'User',
  // ...add more keys as needed
};

// Example: Add a few translations for Yoruba, Igbo, Hausa
resources['yo'].translation = {
  welcome: 'Kaabo',
  dashboard: 'Dasibodu',
  admin: 'Alakoso',
  user: 'Olumulo',
};
resources['ig'].translation = {
  welcome: 'Nnọọ',
  dashboard: 'Ụlọ ọrụ',
  admin: 'Onye nchịkwa',
  user: 'Onye ọrụ',
};
resources['ha'].translation = {
  welcome: 'Barka da zuwa',
  dashboard: 'Allon aiki',
  admin: 'Mai Gudanarwa',
  user: 'Mai amfani',
};

// Other languages can be filled in as needed

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
