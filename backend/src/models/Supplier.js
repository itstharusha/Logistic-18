/**
 * Supplier.js — Mongoose Schema & Model: suppliers Collection
 *
 * Responsibility:
 *   Defines the full data structure for a supplier record, including:
 *   - Identity fields (name, contact, country, category)
 *   - Risk-scoring input features (onTimeDeliveryRate, defectRate, etc.)
 *   - Computed risk output (riskScore 0–100, riskTier low/medium/high/critical)
 *   - History arrays:
 *       riskHistory            — timestamped score snapshots for the trend chart
 *       overrideHistory        — analyst manual score overrides with justification
 *       metricsAdjustmentHistory — logged changes to performance metrics
 *
 *   Sub-schemas (riskHistory, overrideHistory, metricsAdjustmentHistory) use
 *   `{ _id: false }` to avoid generating unnecessary ObjectIds for embedded docs.
 */

import mongoose from 'mongoose';

// ─────────────────────────────────────────────
// Sub-Schemas (embedded document definitions)
// ─────────────────────────────────────────────

/**
 * riskHistorySchema
 * A single timestamped snapshot of the supplier's risk score.
 * A new entry is appended whenever the score changes (via update, metrics
 * adjustment, or manual override). Powers the "Risk Score History" line chart.
 */
const riskHistorySchema = new mongoose.Schema(
  {
    riskScore: { type: Number, required: true }, // 0–100
    riskTier: { type: String, required: true }, // 'low' | 'medium' | 'high' | 'critical'
    scoredAt: { type: Date, default: Date.now },
  },
  { _id: false } // No separate _id for embedded sub-documents
);

/**
 * overrideHistorySchema
 * Records a manual risk score override made by a RISK_ANALYST or ORG_ADMIN.
 * Captures who made the change, what changed, and the mandatory justification.
 * Immutable once written — part of the compliance audit trail.
 */
const overrideHistorySchema = new mongoose.Schema(
  {
    analystId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    analystName: { type: String },   // Denormalised for display without a join
    analystEmail: { type: String },
    analystRole: { type: String },
    oldScore: { type: Number },   // Score before the override
    newScore: { type: Number },   // Score after the override
    oldTier: { type: String },
    newTier: { type: String },
    justification: { type: String, required: true }, // Mandatory reason for the change
    overriddenAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * metricsAdjustmentSchema
 * Records a change to one or more performance metrics (e.g. onTimeDeliveryRate).
 * Can be triggered manually by an analyst or automatically when a linked
 * shipment is completed (source: 'auto_shipment').
 * The `changes` object captures old→new values for each modified metric.
 */
const metricsAdjustmentSchema = new mongoose.Schema(
  {
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adjustedByName: { type: String },
    adjustedByEmail: { type: String },
    adjustedByRole: { type: String },
    source: { type: String, enum: ['manual', 'auto_shipment'], default: 'manual' },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' }, // Set for auto_shipment
    reason: { type: String, required: true }, // Mandatory reason for the adjustment
    changes: {
      // Each key holds old/new values for the changed metric
      onTimeDeliveryRate: { old: Number, new: Number },
      defectRate: { old: Number, new: Number },
      disputeFrequency: { old: Number, new: Number },
      avgDelayDays: { old: Number, new: Number },
      financialScore: { old: Number, new: Number },
      yearsInBusiness: { old: Number, new: Number },
      contractValue: { old: Number, new: Number },
    },
    adjustedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─────────────────────────────────────────────
// Main Supplier Schema
// ─────────────────────────────────────────────

const supplierSchema = new mongoose.Schema(
  {
    // Multi-tenant foreign key — every supplier belongs to one organisation
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },

    // ── Identity Fields ─────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    country: { type: String, trim: true },
    category: {
      type: String,
      enum: ['raw_materials', 'components', 'finished_goods', 'services'],
      default: 'raw_materials',
    },

    // ── ML Risk Input Features ───────────────────────────────────
    // These 8 values feed into the rule-based risk scoring formula in SupplierService.
    weatherLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    onTimeDeliveryRate: { type: Number, min: 0, max: 100, default: 80 },  // %
    avgDelayDays: { type: Number, min: 0, default: 0 },             // average days late
    defectRate: { type: Number, min: 0, max: 100, default: 0 },   // %
    financialScore: { type: Number, min: 0, max: 100, default: 70 },  // 0–100 health index
    yearsInBusiness: { type: Number, min: 0, default: 5 },
    contractValue: { type: Number, min: 0, default: 0 },             // annual $ value
    geopoliticalRiskFlag: { type: Number, enum: [0, 1], default: 0 },       // 0=stable, 1=at-risk
    disputeFrequency: { type: Number, min: 0, max: 20, default: 0 },    // disputes per period

    // ── Computed Risk Output (written by SupplierService.computeRiskScore) ──
    riskScore: { type: Number, default: 0 }, // 0–100
    riskTier: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    lastScoredAt: { type: Date }, // When the score was last calculated

    // ── Workflow Status ──────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'under_watch', 'high_risk', 'suspended'],
      default: 'active',
    },

    // ── History Arrays ───────────────────────────────────────────
    riskHistory: [riskHistorySchema],          // Score trend over time
    overrideHistory: [overrideHistorySchema],      // Manual analyst overrides
    metricsAdjustmentHistory: [metricsAdjustmentSchema],    // Metric change log

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'suppliers' }
);

// Compound indexes for common query patterns
supplierSchema.index({ orgId: 1, status: 1 });    // Filter by status within org
supplierSchema.index({ orgId: 1, riskTier: 1 });  // Filter by risk tier within org

export default mongoose.model('Supplier', supplierSchema);
