# RBAC Security Audit Report
## Logistics18 Supply Chain Risk Management Platform

**Audit Date:** April 3, 2026  
**Scope:** Role-Based Access Control System (Backend + Frontend)  
**Risk Level:** 🟡 **MEDIUM**

---

## EXECUTIVE SUMMARY

Your RBAC implementation demonstrates **solid architectural foundations** with well-designed middleware-based access control, multi-tenant isolation, and comprehensive audit logging. However, several maintainability and security concerns require attention:

### Key Findings:
- ✅ **Strengths:** Multi-layered authentication, token rotation, audit trails, middleware-based enforcement
- ⚠️ **Concerns:** Hardcoded role strings, no centralized permission registry, excessive ORG_ADMIN permissions, frontend-only permission enforcement
- 🔴 **Risks:** Privilege escalation potential via ORG_ADMIN, role inconsistency across codebase, maintenance burden

### Quick Stats:
| Category | Status | Details |
|----------|--------|---------|
| Roles Defined | 5 | ORG_ADMIN, RISK_ANALYST, LOGISTICS_OPERATOR, INVENTORY_MANAGER, VIEWER |
| Access Control Type | Coarse-grained RBAC | Role-based only (no resource/attribute policies) |
| Audit Trail | ✅ Implemented | Comprehensive logging of auth attempts & changes |
| Multi-tenancy | ✅ Enforced | orgId validation at repository layer |
| Frontend Bypass Risk | 🟡 Medium | UI-only permission checks, not enforced |
| Hardcoding | ⚠️ High | Role strings scattered across ~40+ locations |

---

## 1. ROLE DESIGN REVIEW

### 1.1 Role Definitions Analysis

**Current Roles:**
```
1. ORG_ADMIN           → Full admin control within org
2. RISK_ANALYST        → Risk monitoring + manual overrides
3. LOGISTICS_OPERATOR  → Shipment operations only
4. INVENTORY_MANAGER   → Inventory/warehouse management only
5. VIEWER              → Read-only observer
```

**Assessment: GOOD (with caveats)**

**Strengths:**
- ✅ Clear, non-overlapping responsibilities
- ✅ Aligned with business functions
- ✅ Reasonable granularity (not role explosion)
- ✅ VIEWER role correctly restricted to read-only

**Concerns:**

| Issue | Impact | Evidence |
|-------|--------|----------|
| **ORG_ADMIN over-privileged** | CRITICAL | Can: create/delete users, assign roles, manage suppliers, inventory, settings, view audits, override everything |
| **No super-admin separation** | HIGH | Same role handles user management + all operational functions |
| **Role collision potential** | MEDIUM | ORG_ADMIN + RISK_ANALYST both handle alerts and can override scores |
| **No role delegation** | MEDIUM | Admins can't delegate subset of responsibilities |

**Examples from codebase:**
```javascript
// ORG_ADMIN permissions are MASSIVE (backend/src/routes/*)
✓ User creation, deletion, role assignment
✓ Supplier CRUD + score overrides  
✓ Inventory CRUD
✓ Alert escalation
✓ System config
✓ Full audit trail access
✓ AND everything else...
```

### 1.2 Comparison to Best Practices

| Principle | Your System | Status |
|-----------|------------|--------|
| **Least Privilege** | ORG_ADMIN violates this | 🟡 MEDIUM RISK |
| **Separation of Duties** | ORG_ADMIN can create AND verify | 🟡 MEDIUM RISK |
| **Role Hierarchy** | Flat structure | ⚠️ LIMITATION |
| **Principle of Minimal Exposure** | Good for other roles | ✅ GOOD |

---

## 2. PERMISSION MAPPING ANALYSIS

### 2.1 Documented Permission Matrix

