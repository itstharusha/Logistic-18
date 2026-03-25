import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentUtilization: {
      type: Number,
      default: 0,
      min: 0,
    },
    type: {
      type: String,
      enum: ['distribution', 'storage', 'cold-storage', 'cross-dock', 'manufacturing'],
      default: 'storage',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    manager: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    operatingHours: {
      open: { type: String, default: '08:00' },
      close: { type: String, default: '18:00' },
      timezone: { type: String, default: 'UTC' },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'warehouses',
  }
);

// Compound unique index for code within organization
warehouseSchema.index({ orgId: 1, code: 1 }, { unique: true });

// Virtual for utilization percentage
warehouseSchema.virtual('utilizationPercent').get(function () {
  if (!this.capacity || this.capacity === 0) return 0;
  return Math.round((this.currentUtilization / this.capacity) * 100);
});

// Ensure virtuals are included in JSON
warehouseSchema.set('toJSON', { virtuals: true });
warehouseSchema.set('toObject', { virtuals: true });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

export default Warehouse;
