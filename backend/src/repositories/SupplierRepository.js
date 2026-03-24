/**
 * SupplierRepository.js — Data Access Layer: suppliers Collection
 *
 * Responsibility:
 *   Provides all MongoDB query operations for the Supplier model.
 *   The service layer (SupplierService) calls these methods — no raw
 *   Mongoose queries are written elsewhere.
 *
 *   Key design: history updates (riskHistory, overrideHistory, metricsAdjustmentHistory)
 *   are done atomically using $push within $set operations so the returned document
 *   always includes the latest history entry.
 */

import Supplier from '../models/Supplier.js';

export class SupplierRepository {

  /**
   * findAll
   * Returns a paginated, optionally filtered list of suppliers for an org.
   * Supports text search across name, country, and contact email.
   * Returns both the page of results and the total count for pagination UI.
   *
   * @param {string} orgId   - Organisation's MongoDB ObjectId
   * @param {object} options - { search, status, tier, skip, limit }
   * @returns {Promise<{ suppliers: Supplier[], total: number }>}
   */
  static async findAll(orgId, { search, status, tier, skip = 0, limit = 50 } = {}) {
    const query = { orgId };

    // Filter by operational status (e.g. 'active', 'suspended')
    if (status && status !== 'all') query.status = status;

    // Filter by risk tier (e.g. 'high', 'critical')
    if (tier && tier !== 'all') query.riskTier = tier;

    // Case-insensitive search across key text fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
      ];
    }

    // Run count and page query in parallel for efficiency
    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)),
      Supplier.countDocuments(query),
    ]);

    return { suppliers, total };
  }

  /**
   * findById
   * Fetches a single supplier by ID, scoped to the correct organisation.
   * Returns null if the supplier doesn't exist or belongs to a different org.
   *
   * @param {string} orgId       - Organisation's MongoDB ObjectId
   * @param {string} supplierId  - Supplier's MongoDB ObjectId
   * @returns {Promise<Supplier|null>}
   */
  static async findById(orgId, supplierId) {
    return Supplier.findOne({ _id: supplierId, orgId });
  }

  /**
   * create
   * Inserts a new supplier document into the database.
   *
   * @param {object} data - Fields matching the Supplier schema (must include orgId)
   * @returns {Promise<Supplier>} The saved supplier document
   */
  static async create(data) {
    const supplier = new Supplier(data);
    return supplier.save();
  }

  /**
   * update
   * Updates specified fields on a supplier document using $set.
   * Returns the document AFTER the update (new: true).
   * Runs schema validators on the updated fields.
   *
   * @param {string} orgId      - Organisation's MongoDB ObjectId
   * @param {string} supplierId - Target supplier's MongoDB ObjectId
   * @param {object} data       - Fields to update (partial update supported)
   * @returns {Promise<Supplier|null>}
   */
  static async update(orgId, supplierId, data) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      { $set: { ...data, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
  }

  /**
   * findManyByIds
   * Fetches multiple suppliers by their IDs in a single query.
   * Used by the supplier comparison feature (2–3 suppliers at a time).
   * Scoped to the org to prevent cross-tenant access.
   *
   * @param {string}   orgId - Organisation's MongoDB ObjectId
   * @param {string[]} ids   - Array of supplier MongoDB ObjectId strings
   * @returns {Promise<Supplier[]>}
   */
  static async findManyByIds(orgId, ids) {
    return Supplier.find({ _id: { $in: ids }, orgId });
  }

  /**
   * appendRiskSnapshot
   * Pushes a new risk score snapshot into the riskHistory array.
   * Used for standalone history updates (not combined with other field changes).
   *
   * @param {string} orgId      - Organisation's MongoDB ObjectId
   * @param {string} supplierId - Target supplier's MongoDB ObjectId
   * @param {object} snapshot   - { riskScore, riskTier, scoredAt }
   * @returns {Promise<Supplier|null>} Updated supplier document
   */
  static async appendRiskSnapshot(orgId, supplierId, snapshot) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      { $push: { riskHistory: snapshot } },
      { new: true }
    );
  }

  /**
   * updateWithSnapshot
   * Atomically updates supplier fields AND optionally pushes a new riskHistory entry
   * in one database operation. This ensures the returned document already contains
   * the new snapshot — avoiding the two-step read-then-append race condition.
   *
   * Pass snapshot=null to perform a plain update with no history entry added.
   *
   * @param {string} orgId      - Organisation's MongoDB ObjectId
   * @param {string} supplierId - Target supplier's MongoDB ObjectId
   * @param {object} fields     - Fields to $set (e.g. riskScore, riskTier, metrics)
   * @param {object|null} snapshot - { riskScore, riskTier, scoredAt } or null
   * @returns {Promise<Supplier|null>} Updated supplier with latest riskHistory
   */
  static async updateWithSnapshot(orgId, supplierId, fields, snapshot) {
    const update = {
      $set: { ...fields, updatedAt: new Date() },
    };
    // Only add $push if a snapshot was provided (score changed)
    if (snapshot) {
      update.$push = { riskHistory: snapshot };
    }
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      update,
      { new: true, runValidators: true }
    );
  }

  /**
   * saveMetricsAdjustment
   * Atomically updates supplier metric fields, pushes a metricsAdjustmentHistory entry,
   * and optionally pushes a riskHistory snapshot — all in one DB call.
   *
   * Having it in one operation means the returned document reflects all changes
   * simultaneously, keeping the frontend in sync without an extra refetch.
   *
   * @param {string} orgId         - Organisation's MongoDB ObjectId
   * @param {string} supplierId    - Target supplier's MongoDB ObjectId
   * @param {object} metricUpdates - New metric values + riskScore/riskTier/lastScoredAt
   * @param {object} adjustmentEntry - Metrics adjustment log entry
   * @param {object|null} snapshot  - Risk snapshot to push if score changed (or null)
   * @returns {Promise<Supplier|null>}
   */
  static async saveMetricsAdjustment(orgId, supplierId, { metricUpdates, adjustmentEntry, snapshot }) {
    // Always push the metrics adjustment log entry; conditionally push risk snapshot
    const pushFields = { metricsAdjustmentHistory: adjustmentEntry };
    if (snapshot) {
      pushFields.riskHistory = snapshot;
    }
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      {
        $set: { ...metricUpdates, updatedAt: new Date() },
        $push: pushFields,
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * saveOverride
   * Atomically applies a manual score override and records both an overrideHistory
   * entry and a riskHistory snapshot in a single database operation.
   *
   * @param {string} orgId               - Organisation's MongoDB ObjectId
   * @param {string} supplierId          - Target supplier's MongoDB ObjectId
   * @param {object} opts
   * @param {number} opts.riskScore      - New overridden score
   * @param {string} opts.riskTier       - Computed tier for the new score
   * @param {object} opts.overrideEntry  - Analytics override log document
   * @param {object} opts.historyEntry   - Risk history snapshot document
   * @returns {Promise<Supplier|null>}
   */
  static async saveOverride(orgId, supplierId, { riskScore, riskTier, overrideEntry, historyEntry }) {
    return Supplier.findOneAndUpdate(
      { _id: supplierId, orgId },
      {
        $set: { riskScore, riskTier, lastScoredAt: new Date(), updatedAt: new Date() },
        $push: {
          overrideHistory: overrideEntry,  // Logs the analyst action
          riskHistory: historyEntry,   // Adds to the trend chart
        },
      },
      { new: true }
    );
  }
}
