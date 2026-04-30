/**
 * ML Validation Middleware
 * Validates data before sending to ML service
 * Ensures all required features are present, properly typed, and within valid ranges
 */

/**
 * Validate supplier data for ML prediction
 * Required fields: 10 ML features
 */
export const validateSupplierForML = (req, res, next) => {
  const supplier = req.body;
  const errors = [];

  // Required numeric fields for supplier model
  const requiredFields = [
    { name: 'onTimeDeliveryRate', min: 0, max: 100 },
    { name: 'financialScore', min: 0, max: 100 },
    { name: 'defectRate', min: 0, max: 100 },
    { name: 'disputeFrequency', min: 0, max: 20 },
    { name: 'geopoliticalRiskFlag', min: 0, max: 1 },
    { name: 'totalShipments', min: 0, max: 999999 },
    { name: 'averageDelayDays', min: 0, max: 999 },
    { name: 'daysSinceLastShip', min: 0, max: 999999 },
    { name: 'activeShipmentCount', min: 0, max: 999999 },
    { name: 'categoryRisk', min: 0, max: 3 },
  ];

  requiredFields.forEach((field) => {
    const value = supplier[field.name];
    
    // Check presence
    if (value === undefined || value === null) {
      errors.push(`Missing required field: ${field.name}`);
      return;
    }

    // Convert to number
    const numValue = Number(value);
    
    // Check if valid number
    if (isNaN(numValue) || !isFinite(numValue)) {
      errors.push(`${field.name}: invalid numeric value "${value}" (NaN or Infinity)`);
      return;
    }

    // Check range
    if (numValue < field.min || numValue > field.max) {
      errors.push(`${field.name}: value ${numValue} out of range [${field.min}, ${field.max}]`);
    }
  });

  if (errors.length > 0) {
    console.warn(`[MLValidation] Supplier validation failed:`, errors);
    return res.status(400).json({
      error: 'Supplier data validation failed for ML prediction',
      details: errors,
    });
  }

  next();
};

/**
 * Validate shipment data for ML prediction
 * Required fields: 10 ML features
 */
export const validateShipmentForML = (req, res, next) => {
  const shipment = req.body;
  const errors = [];

  // Required numeric fields for shipment model
  const requiredFields = [
    { name: 'etaDeviationHours', min: 0, max: 9999 },
    { name: 'weatherLevel', min: 0, max: 2 },
    { name: 'routeRiskIndex', min: 0, max: 100 },
    { name: 'carrierReliability', min: 0, max: 100 },
    { name: 'trackingGapHours', min: 0, max: 9999 },
    { name: 'shipmentValueUSD', min: 0, max: 9999999 },
    { name: 'daysInTransit', min: 0, max: 365 },
    { name: 'supplierRiskScore', min: 0, max: 100 },
    { name: 'isInternational', min: 0, max: 1 },
    { name: 'carrierDelayRate', min: 0, max: 100 },
  ];

  requiredFields.forEach((field) => {
    const value = shipment[field.name];
    
    // Check presence
    if (value === undefined || value === null) {
      errors.push(`Missing required field: ${field.name}`);
      return;
    }

    // Convert to number
    const numValue = Number(value);
    
    // Check if valid number
    if (isNaN(numValue) || !isFinite(numValue)) {
      errors.push(`${field.name}: invalid numeric value "${value}" (NaN or Infinity)`);
      return;
    }

    // Check range
    if (numValue < field.min || numValue > field.max) {
      errors.push(`${field.name}: value ${numValue} out of range [${field.min}, ${field.max}]`);
    }
  });

  if (errors.length > 0) {
    console.warn(`[MLValidation] Shipment validation failed:`, errors);
    return res.status(400).json({
      error: 'Shipment data validation failed for ML prediction',
      details: errors,
    });
  }

  next();
};

/**
 * Validate inventory data for ML prediction
 * Required fields: 10 ML features
 */
export const validateInventoryForML = (req, res, next) => {
  const inventory = req.body;
  const errors = [];

  // Required numeric fields for inventory model
  const requiredFields = [
    { name: 'currentStock', min: 0, max: 999999 },
    { name: 'averageDailyDemand', min: 0, max: 999999 },
    { name: 'leadTimeDays', min: 1, max: 999 },
    { name: 'demandVariance', min: 0, max: 999999 },
    { name: 'supplierRiskScore', min: 0, max: 100 },
    { name: 'safetyStock', min: 0, max: 999999 },
    { name: 'reorderPoint', min: 0, max: 999999 },
    { name: 'incomingStockDays', min: 0, max: 999 },
    { name: 'pendingOrderQty', min: 0, max: 999999 },
    { name: 'isCriticalItem', min: 0, max: 1 },
  ];

  requiredFields.forEach((field) => {
    const value = inventory[field.name];
    
    // Check presence
    if (value === undefined || value === null) {
      errors.push(`Missing required field: ${field.name}`);
      return;
    }

    // Convert to number
    const numValue = Number(value);
    
    // Check if valid number
    if (isNaN(numValue) || !isFinite(numValue)) {
      errors.push(`${field.name}: invalid numeric value "${value}" (NaN or Infinity)`);
      return;
    }

    // Check range
    if (numValue < field.min || numValue > field.max) {
      errors.push(`${field.name}: value ${numValue} out of range [${field.min}, ${field.max}]`);
    }
  });

  if (errors.length > 0) {
    console.warn(`[MLValidation] Inventory validation failed:`, errors);
    return res.status(400).json({
      error: 'Inventory data validation failed for ML prediction',
      details: errors,
    });
  }

  next();
};

/**
 * Utility: Check if all values in an object are finite numbers
 */
export const hasFiniteNumericValues = (obj) => {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue; // Skip internal fields
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      console.warn(`[MLValidation] Non-finite value in ${key}: ${value}`);
      return false;
    }
  }
  return true;
};

/**
 * Utility: Sanitize object to ensure all values are finite numbers
 */
export const sanitizeForML = (obj) => {
  const sanitized = { ...obj };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (key.startsWith('_')) continue; // Skip internal fields
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) {
      console.warn(`[MLValidation] Sanitized ${key}: ${value} → 0`);
      sanitized[key] = 0;
    } else {
      sanitized[key] = num;
    }
  }
  
  return sanitized;
};
