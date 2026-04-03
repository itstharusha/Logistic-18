# ML Service Implementation & Integration Guide

**University Project: Logistic 18 — Smart Logistics & Supply Chain Management**

## Executive Summary

The ML service implements a production-grade, XGBoost-powered risk scoring system for the Logistics 18 supply chain platform. This document maps the implementation to the academic requirements and provides integration guidance for the Node.js backend.

---

## Phase Completion Status

| Phase | Component | Lead | Status | Metrics |
|-------|-----------|------|--------|---------|
| **1** | Feature Engineering | Rifshadh/Umayanthi/Wijemanna | ✅ Complete | 10-12 features per domain, strict `FEATURE_ORDER` enforced |
| **2A** | Model Training (Baseline) | Umayanthi/Wijemanna | ✅ Complete | Trains baseline models with standard hyperparameters |
| **2B** | Hyperparameter Tuning (GridSearchCV) | Rifshadh | ✅ Complete | GridSearchCV: 81 param combos × 5 folds = 405 fits per model |
| **3** | Model Evaluation | Senadeera | ✅ Complete | Supplier: R²=0.9994; Shipment: R²=0.9992; Inventory: R²=0.9956 |
| **4** | SHAP Explainability | Kulatunga | ✅ Complete | Top-3 features + impact scoring per prediction |
| **5** | Deployment & Integration | Wijemanna | ✅ Complete | FastAPI + 3 `/predict/*` endpoints + Node.js adapters |

---

## File Structure

```
ml-service/
├── preprocessing.py          # Phase 1: Feature encoding & cleaning
├── model_training.py         # Phase 2A: Baseline model training (Umayanthi/Wijemanna)
├── hyperparameter_tuning.py  # Phase 2B: GridSearchCV optimization (Rifshadh)
├── evaluate.py               # Phase 3: Model evaluation & metrics (Senadeera)
├── test_endpoints.py         # Integration test suite
├── main.py                   # Phase 4 & 5: FastAPI + SHAP + deployment
├── models/
│   ├── supplier_model.joblib
│   ├── shipment_model.joblib
│   ├── inventory_model.joblib
│   ├── backup/               # NFR-M-06: Previous model versions for rollback
│   ├── baseline/             # Phase 2A: Baseline models before optimization
│   └── tuning_reports/       # Phase 2B: GridSearchCV tuning reports
├── requirements.txt          # Python dependencies
└── Dockerfile               # For containerized deployment
```

---

## Phase 1: Feature Engineering

**File**: `preprocessing.py`

### Strict Feature Order (FR-M-05)
Enforces consistency between training and inference. Prevents feature mismatch bugs.

**Supplier Features (10)**:
```python
['onTimeDeliveryRate', 'financialScore', 'defectRate', 'disputeFrequency',
 'geopoliticalRiskFlag', 'totalShipments', 'averageDelayDays',
 'daysSinceLastShip', 'activeShipmentCount', 'categoryRisk']
```

**Shipment Features (10)**:
```python
['etaDeviationHours', 'weatherLevel', 'routeRiskIndex', 'carrierReliability',
 'trackingGapHours', 'shipmentValueUSD', 'daysInTransit', 'supplierRiskScore',
 'isInternational', 'carrierDelayRate']
```

**Inventory Features (10)**:
```python
['currentStock', 'averageDailyDemand', 'leadTimeDays', 'demandVariance',
 'supplierRiskScore', 'safetyStock', 'reorderPoint', 'incomingStockDays',
 'pendingOrderQty', 'isCriticalItem']
```

### Encoding Rules
- `weatherLevel`: `"low"→0, "medium"→1, "high"→2`
- `categoryRisk`: `"services"→0, "finished goods"→1, "components"→2, "raw materials"→3`
- `geopoliticalRiskFlag`: Binary `0/1`
- Missing values: Filled with `0`

---

## Phase 2A: Model Training (Baseline Training)

**File**: `model_training.py`

**Lead**: Umayanthi (Shipment), Wijemanna (Inventory), or domain-specific ML engineer

### Baseline Model Configuration
```python
BASELINE_PARAMS = {
    'n_estimators': 50,          # Base estimators
    'max_depth': 4,              # Base tree depth
    'learning_rate': 0.1,        # Base shrinkage
    'subsample': 0.8,            # Base sample fraction
    'random_state': 42
}
```

### Output
Trains three baseline models using standard hyperparameters:
- `models/baseline/supplier_baseline_model.joblib`
- `models/baseline/shipment_baseline_model.joblib`
- `models/baseline/inventory_baseline_model.joblib`

### Purpose
Establishes a performance baseline before optimization. Allows for comparison and validates the training pipeline before tuning.

---

## Phase 2B: Hyperparameter Tuning (Optimization)

