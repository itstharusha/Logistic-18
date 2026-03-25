/**
 * Organisation.js — Mongoose Schema & Model: organisations Collection
 *
 * Responsibility:
 *   Defines the tenant (organisation) document that all other data is scoped to.
 *   Every user, supplier, shipment, alert, and audit log references an orgId
 *   that points to a document in this collection.
 *
 *   Also stores:
 *   - Plan tier (for future feature gating)
 *   - System-wide alert SLA and cooldown settings used by the alert engine
 *   - Carrier API keys (FedEx, UPS, DHL) per organisation
 */

import mongoose from 'mongoose';

const organisationSchema = new mongoose.Schema(
  {
    // Display name of the organisation  (e.g. "Acme Logistics Ltd")
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Industry sector — used for contextual risk scoring in future
    industry: { type: String, trim: true },

    // Headquarters country — used for geopolitical risk calculations
    country: { type: String, trim: true },

    // IANA timezone string (e.g. "Asia/Colombo") for display and scheduling
    timezone: { type: String, default: 'UTC' },

    // Subscription tier — drives feature access (e.g. carrier API integration)
    planTier: {
      type: String,
      enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
      default: 'STARTER',
    },

    // How many hours before an unacknowledged alert auto-escalates (SLA window)
    alertDefaultSLA: {
      type: Number,
      default: 24, // 24 hours
    },

    // Minimum minutes between two alerts for the same entity (prevents spam)
    alertCooldownMinutes: {
      type: Number,
      default: 30,
    },

    // How often the ML service is asked to recalculate risk scores (in hours)
    riskScoreRecalcInterval: {
      type: Number,
      default: 4, // Every 4 hours
    },

    // Per-organisation carrier API keys for shipment tracking integrations
    carrierAPIKeys: {
      fedex: { type: String, default: '' },
      ups: { type: String, default: '' },
      dhl: { type: String, default: '' },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'organisations' }
);

export default mongoose.model('Organisation', organisationSchema);
