import { AlertService } from '../services/AlertService.js';

export class AlertController {
    /**
     * GET /api/alerts
     * List alerts with optional filters: status, severity, entityType, assignedTo
     */
    static async listAlerts(req, res) {
        try {
            const { orgId } = req.user;
            const { status, severity, entityType, assignedTo, page = 1, limit = 20 } = req.query;

            const filters = {};
            if (status) filters.status = status;
            if (severity) filters.severity = severity;
            if (entityType) filters.entityType = entityType;
            if (assignedTo) filters.assignedTo = assignedTo;

            const result = await AlertService.getAlerts(orgId, filters, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch alerts', details: error.message });
        }
    }

    /**
     * GET /api/alerts/dashboard
     * Get alert dashboard stats (counts, severity breakdown, trend)
     */
    static async getDashboard(req, res) {
        try {
            const { orgId } = req.user;
            const dashboard = await AlertService.getDashboardStats(orgId);
            res.json(dashboard);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch dashboard', details: error.message });
        }
    }

    /**
     * GET /api/alerts/my
     * Get alerts assigned to current user
     */
    static async getMyAlerts(req, res) {
        try {
            const { orgId, userId } = req.user;
            const { status } = req.query;
            const filters = {};
            if (status) filters.status = status;

            const alerts = await AlertService.getMyAlerts(orgId, userId, filters);
            res.json({ alerts });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch your alerts', details: error.message });
        }
    }

    /**
     * GET /api/alerts/history/all
     * Get alert history (resolved alerts)
     */
    static async getHistory(req, res) {
        try {
            const { orgId } = req.user;
            const { page = 1, limit = 20 } = req.query;

            const result = await AlertService.getAlertHistory(orgId, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch alert history', details: error.message });
        }
    }

    /**
     * GET /api/alerts/:alertId
     * Get single alert detail
     */
    static async getAlertDetail(req, res) {
        try {
            const { orgId } = req.user;
            const { alertId } = req.params;

            const alert = await AlertService.getAlertById(alertId, orgId);
            res.json({ alert });
        } catch (error) {
            if (error.message === 'Alert not found') {
                return res.status(404).json({ error: 'Alert not found' });
            }
            res.status(500).json({ error: 'Failed to fetch alert detail', details: error.message });
        }
    }

    /**
     * POST /api/alerts
     * Create a new alert (manually or from ML trigger)
     */
    static async createAlert(req, res) {
        try {
            const { orgId } = req.user;
            const { entityType, entityId, severity, title, description, mitigationRecommendation } = req.validatedBody || req.body;

            if (!entityType || !entityId || !title) {
                return res.status(400).json({ error: 'entityType, entityId, and title are required' });
            }

            if (!['supplier', 'shipment', 'inventory'].includes(entityType)) {
                return res.status(400).json({ error: 'entityType must be supplier, shipment, or inventory' });
            }

            if (severity && !['low', 'medium', 'high', 'critical'].includes(severity)) {
                return res.status(400).json({ error: 'severity must be low, medium, high, or critical' });
            }

            const result = await AlertService.createAlert(
                { orgId, entityType, entityId, severity, title, description, mitigationRecommendation },
                req.user
            );

            if (result.suppressed) {
                return res.status(200).json({
                    message: result.message,
                    suppressed: true,
                    existingAlertId: result.existingAlert._id,
                });
            }

            res.status(201).json({ alert: result.alert });
        } catch (error) {
            res.status(500).json({ error: 'Failed to create alert', details: error.message });
        }
    }

    /**
     * POST /api/alerts/:alertId/acknowledge
     * Acknowledge an alert (one-click)
     */
    static async acknowledgeAlert(req, res) {
        try {
            const { orgId, userId } = req.user;
            const { alertId } = req.params;

            const alert = await AlertService.acknowledgeAlert(alertId, orgId, userId);
            res.json({ alert, message: 'Alert acknowledged successfully' });
        } catch (error) {
            if (error.message === 'Alert not found') {
                return res.status(404).json({ error: 'Alert not found' });
            }
            if (error.message.includes('already')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to acknowledge alert', details: error.message });
        }
    }

    /**
     * POST /api/alerts/:alertId/resolve
     * Resolve an alert with resolution details
     */
    static async resolveAlert(req, res) {
        try {
            const { orgId, userId } = req.user;
            const { alertId } = req.params;
            const { resolutionNote } = req.validatedBody || req.body;

            const alert = await AlertService.resolveAlert(alertId, orgId, userId, resolutionNote);
            res.json({ alert, message: 'Alert resolved successfully' });
        } catch (error) {
            if (error.message === 'Alert not found') {
                return res.status(404).json({ error: 'Alert not found' });
            }
            if (error.message.includes('required') || error.message.includes('already')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to resolve alert', details: error.message });
        }
    }

    /**
     * POST /api/alerts/escalate (internal/cron endpoint)
     * Escalate overdue alerts
     */
    static async escalateAlerts(req, res) {
        try {
            const results = await AlertService.escalateOverdueAlerts();
            res.json({ escalated: results.length, results });
        } catch (error) {
            res.status(500).json({ error: 'Failed to escalate alerts', details: error.message });
        }
    }
}
