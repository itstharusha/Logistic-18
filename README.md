# 🚀 Logistic 18 - Smart Logistics & Supply Chain Management System

A production-grade, multi-tenant, ML-powered supply chain risk management platform built on the MERN stack with a Python FastAPI ML microservice.

**Group**: Y2S2-WE-DS-G18  
**Supervisor**: Dr. Kapila  
**Team Members**: 6 developers assigned per module  
**Stack**: Node.js/Express + React + MongoDB + Python FastAPI

---

## 📋 Project Overview

Logistic 18 replaces reactive logistics monitoring with **proactive, predictive risk scoring** across three critical domains:

- 🏭 **Supplier Risk**: Financial health, on-time delivery, geopolitical exposure
- 📦 **Shipment Tracking**: Delay detection, carrier reliability, real-time status
- 📊 **Inventory Management**: Stockout prediction, demand forecasting, safety stock optimization

### Key Features

✓ Multi-tenant SaaS architecture with complete org-level isolation  
✓ Role-based access control (RBAC) with 5 roles and 50+ permissions  
✓ ML-powered risk scoring using XGBoost (3 independent models)  
✓ Unified alert engine with auto-assignment and escalation  
✓ JWT token rotation & refresh token management  
✓ Immutable audit trails for compliance  
✓ Real-time dashboards with 30-second polling  
✓ Carrier API integration (FedEx, UPS, DHL)  

---

## 👥 Team Assignments

| Member | Module | Responsibility |
|--------|--------|--------------------------|
| **Rathnamalala** | User & Auth | Registration, JWT, RBAC, user mgmt |
| **Rifshadh** | Supplier Risk | Risk scoring, CRUD, comparison dashboard |
| **Umayanthi** | Shipment Tracking | Carrier APIs, delay detection, tracking |
| **Wijemanna** | Inventory Mgmt | Stock levels, demand forecast, reorder |
| **Kulatunga** | Alerts & Notifications | Alert generation, assignment, escalation |
| **Senadeera** | Analytics & Reports | Dashboards, KPIs, PDF/CSV export |

---

## 🗂️ Project Structure

```
Logistics18/
├── backend/                          # Node.js/Express API Server
│   ├── src/
│   │   ├── models/                   # Mongoose schemas (User, Alert, Audit logs)
│   │   ├── controllers/              # HTTP request handlers (AuthController, UserController)
│   │   ├── services/                 # Business logic (AuthService, UserService)
│   │   ├── repositories/             # Data access layer (UserRepository)
│   │   ├── middleware/               # Auth, RBAC, validation, error handling
│   │   ├── routes/                   # API routing (auth, users, suppliers, etc.)
│   │   ├── utils/                    # Helper functions
│   │   ├── config/                   # Database config
│   │   └── app.js                    # Express server entry point
│   ├── package.json                  # Dependencies
│   ├── .env.example                  # Environment variables template
│   └── README.md
│
├── frontend/                         # React SPA
│   ├── src/
│   │   ├── components/               # Reusable UI components (TopNav, Layout)
│   │   ├── pages/                    # Full page components (LoginPage, UsersPage)
│   │   ├── redux/                    # State management (store, slices)
│   │   ├── utils/                    # API client, helper functions
│   │   ├── styles/                   # CSS files (global, auth, layout, pages)
│   │   ├── App.jsx                   # Main app component with routing
│   │   └── main.jsx                  # React entry point
│   ├── index.html                    # HTML template
│   ├── package.json                  # Dependencies
│   ├── vite.config.js                # Vite build config
│   ├── .env.example
│   └── README.md
│
├── ml-service/                       # Python FastAPI ML Microservice
│   ├── main.py                       # FastAPI endpoints (/predict/*)
│   ├── requirements.txt               # Python dependencies
│   ├── Dockerfile                    # Container config
│   ├── models/                       # Saved XGBoost models (.joblib files)
│   └── README.md
│
├── README.md                         # You are here
├── SETUP_GUIDE.md                    # Step-by-step setup instructions
├── API_DOCUMENTATION.md              # REST API endpoints
└── ARCHITECTURE.md                   # Detailed system design

```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ (backend & frontend)
- **Python** 3.9+ (ML service)
- **MongoDB** 5.0+ or MongoDB Atlas free tier account
- **npm** 8+ or **yarn**

