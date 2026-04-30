# Feature Validation Implementation Guide

**Last Updated**: April 3, 2026  
**Version**: 1.0  
**Purpose**: Standardized validation patterns across frontend, backend, and ML service

---

## 1. Validation Architecture

All three layers must independently validate using the same rules. This prevents cascading failures.

```
Frontend                Backend              ML Service
────────────────────────────────────────────────────────
User Input              Type Check           Feature Check
  ↓                        ↓                      ↓
Semantic                Range Check           Bounds Check
Validation                ↓                      ↓
  ↓                    Enrichment          Coercion & Log
Database         ↓                              ↓
Constraints      Prediction             Prediction
  ↓                        ↓                      ↓
Alert Trigger            Alert              Risk Score
Triggered           Trigger Triggered
```

---

## 2. Frontend Validation (React)

Location: `frontend/src/components/SupplierForm.jsx` and similar

```javascript
// ===== VALIDATION RULES =====
const SUPPLIER_VALIDATION_RULES = {
  onTimeDeliveryRate: {
    type: 'number',
    required: true,
    min: 0,
    max: 100,
    message: 'On-time delivery rate must be 0-100%'
  },
  financialScore: {
    type: 'number',
    required: true,
    min: 0,
    max: 100,
    message: 'Financial score must be 0-100'
  },
  defectRate: {
    type: 'number',
    required: true,
    min: 0,
    max: 100,
    message: 'Defect rate must be 0-100%'
  },
  disputeFrequency: {
    type: 'number',
    required: true,
    min: 0,
    max: 20,
    message: 'Dispute frequency must be 0-20 per period'
  },
  geopoliticalRiskFlag: {
    type: 'number',
    required: true,
    min: 0,
    max: 1,
    message: 'Must be 0 (stable) or 1 (at-risk)'
  },
  averageDelayDays: {
    type: 'number',
    required: true,
    min: 0,
    max: 999,
    message: 'Average delay must be 0-999 days'
  }
};

// ===== VALIDATION FUNCTION =====
function validateSupplierData(formData) {
  const errors = {};
  
  Object.entries(SUPPLIER_VALIDATION_RULES).forEach(([field, rule]) => {
    const value = formData[field];
    
    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors[field] = `${field} is required`;
      return;
    }
    
    // Type check
    if (value !== '' && typeof parseFloat(value) !== 'number') {
      errors[field] = `${field} must be a number`;
      return;
    }
    
    // Range check
    const numValue = parseFloat(value);
    if (numValue < rule.min) {
      errors[field] = `${field} cannot be below ${rule.min}`;
      return;
    }
    if (numValue > rule.max) {
      errors[field] = `${field} cannot exceed ${rule.max}`;
      return;
    }
  });
  
  return errors;
}

// ===== USAGE IN FORM =====
export default function SupplierForm() {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationErrors = validateSupplierData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    // Valid data -> Submit to backend
    submitSupplier(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Field with error display */}
      <input
        value={formData.onTimeDeliveryRate || ''}
        onChange={(e) => setFormData({...formData, onTimeDeliveryRate: e.target.value})}
        placeholder="0-100"
      />
      {errors.onTimeDeliveryRate && (
        <span className="error">{errors.onTimeDeliveryRate}</span>
      )}
    </form>
  );
}
```

---

## 3. Backend Validation (Node.js)

Location: `backend/src/middleware/validation.js`

