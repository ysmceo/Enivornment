

// Dummy user data for demonstration
const user = {
  firstName: 'Leslie',
  lastName: 'Alexander',
  email: 'leslie@gmail.com',
  phone: '+377-439-3159',
  bio: 'Customer Service Manager',
  dob: '10, June 1993',
  gender: 'Female',
  nationalId: '629 956-0129 983-1437',
  country: 'United States',
  city: 'Los Angeles',
  postalCode: '90001',
  taxId: 'BHQ298FSE99',
  isAdult: true, // Change to false for minor account
};

const sidebarMenu = [
  { label: 'Home', icon: '🏠' },
  { label: 'Wallets', icon: '💳' },
  { label: 'Budgets', icon: '📊' },
  { label: 'Goals', icon: '🎯' },
  { label: 'Profile', icon: '👤' },
  { label: 'Analytics', icon: '📈' },
  { label: 'Support', icon: '🛟' },
  { label: 'Affiliate', icon: '🔗' },
  { label: 'Settings', icon: '⚙️' },
];

const settingsTabs = [
  'My Profile',
  'Security Options',
  'Chat',
  'Preferences',
  'Notifications',
];

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

  const [activeSidebar, setActiveSidebar] = useState('Settings');
  const [activeTab, setActiveTab] = useState('My Profile');
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#f4f5fc] flex items-center justify-center p-4">
      <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl flex overflow-hidden">
        {/* Language Selector */}
        <div className="absolute right-8 top-8 z-10">
          <label htmlFor="lang-sel-dashboard" className="sr-only">{t('languageLabel', 'Language')}</label>
          <select
            id="lang-sel-dashboard"
            className="text-xs rounded-lg border border-indigo-300 bg-white text-indigo-700 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label={t('languageLabel', 'Language')}
          >
            {supportedLanguages.map(option => (
              <option key={option.code} value={option.code}>{option.label}</option>
            ))}
          </select>
        </div>
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-100 flex flex-col py-8">
          <div className="px-6 mb-8">
            <div className="font-extrabold text-lg text-slate-800 mb-2">Nexora</div>
            <nav className="space-y-1">
              {sidebarMenu.map((item) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left font-medium ${activeSidebar === item.label ? 'bg-[#f4f5fc] text-indigo-700' : 'text-slate-600 hover:bg-indigo-50'}`}
                  onClick={() => setActiveSidebar(item.label)}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-auto px-6">
            <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left text-rose-600 hover:bg-rose-50 font-medium mb-2">Get Help</button>
            <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-left text-rose-600 hover:bg-rose-50 font-medium">Log Out</button>
          </div>
        </aside>

        {/* Settings Panel */}
        <div className="w-64 bg-[#f8f9fb] border-r border-slate-100 flex flex-col py-8">
          <div className="px-6 mb-6 font-semibold text-slate-700">Settings</div>
          <nav className="flex-1 space-y-1 px-2">
            {settingsTabs.map((tab) => (
              <button
                key={tab}
                className={`w-full text-left px-4 py-2 rounded-lg font-medium ${activeTab === tab ? 'bg-white text-indigo-700 shadow' : 'text-slate-600 hover:bg-indigo-50'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-10 bg-[#f4f5fc]">
          <div className="flex items-center justify-between mb-8">
            <div className="text-2xl font-bold text-slate-800">Profile Information</div>
            <button className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Edit</button>
          </div>
          <div className="bg-white rounded-2xl shadow p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-full bg-slate-200" />
              <div>
                <div className="font-bold text-lg text-slate-800">{user.firstName} {user.lastName}</div>
                <div className="text-slate-500 text-sm">{user.bio}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Personal Details */}
              <section>
                <div className="font-semibold text-slate-700 mb-4">Personal Details</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500 mb-1">First Name</div>
                    <input className="input w-full" value={user.firstName} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Last Name</div>
                    <input className="input w-full" value={user.lastName} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Email address</div>
                    <input className="input w-full" value={user.email} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Phone</div>
                    <input className="input w-full" value={user.phone} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Bio</div>
                    <input className="input w-full" value={user.bio} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Date of Birth</div>
                    <input className="input w-full" value={user.dob} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Gender</div>
                    <input className="input w-full" value={user.gender} readOnly />
                  </div>
                  {user.isAdult && (
                    <>
                      <div>
                        <div className="text-slate-500 mb-1">National ID</div>
                        <input className="input w-full" value={user.nationalId} readOnly />
                      </div>
                    </>
                  )}
                </div>
              </section>
              {/* Address */}
              <section>
                <div className="font-semibold text-slate-700 mb-4">Address</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-slate-500 mb-1">Country</div>
                    <input className="input w-full" value={user.country} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">City/State</div>
                    <input className="input w-full" value={user.city} readOnly />
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Postal Code</div>
                    <input className="input w-full" value={user.postalCode} readOnly />
                  </div>
                  {user.isAdult && (
                    <div>
                      <div className="text-slate-500 mb-1">TAX ID</div>
                      <input className="input w-full" value={user.taxId} readOnly />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
