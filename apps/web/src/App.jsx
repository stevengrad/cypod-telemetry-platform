// cypod-telemetry
import { useEffect, useMemo, useState } from 'react';
import { AuthScreen } from './components/AuthScreen.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { dictionaries } from './i18n/index.js';

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('telemetry-language') || 'en');
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem('telemetry-session')) || null; } catch { return null; } });
  const t = useMemo(() => dictionaries[language], [language]);
  useEffect(() => { localStorage.setItem('telemetry-language', language); document.documentElement.lang = language; document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'; document.title = t.appName; }, [language, t.appName]);
  function authenticate(token, user) { const next = { token, user }; localStorage.setItem('telemetry-session', JSON.stringify(next)); setSession(next); }
  function logout() { localStorage.removeItem('telemetry-session'); setSession(null); }
  return session ? <Dashboard token={session.token} user={session.user} language={language} t={t} onLanguageChange={setLanguage} onLogout={logout} /> : <AuthScreen language={language} t={t} onLanguageChange={setLanguage} onAuthenticated={authenticate} />;
}
