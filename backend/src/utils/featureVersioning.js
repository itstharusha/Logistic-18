/**
 * Feature Version Tracking
 * Enables reproducibility by recording which features and model version were used in predictions
 */

/**
 * ML Model Feature Versions
 * Each version represents a snapshot of what features the model expects
 * Updated when features are added, removed, or renamed
 */
export const ML_FEATURE_VERSIONS = {
  SUPPLIER: {
    '1.0': {
      features: [
        'onTimeDeliveryRate',
        'financialScore',
        'defectRate',
        'disputeFrequency',
        'geopoliticalRiskFlag',
        'totalShipments',
        'averageDelayDays',
        'daysSinceLastShip',
        'activeShipmentCount',
        'categoryRisk',
      ],
      description: 'Initial supplier feature schema',
      createdAt: new Date('2024-01-01'),
    },
  },
  SHIPMENT: {
    '1.0': {
      features: [
        'etaDeviationHours',
        'weatherLevel',
        'routeRiskIndex',
        'carrierReliability',
        'trackingGapHours',
        'shipmentValueUSD',
        'daysInTransit',
        'supplierRiskScore',
        'isInternational',
        'carrierDelayRate',
      ],
      description: 'Initial shipment feature schema',
      createdAt: new Date('2024-01-01'),
    },
  },
  INVENTORY: {
    '1.0': {
      features: [
        'currentStock',
        'averageDailyDemand',
        'leadTimeDays',
        'demandVariance',
        'supplierRiskScore',
        'safetyStock',
        'reorderPoint',
        'incomingStockDays',
        'pendingOrderQty',
        'isCriticalItem',
      ],
      description: 'Initial inventory feature schema',
      createdAt: new Date('2024-01-01'),
    },
  },
};

/**
 * Generate a feature version key for prediction tracking
 * Format: "supplier-v1.0" or "shipment-v1.0"
 */
export const generateFeatureVersion = (entityType, version = '1.0') => {
  return `${entityType.toLowerCase()}-v${version}`;
};

/**
 * Get current model version for an entity type
 */
export const getCurrentFeatureVersion = (entityType) => {
  const type = entityType.toUpperCase();
  if (!ML_FEATURE_VERSIONS[type]) {
    throw new Error(`Unknown entity type for feature versioning: ${entityType}`);
  }
  
  const versions = ML_FEATURE_VERSIONS[type];
  const latestVersion = Object.keys(versions).sort().reverse()[0];
  return latestVersion;
};

/**
 * Create a feature snapshot for audit trail
 * Records what was sent to ML service
 */
export const createFeatureSnapshot = (entityType, data, version = '1.0') => {
  const expectedFeatures = ML_FEATURE_VERSIONS[entityType.toUpperCase()][version].features;
  
  const snapshot = {
    featureVersion: generateFeatureVersion(entityType, version),
    timestamp: new Date(),
    featureCount: expectedFeatures.length,
    features: {},
  };

  // Record only expected features
  expectedFeatures.forEach(feature => {
    snapshot.features[feature] = data[feature] ?? null;
  });

  // Hash for integrity verification
  snapshot.hash = generateFeatureHash(snapshot.features);

  return snapshot;
};

/**
 * Generate hash of feature set for integrity verification
 * Detects if feature values changed unexpectedly
 */
export const generateFeatureHash = (features) => {
  // Simple string representation for now (can upgrade to crypto.subtle in Node 18+)
  const featureString = JSON.stringify(features);
  let hash = 0;
  
  for (let i = 0; i < featureString.length; i++) {
    const char = featureString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * Validate that data has all required features for a given version
 */
export const validateFeatureSchema = (entityType, data, version = '1.0') => {
  const expectedFeatures = ML_FEATURE_VERSIONS[entityType.toUpperCase()][version].features;
  const missingFeatures = expectedFeatures.filter(f => data[f] === undefined || data[f] === null);
  
  return {
    isValid: missingFeatures.length === 0,
    missingFeatures,
    expectedCount: expectedFeatures.length,
    actualCount: expectedFeatures.filter(f => data[f] !== undefined && data[f] !== null).length,
  };
};

/**
 * Create metadata object for prediction tracking
 */
export const createPredictionMetadata = (entityType, data, version = '1.0') => {
  const validation = validateFeatureSchema(entityType, data, version);
  const snapshot = createFeatureSnapshot(entityType, data, version);
  
  return {
    featureVersion: generateFeatureVersion(entityType, version),
    timestamp: new Date(),
    validation,
    snapshot,
  };
};
