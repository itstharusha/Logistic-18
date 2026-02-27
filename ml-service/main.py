from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from datetime import datetime
import joblib
import os

app = FastAPI(
    title="Logistic 18 ML Service",
    description="ML microservice for predictive risk scoring",
    version="1.0.0"
)

# Model loading (placeholder - actual models loaded from joblib files)
# In production, these would be actual trained XGBoost models
supplier_model = None
shipment_model = None
inventory_model = None

@app.on_event("startup")
async def load_models():
    """Load models on startup"""
    global supplier_model, shipment_model, inventory_model
    
    try:
        # Attempt to load models from disk
        # model_path = os.path.join(os.path.dirname(__file__), 'models')
        # if os.path.exists(f'{model_path}/supplier_model.joblib'):
        #     supplier_model = joblib.load(f'{model_path}/supplier_model.joblib')
        # if os.path.exists(f'{model_path}/shipment_model.joblib'):
        #     shipment_model = joblib.load(f'{model_path}/shipment_model.joblib')
        # if os.path.exists(f'{model_path}/inventory_model.joblib'):
        #     inventory_model = joblib.load(f'{model_path}/inventory_model.joblib')
        
        print("✓ Models loaded successfully (or using placeholder mock models)")
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

@app.post("/predict/supplier")
async def predict_supplier_risk(data: dict):
    """
    Predict supplier risk score
    
    Expected features:
    - onTimeDeliveryRate (0-99.99)
    - financialScore (0-99.99)
    - defectRate (0-30)
    - disputeFrequency (0-20)
    - geopoliticalRiskFlag (0 or 1)
    - totalShipments (1-299)
    - averageDelayDays (0-20)
    - daysSinceLastShip (0-180)
    - activeShipmentCount (0-49)
    - categoryRisk (0-3)
    """
    try:
        # Mock prediction for now (actual model would be used here)
        risk_score = np.random.uniform(0, 100)
        risk_tier = "low" if risk_score < 30 else "medium" if risk_score < 60 else "high" if risk_score < 80 else "critical"
        
        return {
            "riskScore": float(risk_score),
            "riskTier": risk_tier,
            "recommendations": [
                "Monitor onTimeDeliveryRate",
                "Verify financial health",
                "Check geopolitical factors"
            ],
            "shapValues": [
                {"feature": "onTimeDeliveryRate", "value": 0.35, "impact": "high"},
                {"feature": "financialScore", "value": 0.25, "impact": "medium"},
                {"feature": "geopoliticalRiskFlag", "value": 0.15, "impact": "medium"},
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict/shipment")
async def predict_shipment_risk(data: dict):
    """Predict shipment delay/cancellation risk"""
    try:
        # Mock prediction
        risk_score = np.random.uniform(0, 100)
        risk_tier = "low" if risk_score < 30 else "medium" if risk_score < 60 else "high" if risk_score < 80 else "critical"
        
        return {
            "riskScore": float(risk_score),
            "riskTier": risk_tier,
            "recommendations": [
                "Monitor ETA deviation",
                "Check weather conditions",
                "Verify carrier reliability"
            ],
            "shapValues": [
                {"feature": "etaDeviationHours", "value": 0.40, "impact": "high"},
                {"feature": "weatherLevel", "value": 0.25, "impact": "medium"},
                {"feature": "carrierReliability", "value": 0.20, "impact": "medium"},
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict/inventory")
async def predict_inventory_risk(data: dict):
    """Predict inventory stockout/overstock risk"""
    try:
        # Mock prediction
        risk_score = np.random.uniform(0, 100)
        risk_tier = "low" if risk_score < 30 else "medium" if risk_score < 60 else "high" if risk_score < 80 else "critical"
        
        return {
            "riskScore": float(risk_score),
            "riskTier": risk_tier,
            "recommendations": [
                "Review safety stock levels",
                "Check demand forecast",
                "Monitor reorder point"
            ],
            "shapValues": [
                {"feature": "currentStock", "value": 0.35, "impact": "high"},
                {"feature": "averageDailyDemand", "value": 0.30, "impact": "high"},
                {"feature": "leadTimeDays", "value": 0.20, "impact": "medium"},
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
