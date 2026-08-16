# ShareTruck

A truck capacity-sharing marketplace that connects **shippers** who have a partial or small load with **transporters** who have spare capacity on a truck already running a matching route.

## Overview

ShareTruck lets a transporter publish a trip (route, departure time, available capacity, price per ton) and lets shippers search for trips matching their own route and date, then book a portion of that capacity. The platform manages the full booking lifecycle — request, acceptance, payment, pickup, delivery, and rating — along with identity/KYC verification, an in-app wallet for payments and transporter payouts, live GPS tracking of ongoing bookings, in-app chat, and an administrative console for oversight and moderation.

The application is a mobile-first Progressive Web App (installable, offline-tolerant shell) built on a Node.js/Express API and a MongoDB database.

## Key Features

### For Shippers
- Email OTP-based signup and login, or email + password — mobile number is optional (used only for contact, not login)
- Search trips by origin city, destination city, and date
- Book capacity on a matching trip, with a server-computed price estimate
- Pay for a confirmed booking from an in-app wallet or via Razorpay
- Track a truck's live location on a map while a booking is ongoing
- In-app chat with the transporter for a booking
- Rate and review the transporter after a completed booking
- Raise support requests and disputes tied to a specific booking

### For Transporters
- Register and manage trucks, including KYC document upload
- Post trips (route, schedule, capacity, price) once the truck and account are verified
- Accept or reject incoming booking requests
- Confirm pickup and drop to progress a booking through its lifecycle
- Broadcast live location while a booking is ongoing
- In-app chat with the shipper, and rate the shipper after completion
- View wallet earnings and request withdrawals to a bank account or UPI ID (payout details encrypted at rest)

### For Admins
- Dashboard with platform-wide metrics and recent activity
- KYC verification queue for user and truck documents
- User management: search, view profile/history, suspend or ban
- Trip and booking oversight: deactivate a trip or force-cancel a booking outside normal rules
- Platform wallet, payment, and withdrawal management (approve/reject/mark paid)
- Review moderation and dispute resolution
- Support ticket handling
- Live tracking overview across active bookings
- Configurable platform settings (e.g. the KYC verification gate) and SMS/email provider credentials, managed from the admin UI rather than server config
- CSV exports for bookings, revenue by route, user growth, and verification turnaround
- Full audit log of admin actions

## Technology Stack

**Frontend**
- React 19 with Vite
- React Router
- styled-components
- Socket.IO client (chat, live location, notifications)
- Mapbox GL (live tracking map)
- Progressive Web App support (installable, service worker)
- Vitest + Testing Library (unit/component tests)

**Backend**
- Node.js with Express
- MongoDB with Mongoose, including multi-document transactions for the wallet ledger
- JWT sessions delivered via an httpOnly cookie
- Joi request validation
- Socket.IO (chat, live location broadcasting, real-time notifications)
- Razorpay integration for online payments
- Pluggable object storage for uploaded documents (local disk for development, any S3-compatible provider for production)
- Web Push (VAPID) for browser push notifications
- Jest + Supertest + mongodb-memory-server (unit/integration tests)

**Infrastructure**
- Docker and Docker Compose for local full-stack development
- Separate Dockerfiles for the backend and frontend (frontend served via nginx)
- GitHub Actions CI: backend tests, frontend lint/test/build, and a full browser-based Playwright end-to-end suite
- GitHub Actions scheduled MongoDB backup workflow
- Target deployment topology: Vercel (frontend), Render (backend API), MongoDB Atlas (database)

## Project Structure

