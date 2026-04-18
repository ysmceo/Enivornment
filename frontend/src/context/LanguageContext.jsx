import { createContext, useContext, useMemo, useState } from 'react'

const LanguageContext = createContext(null)

const dictionaries = {
  en: {
    languageLabel: 'Language',
    emergencyDirectory: 'Emergency Directory',
    quickDialDirectory: 'Verified Emergency Directory',
    quickDialDescription: 'Official state-level emergency contacts managed by authorized civic admins.',
    regionLabel: 'Nigerian State / Region',
    searchAuthorities: 'Search authorities, agency, or phone',
    authorityTypeLabel: 'Authority type',
    allStates: 'All states',
    allRegions: 'All regions',
    allAuthorities: 'All authorities',
    detectMyLocation: 'Detect my location',
    gpsDetectedState: 'Detected state',
    nearbyFirst: 'Nearby authorities are prioritized first',
    stateSectionTitle: 'Emergency Authorities by State',
    quickDialHint: 'Auto-suggest is enabled. Tap any number for one-click calling.',
    loadingContacts: 'Loading contacts…',
    noContacts: 'No verified contacts currently listed for this state.',
    noMatch: 'No matching authorities found.',
    citizenDashboard: 'Citizen Safety Dashboard',
    submitReport: 'Submit Incident Report',
    offlineQueued: 'Offline mode: report queued and will auto-sync once connection is restored.',
    offlineMediaResubmit: 'Offline queue currently supports text/location data only. Please resubmit media when online.',
    syncNow: 'Sync queued reports now',
    queuedReports: 'Queued offline reports',
  },
  yo: {
    languageLabel: 'Ede',
    emergencyDirectory: 'Atokọ Pajawiri',
    quickDialDirectory: 'Atokọ Pajawiri To Ni Ijeri',
    quickDialDescription: 'Awọn nọmba pajawiri osise ti awọn alakoso to ni aṣẹ n ṣakoso.',
    regionLabel: 'Ipinle / Agbegbe Naijiria',
    searchAuthorities: 'Wa ile-iṣẹ, alaṣẹ, tabi nọmba foonu',
    authorityTypeLabel: 'Iru Alaṣẹ',
    allStates: 'Gbogbo ipinle',
    allRegions: 'Gbogbo agbegbe',
    allAuthorities: 'Gbogbo alaṣẹ',
    detectMyLocation: 'Wa ipo mi',
    gpsDetectedState: 'Ipinle ti a ri',
    nearbyFirst: 'Akọkọ ni a fihan awọn alaṣẹ to sunmọ ọ',
    stateSectionTitle: 'Awọn Alaṣẹ Pajawiri Gẹgẹ bi Ipinle',
    quickDialHint: 'Imọran aifọwọyi wa. Tẹ nọmba fun ipe taara.',
    loadingContacts: 'N gba awọn olubasọrọ…',
    noContacts: 'Ko si olubasọrọ to ni ijẹrisi fun ipinle yii.',
    noMatch: 'Ko si ile-iṣẹ to baamu.',
    citizenDashboard: 'Dasibodu Aabo Araalu',
    submitReport: 'Fi Iroyin Isẹlẹ Ranṣẹ',
    offlineQueued: 'Ipo aisi intanẹẹti: a ti fi iroyin pamọ, yoo si ṣe amuṣiṣẹpọ laifọwọyi.',
    offlineMediaResubmit: 'Offline queue currently supports text/location data only. Please resubmit media when online.',
    syncNow: 'Mu iroyin ti a pamọ ṣiṣẹ bayi',
    queuedReports: 'Awọn iroyin aisi intanẹẹti to wa ni pamọ',
  },
  ig: {
    languageLabel: 'Asụsụ',
    emergencyDirectory: 'Ndepụta Mberede',
    quickDialDirectory: 'Ndepụta Mberede Ekwenyere',
    quickDialDescription: 'Nọmba mberede steeti ndị nchịkwa kwadoro na-elekọta.',
    regionLabel: 'Steeti / Mpaghara Naịjirịa',
    searchAuthorities: 'Chọọ ụlọọrụ, ndị ọchịchị, ma ọ bụ ekwentị',
    authorityTypeLabel: 'Ụdị ọchịchị',
    allStates: 'Steeti niile',
    allRegions: 'Mpaghara niile',
    allAuthorities: 'Ndị ọchịchị niile',
    detectMyLocation: 'Chọpụta ọnọdụ m',
    gpsDetectedState: 'Steeti achọpụtara',
    nearbyFirst: 'A na-ebute ndị ọchịchị kacha nso n’elu',
    stateSectionTitle: 'Ndị Ọrụ Mberede Site na Steeti',
    quickDialHint: 'A na-enye aro ozugbo. Pịa nọmba ọ bụla maka oku ozugbo.',
    loadingContacts: 'Na-ebudata kọntaktị…',
    noContacts: 'Enweghị kọntaktị e kwadoro maka steeti a ugbu a.',
    noMatch: 'Enweghị ụlọọrụ dabara.',
    citizenDashboard: 'Dashboard Nchekwa Ndị Obodo',
    submitReport: 'Zipu Akụkọ Ihe Merenụ',
    offlineQueued: 'Ọnọdụ offline: echekwara akụkọ, a ga-emekọrịta ya ozugbo netwọk laghachiri.',
    offlineMediaResubmit: 'Offline queue currently supports text/location data only. Please resubmit media when online.',
    syncNow: 'Mekọrịta akụkọ echekwara ugbu a',
    queuedReports: 'Akụkọ echekwara offline',
  },
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('cr_lang') || 'en')

  const value = useMemo(() => {
    const dictionary = dictionaries[language] || dictionaries.en
    return {
      language,
      setLanguage: (next) => {
        setLanguage(next)
        localStorage.setItem('cr_lang', next)
      },
      t: (key, fallback = '') => dictionary[key] || fallback || key,
      supportedLanguages: [
        { code: 'en', label: 'English' },
        { code: 'yo', label: 'Yorùbá' },
        { code: 'ig', label: 'Igbo' },
      ],
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
