import cron from 'node-cron';
import { ShipmentRepository } from '../repositories/ShipmentRepository.js';
import { SupplierRepository } from '../repositories/SupplierRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import AuditLog from '../models/AuditLog.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

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
    const { riskScore, riskTier } = this.computeRiskScore(shipmentData);

    const shipment = await ShipmentRepository.create({
      ...shipmentData,
      riskScore,
      riskTier,
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
    const { riskScore, riskTier } = this.computeRiskScore(merged);

    const updated = await ShipmentRepository.update(orgId, shipmentId, {
      ...data,
      delayHours,
      delaySeverity,
      riskScore,
      riskTier,
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
    const { riskScore, riskTier } = this.computeRiskScore(merged);
    updates.riskScore    = riskScore;
    updates.riskTier     = riskTier;
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
          const { riskScore, riskTier } = this.computeRiskScore({
            ...shipment.toObject(),
            status: 'delayed',
            delayHours,
            delaySeverity,
          });

          await ShipmentRepository.update(shipment.orgId, shipment._id, {
            status: 'delayed',
            delayHours,
            delaySeverity,
            riskScore,
            riskTier,
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
          const { riskScore, riskTier } = this.computeRiskScore({
            ...shipment.toObject(),
            delayHours,
            delaySeverity,
          });

          await ShipmentRepository.update(shipment.orgId, shipment._id, {
            delayHours,
            delaySeverity,
            riskScore,
            riskTier,
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