### 1️⃣ Clone & Setup Environment

```bash
cd Logistics18

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
npm install

# Frontend setup
cd ../frontend
cp .env.example .env
npm install

# ML Service setup (optional for full development)
cd ../ml-service
pip install -r requirements.txt
```

### 2️⃣ Start MongoDB

```bash
# If using MongoDB Atlas, update MONGODB_URI in backend/.env

# If using local MongoDB:
mongod
```

### 3️⃣ Start Services (in separate terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
# API available at http://localhost:5000/api
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:5173
```

**Terminal 3 (Optional) - ML Service:**
```bash
cd ml-service
python main.py
# ML service running on http://localhost:8000
# Health check: http://localhost:8000/health
```

### 4️⃣ Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **API Health Check**: http://localhost:5000/api/health
- **ML Service Health**: http://localhost:8000/health

### 5️⃣ Test Authentication

Register a new account or login with test credentials:

```
Email: test@example.com
Password: TestPassword123 (at least 8 chars, uppercase, lowercase, number)
```

---

## 🔐 Authentication Flow

### User Registration (Rathnamalala)

```
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123",
  "orgId": "org-123"
}

↓

Password hashed with bcrypt (10 salt rounds)
User document created in MongoDB
Audit log entry recorded
Response: { user: { _id, name, email, role } }
```

### User Login (Rathnamalala)

```
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}

↓

Verify email exists
Compare password with bcrypt hash
Generate JWT Access Token (15 min expiry)
Generate JWT Refresh Token (7 day expiry)
Store refresh token in DB
Set httpOnly cookie with refresh token
Last login timestamp updated
Audit log entry recorded

Response: {
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { _id, name, email, role, orgId }
}
```

### Token Refresh (Rathnamalala)

```
POST /api/auth/refresh
{
  "refreshToken": "eyJhbG..."
}

↓

Verify refresh token signature
Check token version (detects theft/reuse)
Increment token version
Generate new access token
Rotate refresh token in DB

Response: {
  "accessToken": "new-token",
  "refreshToken": "new-rotated-token"
}
```

### Logout (Rathnamalala)

```
POST /api/auth/logout
Authorization: Bearer {accessToken}

↓

Invalidate all refresh tokens
Clear httpOnly cookie
Audit log entry recorded

