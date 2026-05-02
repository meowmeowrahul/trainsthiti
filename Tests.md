# QA Test Plan and Execution Log

Date: 2026-05-02
Tester: GitHub Copilot (advanced QA)
Environment: Linux, local workspace, MongoDB running, sudo available

## Scope

- Detection scripts: payload structure and scanning behavior
- Backend: crowd estimation, user auth, cron grouping, API endpoints
- Frontend: polling cadence and error handling
- Usability and field validation procedures

## Automated Tests

### Backend Unit Tests (Jest)

- Crowd estimation formula and boundaries: [backend/tests/crowdController.unit.test.js](backend/tests/crowdController.unit.test.js)
- User auth hashing and login behavior: [backend/tests/userController.unit.test.js](backend/tests/userController.unit.test.js)
- Detection payload contract: [backend/tests/scan.unit.test.js](backend/tests/scan.unit.test.js)

### Backend Integration Tests (Jest + Supertest + MongoDB Memory)

- Crowd API pipeline and persistence: [backend/tests/crowdRoutes.int.test.js](backend/tests/crowdRoutes.int.test.js)

### Frontend Unit Tests (Vitest + React Testing Library)

- Context polling and error propagation: [frontend/src/**tests**/Context.test.jsx](frontend/src/__tests__/Context.test.jsx)

## Manual Tests

### Detection Script Behavior

- Goal: verify Wi-Fi/Bluetooth scans produce payload fields and logical density classification.
- Script: [detection/scan.sh](detection/scan.sh)
- Steps:
  1. Run `sudo ./detection/scan.sh` on a Linux device with Wi-Fi/Bluetooth enabled.
  2. Observe terminal output and confirm reported counts are non-negative.
  3. Verify JSON payload includes `clients`, `bt_devices`, `density`, `timestamp`.
  4. Confirm density mapping: clients < 20 => low; 20-59 => medium; >= 60 => high.
- Expected: valid payload fields, counts are plausible, script posts to API and cleans files on HTTP 200.

### Cron Hourly Grouping

- Goal: validate hourly aggregation moves logs into grouped storage.
- Reference: [backend/index.js](backend/index.js)
- Steps:
  1. Insert sample logs in `crowdLogs` with timestamps within the last hour.
  2. Invoke `appendToGroup` manually for `Date.now() - 60*60*1000`.
  3. Confirm grouped collection receives archived logs and `crowdLogs` is cleared.
- Expected: grouped store contains data; recent logs cleared.

### Backend-to-Frontend Communication

- Goal: verify frontend polls and updates every ~5s.
- Reference: [frontend/src/Context.jsx](frontend/src/Context.jsx)
- Steps:
  1. Start backend and frontend.
  2. Observe network calls to `/api/crowd/latest` and `/api/crowd/past`.
  3. Confirm refresh interval ~5000 ms.
- Expected: continuous polling with no errors.

### Usability Checks

- Dashboard should show current crowd level, last sync, crowd estimate, and history.
- Mobile view should render without overflow and controls remain reachable.
- Crowd level indicators should be clear and distinguishable.

### Environmental Reliability

- Compare observed counts against physical headcounts under RF noise.
- Record differences and note where discoverable radios underreport.

### Heuristic Calibration

- Process: vary multipliers (2, 3) and weights (0.7, 0.3) using field data; re-run estimation and compare accuracy vs manual counts.

## Execution Log

### Backend Tests

- Command: `cd backend && npm test`
- Result: 10 passed

### Frontend Tests

- Command: `cd frontend && npm test`
- Result: 2 passed

### Manual Tests

- Detection script run: completed with warnings (re-run)
  - Result: `Sent: 20 clients, 2 BT, medium density → HTTP 200` and files cleaned.
  - Observations: `bluetoothctl` reported `Failed to stop discovery: org.bluez.Error.Failed`; `airmon-ng` flagged NetworkManager/wpa_supplicant as interfering.
  - Outcome: payload created and successfully posted to backend.
- Cron grouping: failed (see Defects)
  - Result: `Hourly summary stored: 2 groups`, then `GroupDB insert error- BSONError: Cannot convert circular structure to BSON`.
  - Counts after run: `logCount 2`, `groupCount 0`.
- UI/UX checks: completed on desktop
  - Result: dashboard loaded, nav anchors visible, refresh available.
  - Live values populated from backend (crowd level `Low`, estimate `23`, Wi-Fi clients `15`, BT devices `2`).
  - History showed empty state (no past data in current hour).

## Defects and Follow-ups

- Resolved: invalid password returned 200 (fixed by awaiting bcrypt compare).
  - Location: [backend/controllers/userController.js](backend/controllers/userController.js)
- Bug: hourly grouping insert fails due to BSON circular structure (cursor inserted directly).
  - Location: [backend/controllers/crowdController.js](backend/controllers/crowdController.js)
  - Impact: hourly logs are not archived and `crowdLogs` is not cleared.
  - Suggested fix: insert `result` array, not the cursor, and handle empty data.
- Issue: scan POST returned HTTP 000 during manual run (backend not reachable).
  - Location: [detection/scan.sh](detection/scan.sh)
  - Impact: scan logs kept, no telemetry persisted.
