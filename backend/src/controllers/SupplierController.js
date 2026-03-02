import { SupplierService } from '../services/SupplierService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class SupplierController {
  // GET /api/suppliers
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

  // POST /api/suppliers
  static createSupplier = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.createSupplier(
      req.user.orgId,
      req.body,
      req.user.userId
    );

    res.status(201).json({ message: 'Supplier registered successfully', supplier });
  });

  // GET /api/suppliers/:id
  static getSupplier = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.getSupplier(req.user.orgId, req.params.id);
    res.json({ supplier });
  });

  // PUT /api/suppliers/:id
  static updateSupplier = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.updateSupplier(
      req.user.orgId,
      req.params.id,
      req.body,
      req.user.userId
    );

    res.json({ message: 'Supplier updated successfully', supplier });
  });

  // POST /api/suppliers/compare
  static compareSuppliers = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const suppliers = await SupplierService.compareSuppliers(req.user.orgId, ids);
    res.json({ suppliers });
  });

  // GET /api/suppliers/:id/history
  static getRiskHistory = asyncHandler(async (req, res) => {
    const history = await SupplierService.getRiskHistory(req.user.orgId, req.params.id);
    res.json({ history });
  });

  // POST /api/suppliers/:id/override-score
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

  // POST /api/suppliers/:id/update-metrics
  static updateMetrics = asyncHandler(async (req, res) => {
    const { onTimeDeliveryRate, defectRate, disputeFrequency, reason, source, shipmentId } = req.body;

    const supplier = await SupplierService.updateMetrics(
      req.user.orgId,
      req.params.id,
      req.user.userId,
      { onTimeDeliveryRate, defectRate, disputeFrequency, reason, source, shipmentId }
    );

    res.json({ message: 'Supplier metrics updated successfully', supplier });
  });

  // PATCH /api/suppliers/:id/status
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
