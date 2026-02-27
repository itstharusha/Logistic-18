import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    action: String, // e.g., 'LOGIN', 'ROLE_CHANGED', 'SUPPLIER_CREATED'
    entityType: String, // e.g., 'USER', 'SUPPLIER', 'SHIPMENT'
    entityId: mongoose.Schema.Types.ObjectId,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: { expireAfterSeconds: 7776000 }, // 90 days TTL
    },
  },
  { collection: 'audit_logs' }
);

// Disable updates and deletes on audit logs (immutable)
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable');
});

auditLogSchema.pre('findByIdAndUpdate', function () {
  throw new Error('Audit logs are immutable');
});

auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs cannot be deleted');
});

export default mongoose.model('AuditLog', auditLogSchema);
