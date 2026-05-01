import cron from 'node-cron';
import { ShipmentRepository } from '../repositories/ShipmentRepository.js';
import { SupplierRepository } from '../repositories/SupplierRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import AuditLog from '../models/AuditLog.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Valid state machine transitions
const VALID_TRANSITIONS = {
  registered:  ['in_transit', 'closed'],
  in_transit:  ['delayed', 'rerouted', 'delivered'],
  delayed:     ['in_transit', 'rerouted', 'delivered', 'closed'],
  rerouted:    ['in_transit', 'delayed', 'delivered', 'closed'],
  delivered:   ['closed'],
  closed:      [],
};

export class ShipmentService {
  /**
   * Rule-based risk score computation using 10 shipment-specific features.
   * Mirrors the supplier module's pattern. Score 0–100, tier: low/medium/high/critical.
   */
  static computeRiskScore(shipment) {
    const {
      status = 'registered',
      delayHours = 0,
      carrier = 'Other',
      weatherLevel = 'low',
      originGeoRisk = 0,
      destinationGeoRisk = 0,
      weight = 0,
      priority = 'standard',
      estimatedDelivery,
    } = shipment;

    // Feature 1: Status-based base penalty
    const statusPenalty = {
      registered: 0,
      in_transit:  5,
      delayed:    30,
      rerouted:   20,
      delivered:   0,
      closed:      0,
    }[status] ?? 0;

    // Feature 2: Delay magnitude penalty (0–40)
    const delay = Number(delayHours) || 0;
    const delayPenalty = delay > 0 ? Math.min(delay * 1.2, 40) : 0;

    // Feature 3: Carrier reliability penalty
    const carrierPenalty = { FedEx: 0, DHL: 0, UPS: 2, Other: 8 }[carrier] ?? 3;

    // Feature 4-5: Geopolitical risk at both ends (0–10 each)
    const geoPenalty = (Number(originGeoRisk) + Number(destinationGeoRisk)) * 5;

    // Feature 6: Weather exposure
    const weatherPenalty = { low: 0, medium: 5, high: 12 }[weatherLevel] ?? 0;

    // Feature 7: Weight risk (heavier shipments harder to reroute)
    const weightPenalty = Math.min((Number(weight) || 0) / 200, 5);

    // Feature 8: Priority escalation (overnight/express delay = more critical)
    const priorityMultiplier = { standard: 1.0, express: 1.1, overnight: 1.2 }[priority] ?? 1.0;

    // Feature 9: Estimated transit days (longer route = more exposure)
    let transitDays = 3;
    if (estimatedDelivery) {
      const now = new Date();
      const etaMs = new Date(estimatedDelivery) - now;
      transitDays = Math.max(0, etaMs / (1000 * 60 * 60 * 24));
    }
    const transitPenalty = Math.min(transitDays * 0.5, 5);

    const raw = (statusPenalty + delayPenalty + carrierPenalty + geoPenalty + weatherPenalty + weightPenalty + transitPenalty) * priorityMultiplier;
    const riskScore = Math.round(Math.min(raw, 100));

    let riskTier;
    if (riskScore <= 30)      riskTier = 'low';
    else if (riskScore <= 60) riskTier = 'medium';
    else if (riskScore <= 80) riskTier = 'high';
    else                      riskTier = 'critical';

    return { riskScore, riskTier };
  }

  static computeDelay(estimatedDelivery) {
    const now = new Date();
    const eta = new Date(estimatedDelivery);
    if (now <= eta) return { delayHours: 0, delaySeverity: null };

    const diffMs = now - eta;
    const delayHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;

    let delaySeverity = null;
    if (delayHours >= 2  && delayHours < 6)   delaySeverity = 'low';
    else if (delayHours >= 6  && delayHours < 12)  delaySeverity = 'medium';
    else if (delayHours >= 12 && delayHours < 24) delaySeverity = 'high';
    else if (delayHours >= 24)                    delaySeverity = 'critical';

    return { delayHours, delaySeverity };
  }

