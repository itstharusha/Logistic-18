/**
 * DataQualityController
 * Exposes data quality metrics and reports via API
 * Used for monitoring dashboards and operational visibility
 */

import { getDataQualityService } from '../services/DataQualityService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class DataQualityController {
  /**
   * GET /api/data-quality/metrics
   * Returns current data quality metrics and health status
   */
  static getMetrics = asyncHandler(async (req, res) => {
    const dqService = getDataQualityService();
    const metrics = dqService.getMetrics();
    res.json(metrics);
  });

  /**
   * GET /api/data-quality/health
   * Returns simplified health status
   */
  static getHealth = asyncHandler(async (req, res) => {
    const dqService = getDataQualityService();
    const metrics = dqService.getMetrics();
    res.json({
      status: metrics.health.status,
      issues: metrics.health.issues,
      lastChecked: metrics.timestamp,
    });
  });

  /**
   * GET /api/data-quality/coercions
   * Returns coercion statistics by entity type and field
   */
  static getCoercions = asyncHandler(async (req, res) => {
    const dqService = getDataQualityService();
    const stats = dqService.getCoercionStats();
    res.json(stats);
  });

  /**
   * GET /api/data-quality/validations
   * Returns validation failure statistics
   */
  static getValidations = asyncHandler(async (req, res) => {
    const dqService = getDataQualityService();
    const stats = dqService.getValidationStats();
    res.json(stats);
  });

  /**
   * GET /api/data-quality/report
   * Generates a data quality report for a specified period
   * Query params: hours (default 24)
   */
  static getReport = asyncHandler(async (req, res) => {
    const { hours = 24 } = req.query;
    const dqService = getDataQualityService();
    const report = dqService.generateReport(parseInt(hours));
    res.json(report);
  });

  /**
   * GET /api/data-quality/summary
   * Returns one-line data quality summary
   */
  static getSummary = asyncHandler(async (req, res) => {
    const dqService = getDataQualityService();
    const metrics = dqService.getMetrics();
    const stats = dqService.getCoercionStats();
    const validationStats = dqService.getValidationStats();

    const totalCoercions = metrics.summary.totalCoercions;
    const totalValidationFailures = metrics.summary.totalValidationFailures;
    const totalPredictions = metrics.summary.totalPredictions;

    const coercionRate = ((totalCoercions / Math.max(1, totalPredictions)) * 100).toFixed(1);
    const healthStatus = metrics.health.status;

    res.json({
      status: healthStatus,
      summary: `${totalPredictions} predictions | ${totalCoercions} coercions (${coercionRate}%) | ${totalValidationFailures} validation failures | ${metrics.summary.mlServiceErrors} ML errors`,
      timestamp: new Date(),
    });
  });
}
