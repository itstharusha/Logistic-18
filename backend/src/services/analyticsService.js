import mongoose from 'mongoose';
import { Supplier, Shipment, InventoryItem } from '../models/index.js';
import Alert from '../models/Alert.js';
import PDFDocument from 'pdfkit';

class AnalyticsService {
  /**
   * Dashboard (Risk Overview)
   * - Total suppliers
   * - High-risk suppliers
   * - Active alerts
   * - Recent shipments
   * - Risk distribution 
   * - Alert severity counts
   */
  async getDashboardInfo(orgId) {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);

    // 1. Supplier stats
    const supplierStats = await Supplier.aggregate([
      { $match: { orgId: orgIdObj } },
      {
        $facet: {
          total: [{ $count: 'count' }],
          highRisk: [{ $match: { riskTier: 'High' } }, { $count: 'count' }],
          riskDistribution: [
            { $group: { _id: '$riskTier', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // 2. Alert stats
    const alertStats = await Alert.aggregate([
      { $match: { orgId: orgIdObj, status: { $in: ['open', 'acknowledged'] } } },
      {
        $facet: {
          totalActive: [{ $count: 'count' }],
          severityCounts: [
            { $group: { _id: '$severity', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    // 3. Recent shipments
    const recentShipments = await Shipment.find({ orgId: orgIdObj })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('supplierId', 'name')
      .lean();

    return {
      supplierStats: {
        total: supplierStats[0]?.total[0]?.count || 0,
        highRisk: supplierStats[0]?.highRisk[0]?.count || 0,
        riskDistribution: supplierStats[0]?.riskDistribution || []
      },
      alertStats: {
        active: alertStats[0]?.totalActive[0]?.count || 0,
        severityCounts: alertStats[0]?.severityCounts || []
      },
      recentShipments
    };
  }

  /**
   * Supplier Performance Report
   */
  async getSupplierPerformance(orgId, filters = {}) {
    const matchStage = { orgId: new mongoose.Types.ObjectId(orgId) };
    
    if (filters.supplierId) {
      matchStage._id = new mongoose.Types.ObjectId(filters.supplierId);
    }
    
    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    // Since we don't have full shipment delivery records inside the supplier schema in index.js,
    // we will merge shipment stats to calculate "on-time delivery %", etc.
    const performanceData = await Supplier.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'shipments',
          localField: '_id',
          foreignField: 'supplierId',
          as: 'shipments'
        }
      },
      {
        $addFields: {
          totalShipments: { $size: '$shipments' },
          onTimeShipments: {
            $size: {
              $filter: {
                input: '$shipments',
                as: 'shipment',
                cond: { $eq: ['$$shipment.status', 'delivered'] } // Assuming 'delivered' means on-time for this schema
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          category: 1,
          riskScore: 1,
          riskTier: 1,
          totalShipments: 1,
          onTimeDeliveryPercentage: {
            $cond: {
              if: { $gt: ['$totalShipments', 0] },
              then: { $multiply: [{ $divide: ['$onTimeShipments', '$totalShipments'] }, 100] },
              else: 0
            }
          }
        }
      }
    ]);

    return performanceData;
  }

  /**
   * Shipment Delay Analysis
   */
  async getShipmentDelays(orgId, filters = {}) {
    const matchStage = { 
      orgId: new mongoose.Types.ObjectId(orgId)
    };

    if (filters.carrier) matchStage.carrierName = filters.carrier;
    if (filters.supplierId) matchStage.supplierId = new mongoose.Types.ObjectId(filters.supplierId);
    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    const delays = await Shipment.aggregate([
      { $match: matchStage },
      {
         $addFields: {
            isDelayed: {
               $cond: {
                  if: { $and: [ { $gt: ['$actualDate', null] }, { $gt: ['$expectedDate', null] } ] },
                  then: { $gt: ['$actualDate', '$expectedDate'] },
                  else: { $eq: ['$status', 'delayed'] } // fallback
               }
            }
         }
      },
      { $match: { isDelayed: true } },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          // Schema doesn't have route or delay reason, using carrierName instead as proxy
          _id: '$carrierName',
          count: { $sum: 1 },
          averageRiskScore: { $avg: '$riskScore' }
        }
      }
    ]);

    return delays;
  }

  /**
   * Inventory Risk Report
   */
  async getInventoryRisk(orgId, filters = {}) {
    const matchStage = { orgId: new mongoose.Types.ObjectId(orgId) };

    if (filters.riskTier) matchStage.riskTier = filters.riskTier;

    const inventoryRisks = await InventoryItem.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplierId',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true } },
      {
        // Calculate daysOfCover based on true currentStock and averageDailyDemand
        $addFields: {
           currentStock: { $ifNull: ['$currentStock', 0] },
           averageDailyDemand: { $ifNull: ['$averageDailyDemand', 1] }
        }
      },
      {
        $addFields: {
           daysOfCover: { $divide: ['$currentStock', '$averageDailyDemand'] }
        }
      },
      {
        $addFields: {
           status: {
             $switch: {
               branches: [
                 { case: { $lt: ['$daysOfCover', 1] }, then: 'critical' },
                 { case: { $lt: ['$daysOfCover', 3] }, then: 'high' },
                 { case: { $lt: ['$daysOfCover', 7] }, then: 'medium' }
               ],
               default: 'low'
             }
           }
        }
      },
      {
        $project: {
          sku: 1,
          name: 1,
          daysOfCover: 1,
          status: 1,
          riskScore: 1,
          riskTier: 1,
          supplierName: '$supplierInfo.name'
        }
      }
    ]);

    return inventoryRisks;
  }

  /**
   * Alert Summary
   */
  async getAlertSummary(orgId, filters = {}) {
    const matchStage = { orgId: new mongoose.Types.ObjectId(orgId) };

    if (filters.severity) matchStage.severity = filters.severity;
    if (filters.status) matchStage.status = filters.status;
    if (filters.type) matchStage.entityType = filters.type;
    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
    }

    const alerts = await Alert.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { severity: '$severity', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    return alerts.map(a => ({
      severity: a._id.severity,
      status: a._id.status,
      count: a.count
    }));
  }

  /**
   * KPI Drilldown
   */
  async getKpiDrilldown(orgId, type, days) {
    const orgIdObj = new mongoose.Types.ObjectId(orgId);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - (parseInt(days) || 30));

    let trend = [];
    let stats = { current: 0, previous: 0, avg: 0, peak: 0, low: 0 };
    
    // Abstracting trend calculation based on metric
    if (type === 'alerts') {
      const data = await Alert.aggregate([
        { $match: { orgId: orgIdObj, createdAt: { $gte: dateLimit } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            value: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      trend = data.map(d => ({ date: d._id, value: d.value }));
    } else if (type === 'shipments') {
      const data = await Shipment.aggregate([
        { $match: { orgId: orgIdObj, createdAt: { $gte: dateLimit } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            value: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      trend = data.map(d => ({ date: d._id, value: d.value }));
    } else {
      /* no historical data tracking natively yet */
    }

    if (trend.length > 0) {
      const values = trend.map(t => t.value);
      stats.peak = Math.max(...values);
      stats.low = Math.min(...values);
      stats.current = values[values.length - 1];
      stats.previous = values.length > 1 ? values[values.length - 2] : 0;
      stats.avg = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
    }

    return { trend, stats };
  }

  /**
   * Generate CSV format string
   */
  generateCSV(title, data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add title
    csvRows.push(`"${title}"`);
    
    // Add headers
    csvRows.push(headers.map(header => `"${header}"`).join(','));
    
    // Add data
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Generate PDF buffer
   */
  async generatePDF(title, data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Title and Date
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown(2);

        // Simple formatting to display data
        if (!data || data.length === 0) {
          doc.text('No data available for this report.');
        } else {
          for (let i = 0; i < data.length; i++) {
            const item = data[i];
            doc.fontSize(14).text(`Item ${i + 1}`, { underline: true });
            doc.fontSize(10);
            for (const [key, val] of Object.entries(item)) {
              let displayVal = val;
              if (typeof val === 'object' && val !== null) {
                displayVal = JSON.stringify(val);
              }
              doc.text(`${key}: ${displayVal}`);
            }
            doc.moveDown();
            
            // Add a new page if close to bottom
            if (doc.y > 700 && i < data.length - 1) {
              doc.addPage();
            }
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default new AnalyticsService();