**From system documentation:**
```
Feature                     | OrgAdmin | RiskAnalyst | LogOp | InvMgr | Viewer
─────────────────────────────────────────────────────────────────────────────
User Management             |   ✓      |     ✗       |  ✗    |  ✗     |  ✗
Supplier CRUD               |   ✓      |     R only  |  ✗    |  ✗     |  R
Shipment CRUD               |   ✓      |     R only  |  ✓    |  ✗     |  R
Inventory CRUD              |   ✓      |     R only  |  ✗    |  ✓     |  R
Risk Dashboard Access       |   ✓      |     ✓       |  ✓*   |  ✓*    |  R
Alert Acknowledge/Resolve   |   ✓      |     ✓       |  ✓*   |  ✓*    |  ✗
Manual Score Override       |   ✗      |     ✓       |  ✗    |  ✗     |  ✗  [CONCERN]
Report Export               |   ✓      |     ✓       |  ✗    |  ✗     |  ✗
System Config               |   ✓      |     ✗       |  ✗    |  ✗     |  ✗
Full Audit Trail            |   ✓      |     ✗       |  ✗    |  ✗     |  ✗
```

**Assessment: ADEQUATE (but coarse-grained)**

### 2.2 Granularity Issues

**The Problem:** Permissions are all-or-nothing at the role level.

**Examples:**
1. **Supplier Management:**
   - RISK_ANALYST can read suppliers BUT not create them (✓ correct)
   - BUT ORG_ADMIN can read AND create AND update AND delete (too broad)
   - No way to allow "create only" or "audit only"

2. **Alert Management:**
   - LOGISTICS_OPERATOR can acknowledge alerts
   - BUT must acknowledge ALL alerts (no scoping to assigned alerts)
   - Backend permission check: ✅ Good
   ```javascript
   // backend/src/routes/alertRoutes.js
   router.post('/:alertId/acknowledge',
     authenticate,
     authorize(['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER']),
     ...
   ```
   - No verification that the user is actually **assigned** that alert

3. **Risk Score Override:**
   - Only RISK_ANALYST can override
   - BUT they can override ANY supplier's score
   - No audit of who overrode what (only creation is logged)

### 2.3 Unused/Excessive Permissions

**Finding:** NOT DETECTED in this audit, but structure presents risks:
- No way to detect unused permissions (no permission dependency analysis)
- No recertification mechanism

### 2.4 Least Privilege Violations

🔴 **CRITICAL:** ORG_ADMIN violates least privilege by combining:
- User lifecycle management (hiring/firing)
- Role assignment (who gets power)
- Business operations (orders, inventory)
- System configuration (security settings)

These should be separated roles or require approval workflows.

---

## 3. ACCESS CONTROL ENFORCEMENT ANALYSIS

### 3.1 Backend Enforcement (Express Middleware Stack)

**Architecture: 3-Layer Model**

```
Request
  ↓
[1] authenticate() middleware
    ├─ Validates Bearer token JWT
    ├─ Decodes: userId, orgId, role
    ├─ Populates: req.user
    └─ Returns 401 if invalid/expired
  ↓
[2] authorize(roles) middleware
    ├─ Checks: req.user.role in allowed list
    ├─ Logs: UNAUTHORIZED_ACCESS_ATTEMPT
    └─ Returns 403 if not authorized
  ↓
[3] validateOrgId() middleware
    ├─ Compares: req.params.orgId === req.user.orgId
    ├─ Protects: Cross-tenant data access
    └─ Returns 403 if mismatch
  ↓
Service Layer
    └─ Additional orgId checks in repositories
```

**Strengths:**
- ✅ Middleware approach is clean and reusable
- ✅ Order is correct: authenticate BEFORE authorize
- ✅ Multi-tenant isolation enforced at both middleware + repository level
- ✅ Unauthorized attempts logged

**Implementation Quality: GOOD**
```javascript
// backend/src/middleware/auth.js - Proper pattern:

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.substring(7);
  const decoded = verifyAccessToken(token); // throws if invalid
  req.user = { userId: decoded.userId, orgId: decoded.orgId, role: decoded.role };
  next();
};

export const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      // ✅ Audit log: Good practice
      AuditLog.create({
        orgId: req.user.orgId,
        userId: req.user.userId,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        entityType: 'AUTHORIZATION',
        ipAddress: req.ip,
      }).catch(...);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### 3.2 Frontend Enforcement (React)

**Implementation: ProtectedRoute Component**

```javascript
// frontend/src/App.jsx
function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, isInitialized } = useSelector((state) => state.auth);
  
  if (!isInitialized) return null;
  if (!accessToken || !user) return <Navigate to="/login" />;
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <AccessDenied requiredRoles={requiredRoles} />;
  }
  return children;
}
```

**Assessment: UX-ONLY (NOT SECURITY)**
- ✅ Good for user experience
- ⚠️ **NOT a security boundary**
- ⚠️ Can be bypassed by:
  1. Modifying Redux state
  2. Deleting role check from browser DevTools
  3. Calling backend API directly
  4. Modifying localStorage tokens

**Risk Level: MEDIUM**
```javascript
// This is a BYPASS RISK:
// User A edits frontend ProtectedRoute to include 'VIEWER':
export const authorize = (allowedRoles) => {
  // Attacker removes: !requiredRoles.includes(user.role)
  // Backend IS still protected, but UI can be manipulated
  return children; // ❌ Bypassed
};

