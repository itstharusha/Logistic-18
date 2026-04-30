import mongoose from 'mongoose';

const riskHistorySchema = new mongoose.Schema(
  {
    riskScore: { type: Number, required: true },
    riskTier: { type: String, required: true },
    scoredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const overrideHistorySchema = new mongoose.Schema(
  {
    analystId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    analystName:  { type: String },
    analystEmail: { type: String },
    analystRole:  { type: String },
    oldScore:     { type: Number },
    newScore:     { type: Number },
    oldTier:      { type: String },
    newTier:      { type: String },
    justification: { type: String, required: true },
    overriddenAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const metricsAdjustmentSchema = new mongoose.Schema(
  {
    adjustedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adjustedByName:  { type: String },
    adjustedByEmail: { type: String },
    adjustedByRole:  { type: String },
    source:    { type: String, enum: ['manual', 'auto_shipment'], default: 'manual' },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
    reason: { type: String, required: true },
    changes: {
      onTimeDeliveryRate: { old: Number, new: Number },
      defectRate:         { old: Number, new: Number },
      disputeFrequency:   { old: Number, new: Number },
      avgDelayDays:       { old: Number, new: Number },
      financialScore:     { old: Number, new: Number },
      yearsInBusiness:    { old: Number, new: Number },
      contractValue:      { old: Number, new: Number },
    },
    adjustedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supplierSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },

    // Identity
    name: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    country: { type: String, trim: true },
    category: {
      type: String,
      enum: ['raw_materials', 'components', 'finished_goods', 'services'],
      default: 'raw_materials',
    },

    // Risk inputs (ML-ready features)
    weatherLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    onTimeDeliveryRate: { type: Number, min: 0, max: 100, default: 80 },
    avgDelayDays: { type: Number, min: 0, default: 0 },
    defectRate: { type: Number, min: 0, max: 100, default: 0 },
    financialScore: { type: Number, min: 0, max: 100, default: 70 },
    yearsInBusiness: { type: Number, min: 0, default: 5 },
    contractValue: { type: Number, min: 0, default: 0 },
    geopoliticalRiskFlag: { type: Number, enum: [0, 1], default: 0 }, // 0=stable, 1=at-risk country
    disputeFrequency: { type: Number, min: 0, max: 20, default: 0 }, // disputes per period

    // Computed risk
    riskScore: { type: Number, default: 0 },
    riskTier: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    riskExplanation: { type: String, default: '' },
    shapValues: [
      {
        feature: String,
        value: Number,
        impact: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      },
    ],
    modelVersion: { type: String, default: '1.0' },
    lastScoredAt: { type: Date },

    // Status
    status: {
      type: String,
      enum: ['active', 'under_watch', 'high_risk', 'suspended'],
      default: 'active',
    },

    // History
    riskHistory: [riskHistorySchema],
    overrideHistory: [overrideHistorySchema],
    metricsAdjustmentHistory: [metricsAdjustmentSchema],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'suppliers' }
);

supplierSchema.index({ orgId: 1, status: 1 });
supplierSchema.index({ orgId: 1, riskTier: 1 });

export default mongoose.model('Supplier', supplierSchema);
