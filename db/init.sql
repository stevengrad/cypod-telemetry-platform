-- cypod-telemetry
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS device_catalog (
  id VARCHAR(64) NOT NULL,
  inventory_user_id BIGINT UNSIGNED NOT NULL,
  default_name VARCHAR(120) NOT NULL,
  serial_number VARCHAR(100) NOT NULL,
  model VARCHAR(80) NOT NULL,
  site VARCHAR(100) NOT NULL,
  connectivity ENUM('CELLULAR','WIFI','LORA','ETHERNET') NOT NULL,
  lifecycle_status ENUM('AVAILABLE','ASSIGNED','MAINTENANCE','RETIRED') NOT NULL DEFAULT 'AVAILABLE',
  assigned_user_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_serial (serial_number),
  KEY idx_catalog_owner_status (inventory_user_id, lifecycle_status, site, model),
  CONSTRAINT fk_catalog_inventory_user FOREIGN KEY (inventory_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  catalog_id VARCHAR(64) NOT NULL,
  latest_telemetry_id BIGINT UNSIGNED NULL,
  latest_recorded_at DATETIME(3) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_catalog (catalog_id),
  KEY idx_devices_owner (owner_id, created_at),
  CONSTRAINT fk_devices_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_devices_catalog FOREIGN KEY (catalog_id) REFERENCES device_catalog(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS telemetry_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(64) NOT NULL,
  battery DECIMAL(5,2) NOT NULL,
  temperature DECIMAL(7,2) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  status ENUM('OK','WARN','FAULT','OFFLINE') NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  received_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  fingerprint CHAR(64) NOT NULL,
  traffic_class ENUM('LIVE','BACKFILL') NOT NULL DEFAULT 'LIVE',
  PRIMARY KEY (id),
  UNIQUE KEY uq_telemetry_device_fingerprint (device_id, fingerprint),
  KEY idx_telemetry_device_recorded (device_id, recorded_at DESC, id DESC),
  CONSTRAINT fk_telemetry_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE devices
  ADD CONSTRAINT fk_devices_latest_telemetry
  FOREIGN KEY (latest_telemetry_id) REFERENCES telemetry_events(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS alerts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(64) NOT NULL,
  type ENUM('LOW_BATTERY','HIGH_TEMPERATURE','DEVICE_FAULT') NOT NULL,
  message_key VARCHAR(64) NOT NULL,
  observed_value DECIMAL(10,2) NULL,
  threshold_value DECIMAL(10,2) NULL,
  source_telemetry_id BIGINT UNSIGNED NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  opened_at DATETIME(3) NOT NULL,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  resolved_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_alert_device_type (device_id, type),
  KEY idx_alerts_active_device (active, device_id, opened_at DESC),
  CONSTRAINT fk_alert_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_alert_telemetry FOREIGN KEY (source_telemetry_id) REFERENCES telemetry_events(id) ON DELETE SET NULL
) ENGINE=InnoDB;
