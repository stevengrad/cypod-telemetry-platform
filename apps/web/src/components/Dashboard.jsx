// cypod-telemetry
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import { AddDeviceModal } from './AddDeviceModal.jsx';
import { DeviceDrawer } from './DeviceDrawer.jsx';
import { ActivityIcon, AlertIcon, BatteryIcon, DeviceIcon, LogoutIcon, PlusIcon, RefreshIcon, SearchIcon, TemperatureIcon } from './Icons.jsx';
function formatDate(value, language) { return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function statusLabel(status, t) { return ({ OK: t.statusOK, WARN: t.statusWARN, FAULT: t.statusFAULT, OFFLINE: t.statusOFFLINE })[status]; }
function healthClass(device) { if (!device.latest) return 'unknown'; if (device.latest.status === 'FAULT' || device.latest.status === 'OFFLINE' || device.activeAlertCount > 0) return 'critical'; if (device.latest.status === 'WARN' || device.latest.battery < 25 || device.latest.temperature > 40) return 'attention'; return 'healthy'; }

export function Dashboard({ token, user, language, t, onLanguageChange, onLogout }) {
  const [devices, setDevices] = useState([]); const [alerts, setAlerts] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null); const [showAddDevice, setShowAddDevice] = useState(false); const [lastUpdated, setLastUpdated] = useState(null); const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState(''); const [healthFilter, setHealthFilter] = useState('all');

  const loadDashboard = useCallback(async (quiet = false) => { if (!quiet) setLoading(true); setIsRefreshing(true); setError(''); try { const [deviceResponse, alertResponse] = await Promise.all([apiRequest('/devices', { method: 'GET', token, language }), apiRequest('/alerts', { method: 'GET', token, language })]); setDevices(deviceResponse.devices); setAlerts(alertResponse.alerts); setLastUpdated(new Date()); setSelectedDevice((current) => current ? deviceResponse.devices.find((device) => device.id === current.id) || null : null); } catch (requestError) { if (requestError?.status === 401) onLogout(); else setError(requestError instanceof Error && requestError.message ? requestError.message : t.failed); } finally { setLoading(false); setIsRefreshing(false); } }, [language, onLogout, t.failed, token]);
  useEffect(() => { loadDashboard(); const interval = window.setInterval(() => loadDashboard(true), 5_000); return () => window.clearInterval(interval); }, [loadDashboard]);

  const summary = useMemo(() => { const withReadings = devices.filter((device) => device.latest); return { healthy: devices.filter((device) => healthClass(device) === 'healthy').length, avgBattery: withReadings.length ? Math.round(withReadings.reduce((total, device) => total + device.latest.battery, 0) / withReadings.length) : 0 }; }, [devices]);
  const filteredDevices = useMemo(() => devices.filter((device) => { const needle = search.trim().toLowerCase(); const matchesSearch = !needle || [device.id, device.name, device.model, device.site, device.serialNumber].some((value) => String(value || '').toLowerCase().includes(needle)); return matchesSearch && (healthFilter === 'all' || healthClass(device) === healthFilter); }), [devices, search, healthFilter]);
  const cards = [{ label: t.totalDevices, value: devices.length, icon: <DeviceIcon/>, tone: 'violet' }, { label: t.onlineDevices, value: summary.healthy, icon: <ActivityIcon/>, tone: 'green' }, { label: t.activeAlerts, value: alerts.length, icon: <AlertIcon/>, tone: 'orange' }, { label: t.avgBattery, value: `${summary.avgBattery}%`, icon: <BatteryIcon/>, tone: 'cyan' }];

  return <main className="dashboard-shell"><aside className="sidebar"><div className="brand-lockup"><span className="brand-mark"><ActivityIcon/></span><div><strong>{t.appName}</strong><small>{t.appTagline}</small></div></div><nav><button className="active"><ActivityIcon/><span>{t.overview}</span></button><button><AlertIcon/><span>{t.alerts}</span><b>{alerts.length}</b></button></nav><div className="sidebar-status"><span className="live-dot"/><div><strong>{t.livePolling}</strong><small>{lastUpdated ? formatDate(lastUpdated.toISOString(), language) : t.loading}</small></div></div><button className="sidebar-logout" onClick={onLogout}><LogoutIcon/><span>{t.logout}</span></button></aside>
    <section className="dashboard-main"><header className="topbar"><div><p className="eyebrow">{t.appTagline}</p><h1>{t.overview}</h1><span>{t.overviewSubtitle}</span></div><div className="topbar-actions"><div className="language-toggle compact-toggle"><button className={language === 'en' ? 'active' : ''} onClick={() => onLanguageChange('en')}>{t.english}</button><button className={language === 'ar' ? 'active' : ''} onClick={() => onLanguageChange('ar')}>{t.arabic}</button></div><button className="secondary-button" onClick={() => loadDashboard()}><RefreshIcon className={isRefreshing ? 'spin' : ''}/>{t.refresh}</button><button className="primary-button" onClick={() => setShowAddDevice(true)}><PlusIcon/>{t.addDevice}</button><div className="avatar" title={user.email}>{user.name?.slice(0,1).toUpperCase() || user.email.slice(0,1).toUpperCase()}</div></div></header>
      {error && <div className="error-banner"><span>{error}</span><button onClick={() => loadDashboard()}>{t.retry}</button></div>}
      <section className="summary-grid">{cards.map((card) => <article className="summary-card" key={card.label}><span className={`summary-icon ${card.tone}`}>{card.icon}</span><div><p>{card.label}</p><strong>{card.value}</strong></div><span className="summary-accent"/></article>)}</section>
      <section className="content-grid"><article className="panel devices-panel"><div className="section-heading"><div><h2>{t.devices}</h2><p>{t.devicesSubtitle}</p></div><span className="count-chip">{filteredDevices.length}/{devices.length}</span></div>
        <div className="fleet-toolbar"><label><SearchIcon/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchFleet}/></label><select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}><option value="all">{t.allStatuses}</option><option value="healthy">{t.healthy}</option><option value="attention">{t.attention}</option><option value="critical">{t.critical}</option><option value="unknown">{t.unknown}</option></select></div>
        {loading ? <div className="panel-state">{t.loading}</div> : filteredDevices.length === 0 ? <div className="panel-state">{t.noDevices}</div> : <div className="device-table-wrap"><table className="device-table"><thead><tr><th>{t.device}</th><th>{t.status}</th><th>{t.battery}</th><th>{t.temperature}</th><th>{t.lastReading}</th></tr></thead><tbody>{filteredDevices.map((device) => { const health = healthClass(device); const latest = device.latest; return <tr key={device.id} onClick={() => setSelectedDevice(device)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter') setSelectedDevice(device); }}><td><div className="device-cell"><span className={`device-symbol ${health}`}><DeviceIcon/></span><div><strong>{device.name}</strong><small>{device.id} · {device.site}</small></div></div></td><td>{latest ? <span className={`status-pill status-${latest.status.toLowerCase()}`}><i/>{statusLabel(latest.status,t)}</span> : <span className="status-pill status-unknown"><i/>{t.unknown}</span>}</td><td>{latest ? <div className="battery-cell"><span>{latest.battery}%</span><div><i style={{ width: `${Math.max(0,Math.min(100,latest.battery))}%` }}/></div></div> : '—'}</td><td>{latest ? <span className="temperature-cell"><TemperatureIcon/>{latest.temperature}°C</span> : '—'}</td><td>{latest ? <span className="time-cell">{formatDate(latest.timestamp,language)}</span> : t.noReadings}</td></tr>; })}</tbody></table></div>}
      </article><article className="panel alerts-panel"><div className="section-heading"><div><h2>{t.alerts}</h2><p>{t.alertsSubtitle}</p></div><span className={`count-chip ${alerts.length ? 'danger' : ''}`}>{alerts.length}</span></div>{alerts.length === 0 ? <div className="empty-alerts"><span><ActivityIcon/></span><strong>{t.healthy}</strong><p>{t.noAlerts}</p></div> : <div className="alert-list">{alerts.map((alert) => <article key={alert.id}><span className="alert-symbol"><AlertIcon/></span><div><strong>{alert.deviceName}</strong><p>{alert.message}</p><small>{formatDate(alert.triggeredAt,language)}</small></div>{alert.observedValue !== null && <b>{alert.observedValue}</b>}</article>)}</div>}</article></section>
    </section>{selectedDevice && (
  <DeviceDrawer
    device={selectedDevice}
    token={token}
    language={language}
    t={t}
    onClose={() => setSelectedDevice(null)}
    onUpdated={() => loadDashboard(true)}
  />
)}

{showAddDevice && (
  <AddDeviceModal
    token={token}
    language={language}
    t={t}
    onClose={() => setShowAddDevice(false)}
    onCreated={async () => {
      await loadDashboard();
      setShowAddDevice(false);
    }}
  />
)}</main>;
}
