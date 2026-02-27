import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['supplier', 'shipment', 'inventory'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    mitigationRecommendation: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved', 'escalated'],
      default: 'open',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    resolutionNote: String,
    escalatedAt: Date,
    cooldownExpiresAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'alerts' }
);

// Index for multi-tenant queries
alertSchema.index({ orgId: 1, entityType: 1, status: 1 });

export default mongoose.model('Alert', alertSchema);