// BACKEND SAVES US:
// POST /api/users - Returns 403 from backend
// Because authorize(['ORG_ADMIN']) middleware enforces it
```

### 3.3 Route Coverage

✅ **GOOD: All data-modifying routes protected**
```
POST   /api/suppliers          → authorize(['ORG_ADMIN'])
PUT    /api/suppliers/:id      → authorize(['ORG_ADMIN'])
POST   /api/shipments          → authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR'])
POST   /api/users/create       → authorize(['ORG_ADMIN'])
POST   /api/users/:id/deactivate → authorize(['ORG_ADMIN'])
... and 20+ more
```

### 3.4 Enforcement Gaps

🟡 **MEDIUM:** isActive Status Not Enforced at Middleware Level

**Issue:** A deactivated user can still use their token until expiry.

```javascript
// User is deactivated, but token still valid:
User.deactivate(userId) → sets isActive: false
                       → invalidates refreshToken
                       → BUT access token remains valid for 15 minutes

// Meanwhile, they can still make requests:
GET /api/suppliers (Bearer <still-valid-token>) 
→ middleware authenticates: ✅ (JWT signature valid)
→ middleware authorizes: ✅ (role is in allowed list)
→ BUT should check: isActive status in database? ❌

// This is mitigated by:
// - Short token lifespan (15 min)
// - refreshToken invalidation prevents reauth
// BUT: Better to check isActive in authenticate middleware
```

**Recommendation:** Add isActive check in authenticate middleware.

---

## 4. SEPARATION OF DUTIES (SoD) ANALYSIS

### 4.1 Potential Conflicts Identified

| Conflicting Permissions | Risk | Example Abuse |
|------------------------|------|---|
| **ORG_ADMIN can both create users AND assign permissions** | HIGH | Admin creates unauthorized user, assigns ORG_ADMIN role to themselves |
| **ORG_ADMIN can create suppliers AND assign RISK_ANALYST role** | HIGH | Create supplier with inflated scores, assign role to analyst who won't override it |
| **RISK_ANALYST can override scores for ANY supplier** | MEDIUM | Manually lower supplier risk before signing contract |
| **ORG_ADMIN can view audit logs AND delete records** | CRITICAL | Delete evidence of unauthorized access |

### 4.2 Fraud/Abuse Scenarios

**Scenario 1: Privilege Escalation**
```
1. Attacker gains access with VIEWER role
2. Cannot escalate because:
   ✅ authorize(['VIEWER']) middleware blocks user creation
   ✅ Correct implementation
3. BUT if token is stolen/exposed:
   Person with physical access could reset password?
   [Depends on password reset flow - not in audit scope]
```

**Scenario 2: Unauthorized Supplier Registration**
```
1. ORG_ADMIN creates supplier "FakeCorp Inc" with inflated metrics
2. RISK_ANALYST cannot override (scores start high)
3. System approves FakeCorp for contract
4. ORG_ADMIN receives kickback
```
Mitigation: ✅ Audit log captures creation, ✅ second-party approval workflow (not implemented)

**Scenario 3: Audit Trail Tampering**
```
1. ORG_ADMIN accesses audit logs (legitimate)
2. ORG_ADMIN sees they assigned themselves ORG_ADMIN role
3. ORG_ADMIN... cannot DELETE audit logs (immutable by design)
   ✅ Good: MongoDB TTL prevents tampering, immutable hooks prevent deletes
