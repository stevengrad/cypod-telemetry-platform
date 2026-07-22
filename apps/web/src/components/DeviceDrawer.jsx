// cypod-telemetry
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiRequest } from '../api.js';
import { EditTelemetryModal } from './EditTelemetryModal.jsx';

import {
  BatteryIcon,
  ClockIcon,
  CloseIcon,
  MapIcon,
  PlusIcon,
  TemperatureIcon,
} from './Icons.jsx';

import { Sparkline } from './Sparkline.jsx';

function formatDate(value, language) {
  return new Intl.DateTimeFormat(
    language === 'ar' ? 'ar-EG' : 'en-GB',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

function localizedStatus(status, t) {
  return {
    OK: t.statusOK,
    WARN: t.statusWARN,
    FAULT: t.statusFAULT,
    OFFLINE: t.statusOFFLINE,
  }[status];
}

export function DeviceDrawer({
  device,
  token,
  language,
  t,
  onClose,
  onUpdated,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingReading, setEditingReading] =
    useState(null);
const [addingReading, setAddingReading] = useState(false);
  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiRequest(
        `/devices/${encodeURIComponent(
          device.id,
        )}/history?limit=20`,
        {
          method: 'GET',
          token,
          language,
        },
      );

      setHistory(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error &&
          requestError.message
          ? requestError.message
          : t.failed,
      );
    } finally {
      setLoading(false);
    }
  }, [device.id, language, t.failed, token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const batteryTrend = useMemo(
    () => history.map((item) => item.battery),
    [history],
  );

  const temperatureTrend = useMemo(
    () =>
      history.map((item) => item.temperature),
    [history],
  );

  const latest = device.latest;

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className="device-drawer"
        role="dialog"
        aria-modal="true"
      >
        <header className="drawer-header">
          <div>
            <span className="device-id-chip">
              {device.id}
            </span>

            <h2>{device.name}</h2>

            <p>
              {device.model} · {device.site} ·{' '}
              {device.connectivity}
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t.close}
          >
            <CloseIcon />
          </button>
        </header>

        {latest && (
          <div className="detail-summary-grid">
            <article>
              <BatteryIcon />

              <span>{t.battery}</span>

              <strong>{latest.battery}%</strong>

              <Sparkline values={batteryTrend} />
            </article>

            <article>
              <TemperatureIcon />

              <span>{t.temperature}</span>

              <strong>
                {latest.temperature}°C
              </strong>

              <Sparkline
                values={temperatureTrend}
              />
            </article>

            <article>
              <MapIcon />

              <span>{t.location}</span>

              <strong className="location-value">
               {Number(latest.lat).toFixed(4)},{' '} ,{Number(latest.lng).toFixed(4)}
              </strong>
            </article>

            <article>
              <ClockIcon />

              <span>{t.status}</span>

              <strong
                className={`status-text status-${latest.status.toLowerCase()}`}
              >
                {localizedStatus(
                  latest.status,
                  t,
                )}
              </strong>
            </article>
          </div>
        )}

        <section className="history-section">
          <div className="section-heading compact">
  <div>
    <h3>{t.recentHistory}</h3>
    <p>{t.recentHistorySubtitle}</p>
  </div>

  <div className="history-heading-actions">
    <span className="count-chip">
      {history.length} {t.readings}
    </span>

    <button
      type="button"
      className="secondary-button add-reading-button"
      onClick={() =>
        setAddingReading(true)
      }
    >
      <PlusIcon />
      {t.addReading}
    </button>
  </div>
</div>

          {loading ? (
            <div className="panel-state">
              {t.loading}
            </div>
          ) : error ? (
            <div className="panel-state error-state">
              {error}
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <article
                  className="history-row"
                  key={item.id}
                >
                  <span
                    className={`status-beacon status-${item.status.toLowerCase()}`}
                  />

                  <div className="history-main">
                    <div className="history-title-line">
                      <strong>
                        {localizedStatus(
                          item.status,
                          t,
                        )}
                      </strong>

                      <button
                        type="button"
                        className="edit-reading-button"
                        onClick={() =>
                          setEditingReading(item)
                        }
                      >
                        {t.edit}
                      </button>
                    </div>

                    <span>
                      {formatDate(
                        item.timestamp,
                        language,
                      )}
                    </span>
                  </div>

                  <div className="history-metric">
                    <BatteryIcon />

                    <span>{item.battery}%</span>
                  </div>

                  <div className="history-metric">
                    <TemperatureIcon />

                    <span>
                      {item.temperature}°C
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>

      {editingReading && (
        <EditTelemetryModal
          deviceId={device.id}
          reading={editingReading}
          token={token}
          language={language}
          t={t}
          onClose={() =>
            setEditingReading(null)
          }
          onSaved={async () => {
            await loadHistory();

            if (onUpdated) {
              await onUpdated();
            }
          }}
        />
      )}
      {addingReading && (
  <EditTelemetryModal
    deviceId={device.id}
    reading={null}
    token={token}
    language={language}
    t={t}
    onClose={() =>
      setAddingReading(false)
    }
    onSaved={async () => {
      await loadHistory();

      if (onUpdated) {
        await onUpdated();
      }
    }}
  />
)}
    </div>
  );
}