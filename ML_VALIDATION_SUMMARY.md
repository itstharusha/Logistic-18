# Logistics18 — ML Validation Summary

**Group**: Y2S2-WE-DS-G18 · **Course**: IT2021 AIML Project · **Date**: 2026-04-30

This document summarises the validation evidence for the three XGBoost regression models that power the platform's risk-scoring features. All metrics below come directly from the model-tuning and SHAP-analysis pipelines under `ml-service/`. They are reproducible by running:

```bash
cd ml-service
python hyperparameter_tuning.py     # produces models/tuning_reports/*.json
python shap_analysis.py             # produces models/shap_reports/*.json
```

---

## 1. Model Selection & Justification

| Aspect | Choice | Justification |
|---|---|---|
| Algorithm | XGBoost Regressor (gradient-boosted decision trees) | Best balance of accuracy, training speed, and interpretability for tabular feature sets <50 columns. Supports SHAP TreeExplainer natively for explainability (rubric requirement). |
| Target | Numeric risk score (0–100) | Allows fine-grained ordering across entities; tier (low/medium/high/critical) is derived from the score with thresholds 30/60/80. |
| Loss | RMSE (`reg:squarederror`) | Penalises large prediction errors more than MAE; appropriate when underestimating critical risk is more costly than minor noise. |
| Validation strategy | 5-fold cross-validation + held-out validation set | Provides both stability (CV) and generalisation (held-out) estimates so we can detect overfitting. |

---

## 2. Hyperparameter Tuning Results

All three models were tuned with a grid of 81 combinations (`learning_rate × max_depth × n_estimators × subsample`), 5-fold CV, on a 10,000-sample synthetic-but-realistic dataset per domain.

### Best parameters (identical across domains — confirms training stability)

| Hyperparameter | Value |
|---|---|
| `learning_rate` | 0.2 |
| `max_depth` | 5 |
| `n_estimators` | 150 |
| `subsample` | 0.6 |

### Final metrics on held-out validation set

| Domain | CV R² | Validation R² | Validation RMSE | Validation MAE |
|---|---:|---:|---:|---:|
| **Supplier risk** | 0.9997 | 0.9997 | 0.4961 | 0.3705 |
| **Shipment risk** | 0.9996 | 0.9996 | 0.6003 | 0.4015 |
| **Inventory risk** | 0.9970 | 0.9976 | 1.3653 | 0.9211 |

**Reading**: R² > 0.99 on held-out data with RMSE under 1.4 means the model recovers 99% of the variance in risk score with average error well under 1 point on a 0–100 scale. The tiny gap between CV-R² and validation-R² confirms there is no material overfitting.

> Source files: `ml-service/models/tuning_reports/{supplier,shipment,inventory}_tuning_report.json`

---

## 3. Explainability — SHAP Analysis

Each domain uses a `shap.TreeExplainer` precomputed at FastAPI startup. Per prediction the service returns the **top 3 features by absolute SHAP impact**, classified `low` / `medium` / `high` (thresholds: |SHAP| > 5 → medium, > 20 → high). The frontend renders these in the *ML Explainability Panel* on each detail page, satisfying the rubric requirement that the AI/ML feature be "properly integrated into the overall workflow" with interpretable output.

### Top-5 globally most influential features (mean |SHAP|, n = 10,000 samples per domain)

| Rank | Supplier model | Shipment model | Inventory model |
|---:|---|---|---|
| 1 | onTimeDeliveryRate | etaDeviationHours | currentStock |
| 2 | averageDelayDays | weatherLevel | supplierRiskScore |
| 3 | totalShipments | routeRiskIndex | safetyStock |
| 4 | geopoliticalRiskFlag | carrierReliability | reorderPoint |
| 5 | financialScore | trackingGapHours | leadTimeDays |

> Source files: `ml-service/models/shap_reports/{supplier,shipment,inventory}_shap_report.json`

These rankings align with domain expectations (e.g., on-time delivery dominates supplier risk; ETA deviation dominates shipment delay risk), giving us face validity in addition to numerical accuracy.

---

## 4. End-to-End Inference Pipeline Validation

The complete request path was exercised by `demo-e2e-test.sh` (28/28 passing on 2026-04-30):

```
React form → POST /api/{module} → Service.computeRisk()
   → axios POST http://ml-service:8000/predict/{module}
   → preprocessing._ensure_features() fills missing optional features
   → XGBoost.predict() → np.clip(0,100) → map_risk_tier()
   → shap.TreeExplainer.shap_values() → top-3 features
   → JSON {riskScore, riskTier, recommendations, shapValues}
   → MongoDB update + frontend ExplainabilityPanel
```

**Live evidence** (captured during E2E run):

| Scenario | Inputs | Predicted score | Tier | Top-1 SHAP feature |
|---|---|---:|---|---|
| High-risk supplier | OTD=40, financial=25, defect=9, geopolitical=1 | ~85 | critical | onTimeDeliveryRate |
| Stockout-imminent inventory | stock=5, reorder=80, lead=30, critical=1 | ~52 | medium | currentStock |
| Delayed international shipment | etaDev=72h, weather=2, route=0.9, intl=1 | ~70 | high | etaDeviationHours |

---

## 5. Reliability & Fallback Strategy

| Scenario | Behaviour | Why |
|---|---|---|
| ML service up + models loaded | XGBoost prediction + SHAP explanation returned | Normal path |
| ML service unreachable | Backend service catches axios error, falls back to deterministic rule-based score (no random) | Demo never hard-fails on transient ML outage |
| Missing optional features in payload | `preprocessing._ensure_features()` fills with sensible defaults (0 or 0.85 for `carrierReliability`) | Single-record inference works even when callers omit auxiliary features |
| Invalid input types | Joi schema rejects at backend boundary with `400 Validation failed` and per-field details | No bad data reaches the model |

---

## 6. What we tested manually before demo

- Model loading on FastAPI startup (`/health` reports `models.{supplier,shipment,inventory}: "loaded"`).
- One-shot prediction for each domain via `curl POST /predict/<domain>` returns `riskScore`, `riskTier`, `shapValues[]` with the expected schema.
- Backend persists `shapValues` to MongoDB after validating the schema mismatch (`impact` is enum `low|medium|high`, not `Number`).
- Frontend displays SHAP values on detail pages (Supplier, Shipment, Inventory) with colour-coded impact pills.
- Override flow: a RISK_ANALYST can override an ML score with a justification that is appended to `overrideHistory` (audit trail).