```
Audit logs are well-protected. ✅

### 4.3 Separation of Duties Matrix

| Duty | By Role | SoD Score |
|------|---------|-----------|
| Create User | ORG_ADMIN | 🟢 OK (only admin) |
| Assign Role | ORG_ADMIN | 🟡 POOR (same person can create + assign) |
| Create Supplier | ORG_ADMIN | 🟡 POOR (overpowered) |
| Override Scores | RISK_ANALYST | 🟡 MEDIUM (can override anything) |
| Create Alerts | RISK_ANALYST | 🟢 OK (appropriate) |
| Acknowledge Alerts | Various | 🟢 OK (wide but documented) |

---

## 5. SCALABILITY & MAINTAINABILITY ANALYSIS

### 5.1 Codebase Maintenance Burden

🔴 **CRITICAL ISSUE: Hardcoded Role Strings**

**Where roles are hardcoded:**
- 40+ locations in route files
- 10+ locations in frontend App.jsx
- 3+ locations in component files
- User.js schema (1 source of truth)

**Example of duplication:**
```javascript
// backend/src/routes/alertRoutes.js
authorize(['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER'])

// backend/src/routes/supplierRoutes.js
authorize(['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR'])

// backend/src/routes/inventoryRoutes.js
authorize(['ORG_ADMIN', 'INVENTORY_MANAGER', 'VIEWER'])

// frontend/src/App.jsx
ProtectedRoute requiredRoles={['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR']}
ProtectedRoute requiredRoles={['ORG_ADMIN', 'INVENTORY_MANAGER', 'VIEWER']}

// If role name changes: Update 40+ locations ❌
// If typo introduced: Breaks that permission silently
```

### 5.2 Scalability Problems

**Add a new role (6th role)?**
1. Update User.js schema enum: 1 file
2. Update 40+ route permissions: 40+ files
3. Update frontend ProtectedRoute: 10+ places
4. Update permission matrix doc: 1 file
5. Sync frontend/backend definitions: Manual, error-prone

**Current time to add role:** ~1-2 hours  
**Ideal time with centralized constants:** ~15 minutes

### 5.3 Extensibility Assessment

| Scenario | Current Difficulty | Notes |
|----------|-------------------|-------|
| Add new role | 🔴 Hard | Must update 40+ locations |
| Add permission to role | 🔴 Hard | Scattered across routes |
| Add resource-based permissions | 🔴 Very Hard | Requires architecture change |
| Add permission groups | 🔴 Very Hard | No abstraction layer |
| Add conditional permissions | 🔴 Very Hard | Middleware doesn't support it |

---

## 6. SECURITY RISKS IDENTIFIED

### 6.1 Privilege Escalation Vectors

#### Risk 1: Direct Role Assignment (ORG_ADMIN)
**Severity:** 🔴 **HIGH**  
**Description:** ORG_ADMIN can self-assign roles without approval.

```javascript
// backend/src/routes/userRoutes.js
router.post('/:userId/assign-role', 
  authorize(['ORG_ADMIN']),  // ← Only one role can do this
  UserController.assignRole
);

// Scenario:
// 1. Attacker gains ORG_ADMIN credentials (phishing, insider)
// 2. POST /api/users/[their-user-id]/assign-role
// 3. Role is changed in DB
// 4. Access token still has old role (valid for 15 min)
// 5. To activate new role: Log out, log back in
// Risk: No approval required, no 2nd-person verification
```

**Mitigation (Quick):** Require current password for role assignment

#### Risk 2: Token Not Revalidated After Deactivation
**Severity:** 🟡 **MEDIUM**  
**Description:** Deactivated users can keep using access token for up to 15 minutes.

```javascript
// backend/src/middleware/auth.js
export const authenticate = async (req, res, next) => {
  const decoded = verifyAccessToken(token); // ← Only checks JWT signature/expiry
  req.user = { userId: decoded.userId, orgId: decoded.orgId, role: decoded.role };
  // ❌ Missing: Check User.isActive in database
  next();
};

// Mitigation: Add optional database check for sensitive operations
```

**Mitigation (Quick):** Get admin-only routes to check isActive status

#### Risk 3: Frontend State Manipulation
**Severity:** 🟡 **MEDIUM**  
**Description:** Frontend permission checks can be bypassed in browser.

```javascript
// Attacker opens DevTools → Redux inspector
// Changes: auth.user.role = 'ORG_ADMIN'
// ProtectedRoute now allows access to /users page
// BUT: DELETE /api/users/123 still fails (backend enforces it)
// STILL A RISK: They see UI they shouldn't, could find hidden patterns
```

**Mitigation (Good):** Backend enforcement makes this a low-impact UX issue only.

#### Risk 4: Token Secret Hardcoded Risk
**Severity:** 🟡 **MEDIUM**  
**Description:** JWT secrets stored in .env (standard practice, but single point of failure)

```javascript
// backend/src/middleware/auth.js
jwt.verify(token, process.env.JWT_ACCESS_SECRET)

