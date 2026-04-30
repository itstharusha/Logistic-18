/**
 * Backend Type Coercion & Validation
 * Ensures data integrity before ML processing
 * Tracks all coercions for data quality monitoring
 */

import { getDataQualityService } from '../services/DataQualityService.js';

/**
 * Coerce and validate inventory data
 * @param {Object} data - Raw data from request
 * @param {String} entityId - Optional entity ID for tracking purposes
 * @returns {Object} { isValid: boolean, data: coercedData, errors: [] }
 */
export const coerceInventoryData = (data, entityId = null) => {
  const errors = [];
  const coerced = {};
  const dqService = getDataQualityService();

  // String fields (trim and validate)
  const stringFields = ['sku', 'productName', 'supplierId', 'warehouseId'];
  stringFields.forEach(field => {
    if (data[field] !== undefined) {
      coerced[field] = String(data[field]).trim();
    }
  });

  // Numeric fields with bounds
  const numericFields = {
    currentStock: { min: 0, max: 999999 },
    averageDailyDemand: { min: 0, max: 999999 },
    leadTimeDays: { min: 1, max: 999 },
    demandVariance: { min: 0, max: 999999 },
    safetyStock: { min: 0, max: 999999 },
    reorderPoint: { min: 0, max: 999999 },
    pendingOrderQty: { min: 0, max: 999999 },
    incomingStockDays: { min: 0, max: 999 },
  };

  Object.entries(numericFields).forEach(([field, bounds]) => {
    if (data[field] !== undefined) {
      const num = Number(data[field]);
      if (isNaN(num)) {
        const coercedValue = bounds.min;
        coerced[field] = coercedValue;
        errors.push(`${field}: invalid number, using min value ${bounds.min}`);
        // Track the coercion
        dqService.recordCoercion('inventory', entityId || 'unknown', field, data[field], coercedValue, 'NaN → bounds.min');
      } else {
        const clampedValue = Math.max(bounds.min, Math.min(num, bounds.max));
        coerced[field] = clampedValue;
        if (num !== clampedValue) {
          errors.push(`${field}: clamped to range [${bounds.min}, ${bounds.max}]`);
          // Track the coercion
          dqService.recordCoercion('inventory', entityId || 'unknown', field, num, clampedValue, `out of range [${bounds.min}, ${bounds.max}]`);
        }
      }
    }
  });

  // Boolean fields
  if (data.isCriticalItem !== undefined) {
    coerced.isCriticalItem = Boolean(data.isCriticalItem);
  }

  return {
    isValid: errors.length === 0,
    data: coerced,
    errors,
  };
};

/**
 * Coerce and validate shipment data
 * @param {Object} data - Raw data from request
 * @returns {Object} { isValid: boolean, data: coercedData, errors: [] }
 */
export const coerceShipmentData = (data) => {
  const errors = [];
  const coerced = {};

  // String fields
  const stringFields = ['trackingNumber', 'description', 'originCity', 'originCountry', 
                        'destinationCity', 'destinationCountry', 'supplierId'];
  stringFields.forEach(field => {
    if (data[field] !== undefined) {
      coerced[field] = String(data[field]).trim();
    }
  });

  // Enum fields
  if (data.carrier) {
    const validCarriers = ['FedEx', 'UPS', 'DHL', 'Other'];
    coerced.carrier = validCarriers.includes(data.carrier) ? data.carrier : 'Other';
    if (!validCarriers.includes(data.carrier)) {
      errors.push(`carrier: invalid value "${data.carrier}", using "Other"`);
    }
  }

  if (data.priority) {
    const validPriorities = ['standard', 'express', 'overnight'];
    coerced.priority = validPriorities.includes(data.priority) ? data.priority : 'standard';
    if (!validPriorities.includes(data.priority)) {
      errors.push(`priority: invalid value "${data.priority}", using "standard"`);
    }
  }

  if (data.weatherLevel) {
    const validWeather = ['low', 'medium', 'high'];
    coerced.weatherLevel = validWeather.includes(data.weatherLevel) ? data.weatherLevel : 'low';
    if (!validWeather.includes(data.weatherLevel)) {
      errors.push(`weatherLevel: invalid value "${data.weatherLevel}", using "low"`);
    }
  }

  // Numeric fields with bounds
  const numericFields = {
    weight: { min: 0, max: 999999 },
    shipmentValueUSD: { min: 0, max: 9999999 },
    originGeoRisk: { min: 0, max: 1 },
    destinationGeoRisk: { min: 0, max: 1 },
  };

  Object.entries(numericFields).forEach(([field, bounds]) => {
    if (data[field] !== undefined) {
      const num = Number(data[field]);
      if (isNaN(num)) {
        coerced[field] = bounds.min;
        errors.push(`${field}: invalid number, using min value ${bounds.min}`);
      } else {
        coerced[field] = Math.max(bounds.min, Math.min(num, bounds.max));
        if (num < bounds.min || num > bounds.max) {
          errors.push(`${field}: clamped to range [${bounds.min}, ${bounds.max}]`);
        }
      }
    }
  });

  // Date field
  if (data.estimatedDelivery) {
    try {
      const date = new Date(data.estimatedDelivery);
      if (isNaN(date.getTime())) {
        errors.push('estimatedDelivery: invalid date format');
      } else {
        coerced.estimatedDelivery = date;
      }
    } catch (e) {
      errors.push('estimatedDelivery: could not parse date');
    }
  }

  return {
    isValid: errors.length === 0,
    data: coerced,
    errors,
  };
};

