// cypod-telemetry
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import { BatteryIcon, ClockIcon, CloseIcon, MapIcon, TemperatureIcon } from './Icons.jsx';
import { Sparkline } from './Sparkline.jsx';

function formatDate(value, language) { return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function localizedStatus(status, t) { return ({ OK: t.statusOK, WARN: t.statusWARN, FAULT: t.statusFAULT, OFFLINE: t.statusOFFLINE })[status]; }

export function DeviceDrawer({ device, token, language, t, onClose }) {
  const [history, setHistory] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { setLoading(true); apiRequest(`/devices/${encodeURIComponent(device.id)}/history?limit=20`, { method: 'GET', token, language }).then((response) => setHistory(response.data)).catch((requestError) => setError(requestError instanceof Error && requestError.message ? requestError.message : t.failed)).finally(() => setLoading(false)); }, [device.id, language, t.failed, token]);
  const batteryTrend = useMemo(() => history.map((item) => item.battery), [history]); const temperatureTrend = useMemo(() => history.map((item) => item.temperature), [history]); const latest = device.latest;
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="device-drawer" role="dialog" aria-modal="true">
    <header className="drawer-header"><div><span className="device-id-chip">{device.id}</span><h2>{device.name}</h2><p>{device.model} · {device.site} · {device.connectivity}</p></div><button className="icon-button" onClick={onClose} aria-label={t.close}><CloseIcon /></button></header>
    {latest && <div className="detail-summary-grid"><article><BatteryIcon/><span>{t.battery}</span><strong>{latest.battery}%</strong><Sparkline values={batteryTrend}/></article><article><TemperatureIcon/><span>{t.temperature}</span><strong>{latest.temperature}°C</strong><Sparkline values={temperatureTrend}/></article><article><MapIcon/><span>{t.location}</span><strong className="location-value">{latest.lat.toFixed(4)}, {latest.lng.toFixed(4)}</strong></article><article><ClockIcon/><span>{t.status}</span><strong className={`status-text status-${latest.status.toLowerCase()}`}>{localizedStatus(latest.status, t)}</strong></article></div>}
    <section className="history-section"><div className="section-heading compact"><div><h3>{t.recentHistory}</h3><p>{t.recentHistorySubtitle}</p></div><span className="count-chip">{history.length} {t.readings}</span></div>{loading ? <div className="panel-state">{t.loading}</div> : error ? <div className="panel-state error-state">{error}</div> : <div className="history-list">{history.map((item) => <article className="history-row" key={item.id}><span className={`status-beacon status-${item.status.toLowerCase()}`}/><div className="history-main"><strong>{localizedStatus(item.status,t)}</strong><span>{formatDate(item.timestamp,language)}</span></div><div className="history-metric"><BatteryIcon/><span>{item.battery}%</span></div><div className="history-metric"><TemperatureIcon/><span>{item.temperature}°C</span></div></article>)}</div>}</section>
  </aside></div>;
}
