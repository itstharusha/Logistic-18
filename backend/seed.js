/**
 * seed.js — Database Seeding Script
 *
 * Responsibility:
 *   Populates the MongoDB database with a default Organisation and a set of
 *   demo users covering all five RBAC roles. Run this once after setting up
 *   a fresh database (or to reset users to known credentials).
 *
 *   Usage:
 *     node seed.js
 *   Or with the npm script (if configured):
 *     npm run seed
 *
 *   What it creates:
 *   - 1 Organisation: "DemoOrg" (upsert — only created if it doesn't exist)
 *   - 5 Users (one per role) — all deleted and re-created each run to ensure
 *     passwords are correctly hashed and match the credentials below.
 *
 *   Demo Credentials after seeding:
 *   ┌──────────────────────────────┬────────────────────────┬──────────────────────────┐
 *   │ Email                        │ Password               │ Role                     │
 *   ├──────────────────────────────┼────────────────────────┼──────────────────────────┤
 *   │ admin@demo.org               │ AdminPass123!          │ ORG_ADMIN                │
 *   │ analyst@demo.org             │ AnalystPass123!        │ RISK_ANALYST             │
 *   │ operator@demo.org            │ OperatorPass123!       │ LOGISTICS_OPERATOR       │
 *   │ inventory@demo.org           │ InventoryPass123!      │ INVENTORY_MANAGER        │
 *   │ viewer@demo.org              │ ViewerPass123!         │ VIEWER                   │
 *   └──────────────────────────────┴────────────────────────┴──────────────────────────┘
 *
 *   Note: Passwords are stored as bcrypt hashes — the User model's pre-save hook
 *   handles hashing automatically when passwordHash is set to the plain text value.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Organisation from './src/models/Organisation.js';
import User from './src/models/User.js';

// Connect to the same database as the running backend
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistic18';

async function seed() {
  await mongoose.connect(MONGODB_URI);

  // ── Step 1: Create the demo organisation (idempotent) ───────────────────────
  let org = await Organisation.findOne({ name: 'DemoOrg' });
  if (!org) {
    org = await Organisation.create({
      name: 'DemoOrg',
      industry: 'Logistics',
      country: 'US',
      timezone: 'UTC',
      planTier: 'STARTER',
    });
    console.log('Created organisation:', org.name);
  } else {
    console.log('Organisation already exists:', org.name);
  }

  // ── Step 2: Seed users (one per RBAC role) ──────────────────────────────────
  const users = [
    { name: 'Alice Admin', email: 'admin@demo.org', password: 'AdminPass123!', role: 'ORG_ADMIN' },
    { name: 'Bob Analyst', email: 'analyst@demo.org', password: 'AnalystPass123!', role: 'RISK_ANALYST' },
    { name: 'Carol Operator', email: 'operator@demo.org', password: 'OperatorPass123!', role: 'LOGISTICS_OPERATOR' },
    { name: 'Dave Inventory', email: 'inventory@demo.org', password: 'InventoryPass123!', role: 'INVENTORY_MANAGER' },
    { name: 'Eve Viewer', email: 'viewer@demo.org', password: 'ViewerPass123!', role: 'VIEWER' },
  ];

  for (const user of users) {
    // Delete the existing user so we get a clean re-seed with correct password hashing
    await User.deleteOne({ email: user.email });

    await User.create({
      orgId: org._id,
      name: user.name,
      email: user.email,
      passwordHash: user.password, // The User model's pre-save hook will hash this
      role: user.role,
      isActive: true,
    });

    console.log('Re-seeded user:', user.email, '| role:', user.role);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

// Run the seed function and exit on any unhandled error
seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