// If .env is ever exposed: All tokens can be forged
// Mitigation: Standard - ensure .env is .gitignored, rotated regularly
```

### 6.2 Cross-Tenant Data Access

**Assessment: ✅ WELL-PROTECTED**

```javascript
// Data access patterns consistently enforce orgId:

// backend/src/middleware/auth.js
validateOrgId = (req, res, next) => {
  const requestedOrgId = req.params.orgId || req.body.orgId;
  if (requestedOrgId !== req.user.orgId.toString()) {
    AuditLog.create({ /* security incident */ });
    return res.status(403).json({ error: 'Cross-tenant access not permitted' });
  }
  next();
};

// backend/src/repositories/SupplierRepository.js
static async findById(orgId, supplierId) {
  return Supplier.findOne({ _id: supplierId, orgId }); // ← orgId in query
}

// Risk: LOW - orgId enforced at repository level
```

### 6.3 Audit Trail Integrity

**Assessment: ✅ GOOD**

```javascript
// Immutable audit logs:
// - pre-save hooks prevent updates/deletes
// - TTL index auto-purges after 90 days
// - All unauthorized attempts logged
// Risk: LOW
```

---

## 7. DETAILED RECOMMENDATIONS (PRIORITIZED)

### 🔴 CRITICAL FIXES

#### 1. Create Centralized Role/Permission Registry
**Priority:** 1/5 (Highest)  
**Estimated Effort:** 2-3 hours  
**Impact:** Improved maintainability, reduced errors

**Current State:**
- Role strings scattered across 40+ locations
- No single source of truth
- Risk: Typos, inconsistencies, hard to audit

**Recommendation:**
```javascript
// Create: backend/src/config/rbac.constants.js
export const ROLES = {
  ORG_ADMIN: 'ORG_ADMIN',
  RISK_ANALYST: 'RISK_ANALYST',
  LOGISTICS_OPERATOR: 'LOGISTICS_OPERATOR',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  VIEWER: 'VIEWER',
};

export const PERMISSION_MATRIX = {
  [ROLES.ORG_ADMIN]: {
    users: ['read', 'create', 'update', 'deactivate', 'assign-role', 'view-audit'],
    suppliers: ['read', 'create', 'update', 'delete'],
    shipments: ['read', 'create', 'update'],
    inventory: ['read', 'create', 'update'],
    alerts: ['read', 'acknowledge', 'escalate'],
    analytics: ['read', 'export'],
  },
  [ROLES.RISK_ANALYST]: {
    suppliers: ['read', 'override-score'],
    alerts: ['read', 'acknowledge'],
    analytics: ['read', 'export'],
  },
  // ... etc
};

// Usage in routes:
import { ROLES } from '../config/rbac.constants.js';

router.post('/users', 
  authorize([ROLES.ORG_ADMIN]),
  UserController.createUser
);
```

**Sync with Frontend:**
```javascript
// frontend/src/config/rbac.constants.js (identical)
// Ensures frontend/backend are always in sync
```

#### 2. Implement isActive Check in Middleware
**Priority:** 2/5  
**Estimated Effort:** 1 hour  
**Impact:** Prevent deactivated users from using old tokens

**Fix:**
```javascript
// backend/src/middleware/auth.js
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing auth header' });
    
    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);
    
    // ✅ NEW: Check user is still active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account inactive or deleted' });
    }
    
    req.user = {
      userId: decoded.userId,
      orgId: decoded.orgId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
```

**Performance Note:** This adds 1 DB query per request. Consider:
- Caching user active status in Redis with 1-min TTL
- Only check for sensitive operations (not GET requests)
- Use batch caching for validation

#### 3. Separate ORG_ADMIN into Multiple Roles
**Priority:** 3/5  
**Estimated Effort:** 4-5 hours  
**Impact:** Better separation of duties, reduced abuse potential

**Current Problem:**
- ORG_ADMIN handles hiring/firing, role assignment, business operations, and system config
- Violates least privilege principle
- Abuse scenario: Admin creates fake user, assigns ORG_ADMIN role to themselves

**Recommended Split:**
```javascript
export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',        // Super admin (use rarely)
  ORG_ADMIN: 'ORG_ADMIN',              // User/team management only
  SECURITY_OFFICER: 'SECURITY_OFFICER', // Can view audit logs, manage permissions
  OPERATIONS_LEAD: 'OPERATIONS_LEAD',   // Manages suppliers, shipments, inventory (what ORG_ADMIN does now)
  RISK_ANALYST: 'RISK_ANALYST',        // Risk analysis + score overrides
  LOGISTICS_OPERATOR: 'LOGISTICS_OPERATOR',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  VIEWER: 'VIEWER',
};

