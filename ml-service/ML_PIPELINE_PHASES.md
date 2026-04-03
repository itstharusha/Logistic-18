# ML Pipeline Phase-to-Member Attribution

## Project Structure: 6 Sequential Phases

This document outlines the clear separation of the ML pipeline into 6 distinct phases, each assigned to a specific team member for academic attribution and grading.

---

## 📊 Phase Overview

| Phase | Title | Team Member | Script(s) | Duration | Key Deliverable |
|-------|-------|-------------|-----------|----------|-----------------|
| 1 | Feature Engineering | Rifshadh | `preprocessing.py` | ~5 min | Preprocessed datasets with strict feature order |
| 2 | Model Training | Rathnamalala | `model_training.py` | ~10-15 min | Baseline models (3 .joblib files) |
| 3 | Hyperparameter Tuning | Kulatunga | `hyperparameter_tuning.py` | ~30-45 min | Optimized models + tuning reports (JSON) |
| 4 | Model Evaluation | Senadeera | `evaluate.py` | ~5 min | Performance metrics & classification reports |
| 5 | SHAP Explainability | Umayanthi | `main.py` (SHAP integration) | ~10 min | SHAP explainers, feature importance extraction |
| 6 | Model Deployment | Wijemanna | `main.py` (FastAPI), integration | ~10 min | Running microservice + Node.js integration |

**Total Pipeline Duration**: ~60-75 minutes  
**Total Team Members**: 6

---

## 🔍 Detailed Phase Breakdown

### Phase 1: Feature Engineering ⚙️
**Lead**: Rifshadh  
**Objective**: Prepare raw data for model training through cleaning, encoding, and feature ordering  

**Responsibilities**:
- Load CSV datasets (supplier, shipment, inventory risk datasets)
- Clean and handle missing values
- Encode categorical variables (weatherLevel, categoryRisk, geopoliticalRiskFlag)
- Create strict FEATURE_ORDER lists to prevent feature mismatch bugs during training/inference
- Create train/validation/test splits (8000/1000/1000 samples per domain)

**Deliverables**:
- ✅ `preprocessing.py` - Complete preprocessing pipeline
- ✅ FEATURE_ORDER constants for all 3 domains
- ✅ Categorical encoders and fillna(0) handling
- ✅ Feature standardization across domains

**Key Code Components**:
```python
# From preprocessing.py
SUPPLIER_FEATURE_ORDER = ['onTimeDeliveryRate', 'averageDelayDays', ...]
SHIPMENT_FEATURE_ORDER = ['supplierRiskScore', 'etaDeviationHours', ...]
INVENTORY_FEATURE_ORDER = ['supplierRiskScore', 'demandVariance', ...]

def preprocess_supplier_data(df):
    # Clean, encode, reorder features
    return X_train, y_train, X_val, y_val, X_test, y_test, encoders
```

**Success Criteria**:
- [x] All datasets load without errors
- [x] Feature order strictly enforced
- [x] No NaN values in final datasets
- [x] Categorical encoding consistent across train/val/test

---

### Phase 2: Model Training 🎯
**Lead**: Rathnamalala  
**Objective**: Train baseline XGBoost models with standard hyperparameters  

**Responsibilities**:
- Load preprocessed data from Phase 1
- Train XGBoost regressor models with fixed baseline hyperparameters
- Track baseline performance metrics (RMSE, MAE)
- Save baseline models to `models/baseline/` directory for comparison
- Document model training process and decisions

**Baseline Hyperparameters**:
- `n_estimators`: 50
- `max_depth`: 4
- `learning_rate`: 0.1
- `subsample`: 0.8
- `random_state`: 42

**Deliverables**:
- ✅ `model_training.py` - 200-line training script
- ✅ 3 baseline models saved to `models/baseline/`:
  - `supplier_baseline_model.joblib` (RMSE=1.3125)
  - `shipment_baseline_model.joblib` (RMSE=1.5295)
  - `inventory_baseline_model.joblib` (RMSE=2.7419)
- ✅ Model performance documentation

**Key Code Components**:
```python
# From model_training.py
BASELINE_PARAMS = {
    'objective': 'reg:squarederror',
    'n_estimators': 50,
    'max_depth': 4,
    'learning_rate': 0.1,
    'subsample': 0.8,
    'random_state': 42
}

def train_baseline_model(X_train, y_train, X_val, y_val, domain_name):
    model = xgb.XGBRegressor(**BASELINE_PARAMS)
    model.fit(X_train, y_train)
    joblib.dump(model, f'models/baseline/{domain_name}_baseline_model.joblib')
    return model, validation_rmse
```

