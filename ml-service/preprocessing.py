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

def _ensure_features(df: pd.DataFrame, feature_order: list, defaults: dict | None = None) -> pd.DataFrame:
    """
    Guarantees every feature in `feature_order` exists as a numeric column.
    Missing columns are added with the provided default (0 if not specified)
    so inference does not crash when a caller omits an optional input.
    """
    df_out = df.copy()
    defaults = defaults or {}
    for col in feature_order:
        if col not in df_out.columns:
            df_out[col] = defaults.get(col, 0)
        df_out[col] = pd.to_numeric(df_out[col], errors='coerce').fillna(defaults.get(col, 0))
    return df_out


def preprocess_supplier_data(df: pd.DataFrame, is_training=True):
    """
    Cleans and encodes supplier risk data.
    Missing optional features (totalShipments, daysSinceLastShip, etc.) default to 0
    so single-record inference works even when only the core form fields are sent.
    """
    df_clean = df.copy()

    # Encode categoryRisk if it's a string (services=0, finished_goods=1, components=2, raw_materials=3)
    if 'categoryRisk' in df_clean.columns and df_clean['categoryRisk'].dtype == 'object':
        category_map = {
            'services': 0, 'finished goods': 1, 'finished_goods': 1,
            'components': 2, 'raw materials': 3, 'raw_materials': 3,
        }
        df_clean['categoryRisk'] = df_clean['categoryRisk'].str.lower().map(category_map).fillna(1)

    # If caller passed `category` rather than `categoryRisk`, mirror it
    if 'categoryRisk' not in df_clean.columns and 'category' in df_clean.columns:
        category_map = {
            'services': 0, 'finished goods': 1, 'finished_goods': 1,
            'components': 2, 'raw materials': 3, 'raw_materials': 3,
        }
        df_clean['categoryRisk'] = df_clean['category'].astype(str).str.lower().map(category_map).fillna(1)

    df_clean = _ensure_features(df_clean, SUPPLIER_FEATURE_ORDER)

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

    # Encode weatherLevel (low=0, medium=1, high=2) if still a string
    if 'weatherLevel' in df_clean.columns and df_clean['weatherLevel'].dtype == 'object':
        weather_map = {'low': 0, 'medium': 1, 'high': 2}
        df_clean['weatherLevel'] = df_clean['weatherLevel'].str.lower().map(weather_map).fillna(0)

    df_clean = _ensure_features(df_clean, SHIPMENT_FEATURE_ORDER, defaults={'carrierReliability': 0.85})

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

    df_clean = _ensure_features(df_clean, INVENTORY_FEATURE_ORDER)

    features = df_clean[INVENTORY_FEATURE_ORDER]

    if is_training:
        target = df_clean['riskScore'] if 'riskScore' in df_clean.columns else None
        return features, target
    return features
