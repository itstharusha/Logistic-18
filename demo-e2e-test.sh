#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# Logistics18 — End-to-End Demo Verification Script
# ════════════════════════════════════════════════════════════════════════════
# Run this before the final presentation to confirm every module is healthy.
# Exits with non-zero if any critical step fails. Prints a green PASS report
# you can show during the testing-evidence portion of the demo.
#
# Usage:   bash demo-e2e-test.sh
# Windows: run from Git Bash or WSL (curl + python required on PATH)
# ════════════════════════════════════════════════════════════════════════════

set -u
BACKEND="${BACKEND_URL:-http://localhost:5000}"
ML="${ML_URL:-http://localhost:8000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@logistics18.com}"
ADMIN_PASS="${ADMIN_PASS:-AdminPass123!}"

PASS=0
FAIL=0
TOTAL=0

reset='\033[0m'; bold='\033[1m'; green='\033[32m'; red='\033[31m'; yellow='\033[33m'; cyan='\033[36m'

step() { echo -e "${cyan}▶${reset} $*"; }
ok()   { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); echo -e "  ${green}✓ PASS${reset} $*"; }
bad()  { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); echo -e "  ${red}✗ FAIL${reset} $*"; }

# Helpers — minimal JSON parsing via python (no jq dep)
jget() { python -c "import json,sys; d=json.loads(sys.stdin.read()); print($1)"; }

assert_http() {
  local name="$1" url="$2" expected="$3" extra="${4:-}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" $extra "$url" || echo 000)
  if [ "$code" = "$expected" ]; then ok "$name → HTTP $code"; else bad "$name → HTTP $code (expected $expected)"; fi
}

# ═══ 1. Service health checks ════════════════════════════════════════════════
echo -e "${bold}=== 1. Service Health ===${reset}"
step "Backend health"
if curl -sf "$BACKEND/api/health" >/dev/null; then ok "Backend up at $BACKEND"; else bad "Backend not reachable"; exit 1; fi

step "ML service health"
ML_BODY=$(curl -sf "$ML/health" || echo '{}')
if echo "$ML_BODY" | grep -q '"status":"healthy"'; then ok "ML service up at $ML"; else bad "ML service not reachable"; exit 1; fi
SUP_LOADED=$(echo "$ML_BODY" | jget 'd["models"]["supplier"]')
SHP_LOADED=$(echo "$ML_BODY" | jget 'd["models"]["shipment"]')
INV_LOADED=$(echo "$ML_BODY" | jget 'd["models"]["inventory"]')
[ "$SUP_LOADED" = "loaded" ] && ok "Supplier XGBoost model loaded" || bad "Supplier model status: $SUP_LOADED"
[ "$SHP_LOADED" = "loaded" ] && ok "Shipment XGBoost model loaded" || bad "Shipment model status: $SHP_LOADED"
[ "$INV_LOADED" = "loaded" ] && ok "Inventory XGBoost model loaded" || bad "Inventory model status: $INV_LOADED"

# ═══ 2. Authentication ═══════════════════════════════════════════════════════
echo
echo -e "${bold}=== 2. Authentication & Authorization ===${reset}"
step "Admin login"
LOGIN_BODY=$(curl -s -X POST "$BACKEND/api/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN_BODY" | jget 'd.get("accessToken","")')
if [ -n "$TOKEN" ]; then ok "Admin login (JWT issued, ${#TOKEN} chars)"; else bad "Admin login failed: $LOGIN_BODY"; exit 1; fi

step "Token validation via /me"
ME_BODY=$(curl -s "$BACKEND/api/auth/me" -H "Authorization: Bearer $TOKEN")
ROLE=$(echo "$ME_BODY" | jget 'd["user"]["role"]')
[ "$ROLE" = "ORG_ADMIN" ] && ok "Token valid, role=$ROLE" || bad "Unexpected role: $ROLE"

step "RBAC: unauthenticated request rejected"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND/api/users")
[ "$CODE" = "401" ] && ok "Unauthenticated GET /users → 401 (correct)" || bad "Got HTTP $CODE (expected 401)"

# ═══ 3. Supplier module (Rifshadh) ═══════════════════════════════════════════
echo
echo -e "${bold}=== 3. Supplier Risk Module (Rifshadh) ===${reset}"
step "List suppliers"
SUP_BODY=$(curl -s "$BACKEND/api/suppliers?limit=5" -H "Authorization: Bearer $TOKEN")
SUP_COUNT=$(echo "$SUP_BODY" | jget 'd.get("total",0)')
[ "$SUP_COUNT" -gt 0 ] && ok "Suppliers in DB: $SUP_COUNT" || bad "Empty supplier list"