Response: { message: "Logout successful" }
```

---

## 🛡️ Role-Based Access Control (Rathnamalala)

### 5 Roles Defined

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **ORG_ADMIN** | Everything within org | Access other orgs |
| **RISK_ANALYST** | View/override scores, manage alerts | User management |
| **LOGISTICS_OPERATOR** | Register/manage shipments | User management |
| **INVENTORY_MANAGER** | Manage inventory, view forecasts | User management |
| **VIEWER** | Read-only access to all data | Any modifications |

### RBAC Enforcement

RBAC is enforced at **two layers**:

1. **Middleware Layer** (Backend) - Prevents unauthorized API access
   ```javascript
   router.post('/:alertId/acknowledge', 
     authenticate,                    // Verify JWT
     authorize(['RISK_ANALYST']),     // Check role
     handleAcknowledge                // Process request
   );
   ```

2. **UI Layer** (Frontend) - Role-gated routes
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

## 📊 Database Models (MongoDB Collections)

### `users` Collection
```
{
  _id: ObjectId,
  orgId: ObjectId,        // Multi-tenant isolation
  name: String,
  email: String (unique),
  passwordHash: String (bcrypt),
  role: String (enum),
  isActive: Boolean,
  refreshToken: String,
  refreshTokenVersion: Number,  // Detects token reuse
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### `audit_logs` Collection (Immutable)
```
{
  _id: ObjectId,
  orgId: ObjectId,        // Multi-tenant
  userId: ObjectId,
  action: String          // e.g., "LOGIN", "USER_CREATED", "PASSWORD_CHANGED"
  entityType: String,
  entityId: ObjectId,
  oldValue: Mixed,        // Previous state
  newValue: Mixed,        // New state
  ipAddress: String,
  userAgent: String,
  timestamp: Date (TTL: 90 days)
}
```

### `organisations` Collection
```
{
  _id: ObjectId,
  name: String,
  industry: String,
  country: String,
  timezone: String,
  planTier: String,
  alertDefaultSLA: Number,            // SLA in hours
  alertCooldownMinutes: Number,
  riskScoreRecalcInterval: Number,
  carrierAPIKeys: {                   // Org-specific API keys
    fedex: String,
    ups: String,
    dhl: String
  }
}
```

### `alerts` Collection
```
{
  _id: ObjectId,
  orgId: ObjectId,
  entityType: String,   // "supplier", "shipment", "inventory"
  entityId: ObjectId,
  severity: String,     // "low", "medium", "high", "critical"
  title: String,
  description: String,
  mitigationRecommendation: String,
  assignedTo: ObjectId  // User reference
  status: String,       // "open", "acknowledged", "resolved", "escalated"
  resolvedBy: ObjectId,
  resolvedAt: Date,
  resolutionNote: String,
  escalatedAt: Date,
  cooldownExpiresAt: Date,  // TTL for duplicate suppression
  createdAt: Date
}
```

---

## 🔌 API Endpoints (By Module)

### Authentication (Rathnamalala)
```
POST   /api/auth/register              Create user account
POST   /api/auth/login                 Generate tokens
POST   /api/auth/refresh               Rotate refresh token
POST   /api/auth/logout                Invalidate tokens
POST   /api/auth/change-password       Update password
GET    /api/auth/me                    Get current user
```

### User Management (Rathnamalala)
```
GET    /api/users                      List org users (ORG_ADMIN only)
GET    /api/users/:userId              Get user profile
PUT    /api/users/:userId              Update profile
POST   /api/users/invite               Invite new user (ORG_ADMIN only)
POST   /api/users/:userId/assign-role  Assign role (ORG_ADMIN only)
POST   /api/users/:userId/activate     Activate user (ORG_ADMIN only)
POST   /api/users/:userId/deactivate   Deactivate user (ORG_ADMIN only)
GET    /api/users/:userId/activity-log View user audit trail (ORG_ADMIN only)
```

### Supplier Management (Rifshadh) - Placeholder
```
GET    /api/suppliers                  List suppliers
POST   /api/suppliers                  Create supplier
GET    /api/suppliers/:supplierId      Get supplier details
PUT    /api/suppliers/:supplierId      Update supplier
GET    /api/suppliers/:supplierId/history Risk history
POST   /api/suppliers/compare          Compare suppliers
```

### Shipment Tracking (Umayanthi) - Placeholder
```
GET    /api/shipments                  List shipments
POST   /api/shipments                  Register shipment
GET    /api/shipments/:shipmentId      Get shipment
PUT    /api/shipments/:shipmentId      Update shipment
GET    /api/shipments/:shipmentId/tracking Get tracking
```

### Inventory (Wijemanna) - Placeholder
```
GET    /api/inventory                  List inventory items
POST   /api/inventory                  Create item
GET    /api/inventory/:itemId          Get item details
PUT    /api/inventory/:itemId          Update item
GET    /api/inventory/:itemId/forecast Get forecast
```

### Alerts (Kulatunga) - Placeholder
```
GET    /api/alerts                     List alerts
GET    /api/alerts/:alertId            Get alert
POST   /api/alerts/:alertId/acknowledge Mark acknowledged
POST   /api/alerts/:alertId/resolve    Resolve alert
```

### Analytics (Senadeera) - Placeholder
```
GET    /api/analytics/dashboard        Get KPI data
GET    /api/analytics/kpi              Get specific KPIs
POST   /api/analytics/generate         Generate report
GET    /api/analytics/:reportId/download Download report
```

---

## 📝 Frontend Pages (Implemented by Rathnamalala)

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | LoginPage | User authentication |
| `/register` | RegisterPage | New user signup |
| `/` | DashboardPage | Main overview (all roles) |
| `/users` | UsersPage | User management (ORG_ADMIN only) |

### Page Descriptions

**LoginPage** (`/login`)
- Email + password login
- JWT token stored in localStorage & cookies
- Error handling & validation
- Link to registration

**RegisterPage** (`/register`)
- Full name, email, password, org ID
- Password strength requirements (8+ chars, uppercase, lowercase, number)
- Email validation
- Bcrypt hashing on backend

**DashboardPage** (`/`)
- KPI cards: Risk Score, Active Alerts, Delayed Shipments, At-Risk Inventory
- Quick links to key modules
- 30-second auto-refresh (in full implementation)
- Role-aware content

**UsersPage** (`/users`)
- ✓ List all org users with pagination
- ✓ Invite new users (send temporary password)
- ✓ Assign/change roles
- ✓ Deactivate/activate users
- ✓ View user activity log
- ✓ Edit user profiles (admin only)

---

## 🎨 Design System (From UI Design Guide)

### Color Palette
```css
--brand-primary: #E85D2F;      /* Burnt orange - CTAs */
--surface-card: #F2F4F0;       /* Light sage-white - cards */
--text-primary: #1A1C1A;       /* Dark text */
--risk-low: #2DB87A;           /* Green */
--risk-medium: #F5A623;        /* Amber */
--risk-high: #E8572F;          /* Orange */
--risk-critical: #C7253E;      /* Red + pulse animation */
```

### Typography
```css
--font-display: 'Syne' (headers, KPI values)
--font-body: 'DM Sans' (UI text, labels)
--font-mono: 'JetBrains Mono' (numbers, timestamps)
```

### Components
- **Cards**: 16px radius, 24px padding, subtle shadow
- **Buttons**: Rounded pills (28px), orange accent on hover
- **Risk Badges**: Color-coded with animated pulse at Critical
- **Dropdowns**: Appear on hover/click in TopNav
- **Forms**: Clean, single-column layout with validation

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test                  # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Frontend Testing
```bash
cd frontend
npm test                  # Run Vitest
npm run test:watch
```

### Manual Testing Checklist

**Auth Flow**
- [ ] Register new user with bcrypt password hashing
- [ ] Login with valid/invalid credentials
- [ ] Token refresh on expiry
- [ ] Logout invalidates tokens
- [ ] Refresh token reuse detected & blocked

**RBAC**
- [ ] ORG_ADMIN can manage users, assign roles
- [ ] RISK_ANALYST can manage alerts
- [ ] LOGISTICS_OPERATOR cannot access admin features
- [ ] Invalid org access blocked at middleware

**Users Module**
- [ ] Invite user generates secure temp password
- [ ] Deactivate/activate user works
- [ ] Role assignment updates permissions
- [ ] Activity log captures all user actions

---

## 📦 Deployment

### Docker Compose (All services together)

Create `docker-compose.yml`:
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

**Deploy:**
```bash
docker-compose up -d
```

---

## 📋 Checklist for Full Implementation

### Rathnamalala (Auth & Users) - COMPLETED ✓
- [x] User registration with bcrypt
- [x] JWT login with Access + Refresh tokens
- [x] Token rotation & reuse detection
- [x] RBAC middleware enforcement
- [x] User profile management
- [x] Invite user with temp password
- [x] Deactivate/activate users
- [x] Audit logging for auth events

### Other Modules (by team members) - PLACEHOLDERS READY
- [ ] **Rifshadh** - Supplier risk scoring (routes ready)
- [ ] **Umayanthi** - Shipment tracking (routes ready)
- [ ] **Wijemanna** - Inventory management (routes ready)
- [ ] **Kulatunga** - Alert engine (routes ready)
- [ ] **Senadeera** - Analytics & reports (routes ready)

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check MongoDB connection
mongosh  # Test MongoDB
echo $MONGODB_URI  # Verify env var

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Frontend won't start
```bash
# Clear node_modules
cd frontend
rm -rf node_modules
npm install
npm run dev

# Check port 5173 is available
```

### JWT not working
- Verify .env contains `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
- Ensure tokens are 32+ characters
- Check browser localStorage for tokens

### CORS errors
- Verify `CORS_ORIGIN` in backend .env matches frontend URL
- Check `Authorization` header is sent in API requests

---

## 📚 Documentation Files

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Step-by-step installation
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Full REST API reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design & flow
- **[SYSTEM_DOCUMENTATION.txt](./system%20documentation.txt)** - Original requirements

---

## 🔗 Resources

- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Express.js Docs**: https://expressjs.com
- **React Docs**: https://react.dev
- **Redux Toolkit**: https://redux-toolkit.js.org
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **XGBoost Docs**: https://xgboost.readthedocs.io

---

## 📄 License

MIT License - Academic & Commercial Use Allowed

---

**Last Updated**: February 27, 2026  
**Project**: Logistic 18 - Y2S2-WE-DS-G18  
**Status**: Core system ready for module integration