  static validateTransition(currentStatus, newStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`
      );
    }
  }

  /**
   * PHASE 2: Enrich shipment data with missing ML features
   * 
   * Calculates and adds missing features for ML model prediction
   * - Encodes weatherLevel (string → numeric)
   * - Calculates daysInTransit from dates
   * - Looks up supplier risk score
   * - Calculates isInternational flag
   * - Fetches carrier reliability metrics
   * - Calculates route risk
   * - Identifies tracking gaps
   * 
   * @param {Object} shipment - Raw shipment from database
   * @param {String} shipmentId - Shipment's MongoDB _id (optional, for enrichment)
   * @returns {Promise<Object>} Enriched shipment with all ML features
   */
  static async enrichShipmentData(shipment, shipmentId = null) {
    const enriched = { ...shipment };
    const startTime = Date.now();
    
    console.log(`[enrichShipmentData] Starting enrichment for shipment ${shipmentId || 'new'}`);

    // STEP 1: Encode weatherLevel from string to numeric (0=low, 1=medium, 2=high)
    const weatherMap = { 'low': 0, 'medium': 1, 'high': 2 };
    if (shipment.weatherLevel && typeof shipment.weatherLevel === 'string') {
      const normalized = shipment.weatherLevel.toLowerCase();
      enriched.weatherLevel = weatherMap[normalized] ?? 0;
      console.log(`[enrichShipmentData] Encoded weatherLevel "${shipment.weatherLevel}" → ${enriched.weatherLevel}`);
    } else {
      enriched.weatherLevel = Number(enriched.weatherLevel) ?? 0;
    }

    // STEP 2: Calculate etaDeviationHours (already available as delayHours)
    enriched.etaDeviationHours = Number(shipment.delayHours) || 0;
    console.log(`[enrichShipmentData] etaDeviationHours: ${enriched.etaDeviationHours}`);

    // STEP 3: Calculate daysInTransit
    if (shipment.estimatedDelivery && shipment.actualDelivery) {
      enriched.daysInTransit = ShipmentRepository.calculateDaysInTransit(
        shipment.estimatedDelivery,
        shipment.actualDelivery
      );
      console.log(`[enrichShipmentData] daysInTransit (calculated): ${enriched.daysInTransit}`);
    } else {
      enriched.daysInTransit = 0;
      console.log(`[enrichShipmentData] daysInTransit: 0 (no delivery dates)`);
    }

    // STEP 4: Determine if international shipment
    enriched.isInternational = (shipment.originCountry && shipment.destinationCountry && 
                               shipment.originCountry !== shipment.destinationCountry) ? 1 : 0;
    console.log(`[enrichShipmentData] isInternational: ${enriched.isInternational} (${shipment.originCountry} → ${shipment.destinationCountry})`);

    // STEP 5: Get shipmentValueUSD (from database, default to 0)
    enriched.shipmentValueUSD = Number(shipment.shipmentValueUSD) || 0;
    console.log(`[enrichShipmentData] shipmentValueUSD: ${enriched.shipmentValueUSD}`);

    // STEP 6: Lookup supplier risk score
    if (shipment.supplierId) {
      try {
        const supplier = await SupplierRepository.findById(shipment.orgId, shipment.supplierId);
        enriched.supplierRiskScore = supplier?.riskScore || 0;
        console.log(`[enrichShipmentData] supplierRiskScore (from supplier): ${enriched.supplierRiskScore}`);
      } catch (error) {
        console.error(`[enrichShipmentData] Error looking up supplier:`, error.message);
        enriched.supplierRiskScore = enriched.supplierRiskScore || 0;
      }
    } else {
      enriched.supplierRiskScore = enriched.supplierRiskScore || 0;
      console.log(`[enrichShipmentData] supplierRiskScore: 0 (no supplier linked)`);
    }

    // STEP 7: Get carrier reliability metrics
    try {
      const carrierReliability = await ShipmentRepository.getCarrierReliability(shipment.carrier);
      enriched.carrierReliability = carrierReliability;
      console.log(`[enrichShipmentData] carrierReliability (${shipment.carrier}): ${carrierReliability.toFixed(3)}`);

      const carrierDelayRate = await ShipmentRepository.getCarrierDelayRate(shipment.carrier);
      enriched.carrierDelayRate = carrierDelayRate;
      console.log(`[enrichShipmentData] carrierDelayRate (${shipment.carrier}): ${carrierDelayRate.toFixed(3)}`);
    } catch (error) {
      console.error(`[enrichShipmentData] Error calculating carrier metrics:`, error.message);
      enriched.carrierReliability = enriched.carrierReliability ?? 0.5;
      enriched.carrierDelayRate = enriched.carrierDelayRate ?? 0.15;
    }

    // STEP 8: Calculate route risk
    enriched.routeRiskIndex = ShipmentRepository.calculateRouteRisk(
      shipment.originCountry,
      shipment.destinationCountry
    );
    console.log(`[enrichShipmentData] routeRiskIndex: ${enriched.routeRiskIndex.toFixed(3)}`);

    // STEP 9: Calculate tracking gap hours
    enriched.trackingGapHours = ShipmentRepository.calculateTrackingGapHours(shipment.trackingEvents);
    console.log(`[enrichShipmentData] trackingGapHours: ${enriched.trackingGapHours}`);

    // STEP 10: Ensure all ML features are numeric
    const requiredNumericFields = [
      'etaDeviationHours', 'weatherLevel', 'routeRiskIndex', 'carrierReliability',
      'trackingGapHours', 'shipmentValueUSD', 'daysInTransit', 'supplierRiskScore',
      'isInternational', 'carrierDelayRate'
    ];
    
    for (const field of requiredNumericFields) {
      if (enriched[field] === undefined || enriched[field] === null) {
        enriched[field] = 0;
      } else {
        enriched[field] = Number(enriched[field]) || 0;
      }
    }

    const enrichmentTime = Date.now() - startTime;
    console.log(`[enrichShipmentData] ✅ Enrichment complete in ${enrichmentTime}ms`);
    console.log(`[enrichShipmentData] Final features:`, {
      etaDeviationHours: enriched.etaDeviationHours,
      weatherLevel: enriched.weatherLevel,
      routeRiskIndex: enriched.routeRiskIndex,
      carrierReliability: enriched.carrierReliability,
      trackingGapHours: enriched.trackingGapHours,
      shipmentValueUSD: enriched.shipmentValueUSD,
      daysInTransit: enriched.daysInTransit,
      supplierRiskScore: enriched.supplierRiskScore,
      isInternational: enriched.isInternational,
      carrierDelayRate: enriched.carrierDelayRate
    });

    return enriched;
  }

  /**
   * Predict shipment risk score using ML service
   * PHASE 2: Now enriches shipment data before prediction
   * 
   * @param {Object} shipment - Raw shipment data from database
   * @param {String} shipmentId - Shipment's MongoDB _id (optional, for enrichment)
   * @returns {Promise<Object>} {riskScore, riskTier, recommendations, shapValues}
   */
  static async predictRiskScore(shipment, shipmentId = null) {
    try {
      // PHASE 2: Enrich shipment with missing ML features
      const enrichedShipment = await this.enrichShipmentData(shipment, shipmentId);
      
      console.log(`[predictRiskScore] Calling ML service at ${ML_SERVICE_URL}/predict/shipment`);
      const startTime = Date.now();
      
      const response = await axios.post(`${ML_SERVICE_URL}/predict/shipment`, enrichedShipment, {
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
      return this.computeRiskScore(shipment);
    }
  }

  static async listShipments(orgId, options = {}) {
    return ShipmentRepository.findAll(orgId, options);
  }

  static async getShipment(orgId, shipmentId) {
    const shipment = await ShipmentRepository.findById(orgId, shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');
    return shipment;
  }

  static async createShipment(orgId, data, userId) {
    const user = await UserRepository.findById(userId);
    const shipmentNumber = await ShipmentRepository.getNextShipmentNumber(orgId);
    const now = new Date();

    const { delayHours, delaySeverity } = this.computeDelay(data.estimatedDelivery);
    const shipmentData = {
      ...data,
      orgId,
      createdBy: userId,
      shipmentNumber,
      delayHours,
      delaySeverity,
      status: 'registered',
    };
    const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore(shipmentData, null);

    const shipment = await ShipmentRepository.create({
      ...shipmentData,
      riskScore,
      riskTier,
      recommendations,
      shapValues,
      lastScoredAt: now,
      riskHistory: [{ riskScore, riskTier, scoredAt: now }],
      trackingEvents: [{
        status: 'registered',
        location: data.originCity ? `${data.originCity}, ${data.originCountry}` : 'Origin',
        description: 'Shipment registered in system',
        timestamp: now,
        source: 'system',
      }],
      statusHistory: [{
        status: 'registered',
        changedAt: now,
        changedByName:  user?.name  || 'System',
        changedByEmail: user?.email || '',
        changedByRole:  user?.role  || '',
        notes: 'Shipment created',
      }],
    });

    await AuditLog.create({
      orgId,
      userId,
      action: 'SHIPMENT_CREATED',
      entityType: 'SHIPMENT',
      entityId: shipment._id,
      newValue: { shipmentNumber, carrier: shipment.carrier, riskScore, riskTier },
    });

    return shipment;
  }

  static async updateShipment(orgId, shipmentId, data, userId) {
    const existing = await ShipmentRepository.findById(orgId, shipmentId);
    if (!existing) throw new NotFoundError('Shipment not found');

    const merged = { ...existing.toObject(), ...data };
    const { delayHours, delaySeverity } = this.computeDelay(merged.estimatedDelivery);
    merged.delayHours    = delayHours;
    merged.delaySeverity = delaySeverity;
    const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore(merged, shipmentId);

    const updated = await ShipmentRepository.update(orgId, shipmentId, {
      ...data,
      delayHours,
      delaySeverity,
      riskScore,
      riskTier,
      recommendations,
      shapValues,
      lastScoredAt: new Date(),
    });

    if (riskScore !== existing.riskScore) {
      await ShipmentRepository.appendRiskSnapshot(orgId, shipmentId, {
        riskScore,
        riskTier,
        scoredAt: new Date(),
      });
    }

    await AuditLog.create({
      orgId,
      userId,
      action: 'SHIPMENT_UPDATED',
      entityType: 'SHIPMENT',
      entityId: shipmentId,
      newValue: { riskScore, riskTier },
    });

    return updated;
  }

  static async updateStatus(orgId, shipmentId, newStatus, userId, notes = '') {
    const shipment = await ShipmentRepository.findById(orgId, shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');

    this.validateTransition(shipment.status, newStatus);

    const user = await UserRepository.findById(userId);
    const now = new Date();

    const updates = { status: newStatus };

    if (newStatus === 'delivered') {
      updates.actualDelivery = now;
      updates.delayHours = 0;
      updates.delaySeverity = null;
    }

    if (['delayed', 'rerouted'].includes(newStatus)) {
      const { delayHours, delaySeverity } = this.computeDelay(shipment.estimatedDelivery);
      updates.delayHours    = delayHours;
      updates.delaySeverity = delaySeverity;
    }

    // Recompute risk with new status
    const merged = { ...shipment.toObject(), ...updates };
    const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore(merged, shipment._id);
    updates.riskScore    = riskScore;
    updates.riskTier     = riskTier;
    updates.recommendations = recommendations;
    updates.shapValues   = shapValues;
    updates.lastScoredAt = now;

    const statusEntry = {
      status: newStatus,
      changedAt:      now,
      changedByName:  user?.name  || 'System',
      changedByEmail: user?.email || '',
      changedByRole:  user?.role  || '',
      notes,
    };

    const trackingEntry = {
      status: newStatus,
      location: newStatus === 'delivered'
        ? (shipment.destinationCity ? `${shipment.destinationCity}, ${shipment.destinationCountry}` : 'Destination')
        : '',
      description: this._statusDescription(newStatus, notes),
      timestamp: now,
      source: 'manual',
    };

    const updated = await ShipmentRepository.updateStatusWithHistory(
      orgId,
      shipmentId,
      updates,
      statusEntry,
      trackingEntry,
      { riskScore, riskTier, scoredAt: now },
    );

    // On delivery, auto-update linked supplier's on-time performance
    if (newStatus === 'delivered' && shipment.supplierId) {
      await this._updateSupplierOnDelivery(orgId, shipment, userId);
    }

    await AuditLog.create({
      orgId,
      userId,
      action: 'SHIPMENT_STATUS_UPDATED',
      entityType: 'SHIPMENT',
      entityId: shipmentId,
      oldValue: { status: shipment.status },
      newValue: { status: newStatus, notes },
    });

    return ShipmentRepository.findById(orgId, shipmentId);
  }

  static async getTrackingEvents(orgId, shipmentId) {
    const shipment = await ShipmentRepository.findById(orgId, shipmentId);
    if (!shipment) throw new NotFoundError('Shipment not found');
    return [...(shipment.trackingEvents || [])].reverse();
  }

  /**
   * Delay detection poll — called by cron every 15 minutes.
   * Checks all active shipments and auto-transitions to 'delayed' when ETA exceeded by > 2 hours.
   */
  static async pollAllActiveShipments() {
    const shipments = await ShipmentRepository.findActiveShipments();
    const now = new Date();

    for (const shipment of shipments) {
      try {
        const { delayHours, delaySeverity } = this.computeDelay(shipment.estimatedDelivery);

        if (delayHours >= 2 && shipment.status === 'in_transit') {
          const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore({
            ...shipment.toObject(),
            status: 'delayed',
            delayHours,
            delaySeverity,
          }, shipment._id);

          await ShipmentRepository.update(shipment.orgId, shipment._id, {
            status: 'delayed',
            delayHours,
            delaySeverity,
            riskScore,
            riskTier,
            recommendations,
            shapValues,
            lastScoredAt: now,
            lastPolledAt: now,
          });

          await ShipmentRepository.appendTrackingEvent(shipment.orgId, shipment._id, {
            status: 'delayed',
            location: '',
            description: `Auto-detected delay: ${delayHours.toFixed(1)} hours past ETA (severity: ${delaySeverity})`,
            timestamp: now,
            source: 'system',
          });
        } else if (delayHours > 0 && ['delayed', 'rerouted'].includes(shipment.status)) {
          // Update delay metrics even if already delayed
          const { riskScore, riskTier, recommendations, shapValues } = await this.predictRiskScore({
            ...shipment.toObject(),
            delayHours,
            delaySeverity,
          }, shipment._id);

          await ShipmentRepository.update(shipment.orgId, shipment._id, {
            delayHours,
            delaySeverity,
            riskScore,
            riskTier,
            recommendations,
            shapValues,
            lastScoredAt: now,
            lastPolledAt: now,
          });
        } else {
          await ShipmentRepository.update(shipment.orgId, shipment._id, {
            lastPolledAt: now,
          });
        }
      } catch (err) {
        console.error(`[ShipmentPoller] Failed to poll shipment ${shipment._id}:`, err.message);
      }
    }
  }

  /**
   * Start the cron job for carrier API polling (every 15 minutes).
   */
  static startPollingCron() {
    cron.schedule('*/15 * * * *', async () => {
      console.log('[ShipmentPoller] Running delay detection scan...');
      try {
        await ShipmentService.pollAllActiveShipments();
        console.log('[ShipmentPoller] Scan complete.');
      } catch (err) {
        console.error('[ShipmentPoller] Scan failed:', err.message);
      }
    });
    console.log('[ShipmentPoller] Delay detection cron registered (every 15 min).');
  }

  static _statusDescription(status, notes) {
    const descriptions = {
      registered:  'Shipment registered in system',
      in_transit:  'Shipment picked up and in transit',
      delayed:     notes ? `Shipment delayed — ${notes}` : 'Shipment delayed',
      rerouted:    notes ? `Shipment rerouted — ${notes}` : 'Shipment rerouted to alternate path',
      delivered:   'Shipment delivered successfully',
      closed:      'Shipment case closed',
    };
    return descriptions[status] || status;
  }

  static async _updateSupplierOnDelivery(orgId, shipment, userId) {
    try {
      const supplier = await SupplierRepository.findById(orgId, shipment.supplierId.toString());
      if (!supplier) return;

      const wasOnTime  = shipment.delayHours < 2;
      const totalDeliveries = 10;
      const currentRate = supplier.onTimeDeliveryRate ?? 80;
      const newRate = Math.round(
        ((currentRate * (totalDeliveries - 1)) + (wasOnTime ? 100 : 0)) / totalDeliveries
      );
      const newAvgDelay = wasOnTime
        ? supplier.avgDelayDays
        : Math.round(((supplier.avgDelayDays ?? 0) * (totalDeliveries - 1) + (shipment.delayHours / 24)) / totalDeliveries * 10) / 10;

      await SupplierRepository.saveMetricsAdjustment(orgId, supplier._id.toString(), {
        metricUpdates: {
          onTimeDeliveryRate: newRate,
          avgDelayDays: newAvgDelay,
        },
        adjustmentEntry: {
          adjustedBy:      userId,
          adjustedByName:  'System',
          adjustedByEmail: '',
          adjustedByRole:  'SYSTEM',
          source:          'auto_shipment',
          shipmentId:      shipment._id,
          reason:          `Auto-updated from shipment delivery: ${shipment.shipmentNumber} (${wasOnTime ? 'on time' : `${shipment.delayHours}h delay`})`,
          changes: {
            onTimeDeliveryRate: { old: currentRate, new: newRate },
            avgDelayDays:       { old: supplier.avgDelayDays ?? 0, new: newAvgDelay },
          },
          adjustedAt: new Date(),
        },
      });
    } catch (err) {
      console.error('[ShipmentService] Failed to update supplier on delivery:', err.message);
    }
  }
}
