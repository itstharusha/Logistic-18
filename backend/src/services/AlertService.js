import { AlertRepository } from '../repositories/AlertRepository.js';
import AuditLog from '../models/AuditLog.js';
import mongoose from 'mongoose';

// Role mapping: entityType → role for auto-assignment
const ENTITY_ROLE_MAP = {
    supplier: 'RISK_ANALYST',
    shipment: 'LOGISTICS_OPERATOR',
    inventory: 'INVENTORY_MANAGER',
};

// Default SLA periods in minutes per severity
const SLA_MINUTES = {
    low: 480,       // 8 hours
    medium: 240,    // 4 hours
    high: 120,      // 2 hours
    critical: 60,   // 1 hour
};

// Default cooldown window in minutes
const COOLDOWN_WINDOW_MINUTES = 30;

export class AlertService {
    /**
     * Create a new alert with cooldown check and auto-assignment
     * FR-AL-01: Generate ML-based risk alerts automatically
     * FR-AL-02: Assign severity levels
     * FR-AL-03: Auto-assign to correct team member by role
     * FR-AL-06: Cooldown logic — suppress duplicates
     */
    static async createAlert(alertData, reqUser) {
        const { orgId, entityType, entityId, severity, title, description, mitigationRecommendation } = alertData;

        // FR-AL-06: Cooldown check — suppress duplicate alerts within window
        const existingAlert = await AlertRepository.findActiveDuplicate(orgId, entityType, entityId);
        if (existingAlert) {
            return {
                suppressed: true,
                existingAlert,
                message: `Duplicate alert suppressed. Active alert ${existingAlert._id} exists for this entity.`,
            };
        }

        // FR-AL-03: Auto-assign to correct team member based on role
        const targetRole = ENTITY_ROLE_MAP[entityType] || 'RISK_ANALYST';
        let assignedUser = await AlertRepository.findUserByRole(orgId, targetRole);

        // Fallback to ORG_ADMIN if no user with the target role exists
        if (!assignedUser) {
            assignedUser = await AlertRepository.findUserByRole(orgId, 'ORG_ADMIN');
        }

        // Calculate cooldown expiry
        const cooldownExpiresAt = new Date(Date.now() + COOLDOWN_WINDOW_MINUTES * 60 * 1000);

        const newAlert = await AlertRepository.create({
            orgId,
            entityType,
            entityId,
            severity: severity || 'medium',
            title,
            description,
            mitigationRecommendation,
            assignedTo: assignedUser?._id || null,
            status: 'open',
            cooldownExpiresAt,
        });

        // Audit log for alert creation
        await AuditLog.create({
            orgId,
            userId: reqUser?.userId || null,
            action: 'ALERT_CREATED',
            entityType: 'ALERT',
            entityId: newAlert._id,
            newValue: { severity, title, entityType, assignedTo: assignedUser?._id },
        }).catch(err => console.error('Audit log error:', err));

        // Populate assigned user for response
        const populated = await AlertRepository.findById(newAlert._id, orgId);

        return { suppressed: false, alert: populated };
    }

