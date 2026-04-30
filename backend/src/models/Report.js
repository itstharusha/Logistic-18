import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    orgId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Organisation', 
      required: true, 
      index: true 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    type: {
      type: String,
      enum: ['summary', 'detailed', 'comparison', 'trend', 'weekly', 'monthly', 'custom'],
      required: true
    },
    format: {
      type: String,
      enum: ['pdf', 'csv'],
      required: true
    },
    module: {
      type: String,
      enum: ['dashboard', 'overall', 'supplier_risk', 'shipments', 'shipment_tracking', 'inventory', 'alerts'],
      required: true
    },
    severity: { 
      type: String, 
      enum: ['all', 'low', 'medium', 'high', 'critical'], 
      default: 'all' 
    },
    include: {
      kpis: { type: Boolean, default: true },
      charts: { type: Boolean, default: false },
      details: { type: Boolean, default: true }
    },
    dateRange: {
      from: Date,
      to: Date
    }
  },
  { 
    timestamps: true,
    collection: 'analytics_reports' 
  }
);

export default mongoose.model('AnalyticsReport', reportSchema);
