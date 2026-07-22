// cypod-telemetry
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api.js';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, DeviceIcon, FilterIcon, SearchIcon } from './Icons.jsx';

function statusText(status, t) {
  return ({ AVAILABLE: t.available, ASSIGNED: t.assigned, MAINTENANCE: t.maintenance, RETIRED: t.retired })[status] || status;
}

export function AddDeviceModal({ token, language, t, onClose, onCreated }) {
  const [query, setQuery] = useState({ search: '', site: '', model: '', connectivity: '', status: 'AVAILABLE', page: 1, limit: 12 });
  const [catalog, setCatalog] = useState([]);
  const [filters, setFilters] = useState({ sites: [], models: [], connectivity: [] });
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
        const response = await apiRequest(`/device-catalog?${params}`, { method: 'GET', token, language });
        setCatalog(response.devices); setFilters(response.filters); setPagination(response.pagination);
      } catch (requestError) {
        setError(requestError instanceof Error && requestError.message ? requestError.message : t.failed);
      } finally { setLoading(false); }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, token, language, t.failed]);

  const selectedItems = useMemo(() => [...selected.values()], [selected]);
  function patch(changes) { setQuery((current) => ({ ...current, ...changes, page: changes.page || 1 })); }
  function toggle(device) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(device.id)) next.delete(device.id);
      else if (next.size < 20) next.set(device.id, { id: device.id, name: device.defaultName, device });
      return next;
    });
  }
  function rename(id, name) { setSelected((current) => { const next = new Map(current); const item = next.get(id); if (item) next.set(id, { ...item, name }); return next; }); }

  async function submit() {
    if (!selectedItems.length) return;
    setSaving(true); setError('');
    try {
      if (selectedItems.length === 1) {
        await apiRequest('/devices', { method: 'POST', token, language, body: JSON.stringify({ id: selectedItems[0].id, name: selectedItems[0].name }) });
      } else {
        await apiRequest('/devices/bulk', { method: 'POST', token, language, body: JSON.stringify({ devices: selectedItems.map(({ id, name }) => ({ id, name })) }) });
      }
      onCreated(); onClose();
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message ? requestError.message : t.failed);
    } finally { setSaving(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card inventory-modal" role="dialog" aria-modal="true">
      <header><div><h2>{t.addDeviceTitle}</h2><p>{t.addDeviceSubtitle}</p></div><button className="icon-button" onClick={onClose} aria-label={t.close}><CloseIcon /></button></header>

      <div className="inventory-searchbar"><SearchIcon /><input value={query.search} onChange={(e) => patch({ search: e.target.value })} placeholder={t.inventorySearch} autoFocus/><span>{pagination.total} {t.inventoryCount}</span></div>
      <div className="inventory-filters">
        <span className="filter-label"><FilterIcon />{t.clearFilters}</span>
        <select value={query.site} onChange={(e) => patch({ site: e.target.value })}><option value="">{t.allSites}</option>{filters.sites.map((site) => <option key={site} value={site}>{site}</option>)}</select>
        <select value={query.model} onChange={(e) => patch({ model: e.target.value })}><option value="">{t.allModels}</option>{filters.models.map((model) => <option key={model} value={model}>{model}</option>)}</select>
        <select value={query.connectivity} onChange={(e) => patch({ connectivity: e.target.value })}><option value="">{t.allConnectivity}</option>{filters.connectivity.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={query.status} onChange={(e) => patch({ status: e.target.value })}><option value="AVAILABLE">{t.available}</option><option value="MAINTENANCE">{t.maintenance}</option><option value="ASSIGNED">{t.assigned}</option><option value="RETIRED">{t.retired}</option><option value="ALL">{t.all}</option></select>
      </div>

      {error && <div className="form-error">{error}</div>}
      <div className="inventory-body">
        {loading ? <div className="inventory-state">{t.inventoryLoading}</div> : catalog.length === 0 ? <div className="inventory-state">{t.inventoryEmpty}</div> : <div className="inventory-grid">
          {catalog.map((device) => {
            const checked = selected.has(device.id); const disabled = device.lifecycleStatus !== 'AVAILABLE';
            return <article key={device.id} className={`inventory-item ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`} onClick={() => !disabled && toggle(device)}>
              <button className="selection-box" disabled={disabled} aria-label={checked ? t.deselectDevice : t.selectDevice}>{checked ? <CheckIcon /> : null}</button>
              <span className="inventory-device-icon"><DeviceIcon /></span>
              <div className="inventory-item-main"><strong>{device.defaultName}</strong><span>{device.id} · {device.serialNumber}</span><small>{device.model} · {device.site} · {device.connectivity}</small></div>
              <span className={`inventory-status status-${device.lifecycleStatus.toLowerCase()}`}>{statusText(device.lifecycleStatus, t)}</span>
            </article>;
          })}
        </div>}
      </div>

      <div className="inventory-pagination"><button disabled={pagination.page <= 1 || loading} onClick={() => patch({ page: pagination.page - 1 })}><ChevronLeftIcon />{t.previous}</button><span>{t.page} {pagination.page} {t.of} {Math.max(pagination.totalPages, 1)}</span><button disabled={pagination.page >= pagination.totalPages || loading} onClick={() => patch({ page: pagination.page + 1 })}>{t.next}<ChevronRightIcon /></button></div>

      {selectedItems.length > 0 && <section className="selected-devices"><div className="selected-header"><strong>{selectedItems.length} {t.selected}</strong><span>{t.maxSelection}</span></div>{selectedItems.map((item) => <label key={item.id}><span>{item.id}</span><input value={item.name} onChange={(e) => rename(item.id, e.target.value)} aria-label={t.customName}/><button type="button" onClick={() => toggle(item.device)}><CloseIcon /></button></label>)}</section>}

      <footer><button className="secondary-button" onClick={onClose}>{t.cancel}</button><button className="primary-button" disabled={!selectedItems.length || saving} onClick={submit}><CheckIcon />{saving ? t.loading : `${t.addSelected} (${selectedItems.length})`}</button></footer>
    </section>
  </div>;
}
