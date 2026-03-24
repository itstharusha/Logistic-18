import mongoose from 'mongoose';

const trackingEventSchema = new mongoose.Schema(
  {
    status:      { type: String, required: true },
    location:    { type: String, default: '' },
    description: { type: String, default: '' },
    timestamp:   { type: Date, default: Date.now },
    source:      { type: String, enum: ['carrier_api', 'manual', 'system'], default: 'system' },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status:          { type: String, required: true },
    changedAt:       { type: Date, default: Date.now },
    changedByName:   { type: String, default: 'System' },
    changedByEmail:  { type: String, default: '' },
    changedByRole:   { type: String, default: '' },
    notes:           { type: String, default: '' },
  },
  { _id: false }
);

const riskHistorySchema = new mongoose.Schema(
  {
    riskScore: { type: Number, required: true },
    riskTier:  { type: String, required: true },
    scoredAt:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Identity
    shipmentNumber: { type: String, required: true, trim: true },
    trackingNumber: { type: String, trim: true, default: '' },
    description:    { type: String, trim: true, default: '' },

    // Carrier
    carrier: {
      type: String,
      enum: ['FedEx', 'UPS', 'DHL', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['standard', 'express', 'overnight'],
      default: 'standard',
    },

    // Linked supplier (optional)
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null,
    },

    // Locations
    originCity:        { type: String, trim: true, default: '' },
    originCountry:     { type: String, trim: true, default: '' },
    destinationCity:   { type: String, trim: true, default: '' },
    destinationCountry: { type: String, trim: true, default: '' },

    // Timing
    estimatedDelivery: { type: Date, required: true },
    actualDelivery:    { type: Date, default: null },

    // Physical attributes
    weight:            { type: Number, min: 0, default: 0 },

    // State machine
    // Registered → In Transit → Delayed | Rerouted → Delivered → Closed
    status: {
      type: String,
      enum: ['registered', 'in_transit', 'delayed', 'rerouted', 'delivered', 'closed'],
      default: 'registered',
    },

    // Delay tracking
    delayHours:    { type: Number, default: 0 },
    delaySeverity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical', null],
      default: null,
    },

    // Environmental risk inputs
    weatherLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    originGeoRisk: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },
    destinationGeoRisk: {
      type: Number,
      enum: [0, 1],
      default: 0,
    },

    // Computed risk
    riskScore:    { type: Number, default: 0 },
    riskTier:     { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
    lastScoredAt: { type: Date, default: Date.now },

    // History arrays
    trackingEvents:  [trackingEventSchema],
    statusHistory:   [statusHistorySchema],
    riskHistory:     [riskHistorySchema],

    // Polling
    lastPolledAt: { type: Date, default: null },

    // Optimistic locking
    version: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'shipments' }
);

shipmentSchema.index({ orgId: 1, status: 1 });
shipmentSchema.index({ orgId: 1, riskTier: 1 });
shipmentSchema.index({ orgId: 1, createdAt: -1 });
shipmentSchema.index({ orgId: 1, shipmentNumber: 1 }, { unique: true });

export default mongoose.model('Shipment', shipmentSchema);
