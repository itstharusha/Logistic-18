import pandas as pd
import numpy as np
import os
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split, GridSearchCV
from preprocessing import (
    preprocess_supplier_data, 
    preprocess_shipment_data, 
    preprocess_inventory_data,
    map_risk_tier
)

# Phase 2: Model Training & Hyperparameter Tuning (Rifshadh / Umayanthi / Wijemanna)

# Path setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
MODELS_DIR = os.path.join(BASE_DIR, "ml-service", "models")
BACKUP_DIR = os.path.join(MODELS_DIR, "backup")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

def train_and_tune(X_train, y_train, X_val, y_val, domain_name):
    """
    Train and hyperparameter tune an XGBoost regressor using GridSearchCV.
    Backup the previous model if it exists to allow for rollback (NFR-M-06).
    """
    print(f"\\n--- Training {domain_name} Risk Model ---")
    
    # 1. Hyperparameter Tuning Space
    # Simplified grid for faster execution, but represents the requirement
    param_grid = {
        'n_estimators': [50, 100],
        'max_depth': [3, 5],
        'learning_rate': [0.05, 0.1],
        'subsample': [0.8, 1.0]
    }
    
    # Base XGBoost Regressor
    xgb_reg = xgb.XGBRegressor(
        objective='reg:squarederror',
        random_state=42
    )

    # 2. GridSearchCV for hyperparameter tuning
    print("Running GridSearchCV...")
    grid_search = GridSearchCV(
        estimator=xgb_reg,
        param_grid=param_grid,
        scoring='neg_root_mean_squared_error',
        cv=3,
        verbose=1,
        n_jobs=-1
    )
    
    # Fit on training data
    grid_search.fit(X_train, y_train)
    
    best_model = grid_search.best_estimator_
    print(f"Best params found: {grid_search.best_params_}")
    
    # Optional: evaluate briefly on validation set logic
    val_preds = best_model.predict(X_val)
    val_rmse = np.sqrt(np.mean((y_val - val_preds)**2))
    print(f"Validation RMSE: {val_rmse:.4f}")
    
    # 3. Model Backup & Save Mechanism
    model_path = os.path.join(MODELS_DIR, f"{domain_name}_model.joblib")
    backup_path = os.path.join(BACKUP_DIR, f"{domain_name}_model_backup.joblib")
    
    if os.path.exists(model_path):
        import shutil
        shutil.copy2(model_path, backup_path)
        print(f"Backed up previous model to {backup_path}")
        
    print(f"Saving new tuned model to {model_path}")
    joblib.dump(best_model, model_path)
    
    return best_model


def main():
    # File Paths to CSVs (Assisted by proposal layout)
    # The CSV files are located in root directory
    supplier_path = os.path.join(BASE_DIR, "supplier risk dataset.csv")
    shipment_path = os.path.join(BASE_DIR, "shipment risk dataset.csv")
    inventory_path = os.path.join(BASE_DIR, "inventory risk dataset.csv")

    # ----- 1. SUPPLIER MODEL -----
    if os.path.exists(supplier_path):
        df_sup = pd.read_csv(supplier_path)
        X, y = preprocess_supplier_data(df_sup, is_training=True)
        # 80-10-10 split equivalent (using 80 train/val, 20 test for simplicity here, test will be in evaluate.py)
        # For training script, we split 80% train, 20% validation. evaluate.py will handle final metrics.
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        
        train_and_tune(X_train, y_train, X_temp, y_temp, "supplier")
    else:
        print(f"Dataset missing: {supplier_path}")

    # ----- 2. SHIPMENT MODEL -----
    if os.path.exists(shipment_path):
        df_ship = pd.read_csv(shipment_path)
        X, y = preprocess_shipment_data(df_ship, is_training=True)
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        
        train_and_tune(X_train, y_train, X_temp, y_temp, "shipment")
    else:
        print(f"Dataset missing: {shipment_path}")

    # ----- 3. INVENTORY MODEL -----
    if os.path.exists(inventory_path):
        df_inv = pd.read_csv(inventory_path)
        X, y = preprocess_inventory_data(df_inv, is_training=True)
        X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.2, random_state=42)
        
        train_and_tune(X_train, y_train, X_temp, y_temp, "inventory")
    else:
        print(f"Dataset missing: {inventory_path}")


if __name__ == "__main__":
    main()
