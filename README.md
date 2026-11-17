# Semester 3 — Diwali Homework

Two independently runnable full-stack projects, built as one submission. Each lives in its own folder with its own dependencies, environment variables, and README.

| Project | Stack | What it is | Docs |
| :--- | :--- | :--- | :--- |
| **NIYAM** <sub>नियम</sub><br/>`react-native/NIYAM` | Expo 58 · React Native 0.88 · Express 5 · MongoDB | A medication reminder and adherence tracker with local notifications, dose lifecycle rules, prescription attachments, and monthly compliance reporting. | [README »](react-native/NIYAM/README.md) |
| **VidyaBazaar** <sub>विद्या बाज़ार</sub><br/>`next-js` | Next.js 16 · React 19 · TypeScript · Tailwind v4 · MongoDB | A zero-fee second-hand marketplace for college students: listings, offers, campus handover, seller/buyer dashboards, and printable QR codes. | [README »](next-js/README.md) |

---

## Repository Layout

```
codinggita-sem-03-diwali_hw/
├── react-native/
│   └── NIYAM/
│       ├── frontend/     Expo Router mobile app (Android, iOS, Web)
│       ├── backend/      Express 5 + MongoDB REST API
│       └── README.md     Full architecture, API, and setup docs
│
└── next-js/
    ├── app/              Next.js App Router pages and API routes
    ├── components/       Navbar, ListingCard, QR modal, Footer
    ├── models/           Mongoose schemas (Listing, Enquiry)
    ├── context/          Client-side application state
    ├── docs/             Product screenshots
    └── README.md         Full feature and API docs
```

---

## Quick Start

Each project is self-contained. Open the project folder you want and follow its README.

### NIYAM (mobile)

```bash
cd react-native/NIYAM/backend
npm install
cp .env.example .env        # set MONGODB_URI and JWT_SECRET
npm run dev                 # http://localhost:5000

# in a second terminal
cd ../frontend
npm install
cp .env.example .env
npm start                   # Expo dev server → press a / i / w
```

### VidyaBazaar (web)

```bash
cd next-js
npm install
cp .env.example .env.local  # set MONGODB_URI
npm run dev                 # http://localhost:3000
```

**Shared prerequisites:** Node.js 18+, npm, and a running MongoDB instance (local or Atlas).

---

## Common Conventions

Both projects follow the same baseline so they are easy to review side by side:

- **MongoDB + Mongoose** for persistence, with schema-level validation and indexes.
- **REST API routes** co-located with the application (`backend/routes` for NIYAM, `app/api` for VidyaBazaar).
- **Server-side validation** of every mutation; client-side validation is a convenience, never the gate.
- **Environment-driven configuration** — no secrets committed; `.env.example` documents every variable.
- **Ownership-scoped data access** — records are filtered by the authenticated user, never by client-supplied identity.
- **No build artefacts in version control** — `node_modules`, `.next`, `.expo`, and local `.env` files are ignored.

---

## Status

Both applications are configured to run locally against MongoDB. NIYAM includes integration test suites for authentication, medication management, dose events, prescriptions, rollover, and adherence; VidyaBazaar documents its marketplace flows and demo data seeding in its own README.

---

## Author

**Rachit Kakkad** — [@theRkakkad](https://github.com/theRkakkad)

## License

See each project for its license details: NIYAM (`react-native/NIYAM/README.md`) and VidyaBazaar (`next-js/README.md`).
