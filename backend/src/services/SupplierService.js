import { SupplierRepository } from '../repositories/SupplierRepository.js';
import AuditLog from '../models/AuditLog.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export class SupplierService {
  /**
   * Rule-based risk score computation from the 12 ML-ready features.
   * Falls back gracefully when fields are missing.
   * Score 0–100, tier: low/medium/high/critical
   */
  static computeRiskScore(supplier) {
    const {
      onTimeDeliveryRate = 80,
      avgDelayDays = 0,
      defectRate = 0,
      financialScore = 70,
      yearsInBusiness = 5,
      geopoliticalRiskFlag = 0,  // binary: 0=stable, 1=at-risk country
      disputeFrequency = 0,       // 0–20 disputes per period
      weatherLevel = 'low',
    } = supplier;

    // Weights aligned with dataset feature importance (total max = 100)
    const deliveryPenalty   = (100 - Math.min(Number(onTimeDeliveryRate) || 0, 100)) * 0.28; // 0–28
    const delayPenalty      = Math.min((Number(avgDelayDays) || 0) * 1.25, 15);              // 0–15
    const defectPenalty     = Math.min(Number(defectRate) || 0, 30) * 0.567;                 // 0–17
    const financialPenalty  = (100 - Math.min(Number(financialScore) || 0, 100)) * 0.15;     // 0–15
    const experiencePenalty = Math.max(0, 5 - Math.min(Number(yearsInBusiness) || 0, 5)) * 2; // 0–10
    const geoPenalty        = (Number(geopoliticalRiskFlag) === 1) ? 10 : 0;                 // 0 or 10
    const disputePenalty    = Math.min(Number(disputeFrequency) || 0, 20) * 0.25;            // 0–5

    const weatherMultiplier = { low: 1.0, medium: 1.05, high: 1.10 };
    const multiplier = weatherMultiplier[weatherLevel] ?? 1.0;

    const raw = deliveryPenalty + delayPenalty + defectPenalty + financialPenalty + experiencePenalty + geoPenalty + disputePenalty;
    const riskScore = Math.round(Math.min(raw * multiplier, 100));

    let riskTier;
    if (riskScore <= 30) riskTier = 'low';
    else if (riskScore <= 60) riskTier = 'medium';
    else if (riskScore <= 80) riskTier = 'high';
    else riskTier = 'critical';

    return { riskScore, riskTier };
  }

  static async listSuppliers(orgId, options = {}) {
    return SupplierRepository.findAll(orgId, options);
  }

  static async getSupplier(orgId, supplierId) {
    const supplier = await SupplierRepository.findById(orgId, supplierId);
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier;
  }

  static async createSupplier(orgId, data, userId) {
    const { riskScore, riskTier } = this.computeRiskScore(data);
    const now = new Date();

    const supplier = await SupplierRepository.create({
      ...data,
      orgId,
      riskScore,
      riskTier,
      lastScoredAt: now,
      riskHistory: [{ riskScore, riskTier, scoredAt: now }],
    });

    await AuditLog.create({
      orgId,
      userId,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: supplier._id,
      newValue: { name: supplier.name, riskScore, riskTier },
    });

    return supplier;
  }

  static async updateSupplier(orgId, supplierId, data, userId) {
    const existing = await SupplierRepository.findById(orgId, supplierId);
    if (!existing) throw new NotFoundError('Supplier not found');

    // Merge existing with incoming data for score recomputation
    const merged = { ...existing.toObject(), ...data };
    const { riskScore, riskTier } = this.computeRiskScore(merged);

    const updated = await SupplierRepository.update(orgId, supplierId, {
      ...data,
      riskScore,
      riskTier,
      lastScoredAt: new Date(),
    });

    // Append risk snapshot when score changes
    if (riskScore !== existing.riskScore) {
      await SupplierRepository.appendRiskSnapshot(orgId, supplierId, {
        riskScore,
        riskTier,
        scoredAt: new Date(),
      });
    }

    await AuditLog.create({
      orgId,
      userId,
      action: 'SUPPLIER_UPDATED',
      entityType: 'SUPPLIER',
      entityId: supplierId,
      oldValue: { riskScore: existing.riskScore, riskTier: existing.riskTier },
      newValue: { riskScore, riskTier },
    });

    return updated;
  }

  static async compareSuppliers(orgId, ids) {
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 3) {
      throw new ValidationError('Select between 2 and 3 suppliers to compare');
    }
    const suppliers = await SupplierRepository.findManyByIds(orgId, ids);
    if (suppliers.length !== ids.length) {
      const foundIds = suppliers.map(s => s._id.toString());
      const missing = ids.filter(id => !foundIds.includes(id));
      throw new NotFoundError(`${missing.length} supplier(s) not found or not accessible: ${missing.join(', ')}`);
    }
    return suppliers;
  }

  static async getRiskHistory(orgId, supplierId) {
    const supplier = await SupplierRepository.findById(orgId, supplierId);
    if (!supplier) throw new NotFoundError('Supplier not found');
    return supplier.riskHistory || [];
  }

  static async overrideScore(orgId, supplierId, analystId, newScore, justification) {
    const supplier = await SupplierRepository.findById(orgId, supplierId);
    if (!supplier) throw new NotFoundError('Supplier not found');

    const score = Number(newScore);
    if (isNaN(score) || score < 0 || score > 100) {
      throw new ValidationError('Score must be a number between 0 and 100');
    }
    if (!justification || !justification.trim()) {
      throw new ValidationError('Justification is required for score override');
    }

    const oldScore = supplier.riskScore;
    const oldTier  = supplier.riskTier;

    let newTier;
    if (score <= 30) newTier = 'low';
    else if (score <= 60) newTier = 'medium';
    else if (score <= 80) newTier = 'high';
    else newTier = 'critical';

    const now = new Date();
    const overrideEntry = { analystId, oldScore, newScore: score, oldTier, newTier, justification, overriddenAt: now };
    const historyEntry  = { riskScore: score, riskTier: newTier, scoredAt: now };

    const updated = await SupplierRepository.saveOverride(orgId, supplierId, {
      riskScore: score,
      riskTier: newTier,
      overrideEntry,
      historyEntry,
    });

    await AuditLog.create({
      orgId,
      userId: analystId,
      action: 'SUPPLIER_SCORE_OVERRIDDEN',
      entityType: 'SUPPLIER',
      entityId: supplierId,
      oldValue: { riskScore: oldScore, riskTier: oldTier },
      newValue: { riskScore: score, riskTier: newTier, justification },
    });

    return updated;
  }

  static async updateMetrics(orgId, supplierId, userId, { onTimeDeliveryRate, defectRate, disputeFrequency, reason, source = 'manual', shipmentId = null }) {
    const supplier = await SupplierRepository.findById(orgId, supplierId);
    if (!supplier) throw new NotFoundError('Supplier not found');

    if (!reason || !reason.trim()) throw new ValidationError('Reason is required for metrics adjustment');

    const metricUpdates = {};
    const changes = {};

    if (onTimeDeliveryRate != null) {
      changes.onTimeDeliveryRate = { old: supplier.onTimeDeliveryRate, new: Number(onTimeDeliveryRate) };
      metricUpdates.onTimeDeliveryRate = Number(onTimeDeliveryRate);
    }
    if (defectRate != null) {
      changes.defectRate = { old: supplier.defectRate, new: Number(defectRate) };
      metricUpdates.defectRate = Number(defectRate);
    }
    if (disputeFrequency != null) {
      changes.disputeFrequency = { old: supplier.disputeFrequency, new: Number(disputeFrequency) };
      metricUpdates.disputeFrequency = Number(disputeFrequency);
    }

    if (Object.keys(metricUpdates).length === 0) throw new ValidationError('At least one metric must be provided');

    // Recompute risk score with updated metrics
    const merged = { ...supplier.toObject(), ...metricUpdates };
    const { riskScore, riskTier } = this.computeRiskScore(merged);
    metricUpdates.riskScore = riskScore;
    metricUpdates.riskTier = riskTier;
    metricUpdates.lastScoredAt = new Date();

    const adjustmentEntry = { adjustedBy: userId, source, shipmentId, reason, changes, adjustedAt: new Date() };

    const updated = await SupplierRepository.saveMetricsAdjustment(orgId, supplierId, { metricUpdates, adjustmentEntry });

    // Append risk snapshot if score changed
    if (riskScore !== supplier.riskScore) {
      await SupplierRepository.appendRiskSnapshot(orgId, supplierId, { riskScore, riskTier, scoredAt: new Date() });
    }

    await AuditLog.create({
      orgId, userId,
      action: source === 'auto_shipment' ? 'SUPPLIER_METRICS_AUTO_UPDATED' : 'SUPPLIER_METRICS_MANUALLY_UPDATED',
      entityType: 'SUPPLIER',
      entityId: supplierId,
      oldValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.old])),
      newValue: Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.new])),
    });

    return updated;
  }

  static async updateStatus(orgId, supplierId, status, userId) {
    const validStatuses = ['active', 'under_watch', 'high_risk', 'suspended'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const supplier = await SupplierRepository.update(orgId, supplierId, { status });
    if (!supplier) throw new NotFoundError('Supplier not found');

    await AuditLog.create({
      orgId,
      userId,
      action: 'SUPPLIER_STATUS_UPDATED',
      entityType: 'SUPPLIER',
      entityId: supplierId,
      newValue: { status },
    });

    return supplier;
  }
}
