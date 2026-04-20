import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import AudioTranslator from '../components/AudioTranslator';

export default function Translator() {
  const { supportedLanguages, t } = useLanguage();
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('yo');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

  // Dummy translation (replace with real API or dictionary)
  const handleTranslate = () => {
    if (sourceLang === targetLang) {
      setOutput(input);
    } else {
      setOutput(`[${targetLang}] ${input}`); // Placeholder
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-6 text-indigo-700">{t('translator', 'Text Translator')}</h1>
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="block text-xs mb-1 font-semibold text-slate-600">{t('sourceLanguage', 'Source Language')}</label>
            <select className="input w-full" value={sourceLang} onChange={e => setSourceLang(e.target.value)}>
              {supportedLanguages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1 font-semibold text-slate-600">{t('targetLanguage', 'Target Language')}</label>
            <select className="input w-full" value={targetLang} onChange={e => setTargetLang(e.target.value)}>
              {supportedLanguages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <textarea
          className="input w-full mb-3"
          rows={4}
          placeholder={t('enterText', 'Enter text to translate...')}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="btn-primary w-full mb-3" onClick={handleTranslate}>{t('translate', 'Translate')}</button>
        <textarea
          className="input w-full bg-indigo-50"
          rows={4}
          value={output}
          readOnly
        />
      </div>
      <AudioTranslator />
    </div>
  );
}
