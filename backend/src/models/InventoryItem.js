import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: false,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    averageDailyDemand: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    leadTimeDays: {
      type: Number,
      required: true,
      min: 0,
      default: 7,
    },
    demandVariance: {
      type: Number,
      default: 0,
      min: 0,
    },
    safetyStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: 0,
    },
    incomingStockDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingOrderQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCriticalItem: {
      type: Boolean,
      default: false,
    },
    supplierRiskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    // ML prediction results
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    riskTier: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskExplanation: {
      type: String,
      default: '',
    },
    modelVersion: {
      type: String,
      default: '1.0',
    },
    // Demand forecast fields
    forecastDemand30: {
      type: Number,
      default: 0,
    },
    forecastDemand60: {
      type: Number,
      default: 0,
    },
    forecastDemand90: {
      type: Number,
      default: 0,
    },
    // SHAP values for explainability
    shapValues: [
      {
        feature: String,
        value: Number,
        impact: Number,
      },
    ],
    lastScoredAt: Date,
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'inventory_items' }
);

// Compound index for SKU uniqueness per organization and warehouse
inventoryItemSchema.index({ orgId: 1, sku: 1, warehouseId: 1 }, { unique: true });

// Index for multi-tenant queries
inventoryItemSchema.index({ orgId: 1, riskTier: 1 });
inventoryItemSchema.index({ orgId: 1, warehouseId: 1 });
inventoryItemSchema.index({ orgId: 1, supplierId: 1 });
inventoryItemSchema.index({ orgId: 1, isCriticalItem: 1 });

// Pre-save middleware to calculate safety stock and reorder point
inventoryItemSchema.pre('save', function (next) {
  // Calculate safety stock: Z-score (1.65 for 95%) * sqrt(leadTime) * demandVariance
  // Simplified formula: safetyStock = 1.65 * sqrt(leadTimeDays) * sqrt(demandVariance)
  const zScore = 1.65; // 95% service level
  this.safetyStock = Math.ceil(
    zScore * Math.sqrt(this.leadTimeDays) * Math.sqrt(this.demandVariance || this.averageDailyDemand * 0.2)
  );

  // Calculate reorder point: (averageDailyDemand * leadTimeDays) + safetyStock
  this.reorderPoint = Math.ceil(
    this.averageDailyDemand * this.leadTimeDays + this.safetyStock
  );

  // Calculate demand forecasts
  this.forecastDemand30 = Math.ceil(this.averageDailyDemand * 30);
  this.forecastDemand60 = Math.ceil(this.averageDailyDemand * 60);
  this.forecastDemand90 = Math.ceil(this.averageDailyDemand * 90);

  this.updatedAt = new Date();
  next();
});

// Method to calculate risk tier from score
inventoryItemSchema.methods.calculateRiskTier = function () {
  if (this.riskScore <= 30) return 'low';
  if (this.riskScore <= 60) return 'medium';
  if (this.riskScore <= 80) return 'high';
  return 'critical';
};

// Method to check if reorder is needed
inventoryItemSchema.methods.needsReorder = function () {
  return this.currentStock <= this.reorderPoint;
};

// Method to get days until stockout
inventoryItemSchema.methods.getDaysUntilStockout = function () {
  if (this.averageDailyDemand === 0) return Infinity;
  return Math.floor(this.currentStock / this.averageDailyDemand);
};

// Static method to get risk tier label
inventoryItemSchema.statics.getRiskTierFromScore = function (score) {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
};

export default mongoose.model('InventoryItem', inventoryItemSchema);