```javascript
// ===== VALIDATION SCHEMAS =====
const supplierValidationSchema = {
  onTimeDeliveryRate: { type: 'number', min: 0, max: 100, required: true },
  financialScore: { type: 'number', min: 0, max: 100, required: true },
  defectRate: { type: 'number', min: 0, max: 100, required: true },
  disputeFrequency: { type: 'number', min: 0, max: 20, required: true },
  geopoliticalRiskFlag: { type: 'number', min: 0, max: 1, required: true },
  averageDelayDays: { type: 'number', min: 0, max: 999, required: true }
};

const shipmentValidationSchema = {
  etaDeviationHours: { type: 'number', min: 0, max: 9999, required: true },
  weatherLevel: { type: 'number', min: 0, max: 2, required: true },
  routeRiskIndex: { type: 'number', min: 0, max: 100, required: true },
  carrierReliability: { type: 'number', min: 0, max: 100, required: true },
  trackingGapHours: { type: 'number', min: 0, max: 9999, required: true },
  shipmentValueUSD: { type: 'number', min: 0, max: 9999999, required: true },
  daysInTransit: { type: 'number', min: 0, max: 365, required: true },
  supplierRiskScore: { type: 'number', min: 0, max: 100, required: true },
  isInternational: { type: 'number', min: 0, max: 1, required: true },
  carrierDelayRate: { type: 'number', min: 0, max: 100, required: true }
};

const inventoryValidationSchema = {
  currentStock: { type: 'number', min: 0, max: 999999, required: true },
  averageDailyDemand: { type: 'number', min: 0, max: 999999, required: true },
  leadTimeDays: { type: 'number', min: 1, max: 999, required: true },
  demandVariance: { type: 'number', min: 0, max: 999999, required: true },
  supplierRiskScore: { type: 'number', min: 0, max: 100, required: true },
  safetyStock: { type: 'number', min: 0, max: 999999, required: true },
  reorderPoint: { type: 'number', min: 0, max: 999999, required: true },
  incomingStockDays: { type: 'number', min: 0, max: 999, required: true },
  pendingOrderQty: { type: 'number', min: 0, max: 999999, required: true },
  isCriticalItem: { type: 'number', min: 0, max: 1, required: true }
};

// ===== VALIDATION FUNCTION =====
function validateData(data, schema) {
  const errors = [];
  const coercions = [];
  
  Object.entries(schema).forEach(([field, rules]) => {
    let value = data[field];
    
    // Required check
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push(`${field} is required`);
      return;
    }
    
    // Skip optional fields if missing
    if (!rules.required && value === undefined) return;
    
    // Type coercion
    if (typeof value === 'string') {
      const converted = parseFloat(value);
      if (isNaN(converted)) {
        errors.push(`${field} could not be converted to number`);
        return;
      }
      value = converted;
      coercions.push({ field, original: data[field], converted: value });
    }
    
    // Range check
    if (value < rules.min) {
      errors.push(`${field} is below minimum (${rules.min})`);
      value = rules.min; // Clamp
      coercions.push({ field, reason: 'clamped_to_min', value });
    }
    if (value > rules.max) {
      errors.push(`${field} is above maximum (${rules.max})`);
      value = rules.max; // Clamp
      coercions.push({ field, reason: 'clamped_to_max', value });
    }
    
    // Update data with processed value
    data[field] = value;
  });
  
  return { valid: errors.length === 0, errors, coercions };
}

// ===== MIDDLEWARE =====
async function validateSupplierMiddleware(req, res, next) {
  const { body } = req;
  
  const result = validateData(body, supplierValidationSchema);
  
  if (!result.valid) {
    // Log validation failure
    logger.warn('Supplier validation failed', {
      errors: result.errors,
      coercions: result.coercions,
      data: body
    });
    
    // Check severity
    if (result.coercions.length > 0) {
      // Warn but allow if coercible
      req.validationWarnings = result.coercions;
    } else {
      // Fail immediately
      return res.status(400).json({
        error: 'Supplier data validation failed',
        details: result.errors
      });
    }
  }
  
  // Attach cleaned data
  req.validatedData = body;
  req.coercions = result.coercions;
  
  next();
}

module.exports = {
  validateSupplierMiddleware,
  validateData,
  supplierValidationSchema,
  shipmentValidationSchema,
  inventoryValidationSchema
};
```

---

## 4. ML Service Validation (Python)

Location: `ml-service/src/validation.py`

