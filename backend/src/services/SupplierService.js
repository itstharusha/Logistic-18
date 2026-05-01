import { SupplierRepository } from '../repositories/SupplierRepository.js';
import { ShipmentRepository } from '../repositories/ShipmentRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import AuditLog from '../models/AuditLog.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

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

  /**
   * PHASE 1: Enrich supplier data with missing ML features
   * 
   * Maps database fields to ML model feature names and calculates missing values
   * - Fixes naming mismatches (avgDelayDays → averageDelayDays)
   * - Encodes categorical fields (categoryRisk: enum → numeric 0-3)
   * - Calculates missing fields from Shipment collection
   * 
   * @param {Object} supplier - Raw supplier from database
   * @param {String} supplierId - Supplier's MongoDB _id for lookups
   * @returns {Promise<Object>} Enriched supplier with all ML features
   */
  static async enrichSupplierData(supplier, supplierId) {
    const enriched = { ...supplier };
    const startTime = Date.now();
    
    // STEP 1: Fix field name mismatches
    if (supplier.avgDelayDays !== undefined) {
      enriched.averageDelayDays = supplier.avgDelayDays;
      delete enriched.avgDelayDays;
      console.log(`[enrichSupplierData] Mapped avgDelayDays → averageDelayDays: ${supplier.avgDelayDays}`);
    } else if (supplier.averageDelayDays === undefined) {
      enriched.averageDelayDays = 0;
      console.log(`[enrichSupplierData] Set averageDelayDays = 0 (missing)`);
    }

    // STEP 2: Encode categoryRisk from category enum to numeric
    // Mapping: raw_materials(0), components(1), finished_goods(2), services(3)
    if (supplier.category && typeof supplier.category === 'string') {
      const categoryMap = {
        'raw_materials': 0,
        'components': 1,
        'finished_goods': 2,
        'services': 3
      };
      const normalized = supplier.category.toLowerCase().trim();
      enriched.categoryRisk = categoryMap[normalized] ?? 1; // Default to 1 if unknown
      console.log(`[enrichSupplierData] Encoded category "${supplier.category}" → categoryRisk: ${enriched.categoryRisk}`);
    } else {
      enriched.categoryRisk = enriched.categoryRisk ?? 1;
      console.log(`[enrichSupplierData] Using categoryRisk: ${enriched.categoryRisk}`);
    }

    // STEP 3: Calculate missing shipment-based features
    if (supplierId) {
      try {
        // Get total shipment count
        const totalShipments = await ShipmentRepository.countBySupplier(supplierId);
        enriched.totalShipments = totalShipments;
        console.log(`[enrichSupplierData] totalShipments (from DB): ${totalShipments}`);

        // Get active shipment count
        const activeShipmentCount = await ShipmentRepository.countBySupplierAndStatus(supplierId);
        enriched.activeShipmentCount = activeShipmentCount;
        console.log(`[enrichSupplierData] activeShipmentCount (from DB): ${activeShipmentCount}`);

        // Get days since last shipment
        const lastShipmentDate = await ShipmentRepository.getLastShipmentDate(supplierId);
        if (lastShipmentDate) {
          const now = new Date();
          const daysSince = Math.floor((now - lastShipmentDate) / (1000 * 60 * 60 * 24));
          enriched.daysSinceLastShip = daysSince;
          console.log(`[enrichSupplierData] daysSinceLastShip: ${daysSince} (last shipment: ${lastShipmentDate.toISOString()})`);
        } else {
          enriched.daysSinceLastShip = 0;
          console.log(`[enrichSupplierData] daysSinceLastShip: 0 (no shipments found)`);
        }
      } catch (error) {
        console.error(`[enrichSupplierData] Error enriching from shipments:`, error.message);
        // Set defaults if calculation fails
        enriched.totalShipments = enriched.totalShipments ?? 0;
        enriched.activeShipmentCount = enriched.activeShipmentCount ?? 0;
        enriched.daysSinceLastShip = enriched.daysSinceLastShip ?? 0;
      }
    } else {
      // No supplierId available (new supplier), use defaults
      enriched.totalShipments = enriched.totalShipments ?? 0;
      enriched.activeShipmentCount = enriched.activeShipmentCount ?? 0;
      enriched.daysSinceLastShip = enriched.daysSinceLastShip ?? 0;
      console.log(`[enrichSupplierData] No supplierId provided, using default values for shipment features`);
    }

    // STEP 4: Ensure all ML features have numeric values
    const requiredNumericFields = [
      'onTimeDeliveryRate', 'financialScore', 'defectRate', 'disputeFrequency',
      'geopoliticalRiskFlag', 'totalShipments', 'averageDelayDays',
      'daysSinceLastShip', 'activeShipmentCount', 'categoryRisk'
    ];
    
    for (const field of requiredNumericFields) {
      if (enriched[field] === undefined || enriched[field] === null) {
        enriched[field] = 0;
      } else {
        enriched[field] = Number(enriched[field]) || 0;
      }
    }

    const enrichmentTime = Date.now() - startTime;
    console.log(`[enrichSupplierData] ✅ Enrichment complete in ${enrichmentTime}ms`);
    console.log(`[enrichSupplierData] Final features:`, {
      onTimeDeliveryRate: enriched.onTimeDeliveryRate,
      averageDelayDays: enriched.averageDelayDays,
      defectRate: enriched.defectRate,
      financialScore: enriched.financialScore,
      geopoliticalRiskFlag: enriched.geopoliticalRiskFlag,
      totalShipments: enriched.totalShipments,
      daysSinceLastShip: enriched.daysSinceLastShip,
      activeShipmentCount: enriched.activeShipmentCount,
      categoryRisk: enriched.categoryRisk,
      disputeFrequency: enriched.disputeFrequency
    });

    return enriched;
  }

  /**
   * Predict supplier risk score using ML service
   * PHASE 1: Now enriches supplier data before prediction
   * 
   * @param {Object} supplier - Raw supplier data from database
   * @param {String} supplierId - Supplier's MongoDB _id (optional, for enrichment)
   * @returns {Promise<Object>} {riskScore, riskTier, recommendations, shapValues}
   */
  static async predictRiskScore(supplier, supplierId = null) {
    try {
      // PHASE 1: Enrich supplier with missing ML features
      const enrichedSupplier = await this.enrichSupplierData(supplier, supplierId);
      
      console.log(`[predictRiskScore] Calling ML service at ${ML_SERVICE_URL}/predict/supplier`);
      const startTime = Date.now();
      
      const response = await axios.post(`${ML_SERVICE_URL}/predict/supplier`, enrichedSupplier, {
        timeout: 5000 // 5 second timeout per NFR
      });
      
      const predictionTime = Date.now() - startTime;
      console.log(`[predictRiskScore] ML service returned in ${predictionTime}ms: riskScore=${response.data.riskScore}, riskTier=${response.data.riskTier}`);

      return {
        riskScore: response.data.riskScore,
        riskTier: response.data.riskTier,
        recommendations: response.data.recommendations || [],
        shapValues: response.data.shapValues || []
      };
    } catch (error) {
      console.warn(`[predictRiskScore] ML Service failed: ${error.message}. Using rule-based fallback scoring.`);
      return this.computeRiskScore(supplier);
    }
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
    const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore(data, null);
    const now = new Date();

    const supplier = await SupplierRepository.create({
      ...data,
      orgId,
      riskScore,
      riskTier,
      recommendations,
      shapValues,
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
    // PHASE 1: Pass supplierId to enrichSupplierData
    const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore(merged, supplierId);

    const updated = await SupplierRepository.update(orgId, supplierId, {
      ...data,
      riskScore,
      riskTier,
      recommendations,
      shapValues,
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

    const analyst = await UserRepository.findById(analystId);
    const now = new Date();
    const overrideEntry = {
      analystId,
      analystName:  analyst?.name  || 'Unknown',
      analystEmail: analyst?.email || '',
      analystRole:  analyst?.role  || '',
      oldScore, newScore: score, oldTier, newTier, justification, overriddenAt: now,
    };
    const historyEntry = { riskScore: score, riskTier: newTier, scoredAt: now };

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

  static async updateMetrics(orgId, supplierId, userId, { onTimeDeliveryRate, defectRate, disputeFrequency, avgDelayDays, financialScore, yearsInBusiness, contractValue, reason, source = 'manual', shipmentId = null }) {
    const [supplier, user] = await Promise.all([
      SupplierRepository.findById(orgId, supplierId),
      UserRepository.findById(userId),
    ]);
    if (!supplier) throw new NotFoundError('Supplier not found');

    if (!reason || !reason.trim()) throw new ValidationError('Reason is required for metrics adjustment');

    const metricUpdates = {};
    const changes = {};

    const trackMetric = (key, val) => {
      if (val != null) {
        changes[key] = { old: supplier[key], new: Number(val) };
        metricUpdates[key] = Number(val);
      }
    };

    trackMetric('onTimeDeliveryRate', onTimeDeliveryRate);
    trackMetric('defectRate',         defectRate);
    trackMetric('disputeFrequency',   disputeFrequency);
    trackMetric('avgDelayDays',       avgDelayDays);
    trackMetric('financialScore',     financialScore);
    trackMetric('yearsInBusiness',    yearsInBusiness);
    trackMetric('contractValue',      contractValue);

    if (Object.keys(metricUpdates).length === 0) throw new ValidationError('At least one metric must be provided');

    // Recompute risk score with updated metrics
    const merged = { ...supplier.toObject(), ...metricUpdates };
    const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore(merged, supplierId);
    metricUpdates.riskScore = riskScore;
    metricUpdates.riskTier = riskTier;
    metricUpdates.recommendations = recommendations;
    metricUpdates.shapValues = shapValues;
    metricUpdates.lastScoredAt = new Date();

    const adjustmentEntry = {
      adjustedBy:      userId,
      adjustedByName:  user?.name  || 'Unknown',
      adjustedByEmail: user?.email || '',
      adjustedByRole:  user?.role  || '',
      source, shipmentId, reason, changes, adjustedAt: new Date(),
    };

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
