/**
 * AuditLog.js — Mongoose Schema & Model: audit_logs Collection
 *
 * Responsibility:
 *   Defines an immutable record of every significant action performed in the system.
 *   Audit logs are used for compliance, security review, and forensic investigation.
 *
 *   Key design decisions:
 *   - Immutable: Mongoose pre-hooks block any update or delete operations.
 *     This ensures the audit trail cannot be tampered with after the fact.
 *   - TTL (Time-To-Live): MongoDB automatically deletes entries after 90 days
 *     (7,776,000 seconds) via the index on the timestamp field.
 *   - oldValue / newValue: Stored as Mixed (any type) to capture the "before"
 *     and "after" state of any entity change (e.g. role change, metric update).
 *
 *   Typical actions logged:
 *   LOGIN, LOGOUT, PASSWORD_CHANGED, USER_REGISTERED, ROLE_CHANGED,
 *   SUPPLIER_CREATED, SUPPLIER_UPDATED, SUPPLIER_SCORE_OVERRIDDEN,
 *   SHIPMENT_CREATED, UNAUTHORIZED_ACCESS_ATTEMPT, ERROR, etc.
 */

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    // Organisation this log entry belongs to (for scoped admin views)
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },

    // Who performed the action (null for system-generated events)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // What happened — a verb-noun string in SCREAMING_SNAKE_CASE
    // e.g. 'LOGIN', 'ROLE_CHANGED', 'SUPPLIER_CREATED', 'TOKEN_REFRESHED'
    action: String,

    // What type of resource was affected — 'USER', 'SUPPLIER', 'SHIPMENT', 'AUTH', etc.
    entityType: String,

    // MongoDB _id of the specific resource that was changed (if applicable)
    entityId: mongoose.Schema.Types.ObjectId,

    // Snapshot of the entity's state BEFORE the change (for diff display)
    oldValue: mongoose.Schema.Types.Mixed,

    // Snapshot of the entity's state AFTER the change (for diff display)
    newValue: mongoose.Schema.Types.Mixed,

    // Network information for security tracing
    ipAddress: String,
    userAgent: String,

    // When the action occurred — also used as the TTL index field.
    // MongoDB auto-deletes this document 90 days (7,776,000 s) after this timestamp.
    timestamp: {
      type: Date,
      default: Date.now,
      index: { expireAfterSeconds: 7776000 }, // 90-day automatic expiry
    },
  },
  { collection: 'audit_logs' }
);

// ─────────────────────────────────────────────
// Immutability Enforcement
// ─────────────────────────────────────────────
// These hooks throw errors if any code attempts to modify or delete a log entry.
// Audit logs must only ever be created — never changed.

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