    /**
     * Get paginated alerts list with filtering
     */
    static async getAlerts(orgId, filters = {}, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        // Sort by severity priority, then creation date
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

        const alerts = await AlertRepository.findByOrgId(orgId, filters, {
            sort: { createdAt: -1 },
            limit,
            skip,
        });

        const total = await AlertRepository.countByOrgId(orgId, filters);

        return {
            alerts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get alert detail
     */
    static async getAlertById(alertId, orgId) {
        const alert = await AlertRepository.findById(alertId, orgId);
        if (!alert) {
            throw new Error('Alert not found');
        }
        return alert;
    }

    /**
     * Acknowledge an alert
     * FR-AL-04: Allow acknowledgement by assigned team member
     */
    static async acknowledgeAlert(alertId, orgId, userId) {
        const alert = await AlertRepository.findById(alertId, orgId);

        if (!alert) {
            throw new Error('Alert not found');
        }

        if (alert.status === 'resolved') {
            throw new Error('Cannot acknowledge a resolved alert');
        }

        if (alert.status === 'acknowledged') {
            throw new Error('Alert is already acknowledged');
        }

        const updated = await AlertRepository.updateStatus(alertId, orgId, {
            status: 'acknowledged',
        });

        // Audit log
        await AuditLog.create({
            orgId,
            userId,
            action: 'ALERT_ACKNOWLEDGED',
            entityType: 'ALERT',
            entityId: alertId,
            oldValue: { status: alert.status },
            newValue: { status: 'acknowledged' },
        }).catch(err => console.error('Audit log error:', err));

        return updated;
    }

    /**
     * Resolve an alert with resolution details
     * FR-AL-05: Track resolution details — who resolved, how, and when
     */
    static async resolveAlert(alertId, orgId, userId, resolutionNote) {
        const alert = await AlertRepository.findById(alertId, orgId);

        if (!alert) {
            throw new Error('Alert not found');
        }

        if (alert.status === 'resolved') {
            throw new Error('Alert is already resolved');
        }

        if (!resolutionNote || resolutionNote.trim().length === 0) {
            throw new Error('Resolution note is required');
        }

        const updated = await AlertRepository.updateStatus(alertId, orgId, {
            status: 'resolved',
            resolvedBy: userId,
            resolvedAt: new Date(),
            resolutionNote: resolutionNote.trim(),
        });

        // Audit log
        await AuditLog.create({
            orgId,
            userId,
            action: 'ALERT_RESOLVED',
            entityType: 'ALERT',
            entityId: alertId,
            oldValue: { status: alert.status },
            newValue: { status: 'resolved', resolvedBy: userId, resolutionNote },
        }).catch(err => console.error('Audit log error:', err));

        return updated;
    }

    /**
     * Escalate alerts that are unacknowledged past SLA period
     * FR-AL-07: Alert escalation if unacknowledged within SLA period
     */
    static async escalateOverdueAlerts() {
        const results = [];

        for (const [severity, slaMinutes] of Object.entries(SLA_MINUTES)) {
            const slaThreshold = new Date(Date.now() - slaMinutes * 60 * 1000);

            const overdueAlerts = await AlertRepository.findByOrgId(
                null, // We need to search across all orgs for cron
                {},
                {}
            );

            // For cron job: query directly
            const alerts = await mongoose.model('Alert').find({
                status: 'open',
                severity,
                createdAt: { $lte: slaThreshold },
            });

            for (const alert of alerts) {
                await AlertRepository.updateStatus(alert._id, alert.orgId, {
                    status: 'escalated',
                    escalatedAt: new Date(),
                });

                // Audit log
                await AuditLog.create({
                    orgId: alert.orgId,
                    action: 'ALERT_ESCALATED',
                    entityType: 'ALERT',
                    entityId: alert._id,
                    oldValue: { status: 'open', severity },
                    newValue: { status: 'escalated', reason: `SLA breach: unacknowledged after ${slaMinutes} minutes` },
                }).catch(err => console.error('Audit log error:', err));

                results.push({ alertId: alert._id, severity, escalatedAt: new Date() });
            }
        }

        return results;
    }

    /**
     * Get dashboard statistics
     */
    static async getDashboardStats(orgId) {
        const orgObjectId = new mongoose.Types.ObjectId(orgId);
        const stats = await AlertRepository.getAlertStats(orgObjectId);
        const severityBreakdown = await AlertRepository.getSeverityBreakdown(orgObjectId);
        const recentAlerts = await AlertRepository.getRecentAlerts(orgId, 5);
        const trend = await AlertRepository.getAlertTrend(orgObjectId, 7);

        return {
            stats,
            severityBreakdown,
            recentAlerts,
            trend,
        };
    }

    /**
     * Get alerts assigned to current user
     */
    static async getMyAlerts(orgId, userId, filters = {}) {
        return AlertRepository.findByAssignedUser(orgId, userId, filters);
    }

    /**
     * Get alert history (resolved alerts)
     */
    static async getAlertHistory(orgId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const alerts = await AlertRepository.getHistory(orgId, { limit, skip });
        const total = await AlertRepository.countByOrgId(orgId, { status: 'resolved' });

        return {
            alerts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
}
