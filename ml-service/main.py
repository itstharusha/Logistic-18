from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
import pandas as pd
from datetime import datetime
import joblib
import os
import shap

from preprocessing import (
    preprocess_supplier_data, 
    preprocess_shipment_data, 
    preprocess_inventory_data,
    map_risk_tier
)

app = FastAPI(
    title="Logistic 18 ML Service",
    description="ML microservice for predictive risk scoring",
    version="1.0.0"
)

# Model loading 
supplier_model = None
shipment_model = None
inventory_model = None

# SHAP Explainers (Phase 4: Kulatunga)
supplier_explainer = None
shipment_explainer = None
inventory_explainer = None

@app.on_event("startup")
async def load_models():
    """Load models and precompute SHAP explainers on startup"""
    global supplier_model, shipment_model, inventory_model
    global supplier_explainer, shipment_explainer, inventory_explainer
    
    try:
        model_path = os.path.join(os.path.dirname(__file__), 'models')
        # Load Models (Phase 5: Wijemanna)
        if os.path.exists(f'{model_path}/supplier_model.joblib'):
            supplier_model = joblib.load(f'{model_path}/supplier_model.joblib')
            supplier_explainer = shap.TreeExplainer(supplier_model)
            
        if os.path.exists(f'{model_path}/shipment_model.joblib'):
            shipment_model = joblib.load(f'{model_path}/shipment_model.joblib')
            shipment_explainer = shap.TreeExplainer(shipment_model)
            
        if os.path.exists(f'{model_path}/inventory_model.joblib'):
            inventory_model = joblib.load(f'{model_path}/inventory_model.joblib')
            inventory_explainer = shap.TreeExplainer(inventory_model)
            
        print("✓ Models and SHAP Explainers loaded successfully")
    except Exception as e:
        print(f"⚠ Warning loading models: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "supplier": "loaded" if supplier_model else "placeholder",
            "shipment": "loaded" if shipment_model else "placeholder",
            "inventory": "loaded" if inventory_model else "placeholder",
        }
    }

def extract_shap_values(explainer, expected_features, X):
    """Phase 4: SHAP value extraction for the top 3 highest contributing features."""
    if explainer is None:
        return []
    
    shap_values = explainer.shap_values(X)
    feature_impacts = []
    
    # We're only running 1 prediction at a time via the API
    single_shap = shap_values[0]
    
    for i, feature_name in enumerate(expected_features):
        impact = "low"
        val = float(single_shap[i])
        abs_val = abs(val)
        if abs_val > 20: 
            impact = "high"
        elif abs_val > 5:
            impact = "medium"
            
        feature_impacts.append({
            "feature": feature_name,
            "value": round(val, 4),
            "impact": impact,
            "absolute_impact": abs_val
        })
        
    # Sort and take top 3
    feature_impacts.sort(key=lambda x: x["absolute_impact"], reverse=True)
    
    # Clean up absolute_impact before returning
    for impact in feature_impacts:
        del impact["absolute_impact"]
        
    return feature_impacts[:3]


def compute_rule_based_score(data: dict, model_type: str) -> float:
    """
    Deterministic rule-based fallback scoring when ML models are not loaded.
    Same inputs always produce the same score (no randomness).
    """
    score = 30.0  # Base score

    if model_type == 'supplier':
        otd = float(data.get('onTimeDeliveryRate', 80))
        score += max(0, (100 - otd) * 0.4)  # Lower OTD = higher risk
        score += float(data.get('defectRate', 0)) * 5
        score += float(data.get('disputeFrequency', 0)) * 3
        score += float(data.get('geopoliticalRiskFlag', 0)) * 10
        score -= float(data.get('financialScore', 50)) * 0.2
        score += float(data.get('averageDelayDays', 0)) * 2

    elif model_type == 'shipment':
        score += float(data.get('etaDeviationHours', 0)) * 1.2
        score += float(data.get('weatherLevel', 0)) * 5
        score += float(data.get('routeRiskIndex', 0)) * 15
        score += (1 - float(data.get('carrierReliability', 0.5))) * 20
        score += float(data.get('trackingGapHours', 0)) * 0.5
        score += float(data.get('supplierRiskScore', 0)) * 0.15
        score += float(data.get('isInternational', 0)) * 5

    elif model_type == 'inventory':
        current = float(data.get('currentStock', 100))
        reorder = float(data.get('reorderPoint', 50))
        safety = float(data.get('safetyStock', 20))
        if current <= 0:
            score += 40
        elif current <= safety:
            score += 30
        elif current <= reorder:
            score += 20
        score += float(data.get('supplierRiskScore', 0)) * 0.2
        score += float(data.get('isCriticalItem', 0)) * 15
        lead = float(data.get('leadTimeDays', 5))
        demand = float(data.get('averageDailyDemand', 1))
        if demand > 0 and current / demand <= lead:
            score += 25

    return float(np.clip(score, 0, 100))


