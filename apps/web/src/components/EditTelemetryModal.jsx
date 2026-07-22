// cypod-telemetry
import { useState } from 'react';
import { apiRequest } from '../api.js';
import { CloseIcon } from './Icons.jsx';

function toLocalDateTime(value) {
  const date = new Date(value);

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000,
  );

  return localDate
    .toISOString()
    .slice(0, 19);
}

function createInitialForm(reading) {
  if (reading) {
    return {
      battery: reading.battery,
      temperature: reading.temperature,
      lat: reading.lat,
      lng: reading.lng,
      timestamp: toLocalDateTime(
        reading.timestamp,
      ),
    };
  }

  return {
    battery: 100,
    temperature: 25,
    lat: 30.0444,
    lng: 31.2357,
    timestamp: toLocalDateTime(new Date()),
  };
}

export function EditTelemetryModal({
  deviceId,
  reading,
  token,
  language,
  t,
  onClose,
  onSaved,
}) {
  const isCreating = !reading;

  const [form, setForm] = useState(() =>
    createInitialForm(reading),
  );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState('');

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setSaving(true);
    setError('');

    try {
      const path = isCreating
        ? `/devices/${encodeURIComponent(
            deviceId,
          )}/telemetry`
        : `/devices/${encodeURIComponent(
            deviceId,
          )}/telemetry/${encodeURIComponent(
            reading.id,
          )}`;

      const response = await apiRequest(path, {
        method: isCreating ? 'POST' : 'PUT',
        token,
        language,
        body: JSON.stringify({
          battery: Number(form.battery),
          temperature: Number(
            form.temperature,
          ),
          lat: Number(form.lat),
          lng: Number(form.lng),

          /*
           * Validation requires a status value.
           * The backend recalculates it for manual
           * creation and editing.
           */
          status: reading?.status || 'OK',

          timestamp: new Date(
            form.timestamp,
          ).toISOString(),

          manual: isCreating,
        }),
      });

      await onSaved(response);
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error &&
          requestError.message
          ? requestError.message
          : t.failed,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop telemetry-edit-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="modal-card telemetry-edit-modal"
        role="dialog"
        aria-modal="true"
      >
        <header>
          <div>
            <h2>
              {isCreating
                ? t.addTelemetryTitle
                : t.editTelemetryTitle}
            </h2>

            <p>
              {deviceId}
              {!isCreating && ` · #${reading.id}`}
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

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form
          className="telemetry-edit-form"
          onSubmit={submit}
        >
          <label>
            <span>{t.battery}</span>

            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.battery}
              onChange={(event) =>
                updateField(
                  'battery',
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            <span>{t.temperature}</span>

            <input
              type="number"
              min="-50"
              max="100"
              step="0.1"
              value={form.temperature}
              onChange={(event) =>
                updateField(
                  'temperature',
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            <span>{t.latitude}</span>

            <input
              type="number"
              min="-90"
              max="90"
              step="0.000001"
              value={form.lat}
              onChange={(event) =>
                updateField(
                  'lat',
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label>
            <span>{t.longitude}</span>

            <input
              type="number"
              min="-180"
              max="180"
              step="0.000001"
              value={form.lng}
              onChange={(event) =>
                updateField(
                  'lng',
                  event.target.value,
                )
              }
              required
            />
          </label>

          <label className="full-width">
            <span>{t.recorded}</span>

            <input
              type="datetime-local"
              step="1"
              value={form.timestamp}
              onChange={(event) =>
                updateField(
                  'timestamp',
                  event.target.value,
                )
              }
              required
            />
          </label>

          <p className="edit-telemetry-note full-width">
            {t.statusCalculatedAutomatically}
          </p>

          <footer className="full-width">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              {t.cancel}
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? t.saving
                : isCreating
                  ? t.addReading
                  : t.saveChanges}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}