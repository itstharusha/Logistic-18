/**
 * Alert.js — Mongoose Schema & Model: alerts Collection
 *
 * Responsibility:
 *   Defines the structure for risk alert documents raised by the system
 *   when a supplier, shipment, or inventory item crosses a risk threshold.
 *
 *   Alerts belong to an organisation (multi-tenant) and are linked to the
 *   specific entity that triggered them (supplier, shipment, or inventory item).
 *
 *   Lifecycle states: open → acknowledged → resolved | escalated
 *
 *   The cooldownExpiresAt field prevents duplicate alerts from being raised
 *   for the same entity within a configurable cooldown window.
 */

import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    // Organisation that owns this alert (multi-tenant isolation)
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true, // Indexed for fast org-scoped queries
    },

    // What kind of entity triggered this alert
    entityType: {
      type: String,
      enum: ['supplier', 'shipment', 'inventory'],
      required: true,
    },

    // The MongoDB _id of the triggering entity (supplier, shipment, or inventory item)
    entityId: {
      type: String,  // Allow both string IDs and ObjectId references
      required: true,
    },

    // The name/number of the triggering entity (e.g., supplier name, tracking number)
    entityName: {
      type: String,
      required: false,
    },

    // How critical is this alert
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // Short human-readable title shown in the alerts list
    title: {
      type: String,
      required: true,
    },

    // Detailed explanation of what triggered the alert
    description: String,

    // What the analyst should do to address this risk
    mitigationRecommendation: String,

    // Which user (analyst/operator) this alert is assigned to
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Current workflow state of the alert
    // open → acknowledged (user has seen it)
    // open | acknowledged → resolved (user has addressed it)
    // open | acknowledged → escalated (SLA breached, escalated to management)
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved', 'escalated'],
      default: 'open',
    },

    // Who acknowledged this alert and when
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date,

    // Who resolved this alert
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolutionNote: String,

    // When the alert was first escalated (for SLA tracking)
    escalatedAt: Date,

    // How many times this alert has been escalated
    escalationCount: { type: Number, default: 0 },

    // Full audit trail of every escalation event
    escalationHistory: [
      {
        escalatedAt: { type: Date, default: Date.now },
        reason: { type: String, default: '' },
        slaExceeded: { type: Boolean, default: true },
        _id: false,
      },
    ],

    // Anti-spam: prevents a duplicate alert for the same entity
    // before this deadline expires
    cooldownExpiresAt: Date,

    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'alerts' }
);

// Compound index for the most common query pattern:
// "list all open alerts for this org filtered by entity type"
alertSchema.index({ orgId: 1, entityType: 1, status: 1 });

export default mongoose.model('Alert', alertSchema);
