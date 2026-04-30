# Logistics18 — Final Demo Runbook (30 minutes)

**Group**: Y2S2-WE-DS-G18 · **Course**: IT2021 AIML Project (Assignment 04)
**Stack**: React + Express + MongoDB + FastAPI/XGBoost/SHAP

This runbook gives every team member a script for their part of the live demo. It is calibrated for a 30-minute slot (~3 minutes per module + intro + Q&A buffer).

---

## 0. Pre-flight checklist (T-15 minutes)

Run these in order. Do **not** skip — most demo failures come from a service not being up.

```bash
# 1. MongoDB running on default port
#    (Windows: should be a running service; macOS: `brew services list`)

# 2. Start ML service (terminal 1)
cd ml-service
PYTHONIOENCODING=utf-8 ../.venv/Scripts/python.exe main.py
#   Wait for: "[OK] Models and SHAP Explainers loaded successfully"
#   Verify:   curl http://localhost:8000/health   → models all "loaded"

# 3. Start backend (terminal 2)
cd backend
npm run dev
#   Wait for: "✓ Logistic 18 Backend running on http://localhost:5000"

# 4. Start frontend (terminal 3)
cd frontend
npm run dev
#   Open: http://localhost:5174

# 5. Optional re-seed (if data is dirty)
cd backend
node seed.js
#   Expected: 5 warehouses, 20 suppliers, 40 inventory, 25 shipments, 14 alerts

# 6. Run the E2E sanity test (terminal 4)
cd ..
bash demo-e2e-test.sh
#   Must show: "ALL CHECKS PASSED — SYSTEM IS DEMO-READY"
```

If anything fails here, fix it before going on stage.

---

## 1. Demo accounts (one per role)

All accounts use password `Demo1234!` (admin uses `AdminPass123!`). They share the single Logistics18 organisation.

| Email | Role | Used by |
|---|---|---|
| `admin@logistics18.com` | ORG_ADMIN (super-admin) | Project lead during intro |
| `admin.demo@logistics18.com` | ORG_ADMIN | Rathnamalala — Auth/User mgmt |
| `analyst.demo@logistics18.com` | RISK_ANALYST | Rifshadh — Supplier Risk |
| `logistics.demo@logistics18.com` | LOGISTICS_OPERATOR | Umayanthi — Shipments |
| `inventory.demo@logistics18.com` | INVENTORY_MANAGER | Wijemanna — Inventory |
| `alerts.demo@logistics18.com` | RISK_ANALYST | Kulatunga — Alerts |
| `analytics.demo@logistics18.com` | ORG_ADMIN | Senadeera — Analytics |
| `viewer.demo@logistics18.com` | VIEWER | Anyone — read-only walkthrough |

---

## 2. Time-boxed demo flow

### (0:00–2:30) — Intro & system landscape · **Project lead**

Open with a 90-second pitch:
> "We built **Logistics18**, a supply-chain risk management platform that scores three risk surfaces — supplier reliability, shipment delays, and inventory stockouts — using three independent XGBoost models. Each prediction comes with a SHAP explanation so users see *why* the model assigned a risk tier, not just the score."

Show the architecture diagram (or whiteboard it):
```
React (5174) ──HTTP──▶ Express (5000) ──HTTP──▶ FastAPI/XGBoost (8000)
                            │
                            └────► MongoDB
```
Open `http://localhost:8000/health` in the browser — point to `models.*: "loaded"`.

Run `bash demo-e2e-test.sh` once on screen so the audience sees **28/28 passing**. This single artefact addresses the *Testing & Validation (4%)* rubric in one step.

---

### (2:30–6:00) — Auth & User Management · **Rathnamalala** (ORG_ADMIN)

1. Log in as `admin@logistics18.com` / `AdminPass123!`. Show landing on Dashboard.
2. Open **Users** page. Show the 8 demo users, all in one organisation.
3. Click **Invite User** (or Create) → make a new VIEWER account live.
4. **Show RBAC in action**: log out, log in as `viewer.demo@logistics18.com`, point out that `/users` is now blocked by `AccessDenied`. Log back in as admin.
5. Open the **activity log** of any user → highlight the immutable audit trail (ROLE_CHANGED, LOGIN entries).
6. Talking points for viva:
   - JWT with 15-min access + 7-day refresh tokens; rotation on every refresh; reuse-detection invalidates the chain.
   - bcrypt with 10 salt rounds; passwords never leave the DB unhashed.
   - Single-organisation mode (per project pivot) — first registered user becomes `ORG_ADMIN`, all subsequent users default to `VIEWER`.

---

### (6:00–10:00) — Supplier Risk + ML feature · **Rifshadh** (RISK_ANALYST)

This is the marquee module — spend a little extra time here because the AI/ML rubric is heaviest on Supplier Risk.

