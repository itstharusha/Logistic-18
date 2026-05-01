"""
Phase 2B: Hyperparameter Tuning - Optimization via GridSearchCV

Performs systematic hyperparameter optimization using GridSearchCV.
Finds optimal parameters for each domain using 5-fold cross-validation.
Saves tuned models and comparison reports.

Lead: Rifshadh (Supplier), or ML optimization specialist
"""

import pandas as pd
import numpy as np
import os
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split, GridSearchCV
import json
from preprocessing import (
    preprocess_supplier_data, 
    preprocess_shipment_data, 
    preprocess_inventory_data,
)

# Path setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
MODELS_DIR = os.path.join(BASE_DIR, "ml-service", "models")
BASELINE_DIR = os.path.join(MODELS_DIR, "baseline")
TUNING_REPORT_DIR = os.path.join(MODELS_DIR, "tuning_reports")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(BASELINE_DIR, exist_ok=True)
os.makedirs(TUNING_REPORT_DIR, exist_ok=True)

# Hyperparameter search space for GridSearchCV
PARAM_GRID = {
    'n_estimators': [50, 100, 150],         # Number of boosting rounds
    'max_depth': [3, 5, 7],                 # Tree depth
    'learning_rate': [0.05, 0.1, 0.2],      # Shrinkage rate
    'subsample': [0.6, 0.8, 1.0]            # Sample fraction per tree
}


def tune_hyperparameters(X_train, y_train, X_val, y_val, domain_name):
    """
    Perform systematic hyperparameter tuning using GridSearchCV.
    Searches 3^4=81 parameter combinations with 5-fold cross-validation.
    """
    print(f"\n{'='*70}")
    print(f"HYPERPARAMETER TUNING: {domain_name.upper()} RISK MODEL")
    print(f"{'='*70}")
    
    print(f"\nSearch Space:")
    for param, values in PARAM_GRID.items():
        print(f"  {param:20}: {values}")
    
    total_combos = np.prod([len(v) for v in PARAM_GRID.values()])
    print(f"\nTotal combinations: {total_combos}")
    print(f"Cross-validation folds: 5")
    print(f"Total fits required: {total_combos * 5} = {total_combos * 5 // 81}...")
    
    # Base XGBoost Regressor (with fixed non-tuned params, no early stopping for GridSearchCV)
    xgb_reg = xgb.XGBRegressor(
        objective='reg:squarederror',
        random_state=42
    )

    # GridSearchCV for hyperparameter tuning
    print(f"\nRunning GridSearchCV with 5-fold cross-validation...")
    grid_search = GridSearchCV(
        estimator=xgb_reg,
        param_grid=PARAM_GRID,
        scoring='r2',                # Optimize for R² score
        cv=5,                        # 5-fold cross-validation
        verbose=1,
        n_jobs=-1                    # Use all CPU cores
    )
    
    # Fit on training data
    grid_search.fit(X_train, y_train)
    
    # Extract best model
    best_model = grid_search.best_estimator_
    best_params = grid_search.best_params_
    best_cv_score = grid_search.best_score_
    
    print(f"\n{'='*70}")
    print(f"TUNING RESULTS")
    print(f"{'='*70}")
    print(f"Best Parameters Found:")
    for param, value in best_params.items():
        print(f"  {param:20}: {value}")
    
    print(f"\nBest Cross-Validation R² Score: {best_cv_score:.6f}")
    
    # Evaluate on held-out validation set
    val_preds = best_model.predict(X_val)
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    
    val_rmse = np.sqrt(mean_squared_error(y_val, val_preds))
    val_mae = mean_absolute_error(y_val, val_preds)
    val_r2 = r2_score(y_val, val_preds)
    
    print(f"\nValidation Set Performance:")
    print(f"  R² Score: {val_r2:.6f}")
    print(f"  RMSE:     {val_rmse:.6f}")
    print(f"  MAE:      {val_mae:.6f}")
    
    # Save tuned model (replaces previous if exists)
    model_path = os.path.join(MODELS_DIR, f"{domain_name}_model.joblib")
    if os.path.exists(model_path):
        # Backup old tuned model
        import shutil
        old_backup = os.path.join(MODELS_DIR, "backup", f"{domain_name}_model_backup.joblib")
        os.makedirs(os.path.dirname(old_backup), exist_ok=True)
        shutil.copy2(model_path, old_backup)
        print(f"\nBacked up previous tuned model to: {old_backup}")
    
    joblib.dump(best_model, model_path)
    print(f"Tuned model saved to: {model_path}")
    
    # Save tuning report
    report = {
        'domain': domain_name,
        'best_parameters': {k: int(v) if isinstance(v, (np.integer, np.int64)) else float(v) if isinstance(v, (np.floating, np.float64)) else v for k, v in best_params.items()},
        'best_cv_r2_score': float(best_cv_score),
        'validation_r2': float(val_r2),
        'validation_rmse': float(val_rmse),
        'validation_mae': float(val_mae),
        'total_grid_combinations': int(total_combos),
        'cv_folds': 5
    }
    
    report_path = os.path.join(TUNING_REPORT_DIR, f"{domain_name}_tuning_report.json")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Tuning report saved to: {report_path}")
    
    return best_model, best_params, val_r2, val_rmse, val_mae


def main():
    """Perform hyperparameter tuning for all three domains."""
    
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
        
        model, params, r2, rmse, mae = tune_hyperparameters(X_train, y_train, X_val, y_val, "supplier")
        results.append(("supplier", params, r2, rmse, mae))
    else:
        print(f"Dataset missing: {supplier_path}")

    # ----- 2. SHIPMENT MODEL -----
    if os.path.exists(shipment_path):
        df_ship = pd.read_csv(shipment_path)
        X, y = preprocess_shipment_data(df_ship, is_training=True)
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        
        model, params, r2, rmse, mae = tune_hyperparameters(X_train, y_train, X_val, y_val, "shipment")
        results.append(("shipment", params, r2, rmse, mae))
    else:
        print(f"Dataset missing: {shipment_path}")

    # ----- 3. INVENTORY MODEL -----
    if os.path.exists(inventory_path):
        df_inv = pd.read_csv(inventory_path)
        X, y = preprocess_inventory_data(df_inv, is_training=True)
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)
        
        model, params, r2, rmse, mae = tune_hyperparameters(X_train, y_train, X_val, y_val, "inventory")
        results.append(("inventory", params, r2, rmse, mae))
    else:
        print(f"Dataset missing: {inventory_path}")

    # Summary Comparison
    print("\n" + "="*70)
    print("HYPERPARAMETER TUNING SUMMARY (Validation Set)")
    print("="*70)
    print(f"{'Domain':<15} {'R² Score':<15} {'RMSE':<15} {'MAE':<15}")
    print("-" * 70)
    for domain, params, r2, rmse, mae in results:
        print(f"{domain:<15} {r2:<15.6f} {rmse:<15.6f} {mae:<15.6f}")
    
    print(f"\nTuned models saved to: {MODELS_DIR}")
    print(f"Tuning reports saved to: {TUNING_REPORT_DIR}")
    print("\nNext Step: Run evaluate.py to test on held-out test set")


if __name__ == "__main__":
    main()
