import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organisation',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /.+\@.+\..+/,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Exclude from queries by default
    },
    role: {
      type: String,
      enum: ['ORG_ADMIN', 'RISK_ANALYST', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'VIEWER'],
      default: 'VIEWER',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    lastLoginAt: Date,
    lastLoginIp: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'users' }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// Multi-tenant query scope - always filter by orgId
userSchema.post(/^find/, function (doc) {
  // Note: This is a reminder - actual scoping happens at repository layer
});

export default mongoose.model('User', userSchema);