```
.
├── backend/                 # Express API
│   ├── config/               # App configuration and env validation
│   ├── controllers/          # Route handlers / business logic
│   ├── emailTemplates/       # Transactional email templates
│   ├── jobs/                 # Scheduled background jobs
│   ├── middleWare/           # Auth, rate limiting, error handling
│   ├── models/                # Mongoose schemas
│   ├── realtime/              # Socket.IO event handlers
│   ├── routes/                # Express route definitions
│   ├── scripts/               # One-off/ops scripts (admin seeding, DB backup, CI database)
│   ├── tests/                  # Jest unit/integration tests
│   ├── utils/                  # Shared helpers (crypto, payments, wallet, storage, etc.)
│   ├── validators/             # Joi request validation schemas
│   ├── API.md                  # Full REST API reference
│   ├── app.js / server.js      # Express app and HTTP server entry point
│   └── Dockerfile
│
├── frontend/                 # React (Vite) single-page app
│   ├── src/
│   │   ├── api/                # API client modules
│   │   ├── components/         # Reusable UI components
│   │   ├── context/             # React context providers
│   │   ├── hooks/                # Custom hooks
│   │   ├── layouts/              # Page shells (consumer, dashboard, admin, auth)
│   │   ├── pages/                 # Route-level page components (including pages/admin)
│   │   ├── routing/                # Route definitions
│   │   ├── theme/                  # Design tokens and global styles
│   │   └── tests/                   # Frontend unit tests
│   └── Dockerfile
│
├── e2e/                       # Playwright end-to-end test suite (repo root workspace)
├── .github/workflows/         # CI and scheduled database backup workflows
├── docker-compose.yml          # Local full-stack (MongoDB + backend + frontend)
└── README.md
```

## Local Development Setup

### Prerequisites
- Node.js 20+
- npm
- MongoDB (a local instance, or a MongoDB Atlas connection string) — the wallet ledger uses multi-document transactions, which require a replica set (even a single-node one), not a standalone `mongod`
- Docker and Docker Compose (optional — only needed for the containerized setup below)

### Clone the repository

```bash
git clone https://github.com/SanketsMane/Truck-Booking-System.git
cd Truck-Booking-System
```

### Option A — Docker (recommended for a quick start)

Spins up MongoDB (as a single-node replica set), the backend, and the frontend together:

```bash
docker compose up --build
```

Frontend: http://localhost:5173 · Backend: http://localhost:3000

### Option B — Without Docker

**Backend setup**

```bash
cd backend
cp .env.example .env.development   # then fill in real values
npm install
npm run dev
```

**Frontend setup** (in a separate terminal)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Environment Variables

Full templates with explanatory comments live in `backend/.env.example` and `frontend/.env.example`. Copy them and fill in real values — never commit the resulting `.env`/`.env.development`/`.env.production` files.

**Backend** (`backend/.env.example`)

| Variable | Purpose |
|---|---|
| `PORT` | Port the API server listens on |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URL` | MongoDB connection string |
| `SECRET_KEY` | JWT signing secret |
| `FRONTEND_URL` | Deployed frontend origin (CORS + cookie config) |
| `ENCRYPTION_KEY` | Encrypts sensitive provider credentials stored in the database |
| `MASTER_OTP` | Dev-only OTP bypass; must be unset in production |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web push keypair |
| `STORAGE_PROVIDER` | `local` (dev) or `s3` (required in production) |
| `S3_BUCKET` / `S3_REGION` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Object storage credentials, used when `STORAGE_PROVIDER=s3` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_MOBILE` / `SEED_ADMIN_NAME` | First admin account, used by `scripts/seedAdmin.js` (mobile optional) |

Razorpay and SMS/email provider credentials are configured at runtime from the admin Settings page, not via environment variables.

**Frontend** (`frontend/.env.example`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_MAPBOX_TOKEN` | Mapbox access token, powers the live tracking map |

## Running the Application

**Backend** (from `backend/`)

```bash
npm run dev     # start with nodemon (development)
npm start       # start (production)
npm test        # run the Jest test suite
```

**Frontend** (from `frontend/`)

```bash
npm run dev       # start the Vite dev server
npm run build     # production build
npm run preview   # preview the production build locally
npm run lint      # run ESLint
npm test          # run the Vitest test suite
```

**End-to-end tests** (from the repo root)

```bash
npm run test:e2e   # Playwright, drives the real UI against running backend + frontend dev servers
```

All three test suites run in CI on every push and pull request (`.github/workflows/ci.yml`).

## API Documentation

The full REST API reference — every endpoint, required auth, request body, and behavior notes — is maintained in [`backend/API.md`](backend/API.md).

Route groups exposed by the API (see `backend/app.js`): `/auth`, `/files`, `/verification`, `/trucks`, `/trips`, `/bookings`, `/chat`, `/ratings`, `/payment-logs`, `/notifications`, `/support`, `/disputes`, `/admin`, `/wallet`, `/webhooks`, `/meta`, `/push`.

A health check is available, unauthenticated, at `GET /health`.
