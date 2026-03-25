# Logistic 18 — Supply Chain Risk Management Platform

**Project:** Y2S2-WE-DS-G18  
**Supervisor:** Dr. Kapila  
**Stack:** Node.js / Express · React · MongoDB · Python FastAPI  
**Status:** Core system complete; module integration in progress

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Team Assignments](#team-assignments)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Setup & Installation](#setup--installation)
6. [Running the Application](#running-the-application)
7. [Authentication Flow](#authentication-flow)
8. [Role-Based Access Control](#role-based-access-control)
9. [Database Models](#database-models)
10. [API Reference](#api-reference)
11. [Frontend Pages](#frontend-pages)
12. [Design System](#design-system)
13. [Testing](#testing)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)
16. [Documentation](#documentation)

---

## Project Overview

Logistic 18 is a production-grade, multi-tenant supply chain risk management platform. It replaces reactive logistics monitoring with proactive, ML-powered risk scoring across three domains:

- **Supplier Risk** — Financial health indicators, on-time delivery rates, and geopolitical exposure scoring.
- **Shipment Tracking** — Delay detection, carrier reliability metrics, and real-time status updates.
- **Inventory Management** — Stockout prediction, demand forecasting, and safety stock optimization.

### Key Capabilities

- Multi-tenant SaaS architecture with complete organizational-level data isolation
- Role-based access control (RBAC) with 5 defined roles and 50+ granular permissions
- ML-powered risk scoring via three independent XGBoost models
- Unified alert engine with auto-assignment and SLA-based escalation
- JWT access token and refresh token management with rotation and reuse detection
- Immutable audit trails for compliance and forensic review
- Real-time dashboards with 30-second polling intervals
- Carrier API integrations: FedEx, UPS, DHL

---

## Team Assignments

| Member | Module | Responsibilities |
|---|---|---|
| Rathnamalala | User & Authentication | Registration, JWT lifecycle, RBAC, user management |
| Rifshadh | Supplier Risk | Risk scoring models, CRUD operations, comparison dashboard |
| Umayanthi | Shipment Tracking | Carrier API integration, delay detection, tracking views |
| Wijemanna | Inventory Management | Stock levels, demand forecasting, reorder logic |
| Kulatunga | Alerts & Notifications | Alert generation, assignment, escalation engine |
| Senadeera | Analytics & Reports | KPI dashboards, report generation, PDF/CSV export |

---

## Project Structure

```
Logistics18/
├── backend/                          # Node.js/Express API server
│   ├── src/
│   │   ├── models/                   # Mongoose schemas
│   │   ├── controllers/              # HTTP request handlers
│   │   ├── services/                 # Business logic layer
│   │   ├── repositories/             # Data access layer
│   │   ├── middleware/               # Auth, RBAC, validation, error handling
│   │   ├── routes/                   # API routing definitions
│   │   ├── utils/                    # Helper functions
│   │   ├── config/                   # Database configuration
│   │   └── app.js                    # Express server entry point
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── frontend/                         # React single-page application
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   ├── pages/                    # Full page views
│   │   ├── redux/                    # State management (store and slices)
│   │   ├── utils/                    # API client and helper functions
│   │   ├── styles/                   # CSS (global, auth, layout, pages)
│   │   ├── App.jsx                   # Root component with routing
│   │   └── main.jsx                  # React entry point
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── README.md
│
├── ml-service/                       # Python FastAPI ML microservice
│   ├── main.py                       # FastAPI endpoints (/predict/*)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── models/                       # Saved XGBoost model files (.joblib)
│   └── README.md
│
├── README.md
├── SETUP_GUIDE.md
├── API_DOCUMENTATION.md
└── ARCHITECTURE.md
```

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 16+ |
| npm | 8+ |
| Python | 3.9+ |
| MongoDB | 5.0+ (or MongoDB Atlas free tier) |

---

## Setup & Installation

**1. Clone the repository and configure environment files.**

```bash
cd Logistics18

# Backend
cd backend
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install

# ML Service (optional)
cd ../ml-service
pip install -r requirements.txt
```

**2. Start MongoDB.**

```bash
# Local instance
mongod

# If using MongoDB Atlas, update MONGODB_URI in backend/.env
```

---

## Running the Application

Start each service in a separate terminal.

**Backend**
```bash
cd backend
npm run dev
# Listening on http://localhost:5000
# API root: http://localhost:5000/api
```

**Frontend**
```bash
cd frontend
npm run dev
# Listening on http://localhost:5173
```

**ML Service** (optional)
```bash
cd ml-service
python main.py
# Listening on http://localhost:8000
```

### Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| API Health Check | http://localhost:5000/api/health |
| ML Service Health | http://localhost:8000/health |

### Test Credentials

```
Email:    test@example.com
Password: TestPassword123
```

Password requirements: minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number.

---

## Authentication Flow

### Registration

```
POST /api/auth/register
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePassword123",
  "orgId": "org-123"
}
```

- Password hashed with bcrypt (10 salt rounds)
- User document created in MongoDB
- Audit log entry recorded
- Returns: `{ user: { _id, name, email, role } }`

### Login

```
POST /api/auth/login
{
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```

- Verifies credentials via bcrypt comparison
- Generates JWT access token (15-minute expiry)
- Generates JWT refresh token (7-day expiry)
- Stores refresh token in database
- Sets `httpOnly` cookie with refresh token
- Updates `lastLoginAt` timestamp and records audit log
- Returns: `{ accessToken, refreshToken, user: { _id, name, email, role, orgId } }`

### Token Refresh

```
POST /api/auth/refresh
{
  "refreshToken": "<token>"
}
```

- Verifies token signature and version number (detects reuse)
- Increments token version
- Issues new access token and rotated refresh token

### Logout

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

- Invalidates all active refresh tokens
- Clears `httpOnly` cookie
- Records audit log entry

---

## Role-Based Access Control

### Defined Roles

| Role | Permitted Actions | Restrictions |
|---|---|---|
| `ORG_ADMIN` | Full access within the organization | Cannot access other organizations |
| `RISK_ANALYST` | View and override risk scores; manage alerts | Cannot manage users |
| `LOGISTICS_OPERATOR` | Register and manage shipments | Cannot manage users |
| `INVENTORY_MANAGER` | Manage inventory; view forecasts | Cannot manage users |
| `VIEWER` | Read-only access across all modules | No write operations |

### Enforcement Layers

RBAC is enforced at two levels:

**Middleware (Backend)**
```javascript
router.post('/:alertId/acknowledge',
  authenticate,                   // Verify JWT
  authorize(['RISK_ANALYST']),    // Enforce role
  handleAcknowledge               // Execute handler
);
```

**Route Guards (Frontend)**
```jsx
<Route
  path="/users"
  element={
    <ProtectedRoute requiredRoles={['ORG_ADMIN']}>
      <UsersPage />
    </ProtectedRoute>
  }
/>
```

---

## Database Models

### `users`

```json
{
  "_id": "ObjectId",
  "orgId": "ObjectId",
  "name": "String",
  "email": "String (unique)",
  "passwordHash": "String (bcrypt)",
  "role": "String (enum)",
  "isActive": "Boolean",
  "refreshToken": "String",
  "refreshTokenVersion": "Number",
  "lastLoginAt": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### `audit_logs` (Immutable, TTL: 90 days)

```json
{
  "_id": "ObjectId",
  "orgId": "ObjectId",
  "userId": "ObjectId",
  "action": "String",
  "entityType": "String",
  "entityId": "ObjectId",
  "oldValue": "Mixed",
  "newValue": "Mixed",
  "ipAddress": "String",
  "userAgent": "String",
  "timestamp": "Date"
}
```

### `organisations`

```json
{
  "_id": "ObjectId",
  "name": "String",
  "industry": "String",
  "country": "String",
  "timezone": "String",
  "planTier": "String",
  "alertDefaultSLA": "Number (hours)",
  "alertCooldownMinutes": "Number",
  "riskScoreRecalcInterval": "Number",
  "carrierAPIKeys": {
    "fedex": "String",
    "ups": "String",
    "dhl": "String"
  }
}
```

### `alerts`

```json
{
  "_id": "ObjectId",
  "orgId": "ObjectId",
  "entityType": "String",
  "entityId": "ObjectId",
  "severity": "String (low | medium | high | critical)",
  "title": "String",
  "description": "String",
  "mitigationRecommendation": "String",
  "assignedTo": "ObjectId",
  "status": "String (open | acknowledged | resolved | escalated)",
  "resolvedBy": "ObjectId",
  "resolvedAt": "Date",
  "resolutionNote": "String",
  "escalatedAt": "Date",
  "cooldownExpiresAt": "Date",
  "createdAt": "Date"
}
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create user account |
| POST | `/api/auth/login` | Authenticate and issue tokens |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Invalidate all tokens |
| POST | `/api/auth/change-password` | Update user password |
| GET | `/api/auth/me` | Retrieve current user |

### User Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all org users (ORG_ADMIN) |
| GET | `/api/users/:userId` | Get user profile |
| PUT | `/api/users/:userId` | Update user profile |
| POST | `/api/users/invite` | Invite user (ORG_ADMIN) |
| POST | `/api/users/:userId/assign-role` | Assign role (ORG_ADMIN) |
| POST | `/api/users/:userId/activate` | Activate user (ORG_ADMIN) |
| POST | `/api/users/:userId/deactivate` | Deactivate user (ORG_ADMIN) |
| GET | `/api/users/:userId/activity-log` | View audit trail (ORG_ADMIN) |

### Supplier Management *(Placeholder)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/suppliers/:supplierId` | Get supplier details |
| PUT | `/api/suppliers/:supplierId` | Update supplier |
| GET | `/api/suppliers/:supplierId/history` | Supplier risk history |
| POST | `/api/suppliers/compare` | Compare suppliers |

### Shipment Tracking *(Placeholder)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/shipments` | List shipments |
| POST | `/api/shipments` | Register shipment |
| GET | `/api/shipments/:shipmentId` | Get shipment details |
| PUT | `/api/shipments/:shipmentId` | Update shipment |
| GET | `/api/shipments/:shipmentId/tracking` | Get live tracking |

### Inventory Management *(Placeholder)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory` | List inventory items |
| POST | `/api/inventory` | Create inventory item |
| GET | `/api/inventory/:itemId` | Get item details |
| PUT | `/api/inventory/:itemId` | Update item |
| GET | `/api/inventory/:itemId/forecast` | Get demand forecast |

### Alerts *(Placeholder)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | List alerts |
| GET | `/api/alerts/:alertId` | Get alert details |
| POST | `/api/alerts/:alertId/acknowledge` | Acknowledge alert |
| POST | `/api/alerts/:alertId/resolve` | Resolve alert |

### Analytics & Reports *(Placeholder)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Retrieve KPI summary |
| GET | `/api/analytics/kpi` | Retrieve specific KPIs |
| POST | `/api/analytics/generate` | Generate report |
| GET | `/api/analytics/:reportId/download` | Download report |

---

## Frontend Pages

| Route | Component | Access |
|---|---|---|
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/` | DashboardPage | All authenticated roles |
| `/users` | UsersPage | ORG_ADMIN only |

**LoginPage** — Email and password authentication with form validation and token storage. Includes a link to the registration page.

**RegisterPage** — User registration form with fields for full name, email, password, and organization ID. Enforces password strength requirements client-side.

**DashboardPage** — Displays KPI cards (Overall Risk Score, Active Alerts, Delayed Shipments, At-Risk Inventory), quick navigation links, 30-second auto-refresh, and role-conditional content.

**UsersPage** — Paginated user listing with support for inviting new users, assigning roles, activating and deactivating accounts, editing profiles, and viewing per-user activity logs. Restricted to ORG_ADMIN.

---

## Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--brand-primary` | `#E85D2F` | Primary CTAs |
| `--surface-card` | `#F2F4F0` | Card backgrounds |
| `--text-primary` | `#1A1C1A` | Body text |
| `--risk-low` | `#2DB87A` | Low risk indicator |
| `--risk-medium` | `#F5A623` | Medium risk indicator |
| `--risk-high` | `#E8572F` | High risk indicator |
| `--risk-critical` | `#C7253E` | Critical risk indicator (pulse animation) |

### Typography

| Role | Font |
|---|---|
| Display / KPI values | Syne |
| Body / UI labels | DM Sans |
| Monospace / numbers / timestamps | JetBrains Mono |

### Component Standards

- **Cards:** 16px border radius, 24px padding, subtle box shadow
- **Buttons:** Pill-shaped (28px radius), orange accent on hover
- **Risk Badges:** Color-coded per severity; animated pulse at Critical level
- **Forms:** Single-column layout with inline validation feedback

---

## Testing

### Backend

```bash
cd backend
npm test                  # Run all Jest tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

### Frontend

```bash
cd frontend
npm test                  # Run all Vitest tests
npm run test:watch        # Watch mode
```

### Manual Test Checklist

**Authentication**
- [ ] Registration persists hashed password
- [ ] Login succeeds with valid credentials and fails with invalid
- [ ] Access token refresh works on expiry
- [ ] Logout invalidates all refresh tokens
- [ ] Refresh token reuse is detected and blocked

**RBAC**
- [ ] ORG_ADMIN can manage users and assign roles
- [ ] RISK_ANALYST can manage alerts
- [ ] LOGISTICS_OPERATOR is blocked from admin routes
- [ ] Cross-org access is rejected at middleware level

**User Management**
- [ ] User invite generates a secure temporary password
- [ ] Deactivate and activate transitions work correctly
- [ ] Role assignment updates permissions immediately
- [ ] All user actions are captured in the activity log

---

## Deployment

### Docker Compose

Create `docker-compose.yml` in the project root:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    environment:
      MONGODB_URI: mongodb://root:password@mongodb:27017/logistic18
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"

volumes:
  mongo_data:
```

```bash
docker-compose up -d
```

---

## Troubleshooting

**Backend fails to start**
```bash
# Verify MongoDB connectivity
mongosh

# Confirm environment variable is set
echo $MONGODB_URI

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Frontend fails to start**
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
# Verify port 5173 is not in use
```

**JWT errors**
- Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are present in `backend/.env`
- Both secrets must be at least 32 characters
- Verify the `Authorization` header is included in API requests
- Check `localStorage` in the browser for token presence

**CORS errors**
- Confirm `CORS_ORIGIN` in `backend/.env` matches the frontend URL exactly
- Verify the `Authorization` header is not being stripped by a proxy

---

## Documentation

| File | Contents |
|---|---|
| `SETUP_GUIDE.md` | Step-by-step installation instructions |
| `API_DOCUMENTATION.md` | Full REST API reference with request/response examples |
| `ARCHITECTURE.md` | System design, component diagrams, and data flow |

---

## Implementation Status

| Module | Owner | Status |
|---|---|---|
| User & Authentication | Rathnamalala | Complete |
| Supplier Risk Scoring | Rifshadh | Routes scaffolded |
| Shipment Tracking | Umayanthi | Routes scaffolded |
| Inventory Management | Wijemanna | Routes scaffolded |
| Alerts & Notifications | Kulatunga | Routes scaffolded |
| Analytics & Reports | Senadeera | Routes scaffolded |

---

## External References

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Express.js Documentation](https://expressjs.com)
- [React Documentation](https://react.dev)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [XGBoost Documentation](https://xgboost.readthedocs.io)

---

**Last Updated:** February 27, 2026  
**License:** MIT — Academic and commercial use permitted
