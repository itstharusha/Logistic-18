/**
 * SupplierController.js — HTTP Request Handlers for Supplier Routes
 *
 * Responsibility:
 *   Handles all incoming HTTP requests on /api/suppliers/* routes.
 *   Extracts parameters from the request, delegates to SupplierService,
 *   and returns the appropriate HTTP response.
 *
 *   Controllers contain NO business logic — all calculations, validations,
 *   and database interactions happen in SupplierService and SupplierRepository.
 *
 *   Routes handled:
 *   GET    /api/suppliers              → listSuppliers
 *   POST   /api/suppliers              → createSupplier
 *   GET    /api/suppliers/:id          → getSupplier
 *   PUT    /api/suppliers/:id          → updateSupplier
 *   POST   /api/suppliers/compare      → compareSuppliers
 *   GET    /api/suppliers/:id/history  → getRiskHistory
 *   POST   /api/suppliers/:id/override-score    → overrideScore
 *   POST   /api/suppliers/:id/update-metrics    → updateMetrics
 *   PATCH  /api/suppliers/:id/status            → updateStatus
 */

import { SupplierService } from '../services/SupplierService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class SupplierController {

  /**
   * listSuppliers
   * GET /api/suppliers
   * Returns a paginated list of suppliers for the authenticated user's org.
   * Supports optional query params: search, status, tier, skip, limit.
   */
  static listSuppliers = asyncHandler(async (req, res) => {
    const { search, status, tier, skip = 0, limit = 50 } = req.query;

    const result = await SupplierService.listSuppliers(req.user.orgId, {
      search,
      status,
      tier,
      skip: parseInt(skip) || 0,
      limit: parseInt(limit) || 50,
    });

    res.json(result);
  });

  /**
   * createSupplier
   * POST /api/suppliers
   * Registers a new supplier for the org and computes its initial risk score.
   * Returns the saved supplier document with HTTP 201 Created.
   */
  static createSupplier = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.createSupplier(
      req.user.orgId,
      req.body,
      req.user.userId
    );

    res.status(201).json({ message: 'Supplier registered successfully', supplier });
  });

  /**
   * getSupplier
   * GET /api/suppliers/:id
   * Fetches a single supplier's full profile including all history arrays.
   * Used by the Supplier Detail page.
   */
  static getSupplier = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.getSupplier(req.user.orgId, req.params.id);
    res.json({ supplier });
  });

  /**
   * updateSupplier
   * PUT /api/suppliers/:id
   * Updates supplier profile fields and recalculates the risk score.
   * If the score changes, a new riskHistory snapshot is added atomically.
   * Returns the fully updated supplier document.
   */
  static updateSupplier = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.updateSupplier(
      req.user.orgId,
      req.params.id,
      req.body,
      req.user.userId
    );

    res.json({ message: 'Supplier updated successfully', supplier });
  });

  /**
   * compareSuppliers
   * POST /api/suppliers/compare
   * Fetches multiple suppliers by their IDs for side-by-side comparison.
   * Expects { ids: [...] } in the request body.
   */
  static compareSuppliers = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const suppliers = await SupplierService.compareSuppliers(req.user.orgId, ids);
    res.json({ suppliers });
  });

  /**
   * getRiskHistory
   * GET /api/suppliers/:id/history
   * Returns the supplier's riskHistory array (timestamped score snapshots).
   * Used to render the "Risk Score History" line chart on the detail page.
   */
  static getRiskHistory = asyncHandler(async (req, res) => {
    const history = await SupplierService.getRiskHistory(req.user.orgId, req.params.id);
    res.json({ history });
  });

  /**
   * overrideScore
   * POST /api/suppliers/:id/override-score
   * Allows a RISK_ANALYST or ORG_ADMIN to manually set the supplier's risk score.
   * Requires a justification string for audit purposes.
   * Records the override in both overrideHistory and riskHistory atomically.
   */
  static overrideScore = asyncHandler(async (req, res) => {
    const { newScore, justification } = req.body;

    const supplier = await SupplierService.overrideScore(
      req.user.orgId,
      req.params.id,
      req.user.userId,
      newScore,
      justification
    );

    res.json({ message: 'Risk score overridden successfully', supplier });
  });

  /**
   * updateMetrics
   * POST /api/suppliers/:id/update-metrics
   * Adjusts one or more performance metrics (onTimeDeliveryRate, defectRate, etc.)
   * and recalculates the risk score. If the score changes, a new riskHistory snapshot
   * is added. All changes are logged to metricsAdjustmentHistory.
   *
   * Can be triggered manually by an analyst or automatically by the shipment completion
   * flow (source: 'auto_shipment').
   */
  static updateMetrics = asyncHandler(async (req, res) => {
    const {
      onTimeDeliveryRate, defectRate, disputeFrequency,
      avgDelayDays, financialScore, yearsInBusiness, contractValue,
      reason, source, shipmentId,
    } = req.body;

    const supplier = await SupplierService.updateMetrics(
      req.user.orgId,
      req.params.id,
      req.user.userId,
      {
        onTimeDeliveryRate, defectRate, disputeFrequency, avgDelayDays,
        financialScore, yearsInBusiness, contractValue, reason, source, shipmentId
      }
    );

    res.json({ message: 'Supplier metrics updated successfully', supplier });
  });

  /**
   * updateStatus
   * PATCH /api/suppliers/:id/status
   * Updates the supplier's operational status (active/under_watch/high_risk/suspended).
   * Validates against the allowed status enum in SupplierService.
   */
  static updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const supplier = await SupplierService.updateStatus(
      req.user.orgId,
      req.params.id,
      status,
      req.user.userId
    );

    res.json({ message: 'Supplier status updated', supplier });
  });
}