```python
import numpy as np
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

# ===== VALIDATION SCHEMAS =====
SUPPLIER_BOUNDS = {
    'onTimeDeliveryRate': (0, 100),
    'financialScore': (0, 100),
    'defectRate': (0, 100),
    'disputeFrequency': (0, 20),
    'geopoliticalRiskFlag': (0, 1),
    'totalShipments': (0, 999999),
    'averageDelayDays': (0, 999),
    'daysSinceLastShip': (0, 999999),
    'activeShipmentCount': (0, 999999),
    'categoryRisk': (0, 3)
}

SHIPMENT_BOUNDS = {
    'etaDeviationHours': (0, 9999),
    'weatherLevel': (0, 2),
    'routeRiskIndex': (0, 100),
    'carrierReliability': (0, 100),
    'trackingGapHours': (0, 9999),
    'shipmentValueUSD': (0, 9999999),
    'daysInTransit': (0, 365),
    'supplierRiskScore': (0, 100),
    'isInternational': (0, 1),
    'carrierDelayRate': (0, 100)
}

INVENTORY_BOUNDS = {
    'currentStock': (0, 999999),
    'averageDailyDemand': (0, 999999),
    'leadTimeDays': (1, 999),
    'demandVariance': (0, 999999),
    'supplierRiskScore': (0, 100),
    'safetyStock': (0, 999999),
    'reorderPoint': (0, 999999),
    'incomingStockDays': (0, 999),
    'pendingOrderQty': (0, 999999),
    'isCriticalItem': (0, 1)
}

# ===== VALIDATION FUNCTION =====
def validate_features(features: Dict[str, float], bounds: Dict[str, Tuple[float, float]]) -> Tuple[bool, List[str], List[Dict]]:
    """
    Validate features against bounds.
    
    Args:
        features: Dict of feature names to values
        bounds: Dict of feature names to (min, max) tuples
    
    Returns:
        (is_valid, errors, coercions)
    """
    errors = []
    coercions = []
    
    for field, (min_val, max_val) in bounds.items():
        if field not in features:
            errors.append(f"Missing required feature: {field}")
            continue
        
        value = features[field]
        
        # Type check
        try:
            value = float(value)
        except (TypeError, ValueError):
            errors.append(f"{field} is not numeric: {value}")
            continue
        
        # NaN check
        if np.isnan(value):
            logger.warning(f"NaN detected in {field}, converting to 0")
            value = 0.0
            coercions.append({'field': field, 'reason': 'nan_to_zero', 'value': 0.0})
        
        # Range check
        if value < min_val:
            logger.warning(f"{field} below minimum, clamping {value} to {min_val}")
            value = min_val
            coercions.append({'field': field, 'reason': 'clamped_to_min', 'value': min_val})
        elif value > max_val:
            logger.warning(f"{field} above maximum, clamping {value} to {max_val}")
            value = max_val
            coercions.append({'field': field, 'reason': 'clamped_to_max', 'value': max_val})
        
        # Update feature
        features[field] = value
    
    return len(errors) == 0, errors, coercions

def validate_supplier_features(features: Dict[str, float]) -> Tuple[bool, List[str], List[Dict]]:
    return validate_features(features, SUPPLIER_BOUNDS)

def validate_shipment_features(features: Dict[str, float]) -> Tuple[bool, List[str], List[Dict]]:
    return validate_features(features, SHIPMENT_BOUNDS)

def validate_inventory_features(features: Dict[str, float]) -> Tuple[bool, List[str], List[Dict]]:
    return validate_features(features, INVENTORY_BOUNDS)

# ===== ML PREDICTION WITH VALIDATION =====
def predict_supplier_risk(features: Dict[str, float]) -> Dict:
    """Predict supplier risk with full validation."""
    
    # Validate
    valid, errors, coercions = validate_supplier_features(features)
    
    if not valid:
        logger.error(f"Supplier validation failed: {errors}")
        return {
            'error': 'Validation failed',
            'details': errors,
            'fallback_applied': True,
            'risk_score': 50  # Default fallback
        }
    
    # Log coercions
    if coercions:
        logger.info(f"Applied {len(coercions)} coercions", extra={'coercions': coercions})
    
    # Extract features in order (must match model training order)
    feature_array = np.array([
        features['onTimeDeliveryRate'],
        features['financialScore'],
        features['defectRate'],
        features['disputeFrequency'],
        features['geopoliticalRiskFlag'],
        features['totalShipments'],
        features['averageDelayDays'],
        features['daysSinceLastShip'],
        features['activeShipmentCount'],
        features['categoryRisk']
    ]).reshape(1, -1)
    
    # Predict
    risk_score = model.predict(feature_array)[0]
    
    return {
        'risk_score': float(risk_score),
        'valid': True,
        'coercions_applied': len(coercions),
        'model_version': 'supplier-v1.0'
    }
```

---

## 5. Integration: Complete Flow Example

```
User fills Supplier Form (Frontend)
  ↓ [Frontend Validation]
  ✓ All fields valid ranges, no errors → Submit
  ↓
POST /api/suppliers (Backend)
  ↓ [Backend Validation]
  ✓ Fields valid, type-coerced, logged
  ↓ [Data Enrichment]
  - Fetch totalShipments, activeShipmentCount
  - Calculate daysSinceLastShip
  - Map category to categoryRisk
  ↓
Call ML Service (Internal)
  ↓ [ML Validation]
  ✓ 10 features valid, bounds OK, coercions logged
  ↓ [Prediction]
  Risk Score = 18 (Low tier)
  ↓ [Response]
Display Risk Score with Recommendations
```

---

## 6. Data Quality Logging

All validation steps log to data quality service:

```javascript
// Backend logs coercions
logger.dataQuality('supplier.coerced', {
  entity_type: 'supplier',
  entity_id: '507f1f77bcf86cd799439011',
  field: 'onTimeDeliveryRate',
  original: '95.5',
  coerced: 95,
  reason: 'string_to_number'
});

// ML service logs warnings
logger.dataQuality('ml.validation_warning', {
  model: 'supplier-v1.0',
  field: 'disputeFrequency',
  value: 25,
  clamped_to: 20,
  reason: 'exceeds_max'
});
```

---

## 7. Monitoring Dashboard

**Data Quality Metrics**:
- Failed validations / day
- Coercion rate (% of requests requiring conversion)
- Clamping rate (% of requests exceeding bounds)
- ML fallback activation rate

**Alerts**:
- Coercion rate > 5% → Investigate data source
- Clamping rate > 1% → Check input data ranges
- ML errors > 1% → Check ML service health

---

## 8. Deployment Checklist

- [ ] All three layers validate with same rules
- [ ] Error messages are consistent across layers
- [ ] Coercions are logged and monitored
- [ ] ML service has fallback for validation failures
- [ ] Data quality metrics dashboard is configured
- [ ] Tests cover all boundary conditions
- [ ] Documentation is shared with team

