/**
 * Data Quality Service
 * Monitors ML data pipeline health and identifies anomalies
 * Tracks type coercions, validation failures, and data inconsistencies
 */

class DataQualityService {
  constructor() {
    this.metrics = {
      coercions: 0,
      coercionWarnings: [],
      validationFailures: 0,
      validationErrors: [],
      predictions: {
        supplier: 0,
        shipment: 0,
        inventory: 0,
      },
      mlServiceErrors: 0,
      lastChecked: new Date(),
    };
  }

  /**
   * Record a coercion event (data type conversion before DB save)
   */
  recordCoercion(entityType, entityId, fieldName, originalValue, coercedValue, reason) {
    this.metrics.coercions++;
    this.metrics.coercionWarnings.push({
      timestamp: new Date(),
      entityType,
      entityId,
      fieldName,
      originalValue,
      coercedValue,
      reason,
      severity: this._assessSeverity(originalValue, coercedValue),
    });

    // Keep only last 1000 coercions for memory efficiency
    if (this.metrics.coercionWarnings.length > 1000) {
      this.metrics.coercionWarnings = this.metrics.coercionWarnings.slice(-1000);
    }

    console.warn(`[DataQuality] Coercion: ${entityType}/${entityId} - ${fieldName}: "${originalValue}" → "${coercedValue}" (${reason})`);
  }

  /**
   * Record a validation failure
   */
  recordValidationFailure(entityType, entityId, errors) {
    this.metrics.validationFailures++;
    this.metrics.validationErrors.push({
      timestamp: new Date(),
      entityType,
      entityId,
      errors,
      errorCount: errors.length,
    });

    // Keep only last 1000 validation failures
    if (this.metrics.validationErrors.length > 1000) {
      this.metrics.validationErrors = this.metrics.validationErrors.slice(-1000);
    }

    console.warn(`[DataQuality] Validation failure: ${entityType}/${entityId} - ${errors.join('; ')}`);
  }

  /**
   * Record a successful prediction
   */
  recordPrediction(entityType) {
    if (this.metrics.predictions[entityType]) {
      this.metrics.predictions[entityType]++;
    }
  }

  /**
   * Record ML service error
   */
  recordMLServiceError() {
    this.metrics.mlServiceErrors++;
    console.error(`[DataQuality] ML service error - Total: ${this.metrics.mlServiceErrors}`);
  }

  /**
   * Get data quality dashboard metrics
   */
  getMetrics() {
    const now = new Date();
    const uptime = now - this.metrics.lastChecked;

    return {
      timestamp: now,
      uptime,
      summary: {
        totalCoercions: this.metrics.coercions,
        totalValidationFailures: this.metrics.validationFailures,
        totalPredictions: Object.values(this.metrics.predictions).reduce((a, b) => a + b, 0),
        mlServiceErrors: this.metrics.mlServiceErrors,
      },
      predictions: this.metrics.predictions,
      recentCoercions: this.metrics.coercionWarnings.slice(-10),
      recentValidationErrors: this.metrics.validationErrors.slice(-10),
      health: this._assessHealth(),
    };
  }

  /**
   * Get coercion statistics by entity type
   */
  getCoercionStats() {
    const stats = {};

    this.metrics.coercionWarnings.forEach(warning => {
      if (!stats[warning.entityType]) {
        stats[warning.entityType] = {
          count: 0,
          warnings: {},
          criticalCount: 0,
        };
      }

      stats[warning.entityType].count++;
      if (warning.severity === 'critical') {
        stats[warning.entityType].criticalCount++;
      }

      const key = `${warning.fieldName}`;
      if (!stats[warning.entityType].warnings[key]) {
        stats[warning.entityType].warnings[key] = 0;
      }
      stats[warning.entityType].warnings[key]++;
    });

    return stats;
  }

  /**
   * Get validation failure statistics
   */
  getValidationStats() {
    const stats = {};

    this.metrics.validationErrors.forEach(failure => {
      if (!stats[failure.entityType]) {
        stats[failure.entityType] = {
          count: 0,
          errors: {},
          criticalCount: 0,
        };
      }

      stats[failure.entityType].count++;
      if (failure.errorCount >= 3) {
        stats[failure.entityType].criticalCount++;
      }

      failure.errors.forEach(error => {
        if (!stats[failure.entityType].errors[error]) {
          stats[failure.entityType].errors[error] = 0;
        }
        stats[failure.entityType].errors[error]++;
      });
    });

    return stats;
  }

