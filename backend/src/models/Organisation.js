import mongoose from 'mongoose';

const organisationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    industry: String,
    country: String,
    timezone: {
      type: String,
      default: 'UTC',
    },
    planTier: {
      type: String,
      enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
      default: 'STARTER',
    },
    alertDefaultSLA: {
      type: Number,
      default: 24, // hours
    },
    alertCooldownMinutes: {
      type: Number,
      default: 30,
    },
    riskScoreRecalcInterval: {
      type: Number,
      default: 4, // hours
    },
    carrierAPIKeys: {
      fedex: String,
      ups: String,
      dhl: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'organisations' }
);

export default mongoose.model('Organisation', organisationSchema);
