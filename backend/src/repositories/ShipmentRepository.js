import Shipment from '../models/Shipment.js';

export class ShipmentRepository {
  static async findAll(orgId, { search, status, carrier, skip = 0, limit = 50 } = {}) {
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (carrier && carrier !== 'all') query.carrier = carrier;
    if (search) {
      query.$or = [
        { shipmentNumber:    { $regex: search, $options: 'i' } },
        { trackingNumber:    { $regex: search, $options: 'i' } },
        { originCity:        { $regex: search, $options: 'i' } },
        { destinationCity:   { $regex: search, $options: 'i' } },
        { originCountry:     { $regex: search, $options: 'i' } },
        { destinationCountry: { $regex: search, $options: 'i' } },
        { description:       { $regex: search, $options: 'i' } },
      ];
    }

    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .populate('supplierId', 'name country')
        .populate('inventoryItemId', 'sku productName')
        .populate('originWarehouseId', 'code name location')
        .populate('destinationWarehouseId', 'code name location')
        .populate('warehouseTransferId', 'transferNumber status'),
      Shipment.countDocuments(query),
    ]);

    return { shipments, total };
  }

  static async findById(orgId, shipmentId) {
    return Shipment.findById(shipmentId)
      .populate('supplierId', 'name country riskTier')
      .populate('createdBy', 'name email role')
      .populate('inventoryItemId', 'sku productName currentStock')
      .populate('originWarehouseId', 'code name location')
      .populate('destinationWarehouseId', 'code name location')
      .populate('warehouseTransferId', 'transferNumber status quantity');
  }

  static async getNextShipmentNumber(orgId) {
    const year = new Date().getFullYear();
    const prefix = `SHP-${year}-`;
    const count = await Shipment.countDocuments({
      shipmentNumber: { $regex: `^${prefix}` },
    });
    const seq = String(count + 1).padStart(3, '0');
    return `${prefix}${seq}`;
  }

  static async create(data) {
    const shipment = new Shipment(data);
    return shipment.save();
  }

  static async update(orgId, shipmentId, data) {
    return Shipment.findByIdAndUpdate(
      shipmentId,
      { $set: { ...data, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
  }

  static async updateWithOptimisticLock(orgId, shipmentId, expectedVersion, data) {
    const result = await Shipment.findOneAndUpdate(
      { _id: shipmentId, version: expectedVersion },
      {
        $set: { ...data, updatedAt: new Date() },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    );
    return result;
  }

  static async appendTrackingEvent(orgId, shipmentId, event) {
    return Shipment.findByIdAndUpdate(
      shipmentId,
      {
        $push: { trackingEvents: event },
        $set: { updatedAt: new Date(), lastPolledAt: new Date() },
      },
      { new: true }
    );
  }

  static async appendStatusHistory(orgId, shipmentId, entry) {
    return Shipment.findByIdAndUpdate(
      shipmentId,
      { $push: { statusHistory: entry } },
      { new: true }
    );
  }

  static async appendRiskSnapshot(orgId, shipmentId, snapshot) {
    return Shipment.findByIdAndUpdate(
      shipmentId,
      { $push: { riskHistory: snapshot } },
      { new: true }
    );
  }

  /**
   * Atomically updates status fields AND appends to all three history arrays
   * in a single findOneAndUpdate call.
   */
  static async updateStatusWithHistory(orgId, shipmentId, fields, statusEntry, trackingEntry, riskEntry) {
    return Shipment.findByIdAndUpdate(
      shipmentId,
      {
        $set:  { ...fields, updatedAt: new Date() },
        $push: {
          statusHistory:  statusEntry,
          trackingEvents: trackingEntry,
          riskHistory:    riskEntry,
        },
      },
      { new: true, runValidators: true }
    );
  }

  static async findActiveShipments() {
    return Shipment.find({
      status: { $in: ['registered', 'in_transit', 'delayed', 'rerouted'] },
    });
  }

  /**
   * Count all shipments for a supplier (for ML feature: totalShipments)
   */
  static async countBySupplier(supplierId) {
    if (!supplierId) return 0;
    try {
      return await Shipment.countDocuments({ supplierId });
    } catch (error) {
      console.error(`[ShipmentRepository] Error counting shipments for supplier ${supplierId}:`, error.message);
      return 0;
    }
  }

  /**
   * Count active shipments for a supplier (for ML feature: activeShipmentCount)
   */
  static async countBySupplierAndStatus(supplierId, statusArray = ['registered', 'in_transit', 'delayed', 'rerouted']) {
    if (!supplierId) return 0;
    try {
      return await Shipment.countDocuments({
        supplierId,
        status: { $in: statusArray },
      });
    } catch (error) {
      console.error(`[ShipmentRepository] Error counting active shipments for supplier ${supplierId}:`, error.message);
      return 0;
    }
  }

  /**
   * Get the date of the most recent shipment for a supplier
   */
  static async getLastShipmentDate(supplierId) {
    if (!supplierId) return null;
    try {
      const result = await Shipment.findOne({ supplierId })
        .sort({ createdAt: -1 })
        .select('createdAt');
      return result?.createdAt || null;
    } catch (error) {
      console.error(`[ShipmentRepository] Error getting last shipment date for supplier ${supplierId}:`, error.message);
      return null;
    }
  }

  /**
   * Get carrier reliability score based on historical on-time delivery rate
   */
  static async getCarrierReliability(carrier) {
    if (!carrier || carrier === 'Other') return 0.5;
    try {
      const total = await Shipment.countDocuments({ carrier });
      if (total === 0) return 0.5;
      
      const onTime = await Shipment.countDocuments({
        carrier,
        status: { $in: ['delivered', 'closed'] },
        delayHours: { $lte: 0 }
      });
      
      const onTimeRate = onTime / total;
      return Math.max(0, Math.min(1, onTimeRate));
    } catch (error) {
      console.error(`[ShipmentRepository] Error calculating carrier reliability for ${carrier}:`, error.message);
      return 0.5;
    }
  }

  /**
   * Get average delay rate for a specific carrier
   */
  static async getCarrierDelayRate(carrier) {
    if (!carrier || carrier === 'Other') return 0.15;
    try {
      const total = await Shipment.countDocuments({ 
        carrier,
        status: { $in: ['delivered', 'closed'] }
      });
      
      if (total === 0) return 0.15;
      
      const delayedCount = await Shipment.countDocuments({
        carrier,
        status: { $in: ['delivered', 'closed'] },
        delayHours: { $gt: 0 }
      });
      
      const delayRate = delayedCount / total;
      return Math.max(0, Math.min(1, delayRate));
    } catch (error) {
      console.error(`[ShipmentRepository] Error calculating carrier delay rate for ${carrier}:`, error.message);
      return 0.15;
    }
  }

  /**
   * Calculate route risk index based on geopolitical factors
   */
  static calculateRouteRisk(originCountry, destinationCountry) {
    const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Venezuela'];
    const mediumRiskCountries = ['Pakistan', 'Afghanistan', 'Yemen', 'Somalia', 'Sudan'];
    
    let riskScore = 0;
    
    if (highRiskCountries.includes(originCountry) || highRiskCountries.includes(destinationCountry)) {
      riskScore = 0.8;
    } else if (mediumRiskCountries.includes(originCountry) || mediumRiskCountries.includes(destinationCountry)) {
      riskScore = 0.4;
    }
    
    if (originCountry && destinationCountry && originCountry !== destinationCountry) {
      riskScore = Math.max(riskScore, 0.3);
    }
    
    return Math.min(1, riskScore);
  }

  /**
   * Calculate maximum gap duration between tracking events
   */
  static calculateTrackingGapHours(trackingEvents) {
    if (!trackingEvents || trackingEvents.length < 2) return 0;
    
    try {
      let maxGapHours = 0;
      for (let i = 1; i < trackingEvents.length; i++) {
        const prevTime = new Date(trackingEvents[i - 1].timestamp);
        const currTime = new Date(trackingEvents[i].timestamp);
        const gapMs = currTime - prevTime;
        const gapHours = gapMs / (1000 * 60 * 60);
        maxGapHours = Math.max(maxGapHours, gapHours);
      }
      return Math.round(maxGapHours);
    } catch (error) {
      console.error(`[ShipmentRepository] Error calculating tracking gaps:`, error.message);
      return 0;
    }
  }

  /**
   * Calculate days in transit from estimated vs actual delivery
   */
  static calculateDaysInTransit(estimatedDelivery, actualDelivery) {
    try {
      if (!estimatedDelivery || !actualDelivery) return 0;
      
      const estDate = new Date(estimatedDelivery);
      const actDate = new Date(actualDelivery);
      const daysDiff = Math.round((actDate - estDate) / (1000 * 60 * 60 * 24));
      
      return Math.max(0, daysDiff);
    } catch (error) {
      console.error(`[ShipmentRepository] Error calculating days in transit:`, error.message);
      return 0;
    }
  }
}
