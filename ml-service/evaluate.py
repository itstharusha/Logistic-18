import os
import pandas as pd
import numpy as np
import joblib
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, confusion_matrix, classification_report
from preprocessing import (
    preprocess_supplier_data, 
    preprocess_shipment_data, 
    preprocess_inventory_data,
    map_risk_tier
)

# Phase 3: Model Evaluation (Senadeera)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
MODELS_DIR = os.path.join(BASE_DIR, "ml-service", "models")

def evaluate_model(X_test, y_test, domain_name):
    """
    Evaluate trained XGBoost model extracting RMSE, MAE, R2, and classification matrices. 
    """
    model_path = os.path.join(MODELS_DIR, f"{domain_name}_model.joblib")
    
    if not os.path.exists(model_path):
        print(f"Model for {domain_name} not found at {model_path}.")
        return

    print(f"\\n{'='*40}")
    print(f"EVALUATING: {domain_name.upper()} RISK MODEL")
    print(f"{'='*40}")

    model = joblib.load(model_path)
    
    # 1. Regression Metrics
    preds = model.predict(X_test)
    preds_clipped = np.clip(preds, 0, 100) # Risk scores are 0-100
    
    rmse = np.sqrt(mean_squared_error(y_test, preds_clipped))
    mae = mean_absolute_error(y_test, preds_clipped)
    r2 = r2_score(y_test, preds_clipped)
    
    print(f"Regression Metrics:")
    print(f"  R² Score: {r2:.4f} " + ("(PASS > 0.92)" if r2 > 0.92 else "(FAIL < 0.92)"))
    print(f"  RMSE:     {rmse:.4f} " + ("(PASS < 5.0)" if rmse < 5.0 else "(FAIL > 5.0)"))
    print(f"  MAE:      {mae:.4f}")
    
    # 2. Classification Derivations
    # Convert numerical scores to mapped tiers to calculate confusion matrix
    y_test_tiers = y_test.apply(map_risk_tier)
    pred_tiers = pd.Series(preds_clipped).apply(map_risk_tier)
    
    labels = ["low", "medium", "high", "critical"]
    
    print(f"\\nClassification Metrics (Derivation to Tiers):")
    cm = confusion_matrix(y_test_tiers, pred_tiers, labels=labels)
    
    print("Confusion Matrix:")
    print(f"{'':>10} | {'pred_low':>10} | {'pred_med':>10} | {'pred_high':>10} | {'pred_crit':>10}")
    print("-" * 65)
    for i, label in enumerate(labels):
        print(f"{'true_'+label:>10} | {cm[i][0]:>10} | {cm[i][1]:>10} | {cm[i][2]:>10} | {cm[i][3]:>10}")
        
    print("\\nClassification Report:")
    print(classification_report(y_test_tiers, pred_tiers, labels=labels, zero_division=0))


def main():
    # File Paths to CSVs
    supplier_path = os.path.join(BASE_DIR, "supplier risk dataset.csv")
    shipment_path = os.path.join(BASE_DIR, "shipment risk dataset.csv")
    inventory_path = os.path.join(BASE_DIR, "inventory risk dataset.csv")
    
    # Needs to match the random state from train.py to pull the exact same holdout split
    # Since train.py did a 80/20 train/temp split, we'll act as if the user split fully here 
    # For a purely evaluation script, we fetch the dataset again and do the split
    from sklearn.model_selection import train_test_split
    
    # ----- 1. SUPPLIER MODEL -----
    if os.path.exists(supplier_path):
        df_sup = pd.read_csv(supplier_path)
        X, y = preprocess_supplier_data(df_sup, is_training=True)
        _, X_temp, _, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        evaluate_model(X_test, y_test, "supplier")

    # ----- 2. SHIPMENT MODEL -----
    if os.path.exists(shipment_path):
        df_ship = pd.read_csv(shipment_path)
        X, y = preprocess_shipment_data(df_ship, is_training=True)
        _, X_temp, _, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        evaluate_model(X_test, y_test, "shipment")

    # ----- 3. INVENTORY MODEL -----
    if os.path.exists(inventory_path):
        df_inv = pd.read_csv(inventory_path)
        X, y = preprocess_inventory_data(df_inv, is_training=True)
        _, X_temp, _, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        evaluate_model(X_test, y_test, "inventory")

if __name__ == "__main__":
    main()