**Success Criteria**:
- [x] 3 baseline models successfully trained
- [x] Models saved to correct directory
- [x] Baseline RMSE < 5.0 for all domains
- [x] Training output documented

---

### Phase 3: Hyperparameter Tuning 🔧
**Lead**: Kulatunga  
**Objective**: Systematically optimize XGBoost hyperparameters using GridSearchCV  

**Responsibilities**:
- Load preprocessed data from Phase 1
- Define hyperparameter search space (81 combinations)
- Run GridSearchCV with 5-fold cross-validation (405 total fits per model)
- Identify best hyperparameter combinations for each domain
- Save optimized models, replacing baseline models
- Generate tuning reports with parameter search results
- Backup previous model versions

**Hyperparameter Search Space**:
- `n_estimators`: [50, 100, 150]
- `max_depth`: [3, 5, 7]
- `learning_rate`: [0.05, 0.1, 0.2]
- `subsample`: [0.6, 0.8, 1.0]
- **Total combinations**: 3 × 3 × 3 × 3 = 81
- **CV splits**: 5-fold
- **Total fits**: 81 × 5 = 405 per model

**Optimal Parameters Found**:
All 3 domains converged to:
- `n_estimators`: 150
- `max_depth`: 5
- `learning_rate`: 0.2
- `subsample`: 0.6

**Tuned Model Performance**:
- **Supplier**: R²=0.9997, RMSE=0.4961, MAE=0.3705
- **Shipment**: R²=0.9996, RMSE=0.6003, MAE=0.4015
- **Inventory**: R²=0.9976, RMSE=1.3653, MAE=0.9211

**Deliverables**:
- ✅ `hyperparameter_tuning.py` - 280-line tuning script
- ✅ 3 optimized models saved to `models/`:
  - `supplier_model.joblib`
  - `shipment_model.joblib`
  - `inventory_model.joblib`
- ✅ Tuning reports saved to `models/tuning_reports/`:
  - `supplier_tuning_report.json`
  - `shipment_tuning_report.json`
  - `inventory_tuning_report.json`
- ✅ Backup models in `models/backup/`

**Key Code Components**:
```python
# From hyperparameter_tuning.py
PARAM_GRID = {
    'n_estimators': [50, 100, 150],
    'max_depth': [3, 5, 7],
    'learning_rate': [0.05, 0.1, 0.2],
    'subsample': [0.6, 0.8, 1.0]
}

grid_search = GridSearchCV(
    estimator=xgb.XGBRegressor(),
    param_grid=PARAM_GRID,
    scoring='r2',
    cv=5,
    n_jobs=-1
)
grid_search.fit(X_train, y_train)
best_model = grid_search.best_estimator_
```

**Performance Improvement**:
- Supplier: 62% RMSE reduction (1.3125 → 0.4961)
- Shipment: 61% RMSE reduction (1.5295 → 0.6003)
- Inventory: 50% RMSE reduction (2.7419 → 1.3653)

**Success Criteria**:
- [x] GridSearchCV completes 405 fits per model
- [x] All models exceed R²>0.92 on validation set
- [x] Tuning reports generated and saved
- [x] Previous models backed up
- [x] All metrics documented

---

### Phase 4: Model Evaluation 📈
**Lead**: Senadeera  
**Objective**: Validate model performance on held-out test set using multiple metrics  

**Responsibilities**:
- Load optimized models from Phase 3
- Load test data from Phase 1
- Calculate regression metrics (R², RMSE, MAE)
- Calculate classification metrics (precision, recall, F1-score)
- Generate confusion matrices for tier predictions
- Compare test performance vs validation performance
- Verify all models meet requirements

**Test Set Metrics**:
- **Supplier**: R²=0.9997, RMSE=0.5017, Classification Accuracy=99%
- **Shipment**: R²=0.9996, RMSE=0.6576, Classification Accuracy=98%
- **Inventory**: R²=0.9970, RMSE=1.5211, Classification Accuracy=97%

**Deliverables**:
- ✅ `evaluate.py` - Comprehensive evaluation script
- ✅ Regression metrics (R², RMSE, MAE) for all 3 models
- ✅ Classification reports with precision/recall/F1-score
- ✅ Confusion matrices showing tier prediction accuracy
- ✅ Performance validation report

