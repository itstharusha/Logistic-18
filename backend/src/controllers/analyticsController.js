import analyticsService from '../services/analyticsService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import Report from '../models/Report.js';

export const getKpiDrilldown = asyncHandler(async (req, res) => {
  const { type, days } = req.query;
  const data = await analyticsService.getKpiDrilldown(req.user.orgId, type, days);
  res.status(200).json(data);
});

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardInfo(req.user.orgId);
  res.status(200).json({ status: 'success', data });
});

export const getSupplierPerformance = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSupplierPerformance(req.user.orgId, req.query);
  res.status(200).json({ status: 'success', data });
});

export const getShipmentDelays = asyncHandler(async (req, res) => {
  const data = await analyticsService.getShipmentDelays(req.user.orgId, req.query);
  res.status(200).json({ status: 'success', data });
});

export const getInventoryRisk = asyncHandler(async (req, res) => {
  const data = await analyticsService.getInventoryRisk(req.user.orgId, req.query);
  res.status(200).json({ status: 'success', data });
});

export const getAlertSummary = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAlertSummary(req.user.orgId, req.query);
  res.status(200).json({ status: 'success', data });
});

export const generateReport = asyncHandler(async (req, res) => {
  const { type, format, module, severity, include, dateRange } = req.validatedBody || req.body;
  const orgId = req.user.orgId;

  const newReport = await Report.create({
    orgId,
    createdBy: req.user.userId,
    type,
    format,
    module,
    severity,
    include,
    dateRange
  });

  res.status(200).json({
    reportId: newReport._id,
    type: newReport.type,
    format: newReport.format,
    dateRange: newReport.dateRange,
    generatedAt: newReport.createdAt
  });
});

export const downloadReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const orgId = req.user.orgId;

  const report = await Report.findOne({ _id: reportId, orgId });
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  let data = [];
  let title = `${report.module} Report`;
  let filters = report.dateRange ? { startDate: report.dateRange.from, endDate: report.dateRange.to } : {};

  switch (report.module) {
    case 'dashboard':
    case 'overall':
      data = [await analyticsService.getDashboardInfo(orgId)];
      break;
    case 'supplier_risk':
      data = await analyticsService.getSupplierPerformance(orgId, filters);
      break;
    case 'shipments':
    case 'shipment_tracking':
      data = await analyticsService.getShipmentDelays(orgId, filters);
      break;
    case 'inventory':
      data = await analyticsService.getInventoryRisk(orgId, filters);
      break;
    case 'alerts':
      data = await analyticsService.getAlertSummary(orgId, filters);
      break;
    default:
      data = [];
  }

  if (report.format === 'csv') {
    const csvStr = analyticsService.generateCSV(title, data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${report.module}_report.csv"`);
    return res.status(200).send(csvStr);
  } else if (report.format === 'pdf') {
    const pdfBuffer = await analyticsService.generatePDF(title, data, report.module);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.module}_report.pdf"`);
    return res.status(200).send(pdfBuffer);
  } else {
    return res.status(400).json({ error: 'Invalid format. Use "csv" or "pdf"' });
  }
});
