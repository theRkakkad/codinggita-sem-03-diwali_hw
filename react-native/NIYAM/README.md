# NIYAM <sub>नियम</sub>

### Medication adherence, by discipline.

A full-stack medication companion that turns a prescription into a daily routine — and a daily routine into an honest record. NIYAM schedules doses, reminds you on time, records exactly what happened, and refuses to guess when you are silent.

[![Expo](https://img.shields.io/badge/Expo-58-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.88-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo Router](https://img.shields.io/badge/Expo_Router-58-4630EB?style=for-the-badge&logo=expo&logoColor=white)](https://docs.expo.dev/router/introduction/)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT_%2B_bcrypt-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

---

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Feature Set](#feature-set)
- [Screens & Navigation](#screens--navigation)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Dose Lifecycle](#dose-lifecycle)
- [Adherence Calculation](#adherence-calculation)
- [REST API Reference](#rest-api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Local Reminders & End-of-Day Review](#local-reminders--end-of-day-review)
- [Timezone Handling](#timezone-handling)
- [Testing](#testing)
- [Design System](#design-system)
- [Security Model](#security-model)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Overview

**NIYAM (नियम — "rule, discipline, principle")** is a mobile-first HealthTech application for people managing a medication routine. It is built as two independently runnable applications in a single repository:

```
NIYAM/
├── frontend/   Expo + React Native client (Android, iOS, Web)
└── backend/    Express 5 + MongoDB REST API
```

A medicine is a **routine configuration**. A dose is an **event that actually happened** (or did not). NIYAM keeps those two concepts strictly decoupled: editing a medicine never rewrites history, and a missed confirmation never silently becomes a "taken".

The app covers the full loop:

1. **Define** a medicine — name, dosage, type, frequency, reminder times, date range, optional prescription attachment.
2. **Receive** a local notification at each scheduled time, with `Taken / Snooze / Skip` actions directly on the notification.
3. **Respond** from the dashboard, or review everything unanswered in the End-of-Day screen.
4. **Understand** adherence through a monthly calendar, daily dose history, and live statistics.
5. **Archive** a finished medicine without losing its historical record.

---

## Design Principles

These rules are enforced in code, not just in copy:

| Principle | Implementation |
| :--- | :--- |
| **Silence is never "Taken".** | Only an explicit user action sets `taken`. Nothing is auto-filled. |
| **Silence is never "Missed".** | Past unanswered doses become `unconfirmed`, never `missed`. |
| **"Missed" is a deliberate confirmation.** | `missed` requires an explicit PATCH and may include a reason. |
| **Skipped ≠ Taken.** | Skipped doses count against adherence but are excluded from the taken count. |
| **Routine ≠ History.** | Archiving a medicine preserves all past doses for reports. |
| **No false 100%.** | With zero eligible doses, adherence is `0` (or `null` for month evaluation), never `100%`. |
| **Timezone honesty.** | Every day boundary is computed from the client's `getTimezoneOffset()`, not server time. |
| **Strict ownership isolation.** | Every query is scoped to `req.user.id`; IDs from other users return `404`. |

---

## Feature Set

### Authentication & Profile
- Email/password registration with JWT issuance (bcrypt, 10 salt rounds, 8-character minimum).
- Persistent sessions via **Expo SecureStore** (encrypted native storage; `localStorage` fallback on web).
- Automatic session restoration on launch with token validation against `GET /api/auth/me`.
- Profile editing: display name and avatar (camera or photo library, stored as a base64 URI with a raised 10 MB JSON limit).
- Centralized Axios interceptors: bearer-token injection, multipart header stripping, 401 token purge, and normalized error messages.

### Onboarding
- Animated startup splash that routes to `(tabs)` or `(auth)/welcome` based on session state.
- Three-step onboarding covering organisation, reminders, and adherence.
- Login and registration screens with inline validation.

### Dashboard
- Time-aware greeting and dynamic date header.
- Live adherence ring/counters for today: taken, skipped, missed, pending, unconfirmed.
- **Next dose** card (chronologically nearest upcoming pending dose) and overdue-dose warning.
- Today's schedule with per-dose actions: **Taken**, **Snooze** (5 / 10 / 15 / 30 min), **Skip** (with reason), **Missed** (with reason).
- Pull-to-refresh that also performs day rollover and daily dose synchronization.
- Avatar and date badge in the top bar.

### Medicines
- Full CRUD with search (ReDoS-safe escaped regex) and status filters (`All`, `Active`, `Paused`, `Completed`).
- Rich add/edit form: medicine type (Tablet, Capsule, Syrup, Drops, Injection, Other), dosage presets, instruction presets, frequency-driven reminder-time slots, start/end dates.
- Frequency rules: `Once daily` → 1 time, `Twice daily` → 2 times, `Three times daily` → 3 times, `As needed (PRN)` → no scheduled times.
- Detail view with prescription attachment management and quick actions.
- **Delete = archive by default** (moves to History, purges future pending doses, preserves past doses). Permanent delete is available from History.

### Prescription Attachments
- Upload JPG / JPEG / PNG / PDF up to **5 MB**.
- Server-side validation by extension **and** magic-byte signature — a renamed `.exe` is rejected.
- Private, owner-scoped streaming (`view=1`) and download modes.
- In-app full-screen image viewer and native PDF hand-off (download to device, then open).

### Local Reminders
- `expo-notifications` local scheduling — fully offline, no push server required.
- Android channel: `niyam-medication-reminders`.
- Notification action category with **Taken**, **Snooze**, and **Skip** buttons that deep-link back into the app.
- Date-bounded medicines are scheduled on a rolling **14-day horizon** and topped up on app activity.
- Master reminders toggle, permission handling, and a "Send Test Reminder (5s)" utility.

### End-of-Day Review
- Dedicated modal screen listing today's past doses that are still `pending` or `unconfirmed`.
- Four explicit resolutions: **Taken**, **Skipped**, **Confirmed Missed** (with reason), **Leave Unconfirmed**.
- Summary strip showing counts for each outcome, plus the rule reminder that unconfirmed doses are never counted as missed.
- Configurable daily reminder (default **09:00 PM**) with its own notification ID and deep link.

### Adherence & History
- Interactive monthly calendar with per-day adherence indicators (green / amber / muted red / grey).
- Day selection reveals a chronological dose history card for that date.
- Monthly statistics: scheduled, eligible, taken, skipped, missed, pending, unconfirmed, overall adherence.
- History screen with two tabs: **Discontinued medicines** (restore or delete permanently) and **Dose logs** (filterable by status).

---

## Screens & Navigation

```
app/
├── index.js                 Animated splash → session-aware redirect
├── _layout.js               Root Stack + AuthProvider + notification listeners
├── (auth)/
│   ├── welcome.js           Marketing / entry screen
│   ├── login.js             Sign in
│   ├── register.js          Create account
│   └── onboarding.js        Three-step value tour
├── (tabs)/
│   ├── index.js             Dashboard (today's schedule, adherence, next dose)
│   ├── medicines.js         Medicine list, search, filters, detail sheet
│   ├── calendar.js          Monthly adherence calendar + daily history
│   └── profile.js           Account, avatar, reminder settings, history link
├── history.js               Archived medicines + dose log archive
└── end-of-day.js            Modal end-of-day review
```

A floating, translucent "glass" tab bar sits above the content with safe-area-aware spacing for iOS gestures and Android navigation.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Expo / React Native                      │
│                                                              │
│  Screens ──▶ Context (Auth) ──▶ Services ──▶ Axios instance   │
│     │                            │               │           │
│     │                            ├─ authService │  Bearer JWT │
│     │                            ├─ medicineSvc │  + interceptors
│     │                            ├─ doseEventSvc│           │
│     │                            └─ notificationService      │
│     │                                                        │
│  SecureStore (token)          expo-notifications (local)     │
└───────────────────────────────────┬──────────────────────────┘
                                    │ HTTP / JSON + multipart
                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    Express 5 REST API                        │
│                                                              │
│  Routes ──▶ authMiddleware (JWT) ──▶ Controllers             │
│                                         │                    │
│                                         ├─ Mongoose models   │
│                                         └─ multer uploads    │
│                                                              │
│  MongoDB: users · medicines · doseevents                     │
│  Disk:    uploads/prescriptions (private, owner-scoped)      │
└──────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
| Concern | Choice |
| :--- | :--- |
| Runtime | Expo SDK 58, React Native 0.88, React 19.3 |
| Navigation | Expo Router 58 (file-based, typed stack + tabs) |
| Storage | `expo-secure-store` (native), `localStorage` (web) |
| Networking | Axios with request/response interceptors |
| Notifications | `expo-notifications` (local scheduling + action categories) |
| Media | `expo-image-picker` (camera/library), `expo-document-picker` (PDF) |
| Icons / UI | `@expo/vector-icons`, custom design-system primitives |
| Styling | `StyleSheet` with centralized color, spacing, radius, typography tokens |

### Backend
| Concern | Choice |
| :--- | :--- |
| Runtime | Node.js + Express 5 |
| Database | MongoDB via Mongoose 9 |
| Auth | `jsonwebtoken` (HS256) + `bcryptjs` |
| Uploads | `multer` (disk storage, 5 MB limit, MIME + extension filter) |
| Config | `dotenv` |
| Dev | `nodemon` |

---

## Project Structure

```
NIYAM/
├── backend/
│   ├── config/db.js                  MongoDB connection + lifecycle logging
│   ├── controllers/
│   │   ├── authController.js         register / login / me / profile
│   │   ├── medicineController.js     CRUD, archive, restore
│   │   ├── doseEventController.js    sync, rollover, status transitions
│   │   ├── prescriptionController.js upload, stream, delete + magic bytes
│   │   └── healthController.js       live DB health probe
│   ├── middleware/
│   │   ├── authMiddleware.js         JWT verification
│   │   └── uploadMiddleware.js       multer config + error translation
│   ├── models/
│   │   ├── User.js
│   │   ├── Medicine.js
│   │   └── DoseEvent.js
│   ├── routes/                       auth / medicines / dose-events / health
│   ├── test-*.js                     Integration test suites (see Testing)
│   └── server.js                     App bootstrap + route mounting
│
└── frontend/
    ├── app/                          File-based routes (see Screens)
    ├── components/
    │   ├── ui/                       AppText, AppButton, AppCard, AppInput
    │   ├── medicines/                Form modal, attachment picker, viewer
    │   └── adherence/                Calendar grid, daily history, month stats
    ├── constants/                    colors, typography, spacing, radius, theme
    ├── context/AuthContext.js        Session, login, register, profile update
    ├── services/                     api, auth, medicine, doseEvent, notifications
    ├── utils/adherence.js            Single source of truth for adherence math
    ├── assets/                       Icons, splash artwork
    └── app.json                      Expo configuration
```

---

## Data Model

### User
| Field | Type | Notes |
| :--- | :--- | :--- |
| `name` | String | Required, trimmed |
| `email` | String | Required, lowercase, unique index, regex-validated |
| `passwordHash` | String | bcrypt hash only — plaintext is never stored |
| `avatar` | String \| null | Base64 data URI |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps |

### Medicine
| Field | Type | Notes |
| :--- | :--- | :--- |
| `userId` | ObjectId → User | Required; every query is owner-scoped |
| `name` | String | Required |
| `dosage` | String | Required, e.g. `500mg`, `1 tablet` |
| `type` | Enum | `Tablet`, `Capsule`, `Syrup`, `Drops`, `Injection`, `Other` |
| `instructions` | String | Optional, e.g. "After food" |
| `frequency` | Enum | `Once daily`, `Twice daily`, `Three times daily`, `As needed` |
| `reminderTimes` | [String] | Count validated against frequency; empty for PRN |
| `startDate` | Date | Required |
| `endDate` | Date | Optional; must be ≥ `startDate` |
| `status` | Enum | `Active`, `Paused`, `Completed`, `Archived` |
| `isArchived` | Boolean | Indexed; drives History visibility |
| `archivedAt` | Date \| null | Archive timestamp |
| `prescription` | Object | `fileName`, `mimeType`, `fileType`, `fileSize`, `fileUrl`, `storageKey`, `uploadedAt` |

Indexes: `{ userId, status }`

### DoseEvent
| Field | Type | Notes |
| :--- | :--- | :--- |
| `userId` | ObjectId → User | Owner scope |
| `medicineId` | ObjectId → Medicine | Populated for display fields |
| `scheduledAt` | Date | Exact UTC instant of the scheduled dose |
| `status` | Enum | `pending`, `taken`, `skipped`, `missed`, `unconfirmed` (case variants tolerated) |
| `takenAt` | Date | Actual intake time, when reported |
| `missedReason` | String \| null | Voluntary clinical explanation |
| `notes` | String \| null | Freeform |

Indexes:
- `{ userId, scheduledAt }` — timeline queries
- `{ medicineId, scheduledAt }` — per-medicine adherence
- `{ userId, medicineId, scheduledAt }` **unique** — idempotent sync, no duplicate doses

---

## Dose Lifecycle

```
                 ┌──────────── taken (terminal)
                 │
pending ─────────┼──────────── skipped ──▶ taken only
   │             │
   │             ├──────────── missed (terminal)
   │             │
   └─────────────┴──────────── unconfirmed ──▶ taken / skipped / missed
```

Enforced transition rules (`validateStatusTransition`):

1. Re-applying the same status → `409`-style duplicate error.
2. `taken` is terminal — cannot become anything else.
3. `missed` is terminal — a confirmed miss is a recorded fact.
4. `skipped` may only be corrected to `taken`.
5. `unconfirmed` may never revert to `pending`.
6. Past-day `pending` doses are rolled over to `unconfirmed` (never `missed`).

---

## Adherence Calculation

Implemented once in `frontend/utils/adherence.js` and reused by the Dashboard, Calendar, and History screens.

```
Adherence = Taken / (Taken + Skipped + Missed) × 100
```

- **Eligible denominator** = `taken + skipped + missed`.
- **Excluded**: `pending`, `unconfirmed`, and all future doses.
- **Zero eligible** → `0` for a day view, `null` for a month evaluation (never a false `100%`).
- Daily indicator states: `all_taken` (green), `pending_or_skipped` (amber), `missed` (muted red), `unconfirmed` (grey), `none`.

---

## REST API Reference

Base URL: `http://localhost:5000` (see [Environment Variables](#environment-variables)).  
All responses are JSON. Protected routes require `Authorization: Bearer <token>`.

### Health
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | — | Server identity banner |
| `GET` | `/api/health` | — | Live status; `200` when DB connected, `503` otherwise |

### Auth
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | — | Create account; returns safe user + JWT |
| `POST` | `/api/auth/login` | — | Authenticate; returns safe user + JWT |
| `GET` | `/api/auth/me` | ✅ | Current profile |
| `PUT` | `/api/auth/profile` | ✅ | Update `name` and/or `avatar` |

### Medicines
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/medicines` | ✅ | Create medicine |
| `GET` | `/api/medicines` | ✅ | List; `?status=Active\|Paused\|Completed`, `?search=`, `?archived=true` |
| `GET` | `/api/medicines/:id` | ✅ | Single medicine (owner only) |
| `PUT` | `/api/medicines/:id` | ✅ | Update |
| `DELETE` | `/api/medicines/:id` | ✅ | **Archive** (default) or `?permanent=true` hard delete |
| `POST` | `/api/medicines/:id/restore` | ✅ | Restore archived medicine to active routine |

### Prescriptions
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/medicines/:id/prescription` | ✅ | Multipart `prescription` field; JPG/PNG/PDF ≤ 5 MB |
| `GET` | `/api/medicines/:id/prescription` | ✅ | Stream file; `?download=1` forces attachment |
| `DELETE` | `/api/medicines/:id/prescription` | ✅ | Remove file and clear metadata |

### Dose Events
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/dose-events/sync` | ✅ | Generate missing doses for a date (idempotent) |
| `POST` | `/api/dose-events/rollover` | ✅ | Past `pending` → `unconfirmed` |
| `POST` | `/api/dose-events` | ✅ | Create a dose event manually |
| `GET` | `/api/dose-events` | ✅ | Filter by `date`, `startDate`/`endDate`, `status`, `medicineId` |
| `GET` | `/api/dose-events/:id` | ✅ | Single dose event |
| `PATCH` | `/api/dose-events/:id/taken` | ✅ | Mark taken (optional `takenAt`) |
| `PATCH` | `/api/dose-events/:id/skipped` | ✅ | Mark skipped (optional `reason`) |
| `PATCH` | `/api/dose-events/:id/missed` | ✅ | Confirm missed (optional `missedReason`) |
| `PATCH` | `/api/dose-events/:id/unconfirmed` | ✅ | Mark unconfirmed |
| `DELETE` | `/api/dose-events/:id` | ✅ | Delete a dose event |

<details>
<summary><strong>Example: sync today's doses</strong></summary>

```http
POST /api/dose-events/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-11-17",
  "timezoneOffset": -330
}
```

`timezoneOffset` is the value of JavaScript's `new Date().getTimezoneOffset()` (minutes; IST = `-330`).

Response:

```json
{
  "success": true,
  "count": 3,
  "createdCount": 2,
  "doseEvents": [ /* populated dose events for the requested local day */ ]
}
```
</details>

<details>
<summary><strong>Example: mark a dose as taken</strong></summary>

```http
PATCH /api/dose-events/6730f1c2a1b2c3d4e5f60718/taken
Authorization: Bearer <token>
Content-Type: application/json

{ "takenAt": "2026-11-17T03:12:00.000Z" }
```
</details>

---

## Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **MongoDB** running locally, or a MongoDB Atlas connection string
- **Expo Go** on a device, or an Android emulator / iOS Simulator
- Git

### 1. Clone

```bash
git clone https://github.com/theRkakkad/codinggita-sem-03-diwali_hw.git
cd codinggita-sem-03-diwali_hw/react-native/NIYAM
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env — at minimum MONGODB_URI and JWT_SECRET
npm run dev          # nodemon, or: npm start
```

The API listens on `http://localhost:5000` and verifies connectivity at `GET /api/health`. The server refuses to start if MongoDB cannot be reached.

### 3. Frontend

```bash
cd ../frontend
npm install
cp .env.example .env
npm start            # Expo dev server
```

Then press `a` (Android), `i` (iOS), or `w` (web) in the Expo CLI.

---

## Environment Variables

### `backend/.env`

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | HTTP port |
| `NODE_ENV` | No | `development` | Reported by `/api/health` |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string (`MONGO_URI` also accepted) |
| `JWT_SECRET` | **Yes** | — | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime |
| `UPLOAD_DIR` | No | `uploads/prescriptions` | Prescription storage directory |

### `frontend/.env`

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | No | auto-detected | Backend base URL |

Resolution order in `services/api.js`:

1. `EXPO_PUBLIC_API_URL`, if set.
2. Expo `hostUri` IP (physical device on the same Wi-Fi) → `http://<host-ip>:5000`.
3. Platform fallback: Android emulator `http://10.0.2.2:5000`, otherwise `http://localhost:5000`.

On Android, a configured `localhost`/`127.0.0.1` URL is automatically remapped to the detected host IP or `10.0.2.2`.

---

## Running the App

| Target | Command | Backend URL |
| :--- | :--- | :--- |
| Android emulator | `npm run android` | `http://10.0.2.2:5000` |
| iOS Simulator | `npm run ios` | `http://localhost:5000` |
| Web | `npm run web` | `http://localhost:5000` |
| Physical device (Expo Go) | `npm start` then scan QR | Auto-detected LAN IP |

> Both devices must be on the same network. If auto-detection fails, set `EXPO_PUBLIC_API_URL` to your machine's LAN address, e.g. `http://192.168.1.100:5000`.

---

## Local Reminders & End-of-Day Review

Reminders are scheduled **on-device** with `expo-notifications`; no push infrastructure is involved.

- **Android channel**: `niyam-medication-reminders` created on first launch.
- **Notification actions**: `Taken`, `Snooze 10m`, `Skip`. Tapping an action deep-links into the dashboard with the dose pre-selected (`activeDoseId` / `skipDoseId` params).
- **Snooze options**: 5, 10, 15, 30 minutes, stored separately so they can be cancelled when the dose is resolved.
- **Scheduling horizon**: date-bounded medicines are scheduled 14 days ahead and replenished on app activity.
- **End-of-day reminder**: default `09:00 PM`, independently toggleable, with a dedicated notification ID so it never collides with dose reminders.
- **Permission handling**: graceful banners, with a direct shortcut to device settings when notifications are blocked.

> Reminder times are stored as display strings (`08:30 AM`). Both the client and server parse 12-hour and 24-hour formats.

---

## Timezone Handling

Dose events are stored as UTC instants, but "today" is a local concept. The client sends `timezoneOffset` (minutes from `getTimezoneOffset()`) with date-scoped reads and syncs; the server builds local day boundaries in UTC before querying:

```js
const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) + tzOffsetMs);
const endOfDay   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) + tzOffsetMs);
```

This keeps dashboard, calendar, and history consistent across DST changes and non-UTC timezones (e.g. IST, UTC+5:30).

---

## Testing

All suites are plain Node scripts (no test runner dependency) and run against a real MongoDB. Make sure `backend/.env` is configured first.

### Backend

```bash
cd backend
node test-models.js                        # Schema validation & indexes
node test-auth.js                          # Register / login / JWT / profile
node test-medicines.js                     # Medicine CRUD & ownership isolation
node test-dose-events.js                   # Dose lifecycle & transition rules
node test-prescriptions.js                 # Upload validation & file magic bytes
node test-phase19-integration.js           # End-to-end API + service contract
node test-phase20-medication-management.js # Full medication management matrix
node test-phase23-rollover.js              # Day rollover idempotency
```

Each suite spins up the Express app on a dedicated test port (5001–5007) and cleans up its own records.

### Frontend

```bash
cd frontend
node test-phase21-reminders.js       # Time parsing, scheduling, cancellation
node test-phase22-workflow.js        # Taken / snooze / skip workflow + state integrity
node test-phase23-end-of-day.js      # EOD eligibility, rollover, review actions
node test-phase24-integration.js     # Adherence math, next-dose selection, sync idempotency
```

These validate the service layer in a mocked `Platform` / SecureStore environment.

---

## Design System

Dark, calm, and deliberately restrained. All tokens live in `frontend/constants/`.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `background` | `#171A19` | App canvas |
| `surface` | `#222725` | Cards |
| `surfaceSecondary` | `#2D3430` | Nested surfaces |
| `primary` | `#E6A23C` | Warm amber accent, CTAs |
| `secondary` | `#A3B89A` | Muted sage |
| `textPrimary` | `#F5F1E8` | Headings and body |
| `textSecondary` | `#B7B8AF` | Supporting copy |
| `success` | `#7FA889` | Taken / healthy adherence |
| `warning` | `#E6A23C` | Pending / attention |
| `danger` | `#D87970` | Missed / destructive |

Supporting scales: `typography.js` (variants: `h1`, `h2`, `h3`, `body`, `secondary`, `caption`, `label`), `spacing.js`, `radius.js`, and a composed `theme.js`.

---

## Security Model

- **Passwords**: bcrypt hashing (10 rounds); hashes are never returned by any endpoint.
- **Sessions**: signed JWTs with configurable expiry; the client clears the token on any unexpected `401`.
- **Ownership isolation**: every medicine, prescription, and dose query is scoped by `userId`; foreign IDs yield `404`, not `403`, to avoid resource enumeration.
- **Uploads**: extension **and** MIME checks at the multer layer, plus magic-byte verification after write; storage filenames are randomized (`prescription-<timestamp>-<hex>.<ext>`), and paths are resolved and re-validated before any read.
- **Injection resistance**: Mongo queries are built from validated ObjectIds, enums, and escaped regex patterns; search input is escaped to prevent ReDoS.
- **Credential logging**: database URIs are masked (`//***:***@`) before being written to logs.
- **Transport**: put the API behind HTTPS in any non-local deployment; JWT_SECRET must be a long random value.

---

## Roadmap

- [ ] Push-notification delivery when the app has been force-stopped for several days
- [ ] Export adherence reports as CSV / PDF
- [ ] Refill tracking and low-stock warnings
- [ ] Caregiver / family view with read-only adherence sharing
- [ ] Multiple daily schedules per medicine (weekday/weekend variants)
- [ ] Internationalisation (English + Hindi + Gujarati)
- [ ] Automated CI (GitHub Actions) for the backend test suites

---

## Disclaimer

NIYAM is a personal adherence and record-keeping tool. It does **not** provide medical advice, diagnosis, or treatment, and it must not replace the instructions of a qualified healthcare professional. Always follow the prescription and guidance of your doctor or pharmacist. In a medical emergency, contact local emergency services.

---

## License

Backend: ISC (per `backend/package.json`).  
Frontend scaffold includes the Expo MIT license (`frontend/LICENSE`).