1. Log in as `analyst.demo@logistics18.com`.
2. Open **Suppliers**. Filter to `riskTier=critical` — show *RedFlag Logistics Co.* and *Shattered Supply Chain Inc.*
3. Click into one critical supplier → **show the ML Explainability Panel** with three SHAP features (e.g., `onTimeDeliveryRate`, `geopoliticalRiskFlag`, `financialScore`) and impact pills (high/medium/low).
4. Click **Override Score**. Lower the score from 95 → 65, give a justification ("Renegotiated SLA, monitoring period started"). Show the override appears in **History** with analyst name, timestamp, and justification.
5. Click **Compare** with another supplier — show side-by-side metrics and risk tiers.
6. **Live ML demo**: open **New Supplier**, enter risky inputs (OTD=40, financial=20, defect=9, geopolitical=1) → submit and watch the page show the predicted tier `critical` plus three SHAP features.
7. Talking points for viva:
   - XGBoost regressor, R² 0.9997 on validation set (`tuning_reports/supplier_tuning_report.json`).
   - 10 features: `onTimeDeliveryRate, financialScore, defectRate, disputeFrequency, geopoliticalRiskFlag, totalShipments, averageDelayDays, daysSinceLastShip, activeShipmentCount, categoryRisk`.
   - Top-3 SHAP impacts surfaced per prediction; thresholds |SHAP|>5 → medium, |SHAP|>20 → high.
   - Override is audit-logged (immutable, 90-day TTL); analyst can revert by overriding back.

---

### (10:00–13:30) — Shipment Tracking · **Umayanthi** (LOGISTICS_OPERATOR)

1. Log in as `logistics.demo@logistics18.com`.
2. Open **Shipments**. Filter to `status=delayed` → show the 5 delayed shipments seeded for the demo.
3. Click into *SHP-2025-0014* (Caracas → Chicago, 168h delay, score 90) — show the tracking timeline, status history, and ML risk + SHAP.
4. Click **Update Status** → move it from `delayed` → `rerouted` with notes "Diverted via Panama port due to weather". Show the status history grows.
5. **Live create**: click **New Shipment**, fill in carrier=DHL, origin=Singapore, dest=Memphis, weather=medium → submit. Show the predicted shipment risk score appear immediately.
6. Talking points for viva:
   - Status state machine: registered → in_transit → (delayed | rerouted) → delivered → closed.
   - Carrier API integration scaffolded (FedEx/UPS/DHL keys in `.env`); falls back to manual updates for the demo.
   - Delay-detection cron runs every 15 minutes; auto-creates an Alert when ETA passes by ≥24h.
   - ML model R² 0.9996; top features `etaDeviationHours, weatherLevel, routeRiskIndex, carrierReliability, trackingGapHours`.

---

### (13:30–17:00) — Inventory Management · **Wijemanna** (INVENTORY_MANAGER)