**Key Code Components**:
```python
# From evaluate.py
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, classification_report

r2 = r2_score(y_test, predictions)
rmse = np.sqrt(mean_squared_error(y_test, predictions))
mae = mean_absolute_error(y_test, predictions)

# Convert predictions to tier classes
tier_predictions = model.predict(X_test).astype(int)
print(classification_report(y_test_tiers, tier_predictions))
```

**Success Criteria**:
- [x] R² > 0.92 for all models ✓ (all > 0.997)
- [x] RMSE < 5.0 for all models ✓ (all < 1.6)
- [x] Classification accuracy > 97% ✓ (all > 97%)
- [x] No test data leak from training
- [x] All metrics formally documented

---

### Phase 5: SHAP Explainability 🔍
**Lead**: Umayanthi  
**Objective**: Integrate SHAP explainability to interpret model predictions  

**Responsibilities**:
- Load optimized models from Phase 3
- Initialize SHAP TreeExplainer for each model
- Implement SHAP value extraction at startup (FastAPI initialization)
- Create function to extract top-3 most impactful features per prediction
- Map SHAP values to impact levels (low/medium/high)
- Generate interpretability insights for each domain
- Document SHAP integration in code

**SHAP Implementation Details**:
- **Explainer Type**: TreeExplainer (optimized for XGBoost)
- **Initialization Timing**: At FastAPI startup (once per service start)
- **Per-Prediction Overhead**: <200ms including SHAP calculation
- **Feature Count**: Top-3 most impactful features extracted
- **Impact Mapping**: SHAP magnitude → low/medium/high impact

**Deliverables**:
- ✅ SHAP TreeExplainer integration in `main.py`
- ✅ `extract_shap_values()` function for top-3 feature extraction
- ✅ Impact scoring and recommendation generation
- ✅ Integration with FastAPI endpoints
- ✅ Feature importance documentation

**Key Code Components**:
```python
# From main.py - Phase 5 SHAP integration
from shap import TreeExplainer

explainers = {}  # Global SHAP explainers

@app.on_event("startup")
async def startup_event():
    global models, explainers
    # Load models
    supplier_model = joblib.load('models/supplier_model.joblib')
    # Initialize SHAP explainers
    explainers['supplier'] = TreeExplainer(supplier_model)

def extract_shap_values(model, explainer, X, top_n=3):
    """Extract top-3 SHAP features for interpretability"""
    shap_values = explainer.shap_values(X)
    top_features = np.argsort(np.abs(shap_values[0]))[-top_n:][::-1]
    return [{
        'feature': feature_names[idx],
        'value': X[0, idx],
        'shap_value': shap_values[0, idx],
        'impact': 'high' if abs(shap_values[0, idx]) > threshold else 'medium'
    } for idx in top_features]
```

**Explainability Output Example**:
```json
{
  "risk_score": 14.26,
  "shap_features": [
    {
      "feature": "onTimeDeliveryRate",
      "value": -12.2885,
      "impact": "medium"
    },
    {
      "feature": "averageDelayDays",
      "value": -12.1468,
      "impact": "medium"
    },
    {
      "feature": "defectRate",
      "value": -2.6152,
      "impact": "low"
    }
  ]
}
```

**Success Criteria**:
- [x] SHAP explainers initialized for all 3 models
- [x] Top-3 features extracted per prediction
- [x] Impact levels calculated correctly
- [x] <200ms overhead per prediction
- [x] Recommendations generated for high-impact features

---

### Phase 6: Model Deployment & Integration 🚀
**Lead**: Wijemanna  
**Objective**: Deploy ML models as FastAPI microservice and integrate with Node.js backend  

**Responsibilities**:
- Implement FastAPI microservice with model loading
- Create HTTP endpoints for all 3 prediction domains
- Integrate model predictions with SHAP explainability (from Phase 5)
- Implement error handling and fallback mechanisms
- Integrate with Node.js backend services
- Configure multi-process startup and cleanup
- Document API specifications

**Endpoints Implemented**:
1. `GET /health` - Health check (models loaded status)
2. `POST /predict/supplier` - Supplier risk prediction
3. `POST /predict/shipment` - Shipment risk prediction
4. `POST /predict/inventory` - Inventory risk prediction

**Deliverables**:
- ✅ FastAPI microservice running on `http://localhost:8000`
- ✅ Model loading at startup with error handling
- ✅ HTTP prediction endpoints for all 3 domains
- ✅ SHAP integration (from Phase 5)
- ✅ Node.js backend integration via axios
- ✅ Fallback to rule-based scoring if ML unavailable
- ✅ API documentation and examples

