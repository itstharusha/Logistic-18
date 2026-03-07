import Alert from '../models/Alert.js';
import User from '../models/User.js';

export class AlertRepository {
    // Create a new alert
    static async create(alertData) {
        const alert = new Alert(alertData);
        return alert.save();
    }

    // Find alert by ID (scoped to org)
    static async findById(alertId, orgId) {
        return Alert.findOne({ _id: alertId, orgId })
            .populate('assignedTo', 'name email role')
            .populate('resolvedBy', 'name email role');
    }

    // Find all alerts for an organization with filters
    static async findByOrgId(orgId, filters = {}, options = {}) {
        const query = { orgId };

        if (filters.status) query.status = filters.status;
        if (filters.severity) query.severity = filters.severity;
        if (filters.entityType) query.entityType = filters.entityType;
        if (filters.assignedTo) query.assignedTo = filters.assignedTo;

        // Status array filter (e.g., all open + escalated)
        if (filters.statuses && Array.isArray(filters.statuses)) {
            query.status = { $in: filters.statuses };
        }

        const mongoQuery = Alert.find(query)
            .populate('assignedTo', 'name email role')
            .populate('resolvedBy', 'name email role');

        if (options.sort) mongoQuery.sort(options.sort);
        else mongoQuery.sort({ createdAt: -1 }); // Newest first by default

        if (options.limit) mongoQuery.limit(options.limit);
        if (options.skip) mongoQuery.skip(options.skip);

        return mongoQuery.exec();
    }

    // Count alerts by org
    static async countByOrgId(orgId, filters = {}) {
        const query = { orgId };
        if (filters.status) query.status = filters.status;
        if (filters.severity) query.severity = filters.severity;
        if (filters.entityType) query.entityType = filters.entityType;
        if (filters.assignedTo) query.assignedTo = filters.assignedTo;
        if (filters.statuses && Array.isArray(filters.statuses)) {
            query.status = { $in: filters.statuses };
        }
        return Alert.countDocuments(query);
    }

    // Get alert stats for dashboard
    static async getAlertStats(orgId) {
        const stats = await Alert.aggregate([
            { $match: { orgId: orgId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
                    acknowledged: { $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] } },
                    resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
                    escalated: { $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] } },
                    low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
                    medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
                    high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
                    critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
                },
            },
        ]);

        return stats[0] || {
            total: 0, open: 0, acknowledged: 0, resolved: 0, escalated: 0,
            low: 0, medium: 0, high: 0, critical: 0,
        };
    }

    // Get severity breakdown by entity type
    static async getSeverityBreakdown(orgId) {
        return Alert.aggregate([
            { $match: { orgId: orgId, status: { $in: ['open', 'escalated'] } } },
            {
                $group: {
                    _id: { entityType: '$entityType', severity: '$severity' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.entityType': 1, '_id.severity': 1 } },
        ]);
    }

    // Update alert status
    static async updateStatus(alertId, orgId, updateData) {
        return Alert.findOneAndUpdate(
            { _id: alertId, orgId },
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        )
            .populate('assignedTo', 'name email role')
            .populate('resolvedBy', 'name email role');
    }

    // Check for existing active alert (cooldown check)
    static async findActiveDuplicate(orgId, entityType, entityId) {
        return Alert.findOne({
            orgId,
            entityType,
            entityId,
            status: { $in: ['open', 'acknowledged', 'escalated'] },
            $or: [
                { cooldownExpiresAt: { $gt: new Date() } },
                { cooldownExpiresAt: null },
            ],
        });
    }

    // Find alerts that need escalation (unacknowledged past SLA)
    static async findEscalationCandidates(slaMinutes = 60) {
        const slaThreshold = new Date(Date.now() - slaMinutes * 60 * 1000);
        return Alert.find({
            status: 'open',
            createdAt: { $lte: slaThreshold },
        })
            .populate('assignedTo', 'name email role');
    }

    // Get recent alerts for dashboard (last 24h)
    static async getRecentAlerts(orgId, limit = 10) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return Alert.find({
            orgId,
            createdAt: { $gte: yesterday },
        })
            .populate('assignedTo', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    // Get alerts assigned to a specific user
    static async findByAssignedUser(orgId, userId, filters = {}) {
        const query = { orgId, assignedTo: userId };
        if (filters.status) query.status = filters.status;
        if (filters.statuses && Array.isArray(filters.statuses)) {
            query.status = { $in: filters.statuses };
        }
        return Alert.find(query)
            .populate('assignedTo', 'name email role')
            .populate('resolvedBy', 'name email role')
            .sort({ createdAt: -1 });
    }

    // Get alert history (resolved alerts)
    static async getHistory(orgId, options = {}) {
        const query = { orgId, status: 'resolved' };
        const mongoQuery = Alert.find(query)
            .populate('assignedTo', 'name email role')
            .populate('resolvedBy', 'name email role')
            .sort({ resolvedAt: -1 });

        if (options.limit) mongoQuery.limit(options.limit);
        if (options.skip) mongoQuery.skip(options.skip);

        return mongoQuery.exec();
    }

    // Get alert trend data (alerts per day for last N days)
    static async getAlertTrend(orgId, days = 7) {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return Alert.aggregate([
            { $match: { orgId: orgId, createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        severity: '$severity',
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.date': 1 } },
        ]);
    }

    // Find user by role for auto-assign
    static async findUserByRole(orgId, role) {
        return User.findOne({ orgId, role, isActive: true });
    }
}
