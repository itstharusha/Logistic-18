/**
 * models/index.js — Shared Model Re-exports and Supplementary Schemas
 *
 * Responsibility:
 *   Acts as a central barrel file for Mongoose models.
 *
 *   1. Re-exports the Supplier and Shipment models so other modules can
 *      import them from a single location when needed.
 *
 *   2. Defines two supplementary schemas (InventoryItem, Report) that are
 *      not yet built out into their own dedicated files. These are
 *      placeholder schemas to support future feature development.
 *
 *   InventoryItem — tracks stock items linked to a supplier, with a risk score.
 *   Report        — records generated analytics reports (async generation flow).
 *
 *   Note: The inventoryItemSchema currently references 'Organization' (US spelling)
 *   while the rest of the app uses 'Organisation' (UK spelling) — this should be
 *   unified when the inventory module is built out.
 */

import mongoose from 'mongoose';
import Supplier from './Supplier.js';
import Shipment from './Shipment.js';

// Re-export primary domain models for convenience
export { Supplier, Shipment };

// ── Supplementary Schemas (future modules) ────────────────────────────────────

/**
 * inventoryItemSchema
 * Represents a single stock/inventory item in the system.
 * Linked to both an organisation and an optional supplier.
 * Includes a risk score propagated from the linked supplier's risk profile.
 *
 * Status: Placeholder — the Inventory module is not yet implemented.
 */
const inventoryItemSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    sku: String,        // Stock Keeping Unit code
    riskScore: { type: Number, default: 0 },
    riskTier: String,        // Derived from the linked supplier's risk tier
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'inventory_items' }
);

/**
 * reportSchema
 * Represents a generated analytics/risk report.
 * Reports are created asynchronously — status transitions from 'pending' → 'complete'.
 * fileUrl points to the downloadable report file once generated.
 *
 * Status: Placeholder — the Reports/Analytics module is not yet implemented.
 */
const reportSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportType: String,   // e.g. 'supplier_risk', 'shipment_delay', 'kpi_summary'
    status: String,   // e.g. 'pending', 'generating', 'complete', 'failed'
    fileUrl: String,   // Download URL once the report has been generated
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'reports' }
);

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export const Report = mongoose.model('Report', reportSchema);
