// cypod-telemetry
import { config } from '../config/index.js';

export function deriveTelemetryStatus(reading) {
  const battery = Number(reading.battery);
  const temperature = Number(reading.temperature);

  if (temperature > config.TEMP_CEILING_TLM7) {
    return 'FAULT';
  }

  if (battery < 15) {
    return 'WARN';
  }

  return 'OK';
}

export function deriveAlertConditions(latest) {
  const highTemperature =
    latest.temperature > config.TEMP_CEILING_TLM7;

  return {
    LOW_BATTERY: {
      active: latest.battery < 15,
      messageKey: 'alertLowBattery',
      observed: latest.battery,
      threshold: 15,
    },

    HIGH_TEMPERATURE: {
      active: highTemperature,
      messageKey: 'alertHighTemperature',
      observed: latest.temperature,
      threshold: config.TEMP_CEILING_TLM7,
    },

    /*
     * High temperature already has its own alert.
     * This avoids creating two alerts for the same issue.
     */
    DEVICE_FAULT: {
      active:
        latest.status === 'FAULT' &&
        !highTemperature,
      messageKey: 'alertDeviceFault',
      observed: null,
      threshold: null,
    },
  };
}