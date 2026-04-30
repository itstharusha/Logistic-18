/**
 * models/index.js — Shared Model Re-exports and Supplementary Schemas
 *
 * Responsibility:
 *   Acts as a central barrel file for Mongoose models.
 *
 *   1. Re-exports the Supplier and Shipment models so other modules can
 *      import them from a single location when needed.
 *
 *   2. Defines two supplementary schemas (InventoryItem, Report) that are
 *      not yet built out into their own dedicated files. These are
 *      placeholder schemas to support future feature development.
 *
 *   InventoryItem — tracks stock items linked to a supplier, with a risk score.
 *   Report        — records generated analytics reports (async generation flow).
 *
 *   Note: The inventoryItemSchema currently references 'Organization' (US spelling)
 *   while the rest of the app uses 'Organisation' (UK spelling) — this should be
 *   unified when the inventory module is built out.
 */

import mongoose from 'mongoose';
import Supplier from './Supplier.js';
import Shipment from './Shipment.js';
import InventoryItem from './InventoryItem.js';
import Report from './Report.js';

// Re-export primary domain models for convenience
export { Supplier, Shipment, InventoryItem, Report };
