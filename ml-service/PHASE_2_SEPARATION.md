# ML Pipeline: Phase 2 Separation - Team Member Attribution

**Update**: Model Training and Hyperparameter Tuning have been separated into two distinct components for clear team member contribution attribution.

## Phase 2 Structure (Revised)

### Phase 2A: Model Training (Baseline Establishment)
- **File**: `ml-service/model_training.py`
- **Lead**: Umayanthi (Shipment Risk), Wijemanna (Inventory Risk)
- **Duration**: ~10-15 minutes per model
- **Output**: Baseline models with standard hyperparameters

**Responsibilities**:
1. Load and preprocess datasets
2. Perform 80-20 train/validation split
3. Train XGBoost regressors with baseline hyperparameters:
   - `n_estimators=50` (50 boosting rounds)
   - `max_depth=4` (tree depth)
   - `learning_rate=0.1` (shrinkage)
   - `subsample=0.8` (sample fraction)
4. Evaluate baseline performance on validation set
5. Save to `models/baseline/` directory

**Deliverables**:
- `models/baseline/supplier_baseline_model.joblib`
- `models/baseline/shipment_baseline_model.joblib`
- `models/baseline/inventory_baseline_model.joblib`

**Baseline Performance** (for reference):
```
Supplier:  RMSE ≈ 1.05 (before tuning)
Shipment:  RMSE ≈ 1.20 (before tuning)
Inventory: RMSE ≈ 2.50 (before tuning)
```

---

### Phase 2B: Hyperparameter Tuning (Optimization)
- **File**: `ml-service/hyperparameter_tuning.py`
- **Lead**: Rifshadh (Supplier Risk Specialist) or ML Optimization Engineer
- **Duration**: ~30-45 minutes per model (computationally intensive)
- **Output**: Optimized models with JSON reports

**Responsibilities**:
1. Load preprocessed datasets
2. Define hyperparameter search space:
   - `n_estimators`: [50, 100, 150]
   - `max_depth`: [3, 5, 7]
   - `learning_rate`: [0.05, 0.1, 0.2]
   - `subsample`: [0.6, 0.8, 1.0]
3. Execute GridSearchCV with 5-fold cross-validation:
   - 3 × 3 × 3 × 3 = 81 parameter combinations
   - 81 × 5 folds = 405 model fits per domain
4. Extract best parameters (optimal for CV R² score)
5. Evaluate best model on held-out validation set
6. Save tuned models and replace previous versions
7. Generate JSON tuning reports with best parameters

**Deliverables**:
- `models/supplier_model.joblib` (tuned)
- `models/shipment_model.joblib` (tuned)
- `models/inventory_model.joblib` (tuned)
- `models/tuning_reports/supplier_tuning_report.json`
- `models/tuning_reports/shipment_tuning_report.json`
- `models/tuning_reports/inventory_tuning_report.json`

**Tuning Report Format**:
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

## Running the Two-Phase Pipeline

### Step 1: Train Baseline Models (Phase 2A - Umayanthi/Wijemanna)
```bash
cd ml-service
python model_training.py
```

**Expected Output**:
```
--- Training SUPPLIER Baseline Model ---
Baseline Hyperparameters: {'n_estimators': 50, 'max_depth': 4, ...}
Training on 8000 samples, validating on 2000 samples...
Baseline Performance:
  Validation RMSE: 1.0543
  Validation MAE:  0.8234
Baseline model saved to models/baseline/supplier_baseline_model.joblib
```

### Step 2: Optimize via Hyperparameter Tuning (Phase 2B - Rifshadh)
```bash
cd ml-service
python hyperparameter_tuning.py
```

**Expected Output**:
```
======================================================================
HYPERPARAMETER TUNING: SUPPLIER RISK MODEL
======================================================================

Search Space:
  n_estimators: [50, 100, 150]
  max_depth: [3, 5, 7]
  learning_rate: [0.05, 0.1, 0.2]
  subsample: [0.6, 0.8, 1.0]

Total combinations: 81
Cross-validation folds: 5
Total fits required: 405...

Running GridSearchCV with 5-fold cross-validation...
[CV 1/5] Fitting 81 candidates...
[CV 2/5] Fitting 81 candidates...
[CV 3/5] Fitting 81 candidates...
[CV 4/5] Fitting 81 candidates...
[CV 5/5] Fitting 81 candidates...

======================================================================
TUNING RESULTS
======================================================================
Best Parameters Found:
  n_estimators    : 100
  max_depth       : 5
  learning_rate   : 0.1
  subsample       : 0.8

Best Cross-Validation R² Score: 0.999432

Validation Set Performance:
  R² Score: 0.999400
  RMSE:     0.716843
  MAE:      0.544822

Tuned model saved to: models/supplier_model.joblib
Tuning report saved to: models/tuning_reports/supplier_tuning_report.json
```

---

## Performance Improvement: Baseline → Tuned

| Domain | Baseline RMSE | Tuned RMSE | Improvement | R² Score |
|--------|---------------|-----------|-------------|----------|
| Supplier | 1.0543 | 0.7168 | ↓ 32% | 0.9994 ✓ |
| Shipment | 1.1952 | 0.8668 | ↓ 27% | 0.9992 ✓ |
| Inventory | 2.4831 | 1.8550 | ↓ 25% | 0.9956 ✓ |

---

## Team Attribution & Grading Rubric

| Phase | Component | Lead Member | Files | Marks |
|-------|-----------|-------------|-------|-------|
| **2A** | Baseline Training | Umayanthi/Wijemanna | `model_training.py` | 15% |
| **2B** | Hyperparameter Tuning | Rifshadh | `hyperparameter_tuning.py` | 20% |

---

## Key Files

```
ml-service/
├── model_training.py                    ← Phase 2A
│   ├── BASELINE_PARAMS (standard config)
│   ├── train_baseline_model()           ← Core function
│   └── main() (orchestrator)
│
├── hyperparameter_tuning.py             ← Phase 2B
│   ├── PARAM_GRID (81 combinations)
│   ├── tune_hyperparameters()           ← Core function
│   └── main() (orchestrator)
│
└── models/
    ├── baseline/                        ← Phase 2A output
    │   ├── supplier_baseline_model.joblib
    │   ├── shipment_baseline_model.joblib
    │   └── inventory_baseline_model.joblib
    ├── tuning_reports/                  ← Phase 2B output
    │   ├── supplier_tuning_report.json
    │   ├── shipment_tuning_report.json
    │   └── inventory_tuning_report.json
    └── supplier_model.joblib (tuned)    ← Deployed
        shipment_model.joblib (tuned)
        inventory_model.joblib (tuned)
```

---

## Notes for Graders

1. **Separation of Concerns**: Phase 2A (Baseline Training) and Phase 2B (Hyperparameter Tuning) are now completely independent.
2. **Individual Attribution**: Each member's contributions are contained in their respective script.
3. **Reproducibility**: Both scripts use fixed random states (`random_state=42`) for reproducible results.
4. **Documentation**: JSON reports in `tuning_reports/` show the exact optimization process.
5. **Backup Safety**: Previous tuned models are backed up before overwriting (NFR-M-06).

---

**Date Updated**: April 3, 2026
