"""
Test script for ML Service endpoints
Tests all three prediction endpoints (supplier, shipment, inventory)
"""

import requests
import json

ML_SERVICE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("TEST 1: HEALTH CHECK")
    print("="*60)
    
    response = requests.get(f"{ML_SERVICE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200, "Health check failed"
    print("✓ Health check PASSED")


def test_supplier_prediction():
    """Test supplier risk prediction"""
    print("\n" + "="*60)
    print("TEST 2: SUPPLIER RISK PREDICTION")
    print("="*60)
    
    payload = {
        "onTimeDeliveryRate": 85,
        "financialScore": 75,
        "defectRate": 2.5,
        "disputeFrequency": 1,
        "geopoliticalRiskFlag": 0,
        "totalShipments": 50,
        "averageDelayDays": 0.5,
        "daysSinceLastShip": 5,
        "activeShipmentCount": 3,
        "categoryRisk": 1
    }
    
    response = requests.post(f"{ML_SERVICE_URL}/predict/supplier", json=payload)
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Risk Score: {data['riskScore']:.2f}")
    print(f"Risk Tier: {data['riskTier']}")
    print(f"Top 3 SHAP Features:")
    for i, shap in enumerate(data['shapValues'][:3], 1):
        print(f"  {i}. {shap['feature']}: value={shap['value']:.4f}, impact={shap['impact']}")
    print(f"Recommendations: {data['recommendations'][:2]}")
    
    assert response.status_code == 200, "Supplier prediction failed"
    assert 0 <= data['riskScore'] <= 100, "Risk score out of range"
    assert data['riskTier'] in ['low', 'medium', 'high', 'critical'], "Invalid risk tier"
    assert len(data['shapValues']) > 0, "No SHAP values returned"
    print("✓ Supplier prediction PASSED")


def test_shipment_prediction():
    """Test shipment risk prediction"""
    print("\n" + "="*60)
    print("TEST 3: SHIPMENT RISK PREDICTION")
    print("="*60)
    
    payload = {
        "etaDeviationHours": 3.5,
        "weatherLevel": 1,  # medium
        "routeRiskIndex": 45.0,
        "carrierReliability": 92.5,
        "trackingGapHours": 2.5,
        "shipmentValueUSD": 15000,
        "daysInTransit": 3,
        "supplierRiskScore": 25,
        "isInternational": 0,
        "carrierDelayRate": 5.2
    }
    
    response = requests.post(f"{ML_SERVICE_URL}/predict/shipment", json=payload)
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Risk Score: {data['riskScore']:.2f}")
    print(f"Risk Tier: {data['riskTier']}")
    print(f"Top 3 SHAP Features:")
    for i, shap in enumerate(data['shapValues'][:3], 1):
        print(f"  {i}. {shap['feature']}: value={shap['value']:.4f}, impact={shap['impact']}")
    print(f"Recommendations: {data['recommendations'][:2]}")
    
    assert response.status_code == 200, "Shipment prediction failed"
    assert 0 <= data['riskScore'] <= 100, "Risk score out of range"
    assert data['riskTier'] in ['low', 'medium', 'high', 'critical'], "Invalid risk tier"
    print("✓ Shipment prediction PASSED")


def test_inventory_prediction():
    """Test inventory risk prediction"""
    print("\n" + "="*60)
    print("TEST 4: INVENTORY RISK PREDICTION")
    print("="*60)
    
    payload = {
        "currentStock": 250,
        "averageDailyDemand": 15,
        "leadTimeDays": 14,
        "demandVariance": 5.2,
        "supplierRiskScore": 30,
        "safetyStock": 100,
        "reorderPoint": 120,
        "incomingStockDays": 7,
        "pendingOrderQty": 200,
        "isCriticalItem": 0
    }
    
    response = requests.post(f"{ML_SERVICE_URL}/predict/inventory", json=payload)
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Risk Score: {data['riskScore']:.2f}")
    print(f"Risk Tier: {data['riskTier']}")
    print(f"Top 3 SHAP Features:")
    for i, shap in enumerate(data['shapValues'][:3], 1):
        print(f"  {i}. {shap['feature']}: value={shap['value']:.4f}, impact={shap['impact']}")
    print(f"Recommendations: {data['recommendations'][:2]}")
    
    assert response.status_code == 200, "Inventory prediction failed"
    assert 0 <= data['riskScore'] <= 100, "Risk score out of range"
    assert data['riskTier'] in ['low', 'medium', 'high', 'critical'], "Invalid risk tier"
    print("✓ Inventory prediction PASSED")


def main():
    print("\n" + "="*60)
    print("ML SERVICE INTEGRATION TEST SUITE")
    print("="*60)
    
    try:
        test_health()
        test_supplier_prediction()
        test_shipment_prediction()
        test_inventory_prediction()
        
        print("\n" + "="*60)
        print("ALL TESTS PASSED ✓")
        print("="*60)
        print("\nML Pipeline Summary:")
        print("  Phase 1: Feature Engineering ✓ (preprocessing.py)")
        print("  Phase 2: Model Training & Tuning ✓ (train.py)")
        print("  Phase 3: Model Evaluation ✓ (evaluate.py)")
        print("  Phase 4: SHAP Explainability ✓ (main.py)")
        print("  Phase 5: Deployment & Integration ✓ (uvicorn + endpoints)")
        print("\nReady for Node.js backend integration!")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    main()
