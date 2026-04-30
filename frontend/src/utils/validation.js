/**
 * Frontend Validation Utilities
 * Validates form data before submission to prevent garbage data in ML pipeline
 */

/**
 * Validate inventory form data
 * @param {Object} data - Form data object
 * @returns {Object} { isValid: boolean, errors: { fieldName: "error message" } }
 */
export const validateInventoryForm = (data) => {
  const errors = {};

  // Required fields
  if (!data.sku || data.sku.trim() === '') {
    errors.sku = 'SKU is required';
  }
  if (!data.productName || data.productName.trim() === '') {
    errors.productName = 'Product name is required';
  }
  if (!data.warehouseId || data.warehouseId === '') {
    errors.warehouseId = 'Warehouse is required';
  }

  // Numeric ranges
  const currentStock = Number(data.currentStock);
  if (isNaN(currentStock) || currentStock < 0) {
    errors.currentStock = 'Current stock must be a non-negative number';
  }

  const avgDemand = Number(data.averageDailyDemand);
  if (isNaN(avgDemand) || avgDemand < 0) {
    errors.averageDailyDemand = 'Average daily demand must be non-negative';
  }

  const leadTime = Number(data.leadTimeDays);
  if (isNaN(leadTime) || leadTime < 1) {
    errors.leadTimeDays = 'Lead time must be at least 1 day';
  }

  const variance = Number(data.demandVariance);
  if (isNaN(variance) || variance < 0) {
    errors.demandVariance = 'Demand variance must be non-negative';
  }

  const safetyStock = Number(data.safetyStock);
  if (isNaN(safetyStock) || safetyStock < 0) {
    errors.safetyStock = 'Safety stock must be non-negative';
  }

  const reorderPoint = Number(data.reorderPoint);
  if (isNaN(reorderPoint) || reorderPoint < 0) {
    errors.reorderPoint = 'Reorder point must be non-negative';
  }

  // Critical: Safety stock should not exceed reorder point (logical check)
  if (safetyStock > reorderPoint && reorderPoint > 0) {
    errors.safetyStock = 'Safety stock cannot exceed reorder point';
  }

  const pendingQty = Number(data.pendingOrderQty);
  if (isNaN(pendingQty) || pendingQty < 0) {
    errors.pendingOrderQty = 'Pending order quantity must be non-negative';
  }

  const incomingDays = Number(data.incomingStockDays);
  if (isNaN(incomingDays) || incomingDays < 0) {
    errors.incomingStockDays = 'Incoming stock days must be non-negative';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate shipment form data
 * @param {Object} data - Form data object
 * @returns {Object} { isValid: boolean, errors: { fieldName: "error message" } }
 */
export const validateShipmentForm = (data) => {
  const errors = {};

  // Required fields
  if (!data.carrier || data.carrier === '') {
    errors.carrier = 'Carrier is required';
  }
  if (!data.estimatedDelivery || data.estimatedDelivery === '') {
    errors.estimatedDelivery = 'Estimated delivery date is required';
  }

  // Weight validation
  const weight = Number(data.weight);
  if (data.weight !== '' && (isNaN(weight) || weight <= 0)) {
    errors.weight = 'Weight must be a positive number';
  }

  // Shipment value validation - REQUIRED and must be > 0
  const value = Number(data.shipmentValueUSD);
  if (isNaN(value) || value <= 0) {
    errors.shipmentValueUSD = 'Shipment value must be greater than 0';
  }

  // Cross-field validation: Origin and destination must differ
  if (
    data.originCountry &&
    data.destinationCountry &&
    data.originCountry.trim() !== '' &&
    data.destinationCountry.trim() !== '' &&
    data.originCountry.trim().toLowerCase() === data.destinationCountry.trim().toLowerCase()
  ) {
    errors.destinationCountry = 'Destination country must differ from origin country';
  }

  // Geopolitical risk flags must be 0 or 1
  const originGeoRisk = Number(data.originGeoRisk);
  if (isNaN(originGeoRisk) || ![0, 1].includes(originGeoRisk)) {
    errors.originGeoRisk = 'Origin geopolitical risk must be 0 or 1';
  }

  const destGeoRisk = Number(data.destinationGeoRisk);
  if (isNaN(destGeoRisk) || ![0, 1].includes(destGeoRisk)) {
    errors.destinationGeoRisk = 'Destination geopolitical risk must be 0 or 1';
  }

  // Weather level validation
  if (!['low', 'medium', 'high'].includes(data.weatherLevel)) {
    errors.weatherLevel = 'Weather level must be low, medium, or high';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate supplier form data
 * @param {Object} data - Form data object
 * @returns {Object} { isValid: boolean, errors: { fieldName: "error message" } }
 */
export const validateSupplierForm = (data) => {
  const errors = {};

  // Required fields
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Supplier name is required';
  }

  // Percentage fields (0-100)
  const onTimeRate = Number(data.onTimeDeliveryRate);
  if (data.onTimeDeliveryRate !== '' && (isNaN(onTimeRate) || onTimeRate < 0 || onTimeRate > 100)) {
    errors.onTimeDeliveryRate = 'On-time delivery rate must be between 0 and 100';
  }

  const defectRate = Number(data.defectRate);
  if (data.defectRate !== '' && (isNaN(defectRate) || defectRate < 0 || defectRate > 100)) {
    errors.defectRate = 'Defect rate must be between 0 and 100';
  }

  const financialScore = Number(data.financialScore);
  if (data.financialScore !== '' && (isNaN(financialScore) || financialScore < 0 || financialScore > 100)) {
    errors.financialScore = 'Financial score must be between 0 and 100';
  }

  // Non-negative fields
  const avgDelayDays = Number(data.avgDelayDays);
  if (data.avgDelayDays !== '' && (isNaN(avgDelayDays) || avgDelayDays < 0)) {
    errors.avgDelayDays = 'Average delay days must be non-negative';
  }

  const yearsInBusiness = Number(data.yearsInBusiness);
  if (data.yearsInBusiness !== '' && (isNaN(yearsInBusiness) || yearsInBusiness < 0)) {
    errors.yearsInBusiness = 'Years in business must be non-negative';
  }

  const contractValue = Number(data.contractValue);
  if (data.contractValue !== '' && (isNaN(contractValue) || contractValue < 0)) {
    errors.contractValue = 'Contract value must be non-negative';
  }

  const disputeFrequency = Number(data.disputeFrequency);
  if (data.disputeFrequency !== '' && (isNaN(disputeFrequency) || disputeFrequency < 0 || disputeFrequency > 20)) {
    errors.disputeFrequency = 'Dispute frequency must be between 0 and 20';
  }

  // Geopolitical flag
  const geoFlag = Number(data.geopoliticalRiskFlag);
  if (isNaN(geoFlag) || ![0, 1].includes(geoFlag)) {
    errors.geopoliticalRiskFlag = 'Geopolitical risk flag must be 0 or 1';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Format validation errors for display
 * @param {Object} errors - Errors object from validation functions
 * @returns {String} Formatted error message
 */
export const formatValidationErrors = (errors) => {
  const errorList = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('\n');
  return errorList;
};

/**
 * Coerce numeric form values to proper types
 * Used by backend to ensure consistent types
 * @param {Object} data - Form data
 * @param {Array<string>} numericFields - Field names to coerce
 * @returns {Object} Coerced data
 */
export const coerceNumericFields = (data, numericFields) => {
  const coerced = { ...data };
  numericFields.forEach((field) => {
    if (field in coerced) {
      coerced[field] = Number(coerced[field]) || 0;
    }
  });
  return coerced;
};