  /**
   * Check if system is healthy
   * RED: Critical issues, YELLOW: Warnings, GREEN: Healthy
   */
  _assessHealth() {
    const coercionRate = this.metrics.coercions / Math.max(1, this.metrics.predictions.supplier + this.metrics.predictions.shipment + this.metrics.predictions.inventory);
    const validationFailureRate = this.metrics.validationFailures / Math.max(1, this.metrics.coercions);
    const mlErrorRate = this.metrics.mlServiceErrors / Math.max(1, this.metrics.predictions.supplier + this.metrics.predictions.shipment + this.metrics.predictions.inventory);

    let status = 'GREEN';
    const issues = [];

    // Check coercion rate (> 20% = warning)
    if (coercionRate > 0.2) {
      status = 'YELLOW';
      issues.push(`High coercion rate: ${(coercionRate * 100).toFixed(1)}%`);
    }

    // Check validation failures (> 5% = warning)
    if (validationFailureRate > 0.05) {
      status = 'YELLOW';
      issues.push(`High validation failure rate: ${(validationFailureRate * 100).toFixed(1)}%`);
    }

    // Check ML errors (any = warning, > 5% = critical)
    if (mlErrorRate > 0.05) {
      status = 'RED';
      issues.push(`Critical ML service error rate: ${(mlErrorRate * 100).toFixed(1)}%`);
    } else if (this.metrics.mlServiceErrors > 0) {
      status = 'YELLOW';
      issues.push(`ML service errors detected: ${this.metrics.mlServiceErrors}`);
    }

    // Check for critical coercions
    const criticalCoercions = this.metrics.coercionWarnings.filter(w => w.severity === 'critical').length;
    if (criticalCoercions > 5) {
      status = 'RED';
      issues.push(`Critical type coercions: ${criticalCoercions}`);
    } else if (criticalCoercions > 0) {
      status = 'YELLOW';
      issues.push(`Critical type coercions: ${criticalCoercions}`);
    }

    return { status, issues, rates: { coercion: coercionRate, validation: validationFailureRate, mlError: mlErrorRate } };
  }

  /**
   * Assess severity of a data coercion
   */
  _assessSeverity(originalValue, coercedValue) {
    // Severity levels: 'low', 'medium', 'high', 'critical'

    // NaN → 0 is critical data loss
    if (isNaN(originalValue) && !isNaN(coercedValue)) {
      return 'critical';
    }

    // Empty string → 0 is high (might indicate missing data)
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return 'high';
    }

    // Type mismatch (string to number) is medium
    if (typeof originalValue !== typeof coercedValue) {
      return 'medium';
    }

    // Value out of range is low/medium
    if (originalValue !== coercedValue) {
      return 'low';
    }

    return 'low';
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      coercions: 0,
      coercionWarnings: [],
      validationFailures: 0,
      validationErrors: [],
      predictions: {
        supplier: 0,
        shipment: 0,
        inventory: 0,
      },
      mlServiceErrors: 0,
      lastChecked: new Date(),
    };
  }

  /**
   * Generate report for specific period
   */
  generateReport(periodHours = 24) {
    const cutoff = new Date(Date.now() - periodHours * 60 * 60 * 1000);

    const recentCoercions = this.metrics.coercionWarnings.filter(w => w.timestamp > cutoff);
    const recentValidationErrors = this.metrics.validationErrors.filter(e => e.timestamp > cutoff);

    return {
      period: `Last ${periodHours} hours`,
      generatedAt: new Date(),
      coercions: {
        total: recentCoercions.length,
        bySeverity: {
          low: recentCoercions.filter(c => c.severity === 'low').length,
          medium: recentCoercions.filter(c => c.severity === 'medium').length,
          high: recentCoercions.filter(c => c.severity === 'high').length,
          critical: recentCoercions.filter(c => c.severity === 'critical').length,
        },
      },
      validationFailures: {
        total: recentValidationErrors.length,
        avgErrorsPerFailure: recentValidationErrors.length > 0
          ? (recentValidationErrors.reduce((sum, e) => sum + e.errorCount, 0) / recentValidationErrors.length).toFixed(2)
          : 0,
      },
      recommendations: this._generateRecommendations(recentCoercions, recentValidationErrors),
    };
  }

  /**
   * Generate actionable recommendations based on data quality issues
   */
  _generateRecommendations(recentCoercions, recentValidationErrors) {
    const recommendations = [];

    // Analyze critical coercions
    const criticalCoercions = recentCoercions.filter(c => c.severity === 'critical');
    if (criticalCoercions.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: `${criticalCoercions.length} critical data coercions detected. Investigate data source quality.`,
        action: 'Review recent data imports and API integrations for NaN/null values.',
      });
    }

    // Analyze validation failures
    if (recentValidationErrors.length > recentCoercions.length * 0.1) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Validation failure rate is high relative to coercions.',
        action: 'Review frontend validation rules - data should be validated before reaching backend.',
      });
    }

    // Analyze coercion patterns
    const coercionByField = {};
    recentCoercions.forEach(c => {
      if (!coercionByField[c.fieldName]) coercionByField[c.fieldName] = 0;
      coercionByField[c.fieldName]++;
    });

    const problematicFields = Object.entries(coercionByField)
      .filter(([_, count]) => count > 5)
      .map(([field, count]) => `${field} (${count} times)`);

    if (problematicFields.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        message: `Frequent coercions on fields: ${problematicFields.join(', ')}`,
        action: 'Review data schema and form validation for these fields.',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'LOW',
        message: 'Data quality is good - no critical issues detected.',
        action: 'Continue monitoring.',
      });
    }

    return recommendations;
  }
}

// Singleton instance
let instance = null;

export function getDataQualityService() {
  if (!instance) {
    instance = new DataQualityService();
  }
  return instance;
}

export { DataQualityService };
