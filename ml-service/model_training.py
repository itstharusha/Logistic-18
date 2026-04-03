"""
Phase 2A: Model Training - Basic Model Training

Trains baseline XGBoost models without hyperparameter tuning.
Saves baseline models for comparison and further optimization.

Lead: Umayanthi (Shipment), Wijemanna (Inventory), or domain-specific ML engineer
"""

import pandas as pd
import numpy as np
import os
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from preprocessing import (
    preprocess_supplier_data, 
    preprocess_shipment_data, 
    preprocess_inventory_data,
)

# Path setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
MODELS_DIR = os.path.join(BASE_DIR, "ml-service", "models")
BASELINE_DIR = os.path.join(MODELS_DIR, "baseline")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(BASELINE_DIR, exist_ok=True)

# Baseline hyperparameters (standard XGBoost defaults adapted for risk scoring)
BASELINE_PARAMS = {
    'objective': 'reg:squarederror',
    'n_estimators': 50,          # Base estimators
    'max_depth': 4,              # Base tree depth
    'learning_rate': 0.1,        # Base shrinkage
    'subsample': 0.8,            # Base sample fraction
    'random_state': 42,
    'early_stopping_rounds': 10,
    'eval_metric': 'rmse'
}


def train_baseline_model(X_train, y_train, X_val, y_val, domain_name):
    """
    Train a baseline XGBoost model using standard hyperparameters.
    Serves as the foundation before hyperparameter optimization.
    """
    print(f"\n--- Training {domain_name.upper()} Baseline Model ---")
    print(f"Baseline Hyperparameters: {BASELINE_PARAMS}")
    
    # Create baseline model
    model = xgb.XGBRegressor(**BASELINE_PARAMS)
    
    # Train with validation set for early stopping
    print(f"Training on {len(X_train)} samples, validating on {len(X_val)} samples...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )
    
    # Evaluate on validation set
    val_preds = model.predict(X_val)
    val_rmse = np.sqrt(np.mean((y_val - val_preds)**2))
    val_mae = np.mean(np.abs(y_val - val_preds))
    
    print(f"Baseline Performance:")
    print(f"  Validation RMSE: {val_rmse:.4f}")
    print(f"  Validation MAE:  {val_mae:.4f}")
    print(f"  Trees Used:      {model.n_estimators}")
    
    # Save baseline model
    baseline_path = os.path.join(BASELINE_DIR, f"{domain_name}_baseline_model.joblib")
    joblib.dump(model, baseline_path)
    print(f"Baseline model saved to {baseline_path}")
    
    return model, val_rmse, val_mae


def main():
    """Train baseline models for all three domains."""
    
    # File Paths to CSVs
    supplier_path = os.path.join(BASE_DIR, "supplier risk dataset.csv")
    shipment_path = os.path.join(BASE_DIR, "shipment risk dataset.csv")
    inventory_path = os.path.join(BASE_DIR, "inventory risk dataset.csv")

    results = []

    # ----- 1. SUPPLIER MODEL -----
    if os.path.exists(supplier_path):
        df_sup = pd.read_csv(supplier_path)
        X, y = preprocess_supplier_data(df_sup, is_training=True)
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        
        model, rmse, mae = train_baseline_model(X_train, y_train, X_val, y_val, "supplier")
        results.append(("supplier", rmse, mae))
    else:
        print(f"Dataset missing: {supplier_path}")

    # ----- 2. SHIPMENT MODEL -----
    if os.path.exists(shipment_path):
        df_ship = pd.read_csv(shipment_path)
        X, y = preprocess_shipment_data(df_ship, is_training=True)
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        
        model, rmse, mae = train_baseline_model(X_train, y_train, X_val, y_val, "shipment")
        results.append(("shipment", rmse, mae))
    else:
        print(f"Dataset missing: {shipment_path}")

    # ----- 3. INVENTORY MODEL -----
    if os.path.exists(inventory_path):
        df_inv = pd.read_csv(inventory_path)
        X, y = preprocess_inventory_data(df_inv, is_training=True)
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        
        model, rmse, mae = train_baseline_model(X_train, y_train, X_val, y_val, "inventory")
        results.append(("inventory", rmse, mae))
    else:
        print(f"Dataset missing: {inventory_path}")

    # Summary
    print("\n" + "="*60)
    print("BASELINE MODEL TRAINING SUMMARY")
    print("="*60)
    for domain, rmse, mae in results:
        print(f"{domain.upper():12}: RMSE={rmse:.4f}, MAE={mae:.4f}")
    print("\nBaseline models saved to:", BASELINE_DIR)
    print("Next Step: Run hyperparameter_tuning.py for optimization")


if __name__ == "__main__":
    main()
