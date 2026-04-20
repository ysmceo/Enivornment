import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function AudioTranslator() {
  const { supportedLanguages, t } = useLanguage();
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('yo');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [recording, setRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Speech-to-text (Web Speech API)
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const rec = new window.webkitSpeechRecognition();
    rec.lang = sourceLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      setRecording(false);
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
    rec.start();
    setRecognition(rec);
    setRecording(true);
  };
  const stopRecording = () => {
    if (recognition) recognition.stop();
    setRecording(false);
  };

  // Dummy translation (replace with real API)
  const handleTranslate = () => {
    if (sourceLang === targetLang) {
      setOutput(input);
    } else {
      setOutput(`[${targetLang}] ${input}`);
    }
  };

  // Text-to-speech
  const speak = () => {
    if (!window.speechSynthesis) return;
    const utter = new window.SpeechSynthesisUtterance(output);
    utter.lang = targetLang;
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 mt-8">
      <h2 className="text-xl font-bold mb-4 text-indigo-700">{t('audioTranslator', 'Audio Translator')}</h2>
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
      <div className="flex gap-2 mb-3">
        <button className={`btn-secondary flex-1 ${recording ? 'bg-red-100 text-red-600' : ''}`} onClick={recording ? stopRecording : startRecording}>
          {recording ? t('stopRecording', 'Stop Recording') : t('startRecording', 'Start Recording')}
        </button>
        <button className="btn-secondary flex-1" onClick={() => setInput('')}>{t('clear', 'Clear')}</button>
      </div>
      <textarea
        className="input w-full mb-3"
        rows={3}
        placeholder={t('speakOrType', 'Speak or type text...')}
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <button className="btn-primary w-full mb-3" onClick={handleTranslate}>{t('translate', 'Translate')}</button>
      <textarea
        className="input w-full bg-indigo-50"
        rows={3}
        value={output}
        readOnly
      />
      <button className="btn-secondary w-full mt-2" onClick={speak}>{t('playAudio', 'Play Audio')}</button>
    </div>
  );
}
