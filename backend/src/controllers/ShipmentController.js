/**
 * ShipmentController.js — HTTP Request Handlers for Shipment Routes
 *
 * Responsibility:
 *   Handles all incoming HTTP requests on /api/shipments/* routes.
 *   Extracts data from the request, delegates to ShipmentService,
 *   and returns the structured HTTP response.
 *
 *   Controllers contain NO business logic — all processing happens
 *   in ShipmentService and ShipmentRepository.
 *
 *   Routes handled:
 *   GET    /api/shipments                          → listShipments
 *   POST   /api/shipments                          → createShipment
 *   GET    /api/shipments/:shipmentId              → getShipment
 *   PUT    /api/shipments/:shipmentId              → updateShipment
 *   PATCH  /api/shipments/:shipmentId/status       → updateStatus
 *   GET    /api/shipments/:shipmentId/tracking     → getTrackingEvents
 */

import { ShipmentService } from '../services/ShipmentService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class ShipmentController {

  /**
   * listShipments
   * GET /api/shipments
   * Returns a paginated list of shipments for the authenticated org.
   * Supports optional query params: search, status, carrier, skip, limit.
   */
  static listShipments = asyncHandler(async (req, res) => {
    const { search, status, carrier, skip = 0, limit = 50 } = req.query;

    const result = await ShipmentService.listShipments(req.user.orgId, {
      search,
      status,
      carrier,
      skip: parseInt(skip) || 0,
      limit: parseInt(limit) || 50,
    });

    res.json(result);
  });

  /**
   * createShipment
   * POST /api/shipments
   * Registers a new shipment for the org and computes its initial risk score.
   * If a supplierId is provided, the linked supplier's metrics may be auto-updated.
   * Returns the saved shipment document with HTTP 201 Created.
   */
  static createShipment = asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.createShipment(
      req.user.orgId,
      req.body,
      req.user.userId
    );

    res.status(201).json({ message: 'Shipment registered successfully', shipment });
  });

  /**
   * getShipment
   * GET /api/shipments/:shipmentId
   * Fetches a single shipment's full details including tracking events and status history.
   * Used by the Shipment Detail page.
   */
  static getShipment = asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.getShipment(
      req.user.orgId,
      req.params.shipmentId
    );
    res.json({ shipment });
  });

  /**
   * updateShipment
   * PUT /api/shipments/:shipmentId
   * Updates shipment fields (e.g. carrier, weight, estimatedDelivery).
   * Triggers risk score recalculation if risk-relevant inputs change.
   * Returns the fully updated shipment document.
   */
  static updateShipment = asyncHandler(async (req, res) => {
    const shipment = await ShipmentService.updateShipment(
      req.user.orgId,
      req.params.shipmentId,
      req.body,
      req.user.userId
    );

    res.json({ message: 'Shipment updated successfully', shipment });
  });

  /**
   * updateStatus
   * PATCH /api/shipments/:shipmentId/status
   * Advances the shipment through the status workflow state machine.
   * Valid transitions: registered → in_transit → delayed|rerouted → delivered → closed.
   * An optional notes parameter is stored in the statusHistory array.
   *
   * When a shipment is marked 'delivered', the linked supplier's onTimeDeliveryRate
   * and avgDelayDays metrics may be auto-updated by the service layer.
   */
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

  /**
   * getTrackingEvents
   * GET /api/shipments/:shipmentId/tracking
   * Returns the ordered array of tracking events for a shipment.
   * Used to render the delivery timeline on the Shipment Detail page.
   */
  static getTrackingEvents = asyncHandler(async (req, res) => {
    const events = await ShipmentService.getTrackingEvents(
      req.user.orgId,
      req.params.shipmentId
    );
    res.json({ events });
  });
}