// Assign permissions:
SYSTEM_ADMIN:       // Can do literally everything (use with approval process)
ORG_ADMIN:          // Can create/invite users within org, manage teams
SECURITY_OFFICER:   // Can view audit logs, manage role assignments, reset passwords
OPERATIONS_LEAD:    // Can manage all operational data (suppliers, shipments, inventory)
```

**Refactoring Steps:**
1. Add new roles to User.js schema
2. Create migration: ORG_ADMIN → map some to OPERATIONS_LEAD, some to SECURITY_OFFICER
3. Update route permissions
4. Update frontend + documentation

#### 4. Add Approval Workflow for Sensitive Operations
**Priority:** 4/5  
**Estimated Effort:** 6-8 hours  
**Impact:** Prevent single-person abuse, improve SoD

**Recommended:** Require 2nd admin approval for:
- User creation/deletion
- Role assignment changes
- Risk score overrides
- Supplier registration

```javascript
// Example approval flow:
POST /api/users/create + requestApproval=true
→ Creates "PendingApproval" record
→ Notifies another ORG_ADMIN
→ GET /api/approvals (list pending)
→ POST /api/approvals/[id]/approve
→ User actually created

// Logs both requester + approver
```

---

### 🟡 MEDIUM-PRIORITY FIXES

#### 5. Implement Permission Composition
**Priority:** 5/5  
**Estimated Effort:** 3-4 hours  
**Impact:** More flexible, easier to maintain permissions

**Current:** Flat list of roles  
**Recommended:** Role hierarchies or permission groups

```javascript
// Define base permission groups:
export const PERMISSION_GROUPS = {
  READ_ALL: ['read:suppliers', 'read:shipments', 'read:inventory', 'read:alerts'],
  MANAGE_DATA: ['create:suppliers', 'update:suppliers', 'delete:suppliers'],
  OVERRIDE: ['override:risk-scores'],
  AUDIT: ['read:audit-logs', 'read:user-activity'],
};

// Compose roles from groups:
export const ROLES = {
  VIEWER: {
    permissions: [...PERMISSION_GROUPS.READ_ALL],
  },
  RISK_ANALYST: {
    permissions: [
      ...PERMISSION_GROUPS.READ_ALL,
      ...PERMISSION_GROUPS.OVERRIDE,
      'read:audit-logs', // partial audit
    ],
  },
  ORG_ADMIN: {
    permissions: [...Object.values(PERMISSION_GROUPS)].flat(),
  },
};

