import pandas as pd
import numpy as np

# Phase 1: Feature Engineering (Rifshadh / Umayanthi / Wijemanna)

# Strict feature orders to ensure consistency between training and inference (FR-M-05)
SUPPLIER_FEATURE_ORDER = [
    'onTimeDeliveryRate', 
    'financialScore', 
    'defectRate', 
    'disputeFrequency',
    'geopoliticalRiskFlag', 
    'totalShipments', 
    'averageDelayDays',
    'daysSinceLastShip', 
    'activeShipmentCount', 
    'categoryRisk'
]

SHIPMENT_FEATURE_ORDER = [
    'etaDeviationHours',
    'weatherLevel',
    'routeRiskIndex',
    'carrierReliability',
    'trackingGapHours',
    'shipmentValueUSD',
    'daysInTransit',
    'supplierRiskScore',
    'isInternational',
    'carrierDelayRate'
]

INVENTORY_FEATURE_ORDER = [
    'currentStock',
    'averageDailyDemand',
    'leadTimeDays',
    'demandVariance',
    'supplierRiskScore',
    'safetyStock',
    'reorderPoint',
    'incomingStockDays',
    'pendingOrderQty',
    'isCriticalItem'
]

def map_risk_tier(score):
    """Maps a risk score (0-100) to a categorical risk tier."""
    if score < 30:
        return "low"
    elif score < 60:
        return "medium"
    elif score < 80:
        return "high"
    else:
        return "critical"

def preprocess_supplier_data(df: pd.DataFrame, is_training=True):
    """
    Cleans and encodes supplier risk data.
    """
    df_clean = df.copy()
    
    # Encode categoryRisk if it's string (Services=0, Finished Goods=1, Components=2, Raw Materials=3)
    if 'categoryRisk' in df_clean.columns and df_clean['categoryRisk'].dtype == 'object':
        category_map = {
            'services': 0, 'finished goods': 1, 'components': 2, 'raw materials': 3
        }
        df_clean['categoryRisk'] = df_clean['categoryRisk'].str.lower().map(category_map).fillna(1)
        
    # Ensure correct types and fill missing values
    for col in SUPPLIER_FEATURE_ORDER:
        if col in df_clean.columns:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').fillna(0)

    # Return expected columns in exact order
    features = df_clean[SUPPLIER_FEATURE_ORDER]
    
    if is_training:
        target = df_clean['riskScore'] if 'riskScore' in df_clean.columns else None
        return features, target
    return features


def preprocess_shipment_data(df: pd.DataFrame, is_training=True):
    """
    Cleans and encodes shipment risk data.
    """
    df_clean = df.copy()
    
    # Encode weatherLevel (Low=0, Medium=1, High=2)
    if 'weatherLevel' in df_clean.columns and df_clean['weatherLevel'].dtype == 'object':
        weather_map = {'low': 0, 'medium': 1, 'high': 2}
        df_clean['weatherLevel'] = df_clean['weatherLevel'].str.lower().map(weather_map).fillna(0)
        
    for col in SHIPMENT_FEATURE_ORDER:
        if col in df_clean.columns:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').fillna(0)

    features = df_clean[SHIPMENT_FEATURE_ORDER]
    
    if is_training:
        target = df_clean['riskScore'] if 'riskScore' in df_clean.columns else None
        return features, target
    return features


def preprocess_inventory_data(df: pd.DataFrame, is_training=True):
    """
    Cleans and encodes inventory risk data.
    """
    df_clean = df.copy()
    
    for col in INVENTORY_FEATURE_ORDER:
        if col in df_clean.columns:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').fillna(0)

    features = df_clean[INVENTORY_FEATURE_ORDER]
    
    if is_training:
        target = df_clean['riskScore'] if 'riskScore' in df_clean.columns else None
        return features, target
    return features
