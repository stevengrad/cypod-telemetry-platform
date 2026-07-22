# Cypod Fleet Telemetry — JavaScript + MySQL

A complete IoT telemetry service and bilingual operations dashboard built from the supplied CYP-1183 specification. The rebuild uses **JavaScript only** (Node.js and React JSX), **MySQL 8.4**, Redis, JWT authentication, Docker Compose, and a searchable inventory-first device registration flow.

## 1- how to run the project

Requirements: Docker Desktop with Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Open **http://localhost:3000** and use:

```text
Email: director.demo@cypod.local
Password: DirectorDemo#2026
```

## 2- Sample-data audit

The supplied file contains **529 rows**. With the documented policy, a clean first import produces:

```json
{
  "total": 529,
  "stored": 519,
  "duplicates": 1,
  "rejected": 9
}
```

1. Invalid Battery Values

What was found

Two readings contained invalid battery percentages:

{
"battery": 127
}

{
"battery": -5
}

A battery percentage must be between 0 and 100.

Decision

Both readings are rejected.

API response

HTTP 422 Unprocessable Entity

{
"success": false,
"error": {
"code": "INVALID_BATTERY",
"message": "Battery must be between 0 and 100."
}
}

2. Impossible Temperature Value

What was found

One reading contained:

{
"temperature": 850,
"status": "FAULT"
}

Decision

The reading is rejected.

API response

HTTP 422 Unprocessable Entity

{
"success": false,
"error": {
"code": "INVALID_TEMPERATURE",
"message": "Temperature is outside the accepted range."
}
}

3. Missing Device Status

What was found

One reading did not contain a status field.

Decision

The reading is rejected.

API response

HTTP 422 Unprocessable Entity

{
"success": false,
"error": {
"code": "INVALID_STATUS",
"message": "Status is required."
}
}

4. Missing GPS Coordinates

What was found

One reading contained:

{
"lat": null,
"lng": null
}

Decision

The reading is rejected.

API response

HTTP 422 Unprocessable Entity

{
"success": false,
"error": {
"code": "INVALID_GPS",
"message": "Valid latitude and longitude are required."
}
}

5. Unknown Device

What was found

Four readings were sent for:

DEV-9999

This device is not registered.

Decision

All four readings are rejected.

6. Battery Supplied as a String

What was found

One reading contained:

{
"battery": "88"
}

The value is a string instead of a number.

Decision

The reading is accepted after safe normalization.

The stored value is:

{
"battery": 88
}

7. Exact Duplicate Reading

What was found

One event was repeated with exactly the same data.

Decision

The repeated request is accepted idempotently, but a second database row is not inserted.

A suitable response is:

HTTP 200 OK

{
"success": true,
"duplicate": true,
"message": "Telemetry event was already processed."
}

8. Client-Supplied received_at

What was found

Many records contained a client-provided received_at field.

Decision

The telemetry reading is accepted, but the supplied value is discarded.

The server creates its own receipt time:

const receivedAt = new Date();

9. Delayed and Out-of-Order Readings

What was found

Several events arrived in a different order from the order in which they were originally recorded.

For example:

10:05 reading received first
10:01 reading received later

Decision

Valid delayed readings are accepted and stored as historical telemetry.

However, an older reading does not replace a newer latest state.

Example

Assume the cache currently contains:

{
"timestamp": "2026-07-21T10:05:00Z",
"battery": 70
}

A buffered reading then arrives:

{
"timestamp": "2026-07-21T10:01:00Z",
"battery": 74
}

The older reading is stored in the database history, but the cache remains unchanged because 10:01 is older than 10:05.

## 3- Rate Limiting and Offline Buffering

Live telemetry uses POST /devices/:id/telemetry and is limited to 10 requests per minute per device. The 11th request returns HTTP 429, which helps protect the API from faulty or compromised devices.

Buffered readings use POST /devices/:id/telemetry/batch, with a maximum of 500 readings per batch. To count as backfill, every reading must be at least two minutes old. Batch requests also have their own limit of two per minute per device.

## 4- Caching

The latest telemetry is cached in Redis for 30 seconds. This keeps dashboard reads fast while limiting how long stale data can remain if the cache is not refreshed.

Whenever a new telemetry event becomes the latest reading, the Redis value is updated immediately, so the system does not wait for the TTL to expire.

The project uses the cache-aside pattern: reads check Redis first, then fall back to MySQL on a cache miss and repopulate the cache.

## 5- Indexes and scaling

The telemetry index on (device_id, recorded_at, id) helps quickly fetch the latest reading and device history. The catalog index improves filtering devices by owner, status, site, and model. Other indexes enforce uniqueness for emails, serial numbers, assignments, and duplicate telemetry.

At 50 million telemetry rows per day, I would keep users, devices, permissions, and alerts in MySQL, but move telemetry to a scalable pipeline using Kafka or Kinesis, object storage, and a time-series or columnar database such as ClickHouse or TimescaleDB. Redis would continue serving the latest device state quickly.

## 6- The three regression tests

Only three tests were selected deliberately:

1. **Dirty sample policy** — asserts the real file remains `519 stored / 1 duplicate / 9 rejected`, including exact rejection categories. This catches accidental validation or deduplication drift.
2. **Live-rate/backfill reconciliation** — proves the eleventh live reading is blocked while an old buffered reading remains backfill-eligible. This protects the most ambiguous requirement in the task.
3. **Cache HIT/MISS path** — proves the first latest-state request reads the database and populates the cache, while the next request is a HIT without another database query.

Run them with:

```bash
docker compose exec api npm test
```

## 7- What I did not get to, and what I would do next

This submission does not include refresh tokens, email verification, per-device cryptographic credentials, WebSocket/SSE push, alert acknowledgement workflows, inventory CSV upload, audit logs, or observability dashboards. Next I would add device-scoped API keys or mutual TLS, a message queue between ingestion and persistence, cursor-based history pagination, Prometheus/OpenTelemetry instrumentation, structured audit events, browser end-to-end tests, and a real external inventory synchronization job. I would also separate migrations from container startup and manage them with a dedicated migration tool.

## Architecture

```text
React dashboard (English / Arabic RTL)
              |
              | /api through Nginx
              v
Node.js + Express API (plain JavaScript)
      |                         |
      | parameterized SQL       | latest-state cache + quotas
      v                         v
MySQL 8.4                    Redis 7
```

MySQL stores users, inventory, registered devices, telemetry, and alert state. Redis stores `latest:<deviceId>` values with a 30-second TTL and rate-limit counters. Nginx serves the React build and proxies `/api` to Express.

All JavaScript/JSX source files begin with the required `// cypod-telemetry` marker. Deliberate task-only trade-offs include `// note:` comments. Commit subjects are prefixed with `[CYP-1183]`.

generated against spec CYP-1183 · build TLM-7Q2
