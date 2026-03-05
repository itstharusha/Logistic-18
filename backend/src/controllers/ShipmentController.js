import { ShipmentService } from '../services/ShipmentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class ShipmentController {
  // GET /api/shipments
  static listShipments = asyncHandler(async (req, res) => {
    const { search, status, carrier, skip = 0, limit = 50 } = req.query;

    const result = await ShipmentService.listShipments(req.user.orgId, {
      search,
      status,
      carrier,
      skip:  parseInt(skip)  || 0,
      limit: parseInt(limit) || 50,
    });

    res.json(result);
  });

  // POST /api/shipments
  static createShipment = asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.createShipment(
      req.user.orgId,
      req.body,
      req.user.userId
    );

    res.status(201).json({ message: 'Shipment registered successfully', shipment });
  });

  // GET /api/shipments/:shipmentId
  static getShipment = asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.getShipment(
      req.user.orgId,
      req.params.shipmentId
    );
    res.json({ shipment });
  });

  // PUT /api/shipments/:shipmentId
  static updateShipment = asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.updateShipment(
      req.user.orgId,
      req.params.shipmentId,
      req.body,
      req.user.userId
    );

    res.json({ message: 'Shipment updated successfully', shipment });
  });

  // PATCH /api/shipments/:shipmentId/status
  static updateStatus = asyncHandler(async (req, res) => {
    const { status, notes } = req.body;

    const shipment = await ShipmentService.updateStatus(
      req.user.orgId,
      req.params.shipmentId,
      status,
      req.user.userId,
      notes || ''
    );

    res.json({ message: 'Shipment status updated', shipment });
  });

  // GET /api/shipments/:shipmentId/tracking
  static getTrackingEvents = asyncHandler(async (req, res) => {
    const events = await ShipmentService.getTrackingEvents(
      req.user.orgId,
      req.params.shipmentId
    );
    res.json({ events });
  });
}
