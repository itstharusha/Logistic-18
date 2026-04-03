import Shipment from '../models/Shipment.js';

export class ShipmentRepository {
  static async findAll(orgId, { search, status, carrier, skip = 0, limit = 50 } = {}) {
    const query = { orgId };

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
        .populate('supplierId', 'name country'),
      Shipment.countDocuments(query),
    ]);

    return { shipments, total };
  }

  static async findById(orgId, shipmentId) {
    return Shipment.findOne({ _id: shipmentId, orgId })
      .populate('supplierId', 'name country riskTier')
      .populate('createdBy', 'name email role');
  }

  static async getNextShipmentNumber(orgId) {
    const year = new Date().getFullYear();
    const prefix = `SHP-${year}-`;
    const count = await Shipment.countDocuments({
      orgId,
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
    return Shipment.findOneAndUpdate(
      { _id: shipmentId, orgId },
      { $set: { ...data, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
  }

  static async updateWithOptimisticLock(orgId, shipmentId, expectedVersion, data) {
    const result = await Shipment.findOneAndUpdate(
      { _id: shipmentId, orgId, version: expectedVersion },
      {
        $set: { ...data, updatedAt: new Date() },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    );
    return result;
  }

  static async appendTrackingEvent(orgId, shipmentId, event) {
    return Shipment.findOneAndUpdate(
      { _id: shipmentId, orgId },
      {
        $push: { trackingEvents: event },
        $set: { updatedAt: new Date(), lastPolledAt: new Date() },
      },
      { new: true }
    );
  }

  static async appendStatusHistory(orgId, shipmentId, entry) {
    return Shipment.findOneAndUpdate(
      { _id: shipmentId, orgId },
      { $push: { statusHistory: entry } },
      { new: true }
    );
  }

  static async appendRiskSnapshot(orgId, shipmentId, snapshot) {
    return Shipment.findOneAndUpdate(
      { _id: shipmentId, orgId },
      { $push: { riskHistory: snapshot } },
      { new: true }
    );
  }

  /**
   * Atomically updates status fields AND appends to all three history arrays
   * in a single findOneAndUpdate call, avoiding the $set/$push nesting bug.
   */
  static async updateStatusWithHistory(orgId, shipmentId, fields, statusEntry, trackingEntry, riskEntry) {
    return Shipment.findOneAndUpdate(
      { _id: shipmentId, orgId },
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
   * Active = not yet delivered or closed
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
   * Returns null if no shipments found
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
}
