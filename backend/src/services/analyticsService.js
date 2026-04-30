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
      $expr: { $lte: ['$actualDelivery', '$estimatedDelivery'] }
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
      { $match: { status: { $in: ['delayed', 'rerouted'] } } },
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

    if (filters.carrier) matchStage.carrier = filters.carrier;
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
              if: { $and: [{ $gt: ['$actualDelivery', null] }, { $gt: ['$estimatedDelivery', null] }] },
              then: { $gt: ['$actualDelivery', '$estimatedDelivery'] },
              else: { $eq: ['$status', 'delayed'] }
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
          _id: '$carrier',
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
          productName: 1,
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
   * Generate PDF buffer with human-readable formatting per module type
   */
  async generatePDF(title, data, module = 'overall') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const LEFT = 50;
        const RIGHT = doc.page.width - 50;
        const WIDTH = RIGHT - LEFT;

        const checkPage = (space = 80) => {
          if (doc.y > doc.page.height - 80 - space) doc.addPage();
        };

        const sectionHeader = (text) => {
          checkPage(60);
          doc.moveDown(0.8);
          doc.fontSize(12).fillColor('#1e3a5f').font('Helvetica-Bold').text(text.toUpperCase(), LEFT);
          doc.moveDown(0.2);
          doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#1e3a5f').stroke();
          doc.moveDown(0.5);
          doc.fillColor('#000000').font('Helvetica').fontSize(10);
        };

        const row = (label, value) => {
          checkPage(20);
          const v = (value === null || value === undefined) ? '—' : String(value);
          doc.font('Helvetica-Bold').fontSize(10).text(`${label}:  `, LEFT, doc.y, { continued: true, width: WIDTH });
          doc.font('Helvetica').text(v);
        };

        // ── Header ──
        doc.fontSize(20).fillColor('#1e3a5f').font('Helvetica-Bold')
          .text(title, LEFT, doc.y, { align: 'center', width: WIDTH });
        doc.moveDown(0.4);
        doc.fontSize(10).fillColor('#555555').font('Helvetica')
          .text(`Generated on: ${new Date().toLocaleString()}`, LEFT, doc.y, { align: 'center', width: WIDTH });
        doc.moveDown(0.5);
        doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor('#1e3a5f').lineWidth(2).stroke();
        doc.lineWidth(1).fillColor('#000000');
        doc.moveDown(1);

        if (!data || data.length === 0) {
          doc.fontSize(11).font('Helvetica').text('No data available for this report.');
          doc.end();
          return;
        }

        // ── Overall / Dashboard ──
        if (module === 'overall' || module === 'dashboard') {
          const d = data[0];
          const ov = d.overview || {};
          const kpis = d.kpis || {};

          sectionHeader('Key Performance Indicators');
          row('Overall Risk Score', `${ov.riskScore ?? kpis.overallRiskScore?.value ?? '—'} / 100`);
          row('Active Alerts', ov.activeAlerts ?? kpis.activeAlerts?.value ?? '—');
          row('Delayed Shipments', ov.delayedShipments ?? kpis.delayedShipments?.value ?? '—');
          row('Inventory Items at Risk', ov.atRiskInventory ?? kpis.atRiskInventory?.value ?? '—');
          row('Registered Users', ov.registeredUsers ?? '—');
          row('On-Time Delivery Rate', `${ov.onTimeRate ?? '—'}%`);
          const tc = d.trendChange ?? 0;
          row('Risk Trend', `${d.trendDirection ?? 'stable'} (${tc >= 0 ? '+' : ''}${tc}% vs previous period)`);

          const br = d.breakdown || {};
          if (br.supplierRisk || br.shipmentRisk || br.inventoryRisk) {
            sectionHeader('Highest Risk Entities');
            row('Highest Risk Supplier', br.supplierRisk || '—');
            row('Highest Risk Shipment', br.shipmentRisk || '—');
            row('Highest Risk Inventory Item', br.inventoryRisk || '—');
          }

          if (d.alertsBySeverity && d.alertsBySeverity.length > 0) {
            sectionHeader('Active Alerts by Severity');
            for (const a of d.alertsBySeverity) {
              row(a.name, a.value === 0 ? 'None' : `${a.value} alert(s)`);
            }
          }

          sectionHeader('Recent Alerts');
          const alerts = d.alerts || [];
          if (alerts.length === 0) {
            doc.font('Helvetica').fontSize(10).text('No recent alerts.');
          } else {
            for (const alert of alerts) {
              checkPage(55);
              const date = alert.createdAt
                ? new Date(alert.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—';
              const sev = (alert.severity || 'unknown').toUpperCase();
              doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e3a5f')
                .text(`[${sev}]  ${alert.title || 'Alert'}`, LEFT);
              doc.font('Helvetica').fontSize(9).fillColor('#333333')
                .text(alert.description || '—', LEFT + 10, doc.y, { width: WIDTH - 10 });
              doc.fontSize(8).fillColor('#888888').text(`Date: ${date}`, LEFT + 10);
              doc.fillColor('#000000').moveDown(0.5);
            }
          }

          if (d.inventoryRisk && d.inventoryRisk.length > 0) {
            sectionHeader('Inventory at Risk');
            const C = [LEFT, LEFT + 130, LEFT + 210, LEFT + 290, LEFT + 360];
            const hY = doc.y;
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#444444');
            doc.text('SKU / Item',   C[0], hY, { width: 80 });
            doc.text('Stock',        C[1], hY, { width: 80 });
            doc.text('Threshold',    C[2], hY, { width: 80 });
            doc.text('Risk Level',   C[3], hY, { width: 80 });
            doc.fillColor('#000000').font('Helvetica').fontSize(9);
            doc.moveDown(0.5);
            for (const item of d.inventoryRisk) {
              checkPage(18);
              const rY = doc.y;
              doc.text(item.name || '—',                      C[0], rY, { width: 80 });
              doc.text(String(item.stock ?? '—'),             C[1], rY, { width: 80 });
              doc.text(String(item.threshold ?? '—'),         C[2], rY, { width: 80 });
              doc.text((item.risk || '—').toUpperCase(),      C[3], rY, { width: 80 });
              doc.moveDown(0.3);
            }
          }

          if (d.shipmentDelays && d.shipmentDelays.length > 0) {
            sectionHeader('Shipment Delays by Carrier');
            for (const item of d.shipmentDelays) {
              row(item.carrier || 'Unknown', `${item.delays} delay(s)`);
            }
          }

          if (d.activeUsers && d.activeUsers.length > 0) {
            sectionHeader('Active Users');
            for (const u of d.activeUsers) {
              checkPage(20);
              doc.font('Helvetica-Bold').fontSize(10).text(u.name || '—', LEFT, doc.y, { continued: true, width: WIDTH });
              doc.font('Helvetica').fillColor('#555555')
                .text(`  |  ${u.role || u.roleCode || '—'}  |  ${u.email || '—'}`);
              doc.fillColor('#000000');
            }
          }

        // ── Supplier Risk ──
        } else if (module === 'supplier_risk') {
          sectionHeader('Supplier Performance Summary');
          for (const item of data) {
            checkPage(70);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f').text(item.name || 'Unknown Supplier', LEFT);
            doc.fillColor('#000000').font('Helvetica').fontSize(10);
            row('Category', item.category || '—');
            row('Risk Score', item.riskScore != null ? `${item.riskScore} / 100` : '—');
            row('Risk Tier', item.riskTier || '—');
            row('Total Shipments', item.totalShipments ?? '—');
            row('On-Time Delivery', item.onTimeDeliveryPercentage != null ? `${Math.round(item.onTimeDeliveryPercentage)}%` : '—');
            doc.moveDown(0.7);
          }

        // ── Shipments ──
        } else if (module === 'shipments' || module === 'shipment_tracking') {
          sectionHeader('Shipment Delay Analysis by Carrier');
          for (const item of data) {
            checkPage(40);
            row('Carrier', item._id || item.carrier || 'Unknown');
            row('Total Delays', item.count ?? item.delays ?? '—');
            row('Average Risk Score', item.averageRiskScore != null ? Math.round(item.averageRiskScore) : '—');
            doc.moveDown(0.5);
          }

        // ── Inventory ──
        } else if (module === 'inventory') {
          sectionHeader('Inventory Risk Assessment');
          for (const item of data) {
            checkPage(70);
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f')
              .text(`${item.sku || '—'}  —  ${item.productName || ''}`, LEFT);
            doc.fillColor('#000000').font('Helvetica').fontSize(10);
            row('Days of Cover', item.daysOfCover != null ? item.daysOfCover.toFixed(1) : '—');
            row('Status', item.status || '—');
            row('Risk Score', item.riskScore != null ? `${item.riskScore} / 100` : '—');
            row('Risk Tier', item.riskTier || '—');
            row('Supplier', item.supplierName || '—');
            doc.moveDown(0.7);
          }

        // ── Alerts ──
        } else if (module === 'alerts') {
          sectionHeader('Alert Summary by Severity and Status');
          for (const item of data) {
            checkPage(25);
            row(`${(item.severity || '—').toUpperCase()} — ${item.status || '—'}`, `${item.count} alert(s)`);
          }

        // ── Generic fallback ──
        } else {
          for (let i = 0; i < data.length; i++) {
            checkPage(60);
            const item = data[i];
            if (data.length > 1) {
              doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f').text(`Entry ${i + 1}`, LEFT);
              doc.fillColor('#000000').font('Helvetica').fontSize(10);
              doc.moveDown(0.3);
            }
            for (const [key, val] of Object.entries(item)) {
              checkPage(20);
              let displayVal;
              if (val === null || val === undefined) {
                displayVal = '—';
              } else if (Array.isArray(val)) {
                displayVal = val.length === 0 ? '(none)' :
                  typeof val[0] === 'object'
                    ? val.map(v => Object.values(v).filter(x => typeof x !== 'object').join(', ')).join(' | ')
                    : val.join(', ');
              } else if (typeof val === 'object') {
                displayVal = Object.entries(val)
                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                  .join('  |  ');
              } else {
                displayVal = String(val);
              }
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
              row(label, displayVal);
            }
            doc.moveDown(0.8);
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