// Usage in middleware:
function authorizeByPermission(requiredPermission) {
  return (req, res, next) => {
    const userPermissions = ROLES[req.user.role].permissions;
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

// Usage in routes:
router.post('/suppliers', 
  authorize(['ORG_ADMIN']),  // ← Can still use role-based
  authorizeByPermission('create:suppliers'), // ← Or permission-based
  SupplierController.createSupplier
);
```

#### 6. Add Conditional Permission Checks
**Priority:** 6/5 (Lower, but useful)  
**Estimated Effort:** 2-3 hours  
**Impact:** More granular access control

**Use Case:** Allow LOGISTICS_OPERATOR to update ONLY their assigned shipments

```javascript
// Current (broken):
router.put('/:shipmentId', 
  authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
  ShipmentController.updateShipment
);

// Any LOGISTICS_OPERATOR can update ANY shipment
// ❌ Should be: Only their assigned shipments

// Recommended fix:
function requireOwnership(req, res, next) {
  if (req.user.role === 'ORG_ADMIN') {
    return next(); // Admins bypass check
  }
  
  // For others: Verify they own this resource
  const shipment = await Shipment.findById(req.params.shipmentId);
  if (shipment.assignedTo !== req.user.userId) {
    return res.status(403).json({ error: 'Cannot modify shipment assigned to others' });
  }
  next();
}

router.put('/:shipmentId', 
  authorize(['ORG_ADMIN', 'LOGISTICS_OPERATOR']),
  requireOwnership,
  ShipmentController.updateShipment
);
```

#### 7. Implement Role-Scope Validation
**Priority:** 7/5  
**Estimated Effort:** 2 hours  
**Impact:** Prevent cross-org escalation attempts

```javascript
// Current: Only checks orgId exists

// Recommended: Add scope validation
function validateOrgIdScope(req, res, next) {
  const requestedOrgId = req.params.orgId || req.body.orgId;
  
  if (!requestedOrgId) {
    return res.status(400).json({ error: 'orgId required' });
  }
  
  if (requestedOrgId !== req.user.orgId.toString()) {
    // Log as security incident
    console.warn(`SECURITY: User ${req.user.userId} tried to access org ${requestedOrgId}`);
    return res.status(403).json({ error: 'Cross-org access denied' });
  }
  
  next();
}

// Apply to all data routes
router.use(validateOrgIdScope);
```

---

### 🟢 NICE-TO-HAVE IMPROVEMENTS

#### 8. Add Role-Based Rate Limiting
**Estimated Effort:** 2-3 hours  
**Impact:** Prevent abuse from compromised accounts

```javascript
// Different rate limits by role:
const rateLimitByRole = {
  ORG_ADMIN: { windowMs: 60000, max: 100 }, // 100 req/min
  RISK_ANALYST: { windowMs: 60000, max: 50 },
  VIEWER: { windowMs: 60000, max: 30 },
};

router.use((req, res, next) => {
  if (req.user) {
    const limit = rateLimitByRole[req.user.role] || { windowMs: 60000, max: 20 };
    rateLimit(limit)(req, res, next);
  } else {
    next();
  }
});
```

#### 9. Add Periodic Permission Audit Job
**Estimated Effort:** 3-4 hours  
**Impact:** Detect and flag suspicious role assignments

```javascript
// Scheduled job (nightly):
// 1. Find all users with role changes in past 7 days
// 2. Cross-reference with audit logs
// 3. Flag users reassigned to higher privilege roles
// 4. Generate report for security team
```

#### 10. Implement Session Management
**Estimated Effort:** 2-3 hours  
**Impact:** Track active tokens, allow forced logout

```javascript
// Track active sessions:
// - Session creation time
// - Last activity
// - Device fingerprint
// - Geographic location

// Allow admins to:
// - View active sessions per user
// - Force logout a session
// - Revoke all sessions (global logout)

// Prevents: Token theft abuse, lost device access
```

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1 (Week 1): Critical Fixes
- [ ] Create rbac.constants.js with centralized roles
- [ ] Add isActive check to authenticate middleware
- [ ] Update all route imports to use constants
- [ ] Test: Verify no regressions

### Phase 2 (Week 2): Role Restructuring
- [ ] Design new role hierarchy (ORG_ADMIN split)
- [ ] Create data migration for existing users
- [ ] Update User model schema
- [ ] Update routes and tests
- [ ] Test: Verify permission matrix

### Phase 3 (Week 3): Advanced Controls
- [ ] Implement permission composition system
- [ ] Add conditional ownership checks (shipments, etc)
- [ ] Implement approval workflow for sensitive ops

### Phase 4 (Week 4): Monitoring & Documentation
- [ ] Add permission audit job
- [ ] Document all changes
- [ ] Create role assignment guidelines
- [ ] Train admins on new role system

---

## 9. SoD VIOLATION SUMMARY

| Violation | Current Risk | Recommended Fix | Effort |
|-----------|--------------|-----------------|--------|
| User creation + role assignment | HIGH | Require 2nd approver | 2h |
| ORG_ADMIN overpowered | HIGH | Split into multiple roles | 5h |
| Deactivated users keep access | MEDIUM | Check isActive in middleware | 1h |
| Audit log access + deletion | LOW | ✅ Already immutable | 0h |

---

## 10. COMPLIANCE CHECKLIST

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **Least Privilege** | 🟡 PARTIAL | ORG_ADMIN exceeds necessary permissions |
| **Separation of Duties** | 🟡 PARTIAL | User creation + role assignment in same role |
| **Audit Trail** | ✅ COMPLETE | Comprehensive logging, immutable records |
| **Multi-Tenancy** | ✅ COMPLETE | orgId enforced at repository + middleware |
| **Authentication** | ✅ COMPLETE | JWT with refresh token rotation |
| **Authorization** | ✅ GOOD | Middleware-based RBAC enforcement |
| **Frontend Validation** | ⚠️ UX-ONLY | Not a security boundary |
| **Token Management** | ✅ COMPLETE | 15-min access, 7-day refresh, reuse detection |

---

## 11. TESTING RECOMMENDATIONS

### Unit Tests to Add
```javascript
// 1. Test role constants are synced between frontend/backend
test('ROLES constant matches User.js enum', () => {
  const rolesConstant = Object.keys(ROLES);
  const userSchemaEnum = User.schema.paths.role.enumValues;
  expect(rolesConstant).toEqual(userSchemaEnum);
});

// 2. Test deactivated users can't access middleware
test('authenticate rejects deactivated users', async () => {
  const deactivatedUser = await User.create({ ...userData, isActive: false });
  const validToken = generateAccessToken(deactivatedUser._id, ...);
  
  const res = await request(app)
    .get('/api/suppliers')
    .set('Authorization', `Bearer ${validToken}`);
  
  expect(res.statusCode).toBe(401);
});

// 3. Test cross-org access attempts are logged
test('validateOrgId logs security incident', async () => {
  const spy = jest.spyOn(AuditLog, 'create');
  
  await request(app)
    .get(`/api/suppliers`)
    .set('orgId', 'different-org-id')
    .set('Authorization', `Bearer ${token}`);
  
  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      action: 'CROSS_TENANT_ACCESS_ATTEMPT'
    })
  );
});
```

### Integration Tests to Add
```javascript
// Test each role can only access their own endpoints
for (const [role, permissions] of Object.entries(PERMISSION_MATRIX)) {
  test(`${role} can access assigned routes only`, async () => {
    const user = await createTestUser(role);
    // Test permissions...
  });
}
```

### Security Tests
```javascript
// Test privilege escalation scenarios
test('VIEWER cannot assign roles even with manipulated token', async () => {
  const viewer = await createTestUser('VIEWER');
  const fakeToken = jwt.sign(
    { role: 'ORG_ADMIN' }, // Forged
    'wrong-secret'
  );
  
  const res = await request(app)
    .post(`/api/users/role`)
    .set('Authorization', `Bearer ${fakeToken}`);
  
  expect(res.statusCode).toBe(401); // Token verification fails
});
```

---

## CONCLUSION

Your RBAC implementation is **solid architecturally** but has **maintenance and scalability concerns**. The middleware-based approach is correct, multi-tenancy is well-enforced, and audit logging is comprehensive.

**Critical issues to fix:**
1. 🔴 Hardcoded role strings (maintainability)
2. 🔴 ORG_ADMIN over-privileged (security)
3. 🟡 No isActive check in middleware (access control gap)

**Overall Risk Level: 🟡 MEDIUM**
- Backend is well-protected
- Frontend permission checks are UX-only
- Main risk is operational (consistency, auditing, approval workflows)

**Time to implement all recommendations: ~20-25 hours**
- Critical fixes: 4-5 hours
- Medium-priority: 12-14 hours
- Nice-to-have: 6-8 hours

---

## APPENDIX: Quick Reference

### All Routes with Role Requirements
See implementation checklist below.

### Reading Guide for Code
1. Start: `backend/src/middleware/auth.js` (main RBAC logic)
2. Then: `backend/src/models/User.js` (role enum)
3. Then: `backend/src/routes/*.js` (route protection)
4. Then: `frontend/src/App.jsx` (ProtectedRoute)
5. Then: `frontend/src/components/UsersPage/RolePermissionMatrix.jsx` (permission display)

---

**Report Generated:** April 3, 2026  
**Audit Conducted By:** GitHub Copilot - Senior Security Auditor (RBAC Specialist)  
**Classification:** Internal - Security Sensitive