/**
 * Coerce and validate supplier data
 * @param {Object} data - Raw data from request
 * @returns {Object} { isValid: boolean, data: coercedData, errors: [] }
 */
export const coerceSupplierData = (data) => {
  const errors = [];
  const coerced = {};

  // String fields
  const stringFields = ['name', 'contactEmail', 'contactPhone', 'country'];
  stringFields.forEach(field => {
    if (data[field] !== undefined) {
      coerced[field] = String(data[field]).trim();
    }
  });

  // Enum: category
  if (data.category) {
    const validCategories = ['raw_materials', 'components', 'finished_goods', 'services'];
    coerced.category = validCategories.includes(data.category) ? data.category : 'raw_materials';
    if (!validCategories.includes(data.category)) {
      errors.push(`category: invalid value "${data.category}", using "raw_materials"`);
    }
  }

  // Enum: weatherLevel
  if (data.weatherLevel) {
    const validWeather = ['low', 'medium', 'high'];
    coerced.weatherLevel = validWeather.includes(data.weatherLevel) ? data.weatherLevel : 'low';
    if (!validWeather.includes(data.weatherLevel)) {
      errors.push(`weatherLevel: invalid value "${data.weatherLevel}", using "low"`);
    }
  }

  // Percentage fields (0-100)
  const percentFields = ['onTimeDeliveryRate', 'financialScore', 'defectRate'];
  percentFields.forEach(field => {
    if (data[field] !== undefined) {
      const num = Number(data[field]);
      if (isNaN(num)) {
        coerced[field] = 0;
        errors.push(`${field}: invalid number, using 0`);
      } else {
        coerced[field] = Math.max(0, Math.min(num, 100));
        if (num < 0 || num > 100) {
          errors.push(`${field}: clamped to range [0, 100]`);
        }
      }
    }
  });

  // Other numeric fields
  const numericFields = {
    avgDelayDays: { min: 0, max: 999 },
    yearsInBusiness: { min: 0, max: 150 },
    contractValue: { min: 0, max: 999999999 },
    disputeFrequency: { min: 0, max: 20 },
    geopoliticalRiskFlag: { min: 0, max: 1 },
  };

  Object.entries(numericFields).forEach(([field, bounds]) => {
    if (data[field] !== undefined) {
      const num = Number(data[field]);
      if (isNaN(num)) {
        coerced[field] = bounds.min;
        errors.push(`${field}: invalid number, using min value ${bounds.min}`);
      } else {
        coerced[field] = Math.max(bounds.min, Math.min(num, bounds.max));
        if (num < bounds.min || num > bounds.max) {
          errors.push(`${field}: clamped to range [${bounds.min}, ${bounds.max}]`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    data: coerced,
    errors,
  };
};

/**
 * Log coercion warnings for monitoring data quality
 * @param {Array} errors - Array of coercion errors/warnings
 * @param {String} entityType - Type of entity (inventory, shipment, supplier)
 * @param {String} entityId - ID of entity if updating
 */
export const logCoercionWarnings = (errors, entityType, entityId = null) => {
  if (errors.length > 0) {
    const idStr = entityId ? ` [${entityId}]` : '';
    console.warn(`[DataCoercion] ${entityType}${idStr}: ${errors.join('; ')}`);
  }
};
