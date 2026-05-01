import Supplier from '../models/Supplier.js';

export class SupplierRepository {
  static async findAll(orgId, { search, status, tier, skip = 0, limit = 50 } = {}) {
    const query = { orgId };

    if (status && status !== 'all') query.status = status;
    if (tier && tier !== 'all') query.riskTier = tier;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)),
      Supplier.countDocuments(query),
    ]);

    return { suppliers, total };
  }

  static async findById(orgId, supplierId) {
    return Supplier.findOne({ _id: supplierId, orgId });
  }

  static async create(data) {
    const supplier = new Supplier(data);
    return supplier.save();
  }

  static async update(orgId, supplierId, data) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      { $set: { ...data, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
  }

  static async findManyByIds(orgId, ids) {
    return Supplier.find({ _id: { $in: ids }, orgId });
  }

  static async appendRiskSnapshot(orgId, supplierId, snapshot) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      { $push: { riskHistory: snapshot } },
      { new: true }
    );
  }

  static async saveMetricsAdjustment(orgId, supplierId, { metricUpdates, adjustmentEntry }) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      {
        $set: { ...metricUpdates, updatedAt: new Date() },
        $push: { metricsAdjustmentHistory: adjustmentEntry },
      },
      { new: true, runValidators: true }
    );
  }

  static async saveOverride(orgId, supplierId, { riskScore, riskTier, overrideEntry, historyEntry }) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      {
        $set: { riskScore, riskTier, lastScoredAt: new Date(), updatedAt: new Date() },
        $push: {
          overrideHistory: overrideEntry,
          riskHistory: historyEntry,
        },
      },
      { new: true }
    );
  }
}