1. Log in as `inventory.demo@logistics18.com`.
2. Open **Inventory**. Show the dashboard KPIs at the top (totalStock, criticalItems, atRisk).
3. Filter for `riskTier=critical` → highlight items like *Refrigerant Gas R-410A 11kg* (stock=20, daily demand=4, lead=28d → stockout in 5 days).
4. Click into one critical item → show **Demand Forecast** chart (30/60/90-day projections) and the ML SHAP panel.
5. Open **Warehouses** page. Show 5 warehouses across the US. Click *Memphis* → show its inventory.
6. **Demonstrate transfer workflow**: from Long Beach, request a transfer of 5 units of an item to Memphis. Approve as ORG_ADMIN. Complete the transfer. Show the destination stock increased.
7. Talking points for viva:
   - Pre-save Mongoose hook computes `safetyStock`, `reorderPoint`, and 30/60/90 demand forecasts using mean ± Z·σ.
   - ML model predicts stockout risk; top features `currentStock, supplierRiskScore, safetyStock, reorderPoint, leadTimeDays`.
   - Auto-alert fires when stock falls below reorderPoint (you'll see it in the Alerts module next).

---

### (17:00–20:00) — Alerts & Notifications · **Kulatunga** (RISK_ANALYST)

1. Log in as `alerts.demo@logistics18.com`.
2. Open **Alerts**. Show the dashboard KPIs (open/acknowledged/resolved/escalated).
3. Filter to `severity=critical` → walk through one critical supplier alert and one critical shipment alert.
4. Click **Acknowledge** on an open alert → show the workflow: open → acknowledged. The cooldown badge appears.
5. Click **Resolve** on an acknowledged alert → enter a resolution note ("Confirmed with carrier, package re-routed via secondary lane"). Show resolved status with note + resolver name.
6. **Demonstrate auto-generation**: in another tab, log in as ORG_ADMIN and create a new supplier with critical-risk inputs (OTD=35, defect=10, geopolitical=1). Refresh the Alerts page — a new supplier alert has been auto-generated.
7. Talking points for viva:
   - Auto-generation hooks: any save with `riskTier ∈ {high, critical}` creates an alert (with cooldown anti-spam, 30-min default).
   - Escalation cron every 5 minutes: alerts unacknowledged past SLA (`org.alertDefaultSLA = 24h`) are auto-escalated.
   - Polling: dashboard refreshes every 30s; manual refresh available too.

---

### (20:00–23:00) — Analytics & Reports · **Senadeera** (ORG_ADMIN)

1. Log in as `analytics.demo@logistics18.com`.
2. Open **Analytics Dashboard**. Walk through:
   - Overall risk score gauge (composite metric)
   - Active alerts breakdown by severity
   - Delayed shipments trend
   - At-risk inventory
3. Open **KPI page** → show charts of risk distribution by tier, by category.
4. Open **Reports** → click **Generate Report**, choose `format=pdf, module=overall`. Download the PDF and open it on screen.
5. Generate a CSV report next so you have one of each format on disk.
6. Talking points for viva:
   - Aggregations done with MongoDB aggregation pipelines (`$group`, `$bucket`).
   - PDF generation uses PDFKit; CSV uses ExcelJS.
   - Charts use Recharts (frontend) reading the same `/api/analytics/*` endpoints.

---

### (23:00–25:00) — Putting it all together (live cross-module flow)

This is the *integration* part of the rubric (3%). One person drives, the team narrates.

1. As ORG_ADMIN, **create a new high-risk supplier** in the Suppliers page (OTD=45, geopolitical=1). Watch the Alerts page update.
2. **Create an inbound shipment** from that supplier with weather=high, weight=400kg. Watch the shipment risk be high.
3. **Create an inventory item** sourced from that supplier with stock=10, demand=5/day → see auto-alert "Reorder Required".
4. Open the **Analytics dashboard** → see the overall risk score has ticked upward, and a new entry in `delayedShipments` if the ETA already passed.
5. End with: *"Every change in one module propagated to alerts, analytics, and the ML risk surface — that's our integration story."*

---

### (25:00–30:00) — Q&A buffer + closing

Every team member should be ready for these viva questions:

| Question | Strong answer |
|---|---|
| Why XGBoost over a neural network? | Tabular data with <50 features; XGBoost trains faster, generalises better in low-data regimes, and SHAP TreeExplainer is exact (not approximate) for tree models. |
| How did you validate the model? | 5-fold CV + 80/20 train-validation split. R² > 0.99 across all three domains, RMSE < 1.4 on a 0–100 scale. Confusion of tier (low/medium/high/critical) checked manually on 100 samples. |
| What if the ML service is down? | Backend services catch the axios error and fall back to a deterministic rule-based scoring path. The system stays online; users see a `source: rule_based_fallback` flag. |
| How do you handle multi-user race conditions? | Mongoose optimistic locking via `__v` (version key); refresh tokens are versioned and reuse-detected; audit log is immutable. |
| Why single-organisation? | Project scope was reduced to one tenant for the demo; the data layer still has `orgId` so multi-tenant could be re-enabled by removing the auto-attach in `AuthService.register`. |
| How are SHAP values computed? | `shap.TreeExplainer` precomputed at FastAPI startup; per request we call `explainer.shap_values(X)` and return the top 3 by absolute value. Impact bucketed to low/medium/high by thresholds 5 and 20. |

---

## 3. Demo-day failure recovery

| Symptom | Quick fix |
|---|---|
| Frontend shows blank screen | Check `frontend/.env` has `VITE_API_URL=http://localhost:5000/api`. Restart `npm run dev`. |
| Login returns 500 | Backend lost MongoDB connection. Restart MongoDB, then `npm run dev` in `/backend`. |
| Risk score is 0 / no SHAP | ML service is down. Check `curl http://localhost:8000/health`; restart with `python main.py`. |
| 429 Too Many Requests on login | Auth rate limit; wait 60s or restart backend. |
| Stale data after edits | Force a reseed: `cd backend && node seed.js` (preserves users, replaces business data). |
| ML predictions return `detail: 'X not in index'` | Old ML container running. Stop python processes, restart with the patched `preprocessing.py` (already in main). |

---

## 4. Files to keep open during the demo

- This runbook (so you don't lose your place)
- `demo-e2e-test.sh` output (proof the system passes 28/28 checks)
- `ML_VALIDATION_SUMMARY.md` (R²/RMSE/MAE table for viva)
- An IDE window with one chosen file per speaker so you can show real code (e.g. `AuthService.js`, `SupplierService.js`, `main.py`).
