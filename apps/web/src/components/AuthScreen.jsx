// cypod-telemetry
import { useState } from 'react';
import { apiRequest } from '../api.js';
import { ActivityIcon, DatabaseIcon, ShieldIcon } from './Icons.jsx';

export function AuthScreen({ language, t, onLanguageChange, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function fillDemo() { setMode('login'); setEmail(t.demoEmail); setPassword(t.demoPassword); setError(''); }
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const body = mode === 'register' ? { name, email, password } : { email, password };
      const response = await apiRequest(`/auth/${mode}`, { method: 'POST', language, body: JSON.stringify(body) });
      onAuthenticated(response.token, response.user);
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message ? requestError.message : t.failed);
    } finally { setLoading(false); }
  }

  return <main className="auth-shell">
    <section className="auth-visual">
      <div className="brand-lockup"><span className="brand-mark"><ActivityIcon /></span><div><strong>{t.appName}</strong><small>{t.appTagline}</small></div></div>
      <div className="auth-hero-copy"><span className="eyebrow"><span className="live-dot" />{t.livePolling}</span><h1>{mode === 'login' ? t.loginSubtitle : t.registerSubtitle}</h1><div className="auth-proof-grid"><div><ShieldIcon /><span>{t.secureSession}</span></div><div><DatabaseIcon /><span>{t.cacheReady}</span></div></div></div>
      <div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/><div className="sensor-pulse pulse-one"/><div className="sensor-pulse pulse-two"/><div className="sensor-pulse pulse-three"/>
    </section>
    <section className="auth-panel">
      <div className="language-toggle" aria-label={t.language}><button className={language === 'en' ? 'active' : ''} onClick={() => onLanguageChange('en')}>{t.english}</button><button className={language === 'ar' ? 'active' : ''} onClick={() => onLanguageChange('ar')}>{t.arabic}</button></div>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-heading"><span className="mobile-brand"><ActivityIcon /></span><h2>{mode === 'login' ? t.loginTitle : t.registerTitle}</h2><p>{t.demoHint}</p></div>
        {mode === 'register' && <label><span>{t.name}</span><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" /></label>}
        <label><span>{t.email}</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label><span>{t.password}</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button full-width" disabled={loading}>{loading ? t.loading : mode === 'login' ? t.signIn : t.createAccount}</button>
        <button type="button" className="demo-button" onClick={fillDemo}><strong>{t.demoTitle}</strong><span>{t.useDemo}</span></button>
        <div className="auth-switch"><span>{mode === 'login' ? t.noAccount : t.haveAccount}</span><button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? t.register : t.login}</button></div>
      </form>
    </section>
  </main>;
}
