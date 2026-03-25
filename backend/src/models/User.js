/**
 * User.js — Mongoose Schema & Model: users Collection
 *
 * Responsibility:
 *   Defines the structure, validation rules, and behaviour for user accounts.
 *   Each user document belongs to exactly one organisation (multi-tenant).
 *
 *   Key features:
 *   - Passwords are stored as bcrypt hashes (never plaintext) via a pre-save hook.
 *   - Sensitive fields (passwordHash, refreshToken, refreshTokenVersion) are excluded
 *     from query results by default using `select: false`.
 *   - Refresh token versioning supports token rotation and reuse detection.
 *   - The role enum maps directly to the 5 RBAC roles in this system.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Foreign key — links this user to their organisation (multi-tenant isolation)
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true, // Indexed for fast org-scoped lookups
    },

    // User's display name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Login identifier — must be unique across the entire platform
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,        // Stored lowercase for case-insensitive lookup
      match: /.+\@.+\..+/, // Basic email format validation
    },

    // bcrypt hash of the user's password (raw password is never stored)
    // select: false means this field is excluded from all queries by default.
    // Use .select('+passwordHash') to explicitly include it (login only).
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    // RBAC role — controls what the user can see and do
    role: {
      type: String,
      enum: ['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'VIEWER'],
      default: 'VIEWER',
      required: true,
    },

    // Soft-delete / account suspension flag
    isActive: {
      type: Boolean,
      default: true,
    },

    // The current valid refresh token (rotated on each use) — excluded by default
    refreshToken: {
      type: String,
      select: false,
    },

    // Monotonically increasing version counter for refresh token rotation.
    // When a token is consumed, this is incremented, invalidating all old tokens.
    // Excluded by default.
    refreshTokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },

    // Timestamps
    lastLoginAt: Date,    // Updated every time the user logs in successfully
    lastLoginIp: String,  // Recorded for security/audit purposes

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

// ─────────────────────────────────────────────
// Mongoose Hooks
// ─────────────────────────────────────────────

/**
 * pre('save') hook — Hash the password before saving.
 * Only runs when passwordHash has been modified (not on every save),
 * preventing double-hashing of an already-hashed value.
 * Uses bcrypt with 10 salt rounds (industry standard).
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next(); // Skip if not changed
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────
// Instance Methods
// ─────────────────────────────────────────────

/**
 * comparePassword
 * Compares a plain-text password against the stored bcrypt hash.
 * Used in the login flow. Returns true if they match.
 *
 * @param {string} plainPassword - The raw password from the login form
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Note: Multi-tenant scoping (filtering by orgId) is enforced at the
// repository and service layers, not via a Mongoose middleware hook.
userSchema.post(/^find/, function (doc) {
  // Reminder: actual orgId scoping happens in UserRepository.js
});

export default mongoose.model('User', userSchema);
