import mongoose from 'mongoose';

// Placeholder models for other team members' modules
// These are created to maintain referential integrity

const supplierSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
    name: String,
    country: String,
    category: String,
    riskScore: { type: Number, default: 0 },
    riskTier: String,
    status: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'suppliers' }
);

const shipmentSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    carrierName: String,
    status: String,
    riskScore: { type: Number, default: 0 },
    riskTier: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'shipments' }
);

const inventoryItemSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    sku: String,
    riskScore: { type: Number, default: 0 },
    riskTier: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'inventory_items' }
);

const reportSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportType: String,
    status: String,
    fileUrl: String,
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'reports' }
);

export const Supplier = mongoose.model('Supplier', supplierSchema);
export const Shipment = mongoose.model('Shipment', shipmentSchema);
export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export const Report = mongoose.model('Report', reportSchema);
