// cypod-telemetry
import { config } from '../config/index.js';

export function deriveAlertConditions(latest) {
  return {
    LOW_BATTERY: { active: latest.battery < 15, messageKey: 'alertLowBattery', observed: latest.battery, threshold: 15 },
    HIGH_TEMPERATURE: { active: latest.temperature > config.TEMP_CEILING_TLM7, messageKey: 'alertHighTemperature', observed: latest.temperature, threshold: config.TEMP_CEILING_TLM7 },
    DEVICE_FAULT: { active: latest.status === 'FAULT', messageKey: 'alertDeviceFault', observed: null, threshold: null },
  };
}
