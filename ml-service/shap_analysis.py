"""
Phase 5: SHAP Explainability Analysis

Comprehensive SHAP TreeExplainer analysis for model interpretability.
Extracts feature importance, generates explanations, and produces reports.

Lead: Umayanthi
"""

import pandas as pd
import numpy as np
import os
import joblib
import xgboost as xgb
import shap
import json
from preprocessing import (
    preprocess_supplier_data,
    preprocess_shipment_data,
    preprocess_inventory_data,
)

# Path setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "ml-service", "models")
SHAP_REPORTS_DIR = os.path.join(MODELS_DIR, "shap_reports")

os.makedirs(SHAP_REPORTS_DIR, exist_ok=True)

# Risk tier mapping
def map_risk_tier(score):
    """Map risk score (0-100) to tier"""
    if score < 25:
        return "low"
    elif score < 50:
        return "medium"
    elif score < 75:
        return "high"
    else:
        return "critical"


def analyze_shap_values(model, X_test, feature_names, domain_name):
    """
    Analyze SHAP values for a model and domain.
    Returns feature importance analysis and sample explanations.
    """
    print(f"\n{'='*70}")
    print(f"SHAP ANALYSIS: {domain_name.upper()} RISK MODEL")
    print(f"{'='*70}")
    
    # Initialize SHAP TreeExplainer
    print(f"\nInitializing TreeExplainer for {domain_name} model...")
    explainer = shap.TreeExplainer(model)
    
    # Calculate SHAP values for entire test set
    print(f"Computing SHAP values for {len(X_test)} test samples...")
    shap_values = explainer.shap_values(X_test)
    
    # Calculate mean |SHAP| for feature importance
    feature_importance = np.abs(shap_values).mean(axis=0)
    feature_importance_df = pd.DataFrame({
        'Feature': feature_names,
        'Mean |SHAP|': feature_importance,
        'Rank': np.argsort(-feature_importance) + 1
    }).sort_values('Mean |SHAP|', ascending=False)
    
    print(f"\n{'='*70}")
    print(f"FEATURE IMPORTANCE RANKING (by Mean |SHAP| Value)")
    print(f"{'='*70}")
    print(feature_importance_df.to_string(index=False))
    
    # Top 5 features analysis
    print(f"\n{'='*70}")
    print(f"TOP 5 MOST IMPACTFUL FEATURES")
    print(f"{'='*70}")
    top_5_features = feature_importance_df.head(5)
    for idx, row in top_5_features.iterrows():
        print(f"\n{int(row['Rank'])}. {row['Feature']}")
        print(f"   Mean |SHAP| Value: {row['Mean |SHAP|']:.6f}")
        print(f"   Impact Level: {'HIGH' if row['Mean |SHAP|'] > 1.0 else 'MEDIUM' if row['Mean |SHAP|'] > 0.5 else 'LOW'}")
    
    # Analyze sample predictions with SHAP explanations
    print(f"\n{'='*70}")
    print(f"SAMPLE PREDICTIONS WITH SHAP EXPLANATIONS")
    print(f"{'='*70}")
    
    sample_indices = [0, len(X_test)//4, len(X_test)//2, 3*len(X_test)//4, len(X_test)-1]
    sample_explanations = []
    
    for i, sample_idx in enumerate(sample_indices):
        if sample_idx >= len(X_test):
            sample_idx = len(X_test) - 1
        
        prediction = model.predict(X_test[sample_idx:sample_idx+1])[0]
        risk_tier = map_risk_tier(prediction * 20)  # Scale to 0-100
        
        # Get top 3 SHAP contributions
        sample_shap = np.abs(shap_values[sample_idx])
        top_3_indices = np.argsort(-sample_shap)[:3]
        top_3_features = [(feature_names[idx], shap_values[sample_idx, idx], X_test[sample_idx, idx]) 
                          for idx in top_3_indices]
        
        explanation = {
            'sample_index': int(sample_idx),
            'risk_score': float(prediction * 20),  # Scale to 0-100
            'risk_tier': risk_tier,
            'top_3_features': [
                {
                    'feature': feat_name,
                    'shap_value': float(shap_val),
                    'feature_value': float(feat_val),
                    'impact': 'high' if abs(shap_val) > 1.0 else 'medium' if abs(shap_val) > 0.5 else 'low'
                }
                for feat_name, shap_val, feat_val in top_3_features
            ]
        }
        sample_explanations.append(explanation)
        
        print(f"\nSample {explanation['sample_index']}:")
        print(f"  Risk Score: {explanation['risk_score']:.2f}")
        print(f"  Risk Tier: {explanation['risk_tier'].upper()}")
        print(f"  Top 3 Contributing Features:")
        for j, feat_info in enumerate(explanation['top_3_features'], 1):
            print(f"    {j}. {feat_info['feature']}")
            print(f"       Value: {feat_info['feature_value']:.4f}")
            print(f"       SHAP: {feat_info['shap_value']:.4f} ({feat_info['impact'].upper()})")
    
    # Generate SHAP report JSON
    report = {
        'domain': domain_name,
        'total_samples_analyzed': len(X_test),
        'feature_importance': feature_importance_df.to_dict('records'),
        'top_5_features': top_5_features['Feature'].tolist(),
        'sample_explanations': sample_explanations,
        'explainer_type': 'TreeExplainer',
        'model_type': 'XGBRegressor'
    }
    
    report_path = os.path.join(SHAP_REPORTS_DIR, f"{domain_name}_shap_report.json")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\n✓ SHAP report saved to: {report_path}")
    
    return explainer, feature_importance_df, sample_explanations


def main():
    """Run SHAP analysis for all three domains."""
    
    print("\n" + "="*70)
    print("PHASE 5: SHAP EXPLAINABILITY ANALYSIS")
    print("="*70)
    print("Lead: Umayanthi")
    print("Objective: Extract feature importance and model interpretability")
    
    # Load preprocessed data
    supplier_path = os.path.join(BASE_DIR, "supplier risk dataset.csv")
    shipment_path = os.path.join(BASE_DIR, "shipment risk dataset.csv")
    inventory_path = os.path.join(BASE_DIR, "inventory risk dataset.csv")
    
    # Supplier Domain
    print(f"\n{'='*70}")
    print("LOADING DATA FOR SUPPLIER DOMAIN")
    print(f"{'='*70}")
    try:
        supplier_df = pd.read_csv(supplier_path)
        X_test_s, y_test_s = preprocess_supplier_data(supplier_df, is_training=True)
        # For SHAP analysis, we use the full preprocessed data as test set
        supplier_model = joblib.load(os.path.join(MODELS_DIR, "supplier_model.joblib"))
        supplier_features = list(X_test_s.columns)
        
        explainer_s, importance_s, explanations_s = analyze_shap_values(
            supplier_model, X_test_s.values, supplier_features, "supplier"
        )
        print("✓ Supplier SHAP analysis complete")
    except Exception as e:
        print(f"✗ Supplier domain error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Shipment Domain
    print(f"\n{'='*70}")
    print("LOADING DATA FOR SHIPMENT DOMAIN")
    print(f"{'='*70}")
    try:
        shipment_df = pd.read_csv(shipment_path)
        X_test_sh, y_test_sh = preprocess_shipment_data(shipment_df, is_training=True)
        shipment_model = joblib.load(os.path.join(MODELS_DIR, "shipment_model.joblib"))
        shipment_features = list(X_test_sh.columns)
        
        explainer_sh, importance_sh, explanations_sh = analyze_shap_values(
            shipment_model, X_test_sh.values, shipment_features, "shipment"
        )
        print("✓ Shipment SHAP analysis complete")
    except Exception as e:
        print(f"✗ Shipment domain error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Inventory Domain
    print(f"\n{'='*70}")
    print("LOADING DATA FOR INVENTORY DOMAIN")
    print(f"{'='*70}")
    try:
        inventory_df = pd.read_csv(inventory_path)
        X_test_i, y_test_i = preprocess_inventory_data(inventory_df, is_training=True)
        inventory_model = joblib.load(os.path.join(MODELS_DIR, "inventory_model.joblib"))
        inventory_features = list(X_test_i.columns)
        
        explainer_i, importance_i, explanations_i = analyze_shap_values(
            inventory_model, X_test_i.values, inventory_features, "inventory"
        )
        print("✓ Inventory SHAP analysis complete")
    except Exception as e:
        print(f"✗ Inventory domain error: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Summary
    print(f"\n{'='*70}")
    print("SHAP ANALYSIS SUMMARY")
    print(f"{'='*70}")
    print("\nDomain Summaries:")
    print(f"\n✓ SUPPLIER DOMAIN:")
    print(f"  Top Feature: {importance_s.iloc[0]['Feature']}")
    print(f"  Importance Score: {importance_s.iloc[0]['Mean |SHAP|']:.6f}")
    
    print(f"\n✓ SHIPMENT DOMAIN:")
    print(f"  Top Feature: {importance_sh.iloc[0]['Feature']}")
    print(f"  Importance Score: {importance_sh.iloc[0]['Mean |SHAP|']:.6f}")
    
    print(f"\n✓ INVENTORY DOMAIN:")
    print(f"  Top Feature: {importance_i.iloc[0]['Feature']}")
    print(f"  Importance Score: {importance_i.iloc[0]['Mean |SHAP|']:.6f}")
    
    print(f"\nSHAP Reports Location: {SHAP_REPORTS_DIR}/")
    print("\n" + "="*70)
    print("DELIVERABLES")
    print("="*70)
    print("✓ SHAP TreeExplainer initialized for all 3 models")
    print("✓ Feature importance calculated and ranked")
    print("✓ Top-5 features identified for each domain")
    print("✓ Sample predictions explained with SHAP values")
    print("✓ JSON reports generated for each domain")
    print(f"✓ Explainability integrated into FastAPI (main.py)")
    print("\n" + "="*70)
    print("PHASE 5 COMPLETE")
    print("="*70)
    print("Next: Phase 6 - Model Deployment & Integration (Wijemanna)")


if __name__ == "__main__":
    main()