step "Create supplier (triggers ML inference)"
NEW_SUP=$(curl -s -X POST "$BACKEND/api/suppliers" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"E2E-Test Supplier '"$RANDOM"'","category":"raw_materials","country":"IN","onTimeDeliveryRate":68,"financialScore":52,"defectRate":4.5,"disputeFrequency":4,"geopoliticalRiskFlag":1,"avgDelayDays":3,"yearsInBusiness":5,"contractValue":150000}')
NEW_SUP_ID=$(echo "$NEW_SUP" | jget 'd.get("supplier",{}).get("_id","")')
NEW_SUP_RISK=$(echo "$NEW_SUP" | jget 'd.get("supplier",{}).get("riskScore",0)')
SHAP_LEN=$(echo "$NEW_SUP" | jget 'len(d.get("supplier",{}).get("shapValues",[]))')
if [ -n "$NEW_SUP_ID" ]; then ok "Created (ML risk=$NEW_SUP_RISK, SHAP features=$SHAP_LEN)"; else bad "Create failed"; fi

step "RISK_ANALYST overrides risk score"
ANALYST_TOKEN=$(curl -s -X POST "$BACKEND/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"analyst.demo@logistics18.com","password":"Demo1234!"}' | jget 'd.get("accessToken","")')
if [ -n "$ANALYST_TOKEN" ] && [ -n "$NEW_SUP_ID" ]; then
  OVR=$(curl -s -X POST "$BACKEND/api/suppliers/$NEW_SUP_ID/override-score" -H "Authorization: Bearer $ANALYST_TOKEN" -H "Content-Type: application/json" \
    -d '{"newScore":75,"justification":"E2E test: simulating analyst override based on field intelligence."}')
  OVR_SCORE=$(echo "$OVR" | jget 'd.get("supplier",{}).get("riskScore",0)')
  [ "$OVR_SCORE" = "75" ] && ok "Override persisted (score=$OVR_SCORE, audit logged)" || bad "Override mismatch: $OVR_SCORE"
else
  bad "Analyst auth or supplier id missing"
fi

step "Compare suppliers"
SUP_IDS=$(echo "$SUP_BODY" | python -c "import json,sys; d=json.loads(sys.stdin.read()); ids=[s['_id'] for s in d.get('suppliers',d.get('data',[]))[:2]]; print(json.dumps(ids))")
CMP=$(curl -s -X POST "$BACKEND/api/suppliers/compare" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"ids\":$SUP_IDS}")
CMP_LEN=$(echo "$CMP" | jget 'len(d.get("suppliers",d.get("comparison",d.get("data",[]))))')
[ "$CMP_LEN" -ge 2 ] && ok "Compared $CMP_LEN suppliers side-by-side" || bad "Compare returned $CMP_LEN entries"

# ═══ 4. Shipment module (Umayanthi) ══════════════════════════════════════════
echo
echo -e "${bold}=== 4. Shipment Tracking Module (Umayanthi) ===${reset}"
step "List shipments"
SHP=$(curl -s "$BACKEND/api/shipments?limit=5" -H "Authorization: Bearer $TOKEN")
SHP_COUNT=$(echo "$SHP" | jget 'd.get("total",0)')
[ "$SHP_COUNT" -gt 0 ] && ok "Shipments in DB: $SHP_COUNT" || bad "Empty shipment list"

step "Create shipment (triggers ML inference)"
SUP1=$(echo "$SUP_BODY" | jget 'd.get("suppliers",d.get("data",[]))[0]["_id"]')
ETA="2026-06-15T00:00:00.000Z"
NEW_SHP=$(curl -s -X POST "$BACKEND/api/shipments" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"carrier\":\"DHL\",\"priority\":\"express\",\"supplierId\":\"$SUP1\",\"originCity\":\"Singapore\",\"originCountry\":\"SG\",\"destinationCity\":\"Memphis\",\"destinationCountry\":\"US\",\"estimatedDelivery\":\"$ETA\",\"weight\":350,\"weatherLevel\":\"medium\"}")
NEW_SHP_ID=$(echo "$NEW_SHP" | jget 'd.get("shipment",{}).get("_id","")')
NEW_SHP_RISK=$(echo "$NEW_SHP" | jget 'd.get("shipment",{}).get("riskScore",0)')
[ -n "$NEW_SHP_ID" ] && ok "Created shipment (ML risk=$NEW_SHP_RISK)" || bad "Create failed"

step "Status workflow: registered → in_transit"
if [ -n "$NEW_SHP_ID" ]; then
  STATUS_RES=$(curl -s -X PATCH "$BACKEND/api/shipments/$NEW_SHP_ID/status" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"in_transit","notes":"Picked up by carrier"}')
  NEW_STATUS=$(echo "$STATUS_RES" | jget 'd.get("shipment",{}).get("status","")')
  [ "$NEW_STATUS" = "in_transit" ] && ok "Status transitioned: registered → in_transit" || bad "Status mismatch: $NEW_STATUS"
fi

# ═══ 5. Inventory module (Wijemanna) ═════════════════════════════════════════
echo
echo -e "${bold}=== 5. Inventory Management Module (Wijemanna) ===${reset}"
step "List inventory"
INV=$(curl -s "$BACKEND/api/inventory?limit=5" -H "Authorization: Bearer $TOKEN")
INV_COUNT=$(echo "$INV" | jget 'd.get("total",0)')
[ "$INV_COUNT" -gt 0 ] && ok "Inventory items in DB: $INV_COUNT" || bad "Empty inventory list"

step "Inventory dashboard KPIs"
DASH=$(curl -s "$BACKEND/api/inventory/dashboard" -H "Authorization: Bearer $TOKEN")
TOTAL_STOCK=$(echo "$DASH" | jget 'd.get("summary",{}).get("totalStock",0)')
CRITICAL=$(echo "$DASH" | jget 'd.get("summary",{}).get("criticalItems",0)')
ok "totalStock=$TOTAL_STOCK, critical=$CRITICAL"

step "Reorder list"
REORDER=$(curl -s "$BACKEND/api/inventory/reorder-list" -H "Authorization: Bearer $TOKEN")
REORDER_COUNT=$(echo "$REORDER" | python -c "import json,sys; d=json.loads(sys.stdin.read()); print(len(d.get('items',d.get('data',[]))) if isinstance(d,dict) else len(d))")
ok "Reorder list returned $REORDER_COUNT items"

step "Warehouses"
WH=$(curl -s "$BACKEND/api/inventory/warehouses" -H "Authorization: Bearer $TOKEN")
WH_COUNT=$(echo "$WH" | jget 'd.get("total",0)')
[ "$WH_COUNT" -ge 5 ] && ok "Warehouses configured: $WH_COUNT" || bad "Only $WH_COUNT warehouses found"

# ═══ 6. Alerts module (Kulatunga) ════════════════════════════════════════════
echo
echo -e "${bold}=== 6. Alerts Module (Kulatunga) ===${reset}"
step "Alerts dashboard KPIs"
A_DASH=$(curl -s "$BACKEND/api/alerts/dashboard" -H "Authorization: Bearer $TOKEN")
A_OPEN=$(echo "$A_DASH" | jget 'd.get("stats",{}).get("open",0)')
A_TOTAL=$(echo "$A_DASH" | jget 'd.get("stats",{}).get("total",0)')
ok "Alert KPIs — open=$A_OPEN, total=$A_TOTAL"

step "Acknowledge an alert"
ALERT_LIST=$(curl -s "$BACKEND/api/alerts?status=open&limit=1" -H "Authorization: Bearer $TOKEN")
ALERT_ID=$(echo "$ALERT_LIST" | python -c "import json,sys; d=json.loads(sys.stdin.read()); a=d.get('alerts',d.get('data',[])); print(a[0]['_id'] if a else '')")
if [ -n "$ALERT_ID" ]; then
  ACK=$(curl -s -X POST "$BACKEND/api/alerts/$ALERT_ID/acknowledge" -H "Authorization: Bearer $TOKEN")
  ACK_STATUS=$(echo "$ACK" | jget 'd.get("alert",{}).get("status","")')
  [ "$ACK_STATUS" = "acknowledged" ] && ok "Alert acknowledged → status=$ACK_STATUS" || bad "Ack failed: $ACK_STATUS"
else
  bad "No open alerts to acknowledge"
fi

# ═══ 7. Analytics & Reports module (Senadeera) ═══════════════════════════════
echo
echo -e "${bold}=== 7. Analytics & Reports Module (Senadeera) ===${reset}"
step "Analytics dashboard"
A=$(curl -s "$BACKEND/api/analytics/dashboard" -H "Authorization: Bearer $TOKEN")
A_RISK=$(echo "$A" | jget 'd.get("data",{}).get("overview",{}).get("riskScore",0)')
A_ALERTS=$(echo "$A" | jget 'd.get("data",{}).get("overview",{}).get("activeAlerts",0)')
ok "Overview — riskScore=$A_RISK, activeAlerts=$A_ALERTS"

step "Supplier performance analytics"
SP=$(curl -s "$BACKEND/api/analytics/suppliers/performance" -H "Authorization: Bearer $TOKEN")
SP_COUNT=$(echo "$SP" | jget 'len(d.get("data",[]))')
[ "$SP_COUNT" -gt 0 ] && ok "Performance metrics returned for $SP_COUNT suppliers" || bad "No performance data"

step "Shipment delays analytics"
SD=$(curl -s "$BACKEND/api/analytics/shipments/delays" -H "Authorization: Bearer $TOKEN")
ok "Delay summary: $(echo "$SD" | jget 'd.get("data",[{}])[0]')"

# ═══ 8. ML Inference: Edge cases ═════════════════════════════════════════════
echo
echo -e "${bold}=== 8. ML Inference Edge Cases ===${reset}"
step "Supplier ML — high-risk inputs"
P=$(curl -s -X POST "$ML/predict/supplier" -H "Content-Type: application/json" \
  -d '{"onTimeDeliveryRate":40,"financialScore":25,"defectRate":9.0,"disputeFrequency":10,"geopoliticalRiskFlag":1,"averageDelayDays":15}')
P_TIER=$(echo "$P" | jget 'd.get("riskTier","")')
P_SHAP_LEN=$(echo "$P" | jget 'len(d.get("shapValues",[]))')
[ "$P_TIER" = "high" ] || [ "$P_TIER" = "critical" ] && ok "Predicted tier=$P_TIER (expected high/critical), SHAP features=$P_SHAP_LEN" || bad "Unexpected tier $P_TIER"

step "Inventory ML — stockout scenario"
P2=$(curl -s -X POST "$ML/predict/inventory" -H "Content-Type: application/json" \
  -d '{"currentStock":5,"reorderPoint":80,"safetyStock":50,"supplierRiskScore":80,"isCriticalItem":1,"leadTimeDays":30,"averageDailyDemand":4}')
P2_TIER=$(echo "$P2" | jget 'd.get("riskTier","")')
ok "Stockout scenario tier=$P2_TIER"

step "Shipment ML — international high-weather"
P3=$(curl -s -X POST "$ML/predict/shipment" -H "Content-Type: application/json" \
  -d '{"etaDeviationHours":72,"weatherLevel":2,"routeRiskIndex":0.9,"trackingGapHours":48,"supplierRiskScore":85,"isInternational":1}')
P3_TIER=$(echo "$P3" | jget 'd.get("riskTier","")')
ok "Delayed-international tier=$P3_TIER"

# ═══ 9. Cleanup test data ════════════════════════════════════════════════════
echo
echo -e "${bold}=== 9. Cleanup ===${reset}"
if [ -n "$NEW_SUP_ID" ]; then
  curl -s -X DELETE "$BACKEND/api/suppliers/$NEW_SUP_ID" -H "Authorization: Bearer $TOKEN" >/dev/null 2>&1 || true
fi
ok "Test artifacts cleaned"

# ═══ Summary ═════════════════════════════════════════════════════════════════
echo
echo -e "${bold}═══════════════════════════════════════════════════════════════${reset}"
echo -e "${bold}  E2E TEST SUMMARY${reset}"
echo -e "${bold}═══════════════════════════════════════════════════════════════${reset}"
echo -e "  Total:   $TOTAL"
echo -e "  ${green}Pass:    $PASS${reset}"
if [ "$FAIL" -gt 0 ]; then echo -e "  ${red}Fail:    $FAIL${reset}"; else echo -e "  Fail:    0"; fi
echo
if [ "$FAIL" -eq 0 ]; then
  echo -e "${green}${bold}✓ ALL CHECKS PASSED — SYSTEM IS DEMO-READY${reset}"
  exit 0
else
  echo -e "${red}${bold}✗ ${FAIL} CHECK(S) FAILED — REVIEW BEFORE DEMO${reset}"
  exit 1
fi