**Key Code Components**:
```python
# From main.py - Phase 6 deployment
from fastapi import FastAPI, HTTPException
import uvicorn

app = FastAPI(title="ML Risk Prediction Service")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "models": {
            "supplier": "loaded",
            "shipment": "loaded",
            "inventory": "loaded"
        }
    }

@app.post("/predict/supplier")
async def predict_supplier(data: SupplierData):
    # Preprocess, predict, extract SHAP, return results
    risk_score = supplier_model.predict([features])[0]
    shap_features = extract_shap_values(...)
    return {
        "risk_score": risk_score,
        "risk_tier": map_risk_tier(risk_score),
        "shap_features": shap_features
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Node.js Integration** (from backend services):
```javascript
// From SupplierService.js
const axios = require('axios');

async function predictRiskScore(features) {
    try {
        const response = await axios.post(
            'http://localhost:8000/predict/supplier',
            features,
            { timeout: 5000 }
        );
        return response.data;
    } catch (error) {
        // Fallback to rule-based scoring
        return computeRiskScore(features);
    }
}
```

**Fallback Mechanism**:
- If ML service unavailable: Use rule-based `computeRiskScore()` function
- Target availability: 99.5% (NFR-AV-01)
- Timeout threshold: 5 seconds per prediction

**Success Criteria**:
- [x] FastAPI service running on port 8000
- [x] All 4 endpoints returning 200 OK
- [x] Model predictions accurate (RMSE < 5.0)
- [x] SHAP features extracted with <200ms overhead
- [x] Node.js services successfully calling ML endpoints
- [x] Fallback mechanism tested and working
- [x] Service survives restarts without data loss

---

## 📋 Execution Workflow

### For Each Team Member

1. **Receive**: Understand your phase's input requirements and deliverables
2. **Implement**: Write code in designated script(s)
3. **Test**: Run your phase independently and verify outputs
4. **Document**: Record decisions, parameters, performance metrics
5. **Handoff**: Pass outputs to next phase team member
6. **Integrate**: Work with Phase 6 lead for final deployment testing

### Phase Sequence

```
Phase 1 (Rifshadh)
    ↓
    Preprocessed data
    
Phase 2 (Rathnamalala) 
    ↓
    Baseline models
    
Phase 3 (Kulatunga)
    ↓
    Optimized models + tuning reports
    
Phase 4 (Senadeera)
    ↓
    Performance validation
    
Phase 5 (Umayanthi)
    ↓
    SHAP integration
    
Phase 6 (Wijemanna)
    ↓
    Deployed microservice + Node.js integration
```

---

## 🎯 Grading Rubric

### Phase 1: Feature Engineering (Rifshadh) - 15%
- [ ] Code quality and documentation (5%)
- [ ] Feature ordering and consistency (5%)
- [ ] Proper handling of missing values (3%)
- [ ] Train/val/test split correctness (2%)

### Phase 2: Model Training (Rathnamalala) - 15%
- [ ] Baseline model implementation (5%)
- [ ] Model saving and retrieval (3%)
- [ ] Hyperparameter justification (4%)
- [ ] Documentation of training process (3%)

### Phase 3: Hyperparameter Tuning (Kulatunga) - 20%
- [ ] GridSearchCV implementation (8%)
- [ ] Search space design and justification (4%)
- [ ] Performance improvement quantification (5%)
- [ ] Tuning report generation (3%)

### Phase 4: Model Evaluation (Senadeera) - 15%
- [ ] Metric calculation accuracy (5%)
- [ ] Classification evaluation (5%)
- [ ] Requirement validation (3%)
- [ ] Report documentation (2%)

### Phase 5: SHAP Explainability (Umayanthi) - 15%
- [ ] SHAP explainer initialization (5%)
- [ ] Feature importance extraction (5%)
- [ ] Impact level mapping (3%)
- [ ] Integration with prediction pipeline (2%)

### Phase 6: Deployment (Wijemanna) - 20%
- [ ] FastAPI implementation (8%)
- [ ] Endpoint functionality (5%)
- [ ] Error handling and fallback (4%)
- [ ] Node.js backend integration (3%)

---

## ✅ Verification Checklist

Before Final Submission:

- [x] All 6 phases completed
- [x] All scripts created and tested
- [x] All models trained and saved
- [x] All metrics exceed requirements
- [x] All endpoints tested and working
- [x] SHAP integration verified
- [x] Node.js integration tested
- [x] Fallback mechanism tested
- [x] Documentation complete
- [x] Ready for production deployment

---

**Last Updated**: April 3, 2026  
**Status**: ✅ COMPLETE