**File**: `hyperparameter_tuning.py`

**Lead**: Rifshadh (Supplier Risk), or ML optimization specialist

### GridSearchCV Configuration
```python
PARAM_GRID = {
    'n_estimators': [50, 100, 150],         # 3 options
    'max_depth': [3, 5, 7],                 # 3 options
    'learning_rate': [0.05, 0.1, 0.2],      # 3 options
    'subsample': [0.6, 0.8, 1.0]            # 3 options
}
# Total: 3^4 = 81 parameter combinations
# With 5-fold CV: 81 × 5 = 405 fits per model
```

### Output
Produces optimized models and tuning reports:
- `models/supplier_model.joblib` (replaces tuned version)
- `models/shipment_model.joblib` (replaces tuned version)
- `models/inventory_model.joblib` (replaces tuned version)
- `models/tuning_reports/supplier_tuning_report.json`
- `models/tuning_reports/shipment_tuning_report.json`
- `models/tuning_reports/inventory_tuning_report.json`

### Tuning Results Per Model
Supplier Model tuning report example:
```json
{
  "domain": "supplier",
  "best_parameters": {
    "learning_rate": 0.1,
    "max_depth": 5,
    "n_estimators": 100,
    "subsample": 0.8
  },
  "best_cv_r2_score": 0.999,
  "validation_r2": 0.9994,
  "validation_rmse": 0.7168,
  "validation_mae": 0.5448,
  "total_grid_combinations": 81,
  "cv_folds": 5
}
```

---

## Phase 3: Model Evaluation

**File**: `evaluate.py`

### Performance Metrics (All Pass Target Requirements)

| Model | R² Score | RMSE | MAE | Classification Accuracy |
|-------|----------|------|-----|------------------------|
| **Supplier** | 0.9994 ✓ | 0.7168 ✓ | 0.5448 | 98% |
| **Shipment** | 0.9992 ✓ | 0.8668 ✓ | 0.5852 | 97% |
| **Inventory** | 0.9956 ✓ | 1.8550 ✓ | 1.2626 | 96% |

**Targets Achieved**: R² > 0.92 ✓, RMSE < 5.0 ✓ (FR-A-06)

### Confusion Matrices (Sample)
Supplier Model tier classification on 1,000 held-out test samples:

```
           | pred_low | pred_med | pred_high | pred_crit
---------------------------------------------------------
true_low   |    286   |    7     |     0     |     0
true_med   |      0   |   335    |     7     |     0
true_high  |      0   |    1     |   117     |     1
true_crit  |      0   |    0     |     0     |   246

Precision: 98% (all tiers)
Recall: 98% (all tiers)
```

---

## Phase 4: SHAP Explainability

**File**: `main.py` (Lines: TreeExplainer + extract_shap_values)

### Implementation Details
1. **TreeExplainer Initialization**: Loaded at startup to avoid compute delay during inference (< 50ms NFR-P-02).
2. **Local Explainability**: Top-3 highest-impact features per prediction.
3. **Impact Classification**:
   - `|value| > 20` → "high"
   - `|value| > 5` → "medium"
   - Otherwise → "low"

### Example Response
```json
{
  "riskScore": 13.65,
  "riskTier": "low",
  "shapValues": [
    {
      "feature": "averageDelayDays",
      "value": -15.9949,
      "impact": "medium"
    },
    {
      "feature": "onTimeDeliveryRate",
      "value": -8.5959,
      "impact": "medium"
    },
    {
      "feature": "totalShipments",
      "value": -2.6009,
      "impact": "low"
    }
  ],
  "recommendations": [
    "Investigate high impact from averageDelayDays",
    "Investigate high impact from onTimeDeliveryRate"
  ]
}
```

---

## Phase 5: Model Deployment & Integration

**File**: `main.py` (FastAPI + uvicorn)

### API Endpoints

#### 1. Health Check
**GET** `/health`
```bash
curl http://localhost:8000/health
```
**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-03T12:41:55.631232",
  "models": {
    "supplier": "loaded",
    "shipment": "loaded",
    "inventory": "loaded"
  }
}
```

#### 2. Supplier Risk Prediction
**POST** `/predict/supplier`
```bash
curl -X POST http://localhost:8000/predict/supplier \
  -H "Content-Type: application/json" \
  -d '{
    "onTimeDeliveryRate": 85,
    "financialScore": 75,
    "defectRate": 2.5,
    ...
  }'
```

#### 3. Shipment Risk Prediction
**POST** `/predict/shipment`
```bash
curl -X POST http://localhost:8000/predict/shipment \
  -H "Content-Type: application/json" \
  -d '{
    "etaDeviationHours": 3.5,
    "weatherLevel": 1,
    "routeRiskIndex": 45.0,
    ...
  }'
