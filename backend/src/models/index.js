import mongoose from 'mongoose';
import Supplier from './Supplier.js';
import Shipment from './Shipment.js';

export { Supplier, Shipment };

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

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);
export const Report = mongoose.model('Report', reportSchema);
