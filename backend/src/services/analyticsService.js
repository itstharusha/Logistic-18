import mongoose from 'mongoose';
import { Supplier, Shipment, InventoryItem } from '../models/index.js';
import Alert from '../models/Alert.js';
import User from '../models/User.js';
import PDFDocument from 'pdfkit';

class AnalyticsService {
  /**
   * Dashboard (Risk Overview) - for DashboardPage component
   * Returns properly structured data that matches frontend expectations.
   * Queries ALL data across the system (not org-scoped) so the admin
   * dashboard always reflects real system-wide metrics.
   */
  async getDashboardInfo(orgId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Get Recent Alerts (for alerts section)
    const recentAlerts = await Alert.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('severity entityName description alertId title createdAt')
      .lean();

    // 2. Get Alert Stats
    const activeAlerts = await Alert.countDocuments({ 
      status: { $in: ['open', 'acknowledged'] } 
    });

    // 3. Get Shipment Stats
    const [totalShipments, delayedShipments] = await Promise.all([
      Shipment.countDocuments({}),
      Shipment.countDocuments({ status: 'delayed' })
    ]);

    // 4. Get Inventory Risk (at-risk count)
    const atRiskInventory = await InventoryItem.countDocuments({
      $expr: {
        $lt: [
          { $divide: [{ $ifNull: ['$currentStock', 0] }, { $max: [{ $ifNull: ['$averageDailyDemand', 1] }, 1] }] },
          10
        ]
      }
    });

    // 5. Get Users Count (all users across the system)
    const registeredUsers = await User.countDocuments({});

    // 6. Calculate On-Time Delivery Rate
    const completedShipments = await Shipment.countDocuments({
      status: 'delivered'
    });

    const onTimeShipments = await Shipment.countDocuments({
      status: 'delivered',
      $expr: { $lte: ['$actualDate', '$expectedDate'] }
    });

    const onTimeRate = completedShipments > 0 ? Math.round((onTimeShipments / completedShipments) * 100) : 0;

    // 7. Calculate Overall Risk Score (0-100 based on suppliers)
    const supplierStats = await Supplier.aggregate([
      {
        $group: {
          _id: '$riskTier',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSuppliers = supplierStats.reduce((sum, s) => sum + s.count, 0);
    const highRiskCount = supplierStats.find(s => s._id === 'high' || s._id === 'High')?.count || 0;
    const mediumRiskCount = supplierStats.find(s => s._id === 'medium' || s._id === 'Medium')?.count || 0;
    
    let riskScore = 0;
    if (totalSuppliers > 0) {
      riskScore = Math.round(
        ((highRiskCount * 100 + mediumRiskCount * 50) / (totalSuppliers * 100)) * 100
      );
    }

    // 8. Get Risk Trend for Chart (last 30 days)
    const riskTrendData = await Alert.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    const trendData = riskTrendData.map(item => {
      return Math.round((item.count / 5) * 100); // Scale to percentage
    }).slice(-30);

    const trendLabels = riskTrendData.map(item => {
      return `${item._id.month}/${item._id.day}`;
    }).slice(-30);

    // 9. Calculate trend direction and change
    let trendDirection = 'stable';
    let trendChange = 0;
    if (trendData.length >= 7) {
      const lastWeek = trendData.slice(-7);
      const avgLast7 = lastWeek.reduce((a, b) => a + b, 0) / 7;
      const prev7 = trendData.slice(-14, -7);
      const avgPrev7 = prev7.length > 0 ? prev7.reduce((a, b) => a + b, 0) / 7 : avgLast7;
      trendChange = avgPrev7 > 0 ? Math.round(((avgLast7 - avgPrev7) / avgPrev7) * 100) : 0;
      trendDirection = trendChange > 0 ? 'up' : trendChange < 0 ? 'down' : 'stable';
    }

    // 10. Active Users — real users from the database
    const activeUsersRaw = await User.find({ isActive: true })
      .sort({ lastActiveAt: -1 })
      .limit(5)
      .select('name email role lastActiveAt systemImpactScore')
      .lean();

    const avatarColors = ['#E85D2F', '#2DB87A', '#3B82F6', '#8B5CF6', '#F59E0B'];
    const activeUsers = activeUsersRaw.map((u, i) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role?.replace(/_/g, ' ') || 'Viewer',
      roleCode: u.role || 'VIEWER',
      avatarColor: avatarColors[i % avatarColors.length],
      rating: u.systemImpactScore > 0 ? (u.systemImpactScore / 20).toFixed(1) : null,
      lastActiveAt: u.lastActiveAt,
    }));

    // 11. Risk Breakdown — highest-risk entity in each category
    const highestRiskSupplier = await Supplier.findOne({})
      .sort({ riskScore: -1 })
      .select('name riskScore riskTier')
      .lean();

    const highestRiskShipment = await Shipment.findOne({})
      .sort({ riskScore: -1 })
      .select('shipmentNumber riskScore riskTier')
      .lean();

    const highestRiskInventory = await InventoryItem.findOne({})
      .sort({ riskScore: -1 })
      .select('sku riskScore riskTier')
      .lean();

    const breakdown = {
      supplierRisk: highestRiskSupplier
        ? `${highestRiskSupplier.name} (${highestRiskSupplier.riskScore})`
        : 'No suppliers',
      shipmentRisk: highestRiskShipment
        ? `${highestRiskShipment.shipmentNumber} (${highestRiskShipment.riskScore})`
        : 'No shipments',
      inventoryRisk: highestRiskInventory
        ? `${highestRiskInventory.sku} (${highestRiskInventory.riskScore})`
        : 'No inventory',
    };

    // 12. Analytics Dashboard Page specific formats
    
    // a. Risk Trend (array of { date, score })
    const riskTrend = trendData.length > 0 ? trendData.map((score, index) => ({
      date: trendLabels[index],
      score: Math.min(score, 100)
    })) : [{ date: 'No data', score: 50 }];

    // b. Alerts by Severity (array of { name, value, color })
    const alertsSeverityMap = await Alert.aggregate([
      { $match: { status: { $in: ['open', 'acknowledged'] } } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    const SEVERITY_COLORS = { 'Critical': '#ef4444', 'High': '#f97316', 'Medium': '#eab308', 'Low': '#22c55e' };
    const alertsBySeverity = ['Critical', 'High', 'Medium', 'Low'].map(severity => {
      const lowerSeverity = severity.toLowerCase();
      const found = alertsSeverityMap.find(a => String(a._id).toLowerCase() === lowerSeverity);
      return {
        name: severity,
        value: found ? found.count : 0,
        color: SEVERITY_COLORS[severity]
      };
    });

    // c. Shipment Delays (array of { carrier, delays })
    const shipmentDelaysData = await Shipment.aggregate([
      { $match: { status: 'delayed' } },
      { $group: { _id: '$carrier', delays: { $sum: 1 } } },
      { $sort: { delays: -1 } },
      { $limit: 10 }
    ]);
    const shipmentDelays = shipmentDelaysData.map(item => ({
      carrier: item._id || 'Unknown',
      delays: item.delays
    }));

    // d. Inventory Risk (array of { name, stock, threshold, risk })
    const inventoryRiskItems = await InventoryItem.find({
      $expr: {
        $lt: [
          { $divide: [{ $ifNull: ['$currentStock', 0] }, { $max: [{ $ifNull: ['$averageDailyDemand', 1] }, 1] }] },
          10
        ]
      }
    }).limit(10).lean();
    
    const inventoryRisk = inventoryRiskItems.map(item => ({
      name: item.sku || 'Unknown Product',
      stock: Number((item.currentStock || 0).toFixed(2)),
      threshold: Number(((item.averageDailyDemand || 1) * 10).toFixed(2)),
      risk: (item.currentStock / (item.averageDailyDemand || 1)) < 5 ? 'high' : 'medium'
    }));

    // e. KPIs
    const kpis = {
      overallRiskScore: { value: riskScore, delta: `${trendChange > 0 ? '+' : ''}${trendChange}` },
      activeAlerts: { value: activeAlerts, delta: '0' },
      delayedShipments: { value: delayedShipments, delta: '0' },
      atRiskInventory: { value: atRiskInventory, delta: '0' }
    };

    return {
      // For DashboardPage.jsx
      overview: {
        riskScore,
        activeAlerts,
        delayedShipments,
        atRiskInventory,
        registeredUsers,
        onTimeRate
      },
      trendChart: {
        data: trendData.length > 0 ? trendData : [50],
        labels: trendLabels.length > 0 ? trendLabels : ['No data']
      },
      alerts: recentAlerts,
      activeUsers,
      breakdown,
      trendDirection,
      trendChange,
      // For AnalyticsDashboardPage.jsx
      riskTrend,
      alertsBySeverity,
      shipmentDelays,
      inventoryRisk,
      kpis
    };
  }

  /**
   * Supplier Performance Report
   */
  async getSupplierPerformance(orgId, filters = {}) {
    const matchStage = {};
    
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
    const matchStage = {};

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
    const matchStage = {};

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
    const matchStage = {};

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
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - (parseInt(days) || 30));

    let trend = [];
    let stats = { current: 0, previous: 0, avg: 0, peak: 0, low: 0 };
    
    // Abstracting trend calculation based on metric
    if (type === 'alerts') {
      const data = await Alert.aggregate([
        { $match: { createdAt: { $gte: dateLimit } } },
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
        { $match: { createdAt: { $gte: dateLimit } } },
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