```

#### 4. Inventory Risk Prediction
**POST** `/predict/inventory`
```bash
curl -X POST http://localhost:8000/predict/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "currentStock": 250,
    "averageDailyDemand": 15,
    "leadTimeDays": 14,
    ...
  }'
```

### Performance (NFR-P-02)
- Model inference: **< 50ms** ✓
- Full endpoint latency (with SHAP): **< 200ms**

---

## Node.js Backend Integration

### Updated Services
- **SupplierService.js**: `predictRiskScore()` → Calls `/predict/supplier`
- **ShipmentService.js**: `predictRiskScore()` → Calls `/predict/shipment`
- **InventoryService.js**: Already integrated (reference template)

### Usage Pattern
```javascript
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

static async predictRiskScore(supplierData) {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict/supplier`,
      supplierData,
      { timeout: 5000 }
    );
    return {
      riskScore: response.data.riskScore,
      riskTier: response.data.riskTier,
      recommendations: response.data.recommendations,
      shapValues: response.data.shapValues
    };
  } catch (error) {
    console.warn(`[ML Service Fallback] Prediction failed: ${error.message}`);
    return this.computeRiskScore(supplierData); // Fallback to rule-based
  }
}
```

### Fallback Mechanism (NFR-AV-01: 99.5% Availability)
If ML service is unavailable:
1. Node.js service catches axios timeout/error.
2. Falls back to `computeRiskScore()` (rule-based algorithm).
3. Log warning; continue serving predictions with reduced accuracy.
4. Minimize cascading failures across the system.

---

## Running the ML Service

### Prerequisites
```bash
pip install -r ml-service/requirements.txt
```

### Step 1: Train Baseline Models (Phase 2A)
```bash
cd ml-service
python model_training.py
```
**Output**: Baseline models saved to `models/baseline/`

### Step 2: Optimize via Hyperparameter Tuning (Phase 2B)
```bash
cd ml-service
python hyperparameter_tuning.py
```
**Output**: Tuned models save to `models/` with JSON reports in `models/tuning_reports/`

### Step 3: Evaluate Models (Phase 3)
```bash
cd ml-service
python evaluate.py
```
**Output**: Validation metrics and confusion matrices

### Step 4: Start the ML Service
```bash
cd ml-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
**Output**: Service running on `http://0.0.0.0:8000`

### Step 5: Run Integration Tests
```bash
cd ml-service
python test_endpoints.py
```

### Expected Test Output
```
============================================================
ML SERVICE INTEGRATION TEST SUITE
============================================================
✓ Health check PASSED
✓ Supplier prediction PASSED
✓ Shipment prediction PASSED
✓ Inventory prediction PASSED

ALL TESTS PASSED ✓
```

---

## Environment Variables

```bash
# .env file
ML_SERVICE_URL=http://localhost:8000        # For Node.js backend
PYTHON_ENV=production                       # For FastAPI logging
DEBUG=false
```

---

## Compliance Matrix

| Requirement | Status | Implementation |
|------------|--------|-----------------|
| FR-A-06: Model eval (RMSE, R², MAE) | ✅ | evaluate.py |
| FR-M-05: Feature order enforcement | ✅ | preprocessing.py + FEATURE_ORDER lists |
| NFR-M-06: Model rollback capability | ✅ | models/backup/ + shutil.copy2 |
| NFR-P-02: < 50ms inference | ✅ | TreeExplainer startup + vectorized predict |
| NFR-AV-01: 99.5% availability | ✅ | Fallback scoring in Node.js services |
| NFR-SE-05: Multi-tenant isolation | ✅ | Enforced at Node.js repository layer |

---

## Troubleshooting

### Models Not Loading
```
⚠ Warning loading models: [error]
```
**Solution**: Ensure `/models/*.joblib` files exist. Run `python train.py`.

### ML Service Timeout
```
[ML Service Fallback] Prediction failed: timeout
```
**Solution**: Check ML service health: `curl http://localhost:8000/health`

### Invalid Features
```
Error: ['feature_name'] not in expected columns
```
**Solution**: Verify request JSON keys match FEATURE_ORDER exactly (case-sensitive).

---

## References

- **System Documentation**: `system documentation.txt` (Section 9)
- **Training Data**: `supplier_risk_dataset.csv`, `shipment_risk_dataset.csv`, `inventory_risk_dataset.csv`
- **Proposal**: `project proposal presentation` (Section 1.3 – ML model spec)

---

**Last Updated**: April 3, 2026  
**Maintainers**: Rifshadh (Supplier), Umayanthi (Shipment), Wijemanna (Inventory), Senadeera (Eval), Kulatunga (SHAP), Rathnamalala (Auth/User)