@app.post("/predict/supplier")
async def predict_supplier_risk(data: dict):
    """
    Predict supplier risk score.
    """
    try:
        # If no actual model found, fall back to mock
        if supplier_model is None:
            risk_score = compute_rule_based_score(data, 'supplier')
            risk_tier = map_risk_tier(risk_score)
            return {
                "riskScore": risk_score,
                "riskTier": risk_tier,
                "source": "rule_based_fallback",
                "recommendations": ["Monitor onTimeDeliveryRate", "Verify financial health"],
                "shapValues": []
            }

        # Real Inference
        df = pd.DataFrame([data])
        X = preprocess_supplier_data(df, is_training=False)
        
        preds = supplier_model.predict(X)
        risk_score = float(np.clip(preds[0], 0, 100))
        risk_tier = map_risk_tier(risk_score)
        
        shap_top_3 = extract_shap_values(supplier_explainer, X.columns, X)
        
        return {
            "riskScore": risk_score,
            "riskTier": risk_tier,
            "recommendations": [f"Investigate high impact from {f['feature']}" for f in shap_top_3 if f['impact'] in ['medium', 'high']] or ["Supplier performance within acceptable limits."],
            "shapValues": shap_top_3
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict/shipment")
async def predict_shipment_risk(data: dict):
    """Predict shipment delay/cancellation risk"""
    try:
        if shipment_model is None:
            risk_score = compute_rule_based_score(data, 'shipment')
            risk_tier = map_risk_tier(risk_score)
            return {
                "riskScore": risk_score,
                "riskTier": risk_tier,
                "source": "rule_based_fallback",
                "recommendations": ["Monitor ETA deviation"],
                "shapValues": []
            }
            
        df = pd.DataFrame([data])
        X = preprocess_shipment_data(df, is_training=False)
        
        preds = shipment_model.predict(X)
        risk_score = float(np.clip(preds[0], 0, 100))
        risk_tier = map_risk_tier(risk_score)
        
        shap_top_3 = extract_shap_values(shipment_explainer, X.columns, X)
        
        return {
            "riskScore": risk_score,
            "riskTier": risk_tier,
            "recommendations": [f"Delay risk mainly driven by {f['feature']}" for f in shap_top_3 if f['value'] > 0],
            "shapValues": shap_top_3
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict/inventory")
async def predict_inventory_risk(data: dict):
    """Predict inventory stockout/overstock risk"""
    try:
        if inventory_model is None:
            risk_score = compute_rule_based_score(data, 'inventory')
            risk_tier = map_risk_tier(risk_score)
            return {
                "riskScore": risk_score,
                "riskTier": risk_tier,
                "source": "rule_based_fallback",
                "recommendations": ["Review safety stock levels"],
                "shapValues": []
            }
            
        df = pd.DataFrame([data])
        X = preprocess_inventory_data(df, is_training=False)
        
        preds = inventory_model.predict(X)
        risk_score = float(np.clip(preds[0], 0, 100))
        risk_tier = map_risk_tier(risk_score)
        
        shap_top_3 = extract_shap_values(inventory_explainer, X.columns, X)
        
        return {
            "riskScore": risk_score,
            "riskTier": risk_tier,
            "recommendations": [f"Stockout risk influenced by {f['feature']}" for f in shap_top_3 if abs(f['value']) > 5],
            "shapValues": shap_top_3
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
