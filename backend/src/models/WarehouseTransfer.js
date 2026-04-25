import mongoose from 'mongoose';

const warehouseTransferSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    transferNumber: {
      type: String,
      unique: true,
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    fromWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    toWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'in-transit', 'completed', 'cancelled'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    reason: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'warehouse_transfers',
  }
);

// Indexes for efficient queries
warehouseTransferSchema.index({ orgId: 1, status: 1 });
warehouseTransferSchema.index({ fromWarehouseId: 1 });
warehouseTransferSchema.index({ toWarehouseId: 1 });
warehouseTransferSchema.index({ inventoryItemId: 1 });

// Generate transfer number before saving
warehouseTransferSchema.pre('save', async function (next) {
  if (this.isNew && !this.transferNumber) {
    const count = await mongoose.model('WarehouseTransfer').countDocuments({ orgId: this.orgId });
    this.transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

const WarehouseTransfer = mongoose.model('WarehouseTransfer', warehouseTransferSchema);

export default WarehouseTransfer;
